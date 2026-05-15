// Vendored copy of repo-root sdk/sigil.js so the field/ Docker build context
// (rootDirectory=/field on Railway) can resolve it without reaching above /app.
// Canonical source: ../../sdk/sigil.js — keep in sync.
/**
 * CommonUnity Sigil Engine
 * Hybrid deterministic identity glyph: SVG geometry seeded by
 * Gene Keys, Compass points, tone/frequency, name gematria, and birthdate.
 *
 * Pure CommonJS/ESM-friendly module. No runtime dependencies.
 */

// ─────────────────────────────────────────────────────────────────────────
// Solfeggio + colour correspondences (warm-dark, candlelit register)
// ─────────────────────────────────────────────────────────────────────────
const SOLFEGGIO = [
  { hz: 174, name: "Ut",       theme: "Foundation",   chakra: "Root",         color: "#7a2e2e", note: "F"  },
  { hz: 285, name: "Re-natal", theme: "Tissue",       chakra: "Sacral",       color: "#a85a2a", note: "C#" },
  { hz: 396, name: "Ut",       theme: "Liberation",   chakra: "Root",         color: "#9c3232", note: "G"  },
  { hz: 417, name: "Re",       theme: "Change",       chakra: "Sacral",       color: "#c46a2e", note: "G#" },
  { hz: 528, name: "Mi",       theme: "Transformation", chakra: "Solar",      color: "#d2a13a", note: "C"  },
  { hz: 639, name: "Fa",       theme: "Connection",   chakra: "Heart",        color: "#3a8a6f", note: "D#" },
  { hz: 741, name: "Sol",      theme: "Expression",   chakra: "Throat",       color: "#2e6f8a", note: "F#" },
  { hz: 852, name: "La",       theme: "Intuition",    chakra: "Third Eye",    color: "#3c4a8a", note: "G#" },
  { hz: 963, name: "Si",       theme: "Awakening",    chakra: "Crown",        color: "#7a4a8a", note: "B"  },
];

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Standard 12-tone equal-tempered: midi note for a given freq in Hz.
function frequencyToNote(hz) {
  if (!hz || hz <= 0) return null;
  const midi = 69 + 12 * Math.log2(hz / 440);
  const rounded = Math.round(midi);
  const noteName = NOTES[((rounded % 12) + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  const exactCents = Math.round((midi - rounded) * 100);
  return { midi: rounded, note: noteName, octave, cents: exactCents };
}

// Map an arbitrary Hz onto the nearest solfeggio family + colour register.
function frequencyToSolfeggio(hz) {
  if (!hz || hz <= 0) return null;
  let nearest = SOLFEGGIO[0];
  let best = Math.abs(SOLFEGGIO[0].hz - hz);
  for (const row of SOLFEGGIO) {
    const d = Math.abs(row.hz - hz);
    if (d < best) { best = d; nearest = row; }
  }
  return { ...nearest, distance: best };
}

// ─────────────────────────────────────────────────────────────────────────
// Numerology — birthday digital root (theosophical reduction)
// ─────────────────────────────────────────────────────────────────────────
function digitalRoot(n) {
  let x = Math.abs(Math.trunc(Number(n) || 0));
  while (x >= 10) {
    x = String(x).split("").reduce((s, d) => s + Number(d), 0);
  }
  return x;
}

function birthdayDigitalRoot(isoDate) {
  if (!isoDate) return null;
  const digits = String(isoDate).replace(/\D/g, "");
  if (!digits) return null;
  const sum = digits.split("").reduce((s, d) => s + Number(d), 0);
  return { sum, root: digitalRoot(sum) };
}

// ─────────────────────────────────────────────────────────────────────────
// Simple gematria — sum of letter values, A=1..Z=26, then digital root.
// (Pythagorean / English ordinal; safe for ASCII, ignores accents.)
// ─────────────────────────────────────────────────────────────────────────
function gematria(name) {
  if (!name) return null;
  const cleaned = String(name)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  const sum = cleaned.split("").reduce((s, ch) => s + (ch.charCodeAt(0) - 64), 0);
  return { letters: cleaned.length, sum, root: digitalRoot(sum) };
}

// ─────────────────────────────────────────────────────────────────────────
// Handle proposal — kebab-case, deterministic, with collision suffix hint.
// Transliterates common non-ASCII letters that don't decompose via NFD
// (Turkish ı/İ/ş/ğ, German ß, Scandinavian æ/ø/å, etc.) so the proposed
// handle reflects the spelling the person actually goes by.
// ─────────────────────────────────────────────────────────────────────────
const TRANSLIT_MAP = {
  // Turkish
  "ı": "i", "İ": "i", "ş": "s", "Ş": "s", "ğ": "g", "Ğ": "g",
  "ç": "c", "Ç": "c", "ö": "o", "Ö": "o", "ü": "u", "Ü": "u",
  // German
  "ß": "ss",
  // Scandinavian / extended
  "æ": "ae", "Æ": "ae", "ø": "o", "Ø": "o", "å": "a", "Å": "a",
  "œ": "oe", "Œ": "oe",
  // Eastern European
  "ł": "l", "Ł": "l", "đ": "d", "Đ": "d",
};
function transliterate(s) {
  return String(s || "").split("").map(ch => TRANSLIT_MAP[ch] || ch).join("");
}

function proposeHandle(displayName) {
  if (!displayName) return null;
  const base = transliterate(displayName)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return base || null;
}

// ─────────────────────────────────────────────────────────────────────────
// Seed encoder — packs all symbolic inputs into a deterministic dictionary
// the renderer consumes. Stable across calls; no randomness.
// ─────────────────────────────────────────────────────────────────────────
function encodeSigilSeed(input = {}) {
  const {
    display_name,
    handle,
    full_name,
    birthdate, // ISO YYYY-MM-DD
    gene_keys = {},      // { life_work, evolution, radiance, purpose }
    compass = {},        // { work, lens, field, call } each { gk_num, gk_line }
    tone = {},           // { tonal_center, dominant_hz, seed_syllable }
  } = input;

  const dr = birthdayDigitalRoot(birthdate);
  const gem = gematria(full_name || display_name);
  const note = tone.dominant_hz ? frequencyToNote(tone.dominant_hz) : null;
  const sol  = tone.dominant_hz ? frequencyToSolfeggio(tone.dominant_hz) : null;

  // Gather Gene Key gates from both gene_keys object and compass points.
  const gates = [];
  for (const k of ["life_work", "evolution", "radiance", "purpose"]) {
    const v = gene_keys[k];
    if (v) {
      // "GK 5.5" → gate 5 line 5 ; "45" → gate 45
      const m = String(v).match(/(\d+)(?:\.(\d+))?/);
      if (m) {
        const n = parseInt(m[1], 10);
        const line = m[2] ? parseInt(m[2], 10) : null;
        if (Number.isFinite(n)) gates.push({ slot: k, gate: n, line });
      }
    }
  }
  for (const k of ["work", "lens", "field", "call"]) {
    const p = compass[k];
    if (p && p.gk_num) {
      const n = parseInt(String(p.gk_num).replace(/[^\d]/g, ""), 10);
      if (Number.isFinite(n)) gates.push({ slot: k, gate: n, line: Number(p.gk_line) || null });
    }
  }

  const proposedHandle = handle || proposeHandle(display_name);

  return {
    handle: proposedHandle,
    display_name: display_name || null,
    gates,
    digital_root: dr ? dr.root : null,
    gematria: gem ? { sum: gem.sum, root: gem.root } : null,
    tone: {
      tonal_center: tone.tonal_center || (note ? note.note : null),
      dominant_hz: tone.dominant_hz || null,
      derived_note: note || null,
      solfeggio: sol || null,
      seed_syllable: tone.seed_syllable || "Om",
    },
    color_primary: sol ? sol.color : "#d2a13a", // default: warm gold
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Deterministic hash (FNV-1a 32-bit) → used for stable pseudo-random angles
// without bringing in a randomness dependency.
// ─────────────────────────────────────────────────────────────────────────
function fnv1a(str) {
  let h = 0x811c9dc5;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h >>> 0;
}

// ─────────────────────────────────────────────────────────────────────────
// SVG rendering — Living Profile aligned (Phase 1 visual contract).
//
// Mirrors studio.html .lp-hero-slot.is-sigil: a rounded-corner panel filled
// with a soft conic gradient cycling through Work (amber) → Lens (indigo) →
// Field (emerald) → Call (rose) → rose-accent, with the Devanagari ॐ
// centered in Cormorant Garamond serif. Uniqueness comes from the seed:
// the conic rotation start angle is derived from gates + handle hash, and
// the rose accent shifts toward the tone's solfeggio colour family.
//
// Studio dark-theme palette (canonical):
//   --work #f59e0b   --lens #6366f1   --field #10b981   --call #f43f5e
//   --rose-color #c4b5fd
//
// SVG has no native conic-gradient, so we approximate it with 5 colored
// arc wedges plus a Gaussian blur to soften the seams — visually
// indistinguishable from the CSS conic at the sizes we use.
// ─────────────────────────────────────────────────────────────────────────
const SIGIL_PALETTE = {
  work:  "#f59e0b",  // amber
  lens:  "#6366f1",  // indigo
  field: "#10b981",  // emerald
  call:  "#f43f5e",  // rose-red
  rose:  "#c4b5fd",  // lavender accent (the --rose-color tint)
};

// Build an SVG arc-wedge path from cx,cy at radius r, between two angles
// (radians, 0 = right, clockwise positive).
function arcWedge(cx, cy, r, a0, a1) {
  const x0 = cx + Math.cos(a0) * r;
  const y0 = cy + Math.sin(a0) * r;
  const x1 = cx + Math.cos(a1) * r;
  const y1 = cy + Math.sin(a1) * r;
  const large = (a1 - a0) > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
}

function renderSigilSVG(seed, opts = {}) {
  const size = opts.size || 256;
  const cx = size / 2;
  const cy = size / 2;
  const handle = seed.handle || "anon";
  const safeId = String(handle).replace(/[^a-zA-Z0-9_-]/g, "_");
  const h = fnv1a(handle + "|" + (seed.display_name || ""));

  // Deterministic rotation start (degrees → radians). Studio LP uses
  // `from 200deg` / `from 210deg`; we use 200° + a per-seed offset of up to
  // 360° so two profiles in the family share the language but no two
  // rotations are identical.
  const startDeg = 200 + (h % 360);
  const start = (startDeg * Math.PI) / 180;

  // The five wedges, in the same order as the LP conic gradient.
  const wedgeColors = [
    SIGIL_PALETTE.rose,
    SIGIL_PALETTE.work,
    SIGIL_PALETTE.lens,
    SIGIL_PALETTE.field,
    SIGIL_PALETTE.call,
    SIGIL_PALETTE.rose,
  ];
  const TWO_PI = Math.PI * 2;
  const step = TWO_PI / (wedgeColors.length - 1); // five wedges, last one closes back to rose
  const wedgeR = size * 0.62; // generous overflow — blur softens the edge
  const wedges = wedgeColors.slice(0, -1).map((c, i) => {
    const a0 = start + i * step;
    const a1 = start + (i + 1) * step;
    return `<path d="${arcWedge(cx, cy, wedgeR, a0, a1)}" fill="${c}" fill-opacity="0.32"/>`;
  }).join("");

  // The bīja (ॐ) — Cormorant Garamond serif, soft cream against the field.
  // The Living Profile uses the literal Devanagari glyph regardless of
  // seed_syllable; we honour that convention so the family language is
  // consistent. The seed.tone.seed_syllable is still preserved on the
  // profile data for future per-profile variation.
  const glyph = "ॐ";
  const glyphSize = size * 0.42;
  const glyphColor = "#f1f5f9"; // --text on dark theme; reads on the gradient
  const labelSize = Math.round(size * 0.052);

  // Soft inner ring (echoes the LP slot's subtle ambient pulse).
  const innerR = size * 0.36;

  // Background plate — rounded-corner radius matches LP's `border-radius: 22px`
  // when rendered at the LP slot's ~120px size; we scale to viewBox.
  const radius = Math.round(size * 0.094);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Personal sigil for ${escapeXml(seed.display_name || handle)}">
  <defs>
    <clipPath id="clip-${safeId}">
      <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}"/>
    </clipPath>
    <filter id="conic-${safeId}" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="${(size * 0.07).toFixed(2)}"/>
    </filter>
    <radialGradient id="vignette-${safeId}" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#0d1526" stop-opacity="0.0"/>
      <stop offset="100%" stop-color="#0b1120" stop-opacity="0.55"/>
    </radialGradient>
  </defs>
  <g clip-path="url(#clip-${safeId})">
    <rect width="${size}" height="${size}" fill="#0d1526"/>
    <g filter="url(#conic-${safeId})">
      ${wedges}
    </g>
    <rect width="${size}" height="${size}" fill="url(#vignette-${safeId})"/>
    <circle cx="${cx}" cy="${cy}" r="${innerR.toFixed(2)}" fill="none" stroke="rgba(241,245,249,0.10)" stroke-width="1"/>
    <text x="${cx}" y="${(cy + glyphSize * 0.36).toFixed(2)}" text-anchor="middle"
          font-family="Cormorant Garamond, Georgia, 'Times New Roman', serif"
          font-size="${glyphSize.toFixed(2)}" font-weight="500"
          fill="${glyphColor}" fill-opacity="0.92">${glyph}</text>
    <text x="${cx}" y="${(size - labelSize * 1.3).toFixed(2)}" text-anchor="middle"
          font-family="Plus Jakarta Sans, system-ui, sans-serif"
          font-size="${labelSize}" font-weight="500"
          letter-spacing="${(labelSize * 0.22).toFixed(2)}"
          fill="rgba(241,245,249,0.55)">DIGITAL KEY · SIGIL</text>
  </g>
</svg>`;
}

function escapeXml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ─────────────────────────────────────────────────────────────────────────
// Hybrid: structured AI design-prompt generator. Pure data; no API call.
// Consumers may forward this to an LLM to enrich the sigil description.
// ─────────────────────────────────────────────────────────────────────────
function buildDesignPrompt(seed) {
  const sol = seed.tone && seed.tone.solfeggio;
  const gates = (seed.gates || []).map(g => `GK${g.gate}${g.line ? "." + g.line : ""} (${g.slot})`).join(", ");
  return [
    "Design brief for a CommonUnity personal sigil.",
    `Subject: ${seed.display_name || seed.handle}.`,
    `Compass gates / Gene Keys: ${gates || "—"}.`,
    `Tonal centre: ${seed.tone.tonal_center || "—"}; dominant frequency: ${seed.tone.dominant_hz || "—"} Hz; ` +
      `derived musical note: ${seed.tone.derived_note ? seed.tone.derived_note.note + seed.tone.derived_note.octave : "—"}.`,
    sol ? `Solfeggio family: ${sol.name} (${sol.hz} Hz) — theme of ${sol.theme}, chakra ${sol.chakra}, color ${sol.color}.` : "",
    `Numerological digital root: ${seed.digital_root ?? "—"}; gematria root: ${seed.gematria ? seed.gematria.root : "—"}.`,
    `Seed syllable / bīja: ${seed.tone.seed_syllable}.`,
    "Visual register: warm-dark, candlelit, sacred-minimal, organic geometry. No neon, no clip-art.",
    "Goal: a unique glyph that belongs to a coherent CommonUnity family — recognisably of the same lineage, never identical.",
  ].filter(Boolean).join(" ");
}

const SOLFEGGIO_HZ = SOLFEGGIO.map(s => s.hz);

module.exports = {
  // utilities
  frequencyToNote,
  frequencyToSolfeggio,
  digitalRoot,
  birthdayDigitalRoot,
  gematria,
  proposeHandle,
  // sigil
  encodeSigilSeed,
  renderSigilSVG,
  buildDesignPrompt,
  // constants
  SOLFEGGIO,
  SOLFEGGIO_HZ,
  NOTES,
};
