ALTER TABLE public.messages
ADD COLUMN favourited_at timestamp with time zone;

UPDATE public.messages
SET favourited_at = created_at
WHERE is_favourite = true
  AND favourited_at IS NULL;

CREATE INDEX messages_favourited_at_idx
ON public.messages (favourited_at DESC)
WHERE is_favourite = true;