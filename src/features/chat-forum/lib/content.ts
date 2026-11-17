const HTML_BLOCK_END = /<\/(?:div|h[1-6]|li|ol|p|ul)>/gi;
const HTML_BREAK = /<br\s*\/?>/gi;
const HTML_TAG = /<[^>]*>/g;
const ZERO_WIDTH = /[\u200B-\u200D\uFEFF]/g;
const TRAILING_EMPTY_BLOCKS =
  /(?:<(p|div)\b[^>]*>(?:(?:\s|\u200B|\u200C|\u200D|\uFEFF|&nbsp;|&#160;|&#x0*a0;)|<br\s*\/?>)*<\/\1>\s*)+$/gi;

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([\da-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    );
}

export function forumContentToPlainText(content: string): string {
  return decodeHtmlEntities(
    content
      .replace(HTML_BREAK, "\n")
      .replace(HTML_BLOCK_END, "\n")
      .replace(HTML_TAG, "")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/(^|\n)\s*[-+*]\s+/g, "$1")
      .replace(/\*\*([\s\S]*?)\*\*/g, "$1")
      .replace(/__([\s\S]*?)__/g, "$1")
      .replace(/\*([\s\S]*?)\*/g, "$1")
      .replace(/_([\s\S]*?)_/g, "$1")
      .replace(/^\s*(?:\*{3,}|-{3,}|_{3,})\s*$/gm, ""),
  )
    .replace(ZERO_WIDTH, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function hasMeaningfulForumContent(content: unknown): content is string {
  return (
    typeof content === "string" && forumContentToPlainText(content).length > 0
  );
}

export function hasValidPostTitle(title: unknown): boolean {
  return typeof title === "string" && normalizePostTitle(title).length > 0;
}

export function normalizePostTitle(title: string): string {
  return title.trim();
}

export function trimTrailingEmptyParagraphs(content: string): string {
  return content.trim().replace(TRAILING_EMPTY_BLOCKS, "").trimEnd();
}
