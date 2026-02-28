import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useDashboard } from "@/hooks/useInsights";
import { useTriggerScrape, useScrapeStatus } from "@/hooks/useScrape";
import { ChartSkeleton } from "@/components/Skeleton";
import { SkillBarChart } from "@/components/charts/SkillBarChart";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { CategoryDonut } from "@/components/charts/CategoryDonut";
import { SeniorityDonut } from "@/components/charts/SeniorityDonut";
import { SalaryStats } from "@/components/charts/SalaryStats";
import { TopCompanies } from "@/components/charts/TopCompanies";
import { SkillForceGraph } from "@/components/charts/SkillForceGraph";

export function DashboardPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useDashboard();
  const [taskId, setTaskId] = useState<string | null>(null);

  const triggerScrape = useTriggerScrape();

  const runScrape = () => {
    triggerScrape.mutate(
      {},
      {
        onSuccess: (res) => {
          setTaskId(res.task_id);
          toast.info("Scrape started. Fetching jobs from Wuzzuf…");
        },
        onError: () => {
          toast.error("Failed to start scrape. Is the API running?");
        },
      }
    );
  };

  const { data: status } = useScrapeStatus(taskId);
  const completedTaskRef = useRef<string | null>(null);
  useEffect(() => {
    if (!taskId || status?.status !== "completed") return;
    if (completedTaskRef.current === taskId) return;
    completedTaskRef.current = taskId;
    setTaskId(null);
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    toast.success(`Done! ${status.jobs_found} jobs added.`);
  }, [taskId, status?.status, status?.jobs_found, queryClient]);

  const hasNoData = !isLoading && data && data.total_jobs === 0;
  const isScraping = status?.status === "running";

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <button
          onClick={runScrape}
          disabled={triggerScrape.isPending || isScraping}
          className="inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {(triggerScrape.isPending || isScraping) ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {isScraping && status ? `Scraping… ${status.jobs_found} jobs` : "Starting…"}
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Fetch job data from Wuzzuf
            </>
          )}
        </button>
      </div>

      {/* Show when no data and not currently scraping */}
      {hasNoData && !isScraping && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/40 dark:bg-amber-900/20">
          <p className="font-medium text-amber-800 dark:text-amber-200">No data yet</p>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            Click <strong>Fetch job data from Wuzzuf</strong> above to scrape job listings. This may take 1–2 minutes. After it finishes, the charts will update automatically.
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
