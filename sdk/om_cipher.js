/**
 * Om Cipher v1 — Canonical Compass-sealed identity engine.
 *
 * Pure, deterministic, dependency-free. Importable in both Node (CommonJS)
 * and the browser via cu-bridge attach (see studio.html). Companion to the
 * existing `sdk/sigil.js` graphic renderer; this module is the *objective
 * source-code layer* the sigil and downstream projections read from.
 *
 * Reference: docs/product/om-cipher-v1-implementation-plan.md
 *
 * Scope (v1):
 *   - Layer 1   Digital root from birthdate
 *   - Layer 2   Name resonance (Pythagorean + Chaldean gematria)
 *   - Layer 3   Gene Keys gate/line read from sealed Compass input
 *   - Layer 4   Temporal: day-of-week ordinal, solar quadrant, lunar phase
 *               (mean-anomaly approx; no external ephemeris). HD fields are
 *               sealed pass-through; HD computation is deferred.
 *   - Layer 5   Seed = SHA-256 of canonical string (Bhramari included only
 *               when a baseline capture exists)
 *   - Layer 7   Resonance palette (root hue + lunar sat + optional Bhramari
 *               accent stop, ≤ ~10% perceptual shift)
 *
 * Bhramari handling:
 *   - Optional. Missing baseline never blocks generation.
 *   - Baseline + metadata sealed alongside identity but not part of
 *     identity_input_hash (so two members with identical identity get the
 *     same input_hash regardless of whether one hummed).
 *   - Refinement events are append-only history (see `appendResonanceEvent`).
 *     They never alter seed, sigil scaffolding, or input_hash.
 *
 * Privacy:
 *   - `generate()` returns a private/internal record. Pass it through
 *     `toPublicProjection()` before exposing to cOMmons / Field surfaces.
 *   - Raw `bhramari_baseline_hz` and full metadata are never in the public
 *     projection. Only semitone + rounded hz may flow if `visibility_tier`
 *     is "shared".
 */

"use strict";

// ─────────────────────────────────────────────────────────────────────────
// Feature flag — env-driven, opt-in. Honour an explicit override too so the
// browser bridge can pass the flag from a config payload rather than the
// shell environment.
// ─────────────────────────────────────────────────────────────────────────
function isEnabled(override) {
  if (override === true || override === false) return override;
  const env =
    (typeof process !== "undefined" && process.env && process.env.OM_CIPHER_ENABLED) || "";
  if (String(env).toLowerCase() === "true" || env === "1") return true;
  if (typeof window !== "undefined" && window.CU_OM_CIPHER_ENABLED === true) return true;
  return false;
}

function isBhramariEnabled(override) {
  if (override === true || override === false) return override;
  const env =
    (typeof process !== "undefined" && process.env && process.env.BHRAMARI_CAPTURE_ENABLED) || "";
  if (String(env).toLowerCase() === "true" || env === "1") return true;
  if (typeof window !== "undefined" && window.CU_BHRAMARI_CAPTURE_ENABLED === true) return true;
  return false;
}

// ─────────────────────────────────────────────────────────────────────────
// SHA-256 — works in Node (require("crypto")) and the browser (SubtleCrypto
// is async; provide a small synchronous JS fallback so the engine stays
// deterministic and side-effect-free at call time).
// ─────────────────────────────────────────────────────────────────────────
function sha256Hex(input) {
  const str = String(input);
  try {
    if (typeof require === "function") {
      // eslint-disable-next-line global-require
      const crypto = require("crypto");
      return crypto.createHash("sha256").update(str, "utf8").digest("hex");
    }
  } catch (_) {
    // fall through to JS implementation
  }
  return sha256JS(str);
}

