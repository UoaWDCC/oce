CREATE TABLE public.forum_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL UNIQUE REFERENCES public.posts(id) ON DELETE CASCADE,
  question text NOT NULL CHECK (char_length(question) BETWEEN 1 AND 200),
  allow_multiple boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.forum_poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.forum_polls(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 80),
  position smallint NOT NULL CHECK (position BETWEEN 0 AND 5),
  UNIQUE (poll_id, position),
  UNIQUE (poll_id, id)
);

CREATE TABLE public.forum_poll_votes (
  poll_id uuid NOT NULL REFERENCES public.forum_polls(id) ON DELETE CASCADE,
  option_id uuid NOT NULL,
  voter_id uuid NOT NULL REFERENCES public."AllowedUsers"(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (option_id, voter_id),
  FOREIGN KEY (poll_id, option_id)
    REFERENCES public.forum_poll_options(poll_id, id) ON DELETE CASCADE
);

CREATE INDEX forum_poll_votes_poll_id_idx ON public.forum_poll_votes(poll_id);
CREATE INDEX forum_poll_votes_voter_id_idx ON public.forum_poll_votes(voter_id);

ALTER TABLE public.forum_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_poll_votes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.forum_polls FROM anon, authenticated;
REVOKE ALL ON public.forum_poll_options FROM anon, authenticated;
REVOKE ALL ON public.forum_poll_votes FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_forum_post_with_poll(
  p_dao_group_id uuid,
  p_post_type text,
  p_title text,
  p_body text,
  p_anonymous boolean,
  p_is_pinned boolean,
  p_image_url text,
  p_poll_question text,
  p_poll_options text[],
  p_allow_multiple boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_post_id uuid;
  v_poll_id uuid;
  v_option text;
  v_position integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING errcode = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.dao_members
    WHERE dao_group_id = p_dao_group_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Forbidden' USING errcode = '42501';
  END IF;
  IF p_post_type IS NULL OR p_title IS NULL OR p_body IS NULL OR
     p_post_type NOT IN ('Announcement', 'Proposal', 'Question', 'Discussion', 'Resource') OR
     char_length(trim(p_title)) NOT BETWEEN 1 AND 50 OR
     char_length(trim(p_body)) < 1 THEN
    RAISE EXCEPTION 'Invalid post content' USING errcode = '22023';
  END IF;
  IF p_poll_question IS NULL OR char_length(trim(p_poll_question)) NOT BETWEEN 1 AND 200 OR
     p_poll_options IS NULL OR cardinality(p_poll_options) NOT BETWEEN 2 AND 6 THEN
    RAISE EXCEPTION 'Polls require 2-6 options' USING errcode = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(p_poll_options) option
    WHERE char_length(trim(option)) NOT BETWEEN 1 AND 80
  ) OR (
    SELECT count(*) FROM unnest(p_poll_options) option
  ) <> (
    SELECT count(DISTINCT lower(trim(option))) FROM unnest(p_poll_options) option
  ) THEN
    RAISE EXCEPTION 'Poll options must be non-empty and unique' USING errcode = '22023';
  END IF;
  INSERT INTO public.posts (
    dao_group_id, author_id, post_type, title, body, anonymous,
    is_pinned, image_url
  ) VALUES (
    p_dao_group_id, v_user_id, p_post_type, p_title, p_body, p_anonymous,
    p_is_pinned, p_image_url
  ) RETURNING id INTO v_post_id;

  INSERT INTO public.forum_polls (post_id, question, allow_multiple)
  VALUES (v_post_id, trim(p_poll_question), p_allow_multiple)
  RETURNING id INTO v_poll_id;

  FOREACH v_option IN ARRAY p_poll_options LOOP
    INSERT INTO public.forum_poll_options (poll_id, label, position)
    VALUES (v_poll_id, trim(v_option), v_position);
    v_position := v_position + 1;
  END LOOP;

  RETURN v_post_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_forum_poll(p_post_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_poll_id uuid;
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING errcode = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.posts p
    JOIN public.dao_members dm ON dm.dao_group_id = p.dao_group_id
    WHERE p.id = p_post_id AND p.deleted_at IS NULL AND dm.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Forbidden' USING errcode = '42501';
  END IF;

  SELECT id INTO v_poll_id FROM public.forum_polls WHERE post_id = p_post_id;
  IF v_poll_id IS NULL THEN RETURN NULL; END IF;

  SELECT jsonb_build_object(
    'id', fp.id,
    'question', fp.question,
    'allowMultiple', fp.allow_multiple,
    'totalVoters', (
      SELECT count(DISTINCT voter_id) FROM public.forum_poll_votes
      WHERE poll_id = fp.id
    ),
    'options', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', o.id,
        'label', o.label,
        'voteCount', (SELECT count(*) FROM public.forum_poll_votes v WHERE v.option_id = o.id),
        'isSelected', EXISTS (
          SELECT 1 FROM public.forum_poll_votes v
          WHERE v.option_id = o.id AND v.voter_id = v_user_id
        )
      ) ORDER BY o.position)
      FROM public.forum_poll_options o WHERE o.poll_id = fp.id
    ), '[]'::jsonb)
  ) INTO v_result
  FROM public.forum_polls fp WHERE fp.id = v_poll_id;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_forum_poll_vote(
  p_poll_id uuid,
  p_option_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_allow_multiple boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING errcode = '42501';
  END IF;
  SELECT fp.allow_multiple
  INTO v_allow_multiple
  FROM public.forum_polls fp
  JOIN public.posts p ON p.id = fp.post_id AND p.deleted_at IS NULL
  JOIN public.dao_members dm ON dm.dao_group_id = p.dao_group_id
  WHERE fp.id = p_poll_id AND dm.user_id = v_user_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Forbidden' USING errcode = '42501'; END IF;
  IF p_option_ids IS NULL OR cardinality(p_option_ids) < 1 OR cardinality(p_option_ids) > 6 OR
     (NOT v_allow_multiple AND cardinality(p_option_ids) <> 1) THEN
    RAISE EXCEPTION 'Invalid number of selections' USING errcode = '22023';
  END IF;
  IF cardinality(p_option_ids) <> cardinality(ARRAY(SELECT DISTINCT unnest(p_option_ids))) OR
     EXISTS (SELECT 1 FROM unnest(p_option_ids) id WHERE NOT EXISTS (
       SELECT 1 FROM public.forum_poll_options o WHERE o.id = id AND o.poll_id = p_poll_id
     )) THEN
    RAISE EXCEPTION 'Invalid poll option' USING errcode = '22023';
  END IF;

  DELETE FROM public.forum_poll_votes WHERE poll_id = p_poll_id AND voter_id = v_user_id;
  INSERT INTO public.forum_poll_votes (poll_id, option_id, voter_id)
  SELECT p_poll_id, id, v_user_id FROM unnest(p_option_ids) id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_forum_post_with_poll(uuid,text,text,text,boolean,boolean,text,text,text[],boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_forum_poll(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_forum_poll_vote(uuid,uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_forum_post_with_poll(uuid,text,text,text,boolean,boolean,text,text,text[],boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_forum_poll(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_forum_poll_vote(uuid,uuid[]) TO authenticated;
