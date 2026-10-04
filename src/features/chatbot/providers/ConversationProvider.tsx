"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface ConversationContextType {
  selectedConversationId: string | null;
  setSelectedConversationId: (id: string | null) => void;
  targetMessageId: string | null;
  setTargetMessageId: (id: string | null) => void;
  conversationListVersion: number;
  refreshConversationList: () => void;
  messageResetVersion: number;
  clearCurrentMessages: () => void;
  discardedConversationIds: string[];
  discardConversation: (id: string) => void;
  favouriteVersion: number;
  refreshFavourites: () => void;
  error: string | undefined;
  setError: (error: string | undefined) => void;
}

const ConversationContext = createContext<ConversationContextType | undefined>(
  undefined,
);

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [targetMessageId, setTargetMessageId] = useState<string | null>(null);
  const [conversationListVersion, setConversationListVersion] = useState(0);
  const [messageResetVersion, setMessageResetVersion] = useState(0);
  const [discardedConversationIds, setDiscardedConversationIds] = useState<
    string[]
  >([]);
  const [favouriteVersion, setFavouriteVersion] = useState(0);
  const [error, setError] = useState<string | undefined>(undefined);

  return (
    <ConversationContext.Provider
      value={{
        selectedConversationId,
        setSelectedConversationId,
        targetMessageId,
        setTargetMessageId,
        conversationListVersion,
        refreshConversationList: () =>
          setConversationListVersion((version) => version + 1),
        messageResetVersion,
        clearCurrentMessages: () =>
          setMessageResetVersion((version) => version + 1),
        discardedConversationIds,
        discardConversation: (id) =>
          setDiscardedConversationIds((ids) =>
            ids.includes(id) ? ids : [...ids, id],
          ),
        favouriteVersion,
        refreshFavourites: () => setFavouriteVersion((version) => version + 1),
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
