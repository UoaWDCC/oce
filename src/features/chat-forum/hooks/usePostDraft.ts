"use client";

import { useCallback, useEffect, useState } from "react";

export type PostDraft = {
  title: string;
  body: string;
  postType: string;
  anonymous: boolean;
  isPinned: boolean;
  imageUrl?: string; // Stored as reference/URL, NEVER raw File objects
  version: number;
};

const DRAFT_VERSION = 1;
const STORAGE_PREFIX = "forum_post_draft";

function getDraftKey(userId: string, daoGroupId: string): string {
  return `${STORAGE_PREFIX}:${userId}:${daoGroupId}`;
}

export function usePostDraft(userId?: string, daoGroupId?: string) {
  const [draft, setDraft] = useState<PostDraft | null>(null);
  const [loadedStorageKey, setLoadedStorageKey] = useState<
    string | null | undefined
  >(undefined);

  // Unique storage key for the draft based on user and DAO group context
  const storageKey =
    userId && daoGroupId ? getDraftKey(userId, daoGroupId) : null;
  const isLoaded = loadedStorageKey === storageKey;

  useEffect(() => {
    if (!storageKey) {
      setDraft(null);
      setLoadedStorageKey(null);
      return;
    }

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setDraft(null);
        return;
      }

      const parsed = JSON.parse(raw) as Partial<PostDraft>;

      // Graceful validation check for outdated or corrupted drafts
      if (
        parsed.version !== DRAFT_VERSION ||
        typeof parsed.title !== "string" ||
        typeof parsed.body !== "string"
      ) {
        localStorage.removeItem(storageKey);
        setDraft(null);
      } else {
        setDraft({
          title: parsed.title ?? "",
          body: parsed.body ?? "",
          postType: parsed.postType ?? "Discussion",
          anonymous: Boolean(parsed.anonymous),
          isPinned: Boolean(parsed.isPinned),
          imageUrl:
            typeof parsed.imageUrl === "string" ? parsed.imageUrl : undefined,
          version: DRAFT_VERSION,
        });
      }
    } catch {
      // Safe fallback on JSON parsing failure
      localStorage.removeItem(storageKey);
      setDraft(null);
    } finally {
      setLoadedStorageKey(storageKey);
    }
  }, [storageKey]);

  // Persist draft update
  const saveDraft = useCallback(
    (data: Omit<PostDraft, "version">) => {
      if (!storageKey) return;

      const newDraft: PostDraft = {
        ...data,
        version: DRAFT_VERSION,
      };

      try {
        localStorage.setItem(storageKey, JSON.stringify(newDraft));
        setDraft(newDraft);
      } catch (err) {
        console.error("Failed to persist post draft:", err);
      }
    },
    [storageKey],
  );

  // Clear draft upon successful submission or explicit discard
  const clearDraft = useCallback(() => {
    if (!storageKey) return;

    try {
      localStorage.removeItem(storageKey);
      setDraft(null);
    } catch (err) {
      console.error("Failed to clear post draft:", err);
    }
  }, [storageKey]);

  return {
    draft,
    isLoaded,
    saveDraft,
    clearDraft,
  };
}
