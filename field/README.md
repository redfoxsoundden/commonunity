# CommonUnity Field — Phase 1

The public commons of CommonUnity. Living Profiles, Attune, Enter Their Field,
Tone, and the Mi→Fa publish threshold. Phase 1 scope per `/home/user/workspace/CommonUnity_Field_Specification_v0.1.md`.

This is a small Node service that lives **inside** the canonical
`HearthVS/commonunity` repo, parallel to `tuner/`. It is not a separate repo.

```
field/
├── src/
│   ├── index.js         ← Express boot, sessions, static
│   ├── routes.js        ← /field, /field/:handle, /field-api/*
│   ├── auth.js          ← magic-link beta auth (Passport-free)
│   ├── db.js            ← better-sqlite3 schema + in-memory fallback
│   ├── importers.js     ← Vesna seed JSON → curated Field profile
│   ├── views.js         ← SSR HTML (gallery, profile, enter)
│   └── seed.js          ← `npm run seed` CLI
├── public/              ← static CSS / JS
├── seeds/               ← optional seed JSONs
├── tests/run.js         ← `npm test`
├── package.json
├── nixpacks.toml        ← Railway build
├── railway.json
└── .env.example
```

## Run locally

```bash
cd field
cp .env.example .env
npm install              # express, express-session, memorystore, better-sqlite3
npm run seed             # creates beta users + imports Vesna
npm start                # → http://localhost:5050/field
```

The seeder reads the Vesna Compass JSON from any of these locations
(first match wins):

1. `field/seeds/vesna-lucca-compass-2026-05-12.json`
2. `/home/user/workspace/vesna-lucca-compass-2026-05-12.json`
3. `field/seeds/vesna.json`

Drop the JSON into `field/seeds/` for production. The importer curates web-safe
fields only — raw transcript text and Q&A answers are stripped before storage.

## Phase 1 routes

| Route | Method | Purpose |
|---|---|---|
| `/` , `/field` | GET | Public gallery (Phase 1 = gallery only; constellation = Phase 2) |
| `/field/:handle` | GET | Public Living Profile (logs presence) |
| `/field/:handle/sigil.svg` | GET | Personal sigil as standalone SVG (OG image) |
| `/field/enter` | GET | Magic-link entry form |
| `/auth/request-link` | POST | Request a magic link by email |
| `/auth/callback?token=…` | GET | Consume token + start session |
| `/auth/logout` | POST | Destroy session |
| `/field-api/health` | GET | Liveness |
| `/field-api/me` | GET | Session bootstrap |
| `/field-api/profiles` | GET | Public list (used by `/field`) |
| `/field-api/profile` | POST | Studio → Field publish (auth required) |
| `/field-api/attune/:handle` | POST | Record an attunement (auth required) |
| `/field-api/tone/:handle` | POST | Offer a tone (auth required) |
| `/field-api/tones/inbox` | GET | Owner's tone inbox |
| `/field-api/presences/me` | GET | "Who has entered my Field" |
| `/field-api/dev/seed-vesna` | POST | Dev: import Vesna seed (disabled in prod) |

## Anti-addiction guardrails (encoded, not aspirational)

- `attunements` and `presences` tables exist. **No public endpoint returns
  counts.** Counts and recent visitors are only returned to the profile owner
  via `/field-api/me`-gated routes and the owner-only "Field echoes" panel.
- Gallery sort is `published_at DESC`, not engagement-weighted.
- No notification badges. No follower counts. No DMs without context.

## Auth model

Magic-link, beta-only. Beta-seeded emails (from `BETA_USERS` env) auto-create
on first link request; everyone else gets a same-shape response and is queued
silently — we do not leak whether a seat exists.

If `SMTP_*` is unset, the link is printed to the server console and returned
in the JSON response as `dev.link` — this is the dev fallback. Set the SMTP
variables in `.env` to switch to real email delivery.

## Sigil

Deterministic SVG glyph built from:

- Gene Keys gates from Compass (Work / Lens / Field / Call) plus
  `profile.gene_keys.life_work` etc.
- Birthday digital root
- Name gematria (English ordinal)
- Tone: tonal centre + dominant Hz → derived musical note + solfeggio family
  + colour register
- Seed syllable (defaults to "Om"; settable per profile)

See `sdk/sigil.js` and `tests/sigil.test.js`. The hybrid layer
(`buildDesignPrompt`) emits a structured LLM design brief from the same seed
so a future enrichment pass can refine the glyph without changing its
identity.

## Domain plan

Beta runs on a Railway temp URL (e.g. `commonunity-field-production.up.railway.app`).
Final routing intent: `commonunity.io/field/*` (path-based, not
`field.commonunity.io`). When DNS cutover happens:

1. Attach `commonunity.io` to the root FastAPI service.
2. Either route `/field/*` to this service via a Railway edge / Cloudflare
   worker, or accept the subdomain interim until edge routing is in place.
3. Set `FIELD_BASE_URL=https://commonunity.io` and
   `ALLOWED_ORIGINS=https://commonunity.io` in production.

## Studio → Field

Studio's existing Living Profile preview now has a **Publish to Field** button
in the hero-under CTA toolbar (`lp-top-cta`). Clicking it:

1. Activates the Mi→Fa OM holding moment (gold-on-black sigil, 136.1 Hz OM
   tone, 2.4s hold, then recedes — no CTA, no nudge, per spec §3.2).
2. POSTs the assembled Living Profile snapshot to `/field-api/profile`.
3. Writes the published URL into the existing knock-state region.

The Field service URL is read from `window.CU_FIELD_URL` (or defaults to
`http://localhost:5050` in local dev). For production, set this via a meta tag
or script in `studio.html` once the deploy URL is known.

## What is *not* in Phase 1

Constellation view, sound-attached Tones, polished sigil generation,
Bazaar/Offerings, Gatherings/Circles, Resonance Ring, Sigil maker UI in
Compass, Postgres migration, second shock point pollination.
