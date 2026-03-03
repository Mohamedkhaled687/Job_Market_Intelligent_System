import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

interface SkillBarChartProps {
  data: { skill: string; count: number }[];
}

const CHART_COLORS = [
  "hsl(221, 83%, 53%)", "hsl(221, 83%, 58%)", "hsl(221, 83%, 63%)",
  "hsl(221, 83%, 68%)", "hsl(221, 83%, 73%)", "hsl(221, 78%, 78%)",
];

export function SkillBarChart({ data }: SkillBarChartProps) {
  const chartData = data.slice(0, 12);

  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
      <h3 className="text-base font-semibold mb-4">Top Skills by Demand</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 20, top: 5, bottom: 5 }}>
          <XAxis type="number" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis
            type="category"
            dataKey="skill"
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            width={75}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: 13,
            }}
          />
          <Bar dataKey="count" name="Jobs" radius={[0, 4, 4, 0]}>
            {chartData.map((_, index) => (
              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
