import { cn } from "@/lib/utils";

interface SkillTagProps {
  skill: string;
  variant?: "default" | "primary" | "outline";
  className?: string;
}

export function SkillTag({ skill, variant = "default", className }: SkillTagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        variant === "default" && "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]",
        variant === "primary" && "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]",
        variant === "outline" && "border border-[hsl(var(--border))] text-[hsl(var(--foreground))]",
        className
      )}
    >
      {skill}
    </span>
  );
}
