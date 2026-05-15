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

// Generic Compass-JSON → published Field profile importer.
// Accepts a list of candidate filenames so callers can name a primary path
// plus aliases. Strips raw/qa fields. Stamps the sigil from encoded seed.
//
// Params:
//   filenames           — array of candidate filenames to look for in SEED_DIR_CANDIDATES
//   email               — beta account email this seed publishes under
//   handleOverride      — optional; if the auto-proposed handle would be wrong
//                          (e.g. user has a known Latinised spelling), pin it
//   displayNameOverride — optional; if the Compass JSON only carries a first
//                          name but the person publishes under a fuller name
//                          (e.g. Markus's JSON ships full_name="Markus"; we
//                          publish him as "Markus Lehto" to match his handle)
//   tone                — { tonal_center, dominant_hz, elemental_alignment, chakra_focus }
//                          optional; default is the 528 Hz / heart demonstration tone
//   missingMessage      — message to throw if no file is found
function importCompassSeed({ filenames, email, handleOverride, displayNameOverride, tone, missingMessage } = {}) {
  if (!Array.isArray(filenames) || filenames.length === 0) {
    throw new Error("importCompassSeed: filenames[] required");
  }
  if (!email) throw new Error("importCompassSeed: email required");

  let file = null;
  for (const name of filenames) {
    const found = findSeedFile(name);
    if (found) { file = found; break; }
  }
  if (!file) {
    throw new Error(missingMessage ||
      `Compass seed not found. Place one of [${filenames.join(", ")}] in field/seeds/ or /home/user/workspace/.`);
  }

  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const fieldProfile = compassJsonToFieldProfile(raw);

  // Apply handle override (Latin spelling preferred over transliteration if asked).
  if (handleOverride) fieldProfile.handle = handleOverride;

  // Apply display-name override (used when the source JSON only carries a
  // first name but the person publishes under a fuller name).
  if (displayNameOverride) fieldProfile.display_name = displayNameOverride;

  // Tone: caller may pin one. Default is 528 Hz / heart (used for Vesna in the
  // first seed). Eda's seed uses 396 Hz / root (her Life's Work is GK 45 — a
  // Throat gate but root-grounded — see seeds/README.md for the rationale).
  fieldProfile.frequency_signature = tone || {
    tonal_center: "C",
    dominant_hz: 528,
    elemental_alignment: "water",
    chakra_focus: "heart",
  };

  const user = db.upsertUser({
    email,
    handle: fieldProfile.handle,
    display_name: fieldProfile.display_name,
  });

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

  return {
    user: { id: user.id, email: user.email, handle: user.handle },
    source_file: file,
  };
}

function importVesnaSeed({ email } = {}) {
  return importCompassSeed({
    filenames: ["vesna-lucca-compass-2026-05-12.json", "vesna.json"],
    email: email || process.env.VESNA_EMAIL || "vesna.lucca@gmail.com",
    tone: {
      tonal_center: "C",
      dominant_hz: 528,
      elemental_alignment: "water",
      chakra_focus: "heart",
    },
    missingMessage: "Vesna seed file not found. Place vesna-lucca-compass-2026-05-12.json in field/seeds/ or /home/user/workspace/.",
  });
}

function importEdaSeed({ email } = {}) {
  // The JSON filename ships as "eda-armkl-…" (without the cedilla c and
  // dotless ı the full surname carries); we accept that, plus the obvious
  // Latinised alias. The auto-proposed handle from "Eda Çarmıklı" now
  // transliterates correctly to "eda-carmikli" via sigil.proposeHandle, but
  // we pin it here anyway so the public URL is stable across future name
  // edits in the JSON.
  return importCompassSeed({
    filenames: [
      "eda-armkl-compass-2026-05-15.json",
      "eda-carmikli-compass.json",
      "eda.json",
    ],
    email: email || process.env.EDA_EMAIL || "eda@jointidea.com",
    handleOverride: "eda-carmikli",
    tone: {
      // Her Life's Work GK 45 sits at the Throat in HD; she gathers people
      // (Sacral resonance). The 396 Hz / Solfeggio Ut "Liberation" family
      // matches her published themes of constructive paying-it-forward
      // leadership. Configurable; documented in seeds/README.md.
      tonal_center: "G",
      dominant_hz: 396,
      elemental_alignment: "earth",
      chakra_focus: "root",
    },
    missingMessage: "Eda seed file not found. Place eda-armkl-compass-2026-05-15.json in field/seeds/ or /home/user/workspace/.",
  });
}

function importMarkusSeed({ email } = {}) {
  // Markus's Compass JSON carries only first_name="Markus" / full_name="Markus".
  // He publishes under the handle "markus-lehto" (his surname is Lehto), so we
  // pin the handle and lift the display name to "Markus Lehto" so the gallery
  // card and profile heading match the public URL. The JSON itself stays the
  // authoritative source of birthdate + gene_keys + compass content; only the
  // public-facing name and handle are overridden.
  return importCompassSeed({
    filenames: [
      "markus-compass-2026-05-15.json",
      "markus-lehto-compass.json",
      "markus.json",
    ],
    email: email || process.env.MARKUS_EMAIL || "markuslehto@mac.com",
    handleOverride: "markus-lehto",
    displayNameOverride: "Markus Lehto",
    tone: {
      // Markus's Life's Work GK 14 — "Bounteousness" — sits at the Sacral in
      // HD. His session palette note describes hard-won wisdom moving toward
      // a different kind of power that does not need to prove itself. 639 Hz
      // (Solfeggio Fa, "Connection", Heart) matches his published themes of
      // weaving coherence between people and frequencies. Configurable;
      // documented in seeds/README.md.
      tonal_center: "D#",
      dominant_hz: 639,
      elemental_alignment: "air",
      chakra_focus: "heart",
    },
    missingMessage: "Markus seed file not found. Place markus-compass-2026-05-15.json in field/seeds/ or /home/user/workspace/.",
  });
}

module.exports = {
  importCompassSeed,
  importVesnaSeed,
  importEdaSeed,
  importMarkusSeed,
  compassJsonToFieldProfile,
  curateCompassPoint,
  findSeedFile,
};
