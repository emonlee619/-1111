"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartFrame } from "./ChartFrame";

export function WarningLevelChart({ data }: { data: { name: string; count: number }[] }) {
  return (
    <ChartFrame
      title="预警等级分布图"
      description="受筛选后的预警事件列表驱动。"
      footer="单位：事件数，风险等级颜色遵循全站四色规则。"
      isEmpty={data.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 16, bottom: 12, left: 0 }}>
          <CartesianGrid stroke="#eadfce" strokeDasharray="4 4" />
          <XAxis dataKey="name" tick={{ fill: "#766b5f", fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fill: "#766b5f", fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="count" name="事件数" fill="#d97706" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
