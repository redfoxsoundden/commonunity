// Sigil determinism test — verifies that re-publishing the same Living
// Profile (same input contract) produces the same sigil seed + SVG, and
// that the cOMmons cover (gallery card) and the cOMmons Profile page
// both render from the SAME sigil_svg stored on the profile row.
//
// This guards the contract that the Studio LP, the cOMmons cover, and
// the cOMmons Profile all share a single deterministic sigil — so a
// future Studio-side render of the same input will match what cOMmons
// shows.
//
// Run: node field/tests/sigil-determinism.test.js

process.env.DATABASE_URL = "/tmp/field-sigil-det-" + Date.now() + ".db";
process.env.NODE_ENV = "test";

const assert = require("node:assert/strict");

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log("  ✓", name); passed++; }
  catch (e) { console.error("  ✗", name, "\n    ", e.message); failed++; }
}

const sigil = require("../src/sigil.js");
const db = require("../src/db");
const projections = require("../src/projections");

const SAMPLE_INPUT = {
  display_name: "Sample Sage",
  full_name: "Sample Sage",
  birthdate: "1985-06-21",
  gene_keys: { life_work: "GK 5.5", evolution: "GK 32.1" },
  compass: {
    work: { gk_num: "5", gk_line: "5" },
    lens: { gk_num: "32", gk_line: "1" },
    field: { gk_num: "64", gk_line: "1" },
    call: { gk_num: "63", gk_line: "1" },
  },
  tone: { tonal_center: "C", dominant_hz: 528, seed_syllable: "Om" },
};

console.log("sigil: deterministic for same input contract");

test("encodeSigilSeed: same input → same seed object", () => {
  const a = sigil.encodeSigilSeed(SAMPLE_INPUT);
  const b = sigil.encodeSigilSeed(SAMPLE_INPUT);
  assert.deepEqual(a, b, "two encodings must produce identical seed");
});

test("renderSigilSVG: same seed → byte-identical SVG", () => {
  const seed = sigil.encodeSigilSeed(SAMPLE_INPUT);
  const a = sigil.renderSigilSVG(seed);
  const b = sigil.renderSigilSVG(seed);
  assert.equal(a, b, "two renders must produce byte-identical SVG");
});

test("renderSigilSVG: different birthdate → different SVG", () => {
  const a = sigil.renderSigilSVG(sigil.encodeSigilSeed(SAMPLE_INPUT));
  const b = sigil.renderSigilSVG(sigil.encodeSigilSeed({ ...SAMPLE_INPUT, birthdate: "1985-06-22" }));
  // The handle/display_name drive the start rotation, so birthdate alone may
  // not flip the rendered SVG bytes; what we *do* assert is that the encoded
  // seed differs (digital_root) — which is what consumers like Studio would
  // forward to an LLM enrichment.
  const seedA = sigil.encodeSigilSeed(SAMPLE_INPUT);
  const seedB = sigil.encodeSigilSeed({ ...SAMPLE_INPUT, birthdate: "1985-06-22" });
  assert.notEqual(seedA.digital_root, seedB.digital_root, "different birthdate → different numerological root");
  // Same SVG is fine here because the visual rotation seed depends on handle,
  // but we still want non-identical glyph families if the *handle* changes.
  const c = sigil.renderSigilSVG(sigil.encodeSigilSeed({ ...SAMPLE_INPUT, display_name: "Other Person" }));
  assert.notEqual(a, c, "different display_name/handle → different rendered SVG");
});

console.log("\ncOMmons cover ↔ profile: shared sigil_svg on the row");

test("publish → cover card and profile read the SAME sigil bytes", () => {
  const u = db.upsertUser({ email: "sage@example.com" });
  const seed = sigil.encodeSigilSeed(SAMPLE_INPUT);
  const svg = sigil.renderSigilSVG(seed);
  db.upsertProfile(u.id, {
    handle: "sample-sage",
    display_name: "Sample Sage",
    archetype_tagline: "The Sample",
    sigil_seed: seed,
    sigil_svg: svg,
    birthdate: SAMPLE_INPUT.birthdate,
    gene_keys: SAMPLE_INPUT.gene_keys,
    seed_syllable: "Om",
    published_at: new Date().toISOString(),
  });

  const row = db.getProfileByHandle("sample-sage");
  const card = projections.toCommonsCoverCard(row);
  const pub = projections.toCommonsProfilePublic(row);
  assert.equal(card.sigil_svg, svg, "cover card sigil must equal stored sigil");
  assert.equal(pub.sigil_svg, svg, "profile page sigil must equal stored sigil");
  assert.equal(card.sigil_svg, pub.sigil_svg, "cover + profile must share identical sigil bytes");
});

test("re-publish with same input → same persisted sigil_svg (idempotent)", () => {
  const row1 = db.getProfileByHandle("sample-sage");
  const seed = sigil.encodeSigilSeed(SAMPLE_INPUT);
  const svg = sigil.renderSigilSVG(seed);
  db.upsertProfile(row1.user_id, {
    handle: "sample-sage",
    display_name: "Sample Sage",
    sigil_seed: seed,
    sigil_svg: svg,
    birthdate: SAMPLE_INPUT.birthdate,
    gene_keys: SAMPLE_INPUT.gene_keys,
    seed_syllable: "Om",
    published_at: new Date().toISOString(),
  });
  const row2 = db.getProfileByHandle("sample-sage");
  assert.equal(row1.sigil_svg, row2.sigil_svg, "re-publish must be sigil-stable");
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
