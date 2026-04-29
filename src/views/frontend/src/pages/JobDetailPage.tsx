import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Building2, MapPin, Briefcase, Clock,
  ExternalLink, Bookmark, Share2,
} from "lucide-react";
import { motion } from "framer-motion";
import { useJobDetail } from "@/hooks/useJobs";
import { SkillTag } from "@/components/SkillTag";
import { Skeleton } from "@/components/Skeleton";
import { cn, formatRelativeDate, CATEGORY_COLORS, SENIORITY_COLORS } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: job, isLoading, isError } = useJobDetail(id);
  const [saved, setSaved] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="space-y-4">
        <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
          <ArrowLeft className="h-4 w-4" /> Back to jobs
        </Link>
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-12 text-center">
          <p className="text-lg font-medium">Job not found</p>
        </div>
      </div>
    );
  }

  const skills = job.normalized_skills.length > 0 ? job.normalized_skills : job.listed_skills;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
        <Link to="/jobs" className="hover:text-[hsl(var(--foreground))] transition-colors">Jobs</Link>
        <span>/</span>
        <span className="text-[hsl(var(--foreground))] truncate max-w-xs">{job.title}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">{job.title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[hsl(var(--muted-foreground))]">
                  <span className="flex items-center gap-1"><Building2 className="h-4 w-4" /> {job.company}</span>
                  {job.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {job.location}</span>}
                  {job.job_type && <span className="flex items-center gap-1"><Briefcase className="h-4 w-4" /> {job.job_type}</span>}
                  {job.posted_date && <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {formatRelativeDate(job.posted_date)}</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSaved(!saved);
                    toast(saved ? "Removed from saved" : "Job saved!");
                  }}
                  className={cn(
                    "rounded-lg p-2 transition-colors",
                    saved ? "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]" : "hover:bg-[hsl(var(--muted))]"
                  )}
                >
                  <Bookmark className="h-5 w-5" fill={saved ? "currentColor" : "none"} />
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast("Link copied to clipboard!");
                  }}
                  className="rounded-lg p-2 hover:bg-[hsl(var(--muted))] transition-colors"
                >
                  <Share2 className="h-5 w-5" />
                </button>
              </div>
            </div>

            {job.experience_range && (
              <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
                Experience: {job.experience_range}
              </p>
            )}

            {job.source_url && (
              <a
                href={job.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1 rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"
              >
                View Original <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          {/* Description */}
          {job.description_text && (
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
              <h2 className="text-lg font-semibold mb-3">Description</h2>
              <p className="text-[hsl(var(--muted-foreground))] whitespace-pre-line leading-relaxed">
                {job.description_text}
              </p>
            </div>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
              <h2 className="text-lg font-semibold mb-3">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <SkillTag key={s} skill={s} variant="primary" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI Insights Sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
            <h2 className="text-lg font-semibold mb-4">AI Insights</h2>
            <div className="space-y-4">
              {job.seniority && (
                <div>
                  <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">Seniority</p>
                  <span className={cn("inline-block rounded-full px-3 py-1 text-sm font-medium capitalize", SENIORITY_COLORS[job.seniority] || "")}>
                    {job.seniority}
                  </span>
                </div>
              )}
              {job.category && (
                <div>
                  <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">Category</p>
                  <span className={cn("inline-block rounded-full px-3 py-1 text-sm font-medium capitalize", CATEGORY_COLORS[job.category] || "")}>
                    {job.category}
                  </span>
                </div>
              )}
              {job.salary_estimate != null && job.salary_estimate > 0 && (
                <div>
                  <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">Estimated Salary</p>
                  <p className="text-xl font-bold text-[hsl(var(--primary))]">
                    ${job.salary_estimate.toLocaleString()}
                  </p>
                </div>
              )}
              {job.enriched_at && (
                <div>
                  <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">Enriched</p>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {new Date(job.enriched_at).toLocaleDateString()}
                  </p>
                </div>
              )}
              {!job.seniority && !job.category && !job.salary_estimate && (
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  No AI enrichment data available yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
            <h2 className="text-lg font-semibold mb-2">Source</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] capitalize">{job.source}</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              Scraped {formatRelativeDate(job.scraped_at)}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
