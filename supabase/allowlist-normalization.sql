BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT lower(regexp_replace(btrim(twitter_username), '^@+', '')) AS normalized_username,
             count(*) AS username_count
      FROM public.allowlist
      GROUP BY 1
      HAVING count(*) > 1
    ) duplicates
  ) THEN
    RAISE EXCEPTION 'allowlist has duplicates after lowercase normalization; dedupe rows before running this migration';
  END IF;
END;
$$;

UPDATE public.allowlist
SET twitter_username = lower(regexp_replace(btrim(twitter_username), '^@+', ''));

CREATE OR REPLACE FUNCTION public.normalize_allowlist_twitter_username()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.twitter_username := lower(regexp_replace(btrim(NEW.twitter_username), '^@+', ''));

  IF NEW.twitter_username !~ '^[a-z0-9_]{1,15}$' THEN
    RAISE EXCEPTION 'twitter_username must match ^[a-z0-9_]{1,15}$';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_allowlist_twitter_username ON public.allowlist;

CREATE TRIGGER normalize_allowlist_twitter_username
BEFORE INSERT OR UPDATE OF twitter_username
ON public.allowlist
FOR EACH ROW
EXECUTE FUNCTION public.normalize_allowlist_twitter_username();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'allowlist_twitter_username_lowercase_chk'
      AND conrelid = 'public.allowlist'::regclass
  ) THEN
    ALTER TABLE public.allowlist
      ADD CONSTRAINT allowlist_twitter_username_lowercase_chk
      CHECK (twitter_username = lower(twitter_username));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'allowlist_twitter_username_format_chk'
      AND conrelid = 'public.allowlist'::regclass
  ) THEN
    ALTER TABLE public.allowlist
      ADD CONSTRAINT allowlist_twitter_username_format_chk
      CHECK (twitter_username ~ '^[a-z0-9_]{1,15}$');
  END IF;
END;
$$;

DROP POLICY IF EXISTS "anon can read allowlist" ON public.allowlist;
CREATE POLICY "anon can read allowlist"
  ON public.allowlist FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "service role can manage allowlist" ON public.allowlist;
CREATE POLICY "service role can manage allowlist"
  ON public.allowlist FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
