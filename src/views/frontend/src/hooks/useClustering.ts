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
}

/**
 * Hook to fetch skill clustering data with heatmap
 */
export const useSkillClustering = (
  minSkillFrequency: number = 5,
  category?: string,
  seniority?: string
) => {
  return useQuery({
    queryKey: [
      'skillClustering',
      minSkillFrequency,
      category,
      seniority,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('min_skill_frequency', minSkillFrequency.toString());
      if (category) params.append('category', category);
      if (seniority) params.append('seniority', seniority);

      const response = await apiClient.get<SkillClusteringData>(
        `/api/insights/skill-clustering?${params}`
      );
      return response.data;
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
      return response.data;
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
      return response.data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};
