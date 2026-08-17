import { SITE_GUIDE } from "@/features/chatbot/server/knowledge/siteGuide";
import { AI_TUTOR_SYSTEM_PROMPT } from "@/features/chatbot/server/prompts/aiTutorSystemPrompt";

export function buildAiTutorInstruction(): string {
  return `${AI_TUTOR_SYSTEM_PROMPT}
  
Use this platform navigation information to answer user questions:

${JSON.stringify(SITE_GUIDE, null, 2)}`;
}
