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

// ─── 7. renderWebsitePreview also fills the home/room sigil slots ──────
// Bug from user-report (post-9157897): only the Living Profile preview
// was wired. The Personal Home / Website Preview paints its own
// .lp-hero-slot.is-sigil placeholders (✦ for home, ॐ per room) and was
// silently leaving them as glyphs after JSON import. Guard against
// regressions: every render path that injects an is-sigil slot must
// follow up with a cuRenderSigilSlots call.
test('renderWebsitePreview() invokes cuRenderSigilSlots after painting', () => {
  const start = html.indexOf('function renderWebsitePreview()');
  assert.ok(start > -1, 'renderWebsitePreview not found');
  const slice = html.slice(start, start + 60000);
  const innerIdx = slice.indexOf('wpBody.innerHTML = html');
  assert.ok(innerIdx > -1, 'wpBody.innerHTML assignment not found inside renderWebsitePreview');
  const tail = slice.slice(innerIdx);
  assert.ok(/cuRenderSigilSlots\s*\(/.test(tail),
    'cuRenderSigilSlots is not called after wpBody.innerHTML assignment — ' +
    'home/room sigil slots will stay as ✦/ॐ placeholders');
});

// ─── 8. window.cuBuildPublishPayload is exposed ────────────────────────
// The render wiring lives in callbacks that may execute before/after
// the function declarations are hoisted into scope (separate event
// listeners, async modal openers). Going through window.* is the
// robust access pattern; the bare identifier is a fallback only.
test('cuBuildPublishPayload is exposed on window', () => {
  assert.ok(/window\.cuBuildPublishPayload\s*=\s*cuBuildPublishPayload/.test(html),
    'cuBuildPublishPayload not exposed on window — preview render paths ' +
    'in other scopes (modal handlers, late callbacks) cannot reach it');
});

// ─── 9. Every is-sigil paint has a render hook in the same function ────
// Generic guard: scan every function body that injects the
// `.lp-hero-slot is-sigil` markup into a body element via .innerHTML,
// and assert that cuRenderSigilSlots is called in that function. This
// is what would have caught the original Personal Home regression
// directly, rather than relying on per-function tests above.
test('every render fn painting is-sigil also calls cuRenderSigilSlots', () => {
  // Find all the render functions that touch .innerHTML on a *Body
  // element. studio.html keeps these to a small, named set.
  const renderFns = [
    { name: 'renderLivingProfile',  bodyVar: 'lpBody' },
    { name: 'renderWebsitePreview', bodyVar: 'wpBody' },
  ];
  for (const r of renderFns) {
    const start = html.indexOf('function ' + r.name + '(');
    assert.ok(start > -1, r.name + ' not found');
    // Heuristic: function ends at the next "    function " at column 4
    // (matches the indentation of sibling top-level fns in this script).
    const rest = html.slice(start + 1);
    const nextFn = rest.search(/\n {4}function \w+\(/);
    const body = nextFn > -1 ? html.slice(start, start + 1 + nextFn) : html.slice(start, start + 60000);
    const hasSlotPaint = body.includes('lp-hero-slot is-sigil') ||
      /querySelector[^\n]*lp-hero-slot[^\n]*is-sigil/.test(body) ||
      // phRenderThreshold / phRenderRoom paint into wpBody indirectly;
      // accept the wpBody.innerHTML assignment as evidence of paint.
      /(?:lpBody|wpBody)\.innerHTML\s*=/.test(body);
    if (!hasSlotPaint) continue;
    assert.ok(/cuRenderSigilSlots\s*\(/.test(body),
      r.name + '() paints an is-sigil slot (directly or via inner renderer) ' +
      'but never calls cuRenderSigilSlots — placeholder will not be replaced');
  }
});

// ─── 10. End-to-end DOM render exercises the user's scenario ───────────
// Eval the engine + helpers + payload builder, feed them the same
// Compass JSON shape that loaded in the user's session, and verify
// that cuRenderSigilSlots actually fills a real DOM-like element with
// SVG markup and the cu-sigil-rendered class. This is the regression
// guard for the user-reported "sigil populates with nothing" symptom:
// the placeholder must be replaced by a non-trivial <svg> element.
test('cuRenderSigilSlots end-to-end: fills slot with svg from a Compass payload', () => {
  // Extract engine + helper functions + payload builder from studio.html.
  const engineStart = html.indexOf('// ── Browser-safe Sigil engine');
  const helpersStart = html.indexOf('function cuSigilSeedFromPayload(payload)');
  // End just before the window.cuBuildPublishPayload assignment line;
  // anchor the search after helpersStart so we don't pick up a
  // typeof-guard reference that appears earlier in the file.
  const buildEnd = html.indexOf('window.cuBuildPublishPayload = cuBuildPublishPayload',
    helpersStart);
  assert.ok(engineStart > -1 && helpersStart > -1 && buildEnd > -1,
    'engine / helpers / payload builder markers not all locatable');
  const engineSrc  = html.slice(engineStart, helpersStart);
  const helpersSrc = html.slice(helpersStart, buildEnd);

  // Minimal compass session shape (the fields the engine cares about).
  const compass = {
    companion: 'Markus',
    points: {
      work:  { gk_num: '14', gk_line: '' },
      lens:  { gk_num: '8',  gk_line: '' },
      field: { gk_num: '29', gk_line: '' },
      call:  { gk_num: '30', gk_line: '' }
    },
    profile: {
      first_name: 'Markus',
      full_name:  'Markus',
      birthdate:  '1973-11-18',
      gene_keys:  { life_work: 'GK 14' }
    },
    seed_syllable: 'Om',
  };

  const win = { state: { compassData: compass } };
  // Stub buildLivingProfile — the payload builder only reads .tagline/.essence.
  const stubBLP = function () { return { tagline: null, essence: null }; };

  // Engine self-attaches to window.cuSigil.
  new Function('window', engineSrc)(win);
  assert.ok(win.cuSigil, 'engine did not attach to window.cuSigil');

  const exposer = helpersSrc +
    '\nreturn { cuBuildPublishPayload, cuSigilSeedFromPayload, cuRenderSigilSlots };';
  const api = new Function('window', 'buildLivingProfile', exposer)(win, stubBLP);

  const payload = api.cuBuildPublishPayload();
  assert.equal(payload.display_name, 'Markus', 'payload display_name lost');
  assert.equal(payload.birthdate, '1973-11-18', 'payload birthdate lost');
  assert.ok(payload.compass && payload.compass.work && payload.compass.work.gk_num === '14',
    'payload compass.work.gk_num lost');

  const seed = api.cuSigilSeedFromPayload(payload);
  assert.ok(seed, 'seed encoding returned null for a valid payload');
  assert.ok(Array.isArray(seed.gates) && seed.gates.length >= 4,
    'seed has fewer than 4 gates — compass points did not flow into the seed');

  // Fake a DOM with one is-sigil slot + one has-image slot. The
  // has-image slot must be skipped (image owns the visual); the bare
  // sigil slot must be filled with SVG markup and tagged
  // cu-sigil-rendered. This mirrors the live behaviour exactly.
  const sigilSlot = makeFakeSlot();
  const imageSlot = makeFakeSlot({ classes: ['has-image'] });
  const root = {
    querySelectorAll(sel) {
      assert.equal(sel, '.lp-hero-slot.is-sigil',
        'cuRenderSigilSlots queried unexpected selector: ' + sel);
      return [sigilSlot, imageSlot];
    }
  };

  api.cuRenderSigilSlots(payload, root);

  assert.ok(sigilSlot.innerHTML.length > 200,
    'sigil slot innerHTML is empty or trivially small (got ' +
    sigilSlot.innerHTML.length + ' chars) — placeholder was not replaced');
  assert.ok(/<svg[\s>]/.test(sigilSlot.innerHTML),
    'sigil slot innerHTML contains no <svg> element');
  assert.ok(sigilSlot.classList._set.has('cu-sigil-rendered'),
    'sigil slot did not get the cu-sigil-rendered class — CSS will not unhide the SVG');
  assert.equal(imageSlot.innerHTML, '',
    'has-image slot was overwritten — sigil engine should defer to uploaded image');

  function makeFakeSlot(opts) {
    opts = opts || {};
    const initial = new Set(opts.classes || []);
    return {
      classList: {
        _set: initial,
        contains(c) { return this._set.has(c); },
        add(c) { this._set.add(c); }
      },
      innerHTML: '',
      _attrs: {},
      setAttribute(k, v) { this._attrs[k] = v; }
    };
  }
});

// ─── 11. JSON import refreshes any already-open preview modal ──────────
// The user's reported scenario: open Studio → open Living Profile (or
// Personal Home) → import Compass JSON. Before the fix the modal kept
// the pre-import placeholder; the fix re-invokes open*Modal() so the
// sigil paints against the freshly-loaded compassData.
test('processCompassImport re-opens any open preview modal after import', () => {
  const start = html.indexOf('function processCompassImport(');
  assert.ok(start > -1, 'processCompassImport not found');
  const slice = html.slice(start, start + 4000);
  assert.ok(/getElementById\(['"]living-profile-modal['"]\)/.test(slice) &&
            /window\.openLivingProfile\s*\(\s*\)/.test(slice),
    'processCompassImport does not re-open Living Profile when it was already open');
  assert.ok(/getElementById\(['"]website-preview-modal['"]\)/.test(slice) &&
            /window\.openWebsitePreview\s*\(\s*\)/.test(slice),
    'processCompassImport does not re-open Website Preview when it was already open');
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
