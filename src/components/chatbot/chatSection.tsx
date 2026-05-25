import React from "react";
import { useChatModal } from "@/context/ChatBoxModalProvider";
import ChatArea from "./fullscreen/chatArea";
import ChatFullscreen from "./fullscreen/chatFullscreen";

export interface ChatMessageType {
  type: "user" | "bot";
  message: string;
}

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
