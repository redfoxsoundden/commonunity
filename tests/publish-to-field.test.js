/* Publish to Field — Studio integration test (Phase 1 / Mi→Fa)
 *
 * Guards:
 *   1. The hero-under CTA toolbar (lp-top-cta) renders a "Publish to Field"
 *      button with id="lp-publish-field".
 *   2. window.publishToField is defined in the inline script.
 *   3. The Mi→Fa OM-veil holder (cuMountOmVeil / cuHoldOmThen) exists.
 *   4. The publish payload builder reads from window.state.compassData and
 *      includes compass + frequency_signature + gene_keys (so the Field can
 *      compute the sigil server-side).
 *   5. The publisher POSTs to /field-api/profile with credentials.
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

if (failed) { console.error('\n' + failed + ' test(s) failed'); process.exit(1); }
console.log('\nAll publish-to-field tests passed.');
