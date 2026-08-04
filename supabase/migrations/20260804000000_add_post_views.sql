-- Create the post_views table used to record one view per DAO member and post

CREATE TABLE IF NOT EXISTS public.post_views (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  viewer_id uuid NOT NULL,
  last_viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT post_views_pkey PRIMARY KEY (id),
  CONSTRAINT post_views_post_id_fkey
    FOREIGN KEY (post_id)
    REFERENCES public.posts (id),
  CONSTRAINT post_views_viewer_id_fkey
    FOREIGN KEY (viewer_id)
    REFERENCES public."AllowedUsers" (id)
);

-- Remove duplicate viewer/post rows before adding the unique index.
-- Keep the most recently viewed row for each viewer and post.

WITH ranked_post_views AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY post_id, viewer_id
      ORDER BY last_viewed_at DESC, created_at DESC, id DESC
    ) AS row_number
  FROM public.post_views
)
DELETE FROM public.post_views
WHERE id IN (
  SELECT id
  FROM ranked_post_views
  WHERE row_number > 1
);

-- Ensure record_post_view can safely upsert one row per viewer and post

CREATE UNIQUE INDEX IF NOT EXISTS post_views_post_viewer_unique
ON public.post_views (post_id, viewer_id);

-- Support lookups of all views recorded by a user

CREATE INDEX IF NOT EXISTS post_views_viewer_id_idx
ON public.post_views (viewer_id);

-- Allow authenticated DAO members to read view rows for posts in their DAOs.
-- Inserts and updates are intentionally performed only through record_post_view.

ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "DAO members can read post views" ON public.post_views;

CREATE POLICY "DAO members can read post views"
ON public.post_views
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.posts
    INNER JOIN public.dao_members
      ON dao_members.dao_group_id = posts.dao_group_id
    WHERE posts.id = post_views.post_id
      AND posts.deleted_at IS NULL
      AND dao_members.user_id = auth.uid()
  )
);

-- Record or refresh a post view for the authenticated DAO member

CREATE OR REPLACE FUNCTION public.record_post_view(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_dao_group_id uuid;
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING errcode = '42501';
  END IF;

  SELECT dao_group_id INTO v_dao_group_id
  FROM public.posts
  WHERE id = p_post_id
    AND deleted_at IS NULL;

  IF v_dao_group_id IS NULL THEN
    RAISE EXCEPTION 'Post not found' USING errcode = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.dao_members
    WHERE dao_group_id = v_dao_group_id
      AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Forbidden' USING errcode = '42501';
  END IF;

  INSERT INTO public.post_views (post_id, viewer_id, last_viewed_at)
  VALUES (p_post_id, v_user_id, now())
  ON CONFLICT (post_id, viewer_id)
  DO UPDATE SET last_viewed_at = excluded.last_viewed_at;
END;
$function$;

-- Restrict table mutations and expose only the view-recording function

REVOKE ALL ON TABLE public.post_views FROM PUBLIC;
REVOKE ALL ON TABLE public.post_views FROM anon;
REVOKE ALL ON TABLE public.post_views FROM authenticated;
GRANT SELECT ON TABLE public.post_views TO authenticated;

REVOKE ALL ON FUNCTION public.record_post_view(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_post_view(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_post_view(uuid) TO authenticated;

-- Validate the post_views table, constraints, policies, and function

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'post_views'
ORDER BY ordinal_position;

SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'post_views'
ORDER BY indexname;

SELECT
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'post_views';

SELECT
  routine_name,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'record_post_view';
