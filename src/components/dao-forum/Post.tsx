"use client";
import React from "react";
import Tag from "./Tag";
import StudentAvatar from "../common/StudentAvatar";
import { PostType } from "@app-types/post_types";

type PostCardProps = {
  title: string;
  types?: PostType[];
  displayName: string;
  walletAddress?: string | null;
  profileImageUrl?: string | null;
  createdAt: string;
};

const PostCard = ({ title, types, displayName, walletAddress, profileImageUrl, createdAt }: PostCardProps) => {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-indigo-100 bg-white px-5 py-4 shadow-sm cursor-pointer hover:border-indigo-200 transition-colors">
      <div className="flex flex-col gap-2 min-w-0 flex-1">

        {/* Tags */}
        <div className="flex flex-row flex-wrap items-center gap-2">
          {types?.map((type) => (
            <Tag key={type} type={type} />
          ))}
        </div>

        {/* Title */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>

        {/* Author + Timestamp */}
        <div className="flex items-center gap-2">
          <StudentAvatar
            displayName={displayName}
            walletAddress={walletAddress}
            profileImageUrl={profileImageUrl}
            size="sm"
          />
          <span className="text-sm text-slate-400 font-semibold">
            {new Date(createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>

      </div>
    </div>
  );
};

export default PostCard;