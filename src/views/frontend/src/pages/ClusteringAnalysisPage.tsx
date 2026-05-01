import React, { useState } from 'react';
import { Layers, Filter, RefreshCw, AlertCircle } from 'lucide-react';
import { Skeleton } from '../components/Skeleton';
import { SkillHeatmap, SkillClusterCard } from '../components/SkillHeatmap';
import {
  CompanyHiringAnalysis,
} from '../components/CompanyHiringAnalysis';
import {
  useSkillClustering,
  useCompanyHiringPatterns,
} from '../hooks/useClustering';

export const ClusteringAnalysisPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [minFrequency, setMinFrequency] = useState(3);

  const skillClustering = useSkillClustering(minFrequency, selectedCategory);
  const companyPatterns = useCompanyHiringPatterns();

  const categories = [
    'backend', 'frontend', 'fullstack', 'data', 'devops', 'mobile',
    'ai', 'qa', 'design', 'management', 'cybersecurity',
  ];

  const hasSkillData = (skillClustering.data?.skills?.length ?? 0) > 0;
  const hasCompanyData = (companyPatterns.data?.companies?.length ?? 0) > 0;
  const apiMessage = skillClustering.data?.message || skillClustering.data?.error;

  const clearFilters = () => {
    setSelectedCategory(undefined);
    setMinFrequency(3);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-gradient-to-r from-[hsl(var(--card))] to-[hsl(var(--muted))/0.4] px-6 py-8">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-[hsl(var(--primary))/0.15] p-3 text-[hsl(var(--primary))]">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]">Clustering Analysis</h1>
            <p className="mt-1 text-[hsl(var(--muted-foreground))]">
              Explore skill co-occurrence, company hiring behavior, and category trends.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">Filters</h2>
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 text-sm text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-[hsl(var(--muted-foreground))]">
              Job Category
            </label>
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value || undefined)}
              className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-2 text-sm text-[hsl(var(--foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))/0.2]"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[hsl(var(--muted-foreground))]">
              Min. Skill Frequency
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={minFrequency}
              onChange={(e) => setMinFrequency(parseInt(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[hsl(var(--muted))] accent-[hsl(var(--primary))]"
            />
            <div className="mt-1 flex justify-between text-xs text-[hsl(var(--muted-foreground))]">
              <span>1</span>
              <span>Current: {minFrequency}</span>
              <span>10</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Jobs Analyzed" value={(skillClustering.data?.job_count ?? 0).toLocaleString()} />
        <StatCard label="Unique Skills" value={(skillClustering.data?.unique_skill_count ?? 0).toString()} />
        <StatCard label="Top Companies" value={(companyPatterns.data?.total_companies_analyzed ?? 0).toString()} />
      </div>

      {apiMessage && (
        <div className="flex items-start gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.4] p-4 text-sm text-[hsl(var(--muted-foreground))]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{apiMessage}</span>
        </div>
      )}

      <div className="space-y-8">
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          {skillClustering.isLoading ? (
            <Skeleton className="h-[420px] w-full" />
          ) : skillClustering.error ? (
            <InlineError text="Error loading skill clustering data." />
          ) : hasSkillData ? (
            <>
              <SkillHeatmap
                skills={skillClustering.data?.skills || []}
                heatmapData={skillClustering.data?.heatmap || []}
                title="Skill Co-Occurrence Heatmap"
                width={900}
                height={600}
              />
              <div className="mt-8">
                <h3 className="mb-3 text-xl font-semibold text-[hsl(var(--foreground))]">Identified Skill Clusters</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {(skillClustering.data?.clusters || []).map((cluster, idx) => (
                    <SkillClusterCard key={idx} name={cluster.name} skills={cluster.skills} strength={cluster.strength} />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              title="No skill clustering data for these filters"
              description="Try reducing the minimum frequency or clear category filters to include more jobs."
              onReset={clearFilters}
            />
          )}
        </div>

        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          {companyPatterns.isLoading ? (
            <Skeleton className="h-[320px] w-full" />
          ) : companyPatterns.error ? (
            <InlineError text="Error loading company hiring data." />
          ) : hasCompanyData ? (
            <CompanyHiringAnalysis companies={companyPatterns.data?.companies || []} />
          ) : (
            <EmptyState title="No company data available" description="No company records were found for the current selection." />
          )}
        </div>

        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.35] p-6">
          <h2 className="mb-3 text-xl font-semibold text-[hsl(var(--foreground))]">Key Reading Guide</h2>
          <ul className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
            <li>- Darker cells in heatmap mean stronger skill co-occurrence.</li>
            <li>- Cluster cards summarize skills that commonly appear together in job posts.</li>
            <li>- Company blocks show who is hiring most and what they prioritize.</li>
            <li>- Category trends compare demand size, average salary, and hiring breadth.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
      <p className="text-xs text-[hsl(var(--muted-foreground))]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[hsl(var(--foreground))]">{value}</p>
    </div>
  );
}

function InlineError({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
      {text}
    </div>
  );
}

function EmptyState({
  title,
  description,
  onReset,
}: {
  title: string;
  description: string;
  onReset?: () => void;
}) {
  return (
    <div className="rounded-lg border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.35] px-6 py-10 text-center">
      <h3 className="mb-1 text-lg font-semibold text-[hsl(var(--foreground))]">{title}</h3>
      <p className="mb-4 text-sm text-[hsl(var(--muted-foreground))]">{description}</p>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90"
        >
          Reset filters
        </button>
      )}
    </div>
  );
}

export default ClusteringAnalysisPage;