// Minimal synchronous SHA-256 in pure JS (Wikipedia pseudocode). Only used
// when the Node crypto module isn't available (e.g. browser bridge).
function sha256JS(ascii) {
  function rightRotate(n, x) { return (x >>> n) | (x << (32 - n)); }
  const K = new Uint32Array([
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
  ]);
  let H = new Uint32Array([
    0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19,
  ]);
  // UTF-8 encode
  const utf8 = unescape(encodeURIComponent(ascii));
  const bytes = new Uint8Array(utf8.length + 1);
  for (let i = 0; i < utf8.length; i++) bytes[i] = utf8.charCodeAt(i);
  bytes[utf8.length] = 0x80;
  // pad
  const bitLen = utf8.length * 8;
  const padLen = (Math.ceil((utf8.length + 9) / 64) * 64) - utf8.length - 1;
  const out = new Uint8Array(utf8.length + 1 + padLen + 8);
  out.set(bytes.subarray(0, utf8.length + 1));
  // big-endian 64-bit length
  for (let i = 0; i < 4; i++) out[out.length - 5 - i] = (bitLen >>> (i * 8)) & 0xff;
  // process blocks
  const W = new Uint32Array(64);
  for (let off = 0; off < out.length; off += 64) {
    for (let i = 0; i < 16; i++) {
      W[i] = (out[off + i*4] << 24) | (out[off + i*4 + 1] << 16) | (out[off + i*4 + 2] << 8) | (out[off + i*4 + 3]);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rightRotate(7, W[i-15]) ^ rightRotate(18, W[i-15]) ^ (W[i-15] >>> 3);
      const s1 = rightRotate(17, W[i-2]) ^ rightRotate(19, W[i-2]) ^ (W[i-2] >>> 10);
      W[i] = (W[i-16] + s0 + W[i-7] + s1) >>> 0;
    }
    let [a,b,c,d,e,f,g,h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rightRotate(6,e) ^ rightRotate(11,e) ^ rightRotate(25,e);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
      const S0 = rightRotate(2,a) ^ rightRotate(13,a) ^ rightRotate(22,a);
      const mj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + mj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0]+a)>>>0; H[1] = (H[1]+b)>>>0; H[2] = (H[2]+c)>>>0; H[3] = (H[3]+d)>>>0;
    H[4] = (H[4]+e)>>>0; H[5] = (H[5]+f)>>>0; H[6] = (H[6]+g)>>>0; H[7] = (H[7]+h)>>>0;
  }
  let hex = "";
  for (let i = 0; i < 8; i++) hex += H[i].toString(16).padStart(8, "0");
  return hex;
}

// ─────────────────────────────────────────────────────────────────────────
// Layer 1 — Digital root from birthdate (theosophical; preserves 11/22/33).
// ─────────────────────────────────────────────────────────────────────────
function digitalRootKeepMaster(n) {
  let x = Math.abs(Math.trunc(Number(n) || 0));
  while (x > 9 && x !== 11 && x !== 22 && x !== 33) {
    x = String(x).split("").reduce((s, d) => s + Number(d), 0);
  }
  return x;
}

function digitalRoot(n) {
  let x = Math.abs(Math.trunc(Number(n) || 0));
  while (x >= 10) x = String(x).split("").reduce((s, d) => s + Number(d), 0);
  return x;
}

function birthRoot(isoDate) {
  if (!isoDate) return null;
  const digits = String(isoDate).replace(/\D/g, "");
  if (!digits) return null;
  const raw = digits.split("").reduce((s, d) => s + Number(d), 0);
  return { raw, reduced: digitalRootKeepMaster(raw) };
}

// ─────────────────────────────────────────────────────────────────────────
// Layer 2 — Gematria. Pythagorean (A=1..9 cyclic) and Chaldean.
// Soul Urge = vowels only; Personality = consonants only; Expression = all.
// ─────────────────────────────────────────────────────────────────────────
const PYTHAGOREAN = {
  A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,I:9,
  J:1,K:2,L:3,M:4,N:5,O:6,P:7,Q:8,R:9,
  S:1,T:2,U:3,V:4,W:5,X:6,Y:7,Z:8,
};
// Chaldean letter values (1-8; no 9). Y is a vowel only when between consonants
// in classical Chaldean — for v1 simplicity Y is treated as consonant.
const CHALDEAN = {
  A:1,B:2,C:3,D:4,E:5,F:8,G:3,H:5,I:1,
  J:1,K:2,L:3,M:4,N:5,O:7,P:8,Q:1,R:2,
  S:3,T:4,U:6,V:6,W:6,X:5,Y:1,Z:7,
};
const VOWELS = new Set(["A","E","I","O","U"]);

