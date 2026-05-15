// CLI seeder: ensures beta users exist + imports Vesna + Eda profiles.
// Usage:  node src/seed.js
//
// Markus is on the BETA_USERS list (he gets a magic-link seat) but no
// public profile is created until his own Compass JSON is provided.

const db = require("./db");
const { importVesnaSeed, importEdaSeed } = require("./importers");
const { BETA_USERS } = require("./auth");

function main() {
  console.log("[field/seed] ensuring beta users exist…");
  for (const email of BETA_USERS) {
    const u = db.upsertUser({ email });
    console.log(`  · ${u.email} (id=${u.id})`);
  }

  console.log("[field/seed] importing Vesna Lucca…");
  try {
    const r = importVesnaSeed();
    console.log(`  · published @${r.user.handle} (${r.user.email})`);
    console.log(`  · source: ${r.source_file}`);
  } catch (e) {
    console.warn(`  ! ${e.message}`);
  }

  console.log("[field/seed] importing Eda Çarmıklı…");
  try {
    const r = importEdaSeed();
    console.log(`  · published @${r.user.handle} (${r.user.email})`);
    console.log(`  · source: ${r.source_file}`);
  } catch (e) {
    console.warn(`  ! ${e.message}`);
  }

  console.log("[field/seed] done.");
}

main();
