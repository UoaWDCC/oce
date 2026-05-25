import React from "react";
import { useChatModal } from "@/context/ChatBoxModalProvider";
import ChatArea from "./fullscreen/chatArea";
import ChatScreen from "./fullscreen/chatScreen";

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

  return <ChatScreen />;
}