function normaliseName(name) {
  return String(name || "")
    .normalize("NFC")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

function gematriaSum(name, table, filter) {
  const cleaned = normaliseName(name);
  if (!cleaned) return null;
  let sum = 0;
  for (const ch of cleaned) {
    if (filter && !filter(ch)) continue;
    const v = table[ch];
    if (v) sum += v;
  }
  if (sum === 0) return null;
  return { raw: sum, reduced: digitalRootKeepMaster(sum) };
}

function nameResonance(legalName) {
  if (!legalName) return null;
  const expression  = gematriaSum(legalName, PYTHAGOREAN);
  const soulUrge    = gematriaSum(legalName, PYTHAGOREAN, ch => VOWELS.has(ch));
  const personality = gematriaSum(legalName, PYTHAGOREAN, ch => !VOWELS.has(ch));
  const chaldean    = gematriaSum(legalName, CHALDEAN);
  return { expression, soul_urge: soulUrge, personality, chaldean };
}

// ─────────────────────────────────────────────────────────────────────────
// Layer 3 — Gene Keys / I Ching primary gate from sealed Compass input.
// `compass` shape matches existing PointData: { work, lens, field, call }
// each with { gk_num, gk_line }. The "Work" gate is the v1 identity anchor.
// ─────────────────────────────────────────────────────────────────────────
const GK_LINE_NAMES = {
  work:  {1:"Creator", 2:"Dancer", 3:"Changer", 4:"Server", 5:"Fixer", 6:"Teacher"},
  lens:  {1:"Solitude", 2:"Marriage", 3:"Interaction", 4:"Friendship", 5:"Impact", 6:"Nurture"},
  field: {1:"Self & Empowerment", 2:"Passion & Relationships", 3:"Energy & Experience",
          4:"Love & Community", 5:"Power & Projection", 6:"Education & Surrender"},
  call:  {1:"Physicality", 2:"Posture", 3:"Movement", 4:"Breath", 5:"Voice", 6:"Intent"},
};

function parseGate(rawNum, rawLine) {
  const num = parseInt(String(rawNum || "").replace(/[^\d]/g, ""), 10);
  const line = parseInt(String(rawLine || "").replace(/[^\d]/g, ""), 10);
  if (!Number.isFinite(num) || num < 1 || num > 64) return null;
  return {
    gate: num,
    line: (Number.isFinite(line) && line >= 1 && line <= 6) ? line : null,
  };
}

function gkLayer(compass) {
  const c = compass || {};
  const out = {};
  for (const slot of ["work", "lens", "field", "call"]) {
    const p = c[slot];
    if (!p) continue;
    const g = parseGate(p.gk_num, p.gk_line);
    if (!g) continue;
    out[slot] = {
      gate: g.gate,
      line: g.line,
      label: g.line ? (GK_LINE_NAMES[slot][g.line] || null) : null,
    };
  }
  return Object.keys(out).length ? out : null;
}

// ─────────────────────────────────────────────────────────────────────────
// Layer 4 — Temporal resonance.
//   - day_of_week ordinal (0 = Sunday)
//   - solar_quarter 0..3 from month (0: winter, 1: spring, 2: summer, 3: autumn)
//   - lunar_phase 0..7 via simple mean-anomaly approximation
//   - temporal_gate 0..11 (two-hour windows) if birth_time present, else null
// ─────────────────────────────────────────────────────────────────────────
function temporalLayer(isoDate, hhmm) {
  if (!isoDate) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(isoDate));
  if (!m) return null;
  const y = parseInt(m[1], 10), mo = parseInt(m[2], 10), d = parseInt(m[3], 10);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (Number.isNaN(dt.getTime())) return null;
  const dow = dt.getUTCDay();
  const solar_quarter = Math.floor(((mo - 1) % 12) / 3); // 0..3
  // Lunar phase: mean-synodic approximation. JD = Julian Day (Meeus simplified).
  const Y = mo <= 2 ? y - 1 : y;
  const M = mo <= 2 ? mo + 12 : mo;
  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);
  const JD = Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + d + B - 1524.5;
  const synodic = 29.5305882;
  const refJD = 2451550.1; // 2000-01-06 (known new moon)
  let phase = ((JD - refJD) % synodic + synodic) % synodic;
  const lunar_phase = Math.floor((phase / synodic) * 8) % 8;
  let temporal_gate = null;
  if (hhmm) {
    const t = /^(\d{1,2}):(\d{2})/.exec(String(hhmm));
    if (t) {
      const hh = Math.max(0, Math.min(23, parseInt(t[1], 10)));
      temporal_gate = Math.floor(hh / 2);
    }
  }
  return { day_of_week: dow, solar_quarter, lunar_phase, temporal_gate };
}

// ─────────────────────────────────────────────────────────────────────────
// Bhramari helpers — Hz → nearest semitone label + octave-equivalent visible
// hue. We octave-fold to the audible band and map onto the visible spectrum
// (~380–740 nm) as a single accent hue. Used by the public projection.
// ─────────────────────────────────────────────────────────────────────────
const NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

