"use client";
import { useState } from "react";
import { useTutorRequest } from "../hooks/useTutorRequest";

interface TutorRequestPanelProps {
  conversationId: string;
  onClose?(): void;
}

export default function TutorRequestPanel({
  conversationId,
  onClose,
}: TutorRequestPanelProps) {
  const [question, setQuestion] = useState<string>("");
  const { status, error, submit } = useTutorRequest();

  const isLoading = status === "loading";
  const isEmpty = question.trim().length === 0;

  async function handleSubmit() {
    await submit({ conversationId, question });
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl bg-white p-5 outline-2 outline-[#e9d5ff]">
        <p className="text-sm font-semibold text-slate-950">
          Your request has been sent to a tutor.
        </p>
        <p className="mt-1 text-sm text-slate-600">
          A tutor will follow up on this conversation.
        </p>
        {onClose && (
          <div className="mt-4">
            <button
              className="rounded-full bg-[#5e00b2] px-4 py-2 text-sm font-semibold text-white"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-5 outline-2 outline-[#e9d5ff]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-950">Ask a tutor</p>
        {onClose && (
          <button
            className="text-sm text-slate-500"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-600">
        Send your question to a real tutor when the AI answer is not enough.
      </p>

      <textarea
        className="mt-3 min-h-24 w-full resize-none rounded-2xl bg-slate-50 px-4 py-3 text-sm outline-2 outline-[#e9d5ff] focus:outline-[#5e00b2] disabled:opacity-60"
        placeholder="Describe what you need help with"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        disabled={isLoading}
      />

      {status === "error" && error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

      <div className="mt-3 flex justify-end">
        <button
          className="rounded-full bg-[#5e00b2] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          onClick={handleSubmit}
          disabled={isEmpty || isLoading}
        >
          {isLoading ? "Sending..." : "Send request"}
        </button>
      </div>
    </div>
  );
}