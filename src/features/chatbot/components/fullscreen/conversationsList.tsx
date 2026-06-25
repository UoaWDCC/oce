"use client";

import Conversation from "./conversation";
import { useConversations } from "@/features/chatbot/hooks/useConversations";

interface ConversationType {
  id: string;
  name: string;
}

export default function ConversationsList() {
  //NOTE: the way that conversations are passed inside is not final and needs to be changed to fit the API response.
  const { conversations } = useConversations();

  return (
    <div className="rounded-2xl h-full shadow-xl outline outline-message-grey overflow-y-auto flex flex-col p-4 min-w-1/7 gap-2">
      {conversations.map((conversation) => {
        const { title, id } = conversation;
        return <Conversation name={title || "Untitled"} key={id} />;
      })}
    </div>
  );
}
