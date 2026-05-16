# Audit Rituals

Status: v0.1. This document defines the **milestone-based integrity audit ritual** that keeps CommonUnity coherent as it grows. The audit uses the [adapted 8 limbs of yoga](../foundation/adapted-8-limbs.md) as its frame.

## Why we audit

CommonUnity is not built by completing a backlog. It is built by repeatedly checking whether the work — at this stage — still serves the seed pattern: *a new baseline of creation, oriented toward Unity.*

A milestone is not complete because the code merged. It is complete when it has passed an integrity audit against the 8 limbs.

## When to run the ritual

Run an integrity audit at every one of the following:

1. **End of an architecture milestone** — e.g. canonical Om Cipher engine landed; cOMmons resonance flow shipped; Compass intake captured in a defined shape.
2. **Before a new surface ships** — any new member-facing surface (Studio room, cOMmons feature, Personal Home capability, standalone product).
3. **After any significant scope change** — when something is added, removed, or redefined in the architecture brief.
4. **When something feels off** — discomfort is a valid trigger. Run the ritual rather than ignoring the signal.

## The ritual

The ritual is deliberately slow. It is meant to be done with attention, not as a checklist exercise.

### Step 1 — Set the seat

Open the ritual by re-reading two documents:

- [`../foundation/commonunity-architecture-v0.2.md`](../foundation/commonunity-architecture-v0.2.md) (or the current canonical brief)
- [`../foundation/philosophical-principles.md`](../foundation/philosophical-principles.md)

This re-establishes orientation. Do not skip.

### Step 2 — Name the milestone

In one sentence: what was the milestone? What was the single intention?

### Step 3 — Walk the 8 limbs

Walk each limb in order against the completed work. For each, record one of:

- ✅ **Passes** — and why.
- ⚠️ **Passes with reservation** — and what the reservation is.
- ❌ **Fails** — and what needs to happen.

The limbs (full definitions in [`../foundation/adapted-8-limbs.md`](../foundation/adapted-8-limbs.md)):

1. **Yama** — relational integrity. *What relationships does this work touch, and does it leave each of them in greater integrity?*
2. **Niyama** — internal discipline. *Could a future steward pick this up cold and feel its care?*
3. **Asana** — structural seat. *Where does this sit in the system map, and is the seat stable?*
4. **Pranayama** — energy flow. *Where does breath catch in this experience?*
5. **Pratyahara** — removal of noise. *What can be removed without loss? Remove it.*
6. **Dharana** — focused intention. *State the one thing this does. Does everything in it serve that one thing?*
7. **Dhyana** — coherence over time. *Will this still be coherent three milestones from now?*
8. **Samadhi** — service to Unity. *Set the work down. Is Unity served, or only function added?*

### Step 4 — Record the audit

Use [`./integrity-review-template.md`](./integrity-review-template.md) to record the audit. Add a one-line summary to [`./decision-log.md`](./decision-log.md) with the milestone name, date, outcome, and link to the audit.

### Step 5 — Close the loop

- All ✅ → the milestone is complete.
- Any ⚠️ → accept the reservation explicitly with a named follow-up and owner.
- Any ❌ → the milestone is **not** complete. Reshape the work. Re-audit before claiming completion.

Do not move on without closing the loop. Unclosed audits are the most likely place the system drifts from its seed pattern.

## Tone

The audit ritual is grounded and unsentimental. It is not a performance of devotion. It is the most practical thing in this documentation system — the mechanism by which CommonUnity stays itself as it grows.

## Roles

- **Steward** runs the ritual.
- **Contributor of the milestone work** attends and answers the limb prompts.
- **Facilitator perspective** (if relevant — e.g. for Compass-touching work) is consulted for Yama and Samadhi.

For solo work, the steward holds all three roles and must intentionally switch seats.
