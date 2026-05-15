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
// ─────────────────────────────────────────────────────────────────────────
function proposeHandle(displayName) {
  if (!displayName) return null;
  const base = String(displayName)
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
// SVG rendering — a layered geometric glyph built from the seed.
//
// Layers (from outside in):
//   1. Outer breath ring — radius modulated by digital root
//   2. Gene Key gate marks — N points around the ring at gate-derived angles
//   3. Inner solfeggio polygon — sides = 3..9 by solfeggio index
//   4. Central seed syllable mark — small bīja glyph using the syllable
//
// The whole thing fits in a 256x256 viewBox so it scales cleanly.
// ─────────────────────────────────────────────────────────────────────────
function renderSigilSVG(seed, opts = {}) {
  const size = opts.size || 256;
  const cx = size / 2;
  const cy = size / 2;
  const stroke = seed.color_primary || "#d2a13a";
  const muted = "rgba(255,255,255,0.18)";

  const dr = seed.digital_root || 9;
  const outerR = (size * 0.42) + (dr - 5) * 1.2;
  const innerR = size * 0.18;
  const handle = seed.handle || "anon";
  const h = fnv1a(handle + "|" + (seed.display_name || ""));

  // Gate marks — one per gate, angle distributed deterministically by gate%64.
  const gatesSvg = (seed.gates || []).slice(0, 8).map((g, i) => {
    const angle = ((g.gate % 64) / 64) * Math.PI * 2 + (h % 360) * (Math.PI / 180);
    const x = cx + Math.cos(angle) * outerR;
    const y = cy + Math.sin(angle) * outerR;
    const r = 3 + (Number(g.line) || 1);
    return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r}" fill="${stroke}" opacity="0.85"/>`
         + `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}" stroke="${muted}" stroke-width="0.5"/>`;
  }).join("");

  // Inner solfeggio polygon — sides from solfeggio family index (3..9).
  let sides = 6;
  if (seed.tone && seed.tone.solfeggio) {
    const idx = SOLFEGGIO.findIndex(s => s.hz === seed.tone.solfeggio.hz);
    if (idx >= 0) sides = 3 + (idx % 7);
  }
  const polyPoints = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
    polyPoints.push(`${(cx + Math.cos(a) * innerR * 1.6).toFixed(2)},${(cy + Math.sin(a) * innerR * 1.6).toFixed(2)}`);
  }

  // Central syllable — render the seed syllable text in a soft serif.
  const syllable = (seed.tone && seed.tone.seed_syllable) || "Om";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Personal sigil for ${escapeXml(seed.display_name || handle)}">
  <defs>
    <radialGradient id="bg-${handle}" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#1a1410" stop-opacity="1"/>
      <stop offset="100%" stop-color="#0a0806" stop-opacity="1"/>
    </radialGradient>
    <filter id="glow-${handle}" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.6" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg-${handle})"/>
  <g filter="url(#glow-${handle})">
    <circle cx="${cx}" cy="${cy}" r="${outerR.toFixed(2)}" fill="none" stroke="${stroke}" stroke-width="1" opacity="0.85"/>
    <circle cx="${cx}" cy="${cy}" r="${(outerR - 6).toFixed(2)}" fill="none" stroke="${muted}" stroke-width="0.4"/>
    <polygon points="${polyPoints.join(" ")}" fill="none" stroke="${stroke}" stroke-width="0.8" opacity="0.7"/>
    <circle cx="${cx}" cy="${cy}" r="${innerR.toFixed(2)}" fill="none" stroke="${stroke}" stroke-width="0.6" opacity="0.6"/>
    ${gatesSvg}
    <text x="${cx}" y="${cy + 6}" text-anchor="middle" font-family="Georgia, 'Instrument Serif', serif" font-size="${innerR * 0.9}" fill="${stroke}" opacity="0.95">${escapeXml(syllable)}</text>
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
