import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

interface TrendLineChartProps {
  data: { month: string; count: number }[];
}

export function TrendLineChart({ data }: TrendLineChartProps) {
  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
      <h3 className="text-base font-semibold mb-4">Monthly Job Posting Trends</h3>
      {data.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-[hsl(var(--muted-foreground))]">
          No trend data available yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: 13,
              }}
            />
            <Line
              type="monotone"
              dataKey="count"
              name="Jobs"
              stroke="hsl(221, 83%, 53%)"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "hsl(221, 83%, 53%)" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
