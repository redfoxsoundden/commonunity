// Privacy + shape tests for field/src/projections.js.
//
// Guards two contracts:
//   1. Projections never leak the private fields a Studio Living Profile
//      publish payload may carry (birthdate, gene_keys, sigil_seed, raw
//      compass JSON, qa_answers, transcripts, human_design_type).
//   2. Projection shape stays stable for the views.js consumer
//      (CommonsCoverCard for the gallery; CommonsProfilePublic for the
//      profile page).
//
// Run: node field/tests/projections.test.js

process.env.DATABASE_URL = "/tmp/field-projections-test-" + Date.now() + ".db";
process.env.NODE_ENV = "test";

const assert = require("node:assert/strict");

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log("  ✓", name); passed++; }
  catch (e) { console.error("  ✗", name, "\n    ", e.message); failed++; }
}

const projections = require("../src/projections");

// A maximally-toxic raw profile row: every forbidden field crammed in,
// to verify the projection drops them.
function toxicRawProfile(overrides = {}) {
  return {
    user_id: 99,
    handle: "test-user",
    display_name: "Test User",
    archetype_tagline: "The Threshold Keeper",
    essence: "A short curated essence string.",
    statement: "I hold the gate.",
    presence_status: "in_the_field",
    // PRIVATE — must not appear in any projection output:
    birthdate: "1970-01-01",
    gene_keys: { life_work: "GK 5.5", evolution: "GK 32.1" },
    human_design_type: "Projector",
    sigil_seed: { gates: [{ gate: 5, line: 5 }], gematria: { sum: 999 } },
    compass_json: '{"work":{"raw":"PRIVATE TRANSCRIPT"}}',
    compass: {
      work: {
        gk_num: "5", gk_line: "5",
        web_heading: "The Work Heading",
        web_intro: "Public intro.",
        highlights: ["a", "b"],
        // private fields that must be stripped:
        raw: "PRIVATE TRANSCRIPT VESNA",
        qa_answers: { 0: "private answer" },
        observations: ["PRIVATE OBS"],
        insights: [{ title: "Frequency Feeler", body: "PRIVATE INSIGHT" }],
        summary: "PRIVATE NARRATIVE SUMMARY",
        frequency: 8,
      },
      lens: {
        gk_num: "32", web_heading: "Lens H", web_intro: "Lens intro", highlights: [],
        raw: "PRIVATE LENS", qa_answers: { 1: "x" },
      },
      field: null,
      call: null,
    },
    frequency_signature: {
      tonal_center: "C", dominant_hz: 528,
      elemental_alignment: "water", chakra_focus: "heart",
    },
    creative_stream: ["MAY CONTAIN PRIVATE NOTES"],
    offerings: [
      { title: "Council", format: "circle", exchange: "gift" },
      { title: "x".repeat(50), format: null, exchange: null },
    ],
    sigil_svg: "<svg><!--id--></svg>",
    sigil_seed_json: '{"gates":[1]}',
    published_at: "2026-05-15T00:00:00.000Z",
    updated_at: "2026-05-15T00:00:00.000Z",
    email: "leak@example.com",
    ...overrides,
  };
}

// Fields that must NEVER appear in JSON.stringify(projection).
const FORBIDDEN_SUBSTRINGS = [
  "PRIVATE TRANSCRIPT",
  "PRIVATE LENS",
  "PRIVATE OBS",
  "PRIVATE INSIGHT",
  "PRIVATE NARRATIVE SUMMARY",
  "private answer",
  "Frequency Feeler",
  "Projector",
  "1970-01-01",
  "leak@example.com",
];

const FORBIDDEN_KEYS = [
  "birthdate", "date_of_birth", "birth_time", "birthplace",
  "gene_keys", "human_design_type", "hd_type",
  "sigil_seed", "sigil_seed_json",
  "compass_json", "frequency_signature_json", "creative_stream_json",
  "gene_keys_json", "offerings_json",
  "raw", "qa_answers", "observations", "insights",
  "email", "user_id",
];

console.log("CommonsCoverCard projection — privacy contract");

test("toCommonsCoverCard: returns null on null", () => {
  assert.equal(projections.toCommonsCoverCard(null), null);
  assert.equal(projections.toCommonsCoverCard(undefined), null);
});

test("toCommonsCoverCard: carries the minimum sigil-first shape", () => {
  const raw = toxicRawProfile();
  const c = projections.toCommonsCoverCard(raw);
  assert.equal(c.handle, "test-user");
  assert.equal(c.display_name, "Test User");
  assert.equal(c.tagline, "The Threshold Keeper");
  assert.equal(c.presence_status, "in_the_field");
  assert.equal(c.presence_label, "In the cOMmons");
  assert.equal(c.sigil_url, "/field/test-user/sigil.svg");
  assert.equal(c.profile_url, "/field/test-user");
  assert.ok(c.sigil_svg.startsWith("<svg"));
});

test("toCommonsCoverCard: never leaks private fields by substring", () => {
  const raw = toxicRawProfile();
  const c = projections.toCommonsCoverCard(raw);
  const json = JSON.stringify(c);
  for (const s of FORBIDDEN_SUBSTRINGS) {
    assert.ok(!json.includes(s), `cover card must not include "${s}"`);
  }
});

test("toCommonsCoverCard: never carries forbidden keys", () => {
  const raw = toxicRawProfile();
  const c = projections.toCommonsCoverCard(raw);
  const json = JSON.stringify(c);
  for (const k of FORBIDDEN_KEYS) {
    const re = new RegExp(`"${k}"\\s*:`, "i");
    assert.ok(!re.test(json), `cover card must not include key "${k}"`);
  }
});

