"use client";
import Image from "next/image";
import { ReactNode, useState } from "react";

export default function ChatButton(): ReactNode {
  //NOTE: may need to move this state into context later
  const [modalOpened, setModalOpened] = useState<boolean>(false);
  return (
    <div className="p-5" onClick={() => setModalOpened(!modalOpened)}>
      <Image
        src={"/chatButton.svg"}
        alt="button to open up the AI chatbot"
        width={60}
        height={60}
      />
    </div>
  );
}
