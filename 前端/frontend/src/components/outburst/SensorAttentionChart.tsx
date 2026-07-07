"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { fetchOutburstLatestWarning, fetchOutburstMeta, type OutburstWarning, type OutburstSensorMeta } from "@/lib/outburstApi";

interface SensorData {
  id: string;
  name: string;
  location: string;
  weight: number;
  currentValue: number;
  threshold: number;
  possibleReason: string;
}

export function SensorAttentionChart() {
  const [warning, setWarning] = useState<OutburstWarning | null>(null);
  const [metaData, setMetaData] = useState<OutburstSensorMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        
        const [latestWarning, meta] = await Promise.all([
          fetchOutburstLatestWarning(),
          fetchOutburstMeta(),
        ]);
        
        setWarning(latestWarning);
        setMetaData(meta);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    }

    loadData();
    const timer = setInterval(loadData, 30000);
    return () => clearInterval(timer);
  }, []);

  const sensorData: SensorData[] = useMemo(() => {
    if (!warning) return [];
    
    const heatmap = warning.heatmap_data as number[] || [];
    const contributions = warning.sensor_contribution || [];
    
    const data: SensorData[] = [];
    
    heatmap.forEach((weight, index) => {
      const sensorId = contributions[index]?.sensor_id || `S${String(index + 1).padStart(2, "0")}`;
      const meta = metaData.find(m => m.sensor_id === sensorId);
      
      data.push({
        id: sensorId,
        name: meta?.indicator_name || sensorId,
        location: meta?.spatial_position || "未知位置",
        weight: weight,
        currentValue: meta?.value || 0,
        threshold: parseFloat(meta?.threshold?.toString() || "0"),
        possibleReason: weight > 0.3 ? "传感器数值异常波动" : "正常监测数据",
      });
    });
    
    return data.sort((a, b) => b.weight - a.weight);
  }, [warning, metaData]);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
        <div className="animate-pulse">
          <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
          <div className="h-64 bg-gray-200 rounded" />
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

  const selectedSensorData = sensorData.find(s => s.id === selectedSensor);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
      <h3 className="text-lg font-bold text-gray-800 mb-4">危险源热力图</h3>
      
      <div className="flex gap-6">
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={sensorData.slice(0, 15)} layout="vertical">
              <XAxis type="number" domain={[0, 1]} />
              <YAxis 
                type="category" 
                dataKey="id" 
                width={60}
                tick={{ fontSize: 10 }}
              />
              <Tooltip 
                formatter={(value, name, props) => {
                  const sensor = (props as { payload: SensorData }).payload;
                  return [
                    `权重: ${Number(value).toFixed(4)}`,
                    `名称: ${sensor.name}`,
                    `位置: ${sensor.location}`,
                    `当前值: ${sensor.currentValue}`,
                    `阈值: ${sensor.threshold}`,
                    `可能原因: ${sensor.possibleReason}`,
                  ];
                }}
              />
              <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
                {sensorData.slice(0, 15).map((sensor, index) => (
                  <Cell 
                    key={sensor.id}
                    fill={index < 3 ? "#ef4444" : "#3b82f6"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="w-72">
          <h4 className="font-semibold text-gray-700 mb-2">权重排名 Top 3</h4>
          <div className="space-y-2">
            {sensorData.slice(0, 3).map((sensor, index) => (
              <div 
                key={sensor.id}
                onClick={() => setSelectedSensor(sensor.id)}
                className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-red-50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </span>
                  <span className="font-medium text-gray-800">{sensor.name}</span>
                </div>
                <div className="text-sm text-gray-500">{sensor.location}</div>
                <div className="text-lg font-bold text-red-600">权重: {sensor.weight.toFixed(4)}</div>
              </div>
            ))}
          </div>

          {selectedSensorData && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">传感器详情</h4>
              <div className="text-sm space-y-1">
                <p><strong>当前值:</strong> {selectedSensorData.currentValue}</p>
                <p><strong>阈值:</strong> {selectedSensorData.threshold}</p>
                <p><strong>可能原因:</strong> {selectedSensorData.possibleReason}</p>
                <p><strong>位置:</strong> {selectedSensorData.location}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        点击传感器查看详情，悬停显示当前数值、阈值和可能原因
      </div>
    </div>
  );
}