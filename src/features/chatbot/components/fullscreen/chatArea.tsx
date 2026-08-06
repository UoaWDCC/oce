"use client";
import { useChatModal } from "@/features/chatbot/providers/ChatBoxModalProvider";
import ChatFullscreen from "./chatFullscreen";
import ConversationsList from "./conversationsList";

export default function ChatArea() {
  const { open } = useChatModal();

  return (
    <div
      className={`${open ? `` : `hidden`} fixed top-0 left-0 h-full w-full p-0 z-100 bg-slate-50`}
    >
      <div className="flex h-full w-full p-5">
        <div className="grid h-full w-full grid-cols-[minmax(0,260px)_minmax(0,1fr)] gap-3 md:grid-cols-[260px_minmax(0,1fr)]">
          <ConversationsList />
          <div className="min-h-0 min-w-0">
            <ChatFullscreen />
          </div>
        </div>
      </div>
    </div>
  );
}
