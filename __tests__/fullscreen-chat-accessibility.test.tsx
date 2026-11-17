import React, { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useFullscreenChatAccessibility } from "@/features/chatbot/hooks/useFullscreenChatAccessibility";
import EndConversationDialog from "@/features/chatbot/components/fullscreen/endConversationDialog";

interface FixtureProps {
  active: boolean;
  visible?: boolean;
  onEscape: () => void;
  nested?: boolean;
  onCancelNested?: () => void;
  disabledControls?: boolean;
  launcherVersion?: number;
}

function Fixture({
  active,
  visible = true,
  onEscape,
  nested = false,
  onCancelNested = () => undefined,
  disabledControls = false,
  launcherVersion = 0,
}: FixtureProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const firstControlRef = useRef<HTMLButtonElement>(null);
  useFullscreenChatAccessibility({
    active,
    rootRef,
    onEscape,
    returnFocusRef: launcherRef,
  });

  return (
    <div>
      <button key={launcherVersion} ref={launcherRef}>
        {launcherVersion ? "New launcher" : "Launcher"}
      </button>
      <div
        ref={rootRef}
        role="dialog"
        aria-label="AI Tutor"
        tabIndex={-1}
        hidden={!visible}
      >
        <button ref={firstControlRef} disabled={disabledControls}>
          First control
        </button>
        <div hidden>
          <button>Hidden sidebar control</button>
        </div>
        <div style={{ display: "none" }}>
          <button>CSS hidden control</button>
        </div>
        <div inert>
          <button>Inert control</button>
        </div>
        <button disabled>Disabled control</button>
        <button tabIndex={-1}>Programmatic-only control</button>
        <button disabled={disabledControls}>Last control</button>
      </div>
      {nested && firstControlRef.current && (
        <EndConversationDialog
          conversationName="Current conversation"
          isEnding={false}
          returnFocusTo={firstControlRef.current}
          onCancel={onCancelNested}
          onConfirm={() => undefined}
        />
      )}
    </div>
  );
}

