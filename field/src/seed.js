// CLI seeder: ensures beta users exist + imports Vesna profile.
// Usage:  node src/seed.js

const db = require("./db");
const { importVesnaSeed } = require("./importers");
const { BETA_USERS } = require("./auth");

function main() {
  console.log("[field/seed] ensuring beta users exist…");
  for (const email of BETA_USERS) {
    const u = db.upsertUser({ email });
    console.log(`  · ${u.email} (id=${u.id})`);
  }

  console.log("[field/seed] importing Vesna Lucca seed profile…");
  try {
    const r = importVesnaSeed();
    console.log(`  · published profile for ${r.user.email} as @${r.user.handle}`);
    console.log(`  · source: ${r.source_file}`);
  } catch (e) {
    console.warn(`  ! ${e.message}`);
  }

  console.log("[field/seed] done.");
}

main();
