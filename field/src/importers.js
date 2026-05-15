// Seed importers. Convert raw Compass-style JSON into Field profile shape.
// Curates: produces *summaries* and *web fields* for public display.
// Never publishes raw transcript text — those are flagged "private" and stripped.

const fs = require("fs");
const path = require("path");
const db = require("./db");
const sigil = require("../../sdk/sigil.js");

const SEED_DIR_CANDIDATES = [
  path.join(__dirname, "..", "seeds"),
  path.join(__dirname, "..", "..", "..", "..", ""), // workspace root
  "/home/user/workspace",
];

function findSeedFile(filename) {
  for (const dir of SEED_DIR_CANDIDATES) {
    const p = path.join(dir, filename);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// Curate one Compass point — keep ONLY web-safe / curated fields.
function curateCompassPoint(p) {
  if (!p) return null;
  return {
    gk_num: p.gk_num || null,
    gk_line: p.gk_line || null,
    theme: p.theme || null,
    summary: p.summary || null,
    web_heading: p.web_heading || null,
    web_intro: p.web_intro || null,
    web_closing: p.web_closing || null,
    highlights: Array.isArray(p.highlights) ? p.highlights.slice(0, 8) : [],
    frequency: typeof p.frequency === "number" ? p.frequency : null,
    // intentionally NOT included: raw, observations, qa_answers, insights
  };
}

function compassJsonToFieldProfile(raw) {
  const prof = raw.profile || {};
  const pts = raw.points || {};
  const display_name = prof.full_name || [prof.first_name, prof.last_name].filter(Boolean).join(" ") || "—";
  const birthdate = prof.birthdate || prof.date_of_birth || raw.date_of_birth || raw.dob || null;

  const compass = {
    work: curateCompassPoint(pts.work),
    lens: curateCompassPoint(pts.lens),
    field: curateCompassPoint(pts.field),
    call: curateCompassPoint(pts.call),
  };

  // First non-null web_intro becomes the public essence (curated, transcript-free).
  const firstWebIntro =
    (compass.lens && compass.lens.web_intro) ||
    (compass.field && compass.field.web_intro) ||
    (compass.work && compass.work.web_intro) ||
    null;

  // First non-null web_heading becomes the archetype tagline.
  const tagline =
    (compass.lens && compass.lens.web_heading) ||
    (compass.field && compass.field.web_heading) ||
    null;

  return {
    handle: sigil.proposeHandle(display_name),
    display_name,
    archetype_tagline: tagline,
    essence: firstWebIntro,
    statement: null,
    presence_status: "in_the_field",
    birthdate,
    gene_keys: prof.gene_keys || {},
    compass,
    frequency_signature: {
      tonal_center: null,
      dominant_hz: null,
      elemental_alignment: null,
      chakra_focus: null,
    },
    creative_stream: [],
    offerings: [],
  };
}

function importVesnaSeed({ email } = {}) {
  const file =
    findSeedFile("vesna-lucca-compass-2026-05-12.json") ||
    findSeedFile("vesna.json");
  if (!file) {
    throw new Error("Vesna seed file not found. Place vesna-lucca-compass-2026-05-12.json in field/seeds/ or /home/user/workspace/.");
  }
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const fieldProfile = compassJsonToFieldProfile(raw);
  // The seed JSON has no tonal centre; choose 528 Hz as a demonstration tone
  // (configurable; documented in seeds/README.md).
  fieldProfile.frequency_signature = {
    tonal_center: "C",
    dominant_hz: 528,
    elemental_alignment: "water",
    chakra_focus: "heart",
  };

  const userEmail = email || process.env.VESNA_EMAIL || "vesna@example.com";
  const user = db.upsertUser({ email: userEmail, handle: fieldProfile.handle, display_name: fieldProfile.display_name });

  const seed = sigil.encodeSigilSeed({
    display_name: fieldProfile.display_name,
    full_name: fieldProfile.display_name,
    birthdate: fieldProfile.birthdate,
    gene_keys: fieldProfile.gene_keys,
    compass: fieldProfile.compass,
    tone: {
      tonal_center: fieldProfile.frequency_signature.tonal_center,
      dominant_hz: fieldProfile.frequency_signature.dominant_hz,
      seed_syllable: "Om",
    },
  });
  const svg = sigil.renderSigilSVG(seed);

  db.upsertProfile(user.id, {
    ...fieldProfile,
    sigil_seed: seed,
    sigil_svg: svg,
    published_at: new Date().toISOString(),
  });

  return { user: { id: user.id, email: user.email, handle: user.handle }, source_file: file };
}

module.exports = { importVesnaSeed, compassJsonToFieldProfile, curateCompassPoint, findSeedFile };
