// Studio sigil wiring — smoke test (Phase 1 deferred wiring).
//
// Asserts:
//   1. studio.html exposes a browser-safe window.cuSigil engine with
//      encodeSigilSeed + renderSigilSVG.
//   2. The inline engine produces a byte-identical seed and a
//      whitespace-equivalent SVG to the canonical sdk/sigil.js for the
//      same input contract Studio sends via cuBuildPublishPayload()
//      (display_name / full_name / birthdate / gene_keys / compass /
//      frequency_signature.* / seed_syllable). This is what guarantees
//      the same identity renders the same sigil in Studio Living Profile
//      preview, the cOMmons cover, and the cOMmons Profile.
//   3. renderLivingProfile() invokes window.cuRenderSigilSlots(...) so
//      the .lp-hero-slot.is-sigil placeholder is actually filled.
//   4. cuBuildPublishPayload still ships the input fields the engine
//      depends on — guarding against silent payload drift.
//
// Usage:  node tests/studio-sigil-wiring.test.js
'use strict';

const fs   = require('fs');
const path = require('path');
const assert = require('node:assert/strict');

const studioPath = path.resolve(__dirname, '..', 'studio.html');
const html = fs.readFileSync(studioPath, 'utf8');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  ✓ ' + name); passed++; }
  catch (e) { console.error('  ✗ ' + name + '\n    ' + e.message); failed++; }
}

console.log('studio sigil wiring');

// ─── 1. Inline engine + helpers are present ────────────────────────────
test('studio.html defines window.cuSigil with the canonical surface', () => {
  assert.ok(html.includes('window.cuSigil = {'),
    'window.cuSigil assignment missing — inline engine not exposed');
  assert.ok(/encodeSigilSeed\s*:\s*encodeSigilSeed/.test(html),
    'cuSigil.encodeSigilSeed not exported');
  assert.ok(/renderSigilSVG\s*:\s*renderSigilSVG/.test(html),
    'cuSigil.renderSigilSVG not exported');
});

