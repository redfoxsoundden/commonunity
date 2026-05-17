# Om Cipher v1 — Implementation Plan (Revised)

> **Status:** Canonical implementation plan for Om Cipher v1.
> **Date archived:** 2026-05-16.
> **Supersedes:** the prior "numerology + sigil generator" framing.
> **Related docs:** [`./om-cipher.md`](./om-cipher.md), [`../foundation/om-cipher.md`](../foundation/om-cipher.md), [`../foundation/commonunity-architecture-v0.2.md`](../foundation/commonunity-architecture-v0.2.md), [`../governance/decision-log.md`](../governance/decision-log.md).

> **Source of truth:** Invitation → Compass → Om Cipher + Living Profile → Studio →
> Personal Home Page → cOMmons / Field.
>
> **Om Cipher is the objective source-code layer.** It is a canonical, Compass-sealed
> identity record derived from fixed birth and name data. It is not a decorative sigil
> generator. It is the deterministic foundation that Studio, Living Profile, Personal
> Homepage, cOMmons, and all future constellation nodes read from.
>
> **Living Profile is the subjective layer.** What the person has done, is doing, and
> will do with that source pattern. Its UX is preserved unchanged.
>
> **What the source code confirms today (server.py):** `PointData` already carries
> `gk_num` and `gk_line` fields with `GK_LINE_NAMES` lookup tables. No sigil, no Human
> Design, no gematria, no sound/syllable fields exist yet. This plan adds them as
> canonical sealed fields without touching existing Compass or Living Profile flows.

---

## Correction to Prior Plan

The previous plan reduced Om Cipher to a numerology + sigil generator. That was wrong.
Om Cipher is a **multi-system identity engine** with six source layers:

| Layer | System | V1 Status |
|---|---|---|
| Digital root / birth number | Birthdate reduction | Computed in v1 |
| Archetypal gate + line | Gene Keys / I Ching | Fields sealed in v1; lookup labels populated |
| Type / Authority / Profile | Human Design | Fields sealed in v1; computation deferred |
| Name resonance | Gematria (Pythagorean + Chaldean) | Computed in v1 |
| Seed syllable | Bija mantra mapping | Sealed in v1; display deferred to v2 |
| Tonal frequency | Bhramari / Humming Bee resonance | **Optional measured input in v1**; append-only refinement; visual use minimal in v1 (palette accent / metadata), full audio + cymatic layer in v1.1+ |

V1 computes what is straightforwardly deterministic from birth data and name.
It seals all other fields with their raw input values even when computation is deferred.
**Nothing is left as null that will later need to be re-entered**, with one important
exception: Bhramari resonance, which is a somatic *measurement* rather than a fixed
identity datum, and is handled distinctly (see §1d and §2 Layer 7+).

---

## Identity vs. Measured Resonance — A Distinction

Most Om Cipher inputs are **fixed identity data**: birthdate, legal name, birthplace,
Gene Keys gates/lines, Human Design type/authority/profile. These are Compass-sealed
once and treated as permanently immutable. They define *who you are* in the source
pattern; rewriting them would be rewriting identity.

**Bhramari resonance is different.** It is a *somatic measurement* of how the body
sounds today. It is core to the ritual experience of Om Cipher — the member literally
hums their cipher into being — but it is not the same kind of fact as a birthdate.
A person's fundamental humming frequency drifts with breath, posture, season, practice,
and life. Treating it as permanently immutable would betray both the physiology and
the ritual.

Therefore Bhramari is modeled as:

1. **An initial Compass-sealed baseline** — `bhramari_baseline_hz` plus measurement
   metadata, captured at first Compass sealing if the member chooses to hum. This
   baseline is sealed in the same way as other identity fields; the original capture
   is not overwritten.
2. **An append-only refinement history** — subsequent captures are stored as new
   resonance events in `om_cipher_resonance_events`. The baseline is never edited; new
   events accumulate alongside it. The most recent event can be used as the "current
   resonance" for display or audio purposes without altering the seal.
3. **Optional in v1** — if the member does not capture a Bhramari tone at Compass,
   Om Cipher still generates fully from birth + name + GK + HD layers. Missing
   Bhramari is not an error state. The cipher degrades gracefully (see §6).

