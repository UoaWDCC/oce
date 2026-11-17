// @vitest-environment jsdom
import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  GetMessagesResponse,
  TutorMessage,
} from "@/features/chatbot/types";

type AuthSession = { user: { id: string } } | null;
const mocks = vi.hoisted(() => ({
  createConversation: vi.fn(),
  getConversationMessages: vi.fn(),
  saveUserMessage: vi.fn(),
  streamAssistantMessage: vi.fn(),
  getSession: vi.fn(),
  authListener: null as ((event: string, session: AuthSession) => void) | null,
}));

vi.mock("next/navigation", () => ({ usePathname: () => "/modules/example" }));
vi.mock("@/hooks/useOnScreen", () => ({ default: () => true }));
vi.mock("@/features/chatbot/hooks/useTokenUsage", () => ({
  useTokenUsage: () => null,
  isTokenLimitReached: () => false,
  getTokenUsageLevel: () => "none",
}));
vi.mock("@/features/chatbot/api/conversations", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/chatbot/api/conversations")
  >("@/features/chatbot/api/conversations");
  return { ...actual, ...mocks };
});
vi.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: (
        callback: (event: string, session: AuthSession) => void,
      ) => {
        mocks.authListener = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
  }),
}));
vi.mock("@/features/chatbot/components/fullscreen/conversationsList", () => ({
  default: () => <div>Conversations</div>,
}));
vi.mock("@/features/chatbot/components/chatReply", () => ({
  default: ({
    children,
    messageId,
  }: {
    children: React.ReactNode;
    messageId?: string;
  }) => (
    <div
      data-testid="assistant-reply"
      id={messageId ? `message-${messageId}` : undefined}
    >
      {children}
    </div>
  ),
}));
vi.mock("@/features/chatbot/components/chatDownButton", () => ({
  default: () => null,
}));

import { AssistantStreamError } from "@/features/chatbot/api/conversations";
import ChatSection from "@/features/chatbot/components/chatSection";
import ChatWrapper from "@/features/chatbot/components/chatWrapper";
import {
  ChatModalProvider,
  useChatModal,
} from "@/features/chatbot/providers/ChatBoxModalProvider";
import {
  ConversationProvider,
  useConversation,
} from "@/features/chatbot/providers/ConversationProvider";

type StreamHandlers = {
  onText: (text: string) => void;
  onMessageId: (id: string) => void;
};

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function message(
  id: string,
  role: TutorMessage["role"],
  content: string,
  conversationId = "conversation-a",
  order = 100,
): TutorMessage {
  return {
    id,
    conversation_id: conversationId,
    role,
    content,
    is_favourite: false,
    created_at: new Date(order * 1000).toISOString(),
  };
}

function page(
  messages: TutorMessage[] = [],
  hasMore = false,
  nextOffset = messages.length,
): GetMessagesResponse {
  return { messages, hasMore, nextOffset };
}

function SessionHarness() {
  const { toggleOpen } = useChatModal();
  const {
    setSelectedConversationId,
    clearCurrentMessages,
    discardConversation,
    error,
    setError,
  } = useConversation();
  const selectConversation = (id: string | null) => {
    setSelectedConversationId(id);
    clearCurrentMessages();
  };
  return (
    <>
      <button onClick={toggleOpen}>Toggle tutor</button>
      <button onClick={() => selectConversation("conversation-a")}>
        Select A
      </button>
      <button onClick={() => selectConversation("conversation-b")}>
        Select B
      </button>
      <button onClick={() => selectConversation(null)}>New conversation</button>
      <button onClick={clearCurrentMessages}>Refresh messages</button>
      <button onClick={() => discardConversation("conversation-a")}>
        Discard A
      </button>
      <button onClick={() => setError("B error already present")}>
        Set B error
      </button>
      <span data-testid="shared-error">{error ?? "none"}</span>
      <ChatSection />
    </>
  );
}

