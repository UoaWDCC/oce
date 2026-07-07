"use client";

import Conversation from "./conversation";
import { useConversations } from "@/features/chatbot/hooks/useConversations";
import { useConversation } from "@/features/chatbot/providers/ConversationProvider";

export default function ConversationsList() {
  //NOTE: the way that conversations are passed inside is not final and needs to be changed to fit the API response.
  const { conversations, isLoading, error } = useConversations();
  const { selectedConversationId, setSelectedConversationId } =
    useConversation();

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
      {conversations.map((conversation) => {
        const { title, id } = conversation;
        return (
          <Conversation
            name={title?.trim() || "Untitled"}
            key={id}
            isSelected={selectedConversationId === id}
            onSelect={() => setSelectedConversationId(id)}
          />
        );
      })}
    </div>
  );
}