test("toCommonsCoverCard: presence 'away' becomes the right label", () => {
  const c = projections.toCommonsCoverCard(toxicRawProfile({ presence_status: "away" }));
  assert.equal(c.presence_label, "Away");
});

test("toCommonsCoverCard: essence preview truncates long essences", () => {
  const long = "x".repeat(500);
  const c = projections.toCommonsCoverCard(toxicRawProfile({ essence: long }));
  assert.ok(c.essence_preview.length <= 200, "essence preview should cap");
  assert.ok(c.essence_preview.endsWith("…"), "essence preview should mark truncation");
});

console.log("\nCommonsProfilePublic projection — privacy + shape contract");

test("toCommonsProfilePublic: returns null on null", () => {
  assert.equal(projections.toCommonsProfilePublic(null), null);
});

test("toCommonsProfilePublic: full shape includes the curated compass + signature + offerings", () => {
  const raw = toxicRawProfile();
  const p = projections.toCommonsProfilePublic(raw);
  assert.equal(p.handle, "test-user");
  assert.equal(p.display_name, "Test User");
  assert.equal(p.archetype_tagline, "The Threshold Keeper");
  assert.equal(p.essence, "A short curated essence string.");
  assert.equal(p.statement, "I hold the gate.");
  assert.equal(p.presence_label, "In the cOMmons");
  assert.equal(p.sigil_url, "/field/test-user/sigil.svg");
  // Compass — curated point shape preserved
  assert.equal(p.compass.work.gk_num, "5");
  assert.equal(p.compass.work.web_heading, "The Work Heading");
  assert.equal(p.compass.work.web_intro, "Public intro.");
  assert.equal(p.compass.field, null);
  // Frequency signature
  assert.equal(p.frequency_signature.dominant_hz, 528);
  assert.equal(p.frequency_signature.chakra_focus, "heart");
  // Offerings
  assert.equal(p.offerings.length, 2);
  assert.equal(p.offerings[0].title, "Council");
});

test("toCommonsProfilePublic: drops raw/qa_answers/insights from compass points", () => {
  const raw = toxicRawProfile();
  const p = projections.toCommonsProfilePublic(raw);
  const compassJson = JSON.stringify(p.compass);
  assert.ok(!/"raw"\s*:/.test(compassJson), "no raw key");
  assert.ok(!/"qa_answers"\s*:/.test(compassJson), "no qa_answers key");
  assert.ok(!/"observations"\s*:/.test(compassJson), "no observations key");
  assert.ok(!/"insights"\s*:/.test(compassJson), "no insights key");
  assert.ok(!/"summary"\s*:/.test(compassJson), "no summary key (may quote private observations)");
  assert.ok(!/"frequency"\s*:/.test(compassJson), "no internal confidence-score field");
  assert.ok(!compassJson.includes("PRIVATE TRANSCRIPT"));
  assert.ok(!compassJson.includes("private answer"));
});

test("toCommonsProfilePublic: never leaks private fields by substring", () => {
  const raw = toxicRawProfile();
  const p = projections.toCommonsProfilePublic(raw);
  const json = JSON.stringify(p);
  for (const s of FORBIDDEN_SUBSTRINGS) {
    assert.ok(!json.includes(s), `profile public must not include "${s}"`);
  }
});

test("toCommonsProfilePublic: never carries forbidden keys", () => {
  const raw = toxicRawProfile();
  const p = projections.toCommonsProfilePublic(raw);
  const json = JSON.stringify(p);
  for (const k of FORBIDDEN_KEYS) {
    const re = new RegExp(`"${k}"\\s*:`, "i");
    assert.ok(!re.test(json), `profile public must not include key "${k}"`);
  }
});

test("toCommonsCoverCards: filters falsy entries", () => {
  const cards = projections.toCommonsCoverCards([toxicRawProfile(), null, toxicRawProfile({ handle: "alt" })]);
  assert.equal(cards.length, 2);
  assert.equal(cards[1].handle, "alt");
});

console.log("\nProjection ↔ DB round-trip (persisted sigil fields)");

// Verifies that the new persisted columns (birthdate/gene_keys/seed_syllable/
// human_design_type) round-trip via db.upsertProfile/getProfileByHandle,
// and that the resulting projection still does not expose them.
const db = require("../src/db");

test("DB persists birthdate / gene_keys / seed_syllable / human_design_type", () => {
  const u = db.upsertUser({ email: "persist@example.com" });
  db.upsertProfile(u.id, {
    handle: "persist-user",
    display_name: "Persist User",
    birthdate: "1990-12-31",
    gene_keys: { life_work: "GK 5.5" },
    seed_syllable: "Hum",
    human_design_type: "Manifestor",
    sigil_svg: "<svg/>",
    published_at: new Date().toISOString(),
  });
  const row = db.getProfileByHandle("persist-user");
  assert.equal(row.birthdate, "1990-12-31");
  assert.deepEqual(row.gene_keys, { life_work: "GK 5.5" });
  assert.equal(row.seed_syllable, "Hum");
  assert.equal(row.human_design_type, "Manifestor");
});

test("Projection strips persisted private fields even when DB has them", () => {
  const row = db.getProfileByHandle("persist-user");
  const p = projections.toCommonsProfilePublic(row);
  const json = JSON.stringify(p);
  assert.ok(!json.includes("1990-12-31"), "birthdate must not leak through projection");
  assert.ok(!json.includes("Manifestor"), "human_design_type must not leak through projection");
  assert.ok(!/"birthdate"\s*:/.test(json));
  assert.ok(!/"human_design_type"\s*:/.test(json));
  assert.ok(!/"gene_keys"\s*:/.test(json));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
