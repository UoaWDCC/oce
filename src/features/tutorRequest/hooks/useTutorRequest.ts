"use client";
import { useState } from "react";
import { getSupabaseClient } from "@/utils/supabase/client";
import type { TutorRequest, TutorRequestStatus } from "../types";

interface SubmitArgs {
  conversationId: string;
  question: string;
}

interface UseTutorRequest {
  status: TutorRequestStatus;
  error: string | null;
  tutorRequest: TutorRequest | null;
  submit(args: SubmitArgs): Promise<void>;
  reset(): void;
}

export function useTutorRequest(): UseTutorRequest {
  const [status, setStatus] = useState<TutorRequestStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [tutorRequest, setTutorRequest] = useState<TutorRequest | null>(null);

  async function submit({ conversationId, question }: SubmitArgs) {
    const trimmed = question.trim();
    if (!trimmed) {
      setStatus("error");
      setError("Enter a question before sending.");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setStatus("error");
        setError("You need to be signed in to request a tutor.");
        return;
      }

      const res = await fetch("/api/ai-tutor/tutor-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          question: trimmed,
        }),
      });

      const data = (await res.json().catch(() => null)) as {
        tutor_request?: TutorRequest;
        error?: string;
      } | null;

      if (!res.ok) {
        setStatus("error");
        setError(data?.error ?? "Could not send your request. Try again.");
        return;
      }

      setTutorRequest(data?.tutor_request ?? null);
      setStatus("success");
    } catch {
      setStatus("error");
      setError("Could not reach the server. Check your connection and retry.");
    }
  }

  function reset() {
    setStatus("idle");
    setError(null);
    setTutorRequest(null);
  }

  return { status, error, tutorRequest, submit, reset };
}
