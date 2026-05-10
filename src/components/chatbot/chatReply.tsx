"use client";
import ReactMarkdown from "react-markdown";

interface IChatReply {
  children: string;
}

export default function ChatReply({ children }: IChatReply) {
  //NOTE: assume that the content being input into text is markdown by default.
  return (
    <div className="flex items-col">
      <div className="markdown">
        <ReactMarkdown>{children}</ReactMarkdown>
      </div>
      <div></div>
    </div>
  );
}
