// Public projection layer for the cOMmons surface.
//
// Single source of truth for "what about a profile is safe to render".
// Every public read route in routes.js MUST map a DB row through one of
// these projections before passing it to a view. The DB row carries
// fields that must never leave the server (birthdate, raw compass JSON,
// human_design_type, sigil_seed internals); the projection picks only
// what the public translation needs.
//
// Two shapes:
//   - CommonsCoverCard       — sigil-first attractor for the gallery /
//                              thumbnail / OG-card layer. The minimal
//                              public identity: sigil + name + one
//                              tagline + a presence badge. No prose.
//   - CommonsProfilePublic   — the published cOMmons Profile page.
//                              Curated compass points (web_heading,
//                              web_intro, highlights only), essence,
//                              statement, frequency_signature snapshot,
//                              offerings list. NEVER the raw inputs.
//
// Privacy contract (enforced by tests):
//   * No raw Compass JSON, transcripts, qa_answers, observations.
//   * No birthdate, contact, place_of_birth, work_background, etc.
//   * No human_design_type (private-by-default in Phase 1; revisit when
//     Studio Living Profile decides to surface it).
//   * No sigil_seed_json (it contains numerological roots derived from
//     the birthdate; the rendered SVG is the only public artifact).
//   * No internal session / presence / attune counts (those flow through
//     a separate owner-only path in routes.js).
//
// The shape is intentionally additive: views call projection.field ?? "".
// New fields land here once, the views inherit them everywhere.

"use strict";

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function trim(s, max) {
  if (s == null) return null;
  const str = String(s);
  if (max && str.length > max) return str.slice(0, max).trimEnd() + "…";
  return str;
}

// Curate a single compass point for the public surface. Mirrors the
// curateCompassPoint contract in importers.js, but re-applied here as a
// defence-in-depth pass: even if a future code path persisted a richer
// blob into compass_json, this strips it back to the public-safe shape
// before it touches a view.
function projectCompassPoint(p) {
  if (!p) return null;
  return {
    gk_num: p.gk_num || null,
    gk_line: p.gk_line || null,
    web_heading: p.web_heading || null,
    web_intro: p.web_intro || null,
    web_closing: p.web_closing || null,
    highlights: Array.isArray(p.highlights) ? p.highlights.slice(0, 8) : [],
    // theme/summary are sometimes longer narrative blocks; keep theme
    // (one-liner) but drop summary which can quote private observations.
    theme: p.theme || null,
    // intentionally NOT projected: raw, observations, qa_answers, insights,
    // frequency (numerical confidence score — internal).
  };
}

function projectFrequencySignature(fs) {
  if (!fs) return null;
  return {
    tonal_center: fs.tonal_center || null,
    dominant_hz: fs.dominant_hz || null,
    elemental_alignment: fs.elemental_alignment || null,
    chakra_focus: fs.chakra_focus || null,
  };
}

function projectOfferings(offerings) {
  if (!Array.isArray(offerings)) return [];
  return offerings.slice(0, 12).map(o => ({
    title: o && o.title ? String(o.title) : "",
    format: o && o.format ? String(o.format) : null,
    exchange: o && o.exchange ? String(o.exchange) : null,
  }));
}

function presenceLabel(status) {
  return status === "away" ? "Away" : "In the cOMmons";
}

// ─────────────────────────────────────────────────────────────────────────
// CommonsCoverCard
// Sigil-first attractor data for the gallery card + OG/social previews.
// Intentionally minimal — the sigil carries identity, the rest is just
// orientation.
// ─────────────────────────────────────────────────────────────────────────
function toCommonsCoverCard(profile) {
  if (!profile) return null;
  return {
    handle: profile.handle,
    display_name: profile.display_name,
    tagline: trim(profile.archetype_tagline, 120) || null,
    presence_status: profile.presence_status || "in_the_field",
    presence_label: presenceLabel(profile.presence_status),
    sigil_svg: profile.sigil_svg || null,
    sigil_url: profile.handle ? `/field/${profile.handle}/sigil.svg` : null,
    profile_url: profile.handle ? `/field/${profile.handle}` : null,
    // A short essence preview — capped to keep gallery cards visually even.
    essence_preview: profile.essence ? trim(profile.essence, 180) : null,
    published_at: profile.published_at || null,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// CommonsProfilePublic
// The full public Living Profile translation. Carries everything the
// cOMmons profile page renders — and nothing else.
// ─────────────────────────────────────────────────────────────────────────
function toCommonsProfilePublic(profile) {
  if (!profile) return null;
  const compass = profile.compass || {};
  return {
    // identity
    handle: profile.handle,
    display_name: profile.display_name,
    archetype_tagline: profile.archetype_tagline || null,
    essence: profile.essence || null,
    statement: profile.statement || null,
    presence_status: profile.presence_status || "in_the_field",
    presence_label: presenceLabel(profile.presence_status),

    // sigil — only the rendered SVG + a stable URL. Never sigil_seed.
    sigil_svg: profile.sigil_svg || null,
    sigil_url: profile.handle ? `/field/${profile.handle}/sigil.svg` : null,

    // compass — curated, web-safe points only.
    compass: {
      work: projectCompassPoint(compass.work),
      lens: projectCompassPoint(compass.lens),
      field: projectCompassPoint(compass.field),
      call: projectCompassPoint(compass.call),
    },

    // signature + offerings
    frequency_signature: projectFrequencySignature(profile.frequency_signature),
    offerings: projectOfferings(profile.offerings),

    published_at: profile.published_at || null,

    // NB: deliberately omitted from this projection:
    //   birthdate, gene_keys, human_design_type, sigil_seed,
    //   creative_stream (may carry raw notes), compass_json (raw),
    //   updated_at, user_id, email.
  };
}

// Bulk helper for the gallery — never returns raw rows.
function toCommonsCoverCards(profiles) {
  if (!Array.isArray(profiles)) return [];
  return profiles.map(toCommonsCoverCard).filter(Boolean);
}

module.exports = {
  toCommonsCoverCard,
  toCommonsCoverCards,
  toCommonsProfilePublic,
  // exported for tests / defence-in-depth callers
  projectCompassPoint,
  projectFrequencySignature,
  projectOfferings,
};
