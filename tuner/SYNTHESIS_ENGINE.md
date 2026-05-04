# CommonUnity Tuner — Synthesis Engine
### Living Reference Document

**Current engine version:** v2.0  
**Source file:** `tuner/shared/genekeys.ts`  
**Last updated:** 2026-05-04  
**Maintained by:** Markus / CommonUnity  

---

> This document is the authoritative reference for the Tuner's synthesis engine. It explains what the engine calculates, why each mapping exists, what assumptions it makes, and how to upgrade it. Every time a mapping changes in code, this document must be updated. Field results and practitioner observations are recorded here and become the basis for future upgrades.

---

## Purpose

The Tuner's core IP is not the calculation of Gene Key activations — that is standard Human Design ephemeris work. The IP is the **cross-atlas synthesis**: taking a single Radiance activation (gate + line) and simultaneously resolving it across five independent esoteric and clinical systems, then deriving convergence signals that guide a practitioner toward the most appropriate sound healing session structure.

No published system does this mapping. The chains described below are original synthesis work.

---

## The Core Model: Heart as Pivot

The foundation of the synthesis framework is drawn from a consciousness model (ref: page 17 of source framework document):

- The **heart chakra (Anāhata)** is the **equilibrium pivot** of the entire body-consciousness system.
- **Above the heart** (Throat → Third Eye → Crown) = Higher Self / spiritual / field domain. Language: frequency, breath, intention, subtle body.
- **Below the heart** (Solar Plexus → Sacral → Root) = Lower Self / material / somatic domain. Language: body, instinct, structure, physical matter.
- The heart itself is **neither above nor below** — it is the balance axis where both halves can meet.

This vertical axis is the structural spine of the entire synthesis. Every gate, every line, every fork recommendation is evaluated relative to this axis.

---

## Step 1 — Radiance Activation Calculation

**Input:** birth date (YYYY-MM-DD) + birth time (HH:MM UTC, optional)  
**Output:** `{ gate: 1–64, line: 1–6, precise: boolean }`

### Method (Compass / Meeus — verified correct)

```
Birth datetime (UTC)
  → Julian Day Number (Meeus Ch. 7)
  → Apparent Solar Longitude in tropical degrees (Meeus Ch. 25/27, ~0.01° accuracy)
  = natal Sun longitude (csLon)  →  Life's Work gate/line

csLon − 88° (arc degrees, NOT calendar days)
  = Radiance longitude             →  Radiance gate/line  ← primary activation

csLon + 180°                       →  Evolution gate/line
Radiance lon + 180°                →  Purpose gate/line
```

**Critical:** The 88° subtraction is in degrees of solar arc, not calendar days. The Sun moves ~1°/day but not exactly — using calendar days introduces up to ~1 gate of error over a lifetime. The Compass app uses arc degrees and produces verified correct results.

### Gate Wheel

The HD gate wheel has **gate 25 at 0° Aries** (not gate 41 as some implementations incorrectly use). Each gate spans 5.625° (360° / 64). Lines subdivide each gate into 6 segments of 0.9375° each.

### Verification

- Nov 18, 1973 / 08:21 UTC → natal Sun 235.86° → Radiance lon 147.86° → **GK 29.4** ✓  
  (Confirmed against official Gene Keys profile)

### Known Limitations

- Birth time is treated as UTC. Local timezone of birthplace is not automatically applied. For maximum precision, the user should enter the UTC-equivalent birth time. This introduces ±1 line error near line boundaries for far-from-UTC timezones.
- The Radiance activation is the primary therapeutic activation. Life's Work, Evolution, and Purpose are calculated but not yet surfaced in the UI.

---

## Step 2 — Five Atlas Lookup Chains

From the Radiance `gate` and `line`, five independent lookup chains run in parallel.

### Chain A — Gene Keys Spectrum (gate → psychological layer)

```
gate → GATES[gate]
     → { name, shadow, gift, siddhi, codonRing }
```

Gives the **psychological arc** of the activation: what the person is moving from (shadow frequency), through (gift frequency), toward (siddhi frequency). This is the Gene Keys system of Richard Rudd.

