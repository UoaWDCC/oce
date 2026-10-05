// @vitest-environment jsdom
import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
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
  endConversation: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname: () => "/modules/example" }));
vi.mock("@/hooks/useOnScreen", () => ({ default: () => true }));
vi.mock("@/features/chatbot/hooks/useTokenUsage", () => ({
  useTokenUsage: () => null,
  isTokenLimitReached: () => false,
  getTokenUsageLevel: () => "none",
}));
vi.mock("@/features/chatbot/hooks/useConversations", () => ({
  useConversations: () => ({
    conversations: [
      { id: "conversation-a", title: "A conversation" },
      { id: "conversation-b", title: "B conversation" },
    ],
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    loadMore: vi.fn(),
    error: null,
  }),
}));
vi.mock("@/features/chatbot/hooks/useConversationSearch", () => ({
  useConversationSearch: () => ({
    results: [],
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    loadMore: vi.fn(),
    error: null,
  }),
}));
vi.mock("@/features/chatbot/api/conversations", async () => {
  const { AssistantStreamError } = await vi.importActual<
    typeof import("@/features/chatbot/api/conversations")
  >("@/features/chatbot/api/conversations");
  return { ...mocks, AssistantStreamError };
});
vi.mock("@/features/chatbot/components/fullscreen/favouritesList", () => ({
  default: ({
    onOpenConversation,
  }: {
    onOpenConversation: (conversationId: string, messageId: string) => void;
  }) => (
    <button
      onClick={() => onOpenConversation("conversation-b", "saved-answer-b")}
    >
      Open saved answer
    </button>
  ),
}));
vi.mock("@/features/chatbot/components/chatReply", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="assistant-reply">{children}</div>
  ),
}));
vi.mock("@/features/chatbot/components/chatDownButton", () => ({
  default: () => null,
}));

import ChatSection from "@/features/chatbot/components/chatSection";
import ChatButton from "@/features/chatbot/components/chatButton";
import { ChatModalProvider } from "@/features/chatbot/providers/ChatBoxModalProvider";
import {
  ConversationProvider,
  useConversation,
} from "@/features/chatbot/providers/ConversationProvider";
import {
  FloatingPanelLayoutProvider,
  useFloatingPanelLayout,
  useLearningPanelLayout,
} from "@/context/FloatingPanelLayoutProvider";

let visibilityStyles: HTMLStyleElement;

type StreamHandlers = {
  onText: (text: string) => void;
  onMessageId: (id: string) => void;
};

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function message(
  id: string,
  role: TutorMessage["role"],
  content: string,
): TutorMessage {
  return {
    id,
    role,
    content,
    conversation_id: "conversation-a",
    is_favourite: false,
    created_at: "2026-10-05T00:00:00.000Z",
  };
}

function page(messages: TutorMessage[] = []): GetMessagesResponse {
  return { messages, hasMore: false, nextOffset: messages.length };
}

function SelectionObserver() {
  const { selectedConversationId, targetMessageId } = useConversation();
  return (
    <>
      <span data-testid="selected-conversation">
        {selectedConversationId ?? "none"}
      </span>
      <span data-testid="target-message">{targetMessageId ?? "none"}</span>
    </>
  );
}

function renderTutor() {
  return render(
    <ConversationProvider>
      <ChatModalProvider>
        <SelectionObserver />
        <ChatSection />
        <ChatButton />
      </ChatModalProvider>
    </ConversationProvider>,
  );
}

function LearningAwareLauncher() {
  const { launcherTarget } = useFloatingPanelLayout();
  return launcherTarget ? (
    createPortal(<ChatButton compact expandOnOpen />, launcherTarget)
  ) : (
    <ChatButton />
  );
}

