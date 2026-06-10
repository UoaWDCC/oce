"use client";
import React from "react";
import Tag from "./Tag";
import StudentAvatar, { Timestamp } from "../common/StudentAvatar";
import { PostType } from "@app-types/post_types";

type PostCardProps = {
  daoId: string;
  title: string;
  types?: PostType[];
  displayName: string;
  walletAddress?: string | null;
  profileImageUrl?: string | null;
  createdAt: Timestamp;
  commentCount: number;
};

const PostCard = ({ daoId, title, types, displayName, walletAddress, profileImageUrl, createdAt, commentCount }: PostCardProps) => {
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

        {/* Author */}
        <div className="flex items-center gap-2">
          <StudentAvatar
            displayName={displayName}
            walletAddress={walletAddress}
            profileImageUrl={profileImageUrl}
            timestamp={createdAt}
            size="sm"
          />
        </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-slate-500">
        <span>{daoId}</span>
        <span>{commentCount} comments</span>
      </div>
      </div>
    </div>
  );
};

export default PostCard;