// @vitest-environment node

import { readdirSync } from "node:fs";
import { sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SITE_GUIDE } from "@/features/chatbot/server/knowledge/siteGuide";

const appDirectory = fileURLToPath(new URL("../src/app/", import.meta.url));
const implementedPageRoutes = readdirSync(appDirectory, {
  recursive: true,
  encoding: "utf8",
})
  .filter((file) => /(?:^|[/\\])page\.(?:js|jsx|ts|tsx)$/.test(file))
  .map((file) => {
    const segments = file
      .split(sep)
      .slice(0, -1)
      .filter((segment) => !/^\(.+\)$/.test(segment));
    return `/${segments.join("/")}`;
  });

describe("AI Tutor platform navigation guide", () => {
  it.each(SITE_GUIDE.filter((entry) => entry.relatedPageIds))(
    "references verified parent or entry pages for $id",
    (entry) => {
      for (const id of entry.relatedPageIds!) {
        const page = SITE_GUIDE.find((candidate) => candidate.id === id);

        expect(page?.path).toBeDefined();
        const nextRoute = page!.path!.replace(/\{([^}]+)\}/g, "[$1]");
        expect(implementedPageRoutes).toContain(nextRoute);
      }
    },
  );

  it.each(SITE_GUIDE.filter((entry) => entry.path))(
    "references an implemented page route for $id: $path",
    (entry) => {
      const nextRoute = entry.path!.replace(/\{([^}]+)\}/g, "[$1]");

      expect(implementedPageRoutes).toContain(nextRoute);
    },
  );

  it.each([
    "learning-modules",
    "ai-tutor",
    "ai-tutor-fullscreen",
    "ai-tutor-conversation-management",
    "ai-tutor-response-actions",
    "ask-a-tutor",
    "dao-forum",
  ])("keeps the tab, panel, or widget feature %s without a route", (id) => {
    const entry = SITE_GUIDE.find((guideEntry) => guideEntry.id === id);

    expect(entry).toBeDefined();
    expect(entry?.path).toBeUndefined();
  });
});
