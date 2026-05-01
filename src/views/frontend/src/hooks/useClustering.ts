import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface SkillCluster {
  name: string;
  skills: string[];
  strength: number;
}

export interface SkillClusteringData {
  skills: string[];
  heatmap: number[][];
  clusters: SkillCluster[];
  job_count: number;
  unique_skill_count: number;
  message?: string;
  error?: string;
}

export interface CompanyHiringPattern {
  company: string;
  total_jobs: number;
  avg_salary: number;
  top_skills: Array<{ skill: string; count: number }>;
  categories: Array<{ category: string; count: number }>;
  seniority_distribution: Array<{ level: string; count: number }>;
}

export interface CompanyHiringData {
  companies: CompanyHiringPattern[];
  total_companies_analyzed: number;
  message?: string;
  error?: string;
}

export interface CompanySkillMatrix {
  companies: string[];
  skills: string[];
  heatmap: Array<{ company: string; skill_counts: number[] }>;
}

export interface CategoryTrend {
  category: string;
  total_jobs: number;
  avg_salary: number;
  unique_companies: number;
  seniority_breakdown: Array<{ level: string; count: number }>;
}

export interface CategoryTrendData {
  category_trends: CategoryTrend[];
  total_categories: number;
  message?: string;
  error?: string;
}

const DEFAULT_SKILL_CLUSTERING_DATA: SkillClusteringData = {
  skills: [],
  heatmap: [],
  clusters: [],
  job_count: 0,
  unique_skill_count: 0,
};

const DEFAULT_COMPANY_HIRING_DATA: CompanyHiringData = {
  companies: [],
  total_companies_analyzed: 0,
};

const DEFAULT_CATEGORY_TREND_DATA: CategoryTrendData = {
  category_trends: [],
  total_categories: 0,
};

/**
 * Hook to fetch skill clustering data with heatmap
 */
export const useSkillClustering = (
  minSkillFrequency: number = 5,
  category?: string,
  seniority?: string
) => {
  const normalizedMinSkillFrequency = Math.max(1, Math.min(10, Math.floor(minSkillFrequency)));
  const normalizedCategory = category?.trim() || undefined;
  const normalizedSeniority = seniority?.trim() || undefined;

  return useQuery({
    queryKey: [
      'skillClustering',
      normalizedMinSkillFrequency,
      normalizedCategory ?? 'all',
      normalizedSeniority ?? 'all',
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('min_skill_frequency', normalizedMinSkillFrequency.toString());
      if (normalizedCategory) params.append('category', normalizedCategory);
      if (normalizedSeniority) params.append('seniority', normalizedSeniority);

      const response = await apiClient.get<SkillClusteringData>(
        `/api/insights/skill-clustering?${params}`
      );
      return {
        ...DEFAULT_SKILL_CLUSTERING_DATA,
        ...response.data,
        skills: response.data?.skills ?? [],
        heatmap: response.data?.heatmap ?? [],
        clusters: response.data?.clusters ?? [],
        job_count: response.data?.job_count ?? 0,
        unique_skill_count: response.data?.unique_skill_count ?? 0,
      } satisfies SkillClusteringData;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

/**
 * Hook to fetch company hiring patterns
 */
export const useCompanyHiringPatterns = () => {
  return useQuery({
    queryKey: ['companyHiringPatterns'],
    queryFn: async () => {
      const response = await apiClient.get<CompanyHiringData>(
        '/api/insights/company-hiring-patterns'
      );
      return {
        ...DEFAULT_COMPANY_HIRING_DATA,
        ...response.data,
        companies: response.data?.companies ?? [],
        total_companies_analyzed: response.data?.total_companies_analyzed ?? 0,
      } satisfies CompanyHiringData;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

/**
 * Hook to fetch company vs skills matrix
 */
export const useCompanySkillMatrix = () => {
  return useQuery({
    queryKey: ['companySkillMatrix'],
    queryFn: async () => {
      const response = await apiClient.get<CompanySkillMatrix>(
        '/api/insights/company-skill-matrix'
      );
      return response.data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

/**
 * Hook to fetch hiring trends by category
 */
export const useCategoryHiringTrends = () => {
  return useQuery({
    queryKey: ['categoryHiringTrends'],
    queryFn: async () => {
      const response = await apiClient.get<CategoryTrendData>(
        '/api/insights/category-hiring-trends'
      );
      return {
        ...DEFAULT_CATEGORY_TREND_DATA,
        ...response.data,
        category_trends: response.data?.category_trends ?? [],
        total_categories: response.data?.total_categories ?? 0,
      } satisfies CategoryTrendData;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};