test('studio.html defines cuRenderSigilSlots and cuSigilSeedFromPayload', () => {
  assert.ok(/function cuRenderSigilSlots\(/.test(html),
    'cuRenderSigilSlots not defined');
  assert.ok(/function cuSigilSeedFromPayload\(/.test(html),
    'cuSigilSeedFromPayload not defined');
  assert.ok(/window\.cuRenderSigilSlots\s*=\s*cuRenderSigilSlots/.test(html),
    'cuRenderSigilSlots not exposed on window');
});

// ─── 2. renderLivingProfile actually calls into the engine ─────────────
test('renderLivingProfile() invokes cuRenderSigilSlots after painting', () => {
  const rlpStart = html.indexOf('function renderLivingProfile()');
  assert.ok(rlpStart > -1, 'renderLivingProfile not found');
  // The next function declaration ends the body; use a generous slice.
  const rlpSlice = html.slice(rlpStart, rlpStart + 60000);
  const innerHtmlIdx = rlpSlice.indexOf('lpBody.innerHTML = html');
  assert.ok(innerHtmlIdx > -1, 'lpBody.innerHTML assignment not found inside renderLivingProfile');
  const tail = rlpSlice.slice(innerHtmlIdx);
  assert.ok(/cuRenderSigilSlots\s*\(/.test(tail),
    'cuRenderSigilSlots is not called after lpBody.innerHTML assignment');
});

// ─── 3. Payload contract still carries every field the engine needs ────
test('cuBuildPublishPayload still ships sigil-input fields', () => {
  const pStart = html.indexOf('function cuBuildPublishPayload()');
  assert.ok(pStart > -1, 'cuBuildPublishPayload not found');
  const pSlice = html.slice(pStart, pStart + 4000);
  // The engine depends on these exact keys.
  for (const key of ['display_name', 'full_name', 'birthdate', 'gene_keys',
                     'compass', 'frequency_signature', 'seed_syllable']) {
    assert.ok(pSlice.includes(key + ':') || pSlice.includes('"' + key + '"') || pSlice.includes("'" + key + "'"),
      'publish payload no longer carries ' + key);
  }
});

// ─── 4. Inline engine == canonical sdk/sigil.js (modulo whitespace) ────
test('inline engine produces seed/SVG identical to sdk/sigil.js', () => {
  const start = html.indexOf('// ── Browser-safe Sigil engine');
  const end   = html.indexOf('function cuBuildPublishPayload()', start);
  assert.ok(start > -1 && end > start, 'inline engine block not locatable by markers');
  const snippet = html.slice(start, end);
  const win = {};
  // eslint-disable-next-line no-new-func
  new Function('window', snippet)(win);
  assert.ok(win.cuSigil, 'cuSigil not attached to window after eval');

  const canonical = require('../sdk/sigil.js');
  const input = {
    display_name: 'Vesna Lucca',
    full_name:    'Vesna Lucca',
    birthdate:    '1979-04-05',
    gene_keys:    { life_work: 'GK 5.5' },
    compass: {
      work:  { gk_num: '5',  gk_line: '5' },
      lens:  { gk_num: '32', gk_line: '3' },
      field: { gk_num: '45', gk_line: '4' },
      call:  { gk_num: '23', gk_line: '1' }
    },
    tone: { tonal_center: 'C', dominant_hz: 528, seed_syllable: 'Om' }
  };
  const inlineSeed    = win.cuSigil.encodeSigilSeed(input);
  const canonicalSeed = canonical.encodeSigilSeed(input);
  assert.equal(JSON.stringify(inlineSeed), JSON.stringify(canonicalSeed),
    'inline seed differs from canonical seed');

  // SVGs may differ only in whitespace between tags (the canonical engine
  // uses a template literal with newlines; we use string concat).
  const norm = s => s.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();
  const a = norm(win.cuSigil.renderSigilSVG(inlineSeed, { size: 128 }));
  const b = norm(canonical.renderSigilSVG(canonicalSeed, { size: 128 }));
  assert.equal(a, b, 'inline SVG diverges from canonical SVG (after whitespace normalization)');
});

// ─── 5. Determinism — same input twice → same output ───────────────────
test('inline engine is deterministic across calls', () => {
  const start = html.indexOf('// ── Browser-safe Sigil engine');
  const end   = html.indexOf('function cuBuildPublishPayload()', start);
  const snippet = html.slice(start, end);
  const win = {};
  new Function('window', snippet)(win);
  const input = {
    display_name: 'Eda Çarmıklı', full_name: 'Eda Çarmıklı', birthdate: '1985-06-21',
    gene_keys: {},
    compass: { work: { gk_num: '45' }, lens: { gk_num: '26' }, field: { gk_num: '22' }, call: { gk_num: '47' } },
    tone: { dominant_hz: 396, seed_syllable: 'Om' }
  };
  const s1 = win.cuSigil.encodeSigilSeed(input);
  const s2 = win.cuSigil.encodeSigilSeed(input);
  assert.equal(JSON.stringify(s1), JSON.stringify(s2), 'seed encoding non-deterministic');
  const svg1 = win.cuSigil.renderSigilSVG(s1, { size: 256 });
  const svg2 = win.cuSigil.renderSigilSVG(s2, { size: 256 });
  assert.equal(svg1, svg2, 'SVG render non-deterministic');
});

// ─── 6. Static smoke check — inline scripts parse cleanly ──────────────
test('all inline <script> blocks in studio.html parse', () => {
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  let m, n = 0, errors = [];
  while ((m = re.exec(html)) !== null) {
    n++;
    try { new Function(m[1]); }
    catch (e) { errors.push('script #' + n + ': ' + e.message); }
  }
  assert.equal(errors.length, 0, 'parse errors: ' + errors.join('; '));
  assert.ok(n >= 1, 'no inline script blocks found');
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