describe("fullscreen chat accessibility", () => {
  let background: HTMLElement;
  let backgroundButton: HTMLButtonElement;
  let bodyStyle: string;
  let documentStyle: string;

  beforeEach(() => {
    bodyStyle = document.body.style.cssText;
    documentStyle = document.documentElement.style.cssText;
    background = document.createElement("main");
    backgroundButton = document.createElement("button");
    backgroundButton.textContent = "Background action";
    background.appendChild(backgroundButton);
    document.body.appendChild(background);
  });

  afterEach(() => {
    cleanup();
    background.remove();
    document.body.style.cssText = bodyStyle;
    document.documentElement.style.cssText = documentStyle;
  });

  it("leaves compact view focus and background scrolling unchanged", () => {
    const onEscape = vi.fn();
    document.body.style.overflow = "auto";
    render(<Fixture active={false} onEscape={onEscape} />);

    backgroundButton.focus();
    fireEvent.keyDown(backgroundButton, { key: "Escape" });

    expect(document.activeElement).toBe(backgroundButton);
    expect(background.hasAttribute("inert")).toBe(false);
    expect(background.hasAttribute("aria-hidden")).toBe(false);
    expect(document.body.style.overflow).toBe("auto");
    expect(onEscape).not.toHaveBeenCalled();
  });

  it("focuses the persistent shell, isolates background, and restores exact scroll attributes on exit", () => {
    const onEscape = vi.fn();
    document.body.style.setProperty("overflow-x", "scroll", "important");
    document.body.style.setProperty("overflow-y", "auto");
    document.body.style.color = "purple";
    document.documentElement.style.setProperty("overflow", "auto", "important");
    background.setAttribute("aria-hidden", "false");
    const view = render(<Fixture active={false} onEscape={onEscape} />);
    const opener = screen.getByRole("button", { name: "First control" });
    opener.focus();

    view.rerender(<Fixture active onEscape={onEscape} />);

    expect(document.activeElement).toBe(screen.getByRole("dialog"));
    expect(background.hasAttribute("inert")).toBe(true);
    expect(background.getAttribute("aria-hidden")).toBe("true");
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.documentElement.style.overflow).toBe("hidden");
    view.rerender(<Fixture active={false} onEscape={onEscape} />);

    expect(document.activeElement).toBe(opener);
    expect(background.hasAttribute("inert")).toBe(false);
    expect(background.getAttribute("aria-hidden")).toBe("false");
    expect(document.body.style.getPropertyValue("overflow-x")).toBe("scroll");
    expect(document.body.style.getPropertyPriority("overflow-x")).toBe(
      "important",
    );
    expect(document.body.style.getPropertyValue("overflow-y")).toBe("auto");
    expect(document.body.style.getPropertyValue("overflow")).toBe("");
    expect(document.body.style.color).toBe("purple");
    expect(document.documentElement.style.overflow).toBe("auto");
    expect(document.documentElement.style.getPropertyPriority("overflow")).toBe(
      "important",
    );
  });

  it("loops Tab over visible enabled controls and contains outside programmatic focus", () => {
    render(<Fixture active onEscape={vi.fn()} />);
    const root = screen.getByRole("dialog");
    const first = screen.getByRole("button", { name: "First control" });
    const last = screen.getByRole("button", { name: "Last control" });

    fireEvent.keyDown(root, { key: "Tab" });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(last, { key: "Tab" });
    expect(document.activeElement).toBe(first);
    backgroundButton.focus();
    expect(document.activeElement).toBe(first);
  });

  it("keeps Tab on the shell when no enabled tabbable controls exist", () => {
    render(<Fixture active disabledControls onEscape={vi.fn()} />);
    const root = screen.getByRole("dialog");

    fireEvent.keyDown(root, { key: "Tab" });
    expect(document.activeElement).toBe(root);
    fireEvent.keyDown(root, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(root);
  });

  it("uses the latest Escape callback without resetting focus", () => {
    const oldEscape = vi.fn();
    const newEscape = vi.fn();
    const view = render(<Fixture active onEscape={oldEscape} />);
    const last = screen.getByRole("button", { name: "Last control" });
    last.focus();

    view.rerender(<Fixture active onEscape={newEscape} />);
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(last, { key: "Escape" });

    expect(newEscape).toHaveBeenCalledOnce();
    expect(oldEscape).not.toHaveBeenCalled();
  });

  it("honors defaultPrevented Escape from an inner control", () => {
    const onEscape = vi.fn();
    render(<Fixture active onEscape={onEscape} />);
    const event = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    event.preventDefault();

    screen.getByRole("dialog").dispatchEvent(event);

    expect(onEscape).not.toHaveBeenCalled();
  });

  it("allows a body-portaled end-conversation dialog to own focus, Tab, and Escape", () => {
    const onEscape = vi.fn();
    const onCancelNested = vi.fn();
    const view = render(<Fixture active onEscape={onEscape} />);
    view.rerender(
      <Fixture
        active
        nested
        onEscape={onEscape}
        onCancelNested={onCancelNested}
      />,
    );
    const nestedDialog = screen.getByRole("alertdialog");
    const cancel = screen.getByRole("button", { name: "Cancel" });
    const confirm = screen.getByRole("button", { name: "End conversation" });

    expect(nestedDialog.closest("[inert]")).toBeNull();
    expect(nestedDialog.closest('[aria-hidden="true"]')).toBeNull();
    expect(document.activeElement).toBe(cancel);
    screen.getByRole("button", { name: "First control" }).focus();
    expect(document.activeElement).toBe(cancel);
    fireEvent.keyDown(cancel, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(confirm);
    fireEvent.keyDown(confirm, { key: "Tab" });
    expect(document.activeElement).toBe(cancel);
    fireEvent.keyDown(cancel, { key: "Escape" });

    expect(onCancelNested).toHaveBeenCalledOnce();
    expect(onEscape).not.toHaveBeenCalled();
  });

  it("returns focus to the launcher when closing hides the opener", () => {
    const onEscape = vi.fn();
    const view = render(<Fixture active={false} onEscape={onEscape} />);
    screen.getByRole("button", { name: "First control" }).focus();
    view.rerender(<Fixture active onEscape={onEscape} />);

    view.rerender(
      <Fixture active={false} visible={false} onEscape={onEscape} />,
    );

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Launcher" }),
    );
  });

  it("restores pre-existing inert/aria-hidden and scroll state on true unmount", () => {
    background.setAttribute("inert", "existing");
    background.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "scroll";
    const view = render(<Fixture active onEscape={vi.fn()} />);

    view.unmount();

    expect(background.getAttribute("inert")).toBe("existing");
    expect(background.getAttribute("aria-hidden")).toBe("true");
    expect(document.body.style.overflow).toBe("scroll");
    expect(document.documentElement.style.overflow).toBe("");
    background.removeAttribute("inert");
    background.removeAttribute("aria-hidden");
    backgroundButton.focus();
    expect(document.activeElement).toBe(backgroundButton);
  });

  it("returns focus to the current fallback when the launcher changes during fullscreen", () => {
    const onEscape = vi.fn();
    const view = render(<Fixture active={false} onEscape={onEscape} />);
    screen.getByRole("button", { name: "First control" }).focus();
    view.rerender(<Fixture active onEscape={onEscape} />);
    view.rerender(<Fixture active launcherVersion={1} onEscape={onEscape} />);

    view.rerender(
      <Fixture
        active={false}
        visible={false}
        launcherVersion={1}
        onEscape={onEscape}
      />,
    );

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "New launcher" }),
    );
  });
});
