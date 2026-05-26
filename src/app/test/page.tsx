"use client";
import ChatButton from "@/components/chatbot/chatButton";
import { ReactNode } from "react";
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
