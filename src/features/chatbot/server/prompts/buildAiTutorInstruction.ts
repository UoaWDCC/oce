import { AI_TUTOR_SYSTEM_PROMPT } from "@/features/chatbot/server/prompts/aiTutorSystemPrompt";

export function buildAiTutorInstruction(): string {
  return AI_TUTOR_SYSTEM_PROMPT;
}
