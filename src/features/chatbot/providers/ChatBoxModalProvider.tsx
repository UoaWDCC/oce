"use client";
import {
  createContext,
  useContext,
  useState,
  useRef,
  ReactNode,
  RefObject,
} from "react";

export interface ChatModalContextType {
  open: boolean;
  toggleOpen(): void;
  openZoomChatBox: boolean;
  toggleOpenZoomChatBox(): void;
  launcherRef: RefObject<HTMLButtonElement | null>;
}

const ChatModalContext = createContext<ChatModalContextType | undefined>(
  undefined,
);

export function ChatModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<boolean>(false);
  const [openZoomChatBox, setOpenZoomChatBox] = useState<boolean>(false);
  const launcherRef = useRef<HTMLButtonElement>(null);

  function toggleOpen() {
    setOpen((value) => !value);
  }

  function toggleOpenZoomChatBox() {
    setOpenZoomChatBox((value) => !value);
  }

  return (
    <ChatModalContext.Provider
      value={{
        open,
        toggleOpen,
        openZoomChatBox,
        toggleOpenZoomChatBox,
        launcherRef,
      }}
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
