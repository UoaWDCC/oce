// @vitest-environment jsdom
import React, { useState } from "react";
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

const mocks = vi.hoisted(() => ({
  createConversation: vi.fn(),
  getConversationMessages: vi.fn(),
  saveUserMessage: vi.fn(),
  streamAssistantMessage: vi.fn(),
}));
const capturedInput = vi.hoisted(() => ({
  submitMessage: null as ((content: string) => Promise<void> | void) | null,
  renderCount: 0,
}));

vi.mock("next/navigation", () => ({ usePathname: () => "/modules/example" }));
vi.mock("@/hooks/useOnScreen", () => ({ default: () => true }));
vi.mock("@/features/chatbot/hooks/useTokenUsage", () => ({
  useTokenUsage: () => null,
  isTokenLimitReached: () => false,
  getTokenUsageLevel: () => "none",
}));
vi.mock("@/features/chatbot/api/conversations", () => mocks);
vi.mock("@/features/chatbot/components/fullscreen/conversationsList", () => ({
  default: () => <div data-testid="conversation-sidebar">Conversations</div>,
}));
vi.mock("@/features/chatbot/components/chatReply", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="assistant-reply">{children}</div>
  ),
}));
vi.mock("@/features/chatbot/components/chatDownButton", () => ({
  default: () => null,
}));
vi.mock("@/features/textArea", async () => {
  const actual = await vi.importActual<typeof import("@/features/textArea")>(
    "@/features/textArea",
  );
  return {
    default: (props: React.ComponentProps<typeof actual.default>) => {
      capturedInput.submitMessage = props.submitMessage;
      capturedInput.renderCount += 1;
      return <actual.default {...props} />;
    },
  };
});

import ChatSection from "@/features/chatbot/components/chatSection";
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
): TutorMessage {
  return {
    id,
    conversation_id: conversationId,
    role,
    content,
    is_favourite: false,
    created_at: "2026-10-04T00:00:00.000Z",
  };
}

function page(messages: TutorMessage[] = []): GetMessagesResponse {
  return { messages, nextOffset: messages.length, hasMore: false };
}

// The providers stay mounted when the chat is genuinely removed, allowing the
// tests to observe accidental updates from a disposed request to shared state.
function SessionHarness() {
  const [showChat, setShowChat] = useState(true);
  const { toggleOpen } = useChatModal();
  const {
    selectedConversationId,
    setSelectedConversationId,
    conversationListVersion,
    error,
    setError,
  } = useConversation();

  return (
    <>
      <button onClick={toggleOpen}>Toggle tutor visibility</button>
      <button onClick={() => setSelectedConversationId("conversation-a")}>
        Select conversation A
      </button>
      <button onClick={() => setSelectedConversationId("conversation-b")}>
        Select conversation B
      </button>
      <button onClick={() => setError("Preserved shared error")}>
        Set shared error
      </button>
      <button onClick={() => setShowChat(false)}>Unmount chat</button>
      <span data-testid="selected-conversation">
        {selectedConversationId ?? "none"}
      </span>
      <span data-testid="conversation-list-version">
        {conversationListVersion}
      </span>
      <span data-testid="shared-error">{error ?? "none"}</span>
      {showChat && <ChatSection />}
    </>
  );
}

function renderSession(strict = false) {
  const session = (
    <ConversationProvider>
      <ChatModalProvider>
        <SessionHarness />
      </ChatModalProvider>
    </ConversationProvider>
  );
  render(strict ? <React.StrictMode>{session}</React.StrictMode> : session);
  fireEvent.click(
    screen.getByRole("button", { name: "Toggle tutor visibility" }),
  );
}

function input() {
  return screen.getByRole("textbox", {
    name: "Message AI Tutor",
  }) as HTMLTextAreaElement;
}

function send() {
  return screen.getByRole("button", {
    name: "Send message",
  }) as HTMLButtonElement;
}

function submit(content = "New question") {
  fireEvent.change(input(), { target: { value: content } });
  fireEvent.click(send());
}

function requestStatus(name: "Waiting for response" | "Generating response") {
  const status = screen.getByRole("status", { name });
  expect(screen.getAllByRole("status")).toHaveLength(1);
  expect(status.textContent).toContain(name);
  return status;
}

function expectLocked() {
  expect(input().disabled).toBe(true);
  expect(send().disabled).toBe(true);
}

