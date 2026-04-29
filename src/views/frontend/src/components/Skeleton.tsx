import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("animate-pulse rounded-lg bg-[hsl(var(--muted))]", className)} />
  );
}

export function JobCardSkeleton() {
  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 space-y-3">
      <div className="flex justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}

export function ChartSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6", className)}>
      <Skeleton className="h-5 w-1/3 mb-4" />
      <Skeleton className="h-[250px] w-full" />
    </div>
  );
}
