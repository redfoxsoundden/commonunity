// Field service tests — exercise pure modules without spinning up Express.
// The db module falls back to in-memory storage when better-sqlite3 is absent,
// so these tests run with no native build step.

process.env.DATABASE_URL = "/tmp/field-test-" + Date.now() + ".db"; // ignored in fallback
process.env.NODE_ENV = "test";

const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log("  ✓", name); passed++; }
  catch (e) { console.error("  ✗", name, "\n    ", e.message); failed++; }
}

// ─── 1. Sigil determinism through the importer pipeline ─────────────────
console.log("field/importers + sigil composition");
const importers = require("../src/importers");

test("compassJsonToFieldProfile: maps Vesna seed → curated profile", () => {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "vesna-mini.json"), "utf8"));
  const p = importers.compassJsonToFieldProfile(raw);
  assert.equal(p.display_name, "Vesna Lucca");
  assert.equal(p.handle, "vesna-lucca");
  assert.equal(p.compass.work.gk_num, "5");
  assert.equal(p.compass.lens.gk_num, "32");
  // Curated: no raw, no qa_answers leak
  assert.ok(!("raw" in p.compass.work));
  assert.ok(!("qa_answers" in p.compass.work));
  // First web_intro from lens becomes essence
  assert.match(p.essence, /horizontal/);
  // First web_heading becomes tagline
  assert.match(p.archetype_tagline, /Observer|Let Go/);
});

test("curateCompassPoint: drops raw transcript & qa fields", () => {
  const sample = {
    raw: "PRIVATE TRANSCRIPT",
    qa_answers: { 0: "secret" },
    web_heading: "Public Heading",
    gk_num: "5", gk_line: "5",
    highlights: ["a", "b", "c"],
  };
  const c = importers.curateCompassPoint(sample);
  assert.equal(c.web_heading, "Public Heading");
  assert.equal(c.gk_num, "5");
  assert.ok(!("raw" in c));
  assert.ok(!("qa_answers" in c));
});

// ─── 2. DB CRUD round-trip ──────────────────────────────────────────────
console.log("\nfield/db");
const db = require("../src/db");

test("upsertUser → unique by email; updates handle", () => {
  const u1 = db.upsertUser({ email: "Test@Example.COM" });
  assert.equal(u1.email, "test@example.com");
  const u2 = db.upsertUser({ email: "test@example.com", handle: "test", display_name: "Test User" });
  assert.equal(u2.id, u1.id);
  assert.equal(u2.handle, "test");
  assert.equal(u2.display_name, "Test User");
});

test("magic token: create → consume → cannot reuse", () => {
  const t = db.createMagicToken("test@example.com", 30);
  const r = db.consumeMagicToken(t);
  assert.ok(r);
  assert.equal(r.email, "test@example.com");
  assert.equal(db.consumeMagicToken(t), null);
});

test("magic token: invalid → null", () => {
  assert.equal(db.consumeMagicToken("nope"), null);
});

test("upsertProfile + getProfileByHandle round-trip", () => {
  const u = db.upsertUser({ email: "vesna@example.com" });
  db.upsertProfile(u.id, {
    handle: "vesna-test", display_name: "Vesna T",
    essence: "essence", compass: { work: { gk_num: "5" } },
    sigil_seed: { foo: 1 }, sigil_svg: "<svg/>",
    published_at: new Date().toISOString(),
  });
  const p = db.getProfileByHandle("vesna-test");
  assert.equal(p.display_name, "Vesna T");
  assert.equal(p.essence, "essence");
  assert.deepEqual(p.compass, { work: { gk_num: "5" } });
  assert.deepEqual(p.sigil_seed, { foo: 1 });
});

test("recordAttune: dedupes by (from,to) pair", () => {
  const a = db.upsertUser({ email: "a@example.com" });
  const b = db.upsertUser({ email: "b@example.com" });
  const r1 = db.recordAttune(a.id, b.id);
  assert.equal(r1.ok, true);
  const r2 = db.recordAttune(a.id, b.id);
  assert.equal(r2.ok, true);
  assert.equal(r2.already, true);
  assert.equal(db.attunementCountFor(b.id), 1);
});

test("recordAttune: self-attune rejected", () => {
  const a = db.upsertUser({ email: "selfattune@example.com" });
  const r = db.recordAttune(a.id, a.id);
  assert.equal(r.ok, false);
});

test("presence + tone: stored & retrievable for owner", () => {
  const owner = db.upsertUser({ email: "owner@example.com" });
  const visitor = db.upsertUser({ email: "visitor@example.com", display_name: "Visitor" });
  db.recordPresence({ visitorUserId: visitor.id, profileUserId: owner.id });
  db.recordTone({ fromUserId: visitor.id, toUserId: owner.id, intention: "hello", seedSyllable: "Om" });
  const ps = db.recentPresencesFor(owner.id, 10);
  assert.equal(ps.length, 1);
  const tones = db.inboxTonesFor(owner.id, 10);
  assert.equal(tones.length, 1);
  assert.equal(tones[0].intention, "hello");
});

// ─── 3. Vesna full-pipeline import ──────────────────────────────────────
console.log("\nfield/importers: full Vesna seed");
test("importVesnaSeed: produces a published profile with sigil + curated compass", () => {
  process.env.VESNA_EMAIL = "vesna@example.com";
  const r = importers.importVesnaSeed();
  assert.ok(r.source_file);
  const p = db.getProfileByHandle("vesna-lucca");
  assert.ok(p, "profile must exist");
  assert.equal(p.display_name, "Vesna Lucca");
  assert.match(p.sigil_svg, /<svg /);
  // Curated: ensure raw transcript is not in compass JSON anywhere
  const json = JSON.stringify(p.compass);
  assert.ok(!json.includes("From transcript"), "raw transcripts must not leak");
  assert.ok(!json.includes("qa_answers"), "qa_answers must not leak");
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
