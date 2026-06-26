"use client";
import { Message } from "@/llm/types/Message";
import { CreateConversationResponse } from "@app-types/conversations";
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  Dispatch,
  SetStateAction,
} from "react";

export interface ConversationContextType {
  conversation: CreateConversationResponse | null;
  setConversation: Dispatch<SetStateAction<CreateConversationResponse | null>>;
  messages: Message[] | null;
  setMessages: Dispatch<SetStateAction<Message[]>>;
}

const ConversationContext = createContext<ConversationContextType | undefined>(
  undefined,
);

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [conversation, setConversation] =
    useState<CreateConversationResponse | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  return (
    <ConversationContext.Provider
      value={{ conversation, setConversation, messages, setMessages }}
    >
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversation() {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error("useConversation must be used within ConversationProvider");
  }
  return context;
}
