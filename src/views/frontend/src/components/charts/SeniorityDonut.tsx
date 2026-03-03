import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface SeniorityDonutProps {
  data: { seniority: string; count: number }[];
}

const COLORS: Record<string, string> = {
  junior: "hsl(160, 60%, 45%)",
  mid: "hsl(200, 75%, 50%)",
  senior: "hsl(40, 80%, 50%)",
  lead: "hsl(0, 70%, 50%)",
};

export function SeniorityDonut({ data }: SeniorityDonutProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <h3 className="text-base font-semibold mb-4">By Seniority</h3>
        <div className="flex h-[200px] items-center justify-center text-sm text-[hsl(var(--muted-foreground))]">
          No seniority data
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
      <h3 className="text-base font-semibold mb-4">By Seniority</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="seniority"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={3}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={COLORS[entry.seniority] || "hsl(var(--muted))"} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: 13,
            }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
