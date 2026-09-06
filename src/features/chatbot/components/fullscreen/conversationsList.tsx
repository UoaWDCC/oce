"use client";

import { useRef, useState } from "react";
import { ArrowLeft, Star } from "lucide-react";
import Conversation from "./conversation";
import ConversationSearchInput from "./conversationSearchInput";
import EndConversationDialog from "./endConversationDialog";
import NewConversationButton from "../newConversationButton";
import FavouritesList from "./favouritesList";
import { useConversations } from "@/features/chatbot/hooks/useConversations";
import { useConversationSearch } from "@/features/chatbot/hooks/useConversationSearch";
import { useConversation } from "@/features/chatbot/providers/ConversationProvider";
import { endConversation } from "@/features/chatbot/api/conversations";

interface StatusMessageProps {
  title: string;
  description?: string;
  variant: "loading" | "empty" | "error";
}

interface PendingEnd {
  id: string;
  name: string;
  trigger: HTMLButtonElement;
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
    setTargetMessageId,
    conversationListVersion,
    refreshConversationList,
    clearCurrentMessages,
    setError,
  } = useConversation();

  const [showFavourites, setShowFavourites] = useState(false);
  const [selectedFavouriteMessageId, setSelectedFavouriteMessageId] = useState<
    string | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");
  const isSearching = searchQuery.trim().length > 0;

  const [endingIds, setEndingIds] = useState<Set<string>>(new Set());
  const [endedIds, setEndedIds] = useState<Set<string>>(new Set());
  const [pendingEnd, setPendingEnd] = useState<PendingEnd | null>(null);
  const endingIdsRef = useRef<Set<string>>(new Set());
  const selectedConversationIdRef = useRef(selectedConversationId);
  selectedConversationIdRef.current = selectedConversationId;

  async function handleEnd(id: string): Promise<boolean> {
    if (endingIdsRef.current.has(id)) return false;

    endingIdsRef.current.add(id);
    setEndingIds((prev) => new Set(prev).add(id));
    try {
      await endConversation(id);
      setEndedIds((prev) => new Set(prev).add(id));
      if (selectedConversationIdRef.current === id) {
        setSelectedConversationId(null);
        clearCurrentMessages();
      }
      refreshConversationList();
      return true;
    } catch {
      setError("Failed to end conversation. Please try again.");
      return false;
    } finally {
      endingIdsRef.current.delete(id);
      setEndingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleConfirmEnd() {
    if (!pendingEnd) return;

    const didEnd = await handleEnd(pendingEnd.id);
    if (didEnd) setPendingEnd(null);
  }

  const { conversations, isLoading, error } = useConversations(
    conversationListVersion,
  );

  const {
    results,
    isLoading: isSearchLoading,
    error: searchError,
  } = useConversationSearch(searchQuery);

  const handleOpenConversationFromFavourite = (
    conversationId: string,
    messageId: string,
  ) => {
    setSelectedFavouriteMessageId(messageId);
    setSelectedConversationId(conversationId);
    setTargetMessageId(messageId);
    clearCurrentMessages();
  };

  // Clearing the input flips isSearching back to false, which restores the
  // normal list without refetching it.
  const shownConversations = (isSearching ? results : conversations).filter(
    ({ id }) => !endedIds.has(id),
  );
  const shownIsLoading = isSearching ? isSearchLoading : isLoading;
  const shownError = isSearching ? searchError : error;

  return (
    <>
      <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-3 overflow-hidden rounded-2xl border border-purple-100 bg-white p-3.5 shadow-sm">
        <div className="flex shrink-0 flex-col gap-2.5">
          {showFavourites ? (
            <div className="flex items-center justify-between px-1 py-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedFavouriteMessageId(null);
                  setShowFavourites(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-purple-50 hover:text-[#5e00b2]"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
            </div>
          ) : (
            <>
              <NewConversationButton />
              <ConversationSearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                onClear={() => setSearchQuery("")}
              />
            </>
          )}
        </div>

        {showFavourites ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <FavouritesList
              onOpenConversation={handleOpenConversationFromFavourite}
              onFavouriteRemoved={(messageId) => {
                if (selectedFavouriteMessageId === messageId) {
                  setSelectedFavouriteMessageId(null);
                }
              }}
              selectedFavouriteMessageId={selectedFavouriteMessageId}
            />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
            {!isSearching && (
              <button
                type="button"
                onClick={() => setShowFavourites(true)}
                className="group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-[#5e00b2] transition-colors hover:bg-purple-50"
              >
                <Star className="h-4 w-4 fill-[#5e00b2] text-[#5e00b2] shrink-0" />
                <span>View saved messages</span>
              </button>
            )}

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
                const name = title?.trim() || "Untitled";
                return (
                  <Conversation
                    name={name}
                    key={id}
                    isSelected={selectedConversationId === id}
                    onSelect={() => {
                      setSelectedConversationId(id);
                      clearCurrentMessages();
                    }}
                    onRequestEnd={(trigger) => {
                      setPendingEnd({ id, name, trigger });
                    }}
                    isEnding={endingIds.has(id)}
                  />
                );
              })
            )}
          </div>
        )}
      </div>

      {pendingEnd && (
        <EndConversationDialog
          conversationName={pendingEnd.name}
          isEnding={endingIds.has(pendingEnd.id)}
          returnFocusTo={pendingEnd.trigger}
          onCancel={() => setPendingEnd(null)}
          onConfirm={handleConfirmEnd}
        />
      )}
    </>
  );
}
