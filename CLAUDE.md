# Lexer's World

## Overview
Interactive web app featuring a 3D globe showing events at key locations worldwide. Users can spin/zoom the globe to discover events. Has insider/outsider security model with Twitter SSO.

**Notion page**: https://www.notion.so/3026947116b980029e5fd550aa1be955

## Aesthetic
- Western comics: Ben-Day dots, motion lines, comic-style onomatopoeia
- Hotline Miami / synthwave / cyberpunk / 80s color palette
- Fusion of graphic novel style + high-tech/synthwave
- Big focus on flashy/smooth UI and animations

## Core Features

### The Globe
- Interactive 3D globe (click/tap to spin, scroll/pinch to zoom)
- **Zoomed out** (past zoomThreshold): Key locations appear as red stars with names
- **Zoomed in** (past zoomThreshold): Individual events appear as dots on map
- Tap a location -> shows all upcoming events at that location
- Tap an event -> shows event detail view

### Key Locations
- Bay Area, CA
- London, UK
- New York, NY
- Toronto, ON
- Montréal, QC
- (These are a subset of cities from whatever mapping data source is used)

### Event Data Model
| Field | Type | Notes |
|-------|------|-------|
| name | string | Event name |
| manualLocation | string | Key location or nearest major city (manual/AI-set) |
| location | coordinates | Actual physical location (encrypted for outsiders) |
| description | text | Event description |
| isLexerComing | boolean | Encrypted for outsiders (shows "?") |
| recurrent | boolean | Whether event repeats |
| inviteUrl | url | Link to apply/RSVP |

### Event View UI
- Name in big text
- Bottom right: door icon button linking to inviteUrl
  - Door opens on press, closes on release (animated)
  - Evokes "being invited in"

### Security / Insider-Outsider Model
- **Outsider mode**: Default view
  - `isLexerComing` displays as "?"
  - `location` shows glitch/censor effect (letters keep changing)
  - Location is fuzzed (random offset within radius of true point)
- **Insider mode**: Log in via Twitter SSO
  - Must be mutuals with @LexerLux
  - Full access to real locations and isLexerComing status
- **Fuzzing concern**: Recurrent events leak location over time via multiple data points
  - Need to research proper location privacy / differential privacy techniques
  - Consider hardware ID seeds, consistent fuzzing per device, etc.

## Hosting
- No server currently available
- Look into free hosting options (Vercel, Netlify, Cloudflare Pages, etc.)
- Fallback: run locally and migrate later

## Tech Stack (DECIDED)
- **Next.js 16** on **Vercel** (free hosting, SSR, API routes, Turbopack)
- **react-globe.gl 2.37** (Three.js-based interactive globe)
- **Tailwind CSS 4** for styling
- **Supabase** for DB + auth (Phase 2-3)
- **TypeScript** throughout

## Dev Notes
- **No git locally** — use `gh api` to push via GitHub API (see push script pattern)
- **80MB disk free** — very tight, cannot install Vercel CLI or other large tools
- **No Rust toolchain** — offload to GitHub Actions if needed
- **pnpm** for package management (shared store saves disk)
- Globe component is client-only (dynamic import with `ssr: false`)

## Planning / Phases

### Phase 1: Foundation -- COMPLETE
- [x] Decide on tech stack: Next.js + react-globe.gl + Tailwind + Supabase (planned)
- [x] Scaffold project (Next.js + react-globe.gl)
- [x] Get basic globe rendering with zoom/spin (night earth texture, purple atmosphere, auto-rotate)
- [x] Add key locations as red stars (zoomed out view) — 5 cities with neon-red star markers + labels
- [x] GitHub repo: https://github.com/Lexer-Lux/lexers-world
- [ ] Connect Vercel to GitHub repo (do via web dashboard — no disk space for CLI)

