"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { PricePoint } from "@/lib/price";

interface Props {
  data: PricePoint[];
}

export default function PriceChart({ data }: Props) {
  const formatted = data.map((d) => ({
    ...d,
    date: d.date.slice(5), // MM-DD
    volumeK: Math.round(d.volume / 1000),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={formatted} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#64748b", fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: "#334155" }}
          interval={4}
        />
        <YAxis
          yAxisId="price"
          orientation="left"
          tick={{ fill: "#64748b", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `$${v}`}
        />
        <YAxis
          yAxisId="vol"
          orientation="right"
          tick={{ fill: "#64748b", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}K`}
        />
        <Tooltip
          contentStyle={{
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 8,
            color: "#e2e8f0",
            fontSize: 12,
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(val: any, name: any) => {
            if (name === "close") return [`$${(val ?? 0).toFixed(2)}`, "Close"];
            return [`${val ?? 0}K`, "Volume"];
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "#64748b" }}
        />
        <Bar yAxisId="vol" dataKey="volumeK" fill="#1e40af" opacity={0.5} name="Volume" />
        <Line
          yAxisId="price"
          type="monotone"
          dataKey="close"
          stroke="#60a5fa"
          strokeWidth={2}
          dot={false}
          name="close"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
