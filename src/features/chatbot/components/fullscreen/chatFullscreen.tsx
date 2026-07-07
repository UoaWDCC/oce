import { useState, useRef, useEffect } from "react";
import { ChatMessageType } from "@/features/chatbot/types";
import useOnScreen from "@/hooks/useOnScreen";
import Image from "next/image";
import ChatMessage from "../chatMessage";
import ChatReply from "../chatReply";
import ChatDownButton from "../chatDownButton";
import TextArea from "@/features/textArea";
import { useChatModal } from "@/features/chatbot/providers/ChatBoxModalProvider";
import { mockChatMessages } from "@/features/chatbot/mocks";
import { useEnsureConversation } from "@/features/tutorRequest/hooks/useEnsureConversation";

export default function ChatFullscreen() {
  const { open, toggleOpen, toggleOpenZoomChatBox, openZoomChatBox } =
    useChatModal();
  //NOTE: the way that message content is passed into the div hasn't been finalised
  const [messages, setMessages] = useState<ChatMessageType[]>(mockChatMessages);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  // Bridge: ensure a real conversation exists so the tutor request feature
  // has a valid conversation_id. Full conversation lifecycle (history,
  // selection) remains owned by the chat team.
  const { conversationId, ensure } = useEnsureConversation();

  // Index of the last bot reply, so only it shows the tutor action.
  const lastBotIndex = messages.reduce(
    (last, m, i) => (m.type === "bot" ? i : last),
    -1,
  );

  useEffect(() => {
    if (open) {
      ensure();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function submitMessage(chatMessage: ChatMessageType) {
    setMessages([...messages, chatMessage]);
  }
  const isVisible = useOnScreen(lastMessageRef, "-40px");
  useEffect(() => {
    lastMessageRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }, [messages]);
  return (
    <div
      className={`${open ? `` : `hidden`} flex flex-col rounded-2xl 
${openZoomChatBox ? `h-full w-full relative` : `min-h-1/3 fixed bottom-5 right-5 max-h-1/2 w-3/5 overflow-hidden z-70 md:w-2/5 lg:w-1/4`} bg-white shadow-xl
`}
    >
      <div className="absolute bottom-20 right-1/2 z-40">
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
          <button
            onClick={() => {
              toggleOpenZoomChatBox();
            }}
          >
            <Image
              src={"/zoomButton.svg"}
              alt="make the chatbox window bigger"
              width={25}
              height={25}
            />
          </button>
          <button
            onClick={() => {
              if (openZoomChatBox) {
                toggleOpenZoomChatBox();
              }
              toggleOpen();
            }}
          >
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
                return <ChatMessage key={index}>{message.message}</ChatMessage>;
              }
              return (
                <ChatReply
                  key={index}
                  isLast={index === lastBotIndex}
                  conversationId={conversationId}
                >
                  {message.message}
                </ChatReply>
              );
            })}
          </div>
          <div className="h-3" ref={lastMessageRef}></div>
        </div>
      </div>
      <div className="bg-transparent w-full bg-none">
        <div className="">
          <TextArea submitMessage={submitMessage} />
        </div>
      </div>
    </div>
  );
}
