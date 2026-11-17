# DAO forum cleanup

Branch: `fix/clean-up-DAO-forum`. Each numbered step is committed separately after functionality checks. Scope is the DAO forum and its integration points; shared application configuration and chatbot behavior are excluded.

## 1. Feature structure

Moved forum-specific UI from `src/components/dao-forum` into `src/features/chat-forum/components`, renamed `Post` to `PostCard`, and updated application, preview, and test imports. Canonical API/data contracts now live in the feature's `contracts.ts`. `types/dao-forum.ts` remains a compatibility re-export for existing integrations.

Validation: full Vitest suite, TypeScript, lint/format, and production build before commit.

## 2. Thread components

Extracted `ThreadComment`, `ForumPollCard`, `CommentViewMenu`, and shared content rendering from `PostThread`. Reaction presentation constants and the feature's class-name helper are shared instead of copied. The thread retains orchestration, deletion recovery, and the corrected live-comment count. Existing UI behavior and service boundaries are unchanged.

Validation: full Vitest suite, lint/format, production build, and TypeScript before commit.

## 3. API consistency

Shared CORS construction and JSON-object parsing across forum routes; malformed JSON, null, arrays, and scalar request bodies now return controlled 400 errors. Post types, boolean flags, and image field types are validated before writes. Shared post capability and redaction helpers keep moderation separate from ownership and redact anonymous author IDs from single-post and mutation responses. Single-post reads/edits/deletion exclude deleted rows; updates also include that condition to handle deletion races. The API contract reflects nullable anonymous author IDs.

Validation: regression tests for invalid request envelopes across five write routes, invalid post field types, anonymous ownership/redaction, and deleted-post reads/edits; existing author/shaman, reaction, poll, and comment tests; full suite, lint/format, production build, and TypeScript before commit.

Deferred: a complete authorization/RLS audit, reaction membership/deleted-parent enforcement, private image storage and existing URL migration, and a replacement of every database error with a new public error contract. These require database integration tests and coordinated client behavior, beyond this bounded cleanup. API redaction does not make public images or direct database reads anonymous.

## 4. Unused code and terminology

Removed the unused `getOnePost` client wrapper (the documented API route remains available), a catch-and-rethrow block, copied class-name helpers, and stale implementation comments. Renamed remaining client error/cache helper names and the heart-reaction test file to describe reactions rather than the retired likes feature. Kept the heart-reaction tests because their failure-path coverage is useful.

Validation: full Vitest suite, lint/format, production build, and TypeScript before commit.

## 5. Editor/content boundary

Moved selection tracking, formatting, paste handling, content hydration, and clearing into `useForumEditor`. The toolbar and hook share a canonical format type/command map. Forum content normalization now lives under the feature; the old utility path remains a compatibility re-export. Added interaction coverage for editing existing content, draft changes, formatted submission, failed-save retention, all toolbar commands, and plain-text paste.

Validation: editor interaction tests plus the full suite, lint/format, production build, and TypeScript before commit.

Deferred: replacing `document.execCommand`/`queryCommandState` and introducing a new editor document format. That is a separate migration needing browser selection/undo, touch/keyboard, paste, sanitization, and existing-content compatibility testing. This cleanup isolates those APIs but deliberately retains their behavior and the existing sanitized display renderer. It is not a new storage sanitizer or a cross-browser acceptance result.

## 6. Forum documentation and hygiene

Updated OpenAPI for the reaction routes, filters, anonymous/ownership/moderation fields, polls, and current authentication/deletion behavior. Updated the README's forum structure and behavior. Added `dao-forum-database.md` with baseline schema prerequisites, migration/backfill and likes-conversion rehearsal, recovery expectations, direct database permission checks, and user acceptance checks.

Removed the now-unused forum directory placeholder in step 1. The forum development preview remains production-guarded. Shared `.DS_Store` files, `supabase/.temp`, duplicate Next configurations, middleware production origins, and CI/deployment configuration are intentionally untouched because they are application-wide, not forum-owned.

Validation: parse OpenAPI and resolve local schema references; confirm non-forum routes/schemas are unchanged; full tests, lint/format, production build, and TypeScript before commit.

## Check results

Every row also passed full lint (including formatting), the Next.js production build, TypeScript, and whitespace checks before its commit. Existing application-wide React hook warnings remain non-blocking.

| Step               | Commit      | Tests      |
| ------------------ | ----------- | ---------- |
| 1. Structure       | `7f0547fe5` | 684 passed |
| 2. Components      | `539acf2dd` | 684 passed |
| 3. API             | `0d4bc097b` | 717 passed |
| 4. Dead code       | `ea732aa00` | 717 passed |
| 5. Editor boundary | `81dd490a5` | 725 passed |
| 6. Documentation   | This commit | 725 passed |

## Deferred follow-up

These are remaining work, not functionality certified by this cleanup:

- Database/RLS/grants verification, complete schema packaging, and membership synchronization.
- Reaction membership and deleted-parent enforcement across endpoints and direct database access.
- Image anonymity/privacy and migration of existing assets and URLs.
- Pagination/database aggregation and launch-volume testing.
- Rich editor replacement, browser selection/undo testing, and a coordinated stored-content/sanitization migration.
- Cross-device drafts and draft image restoration.
- Poll URL DAO/post consistency checks and existing poll editing, if required.
- Shared production origins, Cloudflare preview/deployment, CI, shared metadata, and application-wide configuration cleanup.

See [setup and acceptance](dao-forum-database.md) for validation steps and dependency details. These follow-ups require broader integration decisions or live services and were left out to keep this cleanup bounded.

## Verification limits

Automated tests use mocked services. They do not verify live Supabase RLS, storage policies, wallet-to-membership synchronization, migrations against an existing database, or deployed browser behavior. No live data, policies, or storage buckets are changed by this cleanup.
