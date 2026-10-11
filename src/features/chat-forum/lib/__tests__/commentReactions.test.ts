import { describe, expect, it } from "vitest";
import type { ReactionCounts } from "@app-types/dao-forum";
import {
  compareComments,
  filterCommentsWithAncestors,
  isCommentFilterActive,
  matchesCommentFilter,
  parseCommentSort,
  parseMinReactions,
  parseReactionFilterType,
  reactionCountFor,
  readCommentViewParams,
  totalReactions,
  writeCommentViewParams,
} from "../commentReactions";

function counts(overrides: Partial<ReactionCounts> = {}): ReactionCounts {
  return { heart: 0, thumbs_up: 0, fire: 0, thumbs_down: 0, ...overrides };
}

function comment(
  id: string,
  overrides: {
    parent?: string | null;
    createdAt?: string;
    deleted?: boolean;
    reactions?: Partial<ReactionCounts>;
  } = {},
) {
  return {
    id,
    parent_comment_id: overrides.parent ?? null,
    created_at: overrides.createdAt ?? "2026-01-01T00:00:00Z",
    deleted_at: overrides.deleted ? "2026-01-02T00:00:00Z" : null,
    reaction_counts: counts(overrides.reactions),
  };
}

describe("reaction counts", () => {
  it("totals every supported reaction type", () => {
    expect(
      totalReactions(
        counts({ heart: 1, fire: 2, thumbs_up: 1, thumbs_down: 3 }),
      ),
    ).toBe(7);
    expect(totalReactions(undefined)).toBe(0);
  });

  it("reads one reaction type or the aggregate", () => {
    const value = counts({ heart: 1, fire: 2 });
    expect(reactionCountFor(value, "fire")).toBe(2);
    expect(reactionCountFor(value, "all")).toBe(3);
  });
});

describe("matchesCommentFilter", () => {
  it("matches comments meeting the minimum for the selected type", () => {
    const filter = { reaction: "fire" as const, minCount: 2 };
    expect(matchesCommentFilter(counts({ fire: 0 }), filter)).toBe(false);
    expect(matchesCommentFilter(counts({ fire: 2 }), filter)).toBe(true);
    expect(matchesCommentFilter(counts({ fire: 5 }), filter)).toBe(true);
  });

  it("requires at least one of a specific reaction even at a minimum of 0", () => {
    const filter = { reaction: "fire" as const, minCount: 0 };
    expect(matchesCommentFilter(counts({ heart: 3 }), filter)).toBe(false);
    expect(matchesCommentFilter(counts({ fire: 1 }), filter)).toBe(true);
  });

  it("uses the aggregate count for all reactions", () => {
    expect(
      matchesCommentFilter(counts({ heart: 1, fire: 2, thumbs_up: 1 }), {
        reaction: "all",
        minCount: 4,
      }),
    ).toBe(true);
  });

  it("treats all reactions with a minimum of 0 as no filter", () => {
    const filter = { reaction: "all" as const, minCount: 0 };
    expect(isCommentFilterActive(filter)).toBe(false);
    expect(matchesCommentFilter(counts(), filter)).toBe(true);
  });
});

describe("compareComments", () => {
  it("orders most reacted by total reactions", () => {
    const sorted = [
      comment("a", { reactions: { heart: 2 } }),
      comment("b", { reactions: { heart: 3, fire: 4 } }),
      comment("c", { reactions: { thumbs_up: 4 } }),
    ].sort(compareComments("most_reacted"));

    expect(sorted.map((c) => totalReactions(c.reaction_counts))).toEqual([
      7, 4, 2,
    ]);
  });

  it("breaks equal totals newest first, then by id", () => {
    const input = [
      comment("old", {
        createdAt: "2026-01-01T00:00:00Z",
        reactions: { heart: 2 },
      }),
      comment("new", {
        createdAt: "2026-01-03T00:00:00Z",
        reactions: { fire: 2 },
      }),
      comment("b-same", {
        createdAt: "2026-01-02T00:00:00Z",
        reactions: { heart: 2 },
      }),
      comment("a-same", {
        createdAt: "2026-01-02T00:00:00Z",
        reactions: { heart: 2 },
      }),
    ];
    const first = [...input].sort(compareComments("most_reacted"));
    const second = [...input].reverse().sort(compareComments("most_reacted"));

    expect(first.map((c) => c.id)).toEqual(["new", "b-same", "a-same", "old"]);
    expect(second.map((c) => c.id)).toEqual(first.map((c) => c.id));
  });

  it("keeps oldest and latest ordering by creation time", () => {
    const input = [
      comment("2", { createdAt: "2026-01-02T00:00:00Z" }),
      comment("1", { createdAt: "2026-01-01T00:00:00Z" }),
      comment("3", { createdAt: "2026-01-03T00:00:00Z" }),
    ];
    expect([...input].sort(compareComments("oldest")).map((c) => c.id)).toEqual(
      ["1", "2", "3"],
    );
    expect([...input].sort(compareComments("latest")).map((c) => c.id)).toEqual(
      ["3", "2", "1"],
    );
  });
});

