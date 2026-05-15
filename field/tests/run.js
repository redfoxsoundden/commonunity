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

// ─── 3. Compass-JSON → curated-profile mapping for Eda ──────────────────
test("compassJsonToFieldProfile: maps Eda seed → curated profile (Turkish name transliterates)", () => {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "eda-mini.json"), "utf8"));
  const p = importers.compassJsonToFieldProfile(raw);
  // Display name preserves the Turkish spelling.
  assert.equal(p.display_name, "Eda Çarmıklı");
  // Auto-proposed handle transliterates ç→c and ı→i.
  assert.equal(p.handle, "eda-carmikli");
  // Eda's compass: work GK 45, lens GK 26; field/call have GK but empty web fields.
  assert.equal(p.compass.work.gk_num, "45");
  assert.equal(p.compass.lens.gk_num, "26");
  assert.equal(p.compass.field.gk_num, "22");
  assert.equal(p.compass.call.gk_num, "47");
  // Curated: no raw or qa_answers JSON keys leak. (The word "raw" can
  // appear inside English prose — e.g. "drawing" — so we check for the
  // JSON key form `"raw":` instead of the bare substring.)
  const json = JSON.stringify(p.compass);
  assert.ok(!/"raw"\s*:/.test(json), 'compass JSON must not contain a "raw" key');
  assert.ok(!/"qa_answers"\s*:/.test(json), 'compass JSON must not contain a "qa_answers" key');
  // First web_intro from lens becomes essence; first web_heading becomes tagline.
  assert.match(p.essence, /grew up learning|navigate/i);
  assert.match(p.archetype_tagline, /Visible Service|Hidden Strategy/i);
});

// ─── 3b. Compass-JSON → curated-profile mapping for Markus ──────────────
test("compassJsonToFieldProfile: maps Markus seed → curated profile (first-name-only JSON)", () => {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "markus-mini.json"), "utf8"));
  const p = importers.compassJsonToFieldProfile(raw);
  // Source JSON only carries first_name="Markus"; auto display_name reflects that.
  // (The publish-time importMarkusSeed lifts it to "Markus Lehto" — see test below.)
  assert.equal(p.display_name, "Markus");
  assert.equal(p.handle, "markus");
  // Markus's compass GK identifiers (the real JSON ships these as integers
  // rather than strings; compare loosely so either form is accepted).
  assert.equal(String(p.compass.work.gk_num), "14");
  assert.equal(String(p.compass.lens.gk_num), "8");
  assert.equal(String(p.compass.field.gk_num), "29");
  assert.equal(String(p.compass.call.gk_num), "30");
  // Curated: no qa_answers or insights JSON keys leak.
  const json = JSON.stringify(p.compass);
  assert.ok(!/"qa_answers"\s*:/.test(json), 'compass JSON must not contain a "qa_answers" key');
  assert.ok(!/"insights"\s*:/.test(json), 'compass JSON must not contain an "insights" key');
  assert.ok(!json.includes("PRIVATE-Q-MARKUS"), "qa_answers content must not leak");
  assert.ok(!json.includes("PRIVATE-INSIGHT-MARKUS"), "insights content must not leak");
  // First web_intro becomes essence; first web_heading becomes tagline.
  assert.match(p.essence, /anchor|citizenship|stability/i);
  assert.match(p.archetype_tagline, /Without Anchor|Living/i);
});

// ─── 4. Vesna full-pipeline import ──────────────────────────────────────
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

