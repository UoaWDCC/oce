// @vitest-environment jsdom
import React, { useState } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FloatingPanelLayoutProvider,
  useFloatingPanelLayout,
  useLearningPanelLayout,
} from "@/context/FloatingPanelLayoutProvider";
import ChatWrapper from "@/features/chatbot/components/chatWrapper";
import { useChatModal } from "@/features/chatbot/providers/ChatBoxModalProvider";

vi.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: async () => ({
        data: { session: { user: { id: "test-user" } } },
      }),
      onAuthStateChange: (
        callback: (event: string, session: unknown) => void,
      ) => {
        callback("INITIAL_SESSION", { user: { id: "test-user" } });
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
  }),
}));
vi.mock("@/features/chatbot/components/chatSection", () => ({
  default: function SessionProbe() {
    const { open, openZoomChatBox } = useChatModal();
    return (
      <div data-testid="chat-session">
        {!open ? "closed" : openZoomChatBox ? "fullscreen" : "compact"}
      </div>
    );
  },
}));

const resizeCallbacks = new Map<Element, () => void>();
const disconnect = vi.fn();

function Panel({
  name,
  open,
  width,
}: {
  name: string;
  open: boolean;
  width: number;
}) {
  const { panelRef, launcherRef } = useLearningPanelLayout(open);
  if (!open) return null;
  return (
    <div ref={panelRef} role="region" aria-label={name} data-width={width}>
      <div ref={launcherRef} data-testid={`slot-${name}`} data-slot={name} />
      <button>Existing {name} control</button>
    </div>
  );
}

function LayoutProbe() {
  const { learningPanelWidth, launcherTarget } = useFloatingPanelLayout();
  return (
    <output data-testid="layout">
      {learningPanelWidth}:{launcherTarget?.dataset.slot ?? "none"}
    </output>
  );
}

function PanelHarness({ second = false }: { second?: boolean }) {
  const [firstOpen, setFirstOpen] = useState(false);
  const [secondOpen, setSecondOpen] = useState(false);
  return (
    <>
      <button onClick={() => setFirstOpen((open) => !open)}>
        Toggle first panel
      </button>
      <button onClick={() => setSecondOpen((open) => !open)}>
        Toggle second panel
      </button>
      <Panel name="first" open={firstOpen} width={500} />
      {second && <Panel name="second" open={secondOpen} width={600} />}
      <LayoutProbe />
    </>
  );
}

beforeEach(() => {
  resizeCallbacks.clear();
  disconnect.mockClear();
  vi.stubGlobal("innerWidth", 1200);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      private observed: Element | null = null;
      constructor(private callback: () => void) {}
      observe(element: Element) {
        this.observed = element;
        resizeCallbacks.set(element, this.callback);
      }
      disconnect() {
        disconnect();
        if (this.observed) resizeCallbacks.delete(this.observed);
      }
    },
  );
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      const width = Number(this.getAttribute("data-width") ?? 0);
      return {
        width,
        height: 600,
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: width,
        bottom: 600,
        toJSON: () => ({}),
      };
    },
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("floating learning-panel integration", () => {
  it("works without a shared layout provider", () => {
    render(
      <>
        <Panel name="standalone" open width={500} />
        <LayoutProbe />
      </>,
    );
    expect(screen.getByRole("region", { name: "standalone" })).toBeTruthy();
    expect(screen.getByTestId("layout").textContent).toBe("0:none");
    expect(resizeCallbacks.size).toBe(0);
  });

  it("measures resizing panels and removes registrations and observers on close", () => {
    render(
      <FloatingPanelLayoutProvider>
        <PanelHarness second />
      </FloatingPanelLayoutProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Toggle first panel" }));
    expect(screen.getByTestId("layout").textContent).toBe("500:first");
    const first = screen.getByRole("region", { name: "first" });
    first.setAttribute("data-width", "550");
    act(() => resizeCallbacks.get(first)?.());
    expect(screen.getByTestId("layout").textContent).toBe("550:first");
    fireEvent.click(
      screen.getByRole("button", { name: "Toggle second panel" }),
    );
    expect(screen.getByTestId("layout").textContent).toBe("600:second");
    fireEvent.click(
      screen.getByRole("button", { name: "Toggle second panel" }),
    );
    expect(screen.getByTestId("layout").textContent).toBe("550:first");
    fireEvent.click(screen.getByRole("button", { name: "Toggle first panel" }));
    expect(screen.getByTestId("layout").textContent).toBe("0:none");
    expect(resizeCallbacks.size).toBe(0);
    expect(disconnect).toHaveBeenCalledTimes(2);
  });

  it("moves exactly one launcher into the learning header without remounting its session", async () => {
    render(
      <FloatingPanelLayoutProvider>
        <ChatWrapper />
        <PanelHarness />
      </FloatingPanelLayoutProvider>,
    );
    const launcher = await screen.findByRole("button", {
      name: "Open AI Tutor",
    });
    const session = screen.getByTestId("chat-session");
    fireEvent.click(launcher);
    expect(session.textContent).toBe("compact");
    fireEvent.click(screen.getByRole("button", { name: "Toggle first panel" }));
    expect(
      screen.getByRole("button", { name: "Close AI Tutor" }).parentElement
        ?.parentElement,
    ).toBe(screen.getByTestId("slot-first"));
    expect(screen.getByText("AI Tutor")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /AI Tutor/ })).toHaveLength(1);
    expect(screen.getByTestId("chat-session")).toBe(session);
    fireEvent.click(screen.getByRole("button", { name: "Toggle first panel" }));
    expect(screen.queryByTestId("slot-first")).toBeNull();
    expect(screen.getByRole("button", { name: "Close AI Tutor" })).toBeTruthy();
    expect(screen.getByTestId("chat-session")).toBe(session);
    expect(session.textContent).toBe("compact");
  });

  it.each([false, true])(
    "opens the existing session fullscreen from a narrow learning panel when already open is %s",
    async (alreadyOpen) => {
      vi.stubGlobal("innerWidth", 768);
      render(
        <FloatingPanelLayoutProvider>
          <ChatWrapper />
          <PanelHarness />
        </FloatingPanelLayoutProvider>,
      );
      const launcher = await screen.findByRole("button", {
        name: "Open AI Tutor",
      });
      if (alreadyOpen) fireEvent.click(launcher);
      const session = screen.getByTestId("chat-session");
      fireEvent.click(
        screen.getByRole("button", { name: "Toggle first panel" }),
      );
      const slottedLauncher = screen.getByRole("button", {
        name: "Open AI Tutor",
      });
      expect(slottedLauncher.getAttribute("aria-expanded")).toBe("false");
      fireEvent.click(slottedLauncher);
      await waitFor(() => expect(session.textContent).toBe("fullscreen"));
      expect(screen.getByTestId("chat-session")).toBe(session);
      expect(
        screen
          .getByRole("button", { name: "Close AI Tutor" })
          .getAttribute("aria-expanded"),
      ).toBe("true");
    },
  );

  it("remeasures on viewport resize when ResizeObserver is unavailable", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    render(
      <FloatingPanelLayoutProvider>
        <PanelHarness />
      </FloatingPanelLayoutProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Toggle first panel" }));
    screen
      .getByRole("region", { name: "first" })
      .setAttribute("data-width", "600");
    fireEvent(window, new Event("resize"));
    expect(screen.getByTestId("layout").textContent).toBe("600:first");
    fireEvent.click(screen.getByRole("button", { name: "Toggle first panel" }));
    fireEvent(window, new Event("resize"));
    expect(screen.getByTestId("layout").textContent).toBe("0:none");
  });
});
