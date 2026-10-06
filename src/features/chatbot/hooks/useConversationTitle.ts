"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useTutorSession } from "../providers/TutorSessionProvider";

const POLL_INTERVAL_MS = 2000;
const OBSERVATION_TIMEOUT_MS = 60000;
const MAX_ATTEMPTS = 30;

// The save response identifies conversations awaiting a title. Observe only
// the relevant row, without resetting sidebar pagination or fetching the list
// on each poll. Switching views/sessions aborts and discards outstanding work.
export function useConversationTitle(
  conversationId: string | null,
  onTitleReady: (conversationId: string) => void,
) {
  const session = useTutorSession();
  const onTitleReadyRef = useRef(onTitleReady);
  onTitleReadyRef.current = onTitleReady;

  useEffect(() => {
    if (!conversationId || !session?.active) return;
    const observedId = conversationId;
    const owner = session;
    const controller = new AbortController();
    let stopped = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      stopped = true;
      clearTimeout(timer);
      clearTimeout(deadline);
      controller.abort();
    };
    const deadline = setTimeout(stop, OBSERVATION_TIMEOUT_MS);

    async function poll() {
      if (stopped || !owner.active) return;
      attempts += 1;
      try {
        const { data, error, status } = await createClient()
          .from("conversations")
          .select("title")
          .eq("id", observedId)
          .eq("user_id", owner.userId)
          .neq("status", "ended")
          .abortSignal(controller.signal)
          .maybeSingle();
        if (stopped || !owner.active) return;
        if (!error && data?.title) {
          onTitleReadyRef.current(observedId);
          stop();
          return;
        }
        if ((!error && !data) || status === 401 || status === 403) {
          stop();
          return;
        }
      } catch {
        // Title observation is best-effort; it must never change send errors.
      }
      if (!stopped && owner.active && attempts < MAX_ATTEMPTS) {
        timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
      } else {
        stop();
      }
    }

    void poll();
    return stop;
  }, [conversationId, session]);
}