function LearningPanelHarness() {
  const [learningOpen, setLearningOpen] = useState(false);
  const { panelRef, launcherRef } = useLearningPanelLayout(learningOpen);
  return (
    <>
      <button onClick={() => setLearningOpen(true)}>Open learning panel</button>
      {learningOpen && (
        <div ref={panelRef} data-testid="learning-panel">
          <button onClick={() => setLearningOpen(false)}>
            Dismiss learning panel
          </button>
          <button>Submit learning answer</button>
          <div ref={launcherRef} data-testid="learning-launcher-slot" />
        </div>
      )}
      <ConversationProvider>
        <ChatModalProvider>
          <ChatSection />
          <LearningAwareLauncher />
        </ChatModalProvider>
      </ConversationProvider>
    </>
  );
}

function renderWithLearningPanel(width: number) {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      return this.dataset.testid === "learning-panel"
        ? new DOMRect(0, 0, width, 600)
        : new DOMRect();
    },
  );
  return render(
    <FloatingPanelLayoutProvider>
      <LearningPanelHarness />
    </FloatingPanelLayoutProvider>,
  );
}

function fullscreen() {
  fireEvent.click(screen.getByRole("button", { name: "Open AI Tutor" }));
  const maximise = screen.getByRole("button", { name: "Open fullscreen chat" });
  maximise.focus();
  fireEvent.click(maximise);
  const dialog = screen.getByRole("dialog", { name: "AI Tutor" });
  expect(document.activeElement).toBe(dialog);
  return dialog;
}

function sidebarToggle() {
  return screen.getByRole("button", { name: /^(Open|Close) conversations$/ });
}

function openSidebar() {
  const toggle = sidebarToggle();
  toggle.focus();
  fireEvent.click(toggle);
  return screen.getByRole("complementary", { name: "Conversations" });
}

function input() {
  return screen.getByRole("textbox", {
    name: "Message AI Tutor",
  }) as HTMLTextAreaElement;
}

function resize(width: number) {
  act(() => {
    vi.stubGlobal("innerWidth", width);
    fireEvent(window, new Event("resize"));
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("innerWidth", 375);
  // JSDom does not load Tailwind. Reproduce the utility that hides a closed
  // tutor so focus restoration can distinguish its opener from the launcher.
  visibilityStyles = document.createElement("style");
  visibilityStyles.textContent = ".hidden { display: none; }";
  document.head.appendChild(visibilityStyles);
  mocks.createConversation.mockResolvedValue({ id: "conversation-new" });
  mocks.getConversationMessages.mockResolvedValue(
    page([message("history-a", "user", "Existing history")]),
  );
  mocks.saveUserMessage.mockImplementation(
    async (_id: string, content: string) =>
      message("new-question", "user", content),
  );
  mocks.streamAssistantMessage.mockResolvedValue(undefined);
  mocks.endConversation.mockResolvedValue(undefined);
  HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(callback, 0),
  );
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
});

