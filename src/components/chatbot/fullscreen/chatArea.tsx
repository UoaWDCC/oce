"use client";
import { useChatModal } from "@/context/ChatBoxModalProvider";
import ChatScreen from "./chatScreen";
import ConversationsList from "./conversationsList";

export default function ChatArea() {
  const { open, toggleOpen } = useChatModal();

  return (
    <div
      className={`${open ? `` : `hidden`} fixed top-0 left-0 h-full w-full p-0 z-30 bg-white`}
    >
      <div className="flex h-full w-full p-5">
        <div className="w-full flex gap-3">
          <ConversationsList />
          <ChatScreen open={open} toggleOpen={toggleOpen} />
        </div>
      </div>
    </div>
  );
}
