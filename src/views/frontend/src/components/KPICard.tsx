import CountUp from "react-countup";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: number;
  suffix?: string;
  prefix?: string;
  icon: LucideIcon;
  className?: string;
}

export function KPICard({ title, value, suffix, prefix, icon: Icon, className }: KPICardProps) {
  return (
    <div
      className={cn(
        "glass rounded-2xl p-6 transition-all hover:scale-[1.02] hover:shadow-lg",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">
            {prefix}
            <CountUp end={value} duration={1.5} separator="," />
            {suffix}
          </p>
        </div>
        <div className="rounded-xl bg-[hsl(var(--primary)/0.1)] p-3">
          <Icon className="h-6 w-6 text-[hsl(var(--primary))]" />
        </div>
      </div>
    </div>
  );
}
