"use client";

import Image from "next/image";
import React, { ReactNode, useState } from "react";
import ChatInput from "./chatInput";
import ChatMessage from "./chatMessage";
import ChatReply from "./chatReply";

interface IChatBox {
  open: boolean;
  toggleOpen(): void;
}

export interface IChatMessage {
  type: "user" | "bot";
  message: string;
}

export default function ChatBox({ open, toggleOpen }: IChatBox): ReactNode {
  //NOTE: the way that message content is passed into the div hasn't been finalised
  const [messages, setMessages] = useState<IChatMessage[]>([
    {
      type: "user",
      message: "test",
    },
    {
      type: "bot",
      message: `
# Weekly Update

Completed tasks:
- Finished homepage redesign  
- Updated mobile navigation  
- Fixed login bug  

Next steps:
- User testing on Tuesday  
- Accessibility review on Thursday  

Notes:  
The new layout improves readability  
and creates clearer visual hierarchy.
`,
    },
  ]);
  function submitMessage(chatMessage: IChatMessage) {
    setMessages([...messages, chatMessage]);
  }
  return (
    <div
      className={`${open ? `` : `hidden`} flex flex-col rounded-2xl min-h-1/3 absolute bottom-5 right-5 max-h-1/2 w-1/4 bg-white shadow-xl overflow-hidden z-20`}
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
      <div className="overflow-y-auto pr-2 ">
        <div className="relative h-full py-3 box-border w-full pl-3">
          <div className="flex flex-col w-full gap-5 pb-3">
            {messages.map((message, index) => {
              if (message.type == "user") {
                return <ChatMessage key={index}>{message.message}</ChatMessage>;
              }
              return <ChatReply key={index}>{message.message}</ChatReply>;
            })}
          </div>
        </div>
        <div className="sticky bottom-5">
          <ChatInput submitMessage={submitMessage} />
        </div>
      </div>
    </div>
  );
}
