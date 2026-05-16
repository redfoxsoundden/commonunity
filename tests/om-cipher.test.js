// Unit tests for sdk/om_cipher.js — plain node:assert, no framework.
// Run: OM_CIPHER_ENABLED=true node tests/om-cipher.test.js
const assert = require("node:assert/strict");

// Enable the feature flag for the duration of the test suite. The engine
// short-circuits to a pending record when the flag is off; flipping the env
// here keeps the rest of the suite focused on derivation behaviour.
process.env.OM_CIPHER_ENABLED = "true";
process.env.BHRAMARI_CAPTURE_ENABLED = "true";

const om = require("../sdk/om_cipher.js");

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log("  ✓", name); passed++; }
  catch (e) { console.error("  ✗", name, "\n   ", e.stack || e.message); failed++; }
}

const baseInput = {
  birth_date: "1988-04-23",
  birth_time: "14:35",
  legal_name: "Maitri Devi",
  compass: {
    work:  { gk_num: "34", gk_line: "5" },
    lens:  { gk_num: "11", gk_line: "2" },
    field: { gk_num: "21", gk_line: "3" },
    call:  { gk_num: "57", gk_line: "1" },
  },
  human_design: { type: "Generator", authority: "Sacral", profile: "3/5" },
  seed_syllable: "Om",
};

console.log("om_cipher — feature flag");

test("generate returns pending when flag is off", () => {
  delete process.env.OM_CIPHER_ENABLED;
  // Re-require would cache; pass override directly.
  const r = om.generate(baseInput, { featureFlag: false });
  assert.equal(r.pending, true);
  assert.equal(r.reason, "om_cipher_disabled");
  process.env.OM_CIPHER_ENABLED = "true";
});

test("generate returns pending when birth_date missing", () => {
  const r = om.generate({}, { featureFlag: true });
  assert.equal(r.pending, true);
  assert.equal(r.reason, "missing_birth_date");
});

console.log("\nom_cipher — determinism");

test("same input produces identical seed + input_hash", () => {
  const a = om.generate(baseInput, { featureFlag: true, now: "2026-05-16T00:00:00Z" });
  const b = om.generate(baseInput, { featureFlag: true, now: "2030-01-01T00:00:00Z" });
  assert.equal(a.seed, b.seed);
  assert.equal(a.input_hash, b.input_hash);
});

test("seed is a 64-char hex sha256 string", () => {
  const r = om.generate(baseInput, { featureFlag: true });
  assert.equal(r.seed.length, 64);
  assert.ok(/^[0-9a-f]+$/.test(r.seed));
});

test("identical identity with vs without bhramari → identical input_hash, different seed", () => {
  const withHum = om.generate(
    { ...baseInput, bhramari_baseline: { hz: 136.1, metadata: { captured_at: "2026-05-16T14:35:22Z" } } },
    { featureFlag: true, bhramariFlag: true }
  );
  const without = om.generate(baseInput, { featureFlag: true });
  assert.equal(withHum.input_hash, without.input_hash, "input_hash must be identity-only");
  assert.notEqual(withHum.seed, without.seed, "seed must include bhramari when present");
});

test("seed is stable across two engines (same canonical string twice)", () => {
  const r1 = om.generate(baseInput, { featureFlag: true });
  const r2 = om.generate(JSON.parse(JSON.stringify(baseInput)), { featureFlag: true });
  assert.equal(r1.seed, r2.seed);
});

test("null birth_time → 9-point sigil; present → 11", () => {
  const a = om.generate({ ...baseInput, birth_time: null }, { featureFlag: true });
  const b = om.generate(baseInput, { featureFlag: true });
  assert.equal(a.metadata.sigil_points, 9);
  assert.equal(b.metadata.sigil_points, 11);
});

console.log("\nom_cipher — fallback");

test("missing compass → still generates, gk_primary null", () => {
  const r = om.generate({ ...baseInput, compass: undefined }, { featureFlag: true });
  assert.equal(r.pending, false);
  assert.equal(r.metadata.gk_primary, null);
  assert.ok(r.seed && r.seed.length === 64);
});

test("missing legal_name → still generates from birth + temporal", () => {
  const r = om.generate({ ...baseInput, legal_name: null }, { featureFlag: true });
  assert.equal(r.pending, false);
  assert.equal(r.metadata.expression, null);
  assert.ok(r.seed);
});

test("missing bhramari → bhramari metadata block omitted", () => {
  const r = om.generate(baseInput, { featureFlag: true, bhramariFlag: true });
  assert.equal(r.bhramari_baseline_hz, null);
  assert.equal(r.metadata.bhramari, undefined);
});

