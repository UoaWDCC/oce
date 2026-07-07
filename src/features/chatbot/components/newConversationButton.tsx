"use client";
import { useConversation } from "../providers/ConversationProvider";
import { createConversation } from "../api";
import { CirclePlus } from "lucide-react";
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
      className="w-full disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div className="w-full p-2 flex items-center justify-center md:justify-start gap-3">
        <CirclePlus size={25} className="shrink-0" />
        <div className="hidden md:block font-semibold text-sm grow">
          <p className="hidden md:block">New Conversation</p>
        </div>
      </div>
    </button>
  );
}