function hzToSemitone(hz) {
  if (!hz || hz <= 0) return null;
  const midi = 69 + 12 * Math.log2(hz / 440);
  const rounded = Math.round(midi);
  return {
    note: NOTES[((rounded % 12) + 12) % 12],
    octave: Math.floor(rounded / 12) - 1,
    midi: rounded,
    cents: Math.round((midi - rounded) * 100),
  };
}

// Octave-fold the hz up into the visible-light band (THz) and convert
// to a hue degree. Pure aesthetic mapping; intentional ≤ ~10% perceptual
// shift in the palette.
function hzToVisibleHueDeg(hz) {
  if (!hz || hz <= 0) return null;
  // Fold to one octave above 440 (i.e., 440..880).
  let f = hz;
  while (f < 440) f *= 2;
  while (f >= 880) f /= 2;
  const t = (f - 440) / (880 - 440); // 0..1
  // Hue spans 0..360 from red to violet.
  return Math.round(t * 360) % 360;
}

// Round Hz to 1 decimal place — what may flow to the shared tier.
function roundHz(hz) {
  if (!hz || hz <= 0) return null;
  return Math.round(hz * 10) / 10;
}

// ─────────────────────────────────────────────────────────────────────────
// Layer 5 — Seed string + SHA-256.
// ─────────────────────────────────────────────────────────────────────────
function canonicalSeedString(parts) {
  return Object.keys(parts)
    .sort()
    .map(k => `${k}:${parts[k]}`)
    .join("|");
}

