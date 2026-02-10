# Lexer's World

## Overview
Interactive web app featuring a 3D globe showing events at key locations worldwide. Users can spin/zoom the globe to discover events. Insider/outsider security model is planned (not shipped yet).

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
| date | datetime (ISO 8601) | Event start time |
| manualLocation | string | Key location or nearest major city (manual/AI-set) |
| address | string | Source-of-truth physical address |
| lat / lng | number | Geocoded from address, cached |
| description | text | Event description |
| isLexerComing | boolean | Planned hidden for outsiders (shows "?") |
| recurrent | boolean | Whether event repeats |
| inviteUrl | url | Link to apply/RSVP |
| cost | number | Base price; `0` means free |
| currency | string | ISO 4217 currency code |
| hasAdditionalTiers | boolean | If true, display `+` suffix (`FREE+`, `$25+`) |

### Event View UI
- Name in big text
- Bottom right: door icon button linking to inviteUrl
  - Door opens on press, closes on release (animated)
  - Evokes "being invited in"

### Security / Insider-Outsider Model
- **Current implementation**
  - Auth is not implemented yet
  - `isLexerComing` and precise location currently render directly from event data
  - No outsider glitch/censor treatment yet
- **Planned outsider mode**
  - `isLexerComing` displays as `?`
  - Precise location is hidden/obfuscated in UI
  - Location coordinates are deterministically fuzzed via `HMAC(precise_lat|precise_lng, FUZZ_SECRET)`
- **Planned insider mode**
  - Login via Twitter OAuth (through Supabase auth)
  - Access is controlled by manual allowlist (not auto mutual-check; X API pricing)
- **Privacy notes**
  - Not per-city offset (too easy to correlate)
  - Not per-event-ID offset (recurring venues leak)
  - Not random per request (averaging attack)

## Hosting
- Target hosting: Vercel
- Local development works (`pnpm dev`, `pnpm build`, `pnpm lint` all clean)
- Connect GitHub repo to Vercel dashboard still pending

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

## Planning / Phases (Parallel A/B Tracks)

### Phase 1: Foundation — COMPLETE
- [x] Decide on tech stack: Next.js + react-globe.gl + Tailwind + Supabase (planned)
- [x] Scaffold project (Next.js + react-globe.gl)
- [x] Get basic globe rendering with zoom/spin (night earth texture, purple atmosphere, auto-rotate)
- [x] Add key locations as red stars (zoomed out view) — 5 cities with neon-red star markers + labels
- [x] GitHub repo: https://github.com/Lexer-Lux/lexers-world
- [x] Connect Vercel to GitHub repo (done via dashboard)

### Phase 2: Data & Runtime — COMPLETE
#### Track A (Backend/Data Path)
- [x] Supabase-ready events API route + typed row mapping + mock fallback (`/api/events`)
- [x] SQL schema draft (`supabase/events-schema.sql`)
- [x] Set Supabase env in deployment + verify `/api/events` reads live data (`source: supabase`)
- [x] Run schema in Supabase and seed initial rows
- [x] Add minimal data validation/monitoring for malformed event rows

#### Track B (Product/Data Ops + UI Stability)
- [x] Zoom threshold behavior (stars <-> dots)
- [x] Tap location -> event list UI
- [x] Event detail view + door button interaction
- [x] Star marker positioning fix (surface alignment)
- [x] ISO-by-default date + hover flip to human-readable
- [x] Recurring badge top-right spiral reveal behavior
- [x] Decide event management workflow: direct DB edits for now

#### Phase 2 Sync Gate
- [x] Deploy one environment backed by real Supabase data
- [x] Smoke-test all 5 key locations with real rows and fallback behavior

### Phase 3: Visual System — COMPLETE
#### Track A (Globe/Rendering Style)
- [x] Replace photoreal globe with stylized approach (wireframe or illustrated)
- [x] Add day/night treatment with comic-style terminator line
- [x] Prototype crosshatch/night shader pass with perf guardrails

#### Track B (UI/Panel Motion + Comic Language)
- [~] Synthwave palette pass (base neon colors are in; full token pass pending)
- [ ] Ben-Day dots + halftone overlays
- [ ] Motion lines + comic onomatopoeia accents
- [ ] Smooth panel/page transitions and micro-interactions
- [ ] Mobile responsive polish across globe + panels
- [ ] Door button full animation polish pass

#### Phase 3 Sync Gate
- [x] Merge shared visual tokens and run desktop/mobile design QA

### Phase 4: Auth & Security — COMPLETE
#### Track A (Identity + Access Control)
- [x] Twitter OAuth 2.0 SSO via Supabase (login only)
- [x] Manual allowlist model + approval checks
- [x] Login/lock UI states with approval messaging
- [x] Add lock icon (top-left) with hover detail states

#### Track B (Field Protection + Privacy)
- [x] API-level outsider vs insider field filtering
- [x] Deterministic location fuzzing: `HMAC(precise_lat|precise_lng, FUZZ_SECRET)`
- [x] Outsider rendering rules (`isLexerComing` -> `?`, precise location blackboxed)
- [x] Disclaimer text for fuzzed outsider coordinates
- [x] Optional glitch/censor visual treatment pass for hidden fields

#### Phase 4 Sync Gate
- [x] End-to-end outsider/insider validation (same event, different field visibility)

### Phase 5: Advanced Aesthetic Experiments — COMPLETE
#### Track A (Globe Experiments)
- [x] WarGames wireframe option prototype
- [x] Papery/illustrated globe option prototype

#### Track B (Atmosphere Experiments)
- [x] Borderlands-style crosshatch shadow pass experiments
- [x] Additional motion/comic overlays that do not block readability

### Phase 6: Nice-to-haves (from "Rice" section)
#### Track A
- [ ] Real FX conversion for event cost display (live rates)

#### Track B
- [ ] TBD (deferred)

## Open Questions
1. ~~Tech stack confirmation~~ — decided: Next.js + react-globe.gl + Tailwind + Supabase
2. ~~How should events be managed?~~ — decided for Phase 2: direct DB edits
3. ~~Globe library choice~~ — decided: react-globe.gl
4. ~~Location privacy approach for recurrent events~~ — decided: HMAC seeded by precise coordinates
5. Mobile-first or desktop-first?
