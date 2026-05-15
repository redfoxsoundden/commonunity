// Unit tests for sdk/sigil.js — no test framework required.
// Run: node tests/sigil.test.js
const assert = require("node:assert/strict");
const sigil = require("../sdk/sigil.js");

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log("  ✓", name); passed++; }
  catch (e) { console.error("  ✗", name, "\n   ", e.message); failed++; }
}

console.log("sigil utilities");

test("frequencyToNote: 440 Hz → A4", () => {
  const r = sigil.frequencyToNote(440);
  assert.equal(r.note, "A");
  assert.equal(r.octave, 4);
  assert.equal(r.cents, 0);
});

test("frequencyToNote: 528 Hz → ~C5 (5 Hz sharp of standard 523.25)", () => {
  const r = sigil.frequencyToNote(528);
  assert.equal(r.note, "C");
  assert.equal(r.octave, 5);
  // 528 Hz is ~16 cents above C5
  assert.ok(Math.abs(r.cents) < 25, `cents was ${r.cents}`);
});

test("frequencyToNote: 0 / negative → null", () => {
  assert.equal(sigil.frequencyToNote(0), null);
  assert.equal(sigil.frequencyToNote(-1), null);
});

test("frequencyToSolfeggio: 528 → Mi family, transformation", () => {
  const s = sigil.frequencyToSolfeggio(528);
  assert.equal(s.hz, 528);
  assert.equal(s.name, "Mi");
  assert.equal(s.theme, "Transformation");
  assert.equal(s.color, "#d2a13a");
});

test("frequencyToSolfeggio: 530 → nearest is 528, distance 2", () => {
  const s = sigil.frequencyToSolfeggio(530);
  assert.equal(s.hz, 528);
  assert.equal(s.distance, 2);
});

test("digitalRoot: 1963 → 1+9+6+3=19→10→1", () => {
  assert.equal(sigil.digitalRoot(1963), 1);
});

test("birthdayDigitalRoot: 1963-04-15 → sum 29 → root 2", () => {
  const r = sigil.birthdayDigitalRoot("1963-04-15");
  assert.equal(r.sum, 1 + 9 + 6 + 3 + 0 + 4 + 1 + 5);
  assert.equal(r.root, 2);
});

test("birthdayDigitalRoot: null/empty → null", () => {
  assert.equal(sigil.birthdayDigitalRoot(null), null);
  assert.equal(sigil.birthdayDigitalRoot(""), null);
});

test("gematria: 'Vesna Lucca' → sum/root deterministic", () => {
  const r = sigil.gematria("Vesna Lucca");
  // V=22,E=5,S=19,N=14,A=1 = 61; L=12,U=21,C=3,C=3,A=1 = 40; total 101
  assert.equal(r.letters, 10);
  assert.equal(r.sum, 101);
  assert.equal(r.root, 2); // 1+0+1
});

test("gematria: handles accents / lowercase / punctuation", () => {
  const a = sigil.gematria("Vésna Lúcca");
  const b = sigil.gematria("vesna-lucca!");
  assert.equal(a.sum, 101);
  assert.equal(b.sum, 101);
});

test("proposeHandle: 'Vesna Lucca' → 'vesna-lucca'", () => {
  assert.equal(sigil.proposeHandle("Vesna Lucca"), "vesna-lucca");
});

test("proposeHandle: handles accents and multi-spaces", () => {
  assert.equal(sigil.proposeHandle("  Éda  Çarmıklı  "), "eda-carmkl");
});

test("encodeSigilSeed: composes all signals deterministically", () => {
  const seed = sigil.encodeSigilSeed({
    display_name: "Vesna Lucca",
    full_name: "Vesna Lucca",
    birthdate: "1963-04-15",
    gene_keys: { life_work: "GK 5.5" },
    compass: {
      work: { gk_num: "5", gk_line: 5 },
      lens: { gk_num: "32", gk_line: 1 },
      field: { gk_num: "64", gk_line: 1 },
      call: { gk_num: "56", gk_line: 1 },
    },
    tone: { dominant_hz: 528, seed_syllable: "Om" },
  });
  assert.equal(seed.handle, "vesna-lucca");
  assert.equal(seed.digital_root, 2);
  assert.equal(seed.tone.solfeggio.name, "Mi");
  assert.equal(seed.tone.derived_note.note, "C");
  assert.equal(seed.color_primary, "#d2a13a");
  // 5 gates: 1 from gene_keys.life_work + 4 from compass
  assert.equal(seed.gates.length, 5);
  assert.equal(seed.gates[0].gate, 5);
});

