// Tests for the committed `seeds/public/` curated seeds and the
// startup-time `autoSeedBeta` helper. These guard two contracts:
//
//   1. Privacy: the committed JSONs must contain NONE of the private
//      Compass fields (raw transcripts, qa_answers, insights, etc.) and
//      none of the PII the importer also strips (birthdate, contact, …).
//   2. Idempotency: `autoSeedBeta` populates a fresh DB with all three
//      beta profiles, AND a second call against the warm DB does no work.

process.env.DATABASE_URL = "/tmp/field-seed-public-test-" + Date.now() + ".db";
process.env.NODE_ENV = "test";
// Don't let global env steer the auto-seed off during this test.
delete process.env.FIELD_AUTO_SEED;
delete process.env.FIELD_FORCE_SEED;

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log("  ✓", name); passed++; }
  catch (e) { console.error("  ✗", name, "\n    ", e.message); failed++; }
}

console.log("field/seeds/public — privacy contract");

const PUBLIC_DIR = path.join(__dirname, "..", "seeds", "public");
const PUBLIC_FILES = ["markus-public.json", "vesna-public.json", "eda-public.json"];

// Fields that must NEVER appear in the committed curated JSONs.
const FORBIDDEN_KEYS = [
  "raw", "qa_answers", "insights", "observations",
  "birthdate", "date_of_birth", "birth_time", "birthplace", "place_of_birth",
  "work_background", "linkedin_url", "communities", "purpose_projects",
  "practices", "education", "contact",
  "transcripts", "guide", "companion", "palette_note", "foundation",
];

for (const file of PUBLIC_FILES) {
  test(`${file} exists and parses`, () => {
    const p = path.join(PUBLIC_DIR, file);
    assert.ok(fs.existsSync(p), `${file} must be committed in seeds/public/`);
    JSON.parse(fs.readFileSync(p, "utf8"));
  });

  test(`${file} carries none of the forbidden private keys`, () => {
    const txt = fs.readFileSync(path.join(PUBLIC_DIR, file), "utf8");
    for (const key of FORBIDDEN_KEYS) {
      const re = new RegExp(`"${key}"\\s*:`, "i");
      assert.ok(!re.test(txt), `${file} must not contain a "${key}" JSON key`);
    }
  });
}

console.log("\nfield/seed — autoSeedBeta idempotency");

// Fresh require to pick up the test DB path.
const db = require("../src/db");
const { autoSeedBeta } = require("../src/seed");

test("autoSeedBeta: populates a fresh DB with all three beta profiles", () => {
  const r = autoSeedBeta({ log: { log: () => {}, warn: () => {} } });
  assert.equal(r.ran, true, "first call must run");
  for (const h of ["vesna-lucca", "eda-carmikli", "markus-lehto"]) {
    assert.ok(db.getProfileByHandle(h), `profile ${h} must exist after auto-seed`);
  }
});

test("autoSeedBeta: second call is a no-op against the warm DB", () => {
  const r = autoSeedBeta({ log: { log: () => {}, warn: () => {} } });
  assert.equal(r.ran, false, "second call must short-circuit");
  assert.equal(r.reason, "already-seeded");
});

test("autoSeedBeta: FIELD_AUTO_SEED=0 disables the helper", () => {
  const prev = process.env.FIELD_AUTO_SEED;
  process.env.FIELD_AUTO_SEED = "0";
  try {
    const r = autoSeedBeta({ log: { log: () => {}, warn: () => {} } });
    assert.equal(r.ran, false);
    assert.equal(r.reason, "disabled");
  } finally {
    if (prev === undefined) delete process.env.FIELD_AUTO_SEED;
    else process.env.FIELD_AUTO_SEED = prev;
  }
});

test("autoSeedBeta: FIELD_FORCE_SEED=1 re-runs even when warm", () => {
  const prev = process.env.FIELD_FORCE_SEED;
  process.env.FIELD_FORCE_SEED = "1";
  try {
    const r = autoSeedBeta({ log: { log: () => {}, warn: () => {} } });
    assert.equal(r.ran, true);
    assert.ok(Array.isArray(r.results));
    assert.equal(r.results.length, 3);
    assert.ok(r.results.every(x => x.ok), "all three forced re-seeds must succeed");
  } finally {
    if (prev === undefined) delete process.env.FIELD_FORCE_SEED;
    else process.env.FIELD_FORCE_SEED = prev;
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
