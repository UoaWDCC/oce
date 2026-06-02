import React from "react";
import { useChatModal } from "@/features/chatbot/providers/ChatBoxModalProvider";
import ChatArea from "./fullscreen/chatArea";
import ChatFullscreen from "./fullscreen/chatFullscreen";

export interface ChatSectionProps {
  type: "box" | "fullscren";
}

export default function ChatSection() {
  const { openZoomChatBox } = useChatModal();
  if (openZoomChatBox) {
    return <ChatArea />;
  }

  return <ChatFullscreen />;
}
