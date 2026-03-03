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

export interface SkillGraphData {
  nodes: { id: string; count: number }[];
  edges: { source: string; target: string; weight: number }[];
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
