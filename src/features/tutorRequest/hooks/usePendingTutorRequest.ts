"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getTutorRequests } from "../api/tutorRequests";
import {
  useTutorSession,
  type TutorSession,
} from "@/features/chatbot/providers/TutorSessionProvider";

// Mirrors the DB default for tutor_requests.status
export const PENDING_STATUS = "pending";

interface UsePendingTutorRequest {
  hasPending: boolean;
  loading: boolean;
  refresh(): Promise<void>;
}

// Share only unsettled requests belonging to the same authenticated lifetime.
// Explicit refreshes start a new request, even if a pre-submission fetch lingers.
const inFlight = new WeakMap<
  TutorSession,
  Promise<Awaited<ReturnType<typeof getTutorRequests>>>
>();

function fetchTutorRequestsShared(session: TutorSession, fresh: boolean) {
  let request = inFlight.get(session);
  if (!request || fresh) {
    request = getTutorRequests().finally(() => {
      if (inFlight.get(session) === request) inFlight.delete(session);
    });
    inFlight.set(session, request);
  }
  return request;
}

export function usePendingTutorRequest(
  conversationId: string | null,
): UsePendingTutorRequest {
  const [hasPending, setHasPending] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const session = useTutorSession();
  const mountedRef = useRef(false);
  const requestVersionRef = useRef(0);

  const load = useCallback(
    async (fresh: boolean) => {
      if (!conversationId || !session?.active || !mountedRef.current) return;
      const version = ++requestVersionRef.current;
      const isCurrent = () =>
        mountedRef.current &&
        session.active &&
        requestVersionRef.current === version;
      setLoading(true);
      try {
        const tutorRequests = await fetchTutorRequestsShared(session, fresh);
        if (!isCurrent()) return;
        const pending = tutorRequests.some(
          (r) =>
            r.conversation_id === conversationId && r.status === PENDING_STATUS,
        );
        setHasPending(pending);
      } catch {
        // Preserve the current state when a refresh fails.
      } finally {
        if (isCurrent()) setLoading(false);
      }
    },
    [conversationId, session],
  );

  useEffect(() => {
    mountedRef.current = true;
    setHasPending(false);
    setLoading(false);
    void load(false);
    return () => {
      mountedRef.current = false;
      requestVersionRef.current += 1;
    };
  }, [load]);

  return { hasPending, loading, refresh: () => load(true) };
}
