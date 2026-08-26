import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  Conversation,
  GetConversationsResponse,
} from "@/features/chatbot/types";

const reactMocks = vi.hoisted(() => ({
  useEffect: vi.fn(),
  useRef: vi.fn(),
  useState: vi.fn(),
}));

const conversationApiMocks = vi.hoisted(() => ({
  getConversations: vi.fn(),
}));

vi.mock("react", () => reactMocks);
vi.mock("@/features/chatbot/api/conversations", () => conversationApiMocks);

import { useConversations } from "@/features/chatbot/hooks/useConversations";
import { useConversationSearch } from "@/features/chatbot/hooks/useConversationSearch";

const firstConversation: Conversation = {
  id: "conv-1",
  user_id: "test-user",
  title: "First",
  status: "active",
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-02T00:00:00Z",
};

const refreshedConversation: Conversation = {
  ...firstConversation,
  id: "conv-2",
  title: "Refreshed",
};

function response(conversation: Conversation[]): GetConversationsResponse {
  return {
    conversation,
    hasMore: false,
    nextOffset: conversation.length,
  };
}

function configureStateSetters(setters: Array<ReturnType<typeof vi.fn>>) {
  let index = 0;
  reactMocks.useState.mockImplementation((initial) => [
    initial,
    setters[index++],
  ]);
}

function capturedEffect() {
  const effect = reactMocks.useEffect.mock.calls.at(-1)?.[0];
  if (!effect) throw new Error("Expected the hook to register an effect");
  return effect as () => void | (() => void);
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useConversations", () => {
  it("loads the first page initially", async () => {
    const setConversations = vi.fn();
    configureStateSetters([setConversations, vi.fn(), vi.fn()]);
    reactMocks.useRef.mockReturnValue({ current: false });
    conversationApiMocks.getConversations.mockResolvedValue(
      response([firstConversation]),
    );

    useConversations(0);
    capturedEffect()();

    await vi.waitFor(() => {
      expect(conversationApiMocks.getConversations).toHaveBeenCalledWith({
        offset: 0,
      });
      expect(setConversations).toHaveBeenCalledWith([firstConversation]);
    });
  });

  it("refreshes from offset zero and replaces the first-page state", async () => {
    const loadedRef = { current: false };
    const firstSetConversations = vi.fn();
    configureStateSetters([firstSetConversations, vi.fn(), vi.fn()]);
    reactMocks.useRef.mockReturnValue(loadedRef);
    conversationApiMocks.getConversations.mockResolvedValueOnce(
      response([firstConversation]),
    );

    useConversations(0);
    capturedEffect()();
    await vi.waitFor(() => {
      expect(firstSetConversations).toHaveBeenCalledWith([firstConversation]);
    });

    reactMocks.useEffect.mockClear();
    reactMocks.useState.mockClear();
    const refreshSetConversations = vi.fn();
    configureStateSetters([refreshSetConversations, vi.fn(), vi.fn()]);
    conversationApiMocks.getConversations.mockResolvedValueOnce(
      response([refreshedConversation]),
    );

    useConversations(1);
    expect(reactMocks.useEffect).toHaveBeenCalledWith(
      expect.any(Function),
      [1],
    );
    capturedEffect()();

    await vi.waitFor(() => {
      expect(conversationApiMocks.getConversations).toHaveBeenLastCalledWith({
        offset: 0,
      });
      expect(refreshSetConversations).toHaveBeenCalledWith([
        refreshedConversation,
      ]);
    });
    expect(refreshSetConversations.mock.calls[0][0]).not.toBeTypeOf("function");
  });
});

describe("useConversationSearch", () => {
  it("requests the first matching page and stores only its conversation array", async () => {
    vi.useFakeTimers();
    const setResults = vi.fn();
    configureStateSetters([setResults, vi.fn(), vi.fn()]);
    conversationApiMocks.getConversations.mockResolvedValue(
      response([firstConversation]),
    );

    useConversationSearch("  DAO  ");
    capturedEffect()();
    await vi.advanceTimersByTimeAsync(300);

    expect(conversationApiMocks.getConversations).toHaveBeenCalledWith({
      query: "DAO",
      offset: 0,
    });
    expect(setResults).toHaveBeenCalledWith([firstConversation]);
    expect(setResults).not.toHaveBeenCalledWith(response([firstConversation]));
  });
});