async function selectConversationA() {
  fireEvent.click(
    screen.getByRole("button", { name: "Select conversation A" }),
  );
  await waitFor(() => expect(input().disabled).toBe(false));
}

function sharedSnapshot() {
  return [
    screen.getByTestId("selected-conversation").textContent,
    screen.getByTestId("conversation-list-version").textContent,
    screen.getByTestId("shared-error").textContent,
  ];
}

beforeEach(() => {
  vi.resetAllMocks();
  capturedInput.submitMessage = null;
  capturedInput.renderCount = 0;
  mocks.createConversation.mockResolvedValue({ id: "conversation-a" });
  mocks.getConversationMessages.mockResolvedValue(page());
  mocks.saveUserMessage.mockImplementation(
    async (conversationId: string, content: string) =>
      message("saved-question", "user", content, conversationId),
  );
  mocks.streamAssistantMessage.mockResolvedValue(undefined);
  HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(callback, 0),
  );
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("AI Tutor session lifecycle", () => {
  it("guards two handler calls before React renders and accepts a new submission after completion", async () => {
    const creation = deferred<{ id: string }>();
    mocks.createConversation.mockReturnValue(creation.promise);
    renderSession();
    const submitHandler = capturedInput.submitMessage!;
    const renderCount = capturedInput.renderCount;
    let requests!: Promise<void>[];
    act(() => {
      requests = [
        Promise.resolve(submitHandler("First handler submission")),
        Promise.resolve(submitHandler("Duplicate handler submission")),
      ];
      expect(capturedInput.renderCount).toBe(renderCount);
    });
    expect(mocks.createConversation).toHaveBeenCalledTimes(1);
    expectLocked();
    await act(async () => {
      creation.resolve({ id: "conversation-a" });
      await Promise.all(requests);
    });
    expect(mocks.saveUserMessage).toHaveBeenCalledExactlyOnceWith(
      "conversation-a",
      "First handler submission",
    );
    expect(mocks.streamAssistantMessage).toHaveBeenCalledTimes(1);
    expect(input().disabled).toBe(false);
    submit("Accepted after completion");
    await waitFor(() =>
      expect(mocks.streamAssistantMessage).toHaveBeenCalledTimes(2),
    );
    await waitFor(() => expect(input().disabled).toBe(false));
    expect(mocks.saveUserMessage).toHaveBeenLastCalledWith(
      "conversation-a",
      "Accepted after completion",
    );
    expect(mocks.createConversation).toHaveBeenCalledTimes(1);
  });

  it("shows immediate waiting feedback, prevents rapid duplicate sends, and remains locked through reconciliation", async () => {
    const creation = deferred<{ id: string }>();
    const saving = deferred<TutorMessage>();
    const streaming = deferred<void>();
    const reconciliation = deferred<GetMessagesResponse>();
    let handlers!: StreamHandlers;
    mocks.createConversation.mockReturnValue(creation.promise);
    mocks.saveUserMessage.mockReturnValue(saving.promise);
    mocks.streamAssistantMessage.mockImplementation(
      (_id: string, _messages: unknown, nextHandlers: StreamHandlers) => {
        handlers = nextHandlers;
        return streaming.promise;
      },
    );
    mocks.getConversationMessages.mockReturnValue(reconciliation.promise);
    renderSession();

    fireEvent.change(input(), { target: { value: "New question" } });
    const sendButton = send();
    const textArea = input();
    act(() => {
      fireEvent.keyDown(textArea, { key: "Enter" });
      fireEvent.click(sendButton);
      fireEvent.keyDown(textArea, { key: "Enter" });
    });
    requestStatus("Waiting for response");
    expectLocked();
    expect(input().value).toBe("");
    expect(mocks.createConversation).toHaveBeenCalledTimes(1);
    expect(mocks.saveUserMessage).not.toHaveBeenCalled();

    await act(async () => creation.resolve({ id: "conversation-a" }));
    requestStatus("Waiting for response");
    expectLocked();
    expect(mocks.saveUserMessage).toHaveBeenCalledExactlyOnceWith(
      "conversation-a",
      "New question",
    );
    expect(mocks.streamAssistantMessage).not.toHaveBeenCalled();

    await act(async () =>
      saving.resolve(message("saved-question", "user", "New question")),
    );
    expect(screen.getByText("New question")).toBeTruthy();
    expect(mocks.streamAssistantMessage).toHaveBeenCalledTimes(1);
    requestStatus("Waiting for response");
    act(() => handlers.onText(" \n\t"));
    requestStatus("Waiting for response");
    act(() => handlers.onText("The streamed answer"));
    expect(screen.getByText("The streamed answer")).toBeTruthy();
    requestStatus("Generating response");
    expectLocked();

    act(() => handlers.onMessageId("saved-answer"));
    await act(async () => streaming.resolve(undefined));
    expect(mocks.getConversationMessages).toHaveBeenCalledTimes(1);
    requestStatus("Generating response");
    expectLocked();
    await act(async () =>
      reconciliation.resolve(
        page([
          message("saved-question", "user", "New question"),
          message("saved-answer", "assistant", "The streamed answer"),
        ]),
      ),
    );
    expect(input().disabled).toBe(false);
    expect(screen.queryByRole("status")).toBeNull();
    fireEvent.change(input(), { target: { value: "Next question" } });
    expect(send().disabled).toBe(false);
    expect(mocks.createConversation).toHaveBeenCalledTimes(1);
    expect(mocks.saveUserMessage).toHaveBeenCalledTimes(1);
    expect(mocks.streamAssistantMessage).toHaveBeenCalledTimes(1);
  });

  it("keeps draft, transcript, streaming content, and the input DOM across mode changes and close/reopen", async () => {
    const oldQuestion = message("old-question", "user", "An earlier question");
    const streaming = deferred<void>();
    let handlers!: StreamHandlers;
    mocks.getConversationMessages.mockResolvedValue(page([oldQuestion]));
    mocks.streamAssistantMessage.mockImplementation(
      (_id: string, _messages: unknown, nextHandlers: StreamHandlers) => {
        handlers = nextHandlers;
        return streaming.promise;
      },
    );
    renderSession();
    await selectConversationA();
    const textArea = input();
    const historyNode = screen.getByText("An earlier question");
    fireEvent.change(textArea, { target: { value: "Draft to preserve" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Open fullscreen chat" }),
    );
    expect(input()).toBe(textArea);
    expect(input().value).toBe("Draft to preserve");
    expect(screen.getByText("An earlier question")).toBe(historyNode);
    fireEvent.click(screen.getByRole("button", { name: "Minimise chat" }));
    expect(input()).toBe(textArea);
    expect(input().value).toBe("Draft to preserve");

    fireEvent.click(send());
    await waitFor(() => expect(handlers).toBeDefined());
    act(() => handlers.onText("Partial streamed answer"));
    const replyNode = screen.getByText("Partial streamed answer");
    fireEvent.click(
      screen.getByRole("button", { name: "Open fullscreen chat" }),
    );
    expect(input()).toBe(textArea);
    expect(screen.getByText("An earlier question")).toBe(historyNode);
    expect(screen.getByText("Partial streamed answer")).toBe(replyNode);
    requestStatus("Generating response");
    expectLocked();
    fireEvent.click(screen.getByRole("button", { name: "Minimise chat" }));
    expect(input()).toBe(textArea);
    expect(screen.getByText("Partial streamed answer")).toBe(replyNode);
    requestStatus("Generating response");
    expectLocked();
    fireEvent.click(
      screen.getByRole("button", { name: "Open fullscreen chat" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Close AI Tutor" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Toggle tutor visibility" }),
    );
    expect(input()).toBe(textArea);
    expect(screen.getByText("Partial streamed answer")).toBe(replyNode);
    expectLocked();
    act(() => handlers.onText(" continues"));
    expect(screen.getByText("Partial streamed answer continues")).toBe(
      replyNode,
    );
    expect(mocks.getConversationMessages).toHaveBeenCalledTimes(1);
    expect(mocks.saveUserMessage).toHaveBeenCalledTimes(1);
    expect(mocks.streamAssistantMessage).toHaveBeenCalledTimes(1);
    await act(async () => streaming.resolve(undefined));
    expect(input().disabled).toBe(false);
  });

  it.each(["creation", "save", "stream"] as const)(
    "clears waiting feedback and restores the draft when %s fails before content",
    async (stage) => {
      const failure = deferred<never>();
      if (stage === "creation") {
        mocks.createConversation.mockReturnValue(failure.promise);
      } else if (stage === "save") {
        mocks.saveUserMessage.mockReturnValue(failure.promise);
      } else {
        mocks.streamAssistantMessage.mockReturnValue(failure.promise);
      }
      renderSession();
      submit("Retry this question");
      await waitFor(() => {
        const api =
          stage === "creation"
            ? mocks.createConversation
            : stage === "save"
              ? mocks.saveUserMessage
              : mocks.streamAssistantMessage;
        expect(api).toHaveBeenCalledTimes(1);
      });
      requestStatus("Waiting for response");
      expectLocked();
      await act(async () => failure.reject(new Error(`${stage} failed`)));
      expect(input().disabled).toBe(false);
      expect(send().disabled).toBe(false);
      expect(input().value).toBe("Retry this question");
      expect(screen.queryByRole("status")).toBeNull();
      expect(screen.getByRole("alert").textContent).toContain(
        `${stage} failed`,
      );
      expect(screen.queryByTestId("assistant-reply")).toBeNull();
      if (stage === "save") {
        mocks.saveUserMessage.mockResolvedValue(
          message("retry-question", "user", "Retry this question"),
        );
        fireEvent.click(send());
        await waitFor(() =>
          expect(mocks.streamAssistantMessage).toHaveBeenCalledTimes(1),
        );
        await waitFor(() => expect(input().disabled).toBe(false));
        expect(mocks.saveUserMessage).toHaveBeenCalledTimes(2);
        expect(mocks.saveUserMessage).toHaveBeenLastCalledWith(
          "conversation-a",
          "Retry this question",
        );
      }
    },
  );

  it("retains a partial reply and resets the phase when streaming fails after content", async () => {
    const streaming = deferred<void>();
    let handlers!: StreamHandlers;
    mocks.streamAssistantMessage.mockImplementation(
      (_id: string, _messages: unknown, nextHandlers: StreamHandlers) => {
        handlers = nextHandlers;
        return streaming.promise;
      },
    );
    renderSession();
    submit();
    await waitFor(() => expect(handlers).toBeDefined());
    act(() => handlers.onText("Retained partial reply"));
    requestStatus("Generating response");
    await act(async () => streaming.reject(new Error("Connection lost")));
    expect(screen.getByText("Retained partial reply")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("Connection lost");
    expect(input().value).toBe("New question");
    expect(input().disabled).toBe(false);
    expect(screen.queryByRole("status")).toBeNull();
    expect(mocks.getConversationMessages).not.toHaveBeenCalled();
  });

  it("releases the request lock and keeps the streamed reply after reconciliation fails", async () => {
    const reconciliation = deferred<GetMessagesResponse>();
    mocks.getConversationMessages.mockReturnValue(reconciliation.promise);
    mocks.streamAssistantMessage.mockImplementation(
      async (_id: string, _messages: unknown, handlers: StreamHandlers) => {
        handlers.onText("Completed response");
        handlers.onMessageId("saved-answer");
      },
    );
    renderSession();
    submit();
    await waitFor(() =>
      expect(mocks.getConversationMessages).toHaveBeenCalledTimes(1),
    );
    requestStatus("Generating response");
    expectLocked();
    await act(async () =>
      reconciliation.reject(new Error("History unavailable")),
    );
    expect(screen.getByText("Completed response")).toBeTruthy();
    expect(input().disabled).toBe(false);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("disables initial-history submissions and preserves the history request through a mode change", async () => {
    const history = deferred<GetMessagesResponse>();
    mocks.getConversationMessages.mockReturnValue(history.promise);
    renderSession();
    fireEvent.click(
      screen.getByRole("button", { name: "Select conversation A" }),
    );
    expectLocked();
    expect(
      screen.getByRole("status", { name: "Loading messages" }),
    ).toBeTruthy();
    fireEvent.change(input(), { target: { value: "Should wait for history" } });
    fireEvent.keyDown(input(), { key: "Enter" });
    fireEvent.click(send());
    fireEvent.click(
      screen.getByRole("button", { name: "Open fullscreen chat" }),
    );
    expectLocked();
    expect(mocks.getConversationMessages).toHaveBeenCalledTimes(1);
    expect(mocks.createConversation).not.toHaveBeenCalled();
    expect(mocks.saveUserMessage).not.toHaveBeenCalled();
    expect(mocks.streamAssistantMessage).not.toHaveBeenCalled();
    await act(async () =>
      history.resolve(page([message("older", "user", "Loaded history")])),
    );
    expect(screen.getByText("Loaded history")).toBeTruthy();
    expect(input().value).toBe("Should wait for history");
    expect(input().disabled).toBe(false);
    expect(send().disabled).toBe(false);
  });

  it("allows submission after initial history loading fails", async () => {
    const history = deferred<GetMessagesResponse>();
    const streaming = deferred<void>();
    mocks.getConversationMessages.mockReturnValueOnce(history.promise);
    mocks.streamAssistantMessage.mockReturnValue(streaming.promise);
    renderSession();
    fireEvent.click(
      screen.getByRole("button", { name: "Select conversation A" }),
    );
    expectLocked();
    await act(async () => history.reject(new Error("History unavailable")));
    expect(
      screen.getByText("History unavailable", { selector: "p" }),
    ).toBeTruthy();
    expect(input().disabled).toBe(false);
    submit();
    await waitFor(() =>
      expect(mocks.streamAssistantMessage).toHaveBeenCalledTimes(1),
    );
    expect(mocks.saveUserMessage).toHaveBeenCalledExactlyOnceWith(
      "conversation-a",
      "New question",
    );
    requestStatus("Waiting for response");
    await act(async () => streaming.resolve(undefined));
    expect(input().disabled).toBe(false);
  });

  it("keeps lifecycle callbacks active after StrictMode effect setup and cleanup", async () => {
    const streaming = deferred<void>();
    let handlers!: StreamHandlers;
    mocks.streamAssistantMessage.mockImplementation(
      (_id: string, _messages: unknown, nextHandlers: StreamHandlers) => {
        handlers = nextHandlers;
        return streaming.promise;
      },
    );
    renderSession(true);
    submit();
    await waitFor(() => expect(handlers).toBeDefined());
    act(() => handlers.onText("StrictMode response"));
    expect(screen.getByText("StrictMode response")).toBeTruthy();
    requestStatus("Generating response");
    expectLocked();
    expect(screen.getByTestId("selected-conversation").textContent).toBe(
      "conversation-a",
    );
    await act(async () => streaming.resolve(undefined));
    expect(input().disabled).toBe(false);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it.each(["creation", "save", "stream", "reconciliation"] as const)(
    "ignores late %s work after a true unmount while shared providers remain mounted",
    async (stage) => {
      const creation = deferred<{ id: string }>();
      const saving = deferred<TutorMessage>();
      const streaming = deferred<void>();
      const reconciliation = deferred<GetMessagesResponse>();
      let handlers!: StreamHandlers;
      if (stage === "creation") {
        mocks.createConversation.mockReturnValue(creation.promise);
      }
      if (stage === "save") {
        mocks.saveUserMessage.mockReturnValue(saving.promise);
      }
      if (stage === "stream" || stage === "reconciliation") {
        mocks.streamAssistantMessage.mockImplementation(
          (_id: string, _messages: unknown, nextHandlers: StreamHandlers) => {
            handlers = nextHandlers;
            if (stage === "reconciliation") {
              nextHandlers.onText("Completed before unmount");
              return Promise.resolve();
            }
            return streaming.promise;
          },
        );
      }
      if (stage === "reconciliation") {
        mocks.getConversationMessages.mockReturnValue(reconciliation.promise);
      }
      renderSession();
      submit();
      await waitFor(() => {
        const api =
          stage === "creation"
            ? mocks.createConversation
            : stage === "save"
              ? mocks.saveUserMessage
              : stage === "stream"
                ? mocks.streamAssistantMessage
                : mocks.getConversationMessages;
        expect(api).toHaveBeenCalledTimes(1);
      });
      fireEvent.click(screen.getByRole("button", { name: "Unmount chat" }));
      fireEvent.click(
        screen.getByRole("button", { name: "Select conversation B" }),
      );
      fireEvent.click(screen.getByRole("button", { name: "Set shared error" }));
      const beforeLateWork = sharedSnapshot();
      await act(async () => {
        if (stage === "creation") {
          creation.resolve({ id: "late-conversation" });
        } else if (stage === "save") {
          saving.resolve(message("late-question", "user", "New question"));
        } else if (stage === "stream") {
          handlers.onText("Late chunk");
          handlers.onMessageId("late-answer");
          streaming.reject(new Error("Late stream error"));
        } else {
          reconciliation.resolve(
            page([message("late-answer", "assistant", "Late history")]),
          );
        }
      });
      expect(sharedSnapshot()).toEqual(beforeLateWork);
      expect(screen.queryByText("Late chunk")).toBeNull();
      expect(screen.queryByText("Late history")).toBeNull();
      if (stage !== "reconciliation") {
        expect(mocks.getConversationMessages).not.toHaveBeenCalled();
      }
    },
  );
});
