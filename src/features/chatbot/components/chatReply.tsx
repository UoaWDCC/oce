"use client";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { useState } from "react";
import TutorRequestMessageAction from "@/features/tutorRequest/components/tutorRequestMessageAction";

interface ChatReplyType {
  children: string;
  // Only the last AI reply in a conversation shows the tutor request action.
  isLast?: boolean;
  conversationId?: string | null;
}
export default function ChatReply({
  children,
  isLast = false,
  conversationId = null,
}: ChatReplyType) {
  //NOTE: This may need to be moved outside and into context if it
  const [favourited, setFavourited] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  //NOTE: assume that the content being input into text is markdown by default.

  const showTutorAction = isLast && Boolean(conversationId);

  return (
    <div className="px-3">
      <div className="w-full">
        <div className="markdown">
          <ReactMarkdown>{children}</ReactMarkdown>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
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
          <button onClick={() => setFavourited(!favourited)}>
            <Image
              src={`${favourited ? `/favouriteButtonSelected.svg` : `/favouriteButton.svg`}`}
              alt="add the chatbot's response to your favourites"
              height={30}
              width={30}
            />
          </button>
        </div>
        {showTutorAction && (
          <TutorRequestMessageAction
            conversationId={conversationId as string}
          />
        )}
      </div>
    </div>
  );
}
