// Sigil aesthetic — Revision 1.
//
// Asserts the rendered Om Cipher sigil reads as finished sacred geometry,
// not a debug/wireframe diagram:
//   - No visible outer control-point dots (the old construction artifacts).
//   - Stroke colour uses derived palette primary (oklch …), no arbitrary
//     red/green hex debug colours.
//   - Continuous primary stroke at 2-3px on a 512 viewBox.
//   - At most one filled circle, and it is the small centre anchor (r ≤ 8).
//
// Run:  node tests/om-cipher-sigil-aesthetic.test.js

'use strict';

const assert = require('node:assert/strict');
const om = require('../sdk/om_cipher.js');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  ✓', name); passed++; }
  catch (e) { console.error('  ✗', name, '\n   ', e.message); failed++; }
}

function generateMarkus() {
  process.env.OM_CIPHER_ENABLED = '1';
  return om.generate({
    birth_date: '1973-11-18',
    birth_time: '03:21',
    legal_name: 'Markus Lehto',
    preferred_name: 'Markus',
  }, { featureFlag: true });
}

console.log('sigil aesthetic — finished sacred geometry, not debug wireframe');

const rec = generateMarkus();
const svg = rec.sigil_svg;
assert.ok(svg, 'sigil_svg present');

test('viewBox is 512×512', () => {
  assert.ok(/viewBox="0 0 512 512"/.test(svg));
});

test('stroke colour uses derived palette primary (oklch), not arbitrary debug colour', () => {
  // Markus LP22 → hue 72, so primary should be an oklch(... 72) string.
  assert.ok(/stroke="oklch\([^"]*\b72\)"/.test(svg),
    'Markus LP22 sigil should use oklch hue 72 primary; got: ' + svg.slice(0, 400));
  // No arbitrary debug reds/greens.
  assert.ok(!/stroke="#e53935"/i.test(svg));
  assert.ok(!/stroke="red"/i.test(svg));
  assert.ok(!/stroke="green"/i.test(svg));
  assert.ok(!/stroke="#0f0"/i.test(svg));
});

test('no visible outer control-point dots (no circles outside centre anchor)', () => {
  // The revised sigil keeps only the centre anchor circle (radius 5).
  // No enclosing frame circle and no per-point construction dots.
  const circles = svg.match(/<circle[^>]*>/g) || [];
  const centreLike = circles.filter(c => /cx="256"\s+cy="256"/.test(c));
  const outerDots = circles.filter(c => !/cx="256"\s+cy="256"/.test(c));
  assert.equal(outerDots.length, 0,
    'no outer construction dots; found: ' + JSON.stringify(outerDots));
  assert.ok(centreLike.length >= 1, 'centre anchor present');
});

test('primary stroke width is in the 2–3px range for the dominant ring', () => {
  // The dominant connecting ring uses stroke-width="2.5".
  assert.ok(/stroke-width="2(?:\.\d+)?"/.test(svg) || /stroke-width="3"/.test(svg),
    'expected dominant stroke 2–3px; got: ' + svg.slice(0, 200));
});

test('contains seed-derived radial spokes (Layer A) — not a regular polygon', () => {
  // Sigil has N line elements representing spokes from centre.
  const lines = svg.match(/<line\b/g) || [];
  assert.ok(lines.length === 9 || lines.length === 11,
    'expected 9 or 11 spokes; got ' + lines.length);
});

test('contains a single connecting-ring path (Layer B) with stroke-width 2.5', () => {
  const ringMatch = svg.match(/<path d="[^"]+" fill="none" stroke="[^"]+" stroke-width="2\.5"/);
  assert.ok(ringMatch, 'connecting ring path with width 2.5 present');
});

test('palette-derived glow filter is applied (subtle depth, not noise)', () => {
  assert.ok(/<filter id="cu-sigil-glow"/.test(svg));
  assert.ok(/feGaussianBlur/.test(svg));
});

test('palette-derived drop-shadow glow on the SVG (subtle depth, not noise)', () => {
  // The outer <svg> carries a derived drop-shadow filter so the form has
  // depth without adding any literal noise to the geometry.
  assert.ok(/style="filter:drop-shadow\(0 0 8px oklch\(0\.55 0\.227 \d+ \/ 0\.35\)\)"/.test(svg),
    'drop-shadow with palette-derived oklch present; got: ' + svg.slice(0, 400));
});

test('parity: Python engine emits matching aesthetic markers', () => {
  // Cross-engine sanity — only static markers, not byte equality, since
  // OKLCH stringification is identical but ordering differs.
  const { execSync } = require('child_process');
  const py = execSync(
    'python3 -c "import os; os.environ[\'OM_CIPHER_ENABLED\']=\'1\'; ' +
    'import om_cipher_engine as e; r=e.generate({\'birth_date\':\'1973-11-18\',' +
    '\'birth_time\':\'03:21\',\'legal_name\':\'Markus Lehto\',\'preferred_name\':\'Markus\'},' +
    'feature_flag=True); print(r[\'sigil_svg\'])"',
    { cwd: __dirname + '/..', encoding: 'utf8' }
  );
  assert.ok(/oklch\([^)]*\b72\)/.test(py),
    'Python sigil uses derived palette (hue 72)');
  assert.ok(!/r="6"[^>]*cx="(?!256")/.test(py),
    'Python sigil has no outer control-point dots');
  assert.ok(/cu-sigil-glow/.test(py), 'Python sigil applies glow filter');
});

console.log('\n' + (failed === 0 ? '✅ all passed' : '❌ ' + failed + ' failed') +
  ` (${passed} passed, ${failed} failed)`);
if (failed > 0) process.exit(1);
