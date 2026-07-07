"use client";

import { useEffect, useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { fetchOutburstRecentData, fetchOutburstSensors, type OutburstRawDataPoint, type OutburstSensorMeta } from "@/lib/outburstApi";

interface MetricData {
  sensorId: string;
  name: string;
  unit: string;
  threshold: number;
  criticalThreshold: number;
  samples: Array<{ time: string; value: number; isAbnormal: boolean }>;
  currentValue: number;
  status: "normal" | "warning" | "critical";
}

export function RealtimeMonitorDashboard() {
  const [rawData, setRawData] = useState<OutburstRawDataPoint[]>([]);
  const [sensors, setSensors] = useState<OutburstSensorMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState<"1h" | "6h" | "24h">("1h");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        
        const [recentData, sensorList] = await Promise.all([
          fetchOutburstRecentData(120),
          fetchOutburstSensors(),
        ]);
        
        setRawData(recentData);
        setSensors(sensorList);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    }

    loadData();
    const timer = setInterval(loadData, 1000);
    return () => clearInterval(timer);
  }, []);

  const metrics: MetricData[] = useMemo(() => {
    const sensorMap = new Map<string, OutburstSensorMeta>();
    sensors.forEach(s => sensorMap.set(s.sensor_id, s));

    const grouped = new Map<string, OutburstRawDataPoint[]>();
    rawData.forEach(d => {
      const key = d.sensor_id || "";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(d);
    });

    const result: MetricData[] = [];
    grouped.forEach((data, sensorId) => {
      const meta = sensorMap.get(sensorId);
      const sorted = data.sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));
      
      const threshold = parseFloat(meta?.threshold?.toString() || "1.0");
      const criticalThreshold = threshold * 1.5;
      
      const samples = sorted.map(d => {
        const value = d.value || 0;
        return {
          time: d.timestamp?.slice(11, 16) || "",
          value,
          isAbnormal: value >= threshold,
        };
      });

      const lastSample = samples[samples.length - 1];
      let status: MetricData["status"] = "normal";
      if (lastSample && lastSample.value >= criticalThreshold) status = "critical";
      else if (lastSample && lastSample.value >= threshold) status = "warning";

      result.push({
        sensorId,
        name: meta?.indicator_name || sensorId,
        unit: meta?.unit || "",
        threshold,
        criticalThreshold,
        samples,
        currentValue: lastSample?.value || 0,
        status,
      });
    });

    return result.slice(0, 8);
  }, [rawData, sensors]);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
        <div className="animate-pulse">
          <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-48 bg-gray-200 rounded" />
            <div className="h-48 bg-gray-200 rounded" />
            <div className="h-48 bg-gray-200 rounded" />
            <div className="h-48 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-red-600">数据加载失败: {error}</p>
      </div>
    );
  }

  const getColor = (status: MetricData["status"]) => {
    if (status === "critical") return "#ef4444";
    if (status === "warning") return "#f59e0b";
    return "#22c55e";
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-800">监测数据实时展示</h3>
        <div className="flex gap-2">
          {["1h", "6h", "24h"].map((window) => (
            <button
              key={window}
              onClick={() => setTimeWindow(window as "1h" | "6h" | "24h")}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                timeWindow === window 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {window}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {metrics.map((metric) => (
          <div key={metric.sensorId} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-700">{metric.name}</span>
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                metric.status === "critical" ? "bg-red-100 text-red-600" :
                metric.status === "warning" ? "bg-yellow-100 text-yellow-600" :
                "bg-green-100 text-green-600"
              }`}>
                {metric.status === "critical" ? "异常" : 
                 metric.status === "warning" ? "预警" : "正常"}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-800 mb-2">
              {metric.currentValue.toFixed(2)} <span className="text-sm font-normal text-gray-500">{metric.unit}</span>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={metric.samples}>
                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                <YAxis domain={["dataMin - 0.1", "dataMax + 0.1"]} tick={{ fontSize: 10 }} />
                <Tooltip 
                  formatter={(value) => [`${Number(value).toFixed(2)} ${metric.unit}`]}
                />
                <ReferenceLine 
                  y={metric.threshold} 
                  stroke="#f59e0b" 
                  strokeDasharray="3 3" 
                  label={{ value: '预警阈值', position: 'right', fontSize: 10 }}
                />
                <ReferenceLine 
                  y={metric.criticalThreshold} 
                  stroke="#ef4444" 
                  strokeDasharray="3 3" 
                  label={{ value: '危险阈值', position: 'right', fontSize: 10 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={getColor(metric.status)} 
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </div>
  );
}