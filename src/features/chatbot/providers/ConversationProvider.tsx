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
  conversations: CreateConversationResponse[];
  setConversations: Dispatch<SetStateAction<CreateConversationResponse[]>>;
  activeConversation: CreateConversationResponse | null;
  setActiveConversation: Dispatch<
    SetStateAction<CreateConversationResponse | null>
  >;
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  error: string | undefined;
  setError: Dispatch<SetStateAction<string | undefined>>;
}

const ConversationContext = createContext<ConversationContextType | undefined>(
  undefined,
);

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<
    CreateConversationResponse[]
  >([]);
  const [activeConversation, setActiveConversation] =
    useState<CreateConversationResponse | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<undefined | string>(undefined);

  return (
    <ConversationContext.Provider
      value={{
        conversations,
        setConversations,
        activeConversation,
        setActiveConversation,
        messages,
        setMessages,
        error,
        setError,
      }}
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
