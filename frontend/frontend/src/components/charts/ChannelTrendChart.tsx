"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartFrame } from "./ChartFrame";

export function ChannelTrendChart({ data, title = "通道趋势图" }: { data: { time: string; value: number; threshold: number }[]; title?: string }) {
  return (
    <ChartFrame
      title={title}
      description="由所选通道最新值派生的 mock 时间序列。"
      footer="单位：采样值使用通道原始 mock 单位；静态阈值仅用于演示。"
      isEmpty={data.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 16, bottom: 12, left: 0 }}>
          <CartesianGrid stroke="#eadfce" strokeDasharray="4 4" />
          <XAxis dataKey="time" tick={{ fill: "#766b5f", fontSize: 12 }} />
          <YAxis tick={{ fill: "#766b5f", fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="value" name="采样值" stroke="#d97706" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="threshold" name="静态阈值" stroke="#dc2626" strokeDasharray="5 5" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
