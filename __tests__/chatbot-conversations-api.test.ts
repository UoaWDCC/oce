// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PageContextRequest } from "@/features/chatbot/pageContext";
import type { Message } from "@/llm/types/Message";
import { streamAssistantMessage } from "@/features/chatbot/api/conversations";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock("@/features/chatbot/utils/apiFetch", () => ({
  apiFetch: apiFetchMock,
}));

const messages: Message[] = [{ role: "user", content: "What is this page?" }];

function streamResponse() {
  return new Response(
    'data: "Tutor reply"\n\ndata: [MESSAGE_ID]assistant-1\n\ndata: [DONE]\n\n',
  );
}

describe("streamAssistantMessage request payload", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue(streamResponse());
  });

  it("sends provided page context with only its canonical path", async () => {
    const onText = vi.fn();
    const onMessageId = vi.fn();
    const contextWithExtraRuntimeData = {
      path: "/dao/{DAOID}",
      untrusted: "must-not-be-forwarded",
    } as PageContextRequest & { untrusted: string };

    await streamAssistantMessage(
      "conversation-1",
      messages,
      { onText, onMessageId },
      contextWithExtraRuntimeData,
    );

    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    const [url, options, authenticated] = apiFetchMock.mock.calls[0];
    expect(url).toBe("/api/ai-tutor/chat/stream");
    expect(options).toMatchObject({ method: "POST" });
    expect(authenticated).toBe(true);
    expect(JSON.parse(String(options.body))).toEqual({
      conversation_id: "conversation-1",
      messages,
      page_context: { path: "/dao/{DAOID}" },
    });
    expect(onText).toHaveBeenCalledWith("Tutor reply");
    expect(onMessageId).toHaveBeenCalledWith("assistant-1");
  });

  it("omits page_context when context is not supplied", async () => {
    await streamAssistantMessage("conversation-2", messages, {
      onText: vi.fn(),
      onMessageId: vi.fn(),
    });

    const [url, options, authenticated] = apiFetchMock.mock.calls[0];
    const body = JSON.parse(String(options.body));

    expect(url).toBe("/api/ai-tutor/chat/stream");
    expect(options).toMatchObject({ method: "POST" });
    expect(authenticated).toBe(true);
    expect(body).toEqual({
      conversation_id: "conversation-2",
      messages,
    });
    expect(body).not.toHaveProperty("page_context");
  });

  it("preserves stream-request cancellation error propagation", async () => {
    const abortError = new DOMException(
      "The request was aborted",
      "AbortError",
    );
    apiFetchMock.mockRejectedValueOnce(abortError);

    await expect(
      streamAssistantMessage("conversation-3", messages, {
        onText: vi.fn(),
        onMessageId: vi.fn(),
      }),
    ).rejects.toBe(abortError);

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/api/ai-tutor/chat/stream",
      expect.objectContaining({ method: "POST" }),
      true,
    );
  });
});
