// JS/Python parity — verifies that the two canonical engines
// (sdk/om_cipher.js and om_cipher_engine.py) produce byte-identical
// seeds and matching numerology layers for a fixed set of inputs.
//
// Run: OM_CIPHER_ENABLED=true node tests/om-cipher-js-py-parity.test.js
//
// Skips itself if python3 is unavailable on $PATH.
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

process.env.OM_CIPHER_ENABLED = "true";

const om = require("../sdk/om_cipher.js");

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log("  ✓", name); passed++; }
  catch (e) { console.error("  ✗", name, "\n   ", e.stack || e.message); failed++; }
}

const pyOk = spawnSync("python3", ["-c", "import om_cipher_engine"], {
  cwd: path.join(__dirname, ".."),
  env: { ...process.env, OM_CIPHER_ENABLED: "true" },
});
if (pyOk.status !== 0) {
  console.log("⚠ python3 / om_cipher_engine unavailable — parity suite skipped");
  process.exit(0);
}

function pyGenerate(payload) {
  const script = `
import json, sys, os
os.environ['OM_CIPHER_ENABLED'] = 'true'
os.environ['BHRAMARI_CAPTURE_ENABLED'] = 'true'
import om_cipher_engine as e
payload = json.loads(sys.argv[1])
r = e.generate(payload)
print(json.dumps({
  'seed': r.get('seed'),
  'seed_string': r.get('seed_string'),
  'life_path': r['metadata']['life_path']['value'] if r['metadata'].get('life_path') else None,
  'expression': r['metadata']['expression']['value'] if r['metadata'].get('expression') else None,
  'soul_urge': r['metadata']['soul_urge']['value'] if r['metadata'].get('soul_urge') else None,
  'personality': r['metadata']['personality']['value'] if r['metadata'].get('personality') else None,
  'lunar_phase': r['metadata']['lunar_phase']['value'] if r['metadata'].get('lunar_phase') else None,
  'solar_quarter': r['metadata']['solar_quarter']['value'] if r['metadata'].get('solar_quarter') else None,
  'temporal_gate': (r['metadata']['temporal_gate'] or {}).get('value'),
  'sigil_points': r['metadata']['sigil_points'],
  'primary_hue': r['palette']['primary_hue'],
  'secondary_hue': r['palette']['secondary_hue'],
}))
`;
  const r = spawnSync(
    "python3",
    ["-c", script, JSON.stringify(payload)],
    { cwd: path.join(__dirname, ".."), env: { ...process.env, OM_CIPHER_ENABLED: "true" } }
  );
  if (r.status !== 0) {
    throw new Error("python call failed: " + r.stderr.toString());
  }
  return JSON.parse(r.stdout.toString().trim());
}

function jsGenerate(payload) {
  const r = om.generate(payload, { featureFlag: true });
  return {
    seed: r.seed,
    seed_string: r.seed_string,
    life_path: r.metadata.life_path ? r.metadata.life_path.value : null,
    expression: r.metadata.expression ? r.metadata.expression.value : null,
    soul_urge: r.metadata.soul_urge ? r.metadata.soul_urge.value : null,
    personality: r.metadata.personality ? r.metadata.personality.value : null,
    lunar_phase: r.metadata.lunar_phase ? r.metadata.lunar_phase.value : null,
    solar_quarter: r.metadata.solar_quarter ? r.metadata.solar_quarter.value : null,
    temporal_gate: r.metadata.temporal_gate ? r.metadata.temporal_gate.value : null,
    sigil_points: r.metadata.sigil_points,
    primary_hue: r.palette.primary_hue,
    secondary_hue: r.palette.secondary_hue,
  };
}

const fixtures = [
  {
    label: "Markus Lehto / 1973-11-18 / 03:21",
    payload: {
      birth_date: "1973-11-18",
      birth_time: "03:21",
      legal_name: "Markus Lehto",
      preferred_name: "Markus",
    },
  },
  {
    label: "no birth_time → 9-point sigil",
    payload: { birth_date: "1988-04-23", legal_name: "Maitri Devi" },
  },
  {
    label: "master 33 birth (1980-02-22)",
    payload: { birth_date: "1980-02-22", birth_time: "12:00", legal_name: "Sample Person" },
  },
  {
    label: "no legal_name (degrades cleanly)",
    payload: { birth_date: "1990-06-15", birth_time: "18:45" },
  },
];

console.log("om_cipher — JS/Python parity");

for (const f of fixtures) {
  test(f.label, () => {
    const js = jsGenerate(f.payload);
    const py = pyGenerate(f.payload);
    assert.deepEqual(py, js, `Python and JS engines disagree for ${f.label}\nJS: ${JSON.stringify(js)}\nPy: ${JSON.stringify(py)}`);
  });
}

console.log("\n" + (failed === 0 ? "✅ all passed" : "❌ " + failed + " failed") +
  ` (${passed} passed, ${failed} failed)`);
if (failed > 0) process.exit(1);