This preserves the integrity of the Compass seal *and* honors that resonance is a
living, refineable signature, not a permanent label.

---

## 1. Input Contract

All identity fields are collected once, during Compass onboarding, and are **immutable
after first commit.** The full identity bundle is `SHA-256` hashed at write time.
Bhramari fields follow the distinct rules above and are treated separately in the
hash composition (see §2 Layer 5).

### 1a. Birth Data (required)

| Field | Type | Example | Notes |
|---|---|---|---|
| `birth_date` | ISO 8601 string | `"1988-04-23"` | UTC; no timezone conversion |
| `birth_time` | `"HH:MM"` or `null` | `"14:35"` | Null-safe; affects HD chart and temporal gate |
| `birth_place` | `{lat, lng, city, country}` | `{lat:41.04, lng:28.99}` | Lat/lng stored; city/country for display |

### 1b. Name Data (required)

| Field | Type | Notes |
|---|---|---|
| `legal_name` | String | Full legal name; UTF-8 NFC normalized |
| `preferred_name` | String or `null` | Display only; does not alter cipher |

### 1c. System Inputs — sealed at Compass, computed or deferred (see §2)

| Field | Type | Source | V1 |
|---|---|---|---|
| `gk_gate_work` | Integer 1–64 | Existing `gk_num` in `PointData` | Sealed + labeled |
| `gk_line_work` | Integer 1–6 | Existing `gk_line` in `PointData` | Sealed + labeled |
| `gk_gate_lens` | Integer 1–64 | Compass point: Lens | Sealed + labeled |
| `gk_line_lens` | Integer 1–6 | Compass point: Lens | Sealed + labeled |
| `gk_gate_field` | Integer 1–64 | Compass point: Field | Sealed + labeled |
| `gk_line_field` | Integer 1–6 | Compass point: Field | Sealed + labeled |
| `gk_gate_call` | Integer 1–64 | Compass point: Call | Sealed + labeled |
| `gk_line_call` | Integer 1–6 | Compass point: Call | Sealed + labeled |
| `hd_type` | String or `null` | Human Design chart | Sealed; computation deferred |
| `hd_authority` | String or `null` | Human Design chart | Sealed; computation deferred |
| `hd_profile` | String or `null` | e.g. `"3/5"` | Sealed; computation deferred |
| `hd_definition` | String or `null` | e.g. `"Single"` | Sealed; computation deferred |
| `seed_syllable` | String or `null` | Bija mapping from birth data | Sealed; display deferred to v2 |

> **Note on existing Gene Keys fields:** `server.py` already stores `gk_num` and
> `gk_line` per compass point inside `PointData`. Om Cipher promotes these to canonical
> sealed fields at the identity layer — they are not re-entered, they are read from the
> Compass session and committed once.

### 1d. Bhramari Resonance — optional measured input, append-only

Bhramari is **not** part of the immutable identity bundle. It has its own contract.

**Baseline capture (optional, at Compass):**

| Field | Type | Example | Notes |
|---|---|---|---|
| `bhramari_baseline_hz` | Float or `null` | `136.1` | Fundamental frequency from initial hum |
| `bhramari_baseline_metadata` | Object or `null` | see below | Captured alongside `bhramari_baseline_hz` |

`bhramari_baseline_metadata` minimum shape (each subfield null-safe):

```json
{
  "captured_at":     "2026-05-16T14:35:22Z",
  "duration_ms":     6200,
  "dominant_hz":     136.1,
  "harmonic_spread": 0.42,
  "stability":       0.81,
  "confidence":      0.74,
  "device_hint":     "browser-mic-default",
  "capture_method":  "bhramari-shanmukhi-v1"
}
```

`stability` and `confidence` are normalized 0–1. They are descriptive, not gating —
v1 does not reject low-confidence captures, it stores them with their score.

If the member skips Bhramari, both `bhramari_baseline_hz` and
`bhramari_baseline_metadata` are `null` and the cipher generates without them.

**Refinement (any time after baseline):**

Later captures are stored as new rows in `om_cipher_resonance_events`. The baseline
record is never altered. See §7 for schema. Members may capture as often as they like;
the system retains the full history.

---

## 2. Deterministic Derivation Model

