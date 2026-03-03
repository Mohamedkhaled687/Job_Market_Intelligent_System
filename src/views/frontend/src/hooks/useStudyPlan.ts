import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/api/client";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatResponse {
  role: string;
  content: string;
}

export type { ChatMessage };

export function useStudyPlanChat() {
  return useMutation<ChatResponse, Error, string>({
    mutationFn: async (message: string) => {
      const { data } = await apiClient.post("/api/studyplan/chat", { message });
      return data;
    },
  });
}
