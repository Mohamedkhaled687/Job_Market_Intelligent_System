import { DollarSign, Briefcase } from "lucide-react";
import CountUp from "react-countup";

interface SalaryStatsProps {
  stats: { avg_salary: number; min_salary: number; max_salary: number };
  totalJobs: number;
}

export function SalaryStats({ stats, totalJobs }: SalaryStatsProps) {
  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
      <h3 className="text-base font-semibold mb-4">Overview</h3>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[hsl(var(--primary)/0.1)] p-3">
            <Briefcase className="h-5 w-5 text-[hsl(var(--primary))]" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              <CountUp end={totalJobs} duration={1.2} separator="," />
            </p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Total Jobs</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-green-100 dark:bg-green-900/30 p-3">
            <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              $<CountUp end={stats.avg_salary} duration={1.2} separator="," />
            </p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Avg Salary</p>
          </div>
        </div>
        {stats.min_salary > 0 && (
          <div className="text-sm text-[hsl(var(--muted-foreground))]">
            Range: ${stats.min_salary.toLocaleString()} – ${stats.max_salary.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}
