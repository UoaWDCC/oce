"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  normalizePageContextPath,
  type PageContextRequest,
} from "@/features/chatbot/pageContext";
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
  AssistantStreamError,
} from "@/features/chatbot/api/conversations";
import ErrorMessage from "../errorMessage";
import TokenUsageBanner from "../tokenUsageBanner";
import { isTokenLimitReached, useTokenUsage } from "../../hooks/useTokenUsage";
import { ApiError } from "../../utils/apiFetch";
import type { Message } from "@/llm/types/Message";
import {
  mergeChatMessages,
  type LocalAssistantTurn,
} from "../../utils/mergeChatMessages";

const MESSAGES_PAGE_SIZE = 15;
const NO_DISCARDED_CONVERSATIONS: string[] = [];
type RequestPhase = "idle" | "waiting" | "streaming";
interface RetainedAssistantTurn extends LocalAssistantTurn {
  visibleGeneration: number;
}

function mapTutorMessageToChatMessage(message: TutorMessage): ChatMessageType {
  return {
    type: message.role === "user" ? "user" : "bot",
    message: message.content,
    id: message.id,
    favourited: message.is_favourite,
    conversationId: message.conversation_id,
    createdAt: message.created_at,
    ...(message.role === "assistant" && {
      responseStatus: "persisted" as const,
    }),
  };
}