All identity-layer computation is pure — no external API calls, no randomness, no
third-party ephemeris. Each layer is a stateless function. The engine lives in a
single `om_cipher_engine` module (Python, importable and independently testable).

### Layer 1 — Digital Root / Birth Number

- Reduce `birth_date` digits to a single root: e.g. `1988-04-23` → `1+9+8+8+0+4+2+3 = 35 → 3+5 = 8`
- Store both raw sum and reduced digit: `{ "raw": 35, "reduced": 8 }`
- Master numbers 11, 22, 33 are not further reduced

### Layer 2 — Name Resonance (Gematria)

- Pythagorean mapping (A=1…Z=26, reduce to 1–9) on `legal_name`
- Chaldean mapping (A=1, B=2… alternate table) as secondary value
- Derive: Expression number, Soul Urge (vowels only), Personality (consonants only)
- Store raw sums alongside reduced digits

### Layer 3 — Gene Keys / I Ching Layer

- Read `gk_gate_*` and `gk_line_*` from sealed input fields (one per compass point)
- Apply `GK_LINE_NAMES` lookup (already in `server.py`) to produce human-readable labels
- Derive primary Gate (The Work gate is the identity anchor in v1)
- Store: `{ gate: 34, line: 5, label: "Fixer", hexagram: "大壯" }`

### Layer 4 — Temporal Resonance

- Day-of-week ordinal, solar season quadrant (0–3) from `birth_date`
- Lunar phase: simple mean-anomaly approximation (no external ephemeris)
- Temporal gate (0–11, two-hour window) if `birth_time` is present; `null` otherwise
- Human Design fields (`hd_type`, `hd_authority`, `hd_profile`) read from sealed inputs
  if present; HD computation from lat/lng/time is deferred to v2

### Layer 5 — Seed Generation

Concatenate all Layer 1–4 reduced outputs as a deterministic canonical string. The
`BHR` term is included **only when a baseline capture exists**; otherwise it is omitted
from the canonical string entirely (not represented as a null literal). This keeps
seeds for members who never hum Bhramari stable and identical regardless of how the
optional layer is implemented.

```
With Bhramari:    "BR:8|EX:11|SU:3|PE:8|GK:34.5|LUN:4|SOL:2|TG:6|BHR:136.1"
Without:          "BR:8|EX:11|SU:3|PE:8|GK:34.5|LUN:4|SOL:2|TG:6"
```

`SHA-256` hash → 64-char hex. This is the **`om_cipher_seed`** stored in the DB.
Any replay against the same input bundle (identity + optional baseline) must produce
the same seed.

The seed is bound to the **baseline** Bhramari capture, not to subsequent refinements.
Refinement events do not change the seal.

### Layer 6 — Sigil Geometry

- Seed → seeded PRNG (`mulberry32` / `sfc32` — pure, no system random)
- Generate 9–12 vector control points on a unit circle; connect via cubic Bézier curves
- Output: normalized SVG `<path d="..."/>` with integer coordinates (no float drift)
- Fits `512×512` viewBox; always has a center node
- `birth_time` null → 9 points; present → 11 points
- Primary GK gate number modulates angular spacing of points (gate mod 8 → rotation offset)
- Bhramari does **not** affect geometric scaffolding in v1 — geometry remains stable
  across refinement events (geometry is identity-bound)

### Layer 7 — Resonance Palette

- Digital root → base hue: `hue = (root × 40) mod 360`
- Lunar phase → saturation modifier (±15%)
- GK gate shadow/gift/siddhi colour band (static lookup table, 64 entries) → accent
- **If `bhramari_baseline_hz` is present in v1:** apply a *minimal* frequency-to-light
  accent — octave-equivalence-mapped hue contributes a single additional accent stop
  in the palette (no more than ~10% perceptual shift). This is the v1 visual use of
  Bhramari: a measurable, non-decorative trace of the actual hum.
- **If absent in v1:** palette is fully determined by digital root + lunar + GK accent.
- Output: `primary_hue`, `secondary_hue` (complementary), `palette` (3 OKLCH values),
  and (if Bhramari present) `palette_resonance_accent`
