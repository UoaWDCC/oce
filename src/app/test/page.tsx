"use client";
import ChatButton from "@/features/chatbot/components/chatButton";
import { ReactNode } from "react";
import { ChatModalProvider } from "@/features/chatbot/providers/ChatBoxModalProvider";
import ChatSection from "@/features/chatbot/components/chatSection";
import TextInput from "@/features/textInput";
import NewConversationButton from "@/features/chatbot/components/newConversationButton";

export default function Test(): ReactNode {
  return (
    <div className="p-5 h-full">
      <NewConversationButton />
      <TextInput submitMessage={() => {}} />
      <ChatModalProvider>
        <ChatSection />
        <div className="fixed bottom-3 right-3"></div>
      </ChatModalProvider>
    </div>
  );
}
