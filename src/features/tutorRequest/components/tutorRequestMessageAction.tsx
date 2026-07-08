"use client";
import { useState } from "react";
import { usePendingTutorRequest } from "../hooks/usePendingTutorRequest";
import TutorRequestPanel from "./tutorRequestPanel";

interface TutorRequestMessageActionProps {
  conversationId: string;
}

/**
 * Inline "Ask a tutor" control for the last chat reply.
 * Shows a trigger button, a "pending" label when a request is already
 * open, or the full panel once the user clicks to ask.
 */
export default function TutorRequestMessageAction({
  conversationId,
}: TutorRequestMessageActionProps) {
  const [open, setOpen] = useState<boolean>(false);
  const { hasPending, loading, refresh } =
    usePendingTutorRequest(conversationId);

  return (
    <div className="flex w-full flex-col gap-2">
      {!open && hasPending && (
        <span
          className="text-xs font-semibold text-[#5e00b2]"
          title="A tutor request is already pending for this conversation"
        >
          Tutor request pending
        </span>
      )}

      {!open && !hasPending && (
        <button
          onClick={() => setOpen(true)}
          disabled={loading}
          aria-label="Ask a tutor about this response"
          title="Ask a tutor"
          className="self-start text-xs font-semibold text-[#5e00b2] disabled:opacity-50"
        >
          Ask a tutor
        </button>
      )}

      {open && (
        <TutorRequestPanel
          conversationId={conversationId}
          onClose={() => {
            setOpen(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}
