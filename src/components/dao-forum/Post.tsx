"use client";
import React from "react";

const PostCard = () => {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-indigo-100 bg-white px-5 py-4 shadow-sm cursor-pointer hover:border-indigo-200 transition-colors">
      <div className="flex flex-col gap-2 min-w-0 flex-1">

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1.5">
        </div>

        {/* Title */}
        <div>
        </div>

        {/* Author + Timestamp */}
        <div className="flex items-center gap-2">
        </div>

      </div>
    </div>
  );
};

export default PostCard;