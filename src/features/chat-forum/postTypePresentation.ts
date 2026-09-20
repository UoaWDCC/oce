import {
  BookOpen,
  HelpCircle,
  Lightbulb,
  Megaphone,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import { POST_TYPE, type PostType } from "@app-types/dao-forum";

/**
 * Single source of truth for how each post type is presented across the forum.
 *
 * Filters, the composer, cards, tags, and thread headers all read from here so
 * a post type looks the same everywhere it appears. Because this is a
 * `Record<PostType, ...>`, adding a new post type to `POST_TYPE` fails to
 * compile until its presentation is defined below.
 */
export type PostTypePresentation = {
  /** Human-readable name shown next to the icon. */
  label: string;
  icon: LucideIcon;
  /** Pill styling for the `Tag` badge on cards and thread headers. */
  badge: string;
  /** Solid icon-tile styling for the composer's post type picker. */
  selection: string;
  /** Tinted icon-tile styling for the post type filter list. */
  filter: string;
};

export const POST_TYPE_PRESENTATION: Record<PostType, PostTypePresentation> = {
  [POST_TYPE.Announcement]: {
    label: "Announcement",
    icon: Megaphone,
    badge: "bg-amber-50 text-amber-800 border border-amber-600",
    selection: "bg-amber-400",
    filter: "bg-amber-100 text-amber-700",
  },
  [POST_TYPE.Proposal]: {
    label: "Proposal",
    icon: Lightbulb,
    badge: "bg-sky-50 text-sky-800 border border-sky-600",
    selection: "bg-sky-400",
    filter: "bg-sky-100 text-sky-700",
  },
  [POST_TYPE.Question]: {
    label: "Question",
    icon: HelpCircle,
    badge: "bg-rose-50 text-rose-800 border border-rose-600",
    selection: "bg-rose-400",
    filter: "bg-rose-100 text-rose-700",
  },
  [POST_TYPE.Discussion]: {
    label: "Discussion",
    icon: MessageCircle,
    badge: "bg-purple-50 text-purple-800 border border-purple-400",
    selection: "bg-purple-400",
    filter: "bg-purple-100 text-purple-700",
  },
  [POST_TYPE.Resource]: {
    label: "Resource",
    icon: BookOpen,
    badge: "bg-emerald-50 text-emerald-800 border border-emerald-600",
    selection: "bg-emerald-400",
    filter: "bg-emerald-100 text-emerald-700",
  },
};

/** Post types in the order they should be offered to users. */
export const POST_TYPES_IN_ORDER = Object.values(POST_TYPE);

export function getPostTypePresentation(type: PostType): PostTypePresentation {
  return POST_TYPE_PRESENTATION[type];
}
