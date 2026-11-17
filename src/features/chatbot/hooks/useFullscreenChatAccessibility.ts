"use client";

import { useEffect, useRef, type RefObject } from "react";

interface FullscreenChatAccessibilityOptions {
  active: boolean;
  rootRef: RefObject<HTMLDivElement | null>;
  onEscape: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

const MODAL_SELECTOR =
  '[role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]';
const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex], [contenteditable="true"]';
const OVERFLOW_PROPERTIES = new Set(["overflow", "overflow-x", "overflow-y"]);

function isAvailable(element: HTMLElement): boolean {
  if (
    !element.isConnected ||
    element.closest('[hidden], [inert], [aria-hidden="true"]') ||
    element.matches(':disabled, input[type="hidden"]')
  ) {
    return false;
  }

  for (let ancestor: HTMLElement | null = element; ancestor;) {
    const style = window.getComputedStyle(ancestor);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.visibility === "collapse"
    ) {
      return false;
    }
    ancestor = ancestor.parentElement;
  }

  return true;
}

function lockScroll(element: HTMLElement): () => void {
  const previous = Array.from(element.style)
    .filter((property) => OVERFLOW_PROPERTIES.has(property))
    .map((property) => ({
      property,
      value: element.style.getPropertyValue(property),
      priority: element.style.getPropertyPriority(property),
    }));

  for (const property of OVERFLOW_PROPERTIES) {
    element.style.removeProperty(property);
  }
  element.style.setProperty("overflow", "hidden");

  return () => {
    for (const property of OVERFLOW_PROPERTIES) {
      element.style.removeProperty(property);
    }
    for (const { property, value, priority } of previous) {
      element.style.setProperty(property, value, priority);
    }
  };
}

function isolateBackground(root: HTMLElement): () => void {
  const previous: Array<{
    element: HTMLElement;
    inert: string | null;
    ariaHidden: string | null;
  }> = [];

  // Isolate siblings along the shell's ancestry, without depending on any page
  // structure. Later body-portaled confirmation dialogs remain available.
  for (let branch: HTMLElement = root; branch.parentElement;) {
    const parent = branch.parentElement;
    for (const sibling of parent.children) {
      if (!(sibling instanceof HTMLElement) || sibling === branch) continue;
      const modal = sibling.matches(MODAL_SELECTOR)
        ? sibling
        : Array.from(sibling.children).find((child) =>
            child.matches(MODAL_SELECTOR),
          );
      if (
        parent === document.body &&
        modal instanceof HTMLElement &&
        isAvailable(modal)
      ) {
        continue;
      }
      previous.push({
        element: sibling,
        inert: sibling.getAttribute("inert"),
        ariaHidden: sibling.getAttribute("aria-hidden"),
      });
      sibling.setAttribute("inert", "");
      sibling.setAttribute("aria-hidden", "true");
    }
    if (parent === document.body) break;
    branch = parent;
  }

  return () => {
    for (const { element, inert, ariaHidden } of previous) {
      if (inert === null) element.removeAttribute("inert");
      else element.setAttribute("inert", inert);
      if (ariaHidden === null) element.removeAttribute("aria-hidden");
      else element.setAttribute("aria-hidden", ariaHidden);
    }
  };
}

export function useFullscreenChatAccessibility({
  active,
  rootRef,
  onEscape,
  returnFocusRef,
}: FullscreenChatAccessibilityOptions) {
  const onEscapeRef = useRef(onEscape);
  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!active || !rootRef.current) return;
    const root = rootRef.current;

    const opener =
      document.activeElement instanceof HTMLElement &&
      document.activeElement !== document.body &&
      document.activeElement !== document.documentElement
        ? document.activeElement
        : null;
    const returnFocusTarget = returnFocusRef?.current;
    // The launcher can move to another portal while fullscreen remains open.
    const currentReturnFocusTarget = () =>
      returnFocusRef?.current ?? returnFocusTarget;
    let lastFocused: HTMLElement = root;
    const temporaryModalTabIndexes = new Set<HTMLElement>();

    function nestedModal(): HTMLElement | undefined {
      return Array.from(document.querySelectorAll<HTMLElement>(MODAL_SELECTOR))
        .reverse()
        .find((modal) => !root.contains(modal) && isAvailable(modal));
    }

    function isNestedModalTarget(target: EventTarget | null): boolean {
      if (!(target instanceof Element)) return false;
      const modal = target.closest<HTMLElement>(MODAL_SELECTOR);
      return Boolean(modal && !root.contains(modal) && isAvailable(modal));
    }

    // Focus the shell rather than the input, so entry does not open a software
    // keyboard. The caller supplies tabIndex=-1 on this persistent element.
    if (!isNestedModalTarget(document.activeElement)) {
      root.focus({ preventScroll: true });
    }
    const restoreBodyScroll = lockScroll(document.body);
    const restoreDocumentScroll = lockScroll(document.documentElement);
    const restoreBackground = isolateBackground(root);

    function handleFocusIn(event: FocusEvent) {
      const modal = nestedModal();
      if (modal) {
        if (event.target instanceof Node && modal.contains(event.target))
          return;
        const first = Array.from(
          modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        ).find((element) => element.tabIndex >= 0 && isAvailable(element));
        if (!first && !modal.hasAttribute("tabindex")) {
          temporaryModalTabIndexes.add(modal);
          modal.tabIndex = -1;
        }
        (first ?? modal).focus({ preventScroll: true });
        return;
      }
      if (event.target instanceof HTMLElement && root.contains(event.target)) {
        lastFocused = event.target;
        return;
      }
      (isAvailable(lastFocused) ? lastFocused : root).focus({
        preventScroll: true,
      });
    }

    function handleKeyDown(event: KeyboardEvent) {
      // The body-portaled end-conversation alertdialog owns its own Escape and
      // Tab handling. Never dismiss the tutor underneath a nested dialog.
      if (event.defaultPrevented || nestedModal()) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onEscapeRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const controls = Array.from(
        root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => element.tabIndex >= 0 && isAvailable(element));
      const first = controls[0];
      const last = controls[controls.length - 1];
      const focused = document.activeElement;
      if (!first) {
        event.preventDefault();
        root.focus({ preventScroll: true });
      } else if (
        focused === root ||
        !root.contains(focused) ||
        (event.shiftKey ? focused === first : focused === last)
      ) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus({ preventScroll: true });
      }
    }

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("keydown", handleKeyDown);
      for (const modal of temporaryModalTabIndexes) {
        modal.removeAttribute("tabindex");
      }
      restoreBackground();
      restoreDocumentScroll();
      restoreBodyScroll();
      const destination =
        opener && isAvailable(opener) ? opener : currentReturnFocusTarget();
      if (destination && isAvailable(destination)) {
        destination.focus({ preventScroll: true });
      }
    };
  }, [active, rootRef, returnFocusRef]);
}
