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
  getConversationMessages,
  saveUserMessage,
  streamAssistantMessage,
} from "@/features/chatbot/api/conversations";
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

// Lightweight "thinking" indicator shown while persisted history is loading.
function HistoryLoadingState() {
  return (
    <div className="flex w-full justify-center py-6">
      <div
        className="flex items-center gap-2 text-sm font-semibold text-slate-500"
        role="status"
        aria-label="Loading messages"
      >
        <span
          className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
          style={{ animationDelay: "-0.3s" }}
        />
        <span
          className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
          style={{ animationDelay: "-0.15s" }}
        />
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
      </div>
    </div>
  );
}

// Shown when the selected conversation has no persisted messages yet.
function EmptyConversationState() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-1 py-10 text-center">
      <p className="text-sm font-semibold text-slate-500">No messages yet</p>
      <p className="text-sm text-slate-400">Ask a question to get started.</p>
    </div>
  );
}

// Left-aligned "thinking" indicator shown in the reply slot after a user
// message is sent but before the first streamed assistant chunk arrives.
function AssistantThinkingState() {
  return (
    <div className="px-3">
      <div
        className="flex items-center gap-2 py-1"
        role="status"
        aria-label="Assistant is thinking"
      >
        <span
          className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
          style={{ animationDelay: "-0.3s" }}
        />
        <span
          className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
          style={{ animationDelay: "-0.15s" }}
        />
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
      </div>
    </div>
  );
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
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSavingMessage, setIsSavingMessage] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const isSavingMessageRef = useRef(false);
  // Mirrors the currently selected conversation so async stream callbacks can
  // tell whether the user has switched away since the send started.
  const selectedConversationIdRef = useRef(selectedConversationId);
  // The conversation a stream is actively writing into (null when idle).
  const streamingConversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

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

      // Record which conversation this stream targets. The history-load effect
      // skips reloading this id while saving so it doesn't clobber the
      // optimistic/streamed messages; a switch to a *different* id still loads.
      streamingConversationIdRef.current = conversationId;

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
            // Ignore chunks if the user has switched to another conversation,
            // so a background stream never leaks into the current view.
            if (selectedConversationIdRef.current !== conversationId) {
              return;
            }
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
            if (selectedConversationIdRef.current !== conversationId) {
              return;
            }
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

      // Reconcile the streamed reply with persisted data so it carries the
      // authoritative id/is_favourite for favourites & tutor-request flows.
      // Best-effort — the streamed text + onMessageId id already work if this
      // fails. Skipped after a mid-stream switch so we don't overwrite the new view.
      if (selectedConversationIdRef.current === conversationId) {
        try {
          const persisted = await getConversationMessages(conversationId);
          if (selectedConversationIdRef.current === conversationId) {
            setMessages(persisted.map(mapTutorMessageToChatMessage));
          }
        } catch {
          // Keep the streamed reply; it already holds the persisted message id.
        }
      }
    } catch (error) {
      // Only surface the failure if the user is still on the conversation that
      // was streaming; a stream that failed after they switched away must not
      // show its error in the now-selected conversation. (streamingConversationIdRef
      // still holds the target here — it is cleared in finally, which runs after.)
      if (
        selectedConversationIdRef.current === streamingConversationIdRef.current
      ) {
        const message =
          error instanceof Error
            ? error.message
            : "Message could not be saved. Please try again.";
        setSaveError(message);
        setError(message);
        // Rethrow so the input keeps/restores the draft for retry (see TextArea).
        throw error;
      }

      // This stream failed/cancelled after the user switched away. Swallow the
      // error so the now-selected conversation stays clean and the input clears;
      // the failed reply may not have persisted, which is acceptable. (A stream
      // that completes after a switch is handled by the try above and is saved.)
      console.error(
        "AI Tutor stream failed for a background conversation:",
        error,
      );
    } finally {
      const streamedConversationId = streamingConversationIdRef.current;
      streamingConversationIdRef.current = null;

      // Drop the temporary assistant bubble if nothing useful streamed in (e.g.
      // the stream errored before the first chunk), so the UI isn't stuck showing
      // an empty "thinking" reply. Only touch the view if still on this conversation.
      if (selectedConversationIdRef.current === streamedConversationId) {
        setMessages((currentMessages) => {
          const lastMessage = currentMessages[currentMessages.length - 1];
          if (
            lastMessage &&
            lastMessage.type === "bot" &&
            lastMessage.message.trim() === ""
          ) {
            return currentMessages.slice(0, -1);
          }
          return currentMessages;
        });
      }
      isSavingMessageRef.current = false;
      setIsSavingMessage(false);
    }
  }

  // Index of the last bot reply, so only it shows the tutor request action.
  // Note: an in-flight streaming reply is an empty bot bubble rendered as the
  // thinking indicator (not a ChatReply), so the action only appears once a
  // completed, persisted reply exists.
  const lastBotIndex = messages.reduce(
    (last, m, i) => (m.type === "bot" ? i : last),
    -1,
  );

  const isVisible = useOnScreen(lastMessageRef, "-40px");

  // Loads persisted history when the user selects/switches conversation. Keyed
  // on messageResetVersion (bumped on every selection) so re-selecting reloads.
  // While a stream is in flight we skip reloading only the conversation being
  // streamed (which would clobber its optimistic messages); others load normally.
  useEffect(() => {
    if (
      isSavingMessageRef.current &&
      selectedConversationId === streamingConversationIdRef.current
    ) {
      return;
    }

    let ignore = false;

    // Clear immediately so a stale conversation's messages/errors are never
    // shown while the next one loads (or if its load fails).
    setMessages([]);
    setSaveError(null);
    setError(undefined);

    if (!selectedConversationId) {
      setIsLoadingHistory(false);
      return;
    }

    setIsLoadingHistory(true);

    async function loadMessages(conversationId: string) {
      try {
        const history = await getConversationMessages(conversationId);
        if (ignore) return;
        setMessages(history.map(mapTutorMessageToChatMessage));
      } catch (err) {
        if (ignore) return;
        setError(
          err instanceof Error
            ? err.message
            : "Messages could not be loaded. Please try again.",
        );
      } finally {
        // The ignore guard means a superseded load never flips the spinner
        // off for the conversation that replaced it.
        if (!ignore) {
          setIsLoadingHistory(false);
        }
      }
    }

    loadMessages(selectedConversationId);

    return () => {
      ignore = true;
    };
  }, [messageResetVersion, selectedConversationId, setError]);

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
            {isLoadingHistory ? (
              <HistoryLoadingState />
            ) : messages.length === 0 && error === undefined ? (
              <EmptyConversationState />
            ) : (
              messages.map((message, index) => {
                if (message.type === "user") {
                  return (
                    <ChatMessage key={index}>{message.message}</ChatMessage>
                  );
                }
                // An assistant bubble with no content yet is awaiting its first
                // streamed chunk, so show the thinking indicator. Persisted
                // assistant messages always have content, so this only applies
                // to the in-flight streaming reply.
                if (message.message.trim() === "") {
                  return <AssistantThinkingState key={index} />;
                }
                return (
                  <ChatReply
                    key={index}
                    messageId={message.id}
                    initialFavourited={message.favourited}
                    isLast={index === lastBotIndex}
                    conversationId={selectedConversationId}
                  >
                    {message.message}
                  </ChatReply>
                );
              })
            )}
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
