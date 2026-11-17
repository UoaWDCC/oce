"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

// An opaque lifetime for one authenticated chat session. Invalidate it in the
// auth callback, before React unmounts the previous user's view.
export interface TutorSession {
  userId: string;
  active: boolean;
}

const TutorSessionContext = createContext<TutorSession | null>(null);
export const TutorSessionProvider = TutorSessionContext.Provider;

// Standalone chat previews are siblings of ChatWrapper in the app layout.
// Let them share its existing auth subscription, without another SDK listener.
let currentSession: TutorSession | null = null;
const listeners = new Set<() => void>();
export function publishTutorSession(session: TutorSession | null) {
  currentSession = session;
  for (const listener of listeners) listener();
}
export function releaseTutorSession(session: TutorSession | null) {
  if (currentSession === session) publishTutorSession(null);
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getSnapshot = () => currentSession;
const getServerSnapshot = () => null;
const noSubscribe = () => () => {};

export function useTutorSession() {
  const context = useContext(TutorSessionContext);
  const current = useSyncExternalStore(
    context ? noSubscribe : subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  return context ?? current;
}
