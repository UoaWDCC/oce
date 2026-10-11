import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  readCommentViewParams,
  writeCommentViewParams,
  type ForumCommentView,
} from "../lib/commentReactions";
import type { ForumCommentFilter, ForumThreadSort } from "../types";

/**
 * Keeps the thread's sort and reaction filter in the page URL. The URL is
 * the only source of truth, so the controls, the comments query and the
 * browser's back and forward buttons all stay in step.
 */
export function useCommentViewSearchParams(
  defaultSort: ForumThreadSort = "latest",
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const view = useMemo(
    () => readCommentViewParams(searchParams, defaultSort),
    [searchParams, defaultSort],
  );

  const navigate = useCallback(
    (next: ForumCommentView, mode: "push" | "replace") => {
      const query = writeCommentViewParams(
        new URLSearchParams(searchParams.toString()),
        next,
        defaultSort,
      ).toString();
      router[mode](query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [router, pathname, searchParams, defaultSort],
  );

  const setSort = useCallback(
    (sort: ForumThreadSort) => navigate({ ...view, sort }, "push"),
    [navigate, view],
  );

  // Typing a minimum count changes it once per keystroke, so those edits
  // replace the current entry instead of filling the back button history.
  const setFilter = useCallback(
    (filter: ForumCommentFilter) =>
      navigate(
        { ...view, filter },
        filter.reaction === view.filter.reaction ? "replace" : "push",
      ),
    [navigate, view],
  );

  return { sort: view.sort, filter: view.filter, setSort, setFilter };
}
