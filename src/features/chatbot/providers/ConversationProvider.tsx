"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface ConversationContextType {
  selectedConversationId: string | null;
  setSelectedConversationId: (id: string | null) => void;
}

const ConversationContext = createContext<ConversationContextType | undefined>(
  undefined,
);

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);

  return (
    <ConversationContext.Provider
      value={{ selectedConversationId, setSelectedConversationId }}
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
