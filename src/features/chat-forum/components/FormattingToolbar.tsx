"use client";

import React from "react";
import { Bold, Italic, Underline, List } from "lucide-react";

export type FormatType = "bold" | "italic" | "underline" | "bullet";

type FormattingToolbarProps = {
  onFormat: (type: FormatType) => void;
  activeFormats?: FormatType[];
  disabled?: boolean;
};

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function FormattingToolbar({
  onFormat,
  activeFormats = [],
  disabled,
}: FormattingToolbarProps) {
  const buttons: { type: FormatType; icon: typeof Bold; label: string }[] = [
    { type: "bold", icon: Bold, label: "Bold" },
    { type: "italic", icon: Italic, label: "Italic" },
    { type: "underline", icon: Underline, label: "Underline" },
    { type: "bullet", icon: List, label: "Bullet List" },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-slate-200 pb-2 mb-2">
      {buttons.map(({ type, icon: Icon, label }) => (
        <button
          key={type}
          type="button"
          aria-pressed={activeFormats.includes(type)}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onFormat(type)}
          disabled={disabled}
          title={label}
          aria-label={label}
          className={classNames(
            "rounded p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
            activeFormats.includes(type) &&
              "bg-violet-100 text-violet-700 shadow-inner",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
