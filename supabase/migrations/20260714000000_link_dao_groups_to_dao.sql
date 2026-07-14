-- Confirmed the existing schemas

SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('DAO', 'dao_groups', 'dao_members', 'posts')
ORDER BY table_name, ordinal_position;

-- Added dao_id as nullable initially to dao_groups table

ALTER TABLE public.dao_groups
ADD COLUMN dao_id text;

-- Map existing dao_groups rows to DAOs (This stage was done manually as there was one WDCC entry that was manually created for test purposes)

-- Update dao_groups table to include DAOs that haven't been added yet
-- Find them first by checking for any DAO entries that do not have a corresponding entry in dao_groups
SELECT d."DAOID", d."Name"
FROM public."DAO" AS d
LEFT JOIN public.dao_groups AS dg
  ON dg.dao_id = d."DAOID"
WHERE dg.id IS NULL;

-- Now insert the missing DAO entries into dao_groups including the dao_id reference and the name from the DAO table
INSERT INTO public.dao_groups (dao_id, name)
SELECT d."DAOID", d."Name"
FROM public."DAO" AS d
LEFT JOIN public.dao_groups AS dg
  ON dg.dao_id = d."DAOID"
WHERE dg.id IS NULL;

-- Validate the backfill 

SELECT dg.id, dg.dao_id
FROM public.dao_groups AS dg
LEFT JOIN public."DAO" AS d
  ON d."DAOID" = dg.dao_id
WHERE dg.dao_id IS NULL
   OR d."DAOID" IS NULL;

-- Add one-to-one constraints
-- Ensure that each dao_id in dao_groups is unique and not null
ALTER TABLE public.dao_groups
ALTER COLUMN dao_id SET NOT NULL;

-- Add unique constraint to ensure that each dao_id in dao_groups is unique
ALTER TABLE public.dao_groups
ADD CONSTRAINT dao_groups_dao_id_unique
UNIQUE (dao_id);

-- Add foreign key constraint to ensure referential integrity with the DAO table
ALTER TABLE public.dao_groups
ADD CONSTRAINT dao_groups_dao_id_fkey
FOREIGN KEY (dao_id)
REFERENCES public."DAO" ("DAOID")
ON UPDATE CASCADE
ON DELETE CASCADE;

-- Create a function to handle the insertion of new DAO entries into dao_groups automatically
CREATE OR REPLACE FUNCTION public.create_dao_group_for_new_dao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.dao_groups (dao_id, name)
  VALUES (NEW."DAOID", NEW."Name")
  ON CONFLICT (dao_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Create a trigger that calls the function after a new DAO is inserted
CREATE TRIGGER create_dao_group_after_dao_insert
AFTER INSERT ON public."DAO"
FOR EACH ROW
EXECUTE FUNCTION public.create_dao_group_for_new_dao();