// ─── 5. Eda full-pipeline import ────────────────────────────────────────
console.log("\nfield/importers: full Eda seed");
test("importEdaSeed: produces a published profile with sigil + curated compass; handle pinned to eda-carmikli", () => {
  process.env.EDA_EMAIL = "eda@jointidea.com";
  const r = importers.importEdaSeed();
  assert.ok(r.source_file);
  assert.equal(r.user.handle, "eda-carmikli");
  assert.equal(r.user.email, "eda@jointidea.com");
  const p = db.getProfileByHandle("eda-carmikli");
  assert.ok(p, "profile must exist");
  assert.equal(p.display_name, "Eda Çarmıklı");
  assert.match(p.sigil_svg, /<svg /);
  // Anti-leak: raw transcripts (Eda's JSON contains them under points.*.raw)
  // must not surface in the curated compass payload.
  const json = JSON.stringify(p.compass);
  assert.ok(!json.includes("Sufism"), "raw transcripts must not leak (Sufism sentence is in points.work.raw, not web_intro)");
  assert.ok(!json.includes("qa_answers"));
  // Tone is the 396 Hz / earth / root pinned for Eda.
  assert.equal(p.frequency_signature.dominant_hz, 396);
  assert.equal(p.frequency_signature.chakra_focus, "root");
});

// ─── 5b. Markus full-pipeline import ────────────────────────────────────
console.log("\nfield/importers: full Markus seed");
test("importMarkusSeed: produces a published profile with sigil + curated compass; handle pinned to markus-lehto", () => {
  process.env.MARKUS_EMAIL = "markuslehto@mac.com";
  const r = importers.importMarkusSeed();
  assert.ok(r.source_file);
  assert.equal(r.user.handle, "markus-lehto");
  assert.equal(r.user.email, "markuslehto@mac.com");
  const p = db.getProfileByHandle("markus-lehto");
  assert.ok(p, "profile must exist");
  // Display name lifted to "Markus Lehto" so the gallery name matches the URL.
  assert.equal(p.display_name, "Markus Lehto");
  assert.match(p.sigil_svg, /<svg /);
  // Anti-leak: Markus's JSON contains qa_answers + insights on every point;
  // none of that text — or its container keys — may surface in the public
  // compass payload.
  const json = JSON.stringify(p.compass);
  assert.ok(!/"qa_answers"\s*:/.test(json), 'compass JSON must not contain a "qa_answers" key');
  assert.ok(!/"insights"\s*:/.test(json), 'compass JSON must not contain an "insights" key');
  assert.ok(!/"observations"\s*:/.test(json), 'compass JSON must not contain an "observations" key');
  assert.ok(!json.includes("rather strange life"), "qa_answers prose must not leak (distinctive phrase from work.qa_answers[0])");
  assert.ok(!json.includes("Frequency Feeler"), "insights titles must not leak");
  // Tone is the 639 Hz / heart / air pinned for Markus.
  assert.equal(p.frequency_signature.dominant_hz, 639);
  assert.equal(p.frequency_signature.chakra_focus, "heart");
});

// ─── 6. All three profiles coexist with distinct sigils ─────────────────
test("Vesna, Eda, and Markus profiles coexist with distinct sigils + handles", () => {
  const v = db.getProfileByHandle("vesna-lucca");
  const e = db.getProfileByHandle("eda-carmikli");
  const m = db.getProfileByHandle("markus-lehto");
  assert.ok(v && e && m, "all three profiles must exist");
  assert.notEqual(v.user_id, e.user_id);
  assert.notEqual(v.user_id, m.user_id);
  assert.notEqual(e.user_id, m.user_id);
  assert.notEqual(v.sigil_svg, e.sigil_svg, "Vesna/Eda sigils must differ");
  assert.notEqual(v.sigil_svg, m.sigil_svg, "Vesna/Markus sigils must differ");
  assert.notEqual(e.sigil_svg, m.sigil_svg, "Eda/Markus sigils must differ");
});

// ─── 7. Gallery lists all three ─────────────────────────────────────────
test("listPublishedProfiles: gallery includes Vesna, Eda, and Markus", () => {
  const list = db.listPublishedProfiles({ limit: 50 });
  const handles = list.map(p => p.handle).sort();
  assert.ok(handles.includes("vesna-lucca"));
  assert.ok(handles.includes("eda-carmikli"));
  assert.ok(handles.includes("markus-lehto"));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
