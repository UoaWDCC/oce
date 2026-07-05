"use client";
import { useConversation } from "../providers/ConversationProvider";
import { createConversation } from "../services/conversation.service";
import { CirclePlus } from "lucide-react";

export default function NewConversationButton() {
  const {
    setActiveConversation,
    setMessages,
    conversations,
    setConversations,
  } = useConversation();

  return (
    <button
      onClick={async () => {
        const newConversation = await createConversation();
        setActiveConversation(newConversation);
        setConversations([...conversations, newConversation]);
        //NOTE: you probably want to make sure that the messages are either: saved asynchronously or batch saved at once
        setMessages([]);
      }}
      className="w-full"
    >
      <div className="w-full p-2 flex items-center justify-center md:justify-start gap-3">
        <CirclePlus size={25} className="shrink-0" />
        <div className="hidden md:block font-semibold text-sm grow">
          <p className="hidden md:block">New Conversation</p>
        </div>
      </div>
    </button>
  );
}
