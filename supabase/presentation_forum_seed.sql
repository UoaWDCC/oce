-- Presentation-ready DAO forum data.
--
-- Before running this file in the Supabase SQL editor:
--   1. Apply the forum poll and post_views migrations.
--   2. Replace the DAO name and login below with real database values.
--
-- The login can be either the Email or username of an existing AllowedUsers row.
-- That user must already be a member of the selected DAO. Posts 4 and 7 are
-- assigned to this user so their edit/delete actions appear during the demo.
--
-- WARNING: This script permanently deletes every existing post and comment in
-- the selected DAO before inserting the presentation data. Other DAOs are not
-- affected. Run it only against the intended presentation DAO.

BEGIN;

DO $presentation_seed$
DECLARE
  v_dao_name text := 'WDCC DAO';
  v_owner_login text := 'REPLACE_WITH_YOUR_EMAIL_OR_USERNAME';

  v_dao_group_id uuid;
  v_owner_id uuid;
  v_second_author_id uuid;
  v_third_author_id uuid;
  v_matching_dao_count integer;
  v_post_ids uuid[] := ARRAY[
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000006',
    '10000000-0000-4000-8000-000000000007',
    '10000000-0000-4000-8000-000000000008',
    '10000000-0000-4000-8000-000000000009'
  ]::uuid[];
