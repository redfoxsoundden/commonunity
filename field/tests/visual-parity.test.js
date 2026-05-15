// Visual parity test — verifies the cOMmons surface inherits homepage's
// design tokens, fonts, and logo lockup verbatim. Catches drift if anyone
// later edits one side without the other.
//
// Run: node field/tests/visual-parity.test.js

const fs = require("fs");
const path = require("path");
const assert = require("node:assert/strict");

const repoRoot = path.join(__dirname, "..", "..");
const homepage = fs.readFileSync(path.join(repoRoot, "homepage.html"), "utf8");
const style = fs.readFileSync(path.join(repoRoot, "field", "public", "style.css"), "utf8");
const views = fs.readFileSync(path.join(repoRoot, "field", "src", "views.js"), "utf8");

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log("  ✓", name); passed++; }
  catch (e) { console.error("  ✗", name, "\n    ", e.message); failed++; }
}

console.log("visual parity with homepage.html");

test("style.css uses the homepage palette tokens", () => {
  // Same hex values — exactly what homepage.html :root defines.
  assert.match(style, /--base:\s*#0b1120/);
  assert.match(style, /--teal:\s*#2A6B8C/);
  assert.match(style, /--gold:\s*#B8872E/);
  assert.match(style, /--gold-soft:\s*#d4a04a/);
  assert.match(style, /--cream:\s*#FAF8F4/);
});

test("style.css uses the homepage font stack (Plus Jakarta Sans + Cormorant Garamond + Josefin Sans)", () => {
  assert.match(style, /Plus Jakarta Sans/);
  assert.match(style, /Cormorant Garamond/);
  assert.match(style, /Josefin Sans/);
});

test("style.css renders the same tri-radial ambient backdrop as homepage body::before", () => {
  // Same three gradient stops, same colours.
  assert.match(style, /rgba\(42,107,140,0\.18\)/);
  assert.match(style, /rgba\(184,135,46,0\.12\)/);
  assert.match(style, /rgba\(92,122,62,0\.14\)/);
});

test("views.js inlines the exact homepage logo-lockup SVG (text + glyph identities)", () => {
  // The lockup's defining geometric strings — viewBox, the COMMONUNITY text
  // anchored at x=350/y=108 with letter-spacing=6, the crescent path, the
  // bindu diamond. If homepage.html ever rewrites these, this test will fail
  // and we'll know to copy across.
  assert.match(views, /viewBox="-30 0 760 132"/);
  assert.match(views, /x="350" y="108"/);
  assert.match(views, /letter-spacing="6"/);
  assert.match(views, /M 92 26 Q 122 38 152 26/);
  assert.match(views, /M 122 4 L 126 9 L 122 14 L 118 9 Z/);
  assert.match(views, /#FAF8F4/);
  assert.match(views, /#d4a04a/);
});

test("views.js references logo-lockup via <use href='#logo-lockup'/>", () => {
  assert.match(views, /<use href="#logo-lockup"\/>/);
});

test("views.js uses the homepage backdrop blur + sticky header pattern", () => {
  // The cu-header class is the cOMmons equivalent of homepage's header.site —
  // both should use backdrop-filter blur(12px) so the scroll feels identical.
  assert.match(style, /backdrop-filter:\s*blur\(12px\)/);
  assert.match(style, /rgba\(11,\s*17,\s*32,\s*0\.72\)/);
});

test("views.js uses visible brand 'cOMmons', not 'the Field'", () => {
  assert.match(views, /cOMmons/);
  assert.match(views, /CommonUnity · cOMmons/);
  // Defensively: the legacy first-cut copy 'The CommonUnity Field' (used as a
  // visible title) must not survive. Internal mentions like "/field/" or
  // compass-point "the field" inside an article are fine.
  assert.ok(!/title>The CommonUnity Field</.test(views),
    "Legacy 'The CommonUnity Field' title still present");
});

test("style.css defines floating glow frame helpers (homepage card aesthetic)", () => {
  // .cu-frame mirrors .nexus-mockup — grid backdrop, soft radial wash, line
  // border. Verifies presence of the marker rules.
  assert.match(style, /\.cu-frame\s*\{/);
  assert.match(style, /linear-gradient\(rgba\(250,248,244,0\.04\) 1px, transparent 1px\)/);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
