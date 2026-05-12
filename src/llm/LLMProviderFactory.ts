import type { LLMProvider } from "@/llm/interfaces/LLMProvider";

/**
 * Reads LLM_PROVIDER from the environment and returns the matching provider instance.
 */
export function createLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER!;

  switch (provider) {
    // TODO: Add new provider cases here as implementations are built
    // e.g. case "google": return new GoogleProvider();
    default:
      throw new Error(`Unrecognised LLM provider: "${provider}". Did you set LLM_PROVIDER in your .env?`);
  }
}
