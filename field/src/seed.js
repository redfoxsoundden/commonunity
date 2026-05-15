// Seeder for the three Phase 1 beta Living Profiles.
//
// Two entry points:
//   1. CLI:    `node src/seed.js`      — re-imports all three, prints status.
//   2. Library: `autoSeedBeta({ log })` — called from src/index.js at startup
//                 in production so a fresh Railway volume comes up populated.
//
// Both paths are idempotent:
//   - `upsertUser` keys on email — no duplicate users on re-run.
//   - `upsertProfile` keys on user_id — re-imports overwrite the same row.
//   - We additionally short-circuit auto-seed when all three handles are
//     already present, so a warm DB does no redundant work.
//
// Source data: `field/seeds/public/*.json` (committed, curated, no raw
// transcripts). See `field/seeds/public/README.md`.

const db = require("./db");
const { importVesnaSeed, importEdaSeed, importMarkusSeed } = require("./importers");
const { BETA_USERS } = require("./auth");

const BETA_SEEDS = [
  { name: "Vesna Lucca",  handle: "vesna-lucca",  fn: importVesnaSeed },
  { name: "Eda Çarmıklı", handle: "eda-carmikli", fn: importEdaSeed },
  { name: "Markus Lehto", handle: "markus-lehto", fn: importMarkusSeed },
];

function ensureBetaUsers(log = console) {
  for (const email of BETA_USERS) {
    const u = db.upsertUser({ email });
    log.log(`  · ${u.email} (id=${u.id})`);
  }
}

function importAllBetaSeeds(log = console) {
  const results = [];
  for (const { name, fn } of BETA_SEEDS) {
    log.log(`[field/seed] importing ${name}…`);
    try {
      const r = fn();
      log.log(`  · published @${r.user.handle} (${r.user.email})`);
      log.log(`  · source: ${r.source_file}`);
      results.push({ ok: true, name, handle: r.user.handle, source: r.source_file });
    } catch (e) {
      log.warn(`  ! ${e.message}`);
      results.push({ ok: false, name, error: e.message });
    }
  }
  return results;
}

// Called from src/index.js on boot in production-ish environments.
// Idempotent: skips when all three handles already have a published profile,
// so redeploys against a persistent Railway volume do not re-import on every
// container start. Force a re-import with FIELD_FORCE_SEED=1.
function autoSeedBeta({ log = console, force = false } = {}) {
  const enabled = force
    || process.env.FIELD_FORCE_SEED === "1"
    || process.env.FIELD_AUTO_SEED !== "0"; // default on; opt out with =0
  if (!enabled) {
    log.log("[field/seed] auto-seed disabled via FIELD_AUTO_SEED=0");
    return { ran: false, reason: "disabled" };
  }

  const handles = BETA_SEEDS.map(s => s.handle);
  const existing = handles.filter(h => db.getProfileByHandle(h));
  if (!force && process.env.FIELD_FORCE_SEED !== "1" && existing.length === handles.length) {
    log.log(`[field/seed] auto-seed skipped — all ${handles.length} beta profiles already present`);
    return { ran: false, reason: "already-seeded", handles: existing };
  }

  log.log(`[field/seed] auto-seed starting (existing: ${existing.length}/${handles.length})…`);
  ensureBetaUsers(log);
  const results = importAllBetaSeeds(log);
  log.log("[field/seed] auto-seed done.");
  return { ran: true, results };
}

function main() {
  console.log("[field/seed] ensuring beta users exist…");
  ensureBetaUsers();
  importAllBetaSeeds();
  console.log("[field/seed] done.");
}

if (require.main === module) main();

module.exports = { autoSeedBeta, ensureBetaUsers, importAllBetaSeeds, BETA_SEEDS };
