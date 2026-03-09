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
  scanDates?: string[]; // YYYY-MM-DD — mark scan dates on chart
}

export default function PriceChart({ data, scanDates = [] }: Props) {
  const scanSet = new Set(scanDates);
  const formatted = data.map((d) => ({
    ...d,
    date: d.date.slice(5), // MM-DD
    volumeK: Math.round(d.volume / 1000),
    scanMarker: scanSet.has(d.date) ? d.close : null,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={formatted} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: "#e5e7eb" }}
          interval={4}
        />
        <YAxis
          yAxisId="price"
          orientation="left"
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `$${v}`}
        />
        <YAxis
          yAxisId="vol"
          orientation="right"
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}K`}
        />
        <Tooltip
          contentStyle={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            color: "#252525",
            fontSize: 12,
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(val: any, name: any) => {
            if (name === "close") return [`$${(val ?? 0).toFixed(2)}`, "Close"];
            return [`${val ?? 0}K`, "Volume"];
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "#9ca3af" }}
        />
        <Bar yAxisId="vol" dataKey="volumeK" fill="#4a7c59" opacity={0.35} name="Volume" />
        <Line
          yAxisId="price"
          type="monotone"
          dataKey="close"
          stroke="#2e8b57"
          strokeWidth={2}
          dot={false}
          name="close"
        />
        <Line
          yAxisId="price"
          type="monotone"
          dataKey="scanMarker"
          stroke="#fd8412"
          strokeWidth={0}
          dot={{ r: 5, fill: "#fd8412", strokeWidth: 0 }}
          name="scan"
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