describe("filterCommentsWithAncestors", () => {
  it("keeps a non-matching parent as context for a matching reply", () => {
    const result = filterCommentsWithAncestors(
      [
        comment("parent", { reactions: { heart: 1 } }),
        comment("reply", { parent: "parent", reactions: { fire: 2 } }),
        comment("other", { reactions: { heart: 4 } }),
      ],
      { reaction: "fire", minCount: 1 },
    );

    expect(result.map((c) => [c.id, c.is_context_only])).toEqual([
      ["parent", true],
      ["reply", false],
    ]);
  });

  it("keeps the full ancestor chain, including deleted ancestors", () => {
    const result = filterCommentsWithAncestors(
      [
        comment("root", { deleted: true }),
        comment("middle", { parent: "root", deleted: true }),
        comment("leaf", { parent: "middle", reactions: { heart: 1 } }),
      ],
      { reaction: "heart", minCount: 1 },
    );

    expect(result.map((c) => [c.id, c.is_context_only])).toEqual([
      ["root", false],
      ["middle", false],
      ["leaf", false],
    ]);
  });

  it("drops deleted comments that no kept reply depends on", () => {
    const result = filterCommentsWithAncestors(
      [
        comment("deleted", { deleted: true, reactions: { heart: 5 } }),
        comment("live"),
      ],
      { reaction: "all", minCount: 0 },
    );

    expect(result.map((c) => c.id)).toEqual(["live"]);
  });

  it("returns nothing when no comment matches", () => {
    expect(
      filterCommentsWithAncestors([comment("a"), comment("b")], {
        reaction: "fire",
        minCount: 1,
      }),
    ).toEqual([]);
  });
});

describe("query parsing", () => {
  it("defaults missing values", () => {
    expect(parseCommentSort(null)).toBe("oldest");
    expect(parseReactionFilterType(null)).toBe("all");
    expect(parseMinReactions(null)).toBe(0);
  });

  it("accepts supported values", () => {
    expect(parseCommentSort("most_reacted")).toBe("most_reacted");
    expect(parseReactionFilterType("thumbs_down")).toBe("thumbs_down");
    expect(parseMinReactions("12")).toBe(12);
  });

  it.each(["most_likes", "random", ""])("rejects sort %j", (value) => {
    expect(parseCommentSort(value)).toBeNull();
  });

  it.each(["laugh", "HEART", ""])("rejects reaction %j", (value) => {
    expect(parseReactionFilterType(value)).toBeNull();
  });

  it.each(["-1", "abc", "2.5", "", " 2", "1e3", "99999999999999999999"])(
    "rejects min_reactions %j",
    (value) => {
      expect(parseMinReactions(value)).toBeNull();
    },
  );
});

describe("comment view URL params", () => {
  it("reads defaults from an empty URL", () => {
    expect(readCommentViewParams(new URLSearchParams(), "latest")).toEqual({
      sort: "latest",
      filter: { reaction: "all", minCount: 0 },
    });
  });

  it("reads a shared link", () => {
    expect(
      readCommentViewParams(
        new URLSearchParams(
          "commentSort=most_reacted&reaction=fire&minReactions=2",
        ),
        "latest",
      ),
    ).toEqual({
      sort: "most_reacted",
      filter: { reaction: "fire", minCount: 2 },
    });
  });

  it("falls back to defaults for unsupported values", () => {
    expect(
      readCommentViewParams(
        new URLSearchParams(
          "commentSort=most_likes&reaction=laugh&minReactions=-3",
        ),
        "latest",
      ),
    ).toEqual({
      sort: "latest",
      filter: { reaction: "all", minCount: 0 },
    });
  });

  it("writes only non-default values and keeps unrelated params", () => {
    const params = writeCommentViewParams(
      new URLSearchParams("tab=forum&reaction=heart"),
      { sort: "most_reacted", filter: { reaction: "all", minCount: 3 } },
      "latest",
    );

    expect(params.toString()).toBe(
      "tab=forum&commentSort=most_reacted&minReactions=3",
    );
  });
});
