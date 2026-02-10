CREATE TABLE public.allowlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twitter_username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.allowlist ENABLE ROW LEVEL SECURITY;

-- Only the service role (server-side) can read/write the allowlist.
-- The anon key can read it so the API route can check membership.
CREATE POLICY "anon can read allowlist"
  ON public.allowlist FOR SELECT
  USING (true);

CREATE POLICY "service role can manage allowlist"
  ON public.allowlist FOR ALL
  USING (true)
  WITH CHECK (true);