- Full Bhramari-driven cymatic core, harmonic palette, and motion remain a **v1.1**
  concern. Frequency-note metadata (`bhramari_baseline_hz`, nearest semitone,
  octave-equivalent visible-light hue) is exposed in metadata in v1.

---

## 3. Privacy Model — Public / Private Projections

Om Cipher data is **never fully public by default.** Each field belongs to one of
three visibility tiers, enforced at the API layer.

| Tier | Fields | Default visibility |
|---|---|---|
| **Sealed / private** | Full input bundle, `seed`, raw gematria sums, HD authority, `bhramari_baseline_hz`, full `bhramari_baseline_metadata`, all `om_cipher_resonance_events` rows, `seed_syllable` | Member only; never exposed via public API |
| **Profile / shared** | `sigil_svg`, `sigil_png`, `palette`, digital root reduced value, primary GK gate + label, (optional) nearest semitone of current Bhramari resonance | Shown on Personal Homepage and cOMmons card when member publishes |
| **Metadata / on-request** | Expression/Soul Urge numbers, all GK gate/line labels, HD type + profile, Bhramari baseline summary (nearest semitone + frequency rounded) | Shown on Living Profile panel; visible to member; optionally shared |

A member controls the **shared** tier via a single publish toggle — no per-field
privacy UI in v1. Granular field-level sharing is a v2 concern.

The public cOMmons card shows only: sigil badge + palette + primary GK label.
Full numerology, HD, and Bhramari fields are never shown publicly in v1 unless the
member explicitly expands their profile. Raw `bhramari_baseline_hz` (full precision)
and all measurement metadata are private regardless of publish state.

---

## 4. Render Modes

| Mode | Output | Use |
|---|---|---|
| `sigil_svg` | Inline SVG, 512×512 | Canonical display everywhere |
| `sigil_png` | Pre-rendered PNG (128 / 256 / 512 px) | Thumbnails, `og:image`, exports |
| `badge` | SVG 64×64 compact, simplified geometry | cOMmons Field cards, inline avatars |
| `full_card` | SVG 512×512 + numerology + GK overlay text + (if present) Bhramari note metadata | Living Profile panel, print |
| `raw_json` | All derived values | API consumers, Nexus/Studio data feed |

SVG is always the source of truth. PNGs are cached derivatives. Render is triggered
**once** at Compass completion — never re-derived on page load. New Bhramari
refinement events update display-tier "current resonance" metadata but do not
re-render geometry.

---

## 5. Explanation Metadata

Every Om Cipher record ships a self-documenting `metadata` object. Descriptions use
**static string tables** — no AI generation at derivation time.

```json
{
  "digital_root":   { "value": 8,   "label": "The Achiever",     "description": "..." },
  "expression":     { "value": 11,  "label": "The Illuminator",   "description": "..." },
  "soul_urge":      { "value": 3,   "label": "The Creator",       "description": "..." },
  "gk_primary":     { "gate": 34,   "line": 5, "label": "Fixer",  "shadow": "Force",
                      "gift": "Strength", "siddhi": "Majesty" },
  "hd_type":        { "value": "Generator", "description": "..." },
  "hd_profile":     { "value": "3/5",       "description": "..." },
  "lunar_phase":    { "value": 4,   "label": "Full Moon",         "description": "..." },
  "solar_quarter":  { "value": 2,   "label": "Summer / Expansion","description": "..." },
  "seed_syllable":  { "value": "OM",  "note": "deferred to v2" },
  "bhramari": {
    "baseline_hz": 136.1,
    "nearest_semitone": "C#3",
    "octave_visible_hue_deg": 312,
    "captured_at": "2026-05-16T14:35:22Z",
    "stability": 0.81,
    "confidence": 0.74,
    "note": "Optional measured resonance. Refinement history available via /resonance-events."
  },
  "palette_rationale": "Hue 320° from root 8; gate 34 accent band; lunar +12% sat; Bhramari accent at 312°",
  "sigil_points": 11,
  "seed_hash": "a3f9...c2d1"
}
```

If Bhramari was not captured, the `bhramari` block is omitted entirely (not present
as a null). Nexus AI synthesis of metadata is a v2 concern. The `seed_hash` lets any
member independently verify their cipher was derived from their own sealed data.

---

## 6. Fallback Behavior

