"use client";
import { useEffect, useState } from "react";
import { getTutorRequests } from "../api/tutorRequests";

// Mirrors the DB default for tutor_requests.status
export const PENDING_STATUS = "pending";

interface UsePendingTutorRequest {
  hasPending: boolean;
  loading: boolean;
  refresh(): Promise<void>;
}

// Every assistant reply renders this hook and asks for the same list, so one
// fetch is shared between them. Cleared once settled, so a refresh after
// submitting a request still sees fresh data.
let inFlight: Promise<Awaited<ReturnType<typeof getTutorRequests>>> | null =
  null;

function fetchTutorRequestsShared() {
  if (!inFlight) {
    inFlight = getTutorRequests().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

export function usePendingTutorRequest(
  conversationId: string | null,
): UsePendingTutorRequest {
  const [hasPending, setHasPending] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  async function refresh() {
    if (!conversationId) return;
    setLoading(true);
    try {
      const tutorRequests = await fetchTutorRequestsShared();
      const pending = tutorRequests.some(
        (r) =>
          r.conversation_id === conversationId && r.status === PENDING_STATUS,
      );
      setHasPending(pending);
    } catch {
      // Preserve the current state when a refresh fails.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  return { hasPending, loading, refresh };
}
