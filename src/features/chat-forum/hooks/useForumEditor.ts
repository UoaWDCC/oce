"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
} from "react";
import { FORMAT_COMMANDS, type FormatType } from "../lib/editorFormats";

/** Keeps browser editor behavior in one place until the editor is replaced. */
export function useForumEditor(
  initialBody: string,
  autoFocus: boolean,
  onChange?: (body: string) => void,
) {
  const [body, setBody] = useState(initialBody);
  const [activeFormats, setActiveFormats] = useState<FormatType[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);
  const updateActiveFormats = useCallback(() => {
    const editor = editorRef.current;
    const selection = document.getSelection();

    if (
      !editor ||
      !selection?.anchorNode ||
      !editor.contains(selection.anchorNode)
    ) {
      setActiveFormats([]);
      return;
    }

    const nextFormats = (Object.keys(FORMAT_COMMANDS) as FormatType[]).filter(
      (type) => document.queryCommandState(FORMAT_COMMANDS[type]),
    );

    setActiveFormats((currentFormats) =>
      currentFormats.length === nextFormats.length &&
      currentFormats.every((format, index) => format === nextFormats[index])
        ? currentFormats
        : nextFormats,
    );
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", updateActiveFormats);
    return () =>
      document.removeEventListener("selectionchange", updateActiveFormats);
  }, [updateActiveFormats]);

  const applyFormat = (type: FormatType) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    document.execCommand(FORMAT_COMMANDS[type]);
    const nextBody = editor.innerHTML;
    setBody(nextBody);
    onChange?.(nextBody);
    updateActiveFormats();
  };

  const handleEditorInput = () => {
    const nextBody = editorRef.current?.innerHTML ?? "";
    setBody(nextBody);
    onChange?.(nextBody);
    updateActiveFormats();
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    document.execCommand(
      "insertText",
      false,
      event.clipboardData.getData("text/plain"),
    );
    handleEditorInput();
  };

  useEffect(() => {
    if (autoFocus) {
      editorRef.current?.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || initialBody === editor.innerHTML) return;
    setBody(initialBody);
    editor.innerHTML = initialBody;
  }, [initialBody]);

  const clearEditor = useCallback(() => {
    setBody("");
    setActiveFormats([]);
    if (editorRef.current) editorRef.current.innerHTML = "";
  }, []);

  return {
    body,
    editorRef,
    activeFormats,
    applyFormat,
    handleEditorInput,
    handlePaste,
    updateActiveFormats,
    clearEditor,
  };
}
