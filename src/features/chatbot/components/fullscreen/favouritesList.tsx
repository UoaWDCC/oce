"use client";

import { Star } from "lucide-react";
import FavouriteItem from "./favouriteItem";
import { useFavourites } from "@/features/chatbot/hooks/useFavourites";
import { useConversation } from "@/features/chatbot/providers/ConversationProvider";

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

interface FavouritesListProps {
  onOpenConversation: (conversationId: string, messageId: string) => void;
  onFavouriteRemoved: (messageId: string) => void;
  selectedFavouriteMessageId: string | null;
}

export default function FavouritesList({
  onOpenConversation,
  onFavouriteRemoved,
  selectedFavouriteMessageId,
}: FavouritesListProps) {
  const { favouriteVersion, selectedConversationId, clearCurrentMessages } =
    useConversation();
  const { favourites, isLoading, error, setFavourites } =
    useFavourites(favouriteVersion);

  const handleRemoved = (id: string, conversationId: string) => {
    setFavourites((prev) => prev.filter((item) => item.id !== id));
    onFavouriteRemoved(id);
    if (selectedConversationId === conversationId) {
      clearCurrentMessages();
    }
  };

  if (isLoading) {
    return (
      <StatusMessage
        title="Loading favourites..."
        description="Fetching your saved AI Tutor responses."
        variant="loading"
      />
    );
  }

  if (error) {
    return (
      <StatusMessage
        title="Could not load favourites."
        description="Please try again later."
        variant="error"
      />
    );
  }

  if (favourites.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-[#5e00b2]">
          <Star className="h-5 w-5 fill-[#5e00b2]" />
        </div>
        <p className="text-sm font-semibold text-slate-800">
          No favourites yet
        </p>
        <p className="mt-1 text-xs text-slate-500 max-w-xs">
          Star useful AI Tutor responses during a chat to save and easily
          revisit them here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
      {favourites.map((fav) => (
        <FavouriteItem
          key={fav.id}
          favourite={fav}
          onOpenConversation={onOpenConversation}
          onRemoved={(id) => handleRemoved(id, fav.conversation_id)}
          isSelected={fav.id === selectedFavouriteMessageId}
        />
      ))}
    </div>
  );
}