// ─────────────────────────────────────────────────────────────────────────
// Layer 7 — Resonance palette. Returns OKLCH-style triples (h, s, l) as
// CSS color strings so downstream renderers can use them directly without
// adopting a colour library.
// ─────────────────────────────────────────────────────────────────────────
function buildPalette(root, lunarPhase, primaryGate, bhramariHueDeg) {
  const safeRoot = Number.isFinite(root) ? root : 1;
  const baseHue = (safeRoot * 40) % 360;
  // ±15% sat from lunar phase (0..7)
  const lunar = Number.isFinite(lunarPhase) ? lunarPhase : 0;
  const satMod = ((lunar - 3.5) / 3.5) * 0.15; // -0.15 .. +0.15
  const sat = Math.max(0.25, Math.min(0.85, 0.55 + satMod));
  const lit = 0.5;
  const primary = `oklch(${lit.toFixed(2)} ${(sat).toFixed(2)} ${baseHue})`;
  const secondary = `oklch(${lit.toFixed(2)} ${(sat).toFixed(2)} ${(baseHue + 180) % 360})`;
  // Tertiary derived from primary gate; static accent band.
  const gateOffset = primaryGate ? (primaryGate * 7) % 360 : 30;
  const accent = `oklch(${lit.toFixed(2)} ${(sat * 0.9).toFixed(2)} ${(baseHue + gateOffset) % 360})`;
  const palette = [primary, secondary, accent];
  const out = {
    primary_hue: baseHue,
    secondary_hue: (baseHue + 180) % 360,
    palette,
  };
  // Bhramari accent: a single extra stop, intentionally subtle (≤ ~10% shift).
  if (Number.isFinite(bhramariHueDeg)) {
    const blended = Math.round(baseHue * 0.9 + bhramariHueDeg * 0.1) % 360;
    out.palette_resonance_accent = `oklch(${lit.toFixed(2)} ${(sat).toFixed(2)} ${blended})`;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// Public — `generate(input)`.
// Input shape (all but birth_date optional in fallback mode):
//   {
//     birth_date:  "YYYY-MM-DD",
//     birth_time:  "HH:MM" | null,
//     birth_place: { lat, lng, city, country } | null,
//     legal_name:  string,
//     preferred_name: string | null,
//     compass: { work, lens, field, call } each { gk_num, gk_line },
//     human_design: { type, authority, profile, definition } | null,
//     seed_syllable: string | null,
//     bhramari_baseline: { hz, metadata } | null,
//   }
//
// Returns the *private/internal* record (full metadata). Wrap with
// `toPublicProjection` before exposing to cOMmons / Field.
// ─────────────────────────────────────────────────────────────────────────
function generate(input, options) {
  const opts = options || {};
  if (!isEnabled(opts.featureFlag)) {
    return { pending: true, reason: "om_cipher_disabled" };
  }
  if (!input || !input.birth_date) {
    return { pending: true, reason: "missing_birth_date" };
  }

  const birth = birthRoot(input.birth_date);
  const name = nameResonance(input.legal_name || input.preferred_name);
  const gk = gkLayer(input.compass);
  const temporal = temporalLayer(input.birth_date, input.birth_time || null);
  const primaryGate = gk && gk.work ? gk.work.gate : (gk && gk.lens && gk.lens.gate) || null;

  // Bhramari handling — optional, capture-flag-aware. If the capture-flag
  // is off, ignore any inbound baseline (treats data as if it weren't there
  // for v1 generation; persistence at the storage layer is its own concern).
  const bhramariOn = isBhramariEnabled(opts.bhramariFlag);
  const baselineHz =
    (bhramariOn && input.bhramari_baseline && Number(input.bhramari_baseline.hz)) || null;
  const baselineMetadata =
    (bhramariOn && input.bhramari_baseline && input.bhramari_baseline.metadata) || null;

  // Layer 5 — canonical seed string. Ordered alphabetically for stability;
  // omit BHR entirely if no baseline (per spec).
  const seedParts = {};
  if (birth) seedParts.BR = birth.reduced;
  if (name && name.expression) seedParts.EX = name.expression.reduced;
  if (name && name.soul_urge) seedParts.SU = name.soul_urge.reduced;
  if (name && name.personality) seedParts.PE = name.personality.reduced;
  if (gk && gk.work) seedParts.GK = `${gk.work.gate}.${gk.work.line || 0}`;
  if (temporal) {
    seedParts.LUN = temporal.lunar_phase;
    seedParts.SOL = temporal.solar_quarter;
    if (temporal.temporal_gate != null) seedParts.TG = temporal.temporal_gate;
  }
  if (baselineHz) seedParts.BHR = baselineHz;

  const canonical = canonicalSeedString(seedParts);
  const seed = sha256Hex(canonical);

  // Input hash — identity fields only (Bhramari excluded so identical
  // identity records hash identically regardless of capture status).
  const identityCanonical = canonicalSeedString(
    Object.keys(seedParts).reduce((acc, k) => {
      if (k !== "BHR") acc[k] = seedParts[k];
      return acc;
    }, {})
  );
  const input_hash = sha256Hex(identityCanonical);

  // Palette (Layer 7).
  const bhramariHueDeg = baselineHz ? hzToVisibleHueDeg(baselineHz) : null;
  const palette = buildPalette(
    birth && birth.reduced,
    temporal && temporal.lunar_phase,
    primaryGate,
    bhramariHueDeg
  );

  // Sigil scaffold count — identity-bound (does *not* shift with refinement).
  const sigil_points = input.birth_time ? 11 : 9;

  const metadata = {
    digital_root: birth ? { value: birth.reduced, raw: birth.raw } : null,
    expression: name && name.expression ? { value: name.expression.reduced } : null,
    soul_urge: name && name.soul_urge ? { value: name.soul_urge.reduced } : null,
    personality: name && name.personality ? { value: name.personality.reduced } : null,
    chaldean: name && name.chaldean ? { value: name.chaldean.reduced } : null,
    gk_primary: gk && gk.work ? gk.work : null,
    gk_all: gk || null,
    hd_type: input.human_design && input.human_design.type || null,
    hd_authority: input.human_design && input.human_design.authority || null,
    hd_profile: input.human_design && input.human_design.profile || null,
    hd_definition: input.human_design && input.human_design.definition || null,
    seed_syllable: input.seed_syllable || null,
    lunar_phase: temporal ? { value: temporal.lunar_phase } : null,
    solar_quarter: temporal ? { value: temporal.solar_quarter } : null,
    temporal_gate: temporal ? { value: temporal.temporal_gate } : null,
    palette_rationale:
      `Hue ${palette.primary_hue}° from root ${birth ? birth.reduced : "-"}; ` +
      (primaryGate ? `gate ${primaryGate} accent band; ` : "") +
      (temporal ? `lunar phase ${temporal.lunar_phase}` : "") +
      (bhramariHueDeg != null ? `; Bhramari accent at ${bhramariHueDeg}°` : ""),
    sigil_points,
    seed_hash: seed.slice(0, 16) + "..." + seed.slice(-4),
  };

  if (baselineHz) {
    const tone = hzToSemitone(baselineHz);
    metadata.bhramari = {
      baseline_hz: baselineHz,
      nearest_semitone: tone ? `${tone.note}${tone.octave}` : null,
      octave_visible_hue_deg: bhramariHueDeg,
      captured_at: baselineMetadata && baselineMetadata.captured_at || null,
      stability: baselineMetadata && baselineMetadata.stability != null
        ? baselineMetadata.stability : null,
      confidence: baselineMetadata && baselineMetadata.confidence != null
        ? baselineMetadata.confidence : null,
      note:
        "Optional measured resonance. Refinement history available via " +
        "/resonance-events.",
    };
  }

  return {
    version: 1,
    pending: false,
    generated_at: opts.now || new Date().toISOString(),
    seed,
    input_hash,
    palette,
    metadata,
    // Sealed inputs — full bundle preserved for the private API tier. Never
    // include this in any public projection.
    sealed_inputs: {
      birth_date: input.birth_date,
      birth_time: input.birth_time || null,
      birth_place: input.birth_place || null,
      legal_name: input.legal_name || null,
      preferred_name: input.preferred_name || null,
      compass: input.compass || null,
      human_design: input.human_design || null,
      seed_syllable: input.seed_syllable || null,
    },
    bhramari_baseline_hz: baselineHz,
    bhramari_baseline_metadata: baselineMetadata,
    visibility_tier: "private",
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Public projection — strips private fields. Two tiers:
//   - "badge"   → only safe glyph + palette + primary GK label
//   - "shared"  → adds semitone-level Bhramari (no raw hz/metadata)
// Anything richer remains private and stays on the originating record.
// ─────────────────────────────────────────────────────────────────────────
function toPublicProjection(record, tier) {
  if (!record || record.pending) return null;
  const t = tier || "badge";
  const meta = record.metadata || {};
  const out = {
    version: record.version || 1,
    palette: record.palette || null,
    gk_primary_label: meta.gk_primary
      ? `Gate ${meta.gk_primary.gate}${meta.gk_primary.line ? "." + meta.gk_primary.line : ""}` +
        (meta.gk_primary.label ? ` · ${meta.gk_primary.label}` : "")
      : null,
    digital_root_label: meta.digital_root ? meta.digital_root.value : null,
    sigil_points: meta.sigil_points || 9,
  };
  if (t === "shared") {
    if (meta.bhramari && meta.bhramari.nearest_semitone) {
      out.bhramari_semitone = meta.bhramari.nearest_semitone;
      // Rounded hz is permissible in the shared tier; raw precision stays private.
      out.bhramari_hz_rounded = roundHz(record.bhramari_baseline_hz);
    }
    if (meta.lunar_phase) out.lunar_phase = meta.lunar_phase.value;
    if (meta.solar_quarter) out.solar_quarter = meta.solar_quarter.value;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// Append-only resonance event helper. Pure function — the caller persists
// the returned row. Never alters `record`.
// ─────────────────────────────────────────────────────────────────────────
function appendResonanceEvent(record, capture, options) {
  const opts = options || {};
  if (!capture || !Number(capture.hz)) {
    throw new Error("resonance event requires hz");
  }
  return {
    id: opts.id || null, // caller assigns UUID
    member_id: (record && record.member_id) || null,
    captured_at: (capture.metadata && capture.metadata.captured_at) ||
                 opts.now || new Date().toISOString(),
    bhramari_hz: Number(capture.hz),
    metadata: capture.metadata || null,
    capture_method: (capture.metadata && capture.metadata.capture_method) ||
                    "bhramari-shanmukhi-v1",
    source_surface: capture.source_surface || "unknown",
  };
}

const _exports = {
  // entry points
  generate,
  toPublicProjection,
  appendResonanceEvent,
  // flag check (exported so HTTP layers can short-circuit)
  isEnabled,
  isBhramariEnabled,
  // helpers (exported so tests + the future Tuner layer can reuse them)
  birthRoot,
  nameResonance,
  gkLayer,
  temporalLayer,
  hzToSemitone,
  hzToVisibleHueDeg,
  roundHz,
  digitalRoot,
  digitalRootKeepMaster,
  sha256Hex,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = _exports;
}
if (typeof window !== "undefined") {
  // Browser bridge — same surface as require("sdk/om_cipher.js").
  // Studio reads window.cuOmCipher (mirrors the existing window.cuSigil
  // pattern). Feature-flag check still applies; the bridge does not
  // imply the cipher is enabled. Set window.CU_OM_CIPHER_ENABLED = true
  // to enable in-browser generation for preview/testing.
  window.cuOmCipher = _exports;
}
