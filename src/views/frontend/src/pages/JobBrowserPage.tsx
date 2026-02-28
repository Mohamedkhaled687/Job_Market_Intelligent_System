import { LayoutGrid, List } from "lucide-react";
import { useState } from "react";
import { useJobs } from "@/hooks/useJobs";
import { FilterBar } from "@/components/FilterBar";
import { JobCard } from "@/components/JobCard";
import { Pagination } from "@/components/Pagination";
import { JobCardSkeleton } from "@/components/Skeleton";
import { cn } from "@/lib/utils";

export function JobBrowserPage() {
  const { data, isLoading, isError } = useJobs();
  const [view, setView] = useState<"grid" | "list">("grid");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Job Browser</h1>
        <div className="flex items-center gap-1 rounded-lg bg-[hsl(var(--muted))] p-1">
          <button
            onClick={() => setView("grid")}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              view === "grid"
                ? "bg-[hsl(var(--background))] shadow-sm"
                : "text-[hsl(var(--muted-foreground))]"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              view === "list"
                ? "bg-[hsl(var(--background))] shadow-sm"
                : "text-[hsl(var(--muted-foreground))]"
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      <FilterBar />

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/40 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400 font-medium">Failed to load jobs</p>
          <p className="text-sm text-red-500 dark:text-red-400/70 mt-1">Please check that the API server is running.</p>
        </div>
      )}

      {isLoading && (
        <div className={cn(
          view === "grid" ? "grid gap-4 sm:grid-cols-2" : "space-y-3"
        )}>
          {Array.from({ length: 6 }).map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      )}

      {data && data.jobs.length === 0 && (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-12 text-center">
          <p className="text-lg font-medium text-[hsl(var(--muted-foreground))]">No jobs found</p>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Try adjusting your filters or trigger a new scrape.
          </p>
        </div>
      )}

      {data && data.jobs.length > 0 && (
        <>
          <div className={cn(
            view === "grid" ? "grid gap-4 sm:grid-cols-2" : "space-y-3"
          )}>
            {data.jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
          <Pagination page={data.page} totalPages={data.total_pages} total={data.total} />
        </>
      )}
    </div>
  );
}
