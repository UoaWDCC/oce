import { GoogleGenAI } from "@google/genai";
import type {
  Content,
  GenerateContentConfig,
  GenerateContentResponse,
} from "@google/genai";
import type { LLMProvider } from "@/llm/interfaces/LLMProvider";
import type { LLMConfig } from "@/llm/types/LLMConfig";
import type { Message } from "@/llm/types/Message";
import type { ModelInfo } from "@/llm/types/ModelInfo";
import type { TokenUsage } from "@/llm/types/TokenUsage";

const MODEL_ID = "gemini-2.5-flash-lite";

export class GeminiProvider implements LLMProvider {
  private readonly client = new GoogleGenAI({
    apiKey: process.env.GOOGLE_API_KEY!,
  });

  private usage: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };

  getModelInfo(): ModelInfo {
    return {
      provider: "google",
      modelId: MODEL_ID,
      maxTokens: 1000000,
    };
  }

  async complete(messages: Message[], config: LLMConfig): Promise<string> {
    const response = await this.client.models.generateContent({
      model: MODEL_ID,
      contents: this.toContents(messages),
      config: this.toConfig(messages, config),
    });

    this.updateTokenUsage(response);

    return response.text ?? "";
  }

  async *stream(messages: Message[], config: LLMConfig): AsyncIterable<string> {
    const response = await this.client.models.generateContentStream({
      model: MODEL_ID,
      contents: this.toContents(messages),
      config: this.toConfig(messages, config),
    });

    for await (const chunk of response) {
      // usageMetadata is only populated on the final chunk; earlier chunks remain zero.
      this.updateTokenUsage(chunk);
      yield chunk.text ?? "";
    }
  }

  tokenUsage(): TokenUsage {
    return this.usage;
  }

  private toContents(messages: Message[]): Content[] {
    return messages
      .filter((message) => message.role !== "system")
      .map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      }));
  }

  private toConfig(
    messages: Message[],
    config: LLMConfig,
  ): GenerateContentConfig {
    const systemInstruction = messages
      .filter((message) => message.role === "system")
      .map((message) => message.content)
      .join("\n\n");

    return {
      temperature: config.temperature,
      maxOutputTokens: config.maxOutputTokens,
      topP: config.topP,
      stopSequences: config.stopSequences,
      ...(systemInstruction ? { systemInstruction } : {}),
    };
  }

  private updateTokenUsage(response: GenerateContentResponse): void {
    const usageMetadata = response.usageMetadata;

    this.usage = {
      promptTokens: usageMetadata?.promptTokenCount ?? 0,
      completionTokens: usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: usageMetadata?.totalTokenCount ?? 0,
    };
  }
}
