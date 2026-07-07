"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartFrame } from "./ChartFrame";

export function RegionRiskChart({ data }: { data: { name: string; riskScore: number; warnings: number; hazards: number }[] }) {
  return (
    <ChartFrame
      title="区域风险排行图"
      description="按风险分、预警数和隐患数展示 mock 区域态势。"
      footer="单位：风险分为 1-4 档，预警数和隐患数为件。"
      isEmpty={data.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 16, bottom: 12, left: 0 }}>
          <CartesianGrid stroke="#eadfce" strokeDasharray="4 4" />
          <XAxis dataKey="name" tick={{ fill: "#766b5f", fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fill: "#766b5f", fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="riskScore" name="风险分" fill="#f97316" radius={[8, 8, 0, 0]} />
          <Bar dataKey="warnings" name="预警数" fill="#dc2626" radius={[8, 8, 0, 0]} />
          <Bar dataKey="hazards" name="隐患数" fill="#2563eb" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