**Source:** Gene Keys (Richard Rudd, 2009/2013)  
**Upgrade vector:** As the Gene Keys body of work expands (e.g. Venus Sequence depth, Codon Ring biology), additional fields can be added to each gate entry.

---

### Chain B — Gate → HD Center → Chakra → Kosha (field layer)

```
gate → GATES[gate].center
     → CENTER_TO_CHAKRA[center]
     → { chakraId, chakraName, freqHz, instrumentId, axis }
     → CHAKRA_TO_KOSHA[chakraId]
     → { layer: 1–7, name, biofieldPosition }
```

Maps the **gate's HD center** to a chakra frequency, a biofield instrument, and a **kosha field layer** — telling the practitioner which band of the biofield to work in.

**The `axis` field** (added v2.0) classifies each center relative to the heart pivot:

| Center | Chakra | Axis | Domain |
|--------|--------|------|--------|
| ROOT | Mūlādhāra | below | Lower Self / somatic |
| SACRAL | Svādhiṣṭhāna | below | Lower Self / somatic |
| SOLAR | Maṇipūra | below | Lower Self / somatic |
| SPLEEN | Svādhiṣṭhāna / Spleen | below | Lower Self / somatic |
| HEART | Anāhata | **heart** | Equilibrium pivot |
| G | G-Center / Anāhata | **heart** | Equilibrium pivot |
| THROAT | Viśuddha | above | Higher Self / field |
| AJNA | Ājñā | above | Higher Self / field |
| CROWN | Sahasrāra | above | Higher Self / field |

**Source:** Human Design system (Ra Uru Hu / IHDS). Chakra mapping is a synthesis layer.  
**Upgrade vector:** The Spleen center mapping (currently → Sacral) may warrant refinement. Field practitioners report the Spleen center often manifests in the mid-body immune/lymphatic region — closer to solar plexus. This is a candidate for v3 refinement based on session data.

---

### Chain C — Gate → Codon Ring → Element → Dosha (Ayurvedic tendency)

```
gate → GATES[gate].codonRing
     → CODON_RING_TO_ELEMENT[ring]
     → { element, dosha, quality }
```

Connects Gene Keys codon biology to the Ayurvedic five-element / three-dosha framework. This gives a **constitutional tendency** — not a diagnostic. Relevant to lifestyle and dietary recommendations, and to session pacing (Vata clients need grounding; Pitta clients need cooling; Kapha clients need activation).

**Source:** Codon ring assignments from Gene Keys (Rudd). Dosha mapping is original synthesis.  
**Upgrade vector:** Dosha mappings are currently based on element/quality inference. They should be validated against Ayurvedic practitioner consultation and refined with session field data. This is one of the highest-priority upgrade vectors.

---

### Chain D — Line → Purpose Line Body Layer + Application Mode

```
line (1–6) → LINE_DATA[line]
           → { archetype, bodyLayer, bodyLayerDesc }
           → { entryVector, forkPolarity }
           → { fieldDepth, applicationMode }
```

This is the **therapeutic application layer**. The six Purpose Lines map to six levels of physical body structure, following the Gene Keys somatic body wisdom model:

| Line | Archetype | Body Layer | Entry Vector | Fork Polarity |
|------|-----------|------------|--------------|---------------|
| 1 | Foundation | Bones / Skeleton | somatic-first | weighted |
| 2 | Hermit | Organs | somatic-first | weighted |
| 3 | Martyr | Glands / Endocrine | bridge | bridge |
| 4 | Opportunist | Nervous System | field-first | unweighted |
| 5 | Heretic | Blood / Circulation | field-first | unweighted |
| 6 | Role Model | Cells / DNA | field-first | unweighted |

**Entry Vector** (added v2.0): the natural direction of therapeutic entry.  
- `somatic-first` — body opens the field (Lines 1–2). Weighted fork contact initiates the session.  
- `bridge` — either direction valid; breath is the primary carrier (Line 3). Works at the glandular/endocrine interface.  
- `field-first` — frequency, breath, and intention organise the subtle body; the physical body responds downstream (Lines 4–6). Unweighted forks in the air field are the primary instrument.

