import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { AI_TUTOR_SYSTEM_PROMPT } from "@/features/chatbot/server/prompts/aiTutorSystemPrompt";
import { buildAiTutorInstruction } from "@/features/chatbot/server/prompts/buildAiTutorInstruction";
import type { Message } from "@/llm/types/Message";

const { mockStream } = vi.hoisted(() => ({
  mockStream: vi.fn(),
}));

vi.mock("@/llm/LLMProviderFactory", () => ({
  createLLMProvider: () => ({ stream: mockStream }),
}));

vi.mock("@/utils/authHelper", () => ({
  authenticateRequest: vi.fn(),
  getAdminClient: vi.fn(),
}));

import { POST } from "@/app/api/ai-tutor/chat/stream/route";

describe("AI Tutor system instruction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "development");
    mockStream.mockImplementation(async function* () {
      yield "Tutor reply";
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds the reusable system prompt", () => {
    expect(buildAiTutorInstruction()).toBe(AI_TUTOR_SYSTEM_PROMPT);
  });

  it("passes the instruction and existing configuration without changing messages", async () => {
    const messages: Message[] = [
      { role: "user", content: "What is a smart contract?" },
      { role: "assistant", content: "It is a program on a blockchain." },
      { role: "user", content: "Can you give me an example?" },
    ];
    const config = {
      temperature: 0.4,
      maxOutputTokens: 300,
      topP: 0.8,
      stopSequences: ["STOP"],
    };
    const request = new NextRequest(
      "http://localhost/api/ai-tutor/chat/stream",
      {
        method: "POST",
        headers: {
          Authorization: "dev",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages, config }),
      },
    );

    const response = await POST(request);
    await response.text();

    expect(mockStream).toHaveBeenCalledOnce();
    expect(mockStream).toHaveBeenCalledWith(messages, {
      ...config,
      systemInstruction: buildAiTutorInstruction(),
    });

    const [passedMessages] = mockStream.mock.calls[0] as [Message[]];
    expect(passedMessages).toEqual(messages);
    expect(passedMessages).toHaveLength(messages.length);
    expect(
      passedMessages.some(
        (message) => message.content === buildAiTutorInstruction(),
      ),
    ).toBe(false);
  });
});