| Condition | Fallback |
|---|---|
| `birth_time` is null | Temporal gate omitted; HD computation deferred; sigil draws 9 points |
| `birth_place` unavailable | Solar quarter from `birth_date` only; HD chart deferred |
| GK fields not yet entered in Compass | Sigil geometry uses birth/name layers only; GK overlay omitted from `full_card` |
| HD fields null | HD section omitted from metadata; no error surfaced to member |
| **Bhramari baseline not captured** | Cipher generates fully without it. No accent contribution to palette. `bhramari` metadata block omitted. Member is invited (non-blocking) to capture a tone later from Studio/Living Profile. |
| **Bhramari capture is low-confidence** | Stored as-is with `confidence` score; member sees a gentle suggestion to recapture, but the cipher still generates. The capture is never silently discarded. |
| Compass not yet completed | Render a "pending" shimmer placeholder — 3 generic points, no numerology, no labels |
| Corrupt seed in DB | Re-derive from stored input bundle; surface error to admin if bundle also missing |
| SVG render fails client-side | Fall back to `sigil_png` 256px; if that fails, show initials in accent colour |

**Om Cipher never blocks page render.** It degrades gracefully to the next available
form. Partial data is not an error state — it is an invitation to complete Compass
or to add a Bhramari capture.

---

## 7. Data Persistence / API Shape

### DB Schema

Minimal addition to existing member record. The identity table is append-only and
has no editable fields. Bhramari refinement is captured in a separate append-only
events table so the original Compass seal is never rewritten.

```
om_cipher {
  member_id          UUID        PK / FK → members
  input_hash         VARCHAR(64) SHA-256 of sealed identity bundle (excludes refinement history)
  seed               VARCHAR(64) Layer 5 output
  sigil_svg          TEXT        Canonical SVG string
  sigil_png_128      BLOB / URL
  sigil_png_256      BLOB / URL
  sigil_png_512      BLOB / URL
  metadata           JSONB       Full explanation object (see §5)
  sealed_inputs      JSONB       Full identity input bundle (private; never in public API)
  bhramari_baseline_hz        FLOAT  NULLABLE  -- captured at Compass if member hums
  bhramari_baseline_metadata  JSONB  NULLABLE  -- timestamp, duration, stability, confidence, etc.
  visibility_tier    VARCHAR(16) "private" | "shared" | default "private"
  generated_at       TIMESTAMP
  version            INTEGER     DEFAULT 1
}

om_cipher_resonance_events {                  -- append-only refinement history
  id                  UUID        PK
  member_id           UUID        FK → members / om_cipher.member_id
  captured_at         TIMESTAMP   NOT NULL
  bhramari_hz         FLOAT       NOT NULL
  metadata            JSONB       NOT NULL    -- same shape as bhramari_baseline_metadata
  capture_method      VARCHAR(64)             -- e.g. "bhramari-shanmukhi-v1"
  source_surface      VARCHAR(32)             -- "compass" | "studio" | "living-profile" | etc.
  -- no UPDATE or DELETE in v1; rows are immutable once written
}
```

Both Bhramari tables are private at the API layer. They never appear in any public
response. Only summarized, low-precision projections (nearest semitone, rounded
frequency) are eligible for the shared tier.

### API Endpoints