**Fork Polarity** (added v2.0): which class of fork leads.  
- `weighted` — bone/tissue conduction. Body as receiver.  
- `bridge` — both weighted and unweighted valid.  
- `unweighted` — air conduction. Field as receiver. **These are the correct tools for aligning fields in Lines 4–6.**

**Source:** Purpose Line body layer map — Gene Keys somatic chapters (Rudd). Entry vector and fork polarity are original synthesis.  
**Upgrade vector:** The `applicationMode` text strings are the most direct upgrade point for practitioners. Each line's application text should be refined based on actual session outcomes. These strings feed directly into protocol display.

---

### Chain E — Line → Somatic Kosha

```
line (1–6) → LINE_DATA[line]
           → { somaticKoshaLayer, somaticKoshaName }
```

Separately from Chain B (which derives kosha from the gate's chakra), the line also maps to a kosha — from the **somatic/body depth** side. This gives two independent kosha readings per activation.

**Key insight** (v2.0 refinement): for Lines 4–6, the somatic kosha is Manomaya (mental/breath body), Vijnanamaya (wisdom body), or Anandamaya/Buddhimaya (bliss/subtle body). These are **field-domain koshas** despite being called "somatic" in the chain name. The breath, frequency, and intention are the tools for these layers — not physical fork contact. The naming in code should eventually be updated to `activationKosha` to remove the misleading "somatic" label.

---

## Step 3 — Dual Convergence

Two convergence checks run independently and are combined in the `convergenceNote`.

### Kosha Convergence (original, v1.0)

```
Chain B field kosha layer  ←→  Chain E line kosha layer
```

If they match → **strong convergence** — both the gate's field signal and the line's depth signal point to the same kosha. This is the primary therapeutic layer.  
If they differ → **split** — address both layers within the session.

### Vertical Convergence (added v2.0)

```
centerData.axis (above / heart / below)  ←→  lineData.entryVector (field-first / bridge / somatic-first)
```

Four outcomes:

| Outcome | Condition | Clinical meaning |
|---------|-----------|-----------------|
| `aligned` | axis=above + ev=field-first, OR axis=below + ev=somatic-first | Both signals point the same direction. Session is clear and unambiguous. |
| `heart-bridge` | axis=heart (any line) | Gate sits at the equilibrium pivot. OM fork (136.10 Hz) IS the session anchor. Work both directions from the heart. |
| `split` | axis=above + ev=somatic-first, OR axis=below + ev=field-first | Gate and line point opposite directions. OM fork bridges the two halves. Entry order: OM first, then follow the line's entry vector. |
| `neutral` | ev=bridge (Line 3, any axis) | No dominant direction. Breath is the carrier. |

**OM Anchor flag:** `omAnchor = true` whenever `verticalConvergence` is `heart-bridge` or `split`. When true, `TF-OM-136W` is automatically promoted to the top of the primary instruments list. This reflects the design principle: *"OM is the centerpiece — the opener and closer of every session."*

---

## Step 4 — Polarity-Filtered Instrument Shortlist

Instrument recommendations are drawn from two sources and merged:

1. `CENTER_INSTRUMENTS[center]` — forks matched to the gate's chakra center
2. `LINE_INSTRUMENTS[line]` — additional forks matched to the line's body layer

**v2.0 polarity filter:**

- `forkPolarity = unweighted` (Lines 4–6): unweighted forks lead; weighted forks demoted to secondary. The field is the primary receiver.
- `forkPolarity = weighted` (Lines 1–2): weighted forks lead; far-field unweighted demoted. The body is the primary receiver.
- `forkPolarity = bridge` (Line 3): no reordering. Both classes are valid.
- `omAnchor = true`: OM fork (`TF-OM-136W`) auto-inserted at position 0 of primary list.

Output: up to 5 primary instruments + up to 3 secondary instruments.

---

## The OM Constant

The OM fork (136.10 Hz, weighted) is the **ceremonial container** of every session — opener and closer regardless of gate or line. Two heart-frequency forks at the sternum is the signature co-chanting practice.

In the engine, OM is:
1. Always in `CENTER_INSTRUMENTS[HEART]` and `CENTER_INSTRUMENTS[G]`
2. Auto-promoted to primary position 0 when `omAnchor = true`
3. Never demoted to secondary — it is not subject to polarity filtering

This is a hardcoded constant, not a variable. It does not need to be in the upgrade loop.

---

## How to Upgrade This Engine

The engine is designed to get better with every session. Here is the upgrade protocol:

### Level 1 — Text Refinements (no interface changes)

Update `applicationMode` strings in `LINE_DATA` based on practitioner field experience. These strings feed directly into the protocol display. No TypeScript interface changes needed. Commit with tag: `refine(tuner): applicationMode — Line N [observation]`.

### Level 2 — Mapping Refinements (data changes only)

Update values in `CODON_RING_TO_ELEMENT`, `CHAKRA_TO_KOSHA`, or `CENTER_TO_CHAKRA` based on new source material or field data. Interface unchanged. Commit with tag: `refine(tuner): [atlas name] — [what changed and why]`.

### Level 3 — New Atlas Integration (interface + data + UI)

Add a new synthesis chain (e.g. Human Design variable, Gene Keys activation sequence, Ayurvedic Prakriti overlay). Steps:
1. Add new fields to `RadianceProfile` interface in `genekeys.ts`
2. Add new lookup table
3. Add new chain in `synthesizeRadianceProfile()`
4. Update `nexusSummary` string
5. Update `RadianceCard.tsx` and/or `QuestionnaireResult.tsx` to surface the new field
6. Update this document — add a new Chain section above
7. Commit with tag: `feat(tuner): [chain name] atlas integration`

### Level 4 — Calculation Upgrades (ephemeris layer)

Any changes to the `calculateRadiance()` function (new sphere calculations, timezone correction, precession adjustment). These require verification against official Gene Keys profiles before merging. Commit with tag: `fix(tuner): ephemeris — [what changed]`.

---

## Field Observations Log

*Practitioners: record session observations here. Include: gate/line of client, what worked, what didn't, any unexpected resonance patterns. This log directly informs upgrades.*

| Date | Client GK | Observation | Upgrade implication |
|------|-----------|-------------|---------------------|
| — | — | — | — |

---

## Planned Upgrades (v3+)

| Priority | Upgrade | Notes |
|----------|---------|-------|
| High | Rename `somaticKosha` → `activationKosha` in interface | The "somatic" label is misleading for Lines 4–6 which are field-domain |
| High | Dosha mapping validation | Current codon→dosha mappings need Ayurvedic practitioner review |
| Medium | Spleen center axis refinement | May map closer to Solar than Sacral in practice |
| Medium | Life's Work / Evolution / Purpose display in UI | Currently calculated but not surfaced |
| Medium | Timezone-corrected birth time input | Currently UTC only — affects line precision for non-UTC births |
| Low | Venus Sequence depth fields per gate | Richard Rudd's Venus Sequence adds sub-sphere detail |
| Low | Human Design variable overlay | Four Arrows / Determination / Environment integration |

---

## Source Attribution

| System | Source |
|--------|--------|
| Gene Keys gate/shadow/gift/siddhi | Richard Rudd, *The Gene Keys* (2009/2013) |
| Human Design center/gate assignments | Ra Uru Hu / IHDS |
| Gene Keys gate wheel (ephemeris) | HD standard — verified via Compass app |
| Purpose Lines body map | Richard Rudd, *The Gene Keys* somatic chapters |
| Kosha system (5 + 7 layers) | Taittiriya Upanishad; Brennan synthesis |
| Chakra system | Classical Tantric tradition |
| Consciousness / heart-pivot framework | Source document p.17 (image.jpg, session 2026-05-04) |
| Codon Ring → Dosha mappings | Original CommonUnity synthesis |
| Entry vector / fork polarity / vertical convergence | Original CommonUnity synthesis |
| Instrument assignments | Sound healing clinical practice synthesis |

---

*This document is version-controlled in the monorepo alongside the engine it describes. When the engine changes, this document changes. When a practitioner discovers something in the field, this document records it. The protocols in the app self-adjust because they draw directly from the data structures and strings defined in `genekeys.ts` — upgrading the engine upgrades every generated protocol automatically.*
