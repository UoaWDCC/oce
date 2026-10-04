CREATE TYPE public.reaction_type AS ENUM ('heart', 'thumbs_up', 'fire', 'thumbs_down');

CREATE TABLE public.comment_reactions (
    comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public."AllowedUsers"(id) ON DELETE CASCADE,
    reaction public.reaction_type NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (comment_id, user_id, reaction)
);

INSERT INTO public.comment_reactions (comment_id, user_id, reaction, created_at)
SELECT comment_id, user_id, 'heart'::public.reaction_type, created_at
FROM public.comment_likes
ON CONFLICT (comment_id, user_id, reaction) DO NOTHING;

CREATE INDEX idx_comment_reactions_comment_id 
ON public.comment_reactions (comment_id);

DROP TABLE public.comment_likes;