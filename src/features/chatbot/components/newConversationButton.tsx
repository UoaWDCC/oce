"use client";
import { useConversation } from "../providers/ConversationProvider";
import { createConversation } from "@/features/chatbot/api/conversations";
import { Plus } from "lucide-react";
import { useState } from "react";

export default function NewConversationButton() {
  const {
    setSelectedConversationId,
    refreshConversationList,
    clearCurrentMessages,
    setError,
  } = useConversation();
  const [isCreating, setIsCreating] = useState(false);

  return (
    <button
      disabled={isCreating}
      onClick={async () => {
        if (isCreating) {
          return;
        }
        setIsCreating(true);
        setError(undefined);
        try {
          const newConversation = await createConversation();
          setSelectedConversationId(newConversation.id);
          clearCurrentMessages();
          refreshConversationList();
        } catch (error) {
          setError(
            error instanceof Error
              ? error.message
              : "Conversation could not be created. Please try again.",
          );
        } finally {
          setIsCreating(false);
        }
      }}
      className="h-11 w-full rounded-full bg-gradient-to-r from-purple-700 to-violet-500 font-bold text-white shadow-lg shadow-purple-200 transition hover:from-purple-800 hover:to-violet-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
    >
      <div className="flex w-full items-center justify-center gap-2 px-4 md:justify-start">
        <Plus aria-hidden="true" className="h-5 w-5 shrink-0" />
        <div className="hidden grow text-sm md:block">
          <p className="hidden md:block">New Conversation</p>
        </div>
      </div>
    </button>
  );
}
