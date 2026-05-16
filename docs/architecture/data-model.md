# Data Model

Status: v0.1 stub. Canonical source for Om Cipher inputs and visual mappings: [`../foundation/commonunity-architecture-v0.2.md`](../foundation/commonunity-architecture-v0.2.md).

This document names the principal data entities and how they relate. It is intentionally schema-light; the authoritative shapes are defined by the canonical Om Cipher engine and by the cOMmons public projection layer.

## Principal entities

### Member

The atomic unit. Created via Compass facilitation. Holds the relationships below.

### Om Cipher (source pattern)

Fixed / slow-changing source data. Inputs:

- `birthdate` → digital root
- `gene_keys` → `{ lifes_work, evolution, radiance }` (and full sequence as available)
- `human_design_type` ∈ { Manifestor, Generator, Manifesting Generator, Projector, Reflector }
- `name` → numerology / gematria
- `handle` (deterministic seed stabilizer; not visible)
- `seed_syllable` (default: `"Om"`)
- `frequency_signature` → `{ fundamental_hz, dominant_harmonic, harmonic_spread, tonal_stability, resonance_envelope }`

The engine maps these to a deterministic SVG output and a derived palette. See the architecture brief for the full input-to-visual mapping table.

### Living Profile (lived expression)

Subjective / evolving qualia. Shape is intentionally open. Typical fields:

- Projects, offerings, services
- Current intentions, sankalpa, questions
- Creative stream entries
- Relational commitments
- Practice and healing work
- Public bio fragments

Living Profile is generated through Compass and continuously refined by the member in Studio.

### Public Projection (cOMmons surface)

A deliberate, member-controlled refraction of Cipher + Profile, safe for the cOMmons surface. The public projection layer is the *only* path by which member data appears on cOMmons. Private source data never leaks directly.

Three beta profiles currently exist: Markus, Eda, Vesna (per [`../handoffs/next-thread-handoff.md`](../handoffs/next-thread-handoff.md)).

### Field Resonance Event

When a member offers an intention/sankalpa/question on cOMmons, a resonance event is recorded and the Field returns resonant presences or pathways. Schema is open; the design constraint is that resonance — not directory browsing — is the default discovery mechanism.

## Relationships

```text
Member 1 ──── 1 Om Cipher (source)
Member 1 ──── 1 Living Profile (lived)
Member 1 ──── 0..1 Public Projection (consented refraction)
Member 1 ──── 0..n Field Resonance Events
```

## Storage today

- cOMmons currently uses SQLite (per the handoff).
- Studio data is held client-side and via `server.py` glue.
- The canonical Om Cipher engine, once finalized, will be a pure logic module — no storage of its own; deterministic given inputs.

## Open work

- Define the canonical Om Cipher input contract as a typed, versioned schema.
- Define the Public Projection shape explicitly (today it is implicit).
- Decide where Living Profile of record lives (Studio client, cOMmons SQLite, or a shared service).

These are tracked in [`../handoffs/next-thread-handoff.md`](../handoffs/next-thread-handoff.md).
