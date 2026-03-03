import { Building2 } from "lucide-react";

interface TopCompaniesProps {
  data: { company: string; count: number }[];
}

export function TopCompanies({ data }: TopCompaniesProps) {
  const max = data[0]?.count || 1;

  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
      <h3 className="text-base font-semibold mb-4">Top Hiring Companies</h3>
      {data.length === 0 ? (
        <div className="flex h-[200px] items-center justify-center text-sm text-[hsl(var(--muted-foreground))]">
          No company data
        </div>
      ) : (
        <div className="space-y-3">
          {data.slice(0, 8).map((entry) => (
            <div key={entry.company} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 truncate">
                  <Building2 className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                  {entry.company}
                </span>
                <span className="text-[hsl(var(--muted-foreground))] shrink-0 ml-2">{entry.count}</span>
              </div>
              <div className="h-2 rounded-full bg-[hsl(var(--muted))]">
                <div
                  className="h-full rounded-full bg-[hsl(var(--primary))] transition-all duration-500"
                  style={{ width: `${(entry.count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
