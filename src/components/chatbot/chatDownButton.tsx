"use client";
import Image from "next/image";
import { ReactNode } from "react";

interface IChatDownButtonProps {
  scrollDown(): void;
}

export default function ChatDownButton({
  scrollDown,
}: IChatDownButtonProps): ReactNode {
  return (
    <button onClick={() => scrollDown()} className="">
      <Image
        src={"/downButton.svg"}
        alt="scroll down to the bottom of the chat"
        height={30}
        width={30}
      />
    </button>
  );
}
