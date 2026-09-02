"use client";

import { useRef, useEffect, useState } from "react";
import { ChatMessageType, TutorMessage } from "@/features/chatbot/types";
import useOnScreen from "@/hooks/useOnScreen";
import { Bot, Maximize2, Minimize2, X } from "lucide-react";
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
import TokenUsageBanner from "../tokenUsageBanner";
import { isTokenLimitReached, useTokenUsage } from "../../hooks/useTokenUsage";
import { ApiError } from "../../utils/apiFetch";
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
    <div className="flex w-full flex-1 items-center justify-center py-8">
      <div
        className="flex items-center gap-2 rounded-xl border border-purple-100 bg-white px-4 py-3 text-sm font-medium text-slate-500 shadow-sm"
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
    <div className="flex w-full flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-[#5e00b2]">
        <Bot aria-hidden="true" className="h-6 w-6" />
      </div>
      <p className="text-base font-semibold text-slate-800">No messages yet</p>
      <p className="mt-1 text-sm text-slate-500">
        Ask a question to get started.
      </p>
    </div>
  );
}

// Left-aligned "thinking" indicator shown in the reply slot after a user
// message is sent but before the first streamed assistant chunk arrives.
function AssistantThinkingState() {
  return (
    <div className="w-fit rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div
        className="flex items-center gap-2"
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
    targetMessageId,
    setTargetMessageId,
    refreshConversationList,
    conversationListVersion,
    messageResetVersion,
    error,
    setError,
  } = useConversation();
  const usage = useTokenUsage(conversationListVersion);
  const isOverLimit = isTokenLimitReached(usage);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSavingMessage, setIsSavingMessage] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [targetedMessageId, setTargetedMessageId] = useState<string | null>(
    null,
  );
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const skipNextLatestScrollRef = useRef(false);
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
    let userMessageSaved = false;

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
      userMessageSaved = true;
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
        // Only the quota response from the save request means the draft was not
        // persisted. Other 429s retain the pre-existing generic error behaviour.
        if (
          !userMessageSaved &&
          error instanceof ApiError &&
          error.status === 429 &&
          error.message === "exceeded daily token limit"
        ) {
          refreshConversationList();
          setSaveError(
            "Your message was not sent. Daily AI Tutor limit reached.",
          );
          setError(undefined);
          throw error;
        }

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
    if (!targetMessageId) {
      if (skipNextLatestScrollRef.current) {
        skipNextLatestScrollRef.current = false;
        return;
      }

      lastMessageRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
      return;
    }

    let frame = 0;
    let attempts = 0;
    let timeout: number | undefined;

    const scrollToTarget = () => {
      const element = document.getElementById(`message-${targetMessageId}`);
      const container = messagesContainerRef.current;
      if (element && container) {
        const containerBounds = container.getBoundingClientRect();
        const elementBounds = element.getBoundingClientRect();
        const targetTop =
          container.scrollTop +
          elementBounds.top -
          containerBounds.top -
          container.clientHeight / 2;

        container.scrollTo({
          top: Math.max(0, targetTop),
          behavior: "smooth",
        });
        setTargetedMessageId(targetMessageId);
        skipNextLatestScrollRef.current = true;
        setTargetMessageId(null);
        timeout = window.setTimeout(() => {
          setTargetedMessageId(null);
        }, 2400);
      }

      attempts += 1;
      if (attempts < 8) {
        frame = requestAnimationFrame(scrollToTarget);
      }
    };

    frame = requestAnimationFrame(scrollToTarget);
    return () => {
      cancelAnimationFrame(frame);
      if (timeout !== undefined) {
        window.clearTimeout(timeout);
      }
    };
  }, [messages, targetMessageId, setTargetMessageId]);
  return (
    <div
      className={`${open ? `` : `hidden`} flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-purple-100 bg-white ${
        openZoomChatBox
          ? `relative h-full w-full shadow-sm`
          : `fixed bottom-5 right-5 z-70 max-h-1/2 min-h-1/3 w-3/5 shadow-lg md:w-2/5 lg:w-1/4`
      }`}
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

      <div className="flex h-16 w-full shrink-0 items-center justify-between border-b border-purple-100 bg-white px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-[#5e00b2]">
            <Bot aria-hidden="true" className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">
              AI Tutor
            </p>
            <p className="truncate text-xs text-slate-500">
              Your learning assistant
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            aria-label={
              openZoomChatBox ? "Minimise chat" : "Open fullscreen chat"
            }
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-purple-50 hover:text-[#5e00b2] active:bg-purple-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5e00b2] focus-visible:ring-offset-2"
            onClick={() => {
              toggleOpenZoomChatBox();
            }}
          >
            {openZoomChatBox ? (
              <Minimize2 aria-hidden="true" className="h-5 w-5" />
            ) : (
              <Maximize2 aria-hidden="true" className="h-5 w-5" />
            )}
          </button>
          <button
            type="button"
            aria-label="Close AI Tutor"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-purple-50 hover:text-[#5e00b2] active:bg-purple-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5e00b2] focus-visible:ring-offset-2"
            onClick={() => {
              if (openZoomChatBox) {
                toggleOpenZoomChatBox();
              }
              toggleOpen();
            }}
          >
            <X aria-hidden="true" className="h-6 w-6" />
          </button>
        </div>
      </div>

      {error !== undefined && (
        <div className="z-10 w-full shrink-0 px-4 pt-4">
          <ErrorMessage message={error} />
        </div>
      )}

      <TokenUsageBanner usage={usage} />

      <div
        ref={messagesContainerRef}
        className="min-h-0 h-full w-full flex-1 overflow-y-auto bg-slate-50/60"
      >
        <div className="relative mx-auto flex min-h-full w-full max-w-4xl flex-col px-4 py-6">
          <div className="flex min-h-full w-full flex-1 flex-col gap-4">
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
                    isTargeted={message.id === targetedMessageId}
                  >
                    {message.message}
                  </ChatReply>
                );
              })
            )}
          </div>
          <div className="h-1" ref={lastMessageRef}></div>
        </div>
      </div>
      <div className="w-full shrink-0 border-t border-slate-200 bg-white pt-3">
        <TextArea
          submitMessage={submitMessage}
          isSubmitting={isSavingMessage}
          errorMessage={saveError}
          disabled={isOverLimit}
          placeholder={isOverLimit ? "Daily AI Tutor limit reached" : undefined}
        />
      </div>
    </div>
  );
}
