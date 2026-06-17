"use client";
import { useChatModal } from "@/features/chatbot/providers/ChatBoxModalProvider";
import Image from "next/image";
import { ReactNode } from "react";

export default function ChatButton(): ReactNode {
  const { toggleOpen } = useChatModal();
  return (
    <div className="p-5" onClick={toggleOpen}>
      <Image
        src={"/chatButton.svg"}
        alt="button to open up the AI chatbot"
        width={60}
        height={60}
      />
    </div>
  );
}
