"use client";
import { useConversation } from "../providers/ConversationProvider";
import { createConversation } from "../services/conversation.service";

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
        //TODO: you probably want to make sure that the messages are either: saved asynchronously or batch saved at once
        setMessages([]);
      }}
    >
      New Convo
    </button>
  );
}
