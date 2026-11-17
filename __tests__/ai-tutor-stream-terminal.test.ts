// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockAuthenticateRequest, mockGetAdminClient, mockStream } = vi.hoisted(
  () => ({
    mockAuthenticateRequest: vi.fn(),
    mockGetAdminClient: vi.fn(),
    mockStream: vi.fn(),
  }),
);

vi.mock("@/llm/LLMProviderFactory", () => ({
  createLLMProvider: () => ({ stream: mockStream }),
}));

vi.mock("@/utils/authHelper", () => ({
  authenticateRequest: mockAuthenticateRequest,
  getAdminClient: mockGetAdminClient,
}));

import { POST } from "@/app/api/ai-tutor/chat/stream/route";

const conversationId = "f4a6d3f5-0893-4f45-b548-9aa102318e86";
const generatedText = "  Tutor answer\n\nKāhui 🤖";

function createRequest() {
  return new NextRequest("http://localhost/api/ai-tutor/chat/stream", {
    method: "POST",
    headers: {
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      conversation_id: conversationId,
      messages: [{ role: "user", content: "Explain proof of stake." }],
    }),
  });
}

function createQuery() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockResolvedValue({ data: [], error: null }),
    insert: vi.fn().mockReturnThis(),
    single: vi
      .fn()
      .mockResolvedValue({ data: { id: "assistant-1" }, error: null })
      .mockResolvedValueOnce({ data: { id: conversationId }, error: null }),
  };
}

describe("authenticated AI Tutor stream terminal outcomes", () => {
  let query: ReturnType<typeof createQuery>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "test");
    mockAuthenticateRequest.mockResolvedValue({ uid: "user-1" });
    query = createQuery();
    mockGetAdminClient.mockReturnValue({ from: vi.fn(() => query) });
    mockStream.mockImplementation(async function* () {
      yield generatedText;
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("preserves text, persisted id and DONE on success and removes the abort listener", async () => {
    const request = createRequest();
    const addListener = vi.spyOn(request.signal, "addEventListener");
    const removeListener = vi.spyOn(request.signal, "removeEventListener");
    const response = await POST(request);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(text).toBe(
      `data: ${JSON.stringify(generatedText)}\n\ndata: [MESSAGE_ID]assistant-1\n\ndata: [DONE]\n\n`,
    );
    expect(query.insert).toHaveBeenCalledExactlyOnceWith({
      conversation_id: conversationId,
      role: "assistant",
      content: generatedText,
    });
    expect(removeListener).toHaveBeenCalledWith(
      "abort",
      addListener.mock.calls.find(([event]) => event === "abort")?.[1],
    );
  });

  it("keeps first-chunk generation failure as HTTP 502 without saving a reply", async () => {
    mockStream.mockImplementation(async function* () {
      throw new Error("Provider unavailable");
    });

    const response = await POST(createRequest());

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "LLM provider error",
    });
    expect(query.insert).not.toHaveBeenCalled();
  });

  it("reports generation failure after partial content without persisting partials or DONE", async () => {
    mockStream.mockImplementation(async function* () {
      yield "Partial answer";
      throw new Error("Provider disconnected");
    });

    const response = await POST(createRequest());
    const text = await response.text();

    expect(text).toContain('data: "Partial answer"\n\n');
    expect(text).toContain(
      'data: [ERROR]{"code":"generation_failed","message":',
    );
    expect(text).not.toContain("[DONE]");
    expect(text).not.toContain("[MESSAGE_ID]");
    expect(query.insert).not.toHaveBeenCalled();
  });

  it("reports returned insertion errors after complete output without successful completion", async () => {
    query.single.mockResolvedValueOnce({
      data: null,
      error: { message: "Database unavailable" },
    });

    const response = await POST(createRequest());
    const text = await response.text();

    expect(text).toContain(`data: ${JSON.stringify(generatedText)}\n\n`);
    expect(text).toContain(
      'data: [ERROR]{"code":"persistence_failed","message":"The response was generated but could not be saved."}',
    );
    expect(text).not.toContain("[DONE]");
    expect(text).not.toContain("[MESSAGE_ID]");
    expect(query.insert).toHaveBeenCalledOnce();
  });

  it.each([null, {}, { id: "" }, { id: "  " }, { id: 1 }])(
    "reports persistence failure when no saved id is returned: %j",
    async (saved) => {
      query.single.mockResolvedValueOnce({ data: saved, error: null });

      const response = await POST(createRequest());
      const text = await response.text();

      expect(text).toContain(`data: ${JSON.stringify(generatedText)}\n\n`);
      expect(text).toContain('[ERROR]{"code":"persistence_failed"');
      expect(text).not.toContain("[DONE]");
      expect(text).not.toContain("[MESSAGE_ID]");
    },
  );

  it("classifies an insertion promise rejection as persistence failure", async () => {
    query.single.mockRejectedValueOnce(new Error("Insert request failed"));

    const response = await POST(createRequest());
    const text = await response.text();

    expect(text).toContain('[ERROR]{"code":"persistence_failed"');
    expect(text).not.toContain("generation_failed");
    expect(text).not.toContain("[DONE]");
  });

  it("classifies a synchronous insertion failure as persistence failure", async () => {
    query.insert.mockImplementationOnce(() => {
      throw new Error("Insert could not start");
    });

    const response = await POST(createRequest());
    const text = await response.text();

    expect(text).toContain('[ERROR]{"code":"persistence_failed"');
    expect(text).not.toContain("generation_failed");
    expect(text).not.toContain("[DONE]");
  });
});
