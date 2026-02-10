CREATE TABLE public.allowlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twitter_username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

CREATE TRIGGER normalize_allowlist_twitter_username
BEFORE INSERT OR UPDATE OF twitter_username
ON public.allowlist
FOR EACH ROW
EXECUTE FUNCTION public.normalize_allowlist_twitter_username();

ALTER TABLE public.allowlist
  ADD CONSTRAINT allowlist_twitter_username_lowercase_chk
  CHECK (twitter_username = lower(twitter_username));

ALTER TABLE public.allowlist
  ADD CONSTRAINT allowlist_twitter_username_format_chk
  CHECK (twitter_username ~ '^[a-z0-9_]{1,15}$');

ALTER TABLE public.allowlist ENABLE ROW LEVEL SECURITY;

-- Only the service role (server-side) can read/write the allowlist.
-- The anon key can read it so the API route can check membership.
CREATE POLICY "anon can read allowlist"
  ON public.allowlist FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "service role can manage allowlist"
  ON public.allowlist FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