```
GET  /api/members/:id/om-cipher
     Auth required. Returns full record for the authenticated member.
     → { seed, sigil_svg, sigil_png_256, metadata, generated_at,
         bhramari: { baseline_hz, baseline_metadata, latest_event_summary } | null }

GET  /api/members/:id/om-cipher/public
     No auth. Returns only shared-tier fields if visibility_tier = "shared".
     → { sigil_svg_badge, palette, gk_primary_label, digital_root_label,
         bhramari_semitone? }                  // semitone-only, no raw hz
     → 404 if visibility_tier = "private"

GET  /api/members/:id/om-cipher/badge
     No auth. Returns badge SVG + palette only. Always available once generated.
     → { sigil_svg_badge (64×64), palette }

POST /api/members/:id/om-cipher/generate
     Auth required. Body: { input_bundle, bhramari_capture? }
     → Creates record if none exists
     → 409 Conflict if already generated with same input_hash (idempotent)
     → Different input_hash requires explicit admin override flag
     → Sealed identity inputs stored encrypted at rest; never returned in any response
     → bhramari_capture is optional. If absent, record is generated without it.
     → If present, bhramari_baseline_hz + bhramari_baseline_metadata are sealed
       alongside the identity bundle (but not part of input_hash; see §2 Layer 5).

POST /api/members/:id/om-cipher/resonance-events
     Auth required. Body: { bhramari_hz, metadata, capture_method, source_surface }
     → Appends a new resonance event. Never modifies om_cipher.
     → Returns the created event row.
     → Available any time after baseline (or even without baseline; first event then
       acts as an informal baseline reference but does not retroactively become the
       sealed baseline).

GET  /api/members/:id/om-cipher/resonance-events
     Auth required.
     → Returns the member's full append-only Bhramari history, newest first.
     → Never exposed publicly.

PATCH /api/members/:id/om-cipher/visibility
     Auth required. Body: { visibility_tier: "private" | "shared" }
     → Only field on om_cipher that is ever writable post-generation.
```

The `POST /generate` endpoint is called **once**, at Compass completion.
`sealed_inputs`, full `bhramari_baseline_metadata`, and all resonance events are
stored but never returned in any public response — only `seed_hash` and (optionally)
a semitone-level Bhramari summary are exposed.

---

## 8. Wiring Points

### Studio

- Display `sigil_svg` in the Studio identity strip alongside member name
- Feed `palette` into Studio's ambient colour theme (optional, non-blocking)
- `metadata` (full private tier) available to Nexus AI as archetypal context seed
- Studio surfaces a "Capture / refine Bhramari" action — invokes Tuner / mic capture
  flow and posts to `/resonance-events`. Non-blocking; optional; never required to
  use Studio.
- Existing Studio flows: unchanged

### Living Profile

- Om Cipher renders as a **dedicated, read-only panel** — does not replace or reorder
  any existing section
- Panel shows: `full_card` SVG + expandable metadata breakdown (digital root, GK gates,
  HD type/profile, gematria numbers, and Bhramari baseline + most recent event when
  present)
- "Refine resonance" affordance opens the Bhramari capture flow; new events appear
  in a small append-only timeline within the panel
- The panel is non-editable — identity fields are the objective layer; Bhramari
  refinements are append-only and never overwrite the baseline
- **Existing Living Profile UX is entirely preserved**

### Personal Homepage / Profile Page

- `sigil_png_256` or `sigil_svg_badge` placed in existing profile header, alongside avatar
- On hover/tap: expands to `full_card` in a sheet/modal overlay
- `og:image` for link previews uses `sigil_png_512`
- Visibility follows `visibility_tier` — if private, badge is shown to member only;
  public visitors see a generic placeholder
- Public expansion may show a semitone-level Bhramari note ("resonant note: C#") if
  the member is `shared`; raw frequency is never public
- **No redesign of existing profile layout** — Om Cipher inserts into the existing
  avatar/header zone only

### cOMmons / Field

- Member cards in the Field grid show `badge` render (64×64) for members who have
  `visibility_tier = "shared"`
- Members with `visibility_tier = "private"` show a generic Field card with no cipher
- Om Cipher data is included in the publish payload automatically — **no new UI step**
  in the existing publish flow
- Tapping a badge on a public Field card opens an overlay: `full_card` + shared-tier
  metadata only
- **Existing publish/card flow structure is unchanged**

### Backend (server.py) — minimal additions required

- New `OmCipherInput` Pydantic model (does not touch existing `PointData` or
  `GenerateRequest`)
- New `BhramariCapture` Pydantic model (optional sub-object of `OmCipherInput` and
  primary body of `/resonance-events`)
- New routes appended to existing route list:
  - `POST /om-cipher/generate`
  - `GET  /om-cipher/:id`
  - `GET  /om-cipher/:id/public`
  - `GET  /om-cipher/:id/badge`
  - `POST /om-cipher/:id/resonance-events`
  - `GET  /om-cipher/:id/resonance-events`
  - `PATCH /om-cipher/:id/visibility`
- `om_cipher_engine.py` as a new standalone module — no imports into existing
  generation pipeline
