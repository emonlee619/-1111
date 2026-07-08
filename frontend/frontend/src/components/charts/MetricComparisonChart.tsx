"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartFrame } from "./ChartFrame";

type MetricComparisonDatum = { name: string; value?: number; recall?: number; falseAlarmRate?: number; macroF1?: number; accuracy?: number };

export function MetricComparisonChart({
  data,
  title = "模型指标对比图",
}: {
  data: MetricComparisonDatum[];
  title?: string;
}) {
  const isAblation = data.some((item) => item.recall !== undefined);
  return (
    <ChartFrame
      title={title}
      description="指标来自 mock 模型评估结构。"
      footer={isAblation ? "单位：百分比，消融实验仅用于 mock 对比。" : "单位：百分比或权重值，来源为本地 mock 结构。"}
      isEmpty={data.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 16, bottom: 12, left: 0 }}>
          <CartesianGrid stroke="#eadfce" strokeDasharray="4 4" />
          <XAxis dataKey="name" tick={{ fill: "#766b5f", fontSize: 12 }} />
          <YAxis tick={{ fill: "#766b5f", fontSize: 12 }} />
          <Tooltip />
          <Legend />
          {isAblation ? (
            <>
              <Bar dataKey="recall" name="召回率" fill="#2563eb" radius={[8, 8, 0, 0]} />
              <Bar dataKey="macroF1" name="Macro-F1" fill="#d97706" radius={[8, 8, 0, 0]} />
              <Bar dataKey="accuracy" name="准确率" fill="#16a34a" radius={[8, 8, 0, 0]} />
              <Bar dataKey="falseAlarmRate" name="误报率" fill="#dc2626" radius={[8, 8, 0, 0]} />
            </>
          ) : (
            <Bar dataKey="value" name="百分比" fill="#d97706" radius={[8, 8, 0, 0]} />
          )}
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
