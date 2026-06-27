"use client";
import { useConversation } from "../providers/ConversationProvider";
import { createConversation } from "../services/conversation.service";

export default function NewConversationButton() {
  const { setConversation, setMessages } = useConversation();

  return (
    <button
      onClick={async () => {
        setConversation(await createConversation());
        //TODO: you probably want to make sure that the messages are either: saved asynchronously or batch saved at once
        setMessages([]);
      }}
    >
      New Convo
    </button>
  );
}
