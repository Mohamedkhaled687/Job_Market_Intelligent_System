import { Link } from "react-router-dom";
import { Building2, MapPin, Clock, Briefcase } from "lucide-react";
import { motion } from "framer-motion";
import type { Job } from "@/hooks/useJobs";
import { SkillTag } from "./SkillTag";
import { cn, formatRelativeDate, CATEGORY_COLORS, SENIORITY_COLORS } from "@/lib/utils";

interface JobCardProps {
  job: Job;
}

export function JobCard({ job }: JobCardProps) {
  const skills = job.normalized_skills.length > 0 ? job.normalized_skills : job.listed_skills;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Link
        to={`/jobs/${job.id}`}
        className="block rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 transition-shadow hover:shadow-md"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-[hsl(var(--foreground))]">
              {job.title}
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-[hsl(var(--muted-foreground))]">
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" /> {job.company}
              </span>
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {job.location}
                </span>
              )}
              {job.job_type && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" /> {job.job_type}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {job.seniority && (
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", SENIORITY_COLORS[job.seniority] || "")}>
                {job.seniority}
              </span>
            )}
            {job.category && (
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", CATEGORY_COLORS[job.category] || "")}>
                {job.category}
              </span>
            )}
          </div>
        </div>

        {skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {skills.slice(0, 6).map((s) => (
              <SkillTag key={s} skill={s} variant="primary" />
            ))}
            {skills.length > 6 && (
              <span className="text-xs text-[hsl(var(--muted-foreground))] self-center">
                +{skills.length - 6} more
              </span>
            )}
          </div>
        )}

        {(job.posted_date || job.experience_range) && (
          <div className="mt-3 flex items-center gap-4 text-xs text-[hsl(var(--muted-foreground))]">
            {job.posted_date && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatRelativeDate(job.posted_date)}
              </span>
            )}
            {job.experience_range && <span>{job.experience_range}</span>}
          </div>
        )}
      </Link>
    </motion.div>
  );
}
