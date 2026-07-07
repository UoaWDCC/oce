"use client";

import { useRef, useEffect, useState } from "react";
import { ChatMessageType, TutorMessage } from "@/features/chatbot/types";
import useOnScreen from "@/hooks/useOnScreen";
import Image from "next/image";
import ChatMessage from "../chatMessage";
import ChatReply from "../chatReply";
import ChatDownButton from "../chatDownButton";
import TextArea from "@/features/textArea";
import { useChatModal } from "@/features/chatbot/providers/ChatBoxModalProvider";
import { useConversation } from "../../providers/ConversationProvider";
import {
  createConversation,
  saveUserMessage,
  streamAssistantMessage,
} from "@/features/chatbot/api";
import ErrorMessage from "../errorMessage";
import type { Message } from "@/llm/types/Message";

function mapTutorMessageToChatMessage(message: TutorMessage): ChatMessageType {
  return {
    type: message.role === "user" ? "user" : "bot",
    message: message.content,
    id: message.id,
    favourited: message.is_favourite,
  };
}

function mapChatMessagesToLLMMessages(messages: ChatMessageType[]): Message[] {
  return messages.map((message) => ({
    role: message.type === "user" ? "user" : "assistant",
    content: message.message,
  }));
}

export default function ChatFullscreen() {
  const { open, toggleOpen, toggleOpenZoomChatBox, openZoomChatBox } =
    useChatModal();
  const {
    selectedConversationId,
    setSelectedConversationId,
    refreshConversationList,
    messageResetVersion,
    error,
    setError,
  } = useConversation();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isSavingMessage, setIsSavingMessage] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const isSavingMessageRef = useRef(false);

  async function submitMessage(content: string) {
    if (isSavingMessageRef.current) {
      return;
    }

    isSavingMessageRef.current = true;
    setIsSavingMessage(true);
    setSaveError(null);
    setError(undefined);

    try {
      let conversationId = selectedConversationId;

      if (!conversationId) {
        const newConversation = await createConversation();
        conversationId = newConversation.id;
        setSelectedConversationId(conversationId);
        refreshConversationList();
      }

      const savedMessage = await saveUserMessage(conversationId, content);
      const userMessage = mapTutorMessageToChatMessage(savedMessage);
      const assistantMessage: ChatMessageType = {
        type: "bot",
        message: "",
        favourited: false,
      };

      const messagesForStream = [...messages, userMessage];

      setMessages((currentMessages) => [
        ...currentMessages,
        userMessage,
        assistantMessage,
      ]);
      refreshConversationList();

      await streamAssistantMessage(
        conversationId,
        mapChatMessagesToLLMMessages(messagesForStream),
        {
          onText: (text) => {
            setMessages((currentMessages) => {
              const nextMessages = [...currentMessages];
              const assistantIndex = nextMessages.length - 1;
              const currentAssistant = nextMessages[assistantIndex];

              if (!currentAssistant || currentAssistant.type !== "bot") {
                return currentMessages;
              }

              nextMessages[assistantIndex] = {
                ...currentAssistant,
                message: `${currentAssistant.message}${text}`,
              };

              return nextMessages;
            });
          },
          onMessageId: (id) => {
            setMessages((currentMessages) => {
              const nextMessages = [...currentMessages];
              const assistantIndex = nextMessages.length - 1;
              const currentAssistant = nextMessages[assistantIndex];

              if (!currentAssistant || currentAssistant.type !== "bot") {
                return currentMessages;
              }

              nextMessages[assistantIndex] = {
                ...currentAssistant,
                id,
                favourited: false,
              };

              return nextMessages;
            });
            refreshConversationList();
          },
        },
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Message could not be saved. Please try again.";
      setSaveError(message);
      setError(message);
      throw error;
    } finally {
      isSavingMessageRef.current = false;
      setIsSavingMessage(false);
    }
  }

  const isVisible = useOnScreen(lastMessageRef, "-40px");

  useEffect(() => {
    setMessages([]);
    setSaveError(null);
    setError(undefined);
  }, [messageResetVersion, setError]);

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
              if (message.type === "user") {
                return <ChatMessage key={index}>{message.message}</ChatMessage>;
              }
              return (
                <ChatReply
                  key={index}
                  messageId={message.id}
                  initialFavourited={message.favourited}
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
          <TextArea
            submitMessage={submitMessage}
            isSubmitting={isSavingMessage}
            errorMessage={saveError}
          />
        </div>
      </div>
    </div>
  );
}
