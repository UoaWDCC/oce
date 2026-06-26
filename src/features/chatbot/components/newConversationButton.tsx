"use client";
import { useConversation } from "../providers/ConversationProvider";
import { createConversation } from "../services/conversation.service";

export default function NewConversationButton() {
  const { setConversation } = useConversation();

  return (
    <button
      onClick={async () => {
        setConversation(await createConversation());
      }}
    >
      New Convo
    </button>
  );
}