### Phase 2: Fixes & Data — IN PROGRESS
- [ ] Set up Supabase (or chosen DB)
- [ ] Create events table with schema above
- [ ] Build event CRUD (admin interface or Notion integration?)
- [x] Implement zoom threshold behavior (stars <-> dots)
- [x] Build "tap location" -> event list UI
- [x] Build event detail view with door button animation
- [ ] Fix: Key location stars render way above the earth surface and often thousands of miles from correct position
- [ ] Fix: Dates should display in ISO 8601 format by default; on hover, flip animation reveals human-readable format
- [ ] Fix: Recurring icon — move to top-right corner of event card, no text, bigger
  - On hover: spiral-to-text animation — letters of "RECURRING!" placed along cycle arrow spiral (base to arrow tip), animation removes the line segment by segment revealing each letter, loops

### Phase 3: Aesthetics
- [ ] Ben-Day dot patterns / halftone effects
- [ ] Synthwave color scheme (neon pink, cyan, purple on dark)
- [ ] Motion lines and comic onomatopoeia accents
- [ ] Smooth page transitions and micro-interactions
- [ ] Mobile responsive design
- [ ] Door button open/close animation
- [ ] Glitch/censor text effects for outsider-hidden fields (try: character cycling, data-moshing/RGB-split, redacted bars)

### Phase 4: Auth & Security
- [ ] Twitter OAuth 2.0 SSO via Supabase (free tier — login only)
- [ ] Manual allowlist in Supabase (replaces mutual-follow check — X API wants $200/mo for follower reads)
- [ ] Login button with message explaining why manual list instead of auto-mutual check
  - "We wanted to make it so logging in unlocks all info if you're my mutual, but Elon wants to charge us $200/mo for it. So I have to keep a manual list of Twitter users I know. If you're not on it, DM me @LexerLux and I'll add you (but only if you're worthy)."
- [ ] Lock icon (top-left): locked for unapproved, unlocked for approved
  - Hover shows approval status in bold, with explanation text below + how to get approved if unapproved
- [ ] Row-level security / API-level field filtering: outsider vs insider views
- [ ] Location fuzzing for outsiders: HMAC(precise_lat|precise_lng, FUZZ_SECRET) → deterministic offset
  - Seeded by actual coordinates — same physical address always gets the same fuzz
  - NOT per city — per-city offset is trivially detectable by comparing events in same region
  - NOT per event ID — recurring events at same venue would get different offsets, leaking info
  - NOT random per request — averaging attack converges on true location
  - Secret salt (FUZZ_SECRET) stored as env var, never exposed to client
- [ ] isLexerComing → shows "?" for outsiders (simple blackbox for now, fancy glitch effect later)
- [ ] Precise location → blackboxed for outsiders (glitch/censor aesthetic deferred)
- [ ] Disclaimer text at bottom of page: "Displayed locations are fuzzed for non-approved users"

### Phase 5: Advanced Aesthetics
- [ ] Replace satellite/realistic globe texture with stylized look:
  - Option A: WarGames-style wireframe globe (like the WOPR computer scene)
  - Option B: Papery/illustrated globe with Ben-Day dot patterning
  - NOT photorealistic satellite imagery
- [ ] Day/night visualization on globe:
  - Comic-book style dotted line for the terminator (day/night boundary)
  - Shader over nighttime hemisphere with crosshatched shadows (Borderlands cel-shading style)
  - Reference: Borderlands 3 shader techniques for comic-book crosshatching

### Phase 6: Nice-to-haves (from "Rice" section)
- [ ] TBD - noted in Notion for later

## Open Questions
1. ~~Tech stack confirmation~~ — decided: Next.js + react-globe.gl + Tailwind + Supabase
2. How should events be managed? Admin panel, Notion sync, or direct DB edits?
3. ~~Globe library choice~~ — decided: react-globe.gl
4. ~~Location privacy approach for recurrent events~~ — decided: HMAC seeded by precise coordinates
5. Mobile-first or desktop-first?
