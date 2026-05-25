"use client";
import ChatMessage from "@/components/chatbot/chatMessage";
import ChatButton from "@/components/chatbot/chatButton";
import { ReactNode } from "react";
import ChatBox from "@/components/chatbot/chatBox";
import ChatArea from "@/components/chatbot/fullscreen/chatArea";
import { ChatModalProvider } from "@/context/ChatBoxModalProvider";
import ChatSection from "@/components/chatbot/chatSection";

export default function Test(): ReactNode {
  return (
    <div className="p-5 h-full">
      <ChatModalProvider>
        <ChatSection />
        <div className="fixed bottom-3 right-3">
          <ChatButton />
        </div>
      </ChatModalProvider>
    </div>
  );
}
