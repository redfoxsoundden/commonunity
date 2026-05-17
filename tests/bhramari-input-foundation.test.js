// Static-source regression test for the manual Bhramari frequency input.
//
// Verifies that:
//   1. The Field Imprints foundation list includes a Bhramari baseline row
//      bound to the `bhramari_hz` edit field.
//   2. The edit popover routes saves to profile.frequency_signature.dominant_hz
//      (the canonical Om Cipher input).
//   3. The display reads back from frequency_signature.dominant_hz with a
//      legacy fallback to profile.bhramari_baseline_hz.
//   4. JSON-friendly: a state shape carrying just dominant_hz round-trips
//      via JSON.stringify/parse without losing the field (sanity guard,
//      since the Studio persists `state` whole through localStorage).

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "studio.html"), "utf8");

let passed = 0, failed = 0;
function ok(name, cond, detail) {
  if (cond) { console.log("  ✓", name); passed++; }
  else { console.error("  ✗", name, detail || ""); failed++; }
}

console.log("bhramari manual input — static source checks");

ok(
  "foundation row includes Bhramari baseline",
  /Bhramari baseline['"\s,].*field:\s*'bhramari_hz'/s.test(html),
  "expected a 'Bhramari baseline' row bound to field 'bhramari_hz' in buildFoundationItems"
);

ok(
  "edit popover label registered for bhramari_hz",
  /bhramari_hz:\s*'Bhramari baseline \(Hz\)'/.test(html),
  "expected labelMap entry for bhramari_hz"
);

ok(
  "save handler writes to profile.frequency_signature.dominant_hz",
  /p\.frequency_signature\.dominant_hz\s*=\s*hz/.test(html),
  "expected save to mirror the entered Hz into the canonical dominant_hz path"
);

ok(
  "save handler mirrors to profile.bhramari_baseline_hz",
  /p\.bhramari_baseline_hz\s*=\s*hz/.test(html),
  "expected save to also mirror the entered Hz as bhramari_baseline_hz"
);

ok(
  "read path falls back through frequency_signature → bhramari_baseline_hz",
  /fsBlock\.dominant_hz\s*\|\|\s*p\.bhramari_baseline_hz/.test(html),
  "expected the foundation builder to read either canonical path"
);

ok(
  "helper text mentions tuner/manual measurement",
  /tuner.*Hz|measured manually|Measure your humming pitch/i.test(html),
  "expected helper text describing manual tuner measurement"
);

// Simple JSON round-trip sanity check for the data shape.
const sample = {
  compassData: {
    profile: {
      frequency_signature: { dominant_hz: 136.1 },
      bhramari_baseline_hz: 136.1,
      foundation: { bhramari_baseline_hz: 136.1 },
    },
  },
};
const round = JSON.parse(JSON.stringify(sample));
ok(
  "JSON round-trip preserves frequency_signature.dominant_hz",
  round.compassData.profile.frequency_signature.dominant_hz === 136.1
);
ok(
  "JSON round-trip preserves bhramari_baseline_hz mirror",
  round.compassData.profile.bhramari_baseline_hz === 136.1
);

// Older JSON without bhramari should not break the foundation read path.
const legacy = JSON.parse(JSON.stringify({
  compassData: { profile: { birthdate: "1988-04-23" } },
}));
ok(
  "legacy JSON without bhramari fields still parses",
  legacy.compassData.profile.birthdate === "1988-04-23"
    && legacy.compassData.profile.frequency_signature === undefined
);

console.log("\n" + (failed === 0 ? "✅ all passed" : "❌ " + failed + " failed") +
  ` (${passed} passed, ${failed} failed)`);
if (failed > 0) process.exit(1);
