// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadNormal: vi.fn(),
  loadSearch: vi.fn(),
}));

vi.mock("@/features/chatbot/hooks/useConversations", () => ({
  useConversations: () => ({
    conversations: [{ id: "normal", title: "Normal" }],
    isLoading: false,
    isLoadingMore: false,
    hasMore: true,
    loadMore: mocks.loadNormal,
    error: null,
  }),
}));
vi.mock("@/features/chatbot/hooks/useConversationSearch", () => ({
  useConversationSearch: (query: string) => ({
    results: query ? [{ id: "match", title: "Match" }] : [],
    isLoading: false,
    isLoadingMore: false,
    hasMore: Boolean(query),
    loadMore: mocks.loadSearch,
    error: null,
  }),
}));
vi.mock("@/features/chatbot/providers/ConversationProvider", () => ({
  useConversation: () => ({
    selectedConversationId: null,
    setSelectedConversationId: vi.fn(),
    setTargetMessageId: vi.fn(),
    conversationListVersion: 0,
    refreshConversationList: vi.fn(),
    clearCurrentMessages: vi.fn(),
    setError: vi.fn(),
  }),
}));
vi.mock("@/features/chatbot/components/fullscreen/conversation", () => ({
  default: ({ name }: { name: string }) =>
    React.createElement("div", null, name),
}));
vi.mock(
  "@/features/chatbot/components/fullscreen/conversationSearchInput",
  () => ({
    default: ({
      value,
      onChange,
      onClear,
    }: {
      value: string;
      onChange: (value: string) => void;
      onClear: () => void;
    }) =>
      React.createElement(
        React.Fragment,
        null,
        React.createElement("input", {
          "aria-label": "Search conversations",
          value,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
            onChange(event.target.value),
        }),
        React.createElement("button", { onClick: onClear }, "Clear search"),
      ),
  }),
);
vi.mock("@/features/chatbot/components/fullscreen/loadMoreSentinel", () => ({
  default: ({ onVisible }: { onVisible: () => void }) =>
    React.createElement("button", { onClick: onVisible }, "Load next page"),
}));
vi.mock(
  "@/features/chatbot/components/fullscreen/endConversationDialog",
  () => ({
    default: () => null,
  }),
);
vi.mock("@/features/chatbot/components/fullscreen/favouritesList", () => ({
  default: () => null,
}));
vi.mock("@/features/chatbot/components/newConversationButton", () => ({
  default: () => null,
}));
vi.mock("@/features/chatbot/api/conversations", () => ({
  endConversation: vi.fn(),
}));

import ConversationsList from "@/features/chatbot/components/fullscreen/conversationsList";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ConversationsList pagination", () => {
  it("loads the next search page and restores normal pagination after clearing", () => {
    render(React.createElement(ConversationsList));

    fireEvent.click(screen.getByRole("button", { name: "Load next page" }));
    expect(mocks.loadNormal).toHaveBeenCalledTimes(1);

    fireEvent.change(
      screen.getByRole("textbox", { name: "Search conversations" }),
      {
        target: { value: "DAO" },
      },
    );
    expect(screen.getByText("Match")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Load next page" }));
    expect(mocks.loadSearch).toHaveBeenCalledTimes(1);
    expect(mocks.loadNormal).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByText("Normal")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Load next page" }));
    expect(mocks.loadNormal).toHaveBeenCalledTimes(2);
  });
});
