"use client";
import { createConversation } from "../services/conversation.service";

export default function NewConversationButton() {
  return <button onClick={createConversation}>New Convo</button>;
}
