"use client";
import { useState } from "react";
import ChatReply from "@/features/chatbot/components/chatReply";
import TutorRequestButton from "@/features/tutorRequest/components/tutorRequestButton";

export default function TutorRequestPreview() {
  const [conversationId, setConversationId] = useState<string>("");
  const hasId = conversationId.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      <label className="text-sm font-semibold text-slate-700">
        Conversation ID
        <input
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#5e00b2]"
          placeholder="Paste a real conversation UUID from Supabase"
          value={conversationId}
          onChange={(e) => setConversationId(e.target.value)}
        />
      </label>

      {hasId ? (
        <div className="flex flex-col gap-6">
          <div>
            <p className="mb-2 text-sm text-slate-600">
              In context — last AI reply (tutor action sits next to the
              favourite button):
            </p>
            <div className="rounded-2xl bg-white p-3 outline-2 outline-[#e9d5ff]">
              <ChatReply isLast conversationId={conversationId.trim()}>
                {
                  "Here is the AI tutor's answer. If this wasn't enough, you can ask a real tutor below."
                }
              </ChatReply>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm text-slate-600">
              Standalone text button:
            </p>
            <TutorRequestButton conversationId={conversationId.trim()} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Enter a conversation ID to test a real request.
        </p>
      )}
    </div>
  );
}
