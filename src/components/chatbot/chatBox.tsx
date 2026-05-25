"use client";

import Image from "next/image";
import React, { ReactNode, useState, useRef, useEffect } from "react";
import ChatInput from "./chatInput";
import ChatMessage from "./chatMessage";
import ChatReply from "./chatReply";
import ChatDownButton from "./chatDownButton";
import useOnScreen from "@/hooks/useOnScreen";
import { useChatModal } from "@/context/ChatBoxModalProvider";
import ChatArea from "./fullscreen/chatArea";

export interface ChatMessageType {
  type: "user" | "bot";
  message: string;
}

export default function ChatBox(): ReactNode {
  const { open, toggleOpen, openZoomChatBox, toggleOpenZoomChatBox } =
    useChatModal();
  //NOTE: the way that message content is passed into the div hasn't been finalised
  const [messages, setMessages] = useState<ChatMessageType[]>([
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
  const lastMessageRef = useRef<HTMLDivElement>(null);
  function submitMessage(chatMessage: ChatMessageType) {
    setMessages([...messages, chatMessage]);
  }

  const isVisible = useOnScreen(lastMessageRef);
  useEffect(() => {
    lastMessageRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }, [messages]);

  return (
    <>
      {openZoomChatBox ? (
        <ChatArea />
      ) : (
        <div
          className={`${open ? `` : `hidden`} flex flex-col rounded-2xl min-h-1/3 absolute bottom-5 right-5 max-h-1/2 w-3/5 bg-white shadow-xl overflow-hidden z-20 md:w-2/5 lg:w-1/4`}
        >
          <div className="absolute bottom-15 right-1/2 z-40">
            {!isVisible && (
              <ChatDownButton
                scrollDown={() =>
                  lastMessageRef.current?.scrollIntoView({ behavior: "smooth" })
                }
              />
            )}
          </div>
          <div className="relative top-0 h-20 flex items-center justify-between bg-[#5e00b2] w-full px-5 py-2 rounded-tr-2xl rounded-tl-2xl box-border">
            <p className="font-bold text-white text-lg">AI Tutor</p>
            <div className="flex-1 gap-2 flex justify-end">
              <button onClick={() => toggleOpenZoomChatBox()}>
                <Image
                  src={"/zoomButton.svg"}
                  alt="make the chatbox window bigger"
                  width={25}
                  height={25}
                />
              </button>

              <button onClick={() => toggleOpen()}>
                <Image
                  src={"/cancelButton.svg"}
                  alt="close the chatbot window"
                  width={30}
                  height={30}
                />
              </button>
            </div>
          </div>
          <div className="min-h-0 pt-3 flex-1 overflow-y-scroll h-full w-full">
            <div className="relative py-3 pr-2 w-full pl-3">
              <div className="flex flex-col w-full gap-3 pb-3 ">
                {messages.map((message, index) => {
                  if (message.type == "user") {
                    return (
                      <ChatMessage key={index}>{message.message}</ChatMessage>
                    );
                  }
                  return <ChatReply key={index}>{message.message}</ChatReply>;
                })}
              </div>
              <div className="h-3" ref={lastMessageRef}></div>
            </div>
          </div>
          <div className="bg-transparent w-full bg-none">
            <div className="">
              <ChatInput submitMessage={submitMessage} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
