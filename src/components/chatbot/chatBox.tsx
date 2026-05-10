"use client";

import Image from "next/image";
import { ReactNode } from "react";
import ChatInput from "./chatInput";

interface IChatBox {
  open: boolean;
  toggleOpen(): void;
  children: ReactNode;
}

export default function ChatBox({ open, toggleOpen, children }: IChatBox) {
  return (
    <div
      className={`${open ? `` : `hidden`} flex flex-col rounded-2xl min-h-1/3 absolute bottom-5 right-5 max-h-1/2 w-1/4 bg-white shadow-xl overflow-hidden`}
    >
      <div className="relative top-0 h-20 flex items-center justify-between bg-[#5e00b2] w-full px-5 py-2 rounded-tr-2xl rounded-tl-2xl box-border">
        <p className="font-bold text-white text-lg">AI Tutor</p>
        <button onClick={() => toggleOpen()}>
          <Image
            src={"/cancelButton.svg"}
            alt="close the chatbot window"
            width={30}
            height={30}
          />
        </button>
      </div>
      <div className=" overflow-y-auto ">
        <div className="relative h-full py-3 box-border w-full pl-3">
          <div className="flex flex-col w-full gap-5 pb-3">{children}</div>
        </div>
        <ChatInput />
      </div>
    </div>
  );
}
