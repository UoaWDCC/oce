"use client";
import Image from "next/image";
import { ReactNode } from "react";

interface IChatButton {
  toggleOpen(): void;
}

export default function ChatButton({ toggleOpen }: IChatButton): ReactNode {
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
