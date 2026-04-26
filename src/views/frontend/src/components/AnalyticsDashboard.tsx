/**
 * Analytics Dashboard Component
 * Displays insights from Analytics Service
 */

import { useState } from "react";
import { useDashboard } from "@/hooks/useInsights";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, Users, Target, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "./Skeleton";

const COLORS = ["hsl(221, 83%, 53%)", "hsl(160, 60%, 45%)", "hsl(340, 75%, 55%)", "hsl(280, 85%, 65%)", "hsl(40, 90%, 50%)"];

export function AnalyticsDashboard() {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSeniority, setSelectedSeniority] = useState<string>("");

  const { data, isLoading, error } = useDashboard(selectedCategory, selectedSeniority);

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 p-6 flex gap-3">
        <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-red-900 dark:text-red-100">Analytics Error</h3>
          <p className="text-sm text-red-800 dark:text-red-200 mt-1">{(error as any)?.message || "Failed to load analytics"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Market Analytics</h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          Real-time insights into the job market powered by aggregated data
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Total Jobs"
          value={data.total_jobs}
          icon={Target}
          color="bg-blue-100 dark:bg-blue-900"
          trend="+12% this month"
        />
        <KPICard
          title="Companies Hiring"
          value={data.total_companies}
          icon={Users}
          color="bg-purple-100 dark:bg-purple-900"
          trend="Active in market"
        />
        <KPICard
          title="Avg Salary"
          value={data.salary_stats.avg_salary}
          icon={TrendingUp}
          color="bg-green-100 dark:bg-green-900"
          prefix="$"
          trend="Market rate"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-48">
          <label className="block text-sm font-medium mb-2">Filter by Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))]"
          >
            <option value="">All Categories</option>
            {data.category_distribution?.map((cat: { category: string; count: number }) => (
              <option key={cat.category} value={cat.category}>
                {cat.category} ({cat.count})
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-48">
          <label className="block text-sm font-medium mb-2">Filter by Seniority</label>
          <select
            value={selectedSeniority}
            onChange={(e) => setSelectedSeniority(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))]"
          >
            <option value="">All Levels</option>
            {data.seniority_distribution?.map((sen: { seniority: string; count: number }) => (
              <option key={sen.seniority} value={sen.seniority}>
                {sen.seniority} ({sen.count})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Category Distribution */}
      {data.category_distribution && data.category_distribution.length > 0 && (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <h2 className="text-xl font-bold mb-4">Job Distribution by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.category_distribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(221, 83%, 53%)" radius={[8, 8, 0, 0]}>
                {data.category_distribution.map((_: { category: string; count: number }, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Seniority Distribution */}
      {data.seniority_distribution && data.seniority_distribution.length > 0 && (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <h2 className="text-xl font-bold mb-4">Job Distribution by Seniority</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.seniority_distribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="seniority" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(160, 60%, 45%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Skills */}
      {data.top_skills && data.top_skills.length > 0 && (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <h2 className="text-xl font-bold mb-4">Top In-Demand Skills</h2>
          <div className="space-y-3">
            {data.top_skills.slice(0, 10).map((skill: { skill: string; count: number }, idx: number) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{skill.skill}</span>
                    <span className="text-xs bg-[hsl(var(--muted))] px-2 py-1 rounded">{skill.count} jobs</span>
                  </div>
                  <div className="w-full h-2 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(skill.count / (data.top_skills[0]?.count || 1)) * 100}%` }}
                      transition={{ duration: 0.6 }}
                      className="h-full bg-[hsl(var(--primary))]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Companies */}
      {data.top_companies && data.top_companies.length > 0 && (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <h2 className="text-xl font-bold mb-4">Top Hiring Companies</h2>
          <div className="space-y-3">
            {data.top_companies.slice(0, 8).map((company: { company: string; count: number; avg_salary?: number }, idx: number) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--muted))] transition-colors"
              >
                <div>
                  <p className="font-semibold">{company.company}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {company.count} open positions
                  </p>
                </div>
                {company.avg_salary && (
                  <div className="text-right">
                    <p className="font-semibold text-[hsl(var(--primary))]">
                      ${Number(company.avg_salary).toLocaleString()}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">avg salary</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Salary Statistics */}
      {data.salary_stats && (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <h2 className="text-xl font-bold mb-4">Salary Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SalaryStatCard
              label="Minimum"
              value={data.salary_stats.min_salary}
              color="bg-red-100 dark:bg-red-900"
            />
            <SalaryStatCard
              label="Average"
              value={data.salary_stats.avg_salary}
              color="bg-blue-100 dark:bg-blue-900"
            />
            <SalaryStatCard
              label="Median"
              value={data.salary_stats.median_salary}
              color="bg-green-100 dark:bg-green-900"
            />
            <SalaryStatCard
              label="Maximum"
              value={data.salary_stats.max_salary}
              color="bg-purple-100 dark:bg-purple-900"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function KPICard({
  title,
  value,
  icon: Icon,
  color,
  prefix = "",
  trend,
}: {
  title: string;
  value?: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  prefix?: string;
  trend?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-1">{title}</p>
          <p className="text-2xl font-bold">
            {prefix}
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {trend && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">{trend}</p>}
        </div>
        <div className={`rounded-lg ${color} p-3`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </motion.div>
  );
}

function SalaryStatCard({
  label,
  value,
  color,
}: {
  label: string;
  value?: number;
  color: string;
}) {
  return (
    <div className={`rounded-lg ${color} p-4`}>
      <p className="text-xs font-medium opacity-75 mb-1">{label}</p>
      <p className="text-xl font-bold">${value ? value.toLocaleString() : "N/A"}</p>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Market Analytics</h1>
        <p className="text-[hsl(var(--muted-foreground))]">Loading insights...</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>

      <div className="flex gap-3">
        <Skeleton className="flex-1 h-10" />
        <Skeleton className="flex-1 h-10" />
      </div>

      {[1, 2].map((i) => (
        <Skeleton key={i} className="h-80" />
      ))}
    </div>
  );
}