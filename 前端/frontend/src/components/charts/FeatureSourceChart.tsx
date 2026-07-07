"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartFrame } from "./ChartFrame";

const colors = ["#2563eb", "#f97316", "#d97706"];

export function FeatureSourceChart({ data, title = "特征来源分布图" }: { data: { name: string; value: number }[]; title?: string }) {
  return (
    <ChartFrame
      title={title}
      description="按真实通道与生成前兆通道分布展示。"
      footer="单位：条目数；生成通道只作为辅助前兆指标。"
      isEmpty={data.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={92} paddingAngle={4} label>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
