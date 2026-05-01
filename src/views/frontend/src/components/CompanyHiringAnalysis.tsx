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
        <h2 className="text-2xl font-bold text-gray-800">Company Hiring Patterns</h2>
        <p className="text-gray-600">
          Analyze what skills, categories, and seniority levels each company is hiring for
        </p>
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-600">
          No company data available for the selected filters.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">Company Hiring Patterns</h2>
      <p className="text-gray-600">
        Analyze what skills, categories, and seniority levels each company is hiring for
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {companies.slice(0, 12).map((company) => (
          <div
            key={company.company}
            className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow"
          >
            {/* Company Header */}
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900 break-words leading-snug">
                {company.company}
              </h3>
              <div className="flex gap-4 mt-2 text-sm">
                <div>
                  <p className="text-gray-600">Open Positions</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {company.total_jobs}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Avg Salary</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${(company.avg_salary / 1000).toFixed(0)}K
                  </p>
                </div>
              </div>
            </div>

            <hr className="my-3" />

            {/* Top Skills */}
            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 text-sm mb-2">
                Top Required Skills
              </h4>
              <div className="flex flex-wrap gap-1">
                {company.top_skills.slice(0, 5).map((item) => (
                  <span
                    key={item.skill}
                    className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                  >
                    {item.skill} ({item.count})
                  </span>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 text-sm mb-2">
                Job Categories
              </h4>
              <div className="flex flex-wrap gap-1">
                {company.categories.slice(0, 3).map((item) => (
                  <span
                    key={item.category}
                    className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded"
                  >
                    {item.category.toLowerCase()} ({item.count})
                  </span>
                ))}
              </div>
            </div>

            {/* Seniority Distribution */}
            <div>
              <h4 className="font-semibold text-gray-700 text-sm mb-2">
                Seniority Levels
              </h4>
              <div className="space-y-1">
                {company.seniority_distribution.map((item) => (
                  <div key={item.level} className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">
                      {item.level.toLowerCase()}
                    </span>
                    <div className="flex-1 mx-2 bg-gray-200 h-2 rounded">
                      <div
                        className="bg-green-500 h-2 rounded"
                        style={{
                          width: `${(item.count / company.total_jobs) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-600">{item.count}</span>
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
        <h2 className="text-2xl font-bold text-gray-800">Hiring Trends by Category</h2>
        <p className="text-gray-600">
          Understand which job categories are growing and in demand
        </p>
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-600">
          No category trend data available.
        </div>
      </div>
    );
  }

  const maxJobs = Math.max(...trends.map((t) => t.total_jobs), 0);

  return (
    <div className="w-full space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">Hiring Trends by Category</h2>
      <p className="text-gray-600">
        Understand which job categories are growing and in demand
      </p>

      <div className="space-y-2">
        {trends.map((trend) => {
          const jobBarWidth = maxJobs > 0 ? (trend.total_jobs / maxJobs) * 100 : 0;

          return (
            <div
              key={trend.category}
              className="bg-white p-4 rounded-lg border border-gray-200"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-900 capitalize">{trend.category}</h3>
                <span className="text-sm font-semibold text-blue-600">
                  {trend.total_jobs} jobs
                </span>
              </div>

              {/* Jobs bar */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 bg-gray-200 h-4 rounded overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-400 to-blue-600 h-4"
                    style={{ width: `${jobBarWidth}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-gray-600">Avg Salary</p>
                  <p className="font-bold text-green-600">
                    ${(trend.avg_salary / 1000).toFixed(0)}K
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Companies</p>
                  <p className="font-bold text-purple-600">
                    {trend.unique_companies}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Top Level</p>
                  <p className="font-bold text-blue-600">
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
