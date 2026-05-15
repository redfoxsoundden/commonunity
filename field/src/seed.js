// CLI seeder: ensures beta users exist + imports Vesna, Eda, and Markus
// profiles. Usage:  node src/seed.js

const db = require("./db");
const { importVesnaSeed, importEdaSeed, importMarkusSeed } = require("./importers");
const { BETA_USERS } = require("./auth");

function main() {
  console.log("[field/seed] ensuring beta users exist…");
  for (const email of BETA_USERS) {
    const u = db.upsertUser({ email });
    console.log(`  · ${u.email} (id=${u.id})`);
  }

  const seeds = [
    { name: "Vesna Lucca",   fn: importVesnaSeed },
    { name: "Eda Çarmıklı",  fn: importEdaSeed },
    { name: "Markus Lehto",  fn: importMarkusSeed },
  ];

  for (const { name, fn } of seeds) {
    console.log(`[field/seed] importing ${name}…`);
    try {
      const r = fn();
      console.log(`  · published @${r.user.handle} (${r.user.email})`);
      console.log(`  · source: ${r.source_file}`);
    } catch (e) {
      console.warn(`  ! ${e.message}`);
    }
  }

  console.log("[field/seed] done.");
}

main();
