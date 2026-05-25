"use client";
import { createContext, useContext, useState, ReactNode } from "react";

export interface ChatModalContextType {
  open: boolean;
  toggleOpen(): void;
  openZoomChatBox: boolean;
  toggleOpenZoomChatBox(): void;
}

const ChatModalContext = createContext<ChatModalContextType | undefined>(
  undefined,
);

export function ChatModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<boolean>(false);
  const [openZoomChatBox, setOpenZoomChatBox] = useState<boolean>(false);

  function toggleOpen() {
    setOpen(!open);
  }

  function toggleOpenZoomChatBox() {
    setOpenZoomChatBox(!openZoomChatBox);
  }

  return (
    <ChatModalContext.Provider
      value={{ open, toggleOpen, openZoomChatBox, toggleOpenZoomChatBox }}
    >
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
