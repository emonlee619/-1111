"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartFrame } from "./ChartFrame";

export function RiskTrendChart({ data }: { data: { name: string; riskScore: number; warnings: number; hazards: number }[] }) {
  return (
    <ChartFrame
      title="风险趋势图"
      description="由 mock 区域风险、预警数和隐患数派生。"
      footer="单位：风险分为 1-4 档，预警数和隐患数为件。"
      isEmpty={data.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 16, bottom: 12, left: 0 }}>
          <CartesianGrid stroke="#eadfce" strokeDasharray="4 4" />
          <XAxis dataKey="name" tick={{ fill: "#766b5f", fontSize: 12 }} />
          <YAxis tick={{ fill: "#766b5f", fontSize: 12 }} allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="riskScore" name="风险分" stroke="#d97706" strokeWidth={2} dot={{ r: 4 }} />
          <Line type="monotone" dataKey="warnings" name="预警数" stroke="#dc2626" strokeWidth={2} />
          <Line type="monotone" dataKey="hazards" name="隐患数" stroke="#2563eb" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
