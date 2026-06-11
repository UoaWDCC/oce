"use client";

import React from "react";
import { POST_TYPE, PostType } from "@app-types/post_types";

const POST_TYPE_STYLES: Record<PostType, string> = {
  [POST_TYPE.Announcement]: "bg-amber-50 text-amber-800 border border-amber-600",
  [POST_TYPE.Proposal]: "bg-sky-50 text-sky-800 border border-sky-600",
  [POST_TYPE.Question]: "bg-rose-50 text-rose-800 border border-rose-600",
  [POST_TYPE.Discussion]: "bg-purple-50 text-purple-800 border border-purple-400",
  [POST_TYPE.Resource]: "bg-emerald-50 text-emerald-800 border border-emerald-600",
};

const Tag = ({ type, className = "" }: { type?: PostType; className?: string; }) => {
  if (!type) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold tracking-wide px-2 py-0.5 text-xs ${POST_TYPE_STYLES[type]} ${className}`}>
      {type}
    </span>
  );
};

export default Tag;