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

export function usePendingTutorRequest(
  conversationId: string | null,
): UsePendingTutorRequest {
  const [hasPending, setHasPending] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  async function refresh() {
    if (!conversationId) return;
    setLoading(true);
    try {
      const tutorRequests = await getTutorRequests();
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
