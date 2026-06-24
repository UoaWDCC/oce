import type { LLMConfig } from "@/llm/types/LLMConfig";
import type { Message } from "@/llm/types/Message";
import type { ModelInfo } from "@/llm/types/ModelInfo";
import type { TokenUsage } from "@/llm/types/TokenUsage";

export interface LLMProvider {
  /**
   * Returns metadata about the provider's configured model.
   * Use this when callers need to inspect model limits or display model details.
   */
  getModelInfo(): ModelInfo;

  /**
   * Generates a complete response for the given message history.
   * Use this for request/response flows where the full output is needed at once.
   */
  complete(messages: Message[], config: LLMConfig): Promise<string>;

  /**
   * Streams a response for the given message history in incremental chunks.
   * Use this for interactive UI flows where partial output should be shown as it arrives.
   */
  stream(messages: Message[], config: LLMConfig): AsyncIterable<string>;

  /**
   * Returns token usage from the most recent provider operation.
   * Use this for logging, analytics, billing, or enforcing usage limits.
   */
  tokenUsage(): TokenUsage;
}
