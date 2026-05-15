# cOMmons public seeds (Phase 1)

Curated, **committed**, **public-safe** Compass-shaped seed JSONs for the
three Phase 1 beta Living Profiles. These files ship inside the Docker
image so a fresh Railway deploy can boot with the gallery already
populated — no manual seeding step required, no raw Compass artifact
ever entering the repo or the running image.

## What's in here

| File | Public profile | Pinned handle |
|---|---|---|
| `markus-public.json` | Markus Lehto | `markus-lehto` |
| `vesna-public.json`  | Vesna Lucca  | `vesna-lucca`  |
| `eda-public.json`    | Eda Çarmıklı | `eda-carmikli` |

## What's deliberately NOT in here

These curated files contain **only** the web-safe fields the importer's
`curateCompassPoint` already publishes:

- `profile`: `first_name`, `last_name`, `full_name`, `gene_keys`
- `points.{work,lens,field,call}`: `gk_num`, `gk_line`, `theme`,
  `summary`, `web_heading`, `web_intro`, `web_closing`, `highlights`,
  `frequency`

**Stripped at curation time** (never committed):

- `points.*.raw` — full transcript prose
- `points.*.qa_answers` — original Q&A intake answers
- `points.*.insights` — companion-generated insight blocks
- `points.*.observations` — private behavioural notes
- `profile.birthdate` / `birth_time` / `birthplace` — PII
- `profile.work_background` / `linkedin_url` / `communities` /
  `purpose_projects` / `practices` / `education` / `contact` — career
  prose and contact details (the public profile page links to LinkedIn
  separately if the user fills it in via Studio, but the seed itself
  carries none of this)
- `transcripts`, `guide`, `companion`, `palette_note` — session metadata

## Sigil determinism

The sigil is computed at seed time from `display_name` + `gene_keys` +
curated `compass` + the per-person `tone` pinned in
`src/importers.js`. Because birthdate is intentionally omitted from
these public seeds, the production sigil differs from the dev sigil
(which mixes in birthdate). The three production sigils remain
distinct and reproducible across deploys.

## Regenerating

If a beta participant updates their Compass session and wants their
public profile refreshed:

1. Drop the new raw `*.json` into `field/seeds/` (git-ignored).
2. Run the curator that produced this directory — extract only the
   allow-listed fields above (see `src/importers.js::curateCompassPoint`
   for the canonical list).
3. Overwrite the relevant `*-public.json` here.
4. Commit. Redeploy. The startup auto-seed picks up the new content.

The raw JSON must **never** be committed.
