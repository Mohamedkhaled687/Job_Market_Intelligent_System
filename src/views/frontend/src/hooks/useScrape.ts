import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";

interface ScrapeRequest {
  keywords?: string[];
  max_pages?: number;
}

interface ScrapeResponse {
  task_id: string;
  status: string;
}

interface ScrapeStatus {
  task_id: string;
  status: string;
  pages_scraped: number;
  jobs_found: number;
  errors: number;
  started_at: string;
  finished_at: string | null;
}

export function useTriggerScrape() {
  return useMutation<ScrapeResponse, Error, ScrapeRequest>({
    mutationFn: async (request) => {
      const { data } = await apiClient.post("/scrape/jobs", request);
      return data;
    },
  });
}

export function useScrapeStatus(taskId: string | null) {
  return useQuery<ScrapeStatus>({
    queryKey: ["scrape-status", taskId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/scrape/status/${taskId}`);
      return data;
    },
    enabled: !!taskId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "completed" ? false : 2000;
    },
  });
}
