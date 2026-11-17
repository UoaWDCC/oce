# DAO forum setup and acceptance

This repository contains incremental forum migrations, not a complete bootstrap schema. Use a disposable staging database or a restored copy of OCE's schema before applying them. No database or storage configuration was changed by the cleanup branch.

## Required integration

The forum is mounted by `src/app/(with-navbar)/dao/[DAOID]/forum.tsx`. It needs the DAO's forum-group UUID, a Supabase session, and the application's React Query provider.

Feature code is under `src/features/chat-forum`:

- `components`: feed, thread, comments, polls, dialogs, and composers.
- `hooks`: authentication state, queries, mutations, editor state, uploads, and drafts.
- `contracts.ts`: API/data contracts; `types.ts`: thread/filter UI contracts.
- `server`: shared request parsing and post response/capability helpers.
- `lib`: content normalization, limits, reactions, editor formats, and async state.
- `services.ts`: browser API calls; `queryKeys.ts`: cache identity, including viewer and filter.

Next.js endpoints remain under `src/app/api/dao-forum` and `src/app/api/comments`. `types/dao-forum.ts` and `src/utils/forumContent.ts` are compatibility re-exports, not separate implementations. Development mock data is consumed by `/dev/chat-forum`, which returns 404 in production.

Use the environment variables in the main README. Service-role keys must remain server-only. Forum browser requests use relative `/api` URLs and Bearer tokens; upload and view tracking also call Supabase directly.

## Database prerequisites

Obtain the existing schema, indexes, triggers, grants, RLS policies, and storage policies from the database owner. In particular verify:

| Area             | Dependencies                                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| Identity         | Auth users, `AllowedUsers`, and `Student`; forum user IDs must match the IDs expected by their foreign keys |
| DAO mapping      | `DAO.DAOID`, `DAO.Members`, `dao_groups.dao_id`, and `dao_members`                                          |
| Forum content    | `posts`, `comments`, `tags`, and `post_tags` with the named relationships used in route selects             |
| Author display   | `Student.UID`, `Student.Wallet`, wallet addresses, and ENS labels                                           |
| Moderation       | The requested DAO's `Members.shamans` and authenticated student's wallets                                   |
| Legacy migration | `comment_likes` with existing rows before conversion to reactions                                           |

DAO discovery uses wallet membership, while several forum writes use `dao_members`. The repository does not establish a complete synchronization lifecycle for joins, removals, wallet changes, and shaman changes. This integration must be supplied and verified in OCE's database/application.

## Migration rehearsal and recovery

1. Record the deployed application SHA and database migration state. Take a restorable database backup and preserve storage assets separately.
2. Restore to staging. Confirm base tables and identity mapping before attempting incremental migrations.
3. Review the forum migrations in timestamp order: DAO/group linking, image bucket, post views, polls, then likes-to-reactions conversion. The message-favourite migration is chatbot-owned and is outside this cleanup.
4. Resolve the manual mapping/backfill assumptions in `20260714000000_link_dao_groups_to_dao.sql`. Do not run SQL intended for another schema or blindly replay already-applied migrations.
5. Before converting likes, record the count and unique `(comment_id, user_id)` pairs, including their timestamps. Rehearse the conversion in a transaction on staging, compare the resulting `heart` reaction pairs/timestamps, and verify the new enum, composite primary key, and index.
6. The conversion drops `comment_likes`. Retain its backup and validate all existing data before production approval. There is no tested reverse migration supplied here; do not recover by recreating an empty likes table.
7. Verify `record_post_view`, `create_forum_post_with_poll`, `get_forum_poll`, and `submit_forum_poll_vote`, including their grants and authorization paths. Poll creation/voting and view recording depend on these functions.
8. If rehearsal fails, restore the staging backup and diagnose the failed prerequisite. For production recovery, coordinate the compatible application version, restored database state, and storage assets with the database owner. Test that recovery procedure before scheduling deployment.

The reaction migration does not include its RLS/grants. Post author/shaman policies and the complete baseline schema are also not reproducible from these migrations alone. This document records prerequisites; it does not certify the database for production.

## Privacy and permission checks

Use separate author, ordinary member, shaman, other-DAO member, and non-member accounts. Exercise both application endpoints and direct Supabase access with each account's normal credentials.

- Verify that members see only the intended DAO's content and can react only as themselves.
- Verify author-only editing and comment deletion. A shaman may delete posts in their own DAO, including anonymous posts, but must not edit another author's content. A broad row-level UPDATE policy for shamans may also permit direct content edits; verify column privileges or an appropriately constrained database operation.
- Test the shaman lookup after role or wallet changes and when any lookup is denied or missing. Check database read permissions for the lookup tables.
- Test reactions against deleted comments and deleted parent posts. Application-level membership/deleted-parent checks for reactions remain deferred, so database protection must not be assumed.
- Verify that deleted posts cannot be read, edited, commented on, polled, or reacted to through any access path. Normal single-post endpoints now exclude deleted rows, but that is not a substitute for database protection.
- API post responses now redact anonymous author IDs while preserving ownership. Direct table access, existing uploaded URLs containing user IDs, and the public image bucket remain separate privacy risks. Agree the anonymity guarantee before launch.
- Image policy changes require a plan for existing assets and URLs, access revocation, and cleanup of assets belonging to deleted content. No privacy migration was attempted here.
- The poll route authorizes the actual post through RPCs but does not independently cross-check the DAO identifier in its URL. Cover mismatched DAO/post identifiers in integration testing.

## User acceptance checklist

- Publish each post type with formatting, with/without an image, and anonymously. Check ownership and moderator controls after refresh/account changes.
- Edit/delete your own post and comment. Delete a post as its DAO's shaman; reject the same operation from another DAO. Keep live replies nested beneath deleted comment placeholders.
- Add/remove each reaction; combine sorting, reaction type, and minimum-count filters. Check context ancestors, empty results, corrected counts, URL refresh, and browser back/forward.
- Create single/multiple-choice polls, change a vote, and check counts across accounts. Existing poll questions/options cannot be edited.
- Check read/unread state and unique view counts. Changes are request-based, not real-time notifications.
- Restore text/poll drafts in the same browser. Drafts do not synchronize between devices, and selected image files are not restored after reload.
- Test mobile and keyboard interactions, interrupted requests, expired sessions, failed saves/uploads, and retry behavior.
- Test expected launch data volumes. Feed/search and counts operate on loaded lists without pagination; database row caps may truncate results.
- Verify the production origin in shared middleware and run a Cloudflare build/preview. A passing Next.js build alone does not validate deployment bindings or live services.

The main UI can display pinned posts, but pin/unpin controls are not exposed. Reporting, bans, moderation history, shaman deletion of individual comments, and automatic incoming updates are outside the implemented feature set.

## Local checks

Before committing each cleanup step, run the full test suite, lint/format checks, the production build, and TypeScript. Run TypeScript after the build, since the build recreates `.next/types`.

```sh
npx vitest run
npm run lint
npm run build
npx tsc --noEmit --incremental false
git diff --check
```

These checks validate the repository, not the live service and browser acceptance checklist above.
