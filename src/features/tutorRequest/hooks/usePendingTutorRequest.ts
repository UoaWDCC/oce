"use client";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/utils/supabase/client";
import type { TutorRequest } from "../types";

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
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/ai-tutor/tutor-requests", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;

      const data = (await res.json().catch(() => null)) as
        | { tutor_requests?: TutorRequest[] }
        | null;

      const pending = (data?.tutor_requests ?? []).some(
        (r) =>
          r.conversation_id === conversationId && r.status === PENDING_STATUS,
      );
      setHasPending(pending);
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
