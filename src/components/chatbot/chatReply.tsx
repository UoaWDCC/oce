"use client";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { useState } from "react";

interface IChatReply {
  children: string;
  ref: React.Ref<HTMLDivElement>;
}

export default function ChatReply({ children, ref }: IChatReply) {
  //NOTE: This may need to be moved outside and into context if it
  const [favourited, setFavourited] = useState<boolean>(false);
  //NOTE: assume that the content being input into text is markdown by default.
  return (
    <div className="px-3" ref={ref}>
      <div className="w-full">
        <div className="markdown">
          <ReactMarkdown>{children}</ReactMarkdown>
        </div>
      </div>
      <div className="flex gap-2">
        <button>
          <Image
            src={"/copyButton.svg"}
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
    </div>
  );
}
