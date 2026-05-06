import { ChartSkeleton } from "@/components/Skeleton";
import { useDashboard } from "@/hooks/useInsights";
import { CategoryDonut } from "@/components/charts/CategoryDonut";
import { SeniorityDonut } from "@/components/charts/SeniorityDonut";
import { SalaryStats } from "@/components/charts/SalaryStats";
import { TopCompanies } from "@/components/charts/TopCompanies";
import { SkillForceGraph } from "@/components/charts/SkillForceGraph";
import { SkillBarChart } from "@/components/charts/SkillBarChart";
import { TrendLineChart } from "@/components/charts/TrendLineChart";

export function DashboardPage() {
  const { data, isLoading, isError } = useDashboard();

  const hasNoData = !isLoading && data && data.total_jobs === 0;

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/40 dark:bg-red-900/20">
        <p className="text-red-600 dark:text-red-400 font-medium">Failed to load dashboard</p>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <ChartSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics Dashboard</h1>

      {hasNoData && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/40 dark:bg-amber-900/20">
          <p className="font-medium text-amber-800 dark:text-amber-200">No data yet</p>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            Load job listings into the database via the backend scraping workflow, then refresh this page.
          </p>
        </div>
      )}

      {/* Row 1: Salary + Seniority + Category */}
      <div className="grid gap-6 md:grid-cols-3">
        <SalaryStats stats={data.salary_stats} totalJobs={data.total_jobs} />
        <SeniorityDonut data={data.seniority_distribution} />
        <CategoryDonut data={data.category_distribution} />
      </div>

      {/* Row 2: Skills + Trends */}
      <div className="grid gap-6 md:grid-cols-2">
        <SkillBarChart data={data.top_skills} />
        <TrendLineChart data={data.monthly_trends} />
      </div>

      {/* Row 3: Companies + Force Graph */}
      <div className="grid gap-6 md:grid-cols-2">
        <TopCompanies data={data.top_companies} />
        <SkillForceGraph />
      </div>
    </div>
  );
}