- GK fields already in `PointData` (`gk_num`, `gk_line`) are **read by** Om Cipher
  engine at generation time; they are not moved or renamed

### Future Constellation Nodes (Nexus, Gene Keys matching, Field resonance)

- `seed`, `metadata`, and all sealed system fields are the join keys for future products
- Nexus reads `/api/members/:id/om-cipher` and uses `metadata` as a reasoning context
- Constellation matching compares `gk_primary.gate`, `hd_type`, `digital_root`, and
  `palette` across members; semitone-level Bhramari may join matching in a later phase
- `bhramari_baseline_hz`, the append-only refinement history, and `seed_syllable` are
  pre-sealed and ready for the Tuner / sound-healing layer without requiring any
  re-collection from the member. The Tuner layer (v1.1+) consumes
  `om_cipher_resonance_events` directly.

---

## 9. Migration Strategy

**Additive only. No existing tables, routes, models, or UI flows are modified.**

1. **New DB tables** `om_cipher` and `om_cipher_resonance_events` — migration only
   adds; nothing altered on existing tables.
2. **New module** `om_cipher_engine.py` — standalone; not imported by `server.py` until
   new routes are appended.
3. **Compass onboarding:** append a single "Seal your Om Cipher" step at the very end
   of the existing Compass flow — one confirmation action after all input is collected.
   Member sees their sigil for the first time here. The same step *offers* (does not
   require) a Bhramari capture. Skipping is a single tap. No existing Compass screens
   change.
4. **Existing members without Om Cipher:** show "pending" placeholder everywhere.
   Surface a one-time prompt: *"Your Om Cipher is ready to be sealed — return to
   Compass to complete it."* No forced re-onboarding.
5. **Living Profile panel:** new collapsible panel appended after existing sections.
   No reordering of existing panels.
6. **Profile page / cOMmons badge:** inserted into existing avatar header zone via
   `position: relative` — no layout rewrite.
7. **Feature flags:** all Om Cipher render calls wrapped in
   `feature.om_cipher_enabled`. Bhramari capture flow is additionally wrapped in
   `feature.bhramari_capture_enabled` so the ritual can be enabled, disabled, or
   refined independently as we learn from real captures. Toggling either off removes
   the corresponding UI without touching any existing routes or views.

All migrations are fully reversible. Rolling back drops `om_cipher` and
`om_cipher_resonance_events`, removes feature-flagged UI inserts, and restores
`server.py` to its current state.

---

## 10. Test / QA Checklist

### Determinism

- [ ] Same identity input bundle produces identical `seed`, `sigil_svg`, and core
      `metadata` on 100 consecutive calls
- [ ] Identical identity bundle with vs. without a Bhramari capture produces
      different `seed_hash` only when Bhramari is included in §2 Layer 5; the
      identity-only seed string remains canonical when Bhramari is absent
- [ ] Subsequent Bhramari refinement events do **not** change `seed`, `sigil_svg`,
      or `input_hash`
- [ ] Null `birth_time` consistently produces 9-point sigil (not 11)
- [ ] GK fields absent → sigil geometry still renders using birth/name layers only
- [ ] Seed is stable across Python and JS implementations if both are used

### Input Validation

- [ ] Rejects malformed `birth_date`; returns `400` with a clear error
- [ ] Handles non-ASCII legal names (UTF-8 NFC normalization confirmed)
- [ ] `POST /generate` returns `409` on duplicate `input_hash`
- [ ] `POST /generate` with different `input_hash` requires admin override flag
- [ ] `POST /resonance-events` accepts captures with `confidence` 0–1 and never
      rejects on low confidence; rejection only on malformed payload
- [ ] `POST /resonance-events` succeeds even if no baseline was captured at Compass

### Privacy / Visibility

- [ ] `GET /om-cipher/:id/public` returns `404` when `visibility_tier = "private"`
- [ ] `sealed_inputs` and full `bhramari_baseline_metadata` never appear in any
      public API response body
- [ ] `om_cipher_resonance_events` rows are never returned by any public endpoint
- [ ] `seed_hash` exposed; full input bundle is not
- [ ] Badge endpoint returns only badge + palette regardless of visibility tier
- [ ] Public Bhramari exposure (when shared) is limited to semitone + rounded
      frequency; raw hz precision and metadata stay private

