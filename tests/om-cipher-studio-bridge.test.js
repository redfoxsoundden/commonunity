// Focused regression test for the Studio Om Cipher browser bridge.
//
// We evaluate just the small inline IIFE that defines window.cuOmCipherDisplay
// against a fake `window`. The full Studio HTML is too heavy to JSDOM here;
// the bridge is intentionally self-contained for exactly this reason.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "studio.html"), "utf8");

// Extract the bridge IIFE block by anchor comments — keeps the test robust
// to surrounding edits.
const startMarker = "Om Cipher v1 — browser bridge";
const endMarker   = "window.cuOmCipherDisplay = function";
const start = html.indexOf(startMarker);
assert.ok(start > 0, "browser-bridge block not found in studio.html");
// The IIFE definition + window.cuOmCipherDisplay assignment must both be present.
assert.ok(html.indexOf(endMarker, start) > start, "window.cuOmCipherDisplay assignment not found");

// Pull the (function () { ... })(); wrapping. The bridge starts at the
// line after the closing comment block — find the first "(function ()".
const iifeStart = html.indexOf("(function () {", start);
assert.ok(iifeStart > 0, "IIFE start not found");
// Find the matching "})()" that closes this IIFE — first one after iifeStart.
const iifeEnd = html.indexOf("})();", iifeStart);
assert.ok(iifeEnd > iifeStart, "IIFE end not found");
const iifeSrc = html.slice(iifeStart, iifeEnd + "})();".length);

// Fake window + evaluate.
const fakeWindow = {};
const fn = new Function("window", iifeSrc + "; return window.cuOmCipherDisplay;");
const cuOmCipherDisplay = fn(fakeWindow);
assert.equal(typeof cuOmCipherDisplay, "function", "bridge must export cuOmCipherDisplay");

let passed = 0, failed = 0;
function test(name, body) {
  try { body(); console.log("  ✓", name); passed++; }
  catch (e) { console.error("  ✗", name, "\n   ", e.stack || e.message); failed++; }
}

console.log("om_cipher studio bridge — flag gating");

test("returns null when CU_OM_CIPHER_ENABLED is unset", () => {
  fakeWindow.CU_OM_CIPHER_ENABLED = false;
  const r = cuOmCipherDisplay({ birthdate: "1988-04-23", compass: { work: { gk_num: "34", gk_line: "5" } } });
  assert.equal(r, null);
});

test("returns label when flag is on", () => {
  fakeWindow.CU_OM_CIPHER_ENABLED = true;
  fakeWindow.CU_BHRAMARI_CAPTURE_ENABLED = false;
  const r = cuOmCipherDisplay({
    birthdate: "1988-04-23",
    compass: { work: { gk_num: "34", gk_line: "5" } },
    frequency_signature: { dominant_hz: 136.1 },
  });
  assert.equal(r.digital_root, 8);
  assert.equal(r.gk_primary.gate, 34);
  assert.equal(r.gk_primary.line, 5);
  assert.equal(r.gk_primary.label, "Fixer");
  assert.equal(r.bhramari_semitone, null, "Bhramari off → no semitone");
  assert.ok(r.label.includes("Root 8"));
  assert.ok(r.label.includes("Gate 34.5"));
  assert.ok(!r.label.includes("Resonance"));
});

test("includes semitone when Bhramari flag is on and dominant_hz present", () => {
  fakeWindow.CU_OM_CIPHER_ENABLED = true;
  fakeWindow.CU_BHRAMARI_CAPTURE_ENABLED = true;
  const r = cuOmCipherDisplay({
    birthdate: "1988-04-23",
    compass: { work: { gk_num: "34", gk_line: "5" } },
    frequency_signature: { dominant_hz: 136.1 },
  });
  assert.equal(r.bhramari_semitone, "C#3");
  assert.ok(r.label.includes("Resonance C#3"));
});

test("graceful fallback: no compass, no Bhramari → still derives root", () => {
  fakeWindow.CU_OM_CIPHER_ENABLED = true;
  fakeWindow.CU_BHRAMARI_CAPTURE_ENABLED = true;
  const r = cuOmCipherDisplay({ birthdate: "1988-04-23" });
  assert.equal(r.digital_root, 8);
  assert.equal(r.gk_primary, null);
  assert.equal(r.label, "Root 8");
});

test("graceful fallback: empty payload → null", () => {
  fakeWindow.CU_OM_CIPHER_ENABLED = true;
  const r = cuOmCipherDisplay({});
  assert.equal(r, null);
});

test("preserves master numbers (11/22/33)", () => {
  fakeWindow.CU_OM_CIPHER_ENABLED = true;
  fakeWindow.CU_BHRAMARI_CAPTURE_ENABLED = false;
  // 2000-09-09 → 2+0+0+0+0+9+0+9 = 20 → 2 (sanity check)
  // 1965-03-17 → 1+9+6+5+0+3+1+7 = 32 → 5
  // Construct one that hits 29 → 11:
  const r = cuOmCipherDisplay({ birthdate: "9909-09-02" }); // 9+9+0+9+0+9+0+2 = 38 → 11
  assert.equal(r.digital_root, 11);
});

console.log("\n" + (failed === 0 ? "✅ all passed" : "❌ " + failed + " failed") +
  ` (${passed} passed, ${failed} failed)`);
if (failed > 0) process.exit(1);
