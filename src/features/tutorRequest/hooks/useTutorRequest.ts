"use client";
import { useState } from "react";
import type { TutorRequest, TutorRequestStatus } from "../types";
import { createTutorRequest } from "../api/tutorRequests";

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
      setTutorRequest(await createTutorRequest(conversationId, trimmed));
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setError(
        error instanceof Error
          ? error.message
          : "Could not send your request. Try again.",
      );
    }
  }

  function reset() {
    setStatus("idle");
    setError(null);
    setTutorRequest(null);
  }

  return { status, error, tutorRequest, submit, reset };
}
