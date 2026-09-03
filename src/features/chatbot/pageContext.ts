export const MAX_PAGE_CONTEXT_PATH_LENGTH = 200;

export type PageContextRequest = {
  path: string;
};

export type CanonicalPageContextPath =
  | "/login"
  | "/register"
  | "/end-user-licence-agreement"
  | "/portal"
  | "/dao"
  | "/dao/class-daos"
  | "/dao/{DAOID}";

export type NormalizePageContextPathResult =
  | { status: "malformed" }
  | { status: "unsupported" }
  | { status: "normalized"; path: CanonicalPageContextPath };

const STATIC_PATHS = new Set<CanonicalPageContextPath>([
  "/login",
  "/register",
  "/end-user-licence-agreement",
  "/portal",
  "/dao",
  "/dao/class-daos",
]);

const DAO_DETAILS_PATH: CanonicalPageContextPath = "/dao/{DAOID}";
const LEGACY_DAO_LIST_PATH = "/dao/dao-details";
const RESERVED_DAO_SEGMENTS = new Set(["class-daos", "create", "dao-details"]);
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;
const DAO_IDENTIFIER_PATTERN = /^0x[0-9a-fA-F]{40}$/;

/**
 * Converts a local application pathname into a supported canonical page path.
 * It intentionally does not accept URLs, query strings, fragments, or page data.
 */
export function normalizePageContextPath(
  pathname: string,
): NormalizePageContextPathResult {
  if (
    pathname.length === 0 ||
    pathname.length > MAX_PAGE_CONTEXT_PATH_LENGTH ||
    CONTROL_CHARACTER_PATTERN.test(pathname)
  ) {
    return { status: "malformed" };
  }

  const trimmedPath = pathname.trim();

  if (
    trimmedPath.length === 0 ||
    !trimmedPath.startsWith("/") ||
    trimmedPath.startsWith("//") ||
    trimmedPath.includes("?") ||
    trimmedPath.includes("#") ||
    trimmedPath.includes("\\") ||
    trimmedPath.includes("%") ||
    /\s/.test(trimmedPath)
  ) {
    return { status: "malformed" };
  }

  const segments = trimmedPath.split("/").slice(1);
  if (segments.some((segment) => segment === "." || segment === "..")) {
    return { status: "malformed" };
  }

  if (STATIC_PATHS.has(trimmedPath as CanonicalPageContextPath)) {
    return {
      status: "normalized",
      path: trimmedPath as CanonicalPageContextPath,
    };
  }

  if (trimmedPath === LEGACY_DAO_LIST_PATH) {
    return { status: "normalized", path: "/dao" };
  }

  if (trimmedPath === DAO_DETAILS_PATH) {
    return { status: "normalized", path: DAO_DETAILS_PATH };
  }

  if (
    segments.length === 2 &&
    segments[0] === "dao" &&
    segments[1].length > 0 &&
    !RESERVED_DAO_SEGMENTS.has(segments[1]) &&
    DAO_IDENTIFIER_PATTERN.test(segments[1])
  ) {
    return { status: "normalized", path: DAO_DETAILS_PATH };
  }

  return { status: "unsupported" };
}
