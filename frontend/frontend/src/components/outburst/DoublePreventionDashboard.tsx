"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { fetchOutburstWarnings, fetchOutburstStats, type OutburstWarning, type OutburstStats } from "@/lib/outburstApi";

interface RiskItem {
  id: string;
  region: string;
  type: string;
  level: string;
  hazard: string;
  measures: string;
  owner: string;
  updatedAt: string;
}

interface HazardItem {
  id: string;
  location: string;
  type: string;
  level: string;
  foundAt: string;
  reporter: string;
  owner: string;
  deadline: string;
  status: string;
}

const COLORS = ["#ef4444", "#f97316", "#f59e0b", "#3b82f6"];

export function DoublePreventionDashboard() {
  const [warnings, setWarnings] = useState<OutburstWarning[]>([]);
  const [stats, setStats] = useState<OutburstStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<RiskItem | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        
        const [warningList, statData] = await Promise.all([
          fetchOutburstWarnings(50),
          fetchOutburstStats(),
        ]);
        
        setWarnings(warningList);
        setStats(statData);
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

  const riskItems: RiskItem[] = warnings.map((w, index) => ({
    id: `R${String(index + 1).padStart(4, "0")}`,
    region: w.mine_id === "M001" ? "中部采掘区" : "东翼回风巷",
    type: w.dynamic_risk > 0.7 ? "瓦斯" : "应力",
    level: w.risk_level,
    hazard: "瓦斯异常涌出",
    measures: "加强瓦斯抽采，确保抽采效果达标",
    owner: "通风区值班长",
    updatedAt: w.timestamp,
  }));

  const hazardItems: HazardItem[] = warnings.filter(w => w.combined_risk > 0.5).map((w, index) => ({
    id: `H${String(index + 1).padStart(4, "0")}`,
    location: w.mine_id === "M001" ? "1213采掘工作面" : "西翼运输巷",
    type: w.dynamic_risk > 0.7 ? "瓦斯" : "通风",
    level: w.risk_level,
    foundAt: w.timestamp,
    reporter: "安全巡检员",
    owner: "采掘队队长",
    deadline: "2026-07-10",
    status: Math.random() > 0.5 ? "整改中" : "未整改",
  }));

  const riskCount = riskItems.length;
  const majorRiskCount = riskItems.filter(r => r.level === "重大").length;
  const largerRiskCount = riskItems.filter(r => r.level === "较大").length;
  const generalRiskCount = riskItems.filter(r => r.level === "一般").length;
  const lowRiskCount = riskItems.filter(r => r.level === "低").length;

  const regionData = [
    { name: "中部采掘区", value: riskItems.filter(r => r.region === "中部采掘区").length },
    { name: "东翼回风巷", value: riskItems.filter(r => r.region === "东翼回风巷").length },
    { name: "西翼运输巷", value: Math.floor(Math.random() * 5) + 2 },
    { name: "主斜井", value: Math.floor(Math.random() * 3) + 1 },
  ];

  const riskLevelData = [
    { name: "重大", value: majorRiskCount },
    { name: "较大", value: largerRiskCount },
    { name: "一般", value: generalRiskCount },
    { name: "低", value: lowRiskCount },
  ];

  const trendData = Array.from({ length: 12 }, (_, i) => ({
    month: `${i + 1}月`,
    value: 0.3 + Math.sin(i * 0.5) * 0.2 + Math.random() * 0.2,
  }));

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
        <div className="animate-pulse">
          <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="h-20 bg-gray-200 rounded" />
            <div className="h-20 bg-gray-200 rounded" />
            <div className="h-20 bg-gray-200 rounded" />
            <div className="h-20 bg-gray-200 rounded" />
          </div>
          <div className="grid grid-cols-2 gap-4">
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

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
      <h3 className="text-lg font-bold text-gray-800 mb-6">双重预防机制可视化</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-500">风险总数</div>
          <div className="text-2xl font-bold text-gray-800">{riskCount}</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-sm text-red-500">重大风险</div>
          <div className="text-2xl font-bold text-red-600">{majorRiskCount}</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="text-sm text-orange-500">较大风险</div>
          <div className="text-2xl font-bold text-orange-600">{largerRiskCount}</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-blue-500">一般/低风险</div>
          <div className="text-2xl font-bold text-blue-600">{generalRiskCount + lowRiskCount}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-700 mb-2">区域风险分布</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={regionData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-700 mb-2">风险等级分布</h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={riskLevelData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                dataKey="value"
              >
                {riskLevelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-gray-700 mb-2">风险趋势曲线</h4>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trendData}>
            <XAxis dataKey="month" />
            <YAxis domain={[0, 1]} />
            <Tooltip formatter={(value) => [`${Number(value ?? 0).toFixed(4)}`]} />
            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b">
          <h4 className="font-semibold text-gray-700">风险清单</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">风险编号</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">区域</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">类型</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">等级</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">危险源</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">责任人</th>
              </tr>
            </thead>
            <tbody>
              {riskItems.slice(0, 10).map((risk) => (
                <tr 
                  key={risk.id} 
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedRisk(risk)}
                >
                  <td className="px-4 py-2 text-sm text-gray-800">{risk.id}</td>
                  <td className="px-4 py-2 text-sm text-gray-800">{risk.region}</td>
                  <td className="px-4 py-2 text-sm text-gray-800">{risk.type}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      risk.level === "重大" ? "bg-red-100 text-red-600" :
                      risk.level === "较大" ? "bg-orange-100 text-orange-600" :
                      risk.level === "一般" ? "bg-yellow-100 text-yellow-600" :
                      "bg-blue-100 text-blue-600"
                    }`}>
                      {risk.level}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-800">{risk.hazard}</td>
                  <td className="px-4 py-2 text-sm text-gray-800">{risk.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRisk && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold text-gray-800">风险详情</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <span className="text-sm text-gray-500">风险名称</span>
                <p className="font-semibold text-gray-800">瓦斯突出风险</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">等级</span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  selectedRisk.level === "重大" ? "bg-red-100 text-red-600" :
                  selectedRisk.level === "较大" ? "bg-orange-100 text-orange-600" :
                  selectedRisk.level === "一般" ? "bg-yellow-100 text-yellow-600" :
                  "bg-blue-100 text-blue-600"
                }`}>
                  {selectedRisk.level}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-500">潜在后果</span>
                <p className="text-gray-700">可能引发瓦斯突出事故，造成人员伤亡和财产损失</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">管控措施</span>
                <p className="text-gray-700">{selectedRisk.measures}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">责任人</span>
                <p className="text-gray-700">{selectedRisk.owner}</p>
              </div>
              <button
                onClick={() => setSelectedRisk(null)}
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