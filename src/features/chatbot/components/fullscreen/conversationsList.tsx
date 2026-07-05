"use client";
import { useConversation } from "../../providers/ConversationProvider";
import Conversation from "./conversation";

export default function ConversationsList() {
  const { conversations } = useConversation();

  return (
    <div className="rounded-2xl h-full shadow-xl outline outline-message-grey overflow-y-auto flex flex-col p-4 min-w-1/7 gap-2">
      {conversations.map((conversation) => {
        const { title, id } = conversation.conversation;
        return <Conversation key={id} name={title} />;
      })}
    </div>
  );
}
