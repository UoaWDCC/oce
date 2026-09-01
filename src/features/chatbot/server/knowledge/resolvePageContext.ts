import {
  normalizePageContextPath,
  type CanonicalPageContextPath,
} from "@/features/chatbot/pageContext";
import { SITE_GUIDE } from "@/features/chatbot/server/knowledge/siteGuide";

export type ResolvedPageContext = {
  path: CanonicalPageContextPath;
  title: string;
};

export type ResolvePageContextResult =
  | { status: "absent" }
  | { status: "malformed" }
  | { status: "unsupported" }
  | { status: "resolved"; context: ResolvedPageContext };

export function resolvePageContext(input: unknown): ResolvePageContextResult {
  if (input === undefined) {
    return { status: "absent" };
  }

  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    !Object.prototype.hasOwnProperty.call(input, "path")
  ) {
    return { status: "malformed" };
  }

  const path = (input as { path?: unknown }).path;
  if (typeof path !== "string") {
    return { status: "malformed" };
  }

  const normalized = normalizePageContextPath(path);
  if (normalized.status !== "normalized") {
    return normalized;
  }

  const guideEntry = SITE_GUIDE.find((entry) => entry.path === normalized.path);

  if (!guideEntry) {
    return { status: "unsupported" };
  }

  return {
    status: "resolved",
    context: {
      path: normalized.path,
      title: guideEntry.title,
    },
  };
}
