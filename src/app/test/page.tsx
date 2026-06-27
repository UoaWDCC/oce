"use client";
import { ReactNode } from "react";
import { ChatModalProvider } from "@/features/chatbot/providers/ChatBoxModalProvider";
import ChatSection from "@/features/chatbot/components/chatSection";
import TextInput from "@/features/textInput";
import NewConversationButton from "@/features/chatbot/components/newConversationButton";
import { ConversationProvider } from "@/features/chatbot/providers/ConversationProvider";

export default function Test(): ReactNode {
  return (
    <div className="p-5 h-full">
      <ConversationProvider>
        <NewConversationButton />
        <TextInput submitMessage={() => {}} />
        <ChatModalProvider>
          <ChatSection />
          <div className="fixed bottom-3 right-3"></div>
        </ChatModalProvider>
      </ConversationProvider>
    </div>
  );
}