function mapChatMessagesToLLMMessages(messages: ChatMessageType[]): Message[] {
  return messages
    .filter((message) => message.message.trim() !== "")
    .map((message) => ({
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

function AssistantRequestState({
  phase,
}: {
  phase: Exclude<RequestPhase, "idle">;
}) {
  const label =
    phase === "waiting" ? "Waiting for response" : "Generating response";

  return (
    <div
      className="flex items-center gap-2 px-4 pb-2 text-xs text-slate-500"
      role="status"
      aria-label={label}
    >
      <span className="flex gap-1" aria-hidden="true">
        <span
          className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
          style={{ animationDelay: "-0.3s" }}
        />
        <span
          className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
          style={{ animationDelay: "-0.15s" }}
        />
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
      </span>
      <span>{label}</span>
    </div>
  );
}

export default function ChatFullscreen() {
  const pathname = usePathname();
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
    discardedConversationIds = NO_DISCARDED_CONVERSATIONS,
    error,
    setError,
  } = useConversation();
  const usage = useTokenUsage(conversationListVersion);
  const isOverLimit = isTokenLimitReached(usage);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [requestPhase, setRequestPhase] = useState<RequestPhase>("idle");
  const isSavingMessage = requestPhase !== "idle";
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [targetedMessageId, setTargetedMessageId] = useState<string | null>(
    null,
  );
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const skipNextLatestScrollRef = useRef(false);
  const isSavingMessageRef = useRef(false);
  const isLoadingOlderRef = useRef(false);
  // Set while older messages are being prepended, so the scroll-to-latest
  // effect doesn't pull the user away from what they were reading.
  const isPrependingRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const lastAutoFillOffsetRef = useRef<number | null>(null);
  const loadedConversationIdRef = useRef<string | null>(null);
  const historyGenerationRef = useRef(0);
  const lastMessageResetVersionRef = useRef(messageResetVersion);
  const nextMessagesOffsetRef = useRef(0);
  const lastRequestedOffsetRef = useRef<number | null>(null);
  // Mirrors the currently selected conversation so async stream callbacks can
  // tell whether the user has switched away since the send started.
  const selectedConversationIdRef = useRef(selectedConversationId);
  // The conversation a stream is actively writing into (null when idle).
  const streamingConversationIdRef = useRef<string | null>(null);
  const newlyCreatedConversationIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(false);
  const localTurnsRef = useRef(
    new Map<string, Map<string, RetainedAssistantTurn>>(),
  );
  const loadedPersistedIdsRef = useRef(new Set<string>());
  const nextClientIdRef = useRef(0);
  const discardedIdsRef = useRef(new Set<string>());
  // Snapshot local turns before a state updater, then retire entries confirmed
  // by database identity. The updater itself stays pure under StrictMode.
  const localTurnsForMerge = useCallback(
    (conversationId: string, incoming: ChatMessageType[]) => {
      const retained = localTurnsRef.current.get(conversationId);
      const turns = [...(retained?.values() ?? [])];
      const persistedIds = new Set(incoming.map(({ id }) => id));
      for (const turn of turns) {
        if (
          turn.response.message.trim() ||
          turn.response.responseStatus !== "streaming" ||
          persistedIds.has(turn.question.id)
        ) {
          // Only an accepted history merge can restore a retained response to
          // this view's generation; later updates still target its client ID.
          turn.visibleGeneration = historyGenerationRef.current;
        }
        if (turn.response.id && persistedIds.has(turn.response.id)) {
          retained?.delete(turn.response.clientId!);
        }
      }
      return turns;
    },
    [],
  );
  const settledHistoryRef = useRef({
    conversationId: null as string | null,
    resetVersion: messageResetVersion,
  });
  // Include the selection/reset identity so controls are blocked even before
  // the history effect runs. Failed loads settle too, preserving retry behaviour.
  const isInitialHistoryPending =
    selectedConversationId !== null &&
    (isLoadingHistory ||
      settledHistoryRef.current.conversationId !== selectedConversationId ||
      settledHistoryRef.current.resetVersion !== messageResetVersion);

  useEffect(() => {
    isMountedRef.current = true;
    const localTurns = localTurnsRef.current;
    return () => {
      isMountedRef.current = false;
      localTurns.clear();
    };
  }, []);

  useEffect(() => {
    for (const id of discardedConversationIds) {
      if (!discardedIdsRef.current.has(id)) {
        localTurnsRef.current.delete(id);
        if (selectedConversationIdRef.current === id) setMessages([]);
      }
    }
    discardedIdsRef.current = new Set(discardedConversationIds);
  }, [discardedConversationIds]);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  async function submitMessage(content: string) {
    if (
      !isMountedRef.current ||
      isSavingMessageRef.current ||
      isInitialHistoryPending ||
      isOverLimit
    ) {
      return;
    }

    const normalizedPath = pathname
      ? normalizePageContextPath(pathname)
      : undefined;
    const pageContext: PageContextRequest | undefined =
      normalizedPath?.status === "normalized"
        ? { path: normalizedPath.path }
        : undefined;

    isSavingMessageRef.current = true;
    setRequestPhase("waiting");
    setSaveError(null);
    setError(undefined);
    let userMessageSaved = false;
    let streamConversationId: string | null = null;
    let streamHistoryGeneration = historyGenerationRef.current;
    const clientId = `response-${++nextClientIdRef.current}`;
    const discardedAtSubmission = new Set(discardedIdsRef.current);
    const persistedInsertions = new Set<string>();
    const isCurrentStreamView = () =>
      isMountedRef.current &&
      streamConversationId !== null &&
      discardedIdsRef.current.has(streamConversationId) ===
        discardedAtSubmission.has(streamConversationId) &&
      selectedConversationIdRef.current === streamConversationId &&
      historyGenerationRef.current === streamHistoryGeneration;
    const getLocalTurn = () =>
      streamConversationId
        ? localTurnsRef.current.get(streamConversationId)?.get(clientId)
        : undefined;
    const isCurrentResponseView = () =>
      isCurrentStreamView() ||
      (isMountedRef.current &&
        streamConversationId !== null &&
        discardedIdsRef.current.has(streamConversationId) ===
          discardedAtSubmission.has(streamConversationId) &&
        selectedConversationIdRef.current === streamConversationId &&
        getLocalTurn()?.visibleGeneration === historyGenerationRef.current);
    const updateLocalResponse = (patch: Partial<ChatMessageType>) => {
      if (!isMountedRef.current) return;
      const turn = getLocalTurn();
      if (!turn) return;
      const response = { ...turn.response, ...patch };
      turn.response = response;
      if (isCurrentResponseView()) {
        setMessages((current) =>
          current.map((message) =>
            message.clientId === clientId ? response : message,
          ),
        );
      }
    };
    const notePersistedInsertion = (id: string) => {
      if (persistedInsertions.has(id)) return;
      persistedInsertions.add(id);
      if (!isCurrentResponseView()) return;
      if (loadedPersistedIdsRef.current.has(id)) return;
      loadedPersistedIdsRef.current.add(id);
      // New rows shift newest-first offsets. Invalidate older requests made
      // against the previous boundary, keeping already loaded history intact.
      historyGenerationRef.current += 1;
      streamHistoryGeneration = historyGenerationRef.current;
      const turn = getLocalTurn();
      if (turn) turn.visibleGeneration = historyGenerationRef.current;
      nextMessagesOffsetRef.current += 1;
      lastRequestedOffsetRef.current = null;
      lastAutoFillOffsetRef.current = null;
      isLoadingOlderRef.current = false;
      setIsLoadingOlder(false);
    };

    try {
      let conversationId = selectedConversationId;

      if (!conversationId) {
        const newConversation = await createConversation();
        conversationId = newConversation.id;
        if (isMountedRef.current) {
          newlyCreatedConversationIdRef.current = conversationId;
          setSelectedConversationId(conversationId);
          selectedConversationIdRef.current = conversationId;
          refreshConversationList();
        }
      }

      // Record which conversation this stream targets. The history-load effect
      // skips reloading this id while saving so it doesn't clobber the
      // optimistic/streamed messages; a switch to a *different* id still loads.
      streamingConversationIdRef.current = conversationId;
      streamConversationId = conversationId;
      streamHistoryGeneration = historyGenerationRef.current;

      const savedMessage = await saveUserMessage(conversationId, content);
      userMessageSaved = true;
      const userMessage = mapTutorMessageToChatMessage(savedMessage);
      const assistantMessage: ChatMessageType = {
        type: "bot",
        message: "",
        favourited: false,
        clientId,
        conversationId,
        createdAt: savedMessage.created_at,
        responseStatus: "streaming",
      };

      const messagesForStream = [...messages, userMessage];

      if (
        isMountedRef.current &&
        discardedIdsRef.current.has(conversationId) ===
          discardedAtSubmission.has(conversationId)
      ) {
        const turns = localTurnsRef.current.get(conversationId) ?? new Map();
        turns.set(clientId, {
          question: userMessage,
          response: assistantMessage,
          visibleGeneration: streamHistoryGeneration,
        });
        localTurnsRef.current.set(conversationId, turns);
      }
      notePersistedInsertion(savedMessage.id);

      if (isCurrentStreamView()) {
        setMessages((currentMessages) => [
          ...currentMessages,
          userMessage,
          assistantMessage,
        ]);
      }
      if (isMountedRef.current) {
        refreshConversationList();
      }

      await streamAssistantMessage(
        conversationId,
        mapChatMessagesToLLMMessages(messagesForStream),
        {
          onText: (text) => {
            if (!isMountedRef.current) return;
            if (text.trim() !== "") {
              setRequestPhase("streaming");
            }
            // Retain all text for this response's identity. Only the originating
            // visible history generation is updated by updateLocalResponse.
            const turn = getLocalTurn();
            if (turn) {
              updateLocalResponse({
                message: `${turn.response.message}${text}`,
              });
            }
          },
          onMessageId: (id) => {
            if (!isMountedRef.current || !getLocalTurn()) return;
            // Correlate the originating response even after navigation, without
            // changing another conversation's visible messages or errors.
            notePersistedInsertion(id);
            updateLocalResponse({ id, favourited: false });
            if (isCurrentResponseView()) refreshConversationList();
          },
        },
        pageContext,
      );

      const turn = getLocalTurn();
      if (turn?.response.message.trim() && !turn.response.id) {
        throw new AssistantStreamError(
          "persistence_failed",
          "The response could not be saved.",
        );
      }
      if (turn && !turn.response.message.trim()) {
        localTurnsRef.current.get(conversationId)?.delete(clientId);
        if (isCurrentStreamView()) {
          setMessages((current) =>
            current.filter((message) => message.clientId !== clientId),
          );
        }
      } else {
        updateLocalResponse({ responseStatus: "persisted" });
      }

      // Reconcile the streamed reply with persisted data so it carries the
      // authoritative id/is_favourite for favourites & tutor-request flows.
      // Best-effort — the streamed text + onMessageId id already work if this
      // fails. Skipped after a mid-stream switch so we don't overwrite the new view.
      if (isCurrentResponseView()) {
        const reconciliationGeneration = historyGenerationRef.current;
        try {
          const page = await getConversationMessages(conversationId, {
            limit: MESSAGES_PAGE_SIZE,
          });
          if (
            isCurrentResponseView() &&
            historyGenerationRef.current === reconciliationGeneration
          ) {
            const hadLoadedHistory =
              loadedConversationIdRef.current === conversationId;
            const incoming = page.messages.map(mapTutorMessageToChatMessage);
            for (const { id } of incoming) {
              if (id) loadedPersistedIdsRef.current.add(id);
            }
            const turns = localTurnsForMerge(conversationId, incoming);
            historyGenerationRef.current += 1;
            isLoadingOlderRef.current = false;
            setIsLoadingOlder(false);
            nextMessagesOffsetRef.current = Math.max(
              nextMessagesOffsetRef.current,
              page.nextOffset,
            );
            lastRequestedOffsetRef.current = null;
            lastAutoFillOffsetRef.current = null;
            loadedConversationIdRef.current = conversationId;
            setMessages((current) =>
              mergeChatMessages(current, incoming, turns),
            );
            if (!hadLoadedHistory) setHasOlderMessages(page.hasMore);
          }
        } catch {
          // Keep the streamed reply; it already holds the persisted message id.
        }
      }
    } catch (error) {
      const persistenceFailed =
        error instanceof AssistantStreamError &&
        error.code === "persistence_failed";
      if (userMessageSaved) {
        updateLocalResponse({
          responseStatus: persistenceFailed ? "unsaved" : "incomplete",
        });
      }
      // Only surface the failure if the user is still on the conversation that
      // was streaming; a stream that failed after they switched away must not
      // show its error in the now-selected conversation. (streamingConversationIdRef
      // still holds the target here — it is cleared in finally, which runs after.)
      if (
        isMountedRef.current &&
        selectedConversationIdRef.current ===
          streamingConversationIdRef.current &&
        (streamConversationId === null || isCurrentResponseView())
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

        const message = userMessageSaved
          ? persistenceFailed
            ? "Your question was saved. The response was generated, but could not be saved. It is kept in this session."
            : getLocalTurn()?.response.message.trim()
              ? "Your question was saved, but the response was interrupted. The partial response is kept in this session."
              : "Your question was saved, but a response could not be generated. You can ask a new question."
          : error instanceof Error
            ? error.message
            : "Message could not be saved. Please try again.";
        setSaveError(message);
        setError(message);
        // Only unsaved questions restore their draft; answer failures must not
        // encourage saving the same question again.
        if (!userMessageSaved) throw error;
        return;
      }

      // This stream failed/cancelled after the user switched away. Swallow the
      // error so the now-selected conversation stays clean and the input clears;
      // Its retained response is scoped to the originating conversation.
      console.error(
        "AI Tutor stream failed for a background conversation:",
        error,
      );
    } finally {
      streamingConversationIdRef.current = null;

      // Drop the temporary assistant bubble if nothing useful streamed in (e.g.
      // the stream errored before the first chunk), so the UI isn't stuck showing
      // an empty "thinking" reply. Only touch the view if still on this conversation.
      const turn = getLocalTurn();
      if (turn && !turn.response.message.trim()) {
        if (turn.response.responseStatus === "persisted") {
          localTurnsRef.current.get(streamConversationId!)?.delete(clientId);
        }
        if (isCurrentStreamView()) {
          setMessages((current) =>
            current.filter((message) => message.clientId !== clientId),
          );
        }
      }
      isSavingMessageRef.current = false;
      if (isMountedRef.current) {
        setRequestPhase("idle");
      }
    }
  }

  // Index of the last bot reply, so only it shows the tutor request action.
  // Empty in-flight replies are hidden while the shared request status is shown.
  const lastBotIndex = messages.reduce(
    (last, m, i) => (m.type === "bot" ? i : last),
    -1,
  );

  const isVisible = useOnScreen(lastMessageRef, "-40px");

  // Loads persisted history when the user selects/switches conversation. Keyed
  // on messageResetVersion (bumped on every selection) so re-selecting reloads.
  // A newly created conversation has no history to load while its first message
  // is saving. Returning to an existing conversation still reloads its history.
  useEffect(() => {
    const isRefresh =
      lastMessageResetVersionRef.current !== messageResetVersion;
    lastMessageResetVersionRef.current = messageResetVersion;
    if (
      isSavingMessageRef.current &&
      selectedConversationId === streamingConversationIdRef.current &&
      selectedConversationId === newlyCreatedConversationIdRef.current &&
      !isRefresh
    ) {
      newlyCreatedConversationIdRef.current = null;
      settledHistoryRef.current = {
        conversationId: selectedConversationId,
        resetVersion: messageResetVersion,
      };
      return;
    }

    let ignore = false;
    historyGenerationRef.current += 1;
    isLoadingOlderRef.current = false;
    setIsLoadingOlder(false);
    nextMessagesOffsetRef.current = 0;
    lastRequestedOffsetRef.current = null;
    isPrependingRef.current = false;
    skipNextLatestScrollRef.current = false;

    // Clear immediately so a stale conversation's messages/errors are never
    // shown while the next one loads (or if its load fails).
    setMessages([]);
    setSaveError(null);
    setError(undefined);
    setHasOlderMessages(false);
    setTargetedMessageId(null);
    lastScrollTopRef.current = 0;
    lastAutoFillOffsetRef.current = null;
    loadedConversationIdRef.current = null;
    loadedPersistedIdsRef.current.clear();

    if (!selectedConversationId) {
      setIsLoadingHistory(false);
      return;
    }

    setIsLoadingHistory(true);

    async function loadMessages(conversationId: string) {
      try {
        const page = await getConversationMessages(conversationId, {
          limit: MESSAGES_PAGE_SIZE,
        });
        if (ignore) return;
        const incoming = page.messages.map(mapTutorMessageToChatMessage);
        loadedPersistedIdsRef.current = new Set(
          incoming.flatMap(({ id }) => (id ? [id] : [])),
        );
        const turns = localTurnsForMerge(conversationId, incoming);
        loadedConversationIdRef.current = conversationId;
        nextMessagesOffsetRef.current = page.nextOffset;
        setMessages(mergeChatMessages([], incoming, turns));
        setHasOlderMessages(page.hasMore);
      } catch (err) {
        if (ignore) return;
        const turns = localTurnsForMerge(conversationId, []);
        setMessages(mergeChatMessages([], [], turns));
        setError(
          err instanceof Error
            ? err.message
            : "Messages could not be loaded. Please try again.",
        );
      } finally {
        // The ignore guard means a superseded load never flips the spinner
        // off for the conversation that replaced it.
        if (!ignore) {
          settledHistoryRef.current = {
            conversationId,
            resetVersion: messageResetVersion,
          };
          setIsLoadingHistory(false);
        }
      }
    }

    loadMessages(selectedConversationId);

    return () => {
      ignore = true;
    };
  }, [
    messageResetVersion,
    selectedConversationId,
    setError,
    localTurnsForMerge,
  ]);

  async function loadOlderMessages() {
    const conversationId = selectedConversationIdRef.current;
    const generation = historyGenerationRef.current;
    const offset = nextMessagesOffsetRef.current;
    if (
      !conversationId ||
      loadedConversationIdRef.current !== conversationId ||
      isLoadingOlderRef.current ||
      !hasOlderMessages ||
      lastRequestedOffsetRef.current === offset
    ) {
      return;
    }

    lastRequestedOffsetRef.current = offset;
    isLoadingOlderRef.current = true;
    setIsLoadingOlder(true);

    const container = messagesContainerRef.current;
    const previousScrollHeight = container?.scrollHeight ?? 0;
    const previousScrollTop = container?.scrollTop ?? 0;

    try {
      const page = await getConversationMessages(conversationId, {
        limit: MESSAGES_PAGE_SIZE,
        offset,
      });

      if (
        selectedConversationIdRef.current !== conversationId ||
        historyGenerationRef.current !== generation
      )
        return;

      const older = page.messages.map(mapTutorMessageToChatMessage);
      for (const { id } of older) {
        if (id) loadedPersistedIdsRef.current.add(id);
      }
      const turns = localTurnsForMerge(conversationId, older);
      isPrependingRef.current = true;
      setMessages((currentMessages) =>
        mergeChatMessages(currentMessages, older, turns),
      );
      nextMessagesOffsetRef.current = page.nextOffset;
      setHasOlderMessages(page.hasMore);

      // Prepending grows the scroll height, so shift scrollTop by the same
      // amount to leave the reading position where it was.
      requestAnimationFrame(() => {
        if (historyGenerationRef.current !== generation) return;
        if (targetMessageId) return;
        const element = messagesContainerRef.current;
        if (!element) return;
        element.scrollTop =
          previousScrollTop + (element.scrollHeight - previousScrollHeight);
      });
    } catch {
      // Stop paging so a failing request isn't retried on every scroll.
      if (historyGenerationRef.current === generation) {
        setHasOlderMessages(false);
      }
    } finally {
      if (historyGenerationRef.current === generation) {
        isLoadingOlderRef.current = false;
        setIsLoadingOlder(false);
      }
    }
  }

  // A short page may not create a scrollbar, leaving no upward scroll event
  // that could request the rest of the history. Measure only after the loading
  // indicator has gone away, since its height is not message content.
  useEffect(() => {
    const container = messagesContainerRef.current;
    const offset = nextMessagesOffsetRef.current;
    if (
      !container ||
      isLoadingHistory ||
      isLoadingOlder ||
      !hasOlderMessages ||
      loadedConversationIdRef.current !== selectedConversationId ||
      offset === 0 ||
      container.scrollHeight > container.clientHeight ||
      lastAutoFillOffsetRef.current === offset
    ) {
      return;
    }

    lastAutoFillOffsetRef.current = offset;
    void loadOlderMessages();
  });

  // Only an upward scroll loads older messages. The chat opens by scrolling
  // down to the newest message, which would otherwise pass the top of the
  // container and trigger a load before the user has done anything.
  function handleMessagesScroll(event: React.UIEvent<HTMLDivElement>) {
    const { scrollTop } = event.currentTarget;
    const movedUp = scrollTop < lastScrollTopRef.current;
    lastScrollTopRef.current = scrollTop;

    if (movedUp && scrollTop < 120) {
      loadOlderMessages();
    }
  }

  // A saved message may be outside the first page of its conversation.
  useEffect(() => {
    if (
      targetMessageId &&
      !document.getElementById(`message-${targetMessageId}`) &&
      hasOlderMessages &&
      loadedConversationIdRef.current === selectedConversationId
    ) {
      void loadOlderMessages();
    }
  });

  useEffect(() => {
    if (!targetMessageId) {
      if (isPrependingRef.current) {
        isPrependingRef.current = false;
        return;
      }
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
      }

      attempts += 1;
      if (attempts < 8) {
        frame = requestAnimationFrame(scrollToTarget);
      }
    };

    frame = requestAnimationFrame(scrollToTarget);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [messages, targetMessageId, setTargetMessageId]);

  useEffect(() => {
    if (!targetedMessageId) return;

    const timeout = window.setTimeout(() => {
      setTargetedMessageId(null);
    }, 2400);

    return () => window.clearTimeout(timeout);
  }, [targetedMessageId]);

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
        onScroll={handleMessagesScroll}
        className="min-h-0 h-full w-full flex-1 overflow-y-auto bg-slate-50/60"
      >
        <div className="relative mx-auto flex min-h-full w-full max-w-4xl flex-col px-4 py-6">
          <div className="flex min-h-full w-full flex-1 flex-col gap-4">
            {isLoadingOlder && (
              <p className="py-1 text-center text-xs text-slate-500">
                Loading earlier messages...
              </p>
            )}
            {isLoadingHistory ? (
              <HistoryLoadingState />
            ) : messages.length === 0 &&
              error === undefined &&
              !isSavingMessage ? (
              <EmptyConversationState />
            ) : (
              messages.map((message, index) => {
                const messageKey =
                  message.clientId ?? message.id ?? `pending-${index}`;

                if (message.type === "user") {
                  return (
                    <ChatMessage key={messageKey}>
                      {message.message}
                    </ChatMessage>
                  );
                }
                const failureNotice =
                  message.responseStatus === "incomplete"
                    ? "Response incomplete"
                    : message.responseStatus === "unsaved"
                      ? "Response could not be saved"
                      : null;
                if (!message.message.trim() && !failureNotice) return null;
                return (
                  <div key={messageKey}>
                    {message.message.trim() !== "" && (
                      <ChatReply
                        messageId={message.id}
                        initialFavourited={message.favourited}
                        isLast={index === lastBotIndex}
                        conversationId={selectedConversationId}
                        isTargeted={message.id === targetedMessageId}
                      >
                        {message.message}
                      </ChatReply>
                    )}
                    {failureNotice && (
                      <p className="mt-2 text-xs text-red-600">
                        {failureNotice}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div className="h-1" ref={lastMessageRef}></div>
        </div>
      </div>
      <div className="w-full shrink-0 border-t border-slate-200 bg-white pt-3">
        {requestPhase !== "idle" && (
          <AssistantRequestState phase={requestPhase} />
        )}
        <TextArea
          submitMessage={submitMessage}
          isSubmitting={isSavingMessage}
          errorMessage={saveError}
          disabled={isOverLimit || isInitialHistoryPending}
          placeholder={isOverLimit ? "Daily AI Tutor limit reached" : undefined}
        />
      </div>
    </div>
  );
}
