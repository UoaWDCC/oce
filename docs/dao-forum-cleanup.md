# DAO forum cleanup

Branch: `fix/clean-up-DAO-forum`. Each numbered step is committed separately after functionality checks. Scope is the DAO forum and its integration points; shared application configuration and chatbot behavior are excluded.

## 1. Feature structure

Moved forum-specific UI from `src/components/dao-forum` into `src/features/chat-forum/components`, renamed `Post` to `PostCard`, and updated application, preview, and test imports. Canonical API/data contracts now live in the feature's `contracts.ts`. `types/dao-forum.ts` remains a compatibility re-export for existing integrations.

Validation: full Vitest suite, TypeScript, lint/format, and production build before commit.

## 2. Thread components

Extracted `ThreadComment`, `ForumPollCard`, `CommentViewMenu`, and shared content rendering from `PostThread`. Reaction presentation constants and the feature's class-name helper are shared instead of copied. The thread retains orchestration, deletion recovery, and the corrected live-comment count. Existing UI behavior and service boundaries are unchanged.

Validation: full Vitest suite, lint/format, production build, and TypeScript before commit.

## Remaining steps

3. Standardize bounded API validation and response behavior; document larger authorization/database changes rather than changing unverified production policies.
4. Remove unused service code, redundant error handling, and leftover like terminology.
5. Consolidate editor commands/content handling; defer a full editor replacement if it needs new dependencies or extensive interaction testing.
6. Update forum API/setup documentation and record remaining database/privacy/deployment work. Remove only forum-owned development residue; leave shared repository cleanup out of this branch.

## Verification limits

Automated tests use mocked services. They do not verify live Supabase RLS, storage policies, wallet-to-membership synchronization, migrations against an existing database, or deployed browser behavior. No live data, policies, or storage buckets are changed by this cleanup.
