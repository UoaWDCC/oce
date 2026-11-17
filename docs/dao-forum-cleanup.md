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

## Remaining steps

5. Consolidate editor commands/content handling; defer a full editor replacement if it needs new dependencies or extensive interaction testing.
6. Update forum API/setup documentation and record remaining database/privacy/deployment work. Remove only forum-owned development residue; leave shared repository cleanup out of this branch.

## Verification limits

Automated tests use mocked services. They do not verify live Supabase RLS, storage policies, wallet-to-membership synchronization, migrations against an existing database, or deployed browser behavior. No live data, policies, or storage buckets are changed by this cleanup.
