# cOMmons / Field

Status: v0.1 stub. Canonical source: [`../foundation/commonunity-architecture-v0.2.md`](../foundation/commonunity-architecture-v0.2.md), section *"cOMmons / Field"*.

## What cOMmons is

cOMmons is the **relational field** where coherent people, projects, offerings, and intentions meet.

## Default interaction mode: intention-led resonance

cOMmons should **not** default to a public directory or gallery of people. Its default mode is intention-led resonance:

> A member offers a sankalpa, need, question, or offering, and the OM Field returns resonant presences or pathways.

A master field directory may exist for the system steward/developer and (later) possibly for visible members, but **directory browsing is not the primary interaction model.**

## What lives on cOMmons

- The **public projection layer** of a member's Cipher + Living Profile (member-controlled refraction).
- Field resonance events (offerings, sankalpas, questions).
- The relational pathways between members that emerge from resonance.

## What does not live on cOMmons

- Raw source data from Om Cipher.
- Private Living Profile content the member has not consented to project.
- Browseable profile cards as the default surface.

## Current state

- Deployed at `https://commons-production-8914.up.railway.app/field`.
- Future canonical domain: `https://commons.commonunity.io`.
- Magic-link auth via SMTP (working post Railway Pro upgrade).
- SQLite data store.
- Three beta profiles seeded: Markus, Eda, Vesna.
- Public projection layer exists for safe cOMmons data.

See [`../architecture/deployment-model.md`](../architecture/deployment-model.md) for infrastructure detail.

## Open work

- Make resonance the *visible* default, not just the conceptual one — the current UI may still imply browsing.
- Define the resonance event shape and the matching/return logic.
- Wire cOMmons cover/node states to the canonical Om Cipher engine in `node` mode.
- Wire cOMmons Profile to the canonical engine in `full` mode.
