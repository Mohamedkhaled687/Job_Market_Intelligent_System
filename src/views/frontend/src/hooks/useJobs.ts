import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { useFilterStore } from "@/store/filterStore";

export interface Job {
  id: string;
  source: string;
  source_url: string;
  title: string;
  company: string;
  location: string;
  experience_range: string;
  job_type: string;
  description_text: string;
  listed_skills: string[];
  posted_date: string | null;
  scraped_at: string;
  normalized_skills: string[];
  seniority: string | null;
  category: string | null;
  salary_estimate: number | null;
  enriched_at: string | null;
}

interface PaginatedJobs {
  jobs: Job[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export function useJobs() {
  const { company, location, skill, seniority, category, search, page, perPage } = useFilterStore();

  return useQuery<PaginatedJobs>({
    queryKey: ["jobs", { company, location, skill, seniority, category, search, page, perPage }],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, per_page: perPage };
      if (company) params.company = company;
      if (location) params.location = location;
      if (skill) params.skill = skill;
      if (seniority) params.seniority = seniority;
      if (category) params.category = category;
      if (search) params.search = search;
      const { data } = await apiClient.get("/api/jobs", { params });
      return data;
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useJobDetail(jobId: string | undefined) {
  return useQuery<Job>({
    queryKey: ["job", jobId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/jobs/${jobId}`);
      return data;
    },
    enabled: !!jobId,
    staleTime: 60_000,
  });
}