afterEach(() => {
  cleanup();
  visibilityStyles.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("AI Tutor responsive shell accessibility", () => {
  it("yields compact chat to a narrow learning panel and resumes the same draft through its launcher", () => {
    renderWithLearningPanel(375);
    fireEvent.click(screen.getByRole("button", { name: "Open AI Tutor" }));
    const textArea = input();
    fireEvent.change(textArea, {
      target: { value: "Keep my learning question" },
    });
    textArea.focus();
    fireEvent.click(
      screen.getByRole("button", { name: "Open learning panel" }),
    );
    expect(
      screen.queryByRole("textbox", { name: "Message AI Tutor" }),
    ).toBeNull();
    expect(textArea.isConnected).toBe(true);
    expect(textArea.value).toBe("Keep my learning question");
    expect(
      screen.getByRole("button", { name: "Submit learning answer" }),
    ).toBeTruthy();
    const slottedLauncher = within(
      screen.getByTestId("learning-launcher-slot"),
    ).getByRole("button", { name: "Open AI Tutor" });
    expect(document.activeElement).toBe(slottedLauncher);
    fireEvent.click(slottedLauncher);
    expect(screen.getByRole("dialog", { name: "AI Tutor" })).toBeTruthy();
    expect(input()).toBe(textArea);
    expect(input().value).toBe("Keep my learning question");
    fireEvent.click(screen.getByRole("button", { name: "Minimise chat" }));
    expect(screen.queryByRole("dialog", { name: "AI Tutor" })).toBeNull();
    expect(
      screen.queryByRole("textbox", { name: "Message AI Tutor" }),
    ).toBeNull();
    expect(textArea.value).toBe("Keep my learning question");
    fireEvent.click(
      screen.getByRole("button", { name: "Dismiss learning panel" }),
    );
    expect(input()).toBe(textArea);
    expect(input().value).toBe("Keep my learning question");
    expect(mocks.createConversation).not.toHaveBeenCalled();
    expect(mocks.saveUserMessage).not.toHaveBeenCalled();
    expect(mocks.streamAssistantMessage).not.toHaveBeenCalled();
  });

  it("keeps compact chat and learning controls accessible together when desktop space is available", () => {
    resize(1440);
    renderWithLearningPanel(420);
    fireEvent.click(screen.getByRole("button", { name: "Open AI Tutor" }));
    const textArea = input();
    fireEvent.change(textArea, { target: { value: "Desktop learning draft" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Open learning panel" }),
    );
    expect(input()).toBe(textArea);
    expect(input().value).toBe("Desktop learning draft");
    expect(
      screen.getByRole("button", { name: "Submit learning answer" }),
    ).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "AI Tutor" })).toBeNull();
    expect(mocks.createConversation).not.toHaveBeenCalled();
    expect(mocks.saveUserMessage).not.toHaveBeenCalled();
  });

  it("opens the narrow sidebar with an accessible toggle and returns focus after close or Escape", () => {
    renderTutor();
    fullscreen();
    expect(
      screen.queryByRole("complementary", { name: "Conversations" }),
    ).toBeNull();
    const toggle = sidebarToggle();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    const sidebar = openSidebar();
    expect(
      screen.queryByRole("textbox", { name: "Message AI Tutor" }),
    ).toBeNull();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.getAttribute("aria-controls")).toBe(sidebar.id);
    const close = within(sidebar).getByRole("button", {
      name: "Close conversations panel",
    });
    expect(document.activeElement).toBe(close);
    expect(
      within(sidebar).getByRole("button", { name: "New Conversation" }),
    ).toBeTruthy();
    fireEvent.click(close);
    expect(
      screen.queryByRole("complementary", { name: "Conversations" }),
    ).toBeNull();
    expect(document.activeElement).toBe(sidebarToggle());
    const reopened = openSidebar();
    fireEvent.keyDown(reopened, { key: "Escape" });
    expect(
      screen.queryByRole("complementary", { name: "Conversations" }),
    ).toBeNull();
    expect(screen.getByRole("dialog", { name: "AI Tutor" })).toBeTruthy();
    expect(document.activeElement).toBe(sidebarToggle());
  });

  it.each(["conversation", "new conversation", "favourite"] as const)(
    "closes the narrow sidebar and returns focus when opening a %s",
    async (destination) => {
      renderTutor();
      fullscreen();
      const sidebar = openSidebar();
      if (destination === "conversation") {
        fireEvent.click(within(sidebar).getByText("A conversation"));
      } else if (destination === "new conversation") {
        fireEvent.click(
          within(sidebar).getByRole("button", { name: "New Conversation" }),
        );
      } else {
        fireEvent.click(
          within(sidebar).getByRole("button", { name: "View saved messages" }),
        );
        fireEvent.click(
          within(sidebar).getByRole("button", { name: "Open saved answer" }),
        );
      }
      await waitFor(() =>
        expect(
          screen.queryByRole("complementary", { name: "Conversations" }),
        ).toBeNull(),
      );
      expect(document.activeElement).toBe(sidebarToggle());
      expect(screen.getByTestId("selected-conversation").textContent).toBe(
        destination === "conversation"
          ? "conversation-a"
          : destination === "new conversation"
            ? "conversation-new"
            : "conversation-b",
      );
      if (destination === "favourite") {
        expect(screen.getByTestId("target-message").textContent).toBe(
          "saved-answer-b",
        );
      }
    },
  );

  it("lets the nested end-conversation dialog handle Escape without closing the sidebar or tutor", () => {
    renderTutor();
    fullscreen();
    const sidebar = openSidebar();
    const end = within(sidebar).getAllByRole("button", {
      name: "End conversation",
    })[0];
    end.focus();
    fireEvent.click(end);
    const alertDialog = screen.getByRole("alertdialog", {
      name: "End conversation?",
    });
    fireEvent.keyDown(alertDialog, { key: "Escape" });
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getByRole("complementary", { name: "Conversations" })).toBe(
      sidebar,
    );
    expect(screen.getByRole("dialog", { name: "AI Tutor" })).toBeTruthy();
    expect(document.activeElement).toBe(end);
    expect(mocks.endConversation).not.toHaveBeenCalled();
  });

  it("keeps desktop conversation navigation available after selecting a conversation", async () => {
    resize(1440);
    renderTutor();
    fullscreen();
    const sidebar = screen.getByRole("complementary", {
      name: "Conversations",
    });
    fireEvent.click(within(sidebar).getByText("A conversation"));
    await screen.findByText("Existing history");
    expect(screen.getByRole("complementary", { name: "Conversations" })).toBe(
      sidebar,
    );
    expect(screen.getByTestId("selected-conversation").textContent).toBe(
      "conversation-a",
    );
  });

  it("wires full-screen Escape to close the modal and return focus to the launcher", () => {
    renderTutor();
    const dialog = fullscreen();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "AI Tutor" })).toBeNull();
    const launcher = screen.getByRole("button", { name: "Open AI Tutor" });
    expect(document.activeElement).toBe(launcher);
  });

  it("preserves the transcript, draft, and active response identity across desktop and narrow widths", async () => {
    const streaming = deferred<void>();
    let handlers!: StreamHandlers;
    mocks.streamAssistantMessage.mockImplementation(
      (_id: string, _context: unknown, nextHandlers: StreamHandlers) => {
        handlers = nextHandlers;
        return streaming.promise;
      },
    );
    renderTutor();
    fullscreen();
    const sidebar = openSidebar();
    fireEvent.click(within(sidebar).getByText("A conversation"));
    await screen.findByText("Existing history");
    await waitFor(() => expect(input().disabled).toBe(false));
    const textArea = input();
    const history = screen.getByText("Existing history");
    fireEvent.change(textArea, { target: { value: "A draft to preserve" } });
    resize(1440);
    expect(
      screen.getByRole("complementary", { name: "Conversations" }),
    ).toBeTruthy();
    expect(input()).toBe(textArea);
    expect(input().value).toBe("A draft to preserve");
    expect(screen.getByText("Existing history")).toBe(history);
    resize(375);
    expect(
      screen.queryByRole("complementary", { name: "Conversations" }),
    ).toBeNull();
    expect(input()).toBe(textArea);
    expect(input().value).toBe("A draft to preserve");
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => expect(handlers).toBeDefined());
    act(() => handlers.onText("Streaming through resize"));
    const reply = screen.getByText("Streaming through resize");
    resize(1440);
    resize(375);
    expect(input()).toBe(textArea);
    expect(screen.getByText("Existing history")).toBe(history);
    expect(screen.getByText("Streaming through resize")).toBe(reply);
    expect(input().disabled).toBe(true);
    expect(
      screen.getByRole("status", { name: "Generating response" }),
    ).toBeTruthy();
    expect(mocks.saveUserMessage).toHaveBeenCalledTimes(1);
    expect(mocks.streamAssistantMessage).toHaveBeenCalledTimes(1);
    expect(mocks.getConversationMessages).toHaveBeenCalledTimes(1);
    mocks.getConversationMessages.mockResolvedValue(
      page([
        message("history-a", "user", "Existing history"),
        message("new-question", "user", "A draft to preserve"),
        message("persisted-answer", "assistant", "Streaming through resize"),
      ]),
    );
    act(() => handlers.onMessageId("persisted-answer"));
    await act(async () => streaming.resolve(undefined));
    expect(input().disabled).toBe(false);
    expect(screen.getAllByText("Streaming through resize")).toHaveLength(1);
  });
});
