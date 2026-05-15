# cOMmons seeds

(Folder is still `field/seeds/` for backward compat; the visible brand
is `cOMmons`.)

Drop seed JSON files into this directory. `npm run seed` (or
`POST /field-api/dev/seed-vesna`, `…/seed-eda`, `…/seed-all` while
running in dev) will pick them up. Raw `*.json` files in this directory
are git-ignored — they contain private Compass artifacts and must not be
committed.

## Phase 1 beta seats

| Name | Email | Compass JSON | Public profile |
|---|---|---|---|
| Markus Lehto | `markuslehto@mac.com` | not yet provided | **seat reserved**; magic-link sign-in works, but no auto-seeded public profile until JSON arrives — he publishes from Studio himself |
| Vesna Lucca | `vesna.lucca@gmail.com` | `vesna-lucca-compass-2026-05-12.json` | seeded by importer |
| Eda Çarmıklı | `eda@jointidea.com` | `eda-armkl-compass-2026-05-15.json` | seeded by importer; public handle pinned to `eda-carmikli` (Latinised) |

These are the defaults in `field/.env.example`. The Markus seat exists
on purpose so the magic-link flow works the moment he asks for one — but
the seeder is *deliberate* about not fabricating a public profile from
nothing. Once his Compass JSON is added under `field/seeds/`, copy the
two-line `importMarkusSeed` pattern from `importers.js` or wait for him
to publish via Studio.

## Vesna Lucca

The importer looks for `vesna-lucca-compass-2026-05-12.json` here first,
then falls back to `/home/user/workspace/vesna-lucca-compass-2026-05-12.json`.
Default tone: 528 Hz / heart / water / tonal centre C.

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
