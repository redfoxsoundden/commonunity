# cOMmons seeds

(Folder is still `field/seeds/` for backward compat; the visible brand
is `cOMmons`.)

Drop seed JSON files into this directory. `npm run seed` (or
`POST /field-api/dev/seed-vesna`, `…/seed-eda`, `…/seed-markus`,
`…/seed-all` while running in dev) will pick them up. Raw `*.json` files
in this directory are git-ignored — they contain private Compass
artifacts and must not be committed.

## Production seeding (Railway)

Production reads from **`field/seeds/public/`** — a committed sibling
folder of curated, public-safe seeds shipped inside the Docker image.
On startup, `src/index.js` calls `autoSeedBeta()` which imports the
three Phase 1 profiles idempotently (skips when all three handles are
already published; opt out with `FIELD_AUTO_SEED=0`, force a re-import
with `FIELD_FORCE_SEED=1`). See `seeds/public/README.md` for the
allow-list of fields included in the curated seeds, and for the
re-curation workflow when a beta participant updates their Compass.

## Phase 1 beta seats

| Name | Email | Compass JSON | Public profile |
|---|---|---|---|
| Markus Lehto | `markuslehto@mac.com` | `markus-compass-2026-05-15.json` | seeded by importer; public handle pinned to `markus-lehto`; display name lifted from JSON's `full_name: "Markus"` to `Markus Lehto` so it matches the URL |
| Vesna Lucca | `vesna.lucca@gmail.com` | `vesna-lucca-compass-2026-05-12.json` | seeded by importer |
| Eda Çarmıklı | `eda@jointidea.com` | `eda-armkl-compass-2026-05-15.json` | seeded by importer; public handle pinned to `eda-carmikli` (Latinised) |

These are the defaults in `field/.env.example`.

## Vesna Lucca

The importer looks for `vesna-lucca-compass-2026-05-12.json` here first,
then falls back to `/home/user/workspace/vesna-lucca-compass-2026-05-12.json`.
Default tone: 528 Hz / heart / water / tonal centre C.

## Markus Lehto

The importer looks for `markus-compass-2026-05-15.json` here first, then
falls back to `/home/user/workspace/` or to either
`markus-lehto-compass.json` / `markus.json` aliases. Default tone:
639 Hz / heart / air / tonal centre D♯ (Solfeggio Fa, "Connection",
matching his published themes of weaving coherence between people,
ideas, and frequencies).

The public handle is **pinned to `markus-lehto`**. The source JSON only
carries `full_name: "Markus"` (no surname), so `importMarkusSeed` also
lifts the display name to `Markus Lehto` so the gallery card and profile
heading match the public URL. The JSON itself remains the authoritative
source for birthdate, gene_keys, and curated compass content — only the
name and handle are overridden at publish time.

## Eda Çarmıklı

The importer looks for `eda-armkl-compass-2026-05-15.json` (the
shipped filename, hyphenated without the cedilla / dotless ı) here first,
then falls back to `/home/user/workspace/` or to either
`eda-carmikli-compass.json` / `eda.json` aliases. Default tone:
396 Hz / root / earth / tonal centre G (Solfeggio Ut, "Liberation",
matching her published themes of constructive paying-it-forward
leadership).

The public handle is **pinned to `eda-carmikli`** — the auto-proposer
also produces `eda-carmikli` from `Eda Çarmıklı` via the Turkish
transliteration map (`ı→i`, `ç→c`), but pinning it keeps the URL stable
across any future spelling edits in the source JSON.

## Privacy

The Compass JSON is a private artifact — it contains raw transcript text
under `points.{work,lens,field,call}.raw` and Q&A answers under
`qa_answers`. The importer **strips those fields** and only publishes
the curated `web_heading` / `web_intro` / `web_closing` / `highlights` /
`summary` / `theme` fields plus the `gk_num` / `gk_line` identifiers.
Tests guard this: `field/tests/run.js` asserts no transcript text or
`qa_answers` substring leaks into the published profile.

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
