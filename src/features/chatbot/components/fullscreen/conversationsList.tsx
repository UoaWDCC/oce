"use client";

import { useRef, useState } from "react";
import Conversation from "./conversation";
import ConversationSearchInput from "./conversationSearchInput";
import NewConversationButton from "../newConversationButton";
import { useConversations } from "@/features/chatbot/hooks/useConversations";
import { useConversationSearch } from "@/features/chatbot/hooks/useConversationSearch";
import { useConversation } from "@/features/chatbot/providers/ConversationProvider";
import { endConversation } from "@/features/chatbot/api/conversations";

function StatusMessage({ children }: { children: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <p className="text-sm text-slate-500 font-semibold text-center">
        {children}
      </p>
    </div>
  );
}

export default function ConversationsList() {
  const {
    selectedConversationId,
    setSelectedConversationId,
    conversationListVersion,
    refreshConversationList,
    clearCurrentMessages,
    setError,
  } = useConversation();

  const [searchQuery, setSearchQuery] = useState("");
  const isSearching = searchQuery.trim().length > 0;

  const [endingIds, setEndingIds] = useState<Set<string>>(new Set());
  const [endedIds, setEndedIds] = useState<Set<string>>(new Set());
  const selectedConversationIdRef = useRef(selectedConversationId);
  selectedConversationIdRef.current = selectedConversationId;

  async function handleEnd(id: string) {
    setEndingIds((prev) => new Set(prev).add(id));
    try {
      await endConversation(id);
      setEndedIds((prev) => new Set(prev).add(id));
      if (selectedConversationIdRef.current === id) {
        setSelectedConversationId(null);
        clearCurrentMessages();
      }
      refreshConversationList();
    } catch {
      setError("Failed to end conversation. Please try again.");
    } finally {
      setEndingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  const { conversations, isLoading, error } = useConversations(
    conversationListVersion,
  );

  const {
    results,
    isLoading: isSearchLoading,
    error: searchError,
  } = useConversationSearch(searchQuery);

  // Clearing the input flips isSearching back to false, which restores the
  // normal list without refetching it.
  const shownConversations = (isSearching ? results : conversations).filter(
    ({ id }) => !endedIds.has(id),
  );
  const shownIsLoading = isSearching ? isSearchLoading : isLoading;
  const shownError = isSearching ? searchError : error;

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-2 overflow-hidden rounded-2xl p-4 shadow-xl outline outline-message-grey">
      <div className="flex shrink-0 flex-col gap-2">
        <div>
          <NewConversationButton />
        </div>

        <ConversationSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery("")}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {shownIsLoading ? (
          <StatusMessage>
            {isSearching ? "Searching..." : "Loading..."}
          </StatusMessage>
        ) : shownError ? (
          <StatusMessage>
            {isSearching
              ? "Could not load search results."
              : "Could not load conversations."}
          </StatusMessage>
        ) : shownConversations.length === 0 ? (
          <StatusMessage>
            {isSearching
              ? "No conversations match your search."
              : "No conversations yet."}
          </StatusMessage>
        ) : (
          shownConversations.map((conversation) => {
            const { title, id } = conversation;
            return (
              <Conversation
                name={title?.trim() || "Untitled"}
                key={id}
                isSelected={selectedConversationId === id}
                onSelect={() => {
                  setSelectedConversationId(id);
                  clearCurrentMessages();
                }}
                onEnd={() => handleEnd(id)}
                isEnding={endingIds.has(id)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
