"use client";

import { useRef, useState } from "react";
import Conversation from "./conversation";
import ConversationSearchInput from "./conversationSearchInput";
import NewConversationButton from "../newConversationButton";
import { useConversations } from "@/features/chatbot/hooks/useConversations";
import { useConversationSearch } from "@/features/chatbot/hooks/useConversationSearch";
import { useConversation } from "@/features/chatbot/providers/ConversationProvider";
import { endConversation } from "@/features/chatbot/api/conversations";

interface StatusMessageProps {
  title: string;
  description?: string;
  variant: "loading" | "empty" | "error";
}

function StatusMessage({ title, description, variant }: StatusMessageProps) {
  const isError = variant === "error";

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div
        className={`w-full rounded-xl border px-4 py-6 text-center ${
          isError
            ? "border-red-200 bg-red-50"
            : variant === "loading"
              ? "border-purple-100 bg-purple-50/50"
              : "border-dashed border-purple-200 bg-slate-50/70"
        }`}
        role={isError ? "alert" : "status"}
      >
        <p
          className={`text-sm font-semibold ${isError ? "text-red-700" : "text-slate-700"}`}
        >
          {title}
        </p>
        {description && (
          <p
            className={`mt-1 text-xs ${isError ? "text-red-600" : "text-slate-500"}`}
          >
            {description}
          </p>
        )}
      </div>
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
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-4 overflow-hidden rounded-2xl border border-purple-100 bg-white p-4 shadow-sm">
      <div className="flex shrink-0 flex-col gap-3">
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
          <StatusMessage
            title={isSearching ? "Searching..." : "Loading..."}
            description={
              isSearching
                ? "Looking for matching conversations."
                : "Loading your conversations."
            }
            variant="loading"
          />
        ) : shownError ? (
          <StatusMessage
            title={
              isSearching
                ? "Could not load search results."
                : "Could not load conversations."
            }
            description="Please try again."
            variant="error"
          />
        ) : shownConversations.length === 0 ? (
          <StatusMessage
            title={
              isSearching
                ? "No conversations match your search."
                : "No conversations yet."
            }
            description={
              isSearching
                ? "Try another search term."
                : "Start a new conversation to see it here."
            }
            variant="empty"
          />
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
