"use client";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { useState } from "react";
import { useFavouriteMessage } from "../hooks/useFavouriteMessage";

interface ChatReplyType {
  children: string;
  messageId?: string;
  initialFavourited?: boolean;
}

export default function ChatReply({
  children,
  messageId,
  initialFavourited = false,
}: ChatReplyType) {
  const [copied, setCopied] = useState<boolean>(false);
  const { favourited, toggleFavourite } = useFavouriteMessage(
    messageId,
    initialFavourited,
  );

  //NOTE: assume that the content being input into text is markdown by default.
  return (
    <div className="px-3">
      <div className="w-full">
        <div className="markdown">
          <ReactMarkdown>{children}</ReactMarkdown>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => {
            navigator.clipboard.writeText(children);
            setCopied(true);
            setTimeout(() => {
              setCopied(false);
            }, 3000);
          }}
        >
          <Image
            src={copied ? "/checkButton.svg" : "/copyButton.svg"}
            alt="copy the chatbot's response"
            height={25}
            width={25}
          />
        </button>
        {messageId && (
          <button onClick={toggleFavourite}>
            <Image
              src={`${favourited ? `/favouriteButtonSelected.svg` : `/favouriteButton.svg`}`}
              alt="add the chatbot's response to your favourites"
              height={30}
              width={30}
            />
          </button>
        )}
      </div>
    </div>
  );
}
