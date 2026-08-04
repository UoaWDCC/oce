import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Message } from "@/llm/types/Message";

const { mockGenerateContentStream } = vi.hoisted(() => ({
  mockGenerateContentStream: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = {
      generateContent: vi.fn(),
      generateContentStream: mockGenerateContentStream,
    };
  },
}));

import { GeminiProvider } from "@/llm/providers/GeminiProvider";

async function consumeStream(
  provider: GeminiProvider,
  messages: Message[],
  config: Parameters<GeminiProvider["stream"]>[1],
) {
  for await (const chunk of provider.stream(messages, config)) {
    void chunk;
  }
}

describe("GeminiProvider system instruction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateContentStream.mockResolvedValue(
      (async function* () {
        yield { text: "Tutor reply" };
      })(),
    );
  });

  it("maps the dedicated instruction and supported configuration to Gemini", async () => {
    const messages: Message[] = [
      { role: "system", content: "Fallback instruction" },
      { role: "user", content: "Explain proof of stake." },
      { role: "assistant", content: "It is a consensus mechanism." },
      { role: "user", content: "How are validators selected?" },
    ];

    await consumeStream(new GeminiProvider(), messages, {
      systemInstruction: "Dedicated AI Tutor instruction",
      temperature: 0.3,
      maxOutputTokens: 500,
      topP: 0.9,
      stopSequences: ["END"],
    });

    expect(mockGenerateContentStream).toHaveBeenCalledOnce();
    expect(mockGenerateContentStream).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: [
          { role: "user", parts: [{ text: "Explain proof of stake." }] },
          {
            role: "model",
            parts: [{ text: "It is a consensus mechanism." }],
          },
          {
            role: "user",
            parts: [{ text: "How are validators selected?" }],
          },
        ],
        config: expect.objectContaining({
          systemInstruction: "Dedicated AI Tutor instruction",
          temperature: 0.3,
          maxOutputTokens: 500,
          topP: 0.9,
          stopSequences: ["END"],
        }),
      }),
    );
  });

  it("uses system-role messages as a fallback instruction", async () => {
    const messages: Message[] = [
      { role: "system", content: "First instruction" },
      { role: "system", content: "Second instruction" },
      { role: "user", content: "What is a DAO?" },
    ];

    await consumeStream(new GeminiProvider(), messages, {});

    expect(mockGenerateContentStream).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: [{ role: "user", parts: [{ text: "What is a DAO?" }] }],
        config: expect.objectContaining({
          systemInstruction: "First instruction\n\nSecond instruction",
        }),
      }),
    );
  });
});
