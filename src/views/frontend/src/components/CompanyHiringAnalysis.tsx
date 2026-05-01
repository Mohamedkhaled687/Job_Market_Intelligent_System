import React from 'react';
import { CompanyHiringPattern, CategoryTrend } from '../hooks/useClustering';

interface CompanyHiringAnalysisProps {
  companies: CompanyHiringPattern[];
}

/**
 * Display company hiring patterns and preferences
 */
export const CompanyHiringAnalysis: React.FC<CompanyHiringAnalysisProps> = ({
  companies,
}) => {
  if (!companies.length) {
    return (
      <div className="w-full space-y-4">
        <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">Company Hiring Patterns</h2>
        <p className="text-[hsl(var(--muted-foreground))]">
          Analyze what skills, categories, and seniority levels each company is hiring for
        </p>
        <div className="rounded-lg border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.4] p-8 text-center text-[hsl(var(--muted-foreground))]">
          No company data available for the selected filters.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">Company Hiring Patterns</h2>
      <p className="text-[hsl(var(--muted-foreground))]">
        Analyze what skills, categories, and seniority levels each company is hiring for
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {companies.slice(0, 12).map((company) => (
          <div
            key={company.company}
            className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-shadow hover:shadow-lg"
          >
            {/* Company Header */}
            <div className="mb-4">
              <h3 className="text-lg font-bold break-words leading-snug text-[hsl(var(--foreground))]">
                {company.company}
              </h3>
              <div className="flex gap-4 mt-2 text-sm">
                <div>
                  <p className="text-[hsl(var(--muted-foreground))]">Open Positions</p>
                  <p className="text-2xl font-bold text-[hsl(var(--primary))]">
                    {company.total_jobs}
                  </p>
                </div>
                <div>
                  <p className="text-[hsl(var(--muted-foreground))]">Avg Salary</p>
                  <p className="text-2xl font-bold text-emerald-500">
                    ${(company.avg_salary / 1000).toFixed(0)}K
                  </p>
                </div>
              </div>
            </div>

            <hr className="my-3 border-[hsl(var(--border))]" />

            {/* Top Skills */}
            <div className="mb-4">
              <h4 className="mb-2 text-sm font-semibold text-[hsl(var(--foreground))]">
                Top Required Skills
              </h4>
              <div className="flex flex-wrap gap-1">
                {company.top_skills.slice(0, 5).map((item) => (
                  <span
                    key={item.skill}
                    className="rounded bg-[hsl(var(--accent))] px-2 py-1 text-xs text-[hsl(var(--accent-foreground))]"
                  >
                    {item.skill} ({item.count})
                  </span>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div className="mb-4">
              <h4 className="mb-2 text-sm font-semibold text-[hsl(var(--foreground))]">
                Job Categories
              </h4>
              <div className="flex flex-wrap gap-1">
                {company.categories.slice(0, 3).map((item) => (
                  <span
                    key={item.category}
                    className="rounded bg-[hsl(var(--primary))/0.15] px-2 py-1 text-xs text-[hsl(var(--primary))]"
                  >
                    {item.category.toLowerCase()} ({item.count})
                  </span>
                ))}
              </div>
            </div>

            {/* Seniority Distribution */}
            <div>
              <h4 className="mb-2 text-sm font-semibold text-[hsl(var(--foreground))]">
                Seniority Levels
              </h4>
              <div className="space-y-1">
                {company.seniority_distribution.map((item) => (
                  <div key={item.level} className="flex items-center justify-between">
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      {item.level.toLowerCase()}
                    </span>
                    <div className="mx-2 h-2 flex-1 rounded bg-[hsl(var(--muted))]">
                      <div
                        className="h-2 rounded bg-emerald-500"
                        style={{
                          width: `${(item.count / company.total_jobs) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface CategoryTrendAnalysisProps {
  trends: CategoryTrend[];
}

/**
 * Display hiring trends by job category
 */
export const CategoryTrendAnalysis: React.FC<CategoryTrendAnalysisProps> = ({
  trends,
}) => {
  if (!trends.length) {
    return (
      <div className="w-full space-y-4">
        <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">Hiring Trends by Category</h2>
        <p className="text-[hsl(var(--muted-foreground))]">
          Understand which job categories are growing and in demand
        </p>
        <div className="rounded-lg border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.4] p-8 text-center text-[hsl(var(--muted-foreground))]">
          No category trend data available.
        </div>
      </div>
    );
  }

  const maxJobs = Math.max(...trends.map((t) => t.total_jobs), 0);

  return (
    <div className="w-full space-y-4">
      <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">Hiring Trends by Category</h2>
      <p className="text-[hsl(var(--muted-foreground))]">
        Understand which job categories are growing and in demand
      </p>

      <div className="space-y-2">
        {trends.map((trend) => {
          const jobBarWidth = maxJobs > 0 ? (trend.total_jobs / maxJobs) * 100 : 0;

          return (
            <div
              key={trend.category}
              className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold capitalize text-[hsl(var(--foreground))]">{trend.category}</h3>
                <span className="text-sm font-semibold text-[hsl(var(--primary))]">
                  {trend.total_jobs} jobs
                </span>
              </div>

              {/* Jobs bar */}
              <div className="flex items-center gap-2 mb-3">
                <div className="h-4 flex-1 overflow-hidden rounded bg-[hsl(var(--muted))]">
                  <div
                    className="h-4 bg-gradient-to-r from-[hsl(var(--primary))] to-indigo-500"
                    style={{ width: `${jobBarWidth}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-[hsl(var(--muted-foreground))]">Avg Salary</p>
                  <p className="font-bold text-emerald-500">
                    ${(trend.avg_salary / 1000).toFixed(0)}K
                  </p>
                </div>
                <div>
                  <p className="text-[hsl(var(--muted-foreground))]">Companies</p>
                  <p className="font-bold text-violet-500">
                    {trend.unique_companies}
                  </p>
                </div>
                <div>
                  <p className="text-[hsl(var(--muted-foreground))]">Top Level</p>
                  <p className="font-bold text-[hsl(var(--primary))]">
                    {trend.seniority_breakdown[0]?.level.toLowerCase() || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
