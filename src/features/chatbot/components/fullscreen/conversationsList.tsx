"use client";

import { useState } from "react";
import Conversation from "./conversation";
import NewConversationButton from "../newConversationButton";
import { useConversations } from "@/features/chatbot/hooks/useConversations";
import { useConversation } from "@/features/chatbot/providers/ConversationProvider";
import { endConversation } from "@/features/chatbot/api/conversations";

export default function ConversationsList() {
  const {
    selectedConversationId,
    setSelectedConversationId,
    conversationListVersion,
    refreshConversationList,
    clearCurrentMessages,
    setError,
  } = useConversation();
  const [endingIds, setEndingIds] = useState<Set<string>>(new Set());

  async function handleEnd(id: string) {
    setEndingIds((prev) => new Set(prev).add(id));
    try {
      await endConversation(id);
      if (selectedConversationId === id) {
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

  if (isLoading) {
    return (
      <div className="rounded-2xl h-full shadow-xl outline outline-message-grey flex items-center justify-center p-4 min-w-1/7">
        <p className="text-sm text-slate-500 font-semibold text-center">
          Loading...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl h-full shadow-xl outline outline-message-grey flex items-center justify-center p-4 min-w-1/7">
        <p className="text-sm text-slate-500 font-semibold text-center">
          Could not load conversations.
        </p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="rounded-2xl h-full shadow-xl outline outline-message-grey flex items-center justify-center p-4 min-w-1/7">
        <p className="text-sm text-slate-500 font-semibold text-center">
          No conversations yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl h-full shadow-xl outline outline-message-grey overflow-y-auto flex flex-col p-4 min-w-1/7 gap-2">
      <div>
        <NewConversationButton />
      </div>
      {conversations.map((conversation) => {
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
          />
        );
      })}
    </div>
  );
}
