import React from "react";
import { POST_TYPE, type PostType } from "@app-types/dao-forum";

const POST_TYPE_STYLES: Record<PostType, string> = {
  [POST_TYPE.Announcement]:
    "bg-amber-50 text-amber-800 border border-amber-600",
  [POST_TYPE.Proposal]: "bg-sky-50 text-sky-800 border border-sky-600",
  [POST_TYPE.Question]: "bg-rose-50 text-rose-800 border border-rose-600",
  [POST_TYPE.Discussion]:
    "bg-purple-50 text-purple-800 border border-purple-400",
  [POST_TYPE.Resource]:
    "bg-emerald-50 text-emerald-800 border border-emerald-600",
};

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

  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-full font-semibold tracking-wide",
        TAG_SIZE_STYLES[size],
        POST_TYPE_STYLES[type],
        className,
      )}
    >
      {type}
    </span>
  );
};

export default Tag;
