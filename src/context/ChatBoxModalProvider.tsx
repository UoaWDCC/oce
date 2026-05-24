"use client";
import { createContext, useContext, useState, ReactNode } from "react";

export interface ChatModalContextType {
  open: boolean;
  toggleOpen(): void;
}

const ChatModalContext = createContext<ChatModalContextType | undefined>(
  undefined,
);

export function ChatModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<boolean>(false);

  function toggleOpen() {
    setOpen(!open);
  }

  return (
    <ChatModalContext.Provider value={{ open, toggleOpen }}>
      {children}
    </ChatModalContext.Provider>
  );
}

export function useChatModal() {
  const context = useContext(ChatModalContext);
  if (!context) {
    throw new Error("useChatModal must be used within ChatModalProvider");
  }
  return context;
}
