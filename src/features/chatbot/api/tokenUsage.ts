import { TokenUsageSummary } from "@/features/chatbot/types";
import { apiFetch } from "../utils/apiFetch";

export async function getTokenUsage(): Promise<TokenUsageSummary> {
  const response = await apiFetch("/api/ai-tutor/token-usage", {}, true);
  return (await response.json()) as TokenUsageSummary;
}
