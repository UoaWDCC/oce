// @vitest-environment jsdom
import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getConversationMessages: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dao/class-daos",
}));
vi.mock("@/hooks/useOnScreen", () => ({ default: () => true }));
vi.mock("@/features/chatbot/hooks/useTokenUsage", () => ({
  useTokenUsage: () => null,
  isTokenLimitReached: () => false,
  getTokenUsageLevel: () => "none",
}));
vi.mock("@/features/chatbot/api/conversations", async () => ({
  ...(await vi.importActual<
    typeof import("@/features/chatbot/api/conversations")
  >("@/features/chatbot/api/conversations")),
  getConversationMessages: mocks.getConversationMessages,
}));
vi.mock("@/features/chatbot/components/fullscreen/conversationsList", () => ({
  default: () => <div>Conversations</div>,
}));
vi.mock("@/features/tutorRequest/hooks/usePendingTutorRequest", () => ({
  usePendingTutorRequest: () => ({
    hasPending: false,
    loading: false,
    refresh: vi.fn(),
  }),
}));

import ChatSection from "@/features/chatbot/components/chatSection";
import ChatButton from "@/features/chatbot/components/chatButton";
import { ChatModalProvider } from "@/features/chatbot/providers/ChatBoxModalProvider";
import {
  ConversationProvider,
  useConversation,
} from "@/features/chatbot/providers/ConversationProvider";

const daoPath = "/dao/0x1111111111111111111111111111111111111111";
const originalUrl = window.location.href;
const originalHistoryState = window.history.state;
const originalScrollIntoView = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "scrollIntoView",
);
const links = [
  { name: "Course Portal", path: "/portal" },
  { name: "Selected DAO", path: daoPath },
  {
    name: "Ethereum learning resources",
    path: "https://ethereum.org/en/learn/",
  },
];

function TutorHarness() {
  const { setSelectedConversationId } = useConversation();
  return (
    <>
      <button onClick={() => setSelectedConversationId("conversation-a")}>
        Open conversation
      </button>
      <ChatSection />
      <ChatButton />
    </>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/dao/class-daos");
  mocks.getConversationMessages.mockResolvedValue({
    messages: [
      {
        id: "response-a",
        conversation_id: "conversation-a",
        role: "assistant",
        content: links
          .map(({ name, path }) => `[${name}](${path})`)
          .join("\n\n"),
        is_favourite: false,
        created_at: "2026-10-07T00:00:00.000Z",
      },
    ],
    hasMore: false,
    nextOffset: 1,
  });
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState(originalHistoryState, "", originalUrl);
  if (originalScrollIntoView) {
    Object.defineProperty(
      HTMLElement.prototype,
      "scrollIntoView",
      originalScrollIntoView,
    );
  } else {
    Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
  }
});

describe("AI Tutor navigation links", () => {
  it("renders internal and external Markdown links in compact and fullscreen chat", async () => {
    render(
      <ConversationProvider>
        <ChatModalProvider>
          <TutorHarness />
        </ChatModalProvider>
      </ConversationProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open AI Tutor" }));
    fireEvent.click(screen.getByRole("button", { name: "Open conversation" }));
    await screen.findByRole("link", { name: "Course Portal" });

    function expectLinks(container: HTMLElement) {
      for (const { name, path } of links) {
        const link = within(container).getByRole("link", {
          name,
        }) as HTMLAnchorElement;
        expect(link.getAttribute("href")).toBe(path);
        expect(link.href).toBe(new URL(path, window.location.origin).href);
        expect(link.tabIndex).toBe(0);
      }
      expect(window.location.pathname).toBe("/dao/class-daos");
    }

    expectLinks(document.body);
    expect(screen.queryByRole("dialog", { name: "AI Tutor" })).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "Open fullscreen chat" }),
    );
    expectLinks(screen.getByRole("dialog", { name: "AI Tutor" }));

    fireEvent.click(screen.getByRole("button", { name: "Minimise chat" }));
    expectLinks(document.body);
    expect(screen.queryByRole("dialog", { name: "AI Tutor" })).toBeNull();
  });
});
