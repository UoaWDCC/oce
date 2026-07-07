"use client";

import Conversation from "./conversation";
import NewConversationButton from "../newConversationButton";
import { useConversations } from "@/features/chatbot/hooks/useConversations";
import { useConversation } from "@/features/chatbot/providers/ConversationProvider";

export default function ConversationsList() {
  const {
    selectedConversationId,
    setSelectedConversationId,
    conversationListVersion,
    clearCurrentMessages,
  } = useConversation();
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
          />
        );
      })}
    </div>
  );
}
