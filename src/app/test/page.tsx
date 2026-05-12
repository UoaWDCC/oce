"use client";
import ChatMessage from "@/components/chatbot/chatMessage";
import ChatButton from "@/components/chatbot/chatButton";
import { ReactNode, useState } from "react";
import ChatBox from "@/components/chatbot/chatBox";
import ChatReply from "@/components/chatbot/chatReply";

export default function Test(): ReactNode {
  const [modalOpened, setModalOpened] = useState<boolean>(false);

  return (
    <div className="p-5 h-full">
      <div className="fixed bottom-3 right-3">
        <ChatButton
          toggleOpen={() => {
            setModalOpened(!modalOpened);
          }}
        />
      </div>
      <ChatBox
        open={modalOpened}
        toggleOpen={() => {
          setModalOpened(!modalOpened);
        }}
      ></ChatBox>
      <div className="flex">
        <ChatMessage>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris nisi ut
          aliquip ex ea commodo consequat. Duis aute irure dolor in
          reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
          pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
          culpa qui officia deserunt mollit anim id est laborum.
        </ChatMessage>
      </div>
    </div>
  );
}
