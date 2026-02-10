# Lexer's World

Interactive globe app for discovering events across key cities.

## Stack

- Next.js 16 + TypeScript
- react-globe.gl
- Tailwind CSS 4
- Supabase (events backend + auth later)
- Vercel deployment target

## Local Setup

1. Install dependencies:

```bash
pnpm install
```

2. Copy env file and set Supabase values:

```bash
cp .env.example .env.local
```

Required env vars:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `FUZZ_SECRET`

Optional auth/privacy env vars:

- `INSIDER_PREVIEW_TOKEN` (required for insider mode in production)
- `INSIDER_ALLOWLIST` (comma-separated X handles for manual insider approval; case-insensitive)
- `NEXT_PUBLIC_LEXER_TWITTER_URL` (defaults to `https://x.com/LexerLux`)

3. Start dev server:

```bash
pnpm dev
```

## Supabase Schema

Run `supabase/events-schema.sql` in the Supabase SQL editor to create the `events` table and basic read policy.

For auth approvals, run `supabase/allowlist-schema.sql` to create the allowlist table.
If you already have allowlist rows, run `supabase/allowlist-normalization.sql` once to normalize existing usernames and add lowercase enforcement.

## Event Data Source Behavior

- `GET /api/events` reads from Supabase when env vars are configured.
- If env vars are missing or Supabase is unavailable, it falls back to local mock events so UI development can continue.
- `GET /api/events` defaults to outsider mode (privacy filtered):
  - `isLexerComing` returns `?`
  - coordinates are deterministic HMAC fuzzes based on `FUZZ_SECRET`
  - precise address is blackboxed
  - response headers include `x-lexer-viewer-mode` and `x-lexer-location-precision`
- Insider preview mode:
  - request with `?viewer=insider` or header `x-lexer-viewer: insider`
  - if `INSIDER_PREVIEW_TOKEN` is set, also pass `token=...` or header `x-insider-preview-token`

## Auth + Approval (Phase 4A)

- Twitter sign-in uses Supabase OAuth and completes at `/auth/callback`.
- `GET /api/events` accepts a bearer token and resolves approval from manual allowlist checks.
- Approved users receive insider mode; signed-in but unapproved users remain outsider with pending state in lock UI.
- Allowlist checks use:
  1) Supabase `allowlist` table (`twitter_username`), and
  2) optional `INSIDER_ALLOWLIST` env fallback.
- Database-level normalization:
  - `@Handle` input is canonicalized to `handle` via trigger
  - usernames are forced lowercase and validated against `^[a-z0-9_]{1,15}$`

## Runtime Tuning (Dev Drawer)

- In non-production builds, press `Tab` to toggle the Dev Drawer.
- The drawer exposes runtime controls for globe aesthetics and interaction thresholds (zoom threshold, rotation, wire/hatch strength, boundary tiers, title visibility).
- Phase 5A experiment mode toggle: `Default`, `WarGames`, and `Paper`.
- WarGames editors: line density, glow strength, and sweep strength.
- Paper editors: grain, halftone, and ink weight.
- Borderlands-style crosshatch editors: density and threshold (plus hatch strength from globe core).
- Phase 5B overlay editors: nebula/grid/horizon, motion lines, edge streaks, burst overlay, caption tilt, Ben-Day opacity, panel blur, and glitch speed.
