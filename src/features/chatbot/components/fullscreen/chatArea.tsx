"use client";
import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { useChatModal } from "@/features/chatbot/providers/ChatBoxModalProvider";
import {
  CHAT_VIEWPORT_GUTTER,
  COMPACT_CHAT_MIN_WIDTH,
  useFloatingPanelLayout,
} from "@/context/FloatingPanelLayoutProvider";
import { useFullscreenChatAccessibility } from "../../hooks/useFullscreenChatAccessibility";
import ChatFullscreen from "./chatFullscreen";
import ConversationsList from "./conversationsList";

export default function ChatArea() {
  const {
    open,
    openZoomChatBox,
    toggleOpen,
    toggleOpenZoomChatBox,
    launcherRef,
  } = useChatModal();
  const { learningPanelWidth } = useFloatingPanelLayout();
  const [viewportWidth, setViewportWidth] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const sidebarCloseRef = useRef<HTMLButtonElement>(null);
  const sidebarToggleRef = useRef<HTMLButtonElement>(null);
  const wasSidebarOpenRef = useRef(false);
  const sidebarId = useId();
  const isDesktop = viewportWidth >= 1024;
  const fullscreenActive = open && openZoomChatBox;
  const drawerOpen = fullscreenActive && !isDesktop && sidebarOpen;
  const sidebarVisible = fullscreenActive && (isDesktop || sidebarOpen);
  const compactHidden =
    !openZoomChatBox &&
    learningPanelWidth > 0 &&
    viewportWidth - learningPanelWidth <
      COMPACT_CHAT_MIN_WIDTH + CHAT_VIEWPORT_GUTTER * 2;

  useEffect(() => {
    const measure = () => setViewportWidth(window.innerWidth);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (!fullscreenActive || isDesktop) setSidebarOpen(false);
  }, [fullscreenActive, isDesktop]);

  useEffect(() => {
    if (
      open &&
      compactHidden &&
      rootRef.current?.contains(document.activeElement)
    ) {
      launcherRef?.current?.focus({ preventScroll: true });
    }
  }, [open, compactHidden, launcherRef]);

  useEffect(() => {
    if (drawerOpen) sidebarCloseRef.current?.focus();
    else if (wasSidebarOpenRef.current && fullscreenActive)
      sidebarToggleRef.current?.focus();
    wasSidebarOpenRef.current = drawerOpen;
  }, [drawerOpen, fullscreenActive]);

  // Move focus out of desktop navigation when it becomes a collapsed drawer.
  useEffect(() => {
    if (
      !sidebarVisible &&
      fullscreenActive &&
      sidebarRef.current?.contains(document.activeElement)
    ) {
      sidebarToggleRef.current?.focus();
    }
  }, [sidebarVisible, fullscreenActive]);

  useFullscreenChatAccessibility({
    active: fullscreenActive,
    rootRef,
    returnFocusRef: launcherRef,
    onEscape: () => {
      if (drawerOpen) {
        setSidebarOpen(false);
        return;
      }
      toggleOpenZoomChatBox();
      toggleOpen();
    },
  });

  return (
    <div
      id="ai-tutor"
      ref={rootRef}
      role={fullscreenActive ? "dialog" : undefined}
      aria-modal={fullscreenActive ? true : undefined}
      aria-label={fullscreenActive ? "AI Tutor" : undefined}
      tabIndex={fullscreenActive ? -1 : undefined}
      className={`${openZoomChatBox ? "fixed inset-0 h-dvh w-full z-100 bg-slate-50 outline-none" : ""} ${!open || compactHidden ? "hidden" : !openZoomChatBox ? "contents" : ""}`}
    >
      <div
        className={
          openZoomChatBox
            ? "flex h-full min-h-0 w-full p-2 sm:p-4 lg:p-5"
            : "contents"
        }
      >
        <div
          className={
            openZoomChatBox
              ? "relative grid h-full min-h-0 w-full grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[260px_minmax(0,1fr)]"
              : "contents"
          }
        >
          {drawerOpen && (
            <div
              className="absolute inset-0 z-20 rounded-2xl bg-slate-950/30"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}
          <aside
            id={sidebarId}
            ref={sidebarRef}
            aria-label="Conversations"
            hidden={!sidebarVisible}
            inert={!sidebarVisible}
            className={
              sidebarVisible
                ? "absolute inset-y-0 left-0 z-30 flex min-h-0 w-[min(20rem,calc(100%-3rem))] flex-col gap-2 rounded-2xl bg-slate-50 p-2 shadow-xl lg:static lg:z-auto lg:w-auto lg:p-0 lg:shadow-none"
                : "hidden"
            }
            onKeyDown={(event) => {
              if (
                drawerOpen &&
                event.key === "Escape" &&
                !event.defaultPrevented
              ) {
                event.preventDefault();
                event.stopPropagation();
                setSidebarOpen(false);
              }
            }}
          >
            <div className="flex shrink-0 items-center justify-between px-2 py-1 lg:hidden">
              <p className="text-sm font-semibold text-slate-900">
                Conversations
              </p>
              <button
                ref={sidebarCloseRef}
                type="button"
                aria-label="Close conversations panel"
                onClick={() => setSidebarOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-purple-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              {openZoomChatBox && (
                <ConversationsList
                  onNavigate={() => {
                    if (!isDesktop) setSidebarOpen(false);
                  }}
                />
              )}
            </div>
          </aside>
          {/* Keep the chat and transcript at the same tree position in every layout. */}
          <div
            className={openZoomChatBox ? "min-h-0 min-w-0" : "contents"}
            inert={drawerOpen}
            aria-hidden={drawerOpen ? true : undefined}
          >
            <ChatFullscreen
              sidebarId={sidebarId}
              sidebarOpen={drawerOpen}
              sidebarToggleRef={sidebarToggleRef}
              onToggleSidebar={() => setSidebarOpen((value) => !value)}
              compactStyle={
                learningPanelWidth > 0
                  ? {
                      right: learningPanelWidth + CHAT_VIEWPORT_GUTTER,
                      maxWidth: Math.max(
                        0,
                        viewportWidth -
                          learningPanelWidth -
                          CHAT_VIEWPORT_GUTTER * 2,
                      ),
                    }
                  : undefined
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
