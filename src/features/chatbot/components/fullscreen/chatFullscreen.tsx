import { useRef, useEffect, useState } from "react";
import useOnScreen from "@/hooks/useOnScreen";
import Image from "next/image";
import ChatMessage from "../chatMessage";
import ChatReply from "../chatReply";
import ChatDownButton from "../chatDownButton";
import TextArea from "@/features/textArea";
import { useChatModal } from "@/features/chatbot/providers/ChatBoxModalProvider";
import { useConversation } from "../../providers/ConversationProvider";
import { Message } from "@/llm/types/Message";
import { createMessage } from "../../services/message.service";
import { createConversation } from "../../services/conversation.service";
import ErrorMessage from "../errorMessage";

export default function ChatFullscreen() {
  const { open, toggleOpen, toggleOpenZoomChatBox, openZoomChatBox } =
    useChatModal();
  const {
    messages,
    setMessages,
    activeConversation,
    setActiveConversation,
    conversations,
    setConversations,
    setError,
    error,
  } = useConversation();
  const lastMessageRef = useRef<HTMLDivElement>(null);

  function submitMessage(chatMessage: Message) {
    setMessages([...messages, chatMessage]);
    (async () => {
      try {
        if (activeConversation == null) {
          createConversation().then(async (newConversation) => {
            setActiveConversation(newConversation);
            setConversations([...conversations, newConversation]);
            await createMessage({
              conversation_id: newConversation.conversation.id,
              content: chatMessage.content,
            });
          });
        } else {
          await createMessage({
            conversation_id: activeConversation.conversation.id,
            content: chatMessage.content,
          });
        }
        setError(undefined);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Something went wrong!");
        }
      }
    })();
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

      <div className="z-10 flex w-full justify-center relative p-5">
        {error !== undefined && <ErrorMessage message={error} />}
      </div>

      <div className="min-h-0 pt-3 flex-1 overflow-y-scroll h-full w-full">
        <div className="relative py-3 pr-2 w-full pl-3">
          <div className="flex flex-col w-full gap-3 pb-3 ">
            {messages.map((message, index) => {
              if (message.role == "user") {
                return <ChatMessage key={index}>{message.content}</ChatMessage>;
              }
              return <ChatReply key={index}>{message.content}</ChatReply>;
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
