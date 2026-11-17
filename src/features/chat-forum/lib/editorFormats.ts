export const FORMAT_COMMANDS = {
  bold: "bold",
  italic: "italic",
  underline: "underline",
  bullet: "insertUnorderedList",
} as const;

export type FormatType = keyof typeof FORMAT_COMMANDS;
