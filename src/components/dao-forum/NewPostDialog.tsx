"use client";

import React, { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import PostEntryComposer, {
  type PostEntryComposerProps,
} from "./PostEntryComposer";

export type NewPostDialogProps = Omit<
  PostEntryComposerProps,
  "onClose" | "onCancel" | "onSubmit" | "onSubmittingChange"
> & {
  onSubmit: PostEntryComposerProps["onSubmit"];
  /** Element that opens the dialog. Omit if you're controlling `open` yourself. */
  trigger?: React.ReactNode;
  /** Controlled open state (e.g. for an "Edit post" trigger living inside a feed item). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export default function NewPostDialog({
  onSubmit,
  trigger,
  open: controlledOpen,
  onOpenChange,
  ...composerProps
}: NewPostDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  // Ref, not state — read synchronously inside Radix's event handlers.
  const isSubmittingRef = useRef(false);

  const setOpen = (next: boolean) => {
    if (isControlled) onOpenChange?.(next);
    else setUncontrolledOpen(next);
  };

  const handleOpenChange = (next: boolean) => {
    // Block Escape / overlay-click / trigger-toggle from closing mid-submit.
    if (!next && isSubmittingRef.current) return;
    setOpen(next);
  };

  const handleSubmit: PostEntryComposerProps["onSubmit"] = async (payload) => {
    await onSubmit(payload);
    // Successful submission closes the composer.
    setOpen(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-40 bg-slate-900/40
            data-[state=open]:animate-in data-[state=open]:fade-in-0
            data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
        />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[min(640px,92vw)]
            -translate-x-1/2 -translate-y-1/2 max-h-[88vh] overflow-y-auto
            rounded-2xl shadow-2xl focus:outline-none
            data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95
            data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          onEscapeKeyDown={(e) => {
            if (isSubmittingRef.current) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (isSubmittingRef.current) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (isSubmittingRef.current) e.preventDefault();
          }}
        >
          {/* Visually hidden but required by Radix for accessibility */}
          <Dialog.Title className="sr-only">
            {composerProps.mode === "edit" ? "Edit post" : "New post"}
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            {composerProps.mode === "edit"
              ? "Edit an existing forum post"
              : "Compose and publish a new forum post"}
          </Dialog.Description>

          <PostEntryComposer
            {...composerProps}
            onSubmit={handleSubmit}
            onCancel={() => handleOpenChange(false)}
            onClose={() => handleOpenChange(false)}
            onSubmittingChange={(submitting) => {
              isSubmittingRef.current = submitting;
            }}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}