import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";

export interface DashboardData {
  total_jobs: number;
  top_skills: { skill: string; count: number }[];
  salary_stats: { avg_salary: number; min_salary: number; max_salary: number };
  category_distribution: { category: string; count: number }[];
  seniority_distribution: { seniority: string; count: number }[];
  top_companies: { company: string; count: number }[];
  monthly_trends: { month: string; count: number }[];
}

export interface SkillGraphNode {
  id: string;
  count: number;
}

export interface SkillGraphData {
  nodes: SkillGraphNode[];
  edges: { source: string; target: string; weight: number }[];
}

export interface RoleComparisonRow {
  label: string;
  avg_salary: number;
  count: number;
  category: string | null;
  seniority: string | null;
}

export interface SalaryIntelData {
  percentiles: { p25: number; p50: number; p75: number; p90: number };
  distribution: { range_start: number; range_end: number; count: number }[];
  role_comparisons: RoleComparisonRow[];
  comparison_title: string;
  comparison_subtitle: string;
  comparison_mode: string;
  count: number;
  avg: number;
}

export function useDashboard(category?: string, seniority?: string) {
  return useQuery<DashboardData>({
    queryKey: ["dashboard", { category, seniority }],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (category) params.category = category;
      if (seniority) params.seniority = seniority;
      const { data } = await apiClient.get("/api/insights/dashboard", { params });
      return data;
    },
    staleTime: 60_000,
  });
}

export function useSkillGraph(minWeight: number = 3) {
  return useQuery<SkillGraphData>({
    queryKey: ["skill-graph", minWeight],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/insights/skill-graph", {
        params: { min_weight: minWeight },
      });
      return data;
    },
    staleTime: 120_000,
  });
}

export function useSalaryIntelligence(
  category?: string,
  seniority?: string,
  location?: string,
) {
  return useQuery<SalaryIntelData>({
    queryKey: ["salary-intelligence", { category, seniority, location }],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (category) params.category = category;
      if (seniority) params.seniority = seniority;
      if (location) params.location = location;
      const { data } = await apiClient.get("/api/insights/salary-intelligence", { params });
      return data;
    },
    staleTime: 120_000,
  });
}