test("encodeSigilSeed: returns same output for same input (determinism)", () => {
  const input = {
    display_name: "Markus Lehto",
    birthdate: "1976-11-22",
    tone: { dominant_hz: 432, seed_syllable: "Aum" },
  };
  const a = sigil.encodeSigilSeed(input);
  const b = sigil.encodeSigilSeed(input);
  assert.deepEqual(a, b);
});

test("renderSigilSVG: produces valid SVG (rounded panel, 256 viewBox)", () => {
  const seed = sigil.encodeSigilSeed({
    display_name: "Test User",
    birthdate: "1990-01-01",
    tone: { dominant_hz: 528 },
  });
  const svg = sigil.renderSigilSVG(seed);
  assert.match(svg, /<svg /);
  assert.match(svg, /viewBox="0 0 256 256"/);
  assert.match(svg, /<\/svg>$/);
});

test("renderSigilSVG: uses Living Profile visual contract (conic palette + ॐ + Cormorant Garamond)", () => {
  const seed = sigil.encodeSigilSeed({
    display_name: "Test User",
    birthdate: "1990-01-01",
    tone: { dominant_hz: 528 },
  });
  const svg = sigil.renderSigilSVG(seed);
  // The five canonical wedge colours from Studio's --work/--lens/--field/--call + --rose-color
  assert.match(svg, /#f59e0b/, "must contain Work amber");
  assert.match(svg, /#6366f1/, "must contain Lens indigo");
  assert.match(svg, /#10b981/, "must contain Field emerald");
  assert.match(svg, /#f43f5e/, "must contain Call rose-red");
  assert.match(svg, /#c4b5fd/, "must contain rose accent (--rose-color)");
  // The bīja glyph — the Devanagari ॐ that Living Profile shows.
  assert.ok(svg.indexOf("ॐ") !== -1, "must include the Devanagari ॐ glyph");
  // Typography honours the Living Profile font.
  assert.match(svg, /Cormorant Garamond/);
  // The "DIGITAL KEY · SIGIL" label from Living Profile.
  assert.match(svg, /DIGITAL KEY · SIGIL/);
});

test("renderSigilSVG: handle drives unique rotation (no two seeds render identically)", () => {
  const a = sigil.renderSigilSVG(sigil.encodeSigilSeed({ display_name: "Vesna", birthdate: "1963-04-15", tone: { dominant_hz: 528 } }));
  const b = sigil.renderSigilSVG(sigil.encodeSigilSeed({ display_name: "Eda",   birthdate: "1980-05-20", tone: { dominant_hz: 432 } }));
  assert.notEqual(a, b);
});

test("renderSigilSVG: deterministic — same seed → byte-identical SVG", () => {
  const input = { display_name: "Markus Lehto", birthdate: "1976-11-22", tone: { dominant_hz: 432 } };
  const a = sigil.renderSigilSVG(sigil.encodeSigilSeed(input));
  const b = sigil.renderSigilSVG(sigil.encodeSigilSeed(input));
  assert.equal(a, b);
});

test("renderSigilSVG: handle-derived id is XML-safe (no unsafe chars in clip-path id)", () => {
  // A handle with a hyphen and digits must produce a safe SVG id.
  const seed = sigil.encodeSigilSeed({ display_name: "Vesna Lucca", birthdate: "1963-04-15" });
  const svg = sigil.renderSigilSVG(seed);
  assert.match(svg, /clip-vesna-lucca/);
});

test("buildDesignPrompt: includes solfeggio + gates + digital root", () => {
  const seed = sigil.encodeSigilSeed({
    display_name: "Vesna Lucca",
    birthdate: "1963-04-15",
    compass: { work: { gk_num: "5", gk_line: 5 } },
    tone: { dominant_hz: 528, seed_syllable: "Om" },
  });
  const prompt = sigil.buildDesignPrompt(seed);
  assert.match(prompt, /Mi/);
  assert.match(prompt, /GK5\.5/);
  assert.match(prompt, /digital root: 2/);
  assert.match(prompt, /Om/);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
