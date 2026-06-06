"use client";
import React from "react";
import Tag from "./Tag";
import { PostType } from "@app-types/post_types";

type PostCardProps = {
  title: string;
  type?: PostType;
};

const PostCard = ({ title, type }: PostCardProps) => {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-indigo-100 bg-white px-5 py-4 shadow-sm cursor-pointer hover:border-indigo-200 transition-colors">
      <div className="flex flex-col gap-2 min-w-0 flex-1">

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Tag type={type}/>
        </div>

        {/* Title */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>

        {/* Author + Timestamp */}
        <div className="flex items-center gap-2">
          
        </div>

      </div>
    </div>
  );
};

export default PostCard;