// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PageContextRequest } from "@/features/chatbot/pageContext";
import type { Message } from "@/llm/types/Message";
import {
  AssistantStreamError,
  streamAssistantMessage,
} from "@/features/chatbot/api/conversations";

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

describe("streamAssistantMessage terminal outcomes", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  function splitResponse(payload: string) {
    const bytes = new TextEncoder().encode(payload);
    let offset = 0;
    return new Response(
      new ReadableStream<Uint8Array>({
        pull(controller) {
          if (offset === bytes.length) {
            controller.close();
            return;
          }
          controller.enqueue(bytes.slice(offset, ++offset));
        },
      }),
    );
  }

  it("preserves split UTF-8, multiline text and quoted sentinel content", async () => {
    const content = "  Kāhui 🤖\n\nNext line\n[DONE]\n[ERROR]";
    const response = splitResponse(
      `data: ${JSON.stringify(content)}\n\ndata: [MESSAGE_ID]assistant-1\n\ndata: [DONE]\n\n`,
    );
    apiFetchMock.mockResolvedValue(response);
    const onText = vi.fn();
    const onMessageId = vi.fn();

    await streamAssistantMessage("conversation-1", messages, {
      onText,
      onMessageId,
    });

    expect(onText).toHaveBeenCalledExactlyOnceWith(content);
    expect(onMessageId).toHaveBeenCalledExactlyOnceWith("assistant-1");
    expect(response.body?.locked).toBe(false);
  });

  it.each(["generation_failed", "persistence_failed"] as const)(
    "preserves content before a split %s terminal event and releases the reader",
    async (code) => {
      const failure = { code, message: `Reported ${code}` };
      const response = splitResponse(
        `data: "Received text"\n\ndata: [ERROR]${JSON.stringify(failure)}\n\n`,
      );
      apiFetchMock.mockResolvedValue(response);
      const onText = vi.fn();
      const onMessageId = vi.fn();

      await expect(
        streamAssistantMessage("conversation-1", messages, {
          onText,
          onMessageId,
        }),
      ).rejects.toMatchObject({
        name: "AssistantStreamError",
        ...failure,
      });

      expect(onText).toHaveBeenCalledExactlyOnceWith("Received text");
      expect(onMessageId).not.toHaveBeenCalled();
      expect(response.body?.locked).toBe(false);
    },
  );

  it("requires DONE even when persisted id and text arrive before EOF", async () => {
    const response = new Response(
      'data: "Received text"\n\ndata: [MESSAGE_ID]assistant-1\n\n',
    );
    apiFetchMock.mockResolvedValue(response);
    const onText = vi.fn();
    const onMessageId = vi.fn();

    await expect(
      streamAssistantMessage("conversation-1", messages, {
        onText,
        onMessageId,
      }),
    ).rejects.toMatchObject({ code: "incomplete_response" });

    expect(onText).toHaveBeenCalledExactlyOnceWith("Received text");
    expect(onMessageId).toHaveBeenCalledExactlyOnceWith("assistant-1");
    expect(response.body?.locked).toBe(false);
  });

  it.each([
    "[DONE]",
    '[ERROR]{"code":"persistence_failed","message":"Unsaved"}',
  ])(
    "cleans up the transport after terminal %s without waiting for EOF",
    async (terminal) => {
      const cancel = vi.fn();
      const response = new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                `data: "Received text"\n\ndata: ${terminal}\n\ndata: "Ignored after terminal"\n\n`,
              ),
            );
          },
          cancel,
        }),
      );
      apiFetchMock.mockResolvedValue(response);
      const onText = vi.fn();
      const request = streamAssistantMessage("conversation-1", messages, {
        onText,
        onMessageId: vi.fn(),
      });

      if (terminal === "[DONE]") {
        await expect(request).resolves.toBeUndefined();
      } else {
        await expect(request).rejects.toBeInstanceOf(AssistantStreamError);
      }

      expect(onText).toHaveBeenCalledExactlyOnceWith("Received text");
      expect(cancel).toHaveBeenCalledOnce();
      expect(response.body?.locked).toBe(false);
    },
  );

  it("keeps text and releases the reader when the transport fails", async () => {
    const response = new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode('data: "Received text"\n\n'),
          );
        },
        pull(controller) {
          controller.error(new Error("Disconnected"));
        },
      }),
    );
    apiFetchMock.mockResolvedValue(response);
    const onText = vi.fn();

    await expect(
      streamAssistantMessage("conversation-1", messages, {
        onText,
        onMessageId: vi.fn(),
      }),
    ).rejects.toMatchObject({ code: "incomplete_response" });

    expect(onText).toHaveBeenCalledExactlyOnceWith("Received text");
    expect(response.body?.locked).toBe(false);
  });

  it("does not replace a reported error when transport cleanup rejects", async () => {
    const response = new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              'data: [ERROR]{"code":"generation_failed","message":"Interrupted"}\n\n',
            ),
          );
        },
        cancel() {
          throw new Error("Already disconnected");
        },
      }),
    );
    apiFetchMock.mockResolvedValue(response);

    await expect(
      streamAssistantMessage("conversation-1", messages, {
        onText: vi.fn(),
        onMessageId: vi.fn(),
      }),
    ).rejects.toMatchObject({
      code: "generation_failed",
      message: "Interrupted",
    });
    expect(response.body?.locked).toBe(false);
  });

  it("rejects malformed terminal errors instead of rendering them as text", async () => {
    const response = new Response("data: [ERROR]not-json\n\n");
    apiFetchMock.mockResolvedValue(response);
    const onText = vi.fn();

    await expect(
      streamAssistantMessage("conversation-1", messages, {
        onText,
        onMessageId: vi.fn(),
      }),
    ).rejects.toMatchObject({ code: "incomplete_response" });
    expect(onText).not.toHaveBeenCalled();
    expect(response.body?.locked).toBe(false);
  });
});
