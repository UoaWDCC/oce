import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import ForumEntryComposer from "../ForumEntryComposer";

vi.mock("../../hooks/useForumImageUpload", () => ({
  useForumImageUpload: () => ({
    uploadImage: vi.fn(),
    removeImage: vi.fn(),
    validateFile: vi.fn(),
    clearError: vi.fn(),
    isUploading: false,
    error: null,
  }),
}));

const originalExec = Object.getOwnPropertyDescriptor(document, "execCommand");
const originalQuery = Object.getOwnPropertyDescriptor(
  document,
  "queryCommandState",
);
const execCommand = vi.fn();

beforeEach(() => {
  execCommand.mockReset().mockReturnValue(true);
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    value: execCommand,
  });
  Object.defineProperty(document, "queryCommandState", {
    configurable: true,
    value: vi.fn().mockReturnValue(false),
  });
});

afterEach(() => {
  cleanup();
  if (originalExec)
    Object.defineProperty(document, "execCommand", originalExec);
  else Reflect.deleteProperty(document, "execCommand");
  if (originalQuery)
    Object.defineProperty(document, "queryCommandState", originalQuery);
  else Reflect.deleteProperty(document, "queryCommandState");
});

describe("forum editor interactions", () => {
  it("hydrates existing content and follows a different draft without submitting it", () => {
    const onSubmit = vi.fn();
    const onChange = vi.fn();
    const { rerender } = render(
      createElement(ForumEntryComposer, {
        initialBody: "<p><b>Original</b></p>",
        onSubmit,
        onChange,
      }),
    );
    expect(screen.getByRole("textbox").innerHTML).toBe(
      "<p><b>Original</b></p>",
    );
    rerender(
      createElement(ForumEntryComposer, {
        initialBody: "<p>Fish &amp; chips</p>",
        onSubmit,
        onChange,
      }),
    );
    expect(screen.getByRole("textbox").innerHTML).toBe(
      "<p>Fish &amp; chips</p>",
    );
    expect(onChange).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits typed HTML and clears only after a successful save", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onChange = vi.fn();
    render(createElement(ForumEntryComposer, { onSubmit, onChange }));
    const editor = screen.getByRole("textbox");
    editor.innerHTML = "<p>Hello <b>DAO</b></p>";
    fireEvent.input(editor);
    expect(onChange).toHaveBeenCalledWith("<p>Hello <b>DAO</b></p>");
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        body: "<p>Hello <b>DAO</b></p>",
        imageUrl: null,
      }),
    );
    await waitFor(() => expect(editor.innerHTML).toBe(""));
  });

  it("retains the draft and displays an error when saving fails", async () => {
    render(
      createElement(ForumEntryComposer, {
        initialBody: "Keep this draft",
        onSubmit: vi.fn().mockRejectedValue(new Error("Save failed")),
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await screen.findByText("Save failed");
    expect(screen.getByRole("textbox").innerHTML).toBe("Keep this draft");
  });

  it.each([
    ["Bold", "bold"],
    ["Italic", "italic"],
    ["Underline", "underline"],
    ["Bullet List", "insertUnorderedList"],
  ])("keeps %s connected to browser editing", (label, command) => {
    render(
      createElement(ForumEntryComposer, {
        initialBody: "Text",
        onSubmit: vi.fn(),
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: label }));
    expect(execCommand).toHaveBeenCalledWith(command);
  });

  it("pastes plain text without inserting clipboard HTML", () => {
    const onChange = vi.fn();
    render(createElement(ForumEntryComposer, { onSubmit: vi.fn(), onChange }));
    const editor = screen.getByRole("textbox");
    execCommand.mockImplementation((command, _ui, text) => {
      if (command === "insertText") editor.textContent = text;
      return true;
    });
    const getData = vi.fn().mockReturnValue("<b>Plain text</b>");
    fireEvent.paste(editor, { clipboardData: { getData } });
    expect(getData).toHaveBeenCalledWith("text/plain");
    expect(editor.querySelector("b")).toBeNull();
    expect(onChange).toHaveBeenCalledWith("&lt;b&gt;Plain text&lt;/b&gt;");
  });
});