BEGIN
  IF v_owner_login = 'REPLACE_WITH_YOUR_EMAIL_OR_USERNAME' THEN
    RAISE EXCEPTION 'Set v_owner_login at the top of presentation_forum_seed.sql before running it';
  END IF;

  IF to_regclass('public.forum_polls') IS NULL THEN
    RAISE EXCEPTION 'Apply 20260820000000_add_forum_polls.sql before running this seed';
  END IF;

  SELECT count(*)
  INTO v_matching_dao_count
  FROM public.dao_groups
  WHERE lower(name) = lower(v_dao_name);

  IF v_matching_dao_count <> 1 THEN
    RAISE EXCEPTION 'Expected one DAO group named %, found %', v_dao_name, v_matching_dao_count;
  END IF;

  SELECT id
  INTO v_dao_group_id
  FROM public.dao_groups
  WHERE lower(name) = lower(v_dao_name);

  SELECT allowed_user.id
  INTO v_owner_id
  FROM public."AllowedUsers" AS allowed_user
  INNER JOIN public.dao_members AS member
    ON member.user_id = allowed_user.id
   AND member.dao_group_id = v_dao_group_id
  WHERE lower(coalesce(allowed_user."Email", '')) = lower(v_owner_login)
     OR lower(allowed_user.username) = lower(v_owner_login)
  ORDER BY
    CASE
      WHEN lower(coalesce(allowed_user."Email", '')) = lower(v_owner_login) THEN 0
      ELSE 1
    END
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION '% is not an AllowedUsers member of %', v_owner_login, v_dao_name;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM auth.users AS auth_user WHERE auth_user.id = v_owner_id
  ) THEN
    RAISE EXCEPTION 'The selected owner has AllowedUsers.id %, but no matching Supabase Auth UID. Choose an account where these IDs match so edit/delete and poll actions work.', v_owner_id;
  END IF;

  SELECT member.user_id
  INTO v_second_author_id
  FROM public.dao_members AS member
  WHERE member.dao_group_id = v_dao_group_id
    AND member.user_id <> v_owner_id
  ORDER BY member.user_id
  LIMIT 1;

  SELECT member.user_id
  INTO v_third_author_id
  FROM public.dao_members AS member
  WHERE member.dao_group_id = v_dao_group_id
    AND member.user_id NOT IN (v_owner_id, coalesce(v_second_author_id, v_owner_id))
  ORDER BY member.user_id
  LIMIT 1;

  v_second_author_id := coalesce(v_second_author_id, v_owner_id);
  v_third_author_id := coalesce(v_third_author_id, v_second_author_id);

  -- Permanently clear the selected DAO's forum. Dependencies must be removed
  -- before posts because the current foreign keys do not all cascade deletes.
  DELETE FROM public.comment_reactions
  WHERE comment_id IN (
    SELECT comment.id
    FROM public.comments AS comment
    INNER JOIN public.posts AS post ON post.id = comment.post_id
    WHERE post.dao_group_id = v_dao_group_id
  );

  DELETE FROM public.comments
  WHERE post_id IN (
    SELECT id FROM public.posts WHERE dao_group_id = v_dao_group_id
  );

  DELETE FROM public.post_views
  WHERE post_id IN (
    SELECT id FROM public.posts WHERE dao_group_id = v_dao_group_id
  );

  DELETE FROM public.post_tags
  WHERE post_id IN (
    SELECT id FROM public.posts WHERE dao_group_id = v_dao_group_id
  );

  -- forum_polls, forum_poll_options and forum_poll_votes cascade from posts.
  DELETE FROM public.posts WHERE dao_group_id = v_dao_group_id;

  INSERT INTO public.posts (
    id, dao_group_id, author_id, post_type, title, body, anonymous,
    is_pinned, image_url, created_at, updated_at, deleted_at
  ) VALUES
    (
      v_post_ids[1], v_dao_group_id, v_second_author_id, 'Announcement',
      'Welcome to the Semester 2 DAO Forum',
      '<p>Welcome back! Use this space to share proposals, ask questions and keep up with community decisions throughout the semester.</p>',
      false, true, null, now() - interval '12 days', null, null
    ),
    (
      v_post_ids[2], v_dao_group_id, v_third_author_id, 'Proposal',
      'Proposal: Monthly Builder Bounties',
      '<p>Set aside a small monthly pool for member-led tools, research and community improvements. Each bounty would have a clear scope and reviewer.</p>',
      false, false, null, now() - interval '8 days', null, null
    ),
    (
      v_post_ids[3], v_dao_group_id, v_second_author_id, 'Question',
      'Which workshop should we run next?',
      '<p>Help shape the next community workshop by voting for the topic that would be most useful to you.</p>',
      false, false, null, now() - interval '5 days', null, null
    ),
    (
      v_post_ids[4], v_dao_group_id, v_owner_id, 'Discussion',
      'Improving Our New Member Onboarding',
      '<p>What would have made your first week in the DAO easier? I would love ideas for a clearer welcome flow and better ways to meet contributors.</p>',
      false, false, null, now() - interval '3 days', null, null
    ),
    (
      v_post_ids[5], v_dao_group_id, v_third_author_id, 'Resource',
      'Sepolia Testing Resources',
      '<p>A practical collection of faucet, explorer and wallet setup links for anyone testing contracts or governance flows on Sepolia.</p>',
      false, false, null, now() - interval '2 days 8 hours', null, null
    ),
    (
      v_post_ids[6], v_dao_group_id, v_second_author_id, 'Announcement',
      'Governance Call — Thursday at 6 PM',
      '<p>This week we will review active proposals, treasury updates and upcoming contributor opportunities. Everyone is welcome.</p>',
      false, false, null, now() - interval '1 day 9 hours', null, null
    ),
    (
      v_post_ids[7], v_dao_group_id, v_owner_id, 'Question',
      'How Should We Document Proposal Outcomes?',
      '<p>Should every completed proposal have a short outcome summary covering the decision, implementation and lessons learned?</p>',
      false, false, null, now() - interval '18 hours', null, null
    ),
    (
      v_post_ids[8], v_dao_group_id, v_third_author_id, 'Proposal',
      'A Clearer Monthly Treasury Update',
      '<p>I propose a consistent monthly treasury update so members can quickly understand balances, spending and upcoming commitments.</p>',
      false, false, null, now() - interval '9 hours', null, null
    ),
    (
      v_post_ids[9], v_dao_group_id, v_second_author_id, 'Resource',
      'Share Your Favourite Web3 Learning Resource',
      '<p>Drop one article, course or tool that genuinely helped you understand DAOs, governance or smart contracts.</p>',
      true, false, null, now() - interval '3 hours', null, null
    );

  -- A single-choice workshop poll.
  INSERT INTO public.forum_polls (id, post_id, question, allow_multiple, created_at)
  VALUES (
    '20000000-0000-4000-8000-000000000001',
    v_post_ids[3],
    'Which topic should our next workshop cover?',
    false,
    now() - interval '5 days'
  );

  INSERT INTO public.forum_poll_options (id, poll_id, label, position) VALUES
    ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Writing your first smart contract', 0),
    ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'Understanding on-chain governance', 1),
    ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 'Designing a DAO treasury', 2),
    ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', 'Building with account abstraction', 3);

  -- A multiple-choice treasury poll.
  INSERT INTO public.forum_polls (id, post_id, question, allow_multiple, created_at)
  VALUES (
    '20000000-0000-4000-8000-000000000002',
    v_post_ids[8],
    'What should every treasury update include?',
    true,
    now() - interval '9 hours'
  );

  INSERT INTO public.forum_poll_options (id, poll_id, label, position) VALUES
    ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000002', 'Current balances', 0),
    ('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000002', 'Monthly spending', 1),
    ('30000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000002', 'Upcoming commitments', 2),
    ('30000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000002', 'Plain-language commentary', 3);

  -- Seed realistic poll totals from the DAO's existing members.
  WITH ranked_members AS (
    SELECT
      member.user_id,
      row_number() OVER (ORDER BY member.user_id) AS member_number
    FROM public.dao_members AS member
    WHERE member.dao_group_id = v_dao_group_id
    LIMIT 8
  )
  INSERT INTO public.forum_poll_votes (poll_id, option_id, voter_id, created_at)
  SELECT
    '20000000-0000-4000-8000-000000000001'::uuid,
    CASE member_number % 4
      WHEN 1 THEN '30000000-0000-4000-8000-000000000002'::uuid
      WHEN 2 THEN '30000000-0000-4000-8000-000000000002'::uuid
      WHEN 3 THEN '30000000-0000-4000-8000-000000000001'::uuid
      ELSE '30000000-0000-4000-8000-000000000003'::uuid
    END,
    user_id,
    now() - interval '4 days'
  FROM ranked_members;

  WITH ranked_members AS (
    SELECT
      member.user_id,
      row_number() OVER (ORDER BY member.user_id) AS member_number
    FROM public.dao_members AS member
    WHERE member.dao_group_id = v_dao_group_id
    LIMIT 8
  ), selections AS (
    SELECT user_id, '30000000-0000-4000-8000-000000000005'::uuid AS option_id
    FROM ranked_members
    UNION ALL
    SELECT user_id, '30000000-0000-4000-8000-000000000006'::uuid
    FROM ranked_members
    WHERE member_number % 2 = 0
    UNION ALL
    SELECT user_id, '30000000-0000-4000-8000-000000000008'::uuid
    FROM ranked_members
    WHERE member_number % 3 = 0
  )
  INSERT INTO public.forum_poll_votes (poll_id, option_id, voter_id, created_at)
  SELECT
    '20000000-0000-4000-8000-000000000002'::uuid,
    option_id,
    user_id,
    now() - interval '6 hours'
  FROM selections;

  -- A natural nested conversation for the detailed-post recording.
  INSERT INTO public.comments (
    id, post_id, author_id, parent_comment_id, body, image_url,
    created_at, updated_at, deleted_at
  ) VALUES
    (
      '40000000-0000-4000-8000-000000000001', v_post_ids[4],
      v_second_author_id, null,
      '<p>A short “start here” checklist would help. The current information is useful, but it is spread across several places.</p>',
      null, now() - interval '2 days 5 hours', null, null
    ),
    (
      '40000000-0000-4000-8000-000000000002', v_post_ids[4],
      v_owner_id, '40000000-0000-4000-8000-000000000001',
      '<p>That makes sense. We could pair the checklist with one suggested first contribution.</p>',
      null, now() - interval '2 days 3 hours', null, null
    ),
    (
      '40000000-0000-4000-8000-000000000003', v_post_ids[4],
      v_third_author_id, '40000000-0000-4000-8000-000000000002',
      '<p>I like that. A small first task would make the path from reading to contributing much clearer.</p>',
      null, now() - interval '1 day 20 hours', null, null
    ),
    (
      '40000000-0000-4000-8000-000000000004', v_post_ids[4],
      v_third_author_id, null,
      '<p>A monthly newcomer call could also help people meet maintainers without needing to know who to message first.</p>',
      null, now() - interval '5 hours', null, null
    ),
    (
      '40000000-0000-4000-8000-000000000005', v_post_ids[4],
      v_owner_id, '40000000-0000-4000-8000-000000000004',
      '<p>Great idea. We could include a ten-minute project showcase so newcomers can see what is active.</p>',
      null, now() - interval '45 minutes', null, null
    ),
    (
      '40000000-0000-4000-8000-000000000006', v_post_ids[7],
      v_second_author_id, null,
      '<p>A short summary plus links to the original proposal and final transaction would be enough for me.</p>',
      null, now() - interval '4 hours', null, null
    );

  -- Give one nested comment a visible like count.
  INSERT INTO public.comment_reactions (comment_id, user_id, reaction, created_at)
  VALUES
    ('40000000-0000-4000-8000-000000000001', v_owner_id, 'heart', now() - interval '1 day'),
    ('40000000-0000-4000-8000-000000000003', v_second_author_id, 'heart', now() - interval '12 hours')
  ON CONFLICT (comment_id, user_id, reaction) DO NOTHING;

  -- Mix read and unread posts for the overview. Post 4 was viewed before its
  -- newest comment, so it remains unread; posts 3 and 8 have never been viewed
  -- by the configured owner.
  INSERT INTO public.post_views (post_id, viewer_id, last_viewed_at, created_at)
  VALUES
    (v_post_ids[1], v_owner_id, now() - interval '1 day', now() - interval '1 day'),
    (v_post_ids[2], v_owner_id, now() - interval '2 days', now() - interval '2 days'),
    (v_post_ids[4], v_owner_id, now() - interval '6 hours', now() - interval '6 hours'),
    (v_post_ids[5], v_owner_id, now() - interval '1 day', now() - interval '1 day'),
    (v_post_ids[6], v_owner_id, now() - interval '8 hours', now() - interval '8 hours'),
    (v_post_ids[7], v_owner_id, now() - interval '2 hours', now() - interval '2 hours'),
    (v_post_ids[9], v_owner_id, now() - interval '1 hour', now() - interval '1 hour')
  ON CONFLICT (post_id, viewer_id)
  DO UPDATE SET last_viewed_at = excluded.last_viewed_at;

  INSERT INTO public.post_views (post_id, viewer_id, last_viewed_at, created_at)
  SELECT
    post_id,
    member.user_id,
    now() - interval '30 minutes',
    now() - interval '30 minutes'
  FROM unnest(v_post_ids) AS post_id
  CROSS JOIN LATERAL (
    SELECT dao_member.user_id
    FROM public.dao_members AS dao_member
    WHERE dao_member.dao_group_id = v_dao_group_id
      AND dao_member.user_id <> v_owner_id
    ORDER BY dao_member.user_id
    LIMIT 4
  ) AS member
  ON CONFLICT (post_id, viewer_id)
  DO UPDATE SET last_viewed_at = excluded.last_viewed_at;

  RAISE NOTICE 'Seeded 9 presentation posts in % for owner %', v_dao_name, v_owner_login;
END;
$presentation_seed$;

COMMIT;

-- Optional review query. Run this separately after seeding.
-- SELECT post_type, title, created_at
-- FROM public.posts
-- WHERE id::text LIKE '10000000-0000-4000-8000-%'
-- ORDER BY created_at DESC;
