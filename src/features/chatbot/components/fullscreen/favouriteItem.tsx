"use client";

import { useState } from "react";
import { Star, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { FavouriteMessage } from "@/features/chatbot/types";
import { patchFavourite } from "@/features/chatbot/api/favourite";
import { useConversation } from "@/features/chatbot/providers/ConversationProvider";

interface FavouriteItemProps {
  favourite: FavouriteMessage;
  onOpenConversation: (conversationId: string, messageId: string) => void;
  onRemoved: (id: string) => void;
  isSelected: boolean;
}

export default function FavouriteItem({
  favourite,
  onOpenConversation,
  onRemoved,
  isSelected,
}: FavouriteItemProps) {
  const { setError } = useConversation();
  const [isRemoving, setIsRemoving] = useState(false);

  async function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    if (isRemoving) return;

    setIsRemoving(true);
    try {
      await patchFavourite(favourite.id, false);
      onRemoved(favourite.id);
    } catch {
      setError("Failed to remove favourite. Please try again.");
      setIsRemoving(false);
    }
  }

  const conversationName =
    favourite.conversation_title?.trim() || "Untitled Conversation";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() =>
        onOpenConversation(favourite.conversation_id, favourite.id)
      }
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenConversation(favourite.conversation_id, favourite.id);
        }
      }}
      className={`group relative flex flex-col gap-2 rounded-xl border p-3.5 shadow-sm transition-all hover:border-[#5e00b2]/30 hover:shadow-md ${
        isSelected
          ? "border-[#5e00b2] bg-purple-50/60 shadow-md"
          : "border-purple-100 bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-[#5e00b2]">
          <MessageSquare className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{conversationName}</span>
        </div>

        <button
          type="button"
          aria-label="Remove from favourites"
          disabled={isRemoving}
          onClick={handleRemove}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-purple-50 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5e00b2]"
        >
          <Star className="h-4 w-4 fill-[#5e00b2] text-[#5e00b2] hover:fill-red-500 hover:text-red-500 transition-colors" />
        </button>
      </div>

      <div className="min-w-0 max-h-36 overflow-y-auto rounded-lg bg-slate-50/70 p-2.5 text-xs text-slate-700 leading-relaxed">
        <div className="markdown [overflow-wrap:anywhere]">
          <ReactMarkdown>{favourite.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
