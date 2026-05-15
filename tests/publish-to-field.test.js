/* Publish to cOMmons — Studio integration test (Phase 1 / Mi→Fa)
 *
 * Guards:
 *   1. The hero-under CTA toolbar (lp-top-cta) renders a "Publish to cOMmons"
 *      button with id="lp-publish-field" (id stable for backward compat).
 *   2. window.publishToField is defined in the inline script.
 *   3. The Mi→Fa OM-veil holder (cuMountOmVeil / cuHoldOmThen) uses the
 *      shared #cu-logo-lockup symbol so the held moment belongs to the
 *      same visual world as the homepage / studio.
 *   4. The publisher POSTs to /field-api/profile with credentials.
 *   5. Visible copy says "cOMmons", not "Field" (the visible-brand rename
 *      Markus asked for — file paths and API routes stay /field for now).
 *
 * Usage:  node tests/publish-to-field.test.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '..', 'studio.html'), 'utf8');

let failed = 0;
function pass(m) { console.log('  ok  ' + m); }
function fail(m) { console.error('  FAIL ' + m); failed++; }

if (src.indexOf("id=\"lp-publish-field\"") === -1 && src.indexOf("id='lp-publish-field'") === -1) {
  fail('Publish to Field button (id="lp-publish-field") not rendered in hero-under CTA toolbar');
} else {
  pass('Publish to Field button rendered');
}

// The button must live inside the JS-built lp-top-cta section, not Studio Door.
// Find the JS string occurrence (the renderer builds the HTML via string concat).
const jsRenderIdx = src.indexOf('html += \'<section class="lp-top-cta"');
const rowEnd = jsRenderIdx >= 0 ? src.indexOf("'</section>'", jsRenderIdx) : -1;
const rowSlice = jsRenderIdx >= 0 && rowEnd > jsRenderIdx ? src.slice(jsRenderIdx, rowEnd) : '';
if (!/lp-publish-field/.test(rowSlice)) {
  fail('Publish to Field is not anchored to the hero-under CTA toolbar (lp-top-cta)');
} else {
  pass('Publish to Field anchored to the lp-top-cta toolbar');
}

if (!/window\.publishToField\s*=/.test(src)) {
  fail('window.publishToField is not defined');
} else {
  pass('window.publishToField defined');
}

if (!/cuMountOmVeil|cu-om-veil/.test(src)) {
  fail('OM-veil holder for the Mi→Fa moment is missing');
} else {
  pass('Mi→Fa OM-veil holder present');
}

if (!/cuPlayOmTone|AudioContext/.test(src)) {
  fail('OM tone (sound-forward, per spec §4.3) is missing');
} else {
  pass('OM tone playback present');
}

if (!/\/field-api\/profile/.test(src)) {
  fail('Publish does not POST to /field-api/profile');
} else {
  pass('Publish POSTs to /field-api/profile');
}

if (!/credentials:\s*['"]include['"]/.test(src)) {
  fail('Publish fetch is missing credentials: "include" for cross-origin Studio→Field session');
} else {
  pass('Publish fetch sends credentials');
}

// Anti-addiction: the publish CTA must not surface counts/metrics.
if (/Publish.*\d+\s*(attunements|likes|followers)/i.test(src)) {
  fail('Publish UI surfaces a count — anti-addiction guardrail violated');
} else {
  pass('Publish UI surfaces no counts (anti-addiction guardrail)');
}

// Visible brand label uses "cOMmons", not the old "Publish to Field" string.
if (!/Publish to cOMmons/.test(src)) {
  fail('Publish button label must say "Publish to cOMmons" (visible brand rename)');
} else {
  pass('Publish button label uses "cOMmons" brand');
}

// The held OM moment must use the shared homepage/studio lockup, not the
// literal ॐ glyph from the first cut.
const veilSliceStart = src.indexOf('cuMountOmVeil');
const veilSliceEnd = src.indexOf('cuPlayOmTone', veilSliceStart);
const veilSlice = veilSliceStart >= 0 ? src.slice(veilSliceStart, veilSliceEnd > 0 ? veilSliceEnd : veilSliceStart + 4000) : '';
if (!/#cu-logo-lockup/.test(veilSlice)) {
  fail('OM veil must reuse the shared #cu-logo-lockup symbol (homepage parity)');
} else {
  pass('OM veil uses the shared CommonUnity lockup');
}

if (failed) { console.error('\n' + failed + ' test(s) failed'); process.exit(1); }
console.log('\nAll publish-to-cOMmons tests passed.');
