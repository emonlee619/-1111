"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Clock, Info } from "lucide-react";
import { cn } from "@/lib/cn";
import { fetchOutburstLatestWarning, fetchOutburstWarnings, type OutburstWarning } from "@/lib/outburstApi";

interface WarningDetail {
  risk_level: string;
  risk_level_code: string;
  dynamic_risk: number;
  static_risk: number;
  combined_risk: number;
  timestamp: string;
  sensor_contribution: Array<{ sensor_id: string; contribution: number; rank: number }>;
}

function FourColorProgressBar({ value }: { value: number }) {
  const blueWidth = Math.min(value * 100, 30);
  const yellowWidth = value > 0.3 ? Math.min((value - 0.3) * 100 * 2.5, 20) : 0;
  const orangeWidth = value > 0.5 ? Math.min((value - 0.5) * 100 * 2.5, 20) : 0;
  const redWidth = value > 0.7 ? (value - 0.7) * 100 * 3.33 : 0;

  return (
    <div className="flex h-6 rounded-full overflow-hidden bg-gray-200">
      <div className="bg-blue-500 transition-all duration-500" style={{ width: `${blueWidth}%` }} />
      <div className="bg-yellow-500 transition-all duration-500" style={{ width: `${yellowWidth}%` }} />
      <div className="bg-orange-500 transition-all duration-500" style={{ width: `${orangeWidth}%` }} />
      <div className="bg-red-500 transition-all duration-500" style={{ width: `${redWidth}%` }} />
    </div>
  );
}

function riskLevelLabel(code: string | number): string {
  if (code === "critical" || code === 4) return "重大风险";
  if (code === "high" || code === 3) return "较大风险";
  if (code === "normal" || code === 2) return "一般风险";
  if (code === "low" || code === 1) return "低风险";
  return "未知风险";
}

function riskLevelColor(code: string | number): string {
  if (code === "critical" || code === 4) return "bg-red-500";
  if (code === "high" || code === 3) return "bg-orange-500";
  if (code === "normal" || code === 2) return "bg-yellow-500";
  return "bg-blue-500";
}

export function RealTimeWarningCard() {
  const [latestWarning, setLatestWarning] = useState<OutburstWarning | null>(null);
  const [warnings, setWarnings] = useState<OutburstWarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        
        const [latest, warningsResult] = await Promise.all([
          fetchOutburstLatestWarning(),
          fetchOutburstWarnings(5),
        ]);
        
        setLatestWarning(latest);
        setWarnings(warningsResult);
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

  const currentRisk = latestWarning?.combined_risk ?? 0;
  const riskCode = latestWarning?.risk_level_code ?? 0;

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
        <div className="animate-pulse">
          <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
          <div className="h-12 w-32 bg-gray-200 rounded mb-4" />
          <div className="h-6 w-full bg-gray-200 rounded mb-4" />
          <div className="h-4 w-24 bg-gray-200 rounded" />
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

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className={cn("h-6 w-6", riskCode === "critical" ? "text-red-500" : "text-orange-500")} />
          <h3 className="text-lg font-bold text-gray-800">实时预警</h3>
        </div>
        <span className={cn("px-3 py-1 rounded-full text-sm font-medium text-white", riskLevelColor(riskCode))}>
          {riskLevelLabel(riskCode)}
        </span>
      </div>

      <div className="mb-4">
        <div className="text-4xl font-bold text-gray-800 mb-2">{currentRisk.toFixed(4)}</div>
        <div className="text-sm text-gray-500">综合风险概率</div>
      </div>

      <div className="mb-4">
        <FourColorProgressBar value={currentRisk} />
        <div className="flex justify-between mt-1 text-xs text-gray-400">
          <span>0</span>
          <span>0.3</span>
          <span>0.5</span>
          <span>0.7</span>
          <span>1.0</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Clock className="h-4 w-4" />
        <span>最近预警: {latestWarning?.timestamp ?? "暂无"}</span>
      </div>

      <button
        onClick={() => setShowDetail(true)}
        className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
      >
        <Info className="h-4 w-4" />
        查看详情
      </button>

      {showDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold text-gray-800">预警详情</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-xs text-blue-600">静态风险指数</div>
                  <div className="text-xl font-bold text-blue-800">{(latestWarning?.static_risk ?? 0).toFixed(4)}</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-xs text-green-600">动态风险概率</div>
                  <div className="text-xl font-bold text-green-800">{(latestWarning?.dynamic_risk ?? 0).toFixed(4)}</div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <div className="text-xs text-orange-600">综合风险概率</div>
                  <div className="text-xl font-bold text-orange-800">{currentRisk.toFixed(4)}</div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-700 mb-2">动态概率分解（各指标贡献）</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(latestWarning?.sensor_contribution ?? []).slice(0, 10).map((item, index) => (
                    <div key={item.sensor_id} className="flex items-center gap-3">
                      <span className="w-6 text-xs font-medium text-gray-500">{index + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{item.sensor_id}</span>
                          <span className="text-gray-500">{item.contribution.toFixed(4)}</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500" 
                            style={{ width: `${item.contribution * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowDetail(false)}
                className="w-full py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}