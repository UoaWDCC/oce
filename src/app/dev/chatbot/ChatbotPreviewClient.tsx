"use client";

import { useState } from "react";
import ChatButton from "@/features/chatbot/components/chatButton";
import ChatDownButton from "@/features/chatbot/components/chatDownButton";
import ChatMessage from "@/features/chatbot/components/chatMessage";
import ChatReply from "@/features/chatbot/components/chatReply";
import ChatSection from "@/features/chatbot/components/chatSection";
import ChatFullscreen from "@/features/chatbot/components/fullscreen/chatFullscreen";
import Conversation from "@/features/chatbot/components/fullscreen/conversation";
import ConversationsList from "@/features/chatbot/components/fullscreen/conversationsList";
import { mockChatMessages } from "@/features/chatbot/mocks";
import {
  ChatModalProvider,
  useChatModal,
} from "@/features/chatbot/providers/ChatBoxModalProvider";
import { ChatMessageType } from "@/features/chatbot/types";
import TextArea from "@/features/textArea";

function ChatInputPreview() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white pt-4 shadow-sm">
      <div className="min-h-28 px-4 text-sm text-slate-700">
        {messages.length === 0 ? (
          <p>No submitted messages yet.</p>
        ) : (
          <div className="space-y-2">
            {messages.map((message, index) => (
              <ChatMessage key={`${message.message}-${index}`}>
                {message.message}
              </ChatMessage>
            ))}
          </div>
        )}
      </div>
      <TextArea
        submitMessage={(message) =>
          setMessages([...messages, { message, type: "user" }])
        }
      />
    </div>
  );
}

function ChatButtonPreview() {
  return (
    <ChatModalProvider>
      <div className="relative min-h-96 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Chat widget
            </h2>
            <p className="text-sm text-slate-600">
              Click the chatbot button to open the existing floating UI.
            </p>
          </div>
          <ChatButton />
        </div>
        <ChatSection />
      </div>
    </ChatModalProvider>
  );
}

function FullscreenPreview() {
  return (
    <ChatModalProvider>
      <div className="relative h-[620px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        <OpenFullscreenChat />
      </div>
    </ChatModalProvider>
  );
}

function OpenFullscreenChat() {
  const [ready, setReady] = useState(false);
  const { open, openZoomChatBox, toggleOpen, toggleOpenZoomChatBox } =
    useChatModal();

  return (
    <>
      {!ready && (
        <button
          className="m-5 rounded-lg bg-[#5e00b2] px-4 py-2 text-sm font-semibold text-white"
          onClick={() => {
            if (!open) {
              toggleOpen();
            }
            if (!openZoomChatBox) {
              toggleOpenZoomChatBox();
            }
            setReady(true);
          }}
        >
          Open fullscreen chat preview
        </button>
      )}
      {ready && <ChatFullscreen />}
    </>
  );
}

export default function ChatbotPreviewClient() {
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#5e00b2]">
            Development preview
          </p>
          <h1 className="mt-1 text-3xl font-bold">Chatbot Components</h1>
        </header>

        <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Messages</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-4">
              <ChatMessage>{mockChatMessages[0].message}</ChatMessage>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <ChatReply>{mockChatMessages[1].message}</ChatReply>
            </div>
          </div>
        </section>

        <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Input</h2>
          <ChatInputPreview />
        </section>

        <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Conversation List</h2>
          <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
            <div className="h-80">
              <ConversationsList />
            </div>
            <div className="space-y-3">
              <Conversation name="Module planning discussion" />
              <Conversation name="Proposal summary draft" />
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-4">
                <ChatDownButton scrollDown={() => {}} />
                <span className="text-sm text-slate-600">
                  Standalone scroll button
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          <ChatButtonPreview />
        </section>

        <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Fullscreen Chat</h2>
          <FullscreenPreview />
        </section>
      </div>
    </main>
  );
}
