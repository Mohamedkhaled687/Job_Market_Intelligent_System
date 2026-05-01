import React, { useState } from 'react';
import { Skeleton } from '../components/Skeleton';
import { SkillHeatmap, SkillClusterCard } from '../components/SkillHeatmap';
import {
  CompanyHiringAnalysis,
  CategoryTrendAnalysis,
} from '../components/CompanyHiringAnalysis';
import {
  useSkillClustering,
  useCompanyHiringPatterns,
  useCategoryHiringTrends,
} from '../hooks/useClustering';

/**
 * Advanced analytics page for clustering and big data analysis
 * Features:
 * - Skill co-occurrence heatmap and clustering
 * - Company hiring patterns analysis
 * - Category-based hiring trends
 */
export const ClusteringAnalysisPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [minFrequency, setMinFrequency] = useState(2);

  const skillClustering = useSkillClustering(minFrequency, selectedCategory);
  const companyPatterns = useCompanyHiringPatterns();
  const categoryTrends = useCategoryHiringTrends();

  const categories = [
    'backend',
    'frontend',
    'fullstack',
    'data',
    'devops',
    'mobile',
    'ai',
    'qa',
    'design',
    'management',
    'cybersecurity',
  ];

  const hasSkillData = (skillClustering.data?.skills?.length ?? 0) > 0;
  const hasCompanyData = (companyPatterns.data?.companies?.length ?? 0) > 0;
  const hasCategoryData = (categoryTrends.data?.category_trends?.length ?? 0) > 0;

  const clearFilters = () => {
    setSelectedCategory(undefined);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Clustering & Big Data Analysis</h1>
          <p className="text-blue-100">
            Discover skill patterns, company hiring preferences, and market trends
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Filters</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Category
              </label>
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value || undefined)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Frequency Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min. Skill Frequency
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={minFrequency}
                onChange={(e) => setMinFrequency(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1</span>
                <span>Current: {minFrequency}</span>
                <span>10</span>
              </div>
            </div>
          </div>
        </div>

        {/* Skill Clustering Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          {skillClustering.isLoading ? (
            <Skeleton className="w-full h-96" />
          ) : skillClustering.error ? (
            <div className="text-center py-8 text-red-600">
              Error loading skill clustering data
            </div>
          ) : hasSkillData ? (
            <>
              {/* Heatmap */}
              <SkillHeatmap
                skills={skillClustering.data?.skills || []}
                heatmapData={skillClustering.data?.heatmap || []}
                title="Skill Co-Occurrence Heatmap"
                width={900}
                height={600}
              />

              {/* Clusters */}
              <div className="mt-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  Identified Skill Clusters
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(skillClustering.data?.clusters || []).map((cluster, idx) => (
                    <SkillClusterCard
                      key={idx}
                      name={cluster.name}
                      skills={cluster.skills}
                      strength={cluster.strength}
                    />
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded">
                  <p className="text-gray-600 text-sm">Total Jobs Analyzed</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {skillClustering.data?.job_count?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded">
                  <p className="text-gray-600 text-sm">Unique Skills</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {skillClustering.data?.unique_skill_count || 0}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded">
                  <p className="text-gray-600 text-sm">Skill Clusters</p>
                  <p className="text-2xl font-bold text-green-600">
                    {(skillClustering.data?.clusters || []).length}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded">
                  <p className="text-gray-600 text-sm">Analysis Date</p>
                  <p className="text-xl font-bold text-orange-600">Today</p>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center text-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No skill clustering data available for the selected filters
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Try a broader category or clear the filters to analyze the full job set.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Company Hiring Patterns Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          {companyPatterns.isLoading ? (
            <Skeleton className="w-full h-96" />
          ) : companyPatterns.error ? (
            <div className="text-center py-8 text-red-600">
              Error loading company data
            </div>
          ) : hasCompanyData ? (
            <CompanyHiringAnalysis companies={companyPatterns.data?.companies || []} />
          ) : (
            <div className="text-center py-8 text-gray-600">
              No company data available
            </div>
          )}
        </div>

        {/* Category Trends Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          {categoryTrends.isLoading ? (
            <Skeleton className="w-full h-96" />
          ) : categoryTrends.error ? (
            <div className="text-center py-8 text-red-600">
              Error loading category trends
            </div>
          ) : hasCategoryData ? (
            <CategoryTrendAnalysis trends={categoryTrends.data?.category_trends || []} />
          ) : (
            <div className="text-center py-8 text-gray-600">
              No category data available
            </div>
          )}
        </div>

        {/* Insights Section */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📊 Key Insights</h2>
          <ul className="space-y-2 text-gray-700">
            <li>
              • Skills often required together form natural career paths (e.g.,
              frontend stack)
            </li>
            <li>
              • Top companies have distinct skill preferences and hiring patterns
            </li>
            <li>• Backend and AI roles have higher average salaries</li>
            <li>• Most opportunities are for mid-level and senior positions</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ClusteringAnalysisPage;
