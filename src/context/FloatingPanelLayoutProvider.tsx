"use client";

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export const COMPACT_CHAT_MIN_WIDTH = 280;
export const CHAT_VIEWPORT_GUTTER = 20;

interface FloatingPanelLayout {
  learningPanelWidth: number;
  launcherTarget: HTMLElement | null;
}

interface RegisteredPanel {
  width: number;
  launcher: HTMLElement;
}

interface FloatingPanelLayoutContextValue extends FloatingPanelLayout {
  registerPanel: (id: string, panel: RegisteredPanel) => void;
  unregisterPanel: (id: string) => void;
}

const EMPTY_LAYOUT: FloatingPanelLayout = {
  learningPanelWidth: 0,
  launcherTarget: null,
};

const FloatingPanelLayoutContext =
  createContext<FloatingPanelLayoutContextValue | null>(null);

export function FloatingPanelLayoutProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [panels, setPanels] = useState(new Map<string, RegisteredPanel>());
  const registerPanel = useCallback((id: string, panel: RegisteredPanel) => {
    setPanels((current) => {
      const existing = current.get(id);
      if (
        existing?.width === panel.width &&
        existing.launcher === panel.launcher
      ) {
        return current;
      }
      return new Map(current).set(id, panel);
    });
  }, []);
  const unregisterPanel = useCallback((id: string) => {
    setPanels((current) => {
      if (!current.has(id)) return current;
      const next = new Map(current);
      next.delete(id);
      return next;
    });
  }, []);
  const value = useMemo(() => {
    const active = [...panels.values()].pop();
    return {
      learningPanelWidth: active?.width ?? 0,
      launcherTarget: active?.launcher ?? null,
      registerPanel,
      unregisterPanel,
    };
  }, [panels, registerPanel, unregisterPanel]);

  return (
    <FloatingPanelLayoutContext.Provider value={value}>
      {children}
    </FloatingPanelLayoutContext.Provider>
  );
}

export function useFloatingPanelLayout(): FloatingPanelLayout {
  return useContext(FloatingPanelLayoutContext) ?? EMPTY_LAYOUT;
}

export function useLearningPanelLayout(isOpen: boolean) {
  const context = useContext(FloatingPanelLayoutContext);
  const registerPanel = context?.registerPanel;
  const unregisterPanel = context?.unregisterPanel;
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const launcher = launcherRef.current;
    if (!isOpen || !panel || !launcher || !registerPanel || !unregisterPanel) {
      return;
    }

    const measure = () =>
      registerPanel(id, {
        width: panel.getBoundingClientRect().width,
        launcher,
      });
    measure();

    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    observer?.observe(panel);
    if (!observer) window.addEventListener("resize", measure);

    return () => {
      observer?.disconnect();
      if (!observer) window.removeEventListener("resize", measure);
      unregisterPanel(id);
    };
  }, [id, isOpen, registerPanel, unregisterPanel]);

  return { panelRef, launcherRef };
}
