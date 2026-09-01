import React from "react";
import { type PostType } from "@app-types/dao-forum";
import { POST_TYPE_PRESENTATION } from "@/features/chat-forum/postTypePresentation";

type TagSize = "sm" | "md";

const TAG_SIZE_STYLES: Record<TagSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
};

export type TagProps = {
  type?: PostType;
  className?: string;
  size?: TagSize;
};

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const Tag = ({ type, className = "", size = "sm" }: TagProps) => {
  if (!type) return null;

  const { label, badge } = POST_TYPE_PRESENTATION[type];

  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-full font-semibold tracking-wide",
        TAG_SIZE_STYLES[size],
        badge,
        className,
      )}
    >
      {label}
    </span>
  );
};

export default Tag;
