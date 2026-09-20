// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getConversationMessages: vi.fn(),
  selectedConversationId: "conversation-a",
  setError: vi.fn(),
  setSelectedConversationId: vi.fn(),
  refreshConversationList: vi.fn(),
  viewportHeight: 400,
}));

vi.mock("@/hooks/useOnScreen", () => ({ default: () => true }));
vi.mock("@/features/chatbot/providers/ChatBoxModalProvider", () => ({
  useChatModal: () => ({
    open: true,
    openZoomChatBox: true,
    toggleOpen: vi.fn(),
    toggleOpenZoomChatBox: vi.fn(),
  }),
}));
vi.mock("@/features/chatbot/providers/ConversationProvider", () => ({
  useConversation: () => ({
    selectedConversationId: mocks.selectedConversationId,
    setSelectedConversationId: mocks.setSelectedConversationId,
    refreshConversationList: mocks.refreshConversationList,
    messageResetVersion: 0,
    error: undefined,
    setError: mocks.setError,
  }),
}));
vi.mock("@/features/chatbot/api/conversations", () => ({
  getConversationMessages: mocks.getConversationMessages,
  createConversation: vi.fn(),
  saveUserMessage: vi.fn(),
  streamAssistantMessage: vi.fn(),
}));
vi.mock("@/features/chatbot/components/chatMessage", () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "chat-message" }, children),
}));
vi.mock("@/features/chatbot/components/chatReply", () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "chat-message" }, children),
}));
vi.mock("@/features/chatbot/components/chatDownButton", () => ({
  default: () => null,
}));
vi.mock("@/features/textArea", () => ({ default: () => null }));
vi.mock("@/features/chatbot/components/errorMessage", () => ({
  default: () => null,
}));

import ChatFullscreen from "@/features/chatbot/components/fullscreen/chatFullscreen";

function page(
  conversationId: string,
  first: number,
  last: number,
  hasMore: boolean,
  offset = 0,
) {
  const messages = Array.from({ length: last - first + 1 }, (_, index) => {
    const number = first + index;
    return {
      id: `message-${number}`,
      conversation_id: conversationId,
      role: "user" as const,
      content: `message-${number}`,
      is_favourite: false,
      created_at: new Date(number * 1000).toISOString(),
    };
  });
  return { messages, hasMore, nextOffset: offset + messages.length };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.selectedConversationId = "conversation-a";
  mocks.viewportHeight = 400;
  HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(callback, 0),
  );
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(
    function (this: HTMLElement) {
      return this.classList.contains("overflow-y-auto")
        ? mocks.viewportHeight
        : 0;
    },
  );
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(
    function (this: HTMLElement) {
      return this.classList.contains("overflow-y-auto")
        ? this.querySelectorAll('[data-testid="chat-message"]').length * 10
        : 0;
    },
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ChatFullscreen message pagination", () => {
  it("keeps loading short pages until all older messages are accessible", async () => {
    mocks.getConversationMessages.mockImplementation(
      async (_conversationId: string, { offset = 0 }: { offset?: number }) => {
        if (offset === 0) return page("conversation-a", 31, 45, true);
        if (offset === 15) return page("conversation-a", 16, 30, true, 15);
        if (offset === 30) return page("conversation-a", 1, 15, false, 30);
        throw new Error(`Unexpected offset ${offset}`);
      },
    );

    render(React.createElement(ChatFullscreen));

    await waitFor(() => expect(screen.getByText("message-1")).toBeTruthy());
    expect(mocks.getConversationMessages.mock.calls).toEqual([
      ["conversation-a", { limit: 15 }],
      ["conversation-a", { limit: 15, offset: 15 }],
      ["conversation-a", { limit: 15, offset: 30 }],
    ]);
    expect(screen.getAllByTestId("chat-message")).toHaveLength(45);
  });

  it("stops automatic loading once the messages become scrollable", async () => {
    mocks.viewportHeight = 200;
    mocks.getConversationMessages.mockImplementation(
      async (_conversationId: string, { offset = 0 }: { offset?: number }) => {
        if (offset === 0) return page("conversation-a", 31, 45, true);
        if (offset === 15) return page("conversation-a", 16, 30, true, 15);
        throw new Error(`Unexpected automatic offset ${offset}`);
      },
    );

    render(React.createElement(ChatFullscreen));

    await waitFor(() => expect(screen.getByText("message-16")).toBeTruthy());
    expect(screen.getAllByTestId("chat-message")).toHaveLength(30);
    expect(mocks.getConversationMessages).toHaveBeenCalledTimes(2);
  });

  it("resets automatic page loading when the selected conversation changes", async () => {
    mocks.getConversationMessages.mockImplementation(
      async (conversationId: string, { offset = 0 }: { offset?: number }) => {
        if (conversationId === "conversation-a") {
          return page(conversationId, 31, 45, false);
        }
        if (offset === 0) return page(conversationId, 16, 30, true);
        if (offset === 15) return page(conversationId, 1, 15, false, 15);
        throw new Error(`Unexpected offset ${offset}`);
      },
    );

    const view = render(React.createElement(ChatFullscreen));
    await waitFor(() => expect(screen.getByText("message-45")).toBeTruthy());

    mocks.selectedConversationId = "conversation-b";
    view.rerender(React.createElement(ChatFullscreen));

    await waitFor(() => expect(screen.getByText("message-1")).toBeTruthy());
    expect(mocks.getConversationMessages.mock.calls).toEqual([
      ["conversation-a", { limit: 15 }],
      ["conversation-b", { limit: 15 }],
      ["conversation-b", { limit: 15, offset: 15 }],
    ]);
    expect(screen.queryByText("message-45")).toBeNull();
  });
});
