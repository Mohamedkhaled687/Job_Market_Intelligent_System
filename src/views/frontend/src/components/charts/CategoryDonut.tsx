import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface CategoryDonutProps {
  data: { category: string; count: number }[];
}

const COLORS = [
  "hsl(221, 83%, 53%)", "hsl(280, 65%, 60%)", "hsl(160, 60%, 45%)",
  "hsl(30, 80%, 55%)", "hsl(340, 75%, 55%)", "hsl(200, 70%, 50%)",
  "hsl(50, 80%, 50%)", "hsl(0, 70%, 50%)", "hsl(140, 50%, 50%)",
  "hsl(260, 50%, 60%)",
];

export function CategoryDonut({ data }: CategoryDonutProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <h3 className="text-base font-semibold mb-4">By Category</h3>
        <div className="flex h-[200px] items-center justify-center text-sm text-[hsl(var(--muted-foreground))]">
          No category data
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
      <h3 className="text-base font-semibold mb-4">By Category</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="category"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={3}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
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
