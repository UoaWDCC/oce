"use client";
import { Check, Copy, Star } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useState } from "react";
import { useFavouriteMessage } from "../hooks/useFavouriteMessage";
import TutorRequestMessageAction from "@/features/tutorRequest/components/tutorRequestMessageAction";

interface ChatReplyType {
  children: string;
  messageId?: string;
  initialFavourited?: boolean;
  // Only the last AI reply in a conversation shows the tutor request action.
  isLast?: boolean;
  conversationId?: string | null;
  isTargeted?: boolean;
}

export default function ChatReply({
  children,
  messageId,
  initialFavourited = false,
  isLast = false,
  conversationId = null,
  isTargeted = false,
}: ChatReplyType) {
  const [copied, setCopied] = useState<boolean>(false);
  const { favourited, toggleFavourite } = useFavouriteMessage(
    messageId,
    initialFavourited,
  );

  //NOTE: assume that the content being input into text is markdown by default.

  // The tutor action only makes sense on the last reply of a real conversation.
  const showTutorAction = isLast && Boolean(conversationId);

  return (
    <div
      id={messageId ? `message-${messageId}` : undefined}
      className={`min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${
        isTargeted ? "animate-favourite-message" : ""
      }`}
    >
      <div className="min-w-0 max-w-full overflow-x-auto">
        <div className="markdown min-w-0 max-w-full text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]">
          <ReactMarkdown>{children}</ReactMarkdown>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={copied ? "Response copied" : "Copy response"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#5e00b2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5e00b2] focus-visible:ring-offset-2"
            onClick={() => {
              navigator.clipboard.writeText(children);
              setCopied(true);
              setTimeout(() => {
                setCopied(false);
              }, 3000);
            }}
          >
            {copied ? (
              <Check aria-hidden="true" className="h-5 w-5" />
            ) : (
              <Copy aria-hidden="true" className="h-5 w-5" />
            )}
          </button>
          {/* Favourite is only available for persisted assistant messages. */}
          {messageId && (
            <button
              type="button"
              aria-label={
                favourited
                  ? "Remove response from favourites"
                  : "Add response to favourites"
              }
              aria-pressed={favourited}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#5e00b2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5e00b2] focus-visible:ring-offset-2"
              onClick={toggleFavourite}
            >
              <Star
                aria-hidden="true"
                className={`h-5 w-5 ${favourited ? "fill-[#5e00b2] text-[#5e00b2]" : ""}`}
              />
            </button>
          )}
        </div>
        {showTutorAction && (
          <TutorRequestMessageAction
            conversationId={conversationId as string}
          />
        )}
      </div>
    </div>
  );
}
