import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  Conversation,
  GetConversationsResponse,
} from "@/features/chatbot/types";

const reactMocks = vi.hoisted(() => ({
  useCallback: vi.fn(),
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
    setters[index++] ?? vi.fn(),
  ]);
}

function capturedEffect() {
  const effect = reactMocks.useEffect.mock.calls.at(-1)?.[0];
  if (!effect) throw new Error("Expected the hook to register an effect");
  return effect as () => void | (() => void);
}

beforeEach(() => {
  vi.resetAllMocks();
  reactMocks.useCallback.mockImplementation((callback) => callback);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useConversations", () => {
  function createHookHarness() {
    const state: unknown[] = [];
    const refs: Array<{ current: unknown }> = [];
    let stateIndex = 0;
    let refIndex = 0;

    reactMocks.useState.mockImplementation((initial) => {
      const index = stateIndex++;
      if (!(index in state)) state[index] = initial;
      return [
        state[index],
        (next: unknown) => {
          state[index] =
            typeof next === "function"
              ? (next as (previous: unknown) => unknown)(state[index])
              : next;
        },
      ];
    });
    reactMocks.useRef.mockImplementation((initial) => {
      const index = refIndex++;
      if (!refs[index]) refs[index] = { current: initial };
      return refs[index];
    });

    return {
      state,
      refs,
      Render(version: number) {
        stateIndex = 0;
        refIndex = 0;
        return useConversations(version);
      },
    };
  }

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

  it("merges a later page without duplicates and uses nextOffset", async () => {
    const harness = createHookHarness();
    const second = { ...refreshedConversation, id: "conv-3" };
    conversationApiMocks.getConversations
      .mockResolvedValueOnce({
        conversation: [firstConversation],
        hasMore: true,
        nextOffset: 1,
      })
      .mockResolvedValueOnce({
        conversation: [firstConversation, second],
        hasMore: false,
        nextOffset: 3,
      });

    harness.Render(0);
    capturedEffect()();
    await vi.waitFor(() => expect(harness.state[3]).toBe(true));

    await harness.Render(0).loadMore();

    expect(conversationApiMocks.getConversations).toHaveBeenLastCalledWith({
      offset: 1,
    });
    expect(harness.state[0]).toEqual([firstConversation, second]);
    expect(harness.state[3]).toBe(false);
    expect(harness.refs[1].current).toBe(3);
  });

  it("ignores a later page resolved after refresh", async () => {
    const harness = createHookHarness();
    let resolveOldPage!: (value: GetConversationsResponse) => void;
    const oldPage = new Promise<GetConversationsResponse>((resolve) => {
      resolveOldPage = resolve;
    });
    conversationApiMocks.getConversations
      .mockResolvedValueOnce({
        conversation: [firstConversation],
        hasMore: true,
        nextOffset: 1,
      })
      .mockReturnValueOnce(oldPage)
      .mockResolvedValueOnce({
        conversation: [refreshedConversation],
        hasMore: true,
        nextOffset: 7,
      });

    harness.Render(0);
    capturedEffect()();
    await vi.waitFor(() => expect(harness.state[3]).toBe(true));
    const pending = harness.Render(0).loadMore();

    harness.Render(1);
    capturedEffect()();
    await vi.waitFor(() => {
      expect(harness.state[0]).toEqual([refreshedConversation]);
      expect(harness.refs[1].current).toBe(7);
    });

    resolveOldPage({
      conversation: [firstConversation],
      hasMore: false,
      nextOffset: 2,
    });
    await pending;

    expect(harness.state[0]).toEqual([refreshedConversation]);
    expect(harness.state[3]).toBe(true);
    expect(harness.refs[1].current).toBe(7);
    expect(harness.state[2]).toBe(false);
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
