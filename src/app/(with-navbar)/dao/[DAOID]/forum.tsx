"use client";

import {
  CircleHelp,
  List,
  Megaphone,
  MessageCircle,
  Package,
  Plus,
  Search,
  Tag,
} from "lucide-react";
import { DAO } from "./types";

type DaoForumProps = {
  dao: DAO;
};

const postTypes = [
  {
    label: "All",
    count: 0,
    icon: List,
    active: true,
    iconClassName: "bg-purple-100 text-[#5e00b2]",
  },
  {
    label: "Announcement",
    count: 0,
    icon: Megaphone,
    active: false,
    iconClassName: "bg-amber-100 text-amber-700",
  },
  {
    label: "Proposal",
    count: 0,
    icon: Package,
    active: false,
    iconClassName: "bg-indigo-100 text-indigo-700",
  },
  {
    label: "Question",
    count: 0,
    icon: CircleHelp,
    active: false,
    iconClassName: "bg-rose-100 text-rose-700",
  },
  {
    label: "General",
    count: 0,
    icon: MessageCircle,
    active: false,
    iconClassName: "bg-slate-100 text-slate-600",
  },
];

const tags = ["Smart Contracts", "DeFi", "Governance", "Tokenomics"];

const sortTabs = ["Recent", "Top Voted", "Unanswered"];

function ForumSidebar() {
  return (
    <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
      <section className="rounded-2xl border border-purple-100 bg-white p-5 shadow-md">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
          Search
        </h2>
        <label className="relative block">
          <span className="sr-only">Search posts</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#7c3aed] focus:bg-white focus:ring-2 focus:ring-purple-100"
            placeholder="Search posts..."
            type="search"
          />
        </label>
      </section>

      <section className="rounded-2xl border border-purple-100 bg-white p-5 shadow-md">
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <span className="flex items-center gap-3 text-base font-bold text-slate-700">
            <input
              className="h-4 w-4 rounded border-slate-300 text-[#7c3aed] focus:ring-[#7c3aed]"
              type="checkbox"
            />
            Unread only
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-400">
            0
          </span>
        </label>
      </section>

      <section className="rounded-2xl border border-purple-100 bg-white p-5 shadow-md">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
          Post Type
        </h2>
        <div className="space-y-2">
          {postTypes.map((type) => {
            const Icon = type.icon;

            return (
              <button
                key={type.label}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition ${
                  type.active
                    ? "bg-purple-100 text-[#5e00b2]"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
                type="button"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${type.iconClassName}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="truncate font-bold">{type.label}</span>
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    type.active
                      ? "bg-[#7c3aed] text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {type.count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-purple-100 bg-white p-5 shadow-md">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-400">
          Tags
        </h2>
        <div className="space-y-3">
          {tags.map((tag) => (
            <button
              key={tag}
              className="flex w-full items-center gap-2 rounded-lg text-left text-sm font-semibold text-slate-500 transition hover:text-[#5e00b2]"
              type="button"
            >
              <Tag className="h-4 w-4 text-slate-300" />
              {tag}
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}

function ForumSlot({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-purple-200 bg-white/70 p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 shrink-0 rounded-xl bg-purple-100" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="h-4 w-32 rounded-full bg-slate-200" />
          <div className="h-5 w-full max-w-xl rounded-full bg-slate-100" />
          <div className="h-4 w-2/3 rounded-full bg-slate-100" />
        </div>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
    </div>
  );
}

export default function DaoForum({ dao }: DaoForumProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <ForumSidebar />

      <main className="min-w-0">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950 md:text-3xl">
              {dao.Name} Forum
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-slate-400">
              <span>
                <span className="text-slate-700">0</span> posts
              </span>
              <span>
                <span className="text-emerald-600">0</span> open votes
              </span>
              <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[#7c3aed]">
                0 unread
              </span>
            </div>
          </div>

          <button
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#8b5cf6] px-6 text-base font-bold text-white shadow-lg shadow-purple-300/50 transition hover:from-[#6d28d9] hover:to-[#7c3aed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c3aed] focus-visible:ring-offset-2"
            type="button"
          >
            <Plus className="h-5 w-5" />
            New Post
          </button>
        </div>

        <section className="mb-7">
          <div className="mb-3 inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-sm font-bold uppercase tracking-wide text-[#7c3aed]">
            Pinned
          </div>
          <div className="rounded-2xl bg-purple-100/50 p-4">
            <ForumSlot label="Pinned post slot" />
          </div>
        </section>

        <section>
          <div className="mb-5 border-b border-purple-100">
            <nav className="flex gap-6 overflow-x-auto">
              {sortTabs.map((tab, index) => (
                <button
                  key={tab}
                  className={`shrink-0 border-b-4 px-1 pb-3 text-sm font-bold transition ${
                    index === 0
                      ? "border-[#7c3aed] text-[#7c3aed]"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                  type="button"
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="space-y-4">
            <ForumSlot label="Forum post card slot" />
            <ForumSlot label="Forum post card slot" />
          </div>
        </section>
      </main>
    </div>
  );
}