### Render Integrity

- [ ] SVG is valid XML; parses without error in browser and in Python `lxml`
- [ ] Badge (64×64) renders legibly at all target sizes
- [ ] PNG exports match SVG geometry (no render divergence)
- [ ] `og:image` 512px PNG meets social card minimum dimensions (1200×630)
- [ ] Palette renders correctly both with and without a Bhramari baseline; visual
      regression between the two is bounded and intentional (single accent stop only)

### Fallback

- [ ] "Pending" placeholder renders when no Om Cipher record exists
- [ ] Living Profile, Profile Page, and cOMmons all render without error for members
      with incomplete or missing Om Cipher
- [ ] Members who skip Bhramari render identically to members who never had the
      option — no broken UI states
- [ ] Feature flag off → zero Om Cipher UI visible, no JS errors
- [ ] `feature.bhramari_capture_enabled = false` hides all capture affordances while
      leaving generated ciphers intact

### Existing UX Regression

- [ ] Living Profile existing panels: order, content, and interaction unchanged
- [ ] Profile page layout intact; badge does not overflow or shift existing elements
- [ ] cOMmons publish flow unchanged (no new required step)
- [ ] Studio loads without latency increase (Om Cipher data cached; not re-derived)
- [ ] `PointData` model in `server.py` unchanged; `gk_num` / `gk_line` fields untouched

### Security

- [ ] Generate endpoint requires authentication
- [ ] Visibility PATCH endpoint requires authentication and ownership check
- [ ] Resonance-events POST requires authentication and ownership check
- [ ] `om_cipher` and `om_cipher_resonance_events` tables have no public write endpoints
- [ ] Raw Bhramari frequency and metadata are not logged in plaintext

---

## 11. Non-Goals for V1

- No real-time re-derivation — the cipher is generated once, cached, never recomputed
- No external astrology or HD chart APIs — all computation is pure math or sealed input
  in v1; third-party chart generation is a v2 concern
- No user editing of sealed Om Cipher identity inputs after generation — immutability
  is by design (Bhramari refinement is *additive*, not editing)
- No AI-generated descriptions at derivation time — metadata uses static string tables;
  Nexus synthesis is v2
- No animated or generative sigils — v1 is static SVG; motion is a v2 progressive
  enhancement
- No Bhramari-driven cymatic core geometry in v1 — geometry is identity-bound. The
  full Bhramari-as-cymatic-engine layer is v1.1+.
- No Om Cipher comparison or resonance-matching UI across members — that is a
  Constellation / Field feature for a later phase
- No audio playback of `bhramari_baseline_hz` or `seed_syllable` — fields are sealed
  and ready; the Tuner / sound layer is out of scope for v1
- No granular per-field privacy controls — v1 uses a single `visibility_tier` toggle
- No redesign of Living Profile, profile page, cOMmons, or Studio

---

## 12. Bhramari Integration Principles (Summary)

Carried forward so this is unambiguous:

1. **Core to the ritual, not decorative.** Bhramari is the somatic activation of
   Om Cipher. The hum is not optional ornament; it is the canonical way the member
   *enters* their own resonance signature.
2. **Optional in v1.** Members may seal a cipher without humming. Om Cipher generates
   fully from fixed identity inputs. No member is blocked from completion.
3. **Baseline + append-only refinement.** The first capture is sealed as
   `bhramari_baseline_hz`. Later captures are stored in
   `om_cipher_resonance_events` and never overwrite the baseline.
4. **Distinct from identity immutability.** Birthdate, name, GK, and HD are
   permanently immutable. Bhramari is *measured*, *refineable*, and history-preserving.
5. **Refineable as we learn.** The capture method, metadata shape, and confidence
   scoring are versioned (`capture_method` field) so the system can improve over time
   without invalidating earlier captures.
6. **Privacy first.** Raw frequency and full metadata are always private. Only
   semitone-level summaries can flow to shared / public projections.
7. **Visual use is minimal in v1.** A single palette accent and metadata exposure.
   Full Bhramari-driven cymatic, harmonic, and motion layers ship in v1.1+.

This is how we honor the ritual without freezing it, and how we keep the Compass
seal pure while letting the body keep speaking.
