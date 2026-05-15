# cOMmons seeds

(Folder is still `field/seeds/` for backward compat; the visible brand
is `cOMmons`.)

Drop seed JSON files into this directory. `npm run seed` (or
`POST /field-api/dev/seed-vesna` while running in dev) will pick them up.

## Vesna Lucca

The importer looks for `vesna-lucca-compass-2026-05-12.json` here first, then
falls back to `/home/user/workspace/vesna-lucca-compass-2026-05-12.json`.

The Compass JSON is a private artifact — it contains raw transcript text
under `points.{work,lens,field,call}.raw` and Q&A answers under
`qa_answers`. The importer **strips those fields** and only publishes the
curated `web_heading` / `web_intro` / `web_closing` / `highlights` /
`summary` / `theme` fields plus the `gk_num` / `gk_line` identifiers.

If you need to seed without committing the raw JSON to git, place it here
locally (this directory is in `.gitignore` for `.json` files) — see below.

## Eda Carmikli, Markus Lehto

Email seats are reserved via `BETA_USERS` (env). Compass JSONs are not yet
available in the workspace. To seed, either:

1. Drop their Compass JSON into this directory as
   `eda.json` / `markus.json` and add an importer call in
   `field/src/seed.js`, or
2. Wait for them to publish from Studio. Their seats already exist; the
   first magic-link sign-in will create their `users` row.

## Payload schema (also used by `POST /field-api/profile`)

```jsonc
{
  "handle": "vesna-lucca",                          // optional; server proposes if omitted
  "display_name": "Vesna Lucca",
  "full_name": "Vesna Lucca",                       // optional; used for gematria
  "birthdate": "1963-04-15",                        // optional; used for digital root
  "archetype_tagline": "The Observer Who Learns to Let Go",
  "essence": "I spent three months lying horizontal…",
  "statement": null,
  "presence_status": "in_the_field",                // | "away"
  "gene_keys": { "life_work": "GK 5.5" },           // optional
  "compass": {
    "work":  { "gk_num": "5",  "gk_line": "5", "web_heading": "…", "web_intro": "…", "highlights": ["…"] },
    "lens":  { "gk_num": "32", "gk_line": "1", "summary": "…", "web_intro": "…" },
    "field": { "gk_num": "64", "web_heading": "Where I Come Alive", "highlights": ["…"] },
    "call":  { "gk_num": "63", "summary": "…" }
  },
  "frequency_signature": {
    "tonal_center": "C",
    "dominant_hz": 528,
    "elemental_alignment": "water",
    "chakra_focus": "heart"
  },
  "creative_stream": [],                            // future: pulled from Studio
  "offerings": [],
  "seed_syllable": "Om"
}
```

The Sigil seed is computed server-side from these fields — clients should
not send `sigil_seed` or `sigil_svg`.