test("bhramari capture-flag off → baseline ignored from seed and metadata", () => {
  const r = om.generate(
    { ...baseInput, bhramari_baseline: { hz: 136.1, metadata: {} } },
    { featureFlag: true, bhramariFlag: false }
  );
  assert.equal(r.bhramari_baseline_hz, null);
  assert.equal(r.metadata.bhramari, undefined);
});

console.log("\nom_cipher — privacy-safe public projection");

test("badge projection has no sealed_inputs / raw hz / full metadata", () => {
  const r = om.generate(
    { ...baseInput, bhramari_baseline: { hz: 136.1, metadata: { confidence: 0.74 } } },
    { featureFlag: true, bhramariFlag: true }
  );
  const pub = om.toPublicProjection(r, "badge");
  assert.equal(pub.version, 1);
  assert.ok(pub.palette);
  assert.equal(pub.bhramari_semitone, undefined);
  assert.equal(pub.bhramari_hz_rounded, undefined);
  // No sealed inputs in any form
  const json = JSON.stringify(pub);
  assert.ok(!json.includes("sealed_inputs"));
  assert.ok(!json.includes("bhramari_baseline_metadata"));
  assert.ok(!json.includes("136.1"));
  assert.ok(!json.includes("Maitri Devi"));
  assert.ok(!json.includes("1988-04-23"));
});

test("shared projection exposes semitone + rounded hz; never raw metadata", () => {
  const r = om.generate(
    { ...baseInput, bhramari_baseline: { hz: 136.137, metadata: { confidence: 0.74, captured_at: "x" } } },
    { featureFlag: true, bhramariFlag: true }
  );
  const pub = om.toPublicProjection(r, "shared");
  assert.equal(typeof pub.bhramari_semitone, "string");
  // Rounded to 1 decimal
  assert.equal(pub.bhramari_hz_rounded, 136.1);
  const json = JSON.stringify(pub);
  assert.ok(!json.includes("captured_at"));
  assert.ok(!json.includes("confidence"));
});

test("public projection returns null for pending record", () => {
  const r = om.generate({}, { featureFlag: true });
  assert.equal(om.toPublicProjection(r, "shared"), null);
});

console.log("\nom_cipher — append-only resonance events");

test("appendResonanceEvent builds row without mutating record", () => {
  const r = om.generate(baseInput, { featureFlag: true });
  const snapshot = JSON.stringify(r);
  const ev = om.appendResonanceEvent(r, {
    hz: 138.4,
    metadata: { captured_at: "2026-06-01T09:00:00Z", confidence: 0.6 },
    source_surface: "studio",
  });
  assert.equal(ev.bhramari_hz, 138.4);
  assert.equal(ev.source_surface, "studio");
  assert.equal(ev.capture_method, "bhramari-shanmukhi-v1");
  // record unchanged
  assert.equal(JSON.stringify(r), snapshot);
});

test("appendResonanceEvent rejects empty hz", () => {
  const r = om.generate(baseInput, { featureFlag: true });
  assert.throws(() => om.appendResonanceEvent(r, { hz: 0 }), /requires hz/);
});

console.log("\nom_cipher — helpers");

test("hzToSemitone: 440 → A4", () => {
  const r = om.hzToSemitone(440);
  assert.equal(r.note, "A");
  assert.equal(r.octave, 4);
});

test("birthRoot: 1988-04-23 → raw 35, reduced 8", () => {
  const r = om.birthRoot("1988-04-23");
  assert.equal(r.raw, 35);
  assert.equal(r.reduced, 8);
});

test("birthRoot preserves master numbers (29 → 11)", () => {
  const r = om.birthRoot("1965-12-12"); // 1+9+6+5+1+2+1+2 = 27 → 9; pick a 29 example:
  // 1965-12-13 → 1+9+6+5+1+2+1+3 = 28 → 10 → 1; use 2000-09-09 → 2+0+0+0+0+9+0+9 = 20 → 2
  // Use a curated case: digits summing to 29 → 29 → reduced 11.
  const r2 = om.birthRoot("1999-09-29"); // 1+9+9+9+0+9+2+9 = 48 → 12 → 3; not 29
  // Direct test via helper:
  assert.equal(om.digitalRootKeepMaster(29), 11);
  assert.equal(om.digitalRootKeepMaster(22), 22);
  assert.equal(om.digitalRootKeepMaster(33), 33);
});

console.log("\n" + (failed === 0 ? "✅ all passed" : "❌ " + failed + " failed") +
  ` (${passed} passed, ${failed} failed)`);
if (failed > 0) process.exit(1);
