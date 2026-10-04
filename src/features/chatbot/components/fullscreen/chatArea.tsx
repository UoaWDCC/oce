"use client";
import { useChatModal } from "@/features/chatbot/providers/ChatBoxModalProvider";
import ChatFullscreen from "./chatFullscreen";
import ConversationsList from "./conversationsList";

export default function ChatArea() {
  const { open, openZoomChatBox } = useChatModal();

  return (
    <div
      className={`${openZoomChatBox ? "fixed top-0 left-0 h-full w-full p-0 z-100 bg-slate-50" : ""} ${!open ? "hidden" : !openZoomChatBox ? "contents" : ""}`}
    >
      <div className={openZoomChatBox ? "flex h-full w-full p-5" : "contents"}>
        <div
          className={
            openZoomChatBox
              ? "grid h-full w-full grid-cols-[minmax(0,260px)_minmax(0,1fr)] gap-3 md:grid-cols-[260px_minmax(0,1fr)]"
              : "contents"
          }
        >
          {openZoomChatBox && <ConversationsList />}
          {/* Keep the chat at the same tree position so its session survives mode changes. */}
          <div className={openZoomChatBox ? "min-h-0 min-w-0" : "contents"}>
            <ChatFullscreen />
          </div>
        </div>
      </div>
    </div>
  );
}