async function renderSession() {
  render(
    <ConversationProvider>
      <ChatModalProvider>
        <SessionHarness />
      </ChatModalProvider>
    </ConversationProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Toggle tutor" }));
  await select("A");
}

function input() {
  return screen.getByRole("textbox", {
    name: "Message AI Tutor",
  }) as HTMLTextAreaElement;
}

function submit(content = "First question") {
  fireEvent.change(input(), { target: { value: content } });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
}

async function select(conversation: "A" | "B") {
  fireEvent.click(
    screen.getByRole("button", { name: `Select ${conversation}` }),
  );
  await waitFor(() => expect(input().disabled).toBe(false));
}

async function settled() {
  await waitFor(() => expect(input().disabled).toBe(false));
  expect(screen.queryByRole("status")).toBeNull();
}

function failsWith(
  content: string,
  code: ConstructorParameters<
    typeof AssistantStreamError
  >[0] = "generation_failed",
) {
  mocks.streamAssistantMessage.mockImplementationOnce(
    async (_id: string, _context: unknown, handlers: StreamHandlers) => {
      if (content) handlers.onText(content);
      throw new AssistantStreamError(code, "Assistant request failed");
    },
  );
}

function before(first: HTMLElement, second: HTMLElement) {
  expect(
    first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
}

function pendingSaveScenario() {
  const saving = deferred<TutorMessage>();
  const streaming = deferred<void>();
  const question = message("pending-question", "user", "Deferred A question");
  const answer = message(
    "pending-answer",
    "assistant",
    "Deferred A answer",
    "conversation-a",
    101,
  );
  const historyA = message(
    "history-a",
    "user",
    "A existing history",
    "conversation-a",
    1,
  );
  const historyB = message(
    "history-b",
    "user",
    "B existing history",
    "conversation-b",
    1,
  );
  let currentHistoryA = [historyA];
  let handlers: StreamHandlers | undefined;
  mocks.saveUserMessage.mockReturnValueOnce(saving.promise);
  mocks.getConversationMessages.mockImplementation(async (id: string) =>
    page(id === "conversation-a" ? currentHistoryA : [historyB]),
  );
  mocks.streamAssistantMessage.mockImplementationOnce(
    (_id: string, _context: unknown, nextHandlers: StreamHandlers) => {
      handlers = nextHandlers;
      return streaming.promise;
    },
  );
  return {
    saving,
    streaming,
    question,
    answer,
    includeSavedHistory: (includeAnswer = false) => {
      currentHistoryA = [
        historyA,
        question,
        ...(includeAnswer ? [answer] : []),
      ];
    },
    handlers: () => {
      expect(handlers).toBeDefined();
      return handlers!;
    },
  };
}

async function navigateWhileSaving(conversation: "A" | "B") {
  fireEvent.click(
    screen.getByRole("button", { name: `Select ${conversation}` }),
  );
  await screen.findByText(`${conversation} existing history`);
  await waitFor(() =>
    expect(
      screen.queryByRole("status", { name: "Loading messages" }),
    ).toBeNull(),
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.authListener = null;
  mocks.getSession.mockResolvedValue({
    data: { session: { user: { id: "user-a" } } },
  });
  mocks.createConversation.mockResolvedValue({ id: "conversation-a" });
  mocks.getConversationMessages.mockResolvedValue(page());
  mocks.saveUserMessage.mockImplementation(
    async (id: string, content: string) =>
      message(
        `question-${mocks.saveUserMessage.mock.calls.length}`,
        "user",
        content,
        id,
        100 + mocks.saveUserMessage.mock.calls.length,
      ),
  );
  mocks.streamAssistantMessage.mockResolvedValue(undefined);
  HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(callback, 0),
  );
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(
    function (this: HTMLElement) {
      return this.classList.contains("overflow-y-auto") ? 80 : 0;
    },
  );
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(
    function (this: HTMLElement) {
      return this.classList.contains("overflow-y-auto")
        ? this.querySelectorAll(
            '[data-testid="assistant-reply"], p.whitespace-pre-line',
          ).length * 10
        : 0;
    },
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("AI Tutor response retention", () => {
  describe("question saves pending during navigation", () => {
    it("keeps the older-page boundary when the saved question is outside returning history", async () => {
      const pending = pendingSaveScenario();
      await renderSession();
      submit(pending.question.content);
      await navigateWhileSaving("B");
      const newest = [
        message(
          "history-a",
          "user",
          "A existing history",
          "conversation-a",
          200,
        ),
        ...Array.from({ length: 14 }, (_, index) =>
          message(
            `newer-${index}`,
            "user",
            `Newer question ${index}`,
            "conversation-a",
            201 + index,
          ),
        ),
      ];
      mocks.getConversationMessages.mockImplementation(
        async (_id: string, { offset }: { offset?: number }) =>
          offset === 15
            ? page(
                [
                  message(
                    "older-boundary",
                    "user",
                    "Older boundary question",
                    "conversation-a",
                    99,
                  ),
                  pending.question,
                ],
                false,
                17,
              )
            : page(newest, true, 15),
      );
      await navigateWhileSaving("A");
      await act(async () => pending.saving.resolve(pending.question));
      await waitFor(() =>
        expect(mocks.streamAssistantMessage).toHaveBeenCalledTimes(1),
      );
      const container = screen
        .getByText("A existing history")
        .closest(".overflow-y-auto") as HTMLElement;
      container.scrollTop = 150;
      fireEvent.scroll(container);
      container.scrollTop = 0;
      fireEvent.scroll(container);
      await screen.findByText("Older boundary question");
      expect(screen.getAllByText(pending.question.content)).toHaveLength(1);
      expect(mocks.getConversationMessages).toHaveBeenLastCalledWith(
        "conversation-a",
        { limit: 15, offset: 15 },
      );
      act(() => {
        pending.handlers().onText(pending.answer.content);
        pending.handlers().onMessageId(pending.answer.id);
      });
      await act(async () => pending.streaming.resolve(undefined));
      await settled();
      expect(screen.getByText("Older boundary question")).toBeTruthy();
      expect(screen.getAllByText(pending.answer.content)).toHaveLength(1);
    });

    it("keeps draft recovery owned by the first of two synchronous input submissions", async () => {
      const pending = pendingSaveScenario();
      await renderSession();
      fireEvent.change(input(), {
        target: { value: pending.question.content },
      });
      act(() => {
        for (let i = 0; i < 2; i += 1) {
          input().dispatchEvent(
            new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
          );
        }
      });
      expect(mocks.saveUserMessage).toHaveBeenCalledTimes(1);
      await act(async () =>
        pending.saving.reject(new Error("First submission failed")),
      );
      await settled();
      expect(input().value).toBe(pending.question.content);
      expect(screen.getByRole("alert").textContent).toContain(
        "First submission failed",
      );
    });

    it("retires a recovered draft and its error when A is discarded", async () => {
      const pending = pendingSaveScenario();
      await renderSession();
      submit(pending.question.content);
      await act(async () =>
        pending.saving.reject(new Error("A save failed before deletion")),
      );
      await settled();
      expect(input().value).toBe(pending.question.content);
      fireEvent.click(screen.getByRole("button", { name: "Discard A" }));
      await select("B");
      await select("A");
      expect(input().value).toBe("");
      expect(screen.queryByRole("alert")).toBeNull();
      expect(screen.getByTestId("shared-error").textContent).toBe("none");
    });

    it.each([false, true])(
      "resumes a save after accepted A to B to A history without duplicates (question already loaded: %s)",
      async (questionAlreadyLoaded) => {
        const pending = pendingSaveScenario();
        await renderSession();
        submit(pending.question.content);
        expect(input().disabled).toBe(true);
        if (questionAlreadyLoaded) pending.includeSavedHistory();
        await navigateWhileSaving("B");
        await navigateWhileSaving("A");
        expect(input().disabled).toBe(true);
        fireEvent.change(input(), { target: { value: "A newer draft" } });

        await act(async () => pending.saving.resolve(pending.question));
        await waitFor(() =>
          expect(mocks.streamAssistantMessage).toHaveBeenCalledTimes(1),
        );
        act(() => pending.handlers().onText("Deferred A "));
        act(() => pending.handlers().onText("answer"));
        const reply = screen.getByText(pending.answer.content);
        expect(screen.getAllByText(pending.question.content)).toHaveLength(1);
        act(() => pending.handlers().onMessageId(pending.answer.id));
        expect(document.getElementById(`message-${pending.answer.id}`)).toBe(
          reply,
        );
        pending.includeSavedHistory(true);
        await act(async () => pending.streaming.resolve(undefined));
        await settled();

        expect(screen.getAllByText(pending.question.content)).toHaveLength(1);
        expect(screen.getAllByText(pending.answer.content)).toHaveLength(1);
        expect(screen.getByText(pending.answer.content)).toBe(reply);
        expect(input().value).toBe("A newer draft");
        expect(screen.queryByRole("alert")).toBeNull();
        expect(mocks.saveUserMessage).toHaveBeenCalledExactlyOnceWith(
          "conversation-a",
          pending.question.content,
        );
        expect(
          mocks.streamAssistantMessage.mock.calls[0][1],
        ).not.toContainEqual({
          role: "user",
          content: "B existing history",
        });
      },
    );

    it("anchors a save that resolves before the returning A history accepts an older snapshot", async () => {
      const pending = pendingSaveScenario();
      const returningHistory = deferred<GetMessagesResponse>();
      await renderSession();
      submit(pending.question.content);
      await navigateWhileSaving("B");
      mocks.getConversationMessages.mockReturnValueOnce(
        returningHistory.promise,
      );
      fireEvent.click(screen.getByRole("button", { name: "Select A" }));
      expect(
        screen.getByRole("status", { name: "Loading messages" }),
      ).toBeTruthy();

      await act(async () => pending.saving.resolve(pending.question));
      await waitFor(() =>
        expect(mocks.streamAssistantMessage).toHaveBeenCalledTimes(1),
      );
      expect(input().disabled).toBe(true);
      await act(async () =>
        returningHistory.resolve(
          page([
            message(
              "history-a",
              "user",
              "A existing history",
              "conversation-a",
              1,
            ),
          ]),
        ),
      );
      await screen.findByText("A existing history");
      expect(screen.getAllByText(pending.question.content)).toHaveLength(1);
      expect(input().disabled).toBe(true);
      expect(
        screen.getByRole("status", { name: "Waiting for response" }),
      ).toBeTruthy();
      act(() => {
        pending.handlers().onText("Deferred A ");
        pending.handlers().onText("answer");
      });
      const reply = screen.getByText(pending.answer.content);
      before(screen.getByText(pending.question.content), reply);
      act(() => pending.handlers().onMessageId(pending.answer.id));
      expect(document.getElementById(`message-${pending.answer.id}`)).toBe(
        reply,
      );
      pending.includeSavedHistory(true);
      await act(async () => pending.streaming.resolve(undefined));
      await settled();

      expect(screen.getAllByText(pending.question.content)).toHaveLength(1);
      expect(screen.getAllByText(pending.answer.content)).toHaveLength(1);
      expect(screen.getByText(pending.answer.content)).toBe(reply);
      expect(input().value).toBe("");
      expect(screen.queryByRole("alert")).toBeNull();
      expect(mocks.saveUserMessage).toHaveBeenCalledTimes(1);
      expect(mocks.streamAssistantMessage).toHaveBeenCalledTimes(1);
    });

    it.each([false, true])(
      "recovers a failed save when returning A history accepts after the failure, protecting a newer draft: %s",
      async (hasNewerDraft) => {
        const pending = pendingSaveScenario();
        const returningHistory = deferred<GetMessagesResponse>();
        await renderSession();
        submit(pending.question.content);
        await navigateWhileSaving("B");
        mocks.getConversationMessages.mockReturnValueOnce(
          returningHistory.promise,
        );
        fireEvent.click(screen.getByRole("button", { name: "Select A" }));
        expect(
          screen.getByRole("status", { name: "Loading messages" }),
        ).toBeTruthy();
        if (hasNewerDraft) {
          fireEvent.change(input(), {
            target: { value: "A draft while history loads" },
          });
        }
        await act(async () =>
          pending.saving.reject(
            new Error("A save failed before history settled"),
          ),
        );
        expect(input().disabled).toBe(true);
        await act(async () =>
          returningHistory.resolve(
            page([
              message(
                "history-a",
                "user",
                "A existing history",
                "conversation-a",
                1,
              ),
            ]),
          ),
        );
        await settled();

        expect(screen.getByText("A existing history")).toBeTruthy();
        expect(screen.getByRole("alert").textContent).toContain(
          "A save failed before history settled",
        );
        expect(screen.getByTestId("shared-error").textContent).toBe(
          "A save failed before history settled",
        );
        expect(input().value).toBe(
          hasNewerDraft
            ? "A draft while history loads"
            : pending.question.content,
        );
        expect(screen.queryByTestId("assistant-reply")).toBeNull();
        expect(mocks.streamAssistantMessage).not.toHaveBeenCalled();
        expect(mocks.saveUserMessage).toHaveBeenCalledTimes(1);
      },
    );

    it.each([false, true])(
      "reports a save failure after returning to A and protects its newer draft: %s",
      async (hasNewerDraft) => {
        const pending = pendingSaveScenario();
        await renderSession();
        submit(pending.question.content);
        await navigateWhileSaving("B");
        await navigateWhileSaving("A");
        if (hasNewerDraft) {
          fireEvent.change(input(), {
            target: { value: "A newer unsent draft" },
          });
        }
        await act(async () =>
          pending.saving.reject(new Error("Deferred A save rejected")),
        );
        await settled();

        expect(screen.getByRole("alert").textContent).toContain(
          "Deferred A save rejected",
        );
        expect(screen.getByTestId("shared-error").textContent).toBe(
          "Deferred A save rejected",
        );
        expect(input().value).toBe(
          hasNewerDraft ? "A newer unsent draft" : pending.question.content,
        );
        expect(screen.getByText("A existing history")).toBeTruthy();
        expect(screen.queryByTestId("assistant-reply")).toBeNull();
        expect(mocks.streamAssistantMessage).not.toHaveBeenCalled();
        expect(mocks.saveUserMessage).toHaveBeenCalledTimes(1);
      },
    );

    it.each(["success", "failure"] as const)(
      "keeps B's transcript, draft and error intact when A's save settles in the background: %s",
      async (outcome) => {
        const pending = pendingSaveScenario();
        await renderSession();
        submit(pending.question.content);
        await navigateWhileSaving("B");
        fireEvent.change(input(), { target: { value: "B independent draft" } });
        fireEvent.click(screen.getByRole("button", { name: "Set B error" }));
        const history = screen.getByText("B existing history");
        const textArea = input();

        if (outcome === "success") {
          await act(async () => pending.saving.resolve(pending.question));
          await waitFor(() =>
            expect(mocks.streamAssistantMessage).toHaveBeenCalledTimes(1),
          );
          pending.includeSavedHistory();
          act(() => {
            pending.handlers().onText(pending.answer.content);
            pending.handlers().onMessageId(pending.answer.id);
          });
          await act(async () => pending.streaming.resolve(undefined));
        } else {
          await act(async () =>
            pending.saving.reject(new Error("Deferred A save rejected")),
          );
        }
        await settled();
        expect(screen.getByText("B existing history")).toBe(history);
        expect(input()).toBe(textArea);
        expect(input().value).toBe("B independent draft");
        expect(screen.getByTestId("shared-error").textContent).toBe(
          "B error already present",
        );
        expect(screen.queryByText(pending.answer.content)).toBeNull();
        expect(screen.queryByRole("alert")).toBeNull();

        await select("A");
        expect(screen.getByText("A existing history")).toBeTruthy();
        if (outcome === "success") {
          expect(screen.getAllByText(pending.question.content)).toHaveLength(1);
          expect(screen.getAllByText(pending.answer.content)).toHaveLength(1);
          expect(input().value).toBe("");
          expect(screen.queryByRole("alert")).toBeNull();
        } else {
          expect(input().value).toBe(pending.question.content);
          expect(screen.getByRole("alert").textContent).toContain(
            "Deferred A save rejected",
          );
          expect(mocks.streamAssistantMessage).not.toHaveBeenCalled();
        }
        await select("B");
        expect(input().value).toBe("B independent draft");
      },
    );

    it.each([
      ["Refresh messages", "success"],
      ["Refresh messages", "failure"],
      ["Select A", "success"],
      ["Select A", "failure"],
    ] as const)(
      "suppresses a late save after same-A %s: %s",
      async (resetControl, outcome) => {
        const pending = pendingSaveScenario();
        await renderSession();
        submit(pending.question.content);
        fireEvent.click(screen.getByRole("button", { name: resetControl }));
        await screen.findByText("A existing history");
        fireEvent.change(input(), { target: { value: "A draft after reset" } });
        if (outcome === "success") {
          await act(async () => pending.saving.resolve(pending.question));
          await waitFor(() =>
            expect(mocks.streamAssistantMessage).toHaveBeenCalledTimes(1),
          );
          act(() => {
            pending.handlers().onText(pending.answer.content);
            pending.handlers().onMessageId(pending.answer.id);
          });
          await act(async () => pending.streaming.resolve(undefined));
        } else {
          await act(async () =>
            pending.saving.reject(new Error("Stale A save error")),
          );
        }
        await settled();
        expect(screen.getByText("A existing history")).toBeTruthy();
        expect(screen.queryByText(pending.question.content)).toBeNull();
        expect(screen.queryByText(pending.answer.content)).toBeNull();
        expect(screen.queryByRole("alert")).toBeNull();
        expect(screen.getByTestId("shared-error").textContent).toBe("none");
        expect(input().value).toBe("A draft after reset");
      },
    );

    it.each(["success", "failure"] as const)(
      "invalidates accepted return ownership when A is reset again before the save %s",
      async (outcome) => {
        const pending = pendingSaveScenario();
        await renderSession();
        submit(pending.question.content);
        await navigateWhileSaving("B");
        await navigateWhileSaving("A");
        fireEvent.click(
          screen.getByRole("button", { name: "Refresh messages" }),
        );
        await screen.findByText("A existing history");
        fireEvent.change(input(), {
          target: { value: "A post-return reset draft" },
        });
        if (outcome === "success") {
          await act(async () => pending.saving.resolve(pending.question));
          await waitFor(() =>
            expect(mocks.streamAssistantMessage).toHaveBeenCalledTimes(1),
          );
          act(() => {
            pending.handlers().onText(pending.answer.content);
            pending.handlers().onMessageId(pending.answer.id);
          });
          await act(async () => pending.streaming.resolve(undefined));
        } else {
          await act(async () =>
            pending.saving.reject(new Error("Stale returned A error")),
          );
        }
        await settled();
        expect(screen.queryByText(pending.question.content)).toBeNull();
        expect(screen.queryByText(pending.answer.content)).toBeNull();
        expect(screen.queryByRole("alert")).toBeNull();
        expect(input().value).toBe("A post-return reset draft");
        expect(screen.getByTestId("shared-error").textContent).toBe("none");
      },
    );

    it.each(["success", "failure"] as const)(
      "does not recover deleted A data when its pending save settles: %s",
      async (outcome) => {
        const pending = pendingSaveScenario();
        await renderSession();
        submit(pending.question.content);
        fireEvent.click(screen.getByRole("button", { name: "Discard A" }));
        await navigateWhileSaving("B");
        fireEvent.change(input(), {
          target: { value: "B draft after discard" },
        });
        if (outcome === "success") {
          await act(async () => pending.saving.resolve(pending.question));
          await waitFor(() =>
            expect(mocks.streamAssistantMessage).toHaveBeenCalledTimes(1),
          );
          act(() => {
            pending.handlers().onText(pending.answer.content);
            pending.handlers().onMessageId(pending.answer.id);
          });
          await act(async () => pending.streaming.resolve(undefined));
        } else {
          await act(async () =>
            pending.saving.reject(new Error("Deleted A save error")),
          );
        }
        await settled();
        expect(input().value).toBe("B draft after discard");
        await select("A");
        expect(screen.queryByText(pending.question.content)).toBeNull();
        expect(screen.queryByText(pending.answer.content)).toBeNull();
        expect(screen.queryByRole("alert")).toBeNull();
        expect(input().value).toBe("");
      },
    );
  });

  it("keeps a saved question visible without restoring its draft when generation fails before content", async () => {
    await renderSession();
    failsWith("");
    submit();
    await settled();
    expect(screen.getByText("First question")).toBeTruthy();
    expect(input().value).toBe("");
    expect(screen.getByRole("alert").textContent).toMatch(/question.*saved/i);
    expect(screen.queryByTestId("assistant-reply")).toBeNull();
    submit("A different question");
    await waitFor(() =>
      expect(mocks.streamAssistantMessage).toHaveBeenCalledTimes(2),
    );
    await settled();
    expect(mocks.saveUserMessage).toHaveBeenLastCalledWith(
      "conversation-a",
      "A different question",
    );
  });

  it.each(["generation_failed", "incomplete_response"] as const)(
    "keeps partial text marked incomplete after %s and leaves the input empty",
    async (code) => {
      await renderSession();
      failsWith("Partial answer retained", code);
      submit();
      await settled();
      expect(screen.getByText("First question")).toBeTruthy();
      expect(screen.getByText("Partial answer retained")).toBeTruthy();
      expect(screen.getByText("Response incomplete")).toBeTruthy();
      expect(input().value).toBe("");
      expect(screen.getByRole("alert").textContent).toMatch(/question.*saved/i);
      expect(mocks.getConversationMessages).toHaveBeenCalledTimes(1);
    },
  );

  it("keeps the full generated text with a saving failure rather than reporting success", async () => {
    await renderSession();
    failsWith("The full generated answer", "persistence_failed");
    submit();
    await settled();
    expect(screen.getByText("The full generated answer")).toBeTruthy();
    expect(screen.getByText("Response could not be saved")).toBeTruthy();
    expect(screen.queryByText("Response incomplete")).toBeNull();
    expect(input().value).toBe("");
    expect(screen.getByRole("alert").textContent).toMatch(/question.*saved/i);
    expect(mocks.getConversationMessages).toHaveBeenCalledTimes(1);
  });

  it.each(["generation_failed", "persistence_failed"] as const)(
    "preserves a %s reply in question order after a successful reconciliation, even when both replies have equal text",
    async (code) => {
      await renderSession();
      failsWith("Repeated answer text", code);
      submit();
      await settled();
      mocks.streamAssistantMessage.mockImplementationOnce(
        async (_id: string, _context: unknown, handlers: StreamHandlers) => {
          handlers.onText("Repeated answer text");
          handlers.onMessageId("answer-2");
        },
      );
      mocks.getConversationMessages.mockResolvedValue(
        page([
          message(
            "question-1",
            "user",
            "First question",
            "conversation-a",
            101,
          ),
          message(
            "question-2",
            "user",
            "Second question",
            "conversation-a",
            102,
          ),
          message(
            "answer-2",
            "assistant",
            "Repeated answer text",
            "conversation-a",
            103,
          ),
        ]),
      );
      submit("Second question");
      await waitFor(() =>
        expect(mocks.streamAssistantMessage).toHaveBeenCalledTimes(2),
      );
      await settled();
      const replies = screen.getAllByText("Repeated answer text");
      expect(replies).toHaveLength(2);
      expect(
        screen.getAllByText(
          code === "generation_failed"
            ? "Response incomplete"
            : "Response could not be saved",
        ),
      ).toHaveLength(1);
      before(screen.getByText("First question"), replies[0]);
      before(replies[0], screen.getByText("Second question"));
      before(screen.getByText("Second question"), replies[1]);
      const modelContext = mocks.streamAssistantMessage.mock
        .calls[1][1] as Record<string, unknown>[];
      for (const entry of modelContext) {
        expect(Object.keys(entry).sort()).toEqual(["content", "role"]);
      }
      expect(mocks.saveUserMessage.mock.calls[1]).toEqual([
        "conversation-a",
        "Second question",
      ]);
      expect(input().value).toBe("");
    },
  );

  it("links a transient reply to its persisted ID without duplicating text or replacing its DOM", async () => {
    await renderSession();
    const streaming = deferred<void>();
    const reconciliation = deferred<GetMessagesResponse>();
    let handlers!: StreamHandlers;
    mocks.streamAssistantMessage.mockImplementationOnce(
      (_id: string, _context: unknown, nextHandlers: StreamHandlers) => {
        handlers = nextHandlers;
        return streaming.promise;
      },
    );
    mocks.getConversationMessages.mockReturnValueOnce(reconciliation.promise);
    submit();
    await waitFor(() => expect(handlers).toBeDefined());
    act(() => handlers.onText("Linked answer"));
    const reply = screen.getByText("Linked answer");
    act(() => handlers.onMessageId("persisted-answer"));
    expect(screen.getByText("Linked answer")).toBe(reply);
    await act(async () => streaming.resolve(undefined));
    expect(input().disabled).toBe(true);
    await act(async () =>
      reconciliation.resolve(
        page([
          message(
            "question-1",
            "user",
            "First question",
            "conversation-a",
            101,
          ),
          message(
            "persisted-answer",
            "assistant",
            "Linked answer",
            "conversation-a",
            102,
          ),
        ]),
      ),
    );
    await settled();
    expect(screen.getAllByText("Linked answer")).toHaveLength(1);
    expect(screen.getByText("Linked answer")).toBe(reply);
    expect(document.getElementById("message-persisted-answer")).toBe(reply);
    expect(screen.queryByText("Response incomplete")).toBeNull();
    expect(screen.queryByText("Response could not be saved")).toBeNull();
  });

  it("retains failed replies only for their conversation across refresh, navigation, and a new conversation", async () => {
    await renderSession();
    failsWith("Conversation A partial");
    submit();
    await settled();
    mocks.getConversationMessages.mockImplementation(async (id: string) =>
      id === "conversation-a"
        ? page([
            message(
              "later-question",
              "user",
              "A later persisted question",
              "conversation-a",
              200,
            ),
          ])
        : page([message("question-b", "user", "Conversation B history", id)]),
    );
    fireEvent.click(screen.getByRole("button", { name: "Refresh messages" }));
    await settled();
    expect(screen.getByText("Conversation A partial")).toBeTruthy();
    await select("B");
    expect(screen.getByText("Conversation B history")).toBeTruthy();
    expect(screen.queryByText("Conversation A partial")).toBeNull();
    expect(screen.getByTestId("shared-error").textContent).toBe("none");
    await select("A");
    expect(screen.getByText("Conversation A partial")).toBeTruthy();
    expect(screen.getByText("Response incomplete")).toBeTruthy();
    before(
      screen.getByText("First question"),
      screen.getByText("Conversation A partial"),
    );
    before(
      screen.getByText("Conversation A partial"),
      screen.getByText("A later persisted question"),
    );
    fireEvent.click(screen.getByRole("button", { name: "New conversation" }));
    expect(screen.queryByText("Conversation A partial")).toBeNull();
    await select("A");
    expect(screen.getByText("Conversation A partial")).toBeTruthy();
  });

  it("resolves an incomplete reply by persisted ID on a later history load without duplicating it", async () => {
    await renderSession();
    mocks.streamAssistantMessage.mockImplementationOnce(
      async (_id: string, _context: unknown, handlers: StreamHandlers) => {
        handlers.onText("Persisted before terminal interruption");
        handlers.onMessageId("interrupted-persisted-answer");
        throw new AssistantStreamError(
          "incomplete_response",
          "Completion marker missing",
        );
      },
    );
    submit();
    await settled();
    expect(screen.getByText("Response incomplete")).toBeTruthy();
    mocks.getConversationMessages.mockImplementation(async (id: string) =>
      id === "conversation-a"
        ? page([
            message("question-1", "user", "First question", id, 101),
            message(
              "interrupted-persisted-answer",
              "assistant",
              "Persisted before terminal interruption",
              id,
              102,
            ),
          ])
        : page(),
    );
    await select("B");
    await select("A");
    expect(
      screen.getAllByText("Persisted before terminal interruption"),
    ).toHaveLength(1);
    expect(screen.queryByText("Response incomplete")).toBeNull();
    expect(
      document.getElementById("message-interrupted-persisted-answer"),
    ).toBeTruthy();
  });

  it("retains loaded older messages and advances the pagination offset by new persisted messages during reconciliation", async () => {
    const range = (first: number, last: number) =>
      Array.from({ length: last - first + 1 }, (_, index) => {
        const number = first + index;
        return message(
          `history-${number}`,
          "user",
          `History question ${number}`,
          "conversation-a",
          number,
        );
      });
    mocks.getConversationMessages.mockImplementation(
      async (_id: string, { offset }: { offset?: number }) => {
        if (offset === 15) return page(range(1, 15), true, 30);
        if (offset === 32)
          return page(
            [message("oldest", "user", "Oldest question", "conversation-a", 0)],
            false,
            33,
          );
        return page(range(16, 30), true, 15);
      },
    );
    await renderSession();
    const scrollContainer = screen
      .getByText("History question 30")
      .closest(".overflow-y-auto") as HTMLElement;
    scrollContainer.scrollTop = 150;
    fireEvent.scroll(scrollContainer);
    scrollContainer.scrollTop = 0;
    fireEvent.scroll(scrollContainer);
    await screen.findByText("History question 1");
    mocks.getConversationMessages.mockImplementation(
      async (_id: string, { offset }: { offset?: number }) => {
        if (offset === 32)
          return page(
            [message("oldest", "user", "Oldest question", "conversation-a", 0)],
            false,
            33,
          );
        return page(
          [
            ...range(18, 30),
            message(
              "question-1",
              "user",
              "First question",
              "conversation-a",
              101,
            ),
            message(
              "new-answer",
              "assistant",
              "Fresh answer",
              "conversation-a",
              102,
            ),
          ],
          true,
          15,
        );
      },
    );
    mocks.streamAssistantMessage.mockImplementationOnce(
      async (_id: string, _context: unknown, handlers: StreamHandlers) => {
        handlers.onText("Fresh answer");
        handlers.onMessageId("new-answer");
      },
    );
    submit();
    await settled();
    expect(screen.getByText("History question 1")).toBeTruthy();
    expect(screen.getByText("History question 16")).toBeTruthy();
    expect(screen.getByText("Fresh answer")).toBeTruthy();
    scrollContainer.scrollTop = 150;
    fireEvent.scroll(scrollContainer);
    scrollContainer.scrollTop = 0;
    fireEvent.scroll(scrollContainer);
    await screen.findByText("Oldest question");
    expect(mocks.getConversationMessages).toHaveBeenLastCalledWith(
      "conversation-a",
      { limit: 15, offset: 32 },
    );
    expect(screen.getAllByText("Fresh answer")).toHaveLength(1);
  });

  it("retains background chunks for A without leaking its text or errors into B", async () => {
    await renderSession();
    const streaming = deferred<void>();
    let handlers!: StreamHandlers;
    mocks.streamAssistantMessage.mockImplementationOnce(
      (_id: string, _context: unknown, nextHandlers: StreamHandlers) => {
        handlers = nextHandlers;
        return streaming.promise;
      },
    );
    submit();
    await waitFor(() => expect(handlers).toBeDefined());
    act(() => handlers.onText("Partial before switch"));
    mocks.getConversationMessages.mockImplementation(async (id: string) =>
      id === "conversation-a"
        ? page([message("question-1", "user", "First question")])
        : page([message("question-b", "user", "B is visible", id)]),
    );
    fireEvent.click(screen.getByRole("button", { name: "Select B" }));
    await screen.findByText("B is visible");
    await act(async () => {
      handlers.onText(" and retained while B is open");
      handlers.onMessageId("late-answer-id");
      streaming.reject(
        new AssistantStreamError(
          "incomplete_response",
          "Interrupted after switch",
        ),
      );
    });
    await settled();
    expect(screen.queryByText(/retained while B is open/)).toBeNull();
    expect(screen.queryByText("Partial before switch")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByTestId("shared-error").textContent).toBe("none");
    await select("A");
    expect(
      screen.getByText("Partial before switch and retained while B is open"),
    ).toBeTruthy();
    expect(screen.getByText("Response incomplete")).toBeTruthy();
  });

  it("retains the complete background response when persistence fails and shows the saving failure only for A", async () => {
    await renderSession();
    const streaming = deferred<void>();
    let handlers!: StreamHandlers;
    mocks.streamAssistantMessage.mockImplementationOnce(
      (_id: string, _context: unknown, nextHandlers: StreamHandlers) => {
        handlers = nextHandlers;
        return streaming.promise;
      },
    );
    submit();
    await waitFor(() => expect(handlers).toBeDefined());
    act(() => handlers.onText("The full response starts"));
    mocks.getConversationMessages.mockImplementation(async (id: string) =>
      id === "conversation-a"
        ? page([message("question-1", "user", "First question")])
        : page([message("question-b", "user", "B is visible", id)]),
    );
    fireEvent.click(screen.getByRole("button", { name: "Select B" }));
    await screen.findByText("B is visible");
    await act(async () => {
      handlers.onText(" and finishes in the background.");
      streaming.reject(
        new AssistantStreamError(
          "persistence_failed",
          "Saving failed in background",
        ),
      );
    });
    await settled();
    expect(screen.queryByText(/The full response/)).toBeNull();
    expect(screen.queryByText("Response could not be saved")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByTestId("shared-error").textContent).toBe("none");
    await select("A");
    expect(
      screen.getByText(
        "The full response starts and finishes in the background.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Response could not be saved")).toBeTruthy();
    expect(screen.queryByText("Response incomplete")).toBeNull();
    expect(input().value).toBe("");
  });

  it.each(["streaming", "waiting"] as const)(
    "resumes the same %s response after A to B to A navigation and handles its terminal failure",
    async (phase) => {
      await renderSession();
      const streaming = deferred<void>();
      let handlers!: StreamHandlers;
      mocks.streamAssistantMessage.mockImplementationOnce(
        (_id: string, _context: unknown, nextHandlers: StreamHandlers) => {
          handlers = nextHandlers;
          return streaming.promise;
        },
      );
      submit();
      await waitFor(() => expect(handlers).toBeDefined());
      if (phase === "streaming") {
        act(() => handlers.onText("Initial partial"));
      }
      mocks.getConversationMessages.mockImplementation(async (id: string) =>
        id === "conversation-a"
          ? page([message("question-1", "user", "First question")])
          : page([message("question-b", "user", "B is visible", id)]),
      );
      fireEvent.click(screen.getByRole("button", { name: "Select B" }));
      await screen.findByText("B is visible");
      expect(screen.queryByText("Initial partial")).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Select A" }));
      await screen.findByText("First question");
      expect(input().disabled).toBe(true);
      expect(screen.getAllByText("First question")).toHaveLength(1);
      const finalText =
        phase === "streaming"
          ? "Initial partial continues after return"
          : "First chunk after return";
      act(() =>
        handlers.onText(
          phase === "streaming" ? " continues after return" : finalText,
        ),
      );
      expect(screen.getByText(finalText)).toBeTruthy();
      await act(async () =>
        streaming.reject(
          new AssistantStreamError(
            "generation_failed",
            "Interrupted after return",
          ),
        ),
      );
      await settled();
      expect(screen.getByText(finalText)).toBeTruthy();
      expect(screen.getByText("Response incomplete")).toBeTruthy();
      expect(screen.getByRole("alert").textContent).toMatch(
        /question.*saved.*interrupted/i,
      );
      expect(input().value).toBe("");
      submit("A new question after returning");
      await waitFor(() =>
        expect(mocks.streamAssistantMessage).toHaveBeenCalledTimes(2),
      );
      await settled();
      expect(mocks.saveUserMessage).toHaveBeenLastCalledWith(
        "conversation-a",
        "A new question after returning",
      );
      expect(screen.getByText(finalText)).toBeTruthy();
    },
  );

  it("discards failed retained responses when their conversation is deleted", async () => {
    await renderSession();
    failsWith("Deleted conversation partial");
    submit();
    await settled();
    mocks.getConversationMessages.mockResolvedValue(page());
    fireEvent.click(screen.getByRole("button", { name: "Discard A" }));
    await select("B");
    await select("A");
    expect(screen.queryByText("Deleted conversation partial")).toBeNull();
    expect(screen.queryByText("Response incomplete")).toBeNull();
  });

  it("does not recreate deleted transient data from late stream callbacks", async () => {
    await renderSession();
    const streaming = deferred<void>();
    let handlers!: StreamHandlers;
    mocks.streamAssistantMessage.mockImplementationOnce(
      (_id: string, _context: unknown, nextHandlers: StreamHandlers) => {
        handlers = nextHandlers;
        return streaming.promise;
      },
    );
    submit();
    await waitFor(() => expect(handlers).toBeDefined());
    act(() => handlers.onText("Partial deleted during generation"));
    fireEvent.click(screen.getByRole("button", { name: "Discard A" }));
    fireEvent.click(screen.getByRole("button", { name: "Select B" }));
    await act(async () => {
      handlers.onText("Late deleted text");
      handlers.onMessageId("late-deleted-id");
      streaming.reject(
        new AssistantStreamError(
          "incomplete_response",
          "Deleted request ended",
        ),
      );
    });
    await settled();
    await select("A");
    expect(screen.queryByText("Partial deleted during generation")).toBeNull();
    expect(screen.queryByText(/Late deleted text/)).toBeNull();
    expect(screen.queryByText("Response incomplete")).toBeNull();
  });

  it("clears transient responses when authenticated users change", async () => {
    render(<ChatWrapper />);
    await waitFor(() => expect(mocks.authListener).not.toBeNull());
    await act(async () => {
      mocks.authListener!("INITIAL_SESSION", { user: { id: "user-a" } });
    });
    fireEvent.click(screen.getByRole("button", { name: "Open AI Tutor" }));
    failsWith("User A private partial");
    submit();
    await settled();
    expect(screen.getByText("User A private partial")).toBeTruthy();
    await act(async () => {
      mocks.authListener!("SIGNED_IN", { user: { id: "user-b" } });
    });
    expect(screen.queryByText("User A private partial")).toBeNull();
    expect(input().value).toBe("");
    expect(screen.queryByText("Response incomplete")).toBeNull();
    await act(async () => {
      mocks.authListener!("SIGNED_OUT", null);
    });
    expect(
      screen.queryByRole("textbox", { name: "Message AI Tutor" }),
    ).toBeNull();
  });
});
