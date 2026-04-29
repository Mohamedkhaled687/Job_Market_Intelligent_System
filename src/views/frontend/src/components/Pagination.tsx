import { ChevronLeft, ChevronRight } from "lucide-react";
import { useFilterStore } from "@/store/filterStore";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
}

export function Pagination({ page, totalPages, total }: PaginationProps) {
  const { setPage } = useFilterStore();

  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        {total.toLocaleString()} jobs found
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
          className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`dot-${i}`} className="px-2 text-[hsl(var(--muted-foreground))]">...</span>
          ) : (
            <button
              key={p}
              onClick={() => setPage(p as number)}
              className={cn(
                "min-w-[36px] rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                page === p
                  ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                  : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
              )}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => setPage(page + 1)}
          disabled={page === totalPages}
          className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
