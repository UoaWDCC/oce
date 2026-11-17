"use client";
import { useChatModal } from "@/features/chatbot/providers/ChatBoxModalProvider";
import { Bot } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import {
  CHAT_VIEWPORT_GUTTER,
  COMPACT_CHAT_MIN_WIDTH,
  useFloatingPanelLayout,
} from "@/context/FloatingPanelLayoutProvider";

interface ChatButtonProps {
  compact?: boolean;
  expandOnOpen?: boolean;
}

export default function ChatButton({
  compact = false,
  expandOnOpen = false,
}: ChatButtonProps): ReactNode {
  const {
    open,
    toggleOpen,
    openZoomChatBox,
    toggleOpenZoomChatBox,
    launcherRef,
  } = useChatModal();
  const { learningPanelWidth } = useFloatingPanelLayout();
  const [viewportWidth, setViewportWidth] = useState<number | null>(null);

  useEffect(() => {
    if (!expandOnOpen) return;
    const updateWidth = () => setViewportWidth(window.innerWidth);
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [expandOnOpen]);

  const needsFullscreen =
    expandOnOpen &&
    viewportWidth !== null &&
    viewportWidth - learningPanelWidth <
      COMPACT_CHAT_MIN_WIDTH + CHAT_VIEWPORT_GUTTER * 2;
  const isVisible = open && !(needsFullscreen && !openZoomChatBox);

  return (
    <div className={compact ? undefined : "p-5"}>
      <button
        ref={launcherRef}
        type="button"
        onClick={() => {
          if (needsFullscreen && !openZoomChatBox) {
            toggleOpenZoomChatBox();
            if (!open) toggleOpen();
            return;
          }
          toggleOpen();
        }}
        aria-label={isVisible ? "Close AI Tutor" : "Open AI Tutor"}
        aria-pressed={isVisible}
        aria-expanded={isVisible}
        aria-controls="ai-tutor"
        className={`inline-flex items-center justify-center border border-purple-200 bg-white text-[#5e00b2] transition-all duration-200 hover:-translate-y-0.5 hover:border-purple-300 hover:bg-purple-50 active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5e00b2] focus-visible:ring-offset-2 ${
          compact
            ? "h-11 gap-2 rounded-xl px-3 text-sm font-semibold shadow-sm"
            : "h-14 w-14 rounded-full shadow-lg hover:shadow-xl"
        }`}
      >
        <Bot aria-hidden="true" className={compact ? "h-5 w-5" : "h-7 w-7"} />
        {compact && <span>AI Tutor</span>}
      </button>
    </div>
  );
}
