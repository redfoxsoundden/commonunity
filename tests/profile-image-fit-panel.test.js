/* Regression test: Studio profile image Adjust panel must remain open
 * while the user drags the X/Y/Zoom range sliders.
 *
 * The earlier bug closed the panel mid-drag because the slider `input`
 * handler called the wrapped window.setProfileImageFit (which triggers
 * refreshIdentityMediaSurfaces() and re-renders the host surface,
 * destroying the panel DOM). The fix calls the raw _setProfileImageFit
 * captured inside the IIFE so persistence happens without re-render.
 *
 * This test:
 *   1. Statically checks studio.html source for the regression pattern.
 *   2. Mounts a minimal DOM in jsdom that mirrors the live fit panel
 *      markup, wires it with the production logic, and simulates slider
 *      input — asserting the panel stays open and styles/state update.
 *
 * Usage:  node tests/profile-image-fit-panel.test.js
 * Deps:   jsdom (npm i jsdom)
 */
'use strict';

const fs = require('fs');
const path = require('path');

let JSDOM;
try { JSDOM = require('jsdom').JSDOM; }
catch (_) {
  try { JSDOM = require('/tmp/node_modules/jsdom').JSDOM; }
  catch (e) {
    console.error('jsdom not installed — run: npm i jsdom');
    process.exit(2);
  }
}

const studioPath = path.resolve(__dirname, '..', 'studio.html');
const src = fs.readFileSync(studioPath, 'utf8');

let failed = 0;
function pass(msg) { console.log('  ok  ' + msg); }
function fail(msg) { console.error('  FAIL ' + msg); failed++; }
function assert(cond, msg) { cond ? pass(msg) : fail(msg); }

// ---------------------------------------------------------------------------
// 1) Static guard: wireProfileImageFitControls' slider apply() MUST call the
// raw _setProfileImageFit, NOT the wrapped window.setProfileImageFit. If the
// wrapped one creeps back in, refreshIdentityMediaSurfaces() will re-render
// the host surface on every input event and tear down the panel.
// ---------------------------------------------------------------------------
console.log('static-source checks');

const wireFnMatch = src.match(/function wireProfileImageFitControls\(prefix\)\s*\{[\s\S]*?\n    \}\n/);
assert(!!wireFnMatch, 'found wireProfileImageFitControls in source');
const wireBody = wireFnMatch ? wireFnMatch[0] : '';

assert(/_setProfileImageFit\(fit\)/.test(wireBody),
  'apply() persists via raw _setProfileImageFit (not the re-rendering wrapper)');
// The wrapper at the bottom of the IIFE re-assigns window.setProfileImageFit;
// inside apply() we must NOT see a bare setProfileImageFit(fit) call that
// would resolve to the wrapper at runtime.
const applyBlock = wireBody.match(/function apply\(\) \{[\s\S]*?\n      \}\n/);
assert(!!applyBlock, 'found apply() inside wiring function');
if (applyBlock) {
  assert(!/[^_]setProfileImageFit\(/.test(applyBlock[0]),
    'apply() does not call the bare/wrapped setProfileImageFit');
}

// The wrapper itself must still exist (panel Done / external setFit callers
// rely on refresh behavior).
assert(/window\.setProfileImageFit = function/.test(src),
  'window.setProfileImageFit wrapper still in place for external callers');
assert(/var _setProfileImageFit = setProfileImageFit;/.test(src),
  'raw setter captured into _setProfileImageFit');

// ---------------------------------------------------------------------------
// 2) Dynamic test: mount a minimal DOM that mirrors the live fit panel
// markup, plus a stub for refreshIdentityMediaSurfaces() that nukes the
// panel if called (simulating the original bug's blast radius). The wiring
// extracted from studio.html should NOT trigger that stub on slider input.
// ---------------------------------------------------------------------------
console.log('\ndynamic DOM simulation');

const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
const win = dom.window;
const doc = win.document;

// --- State helpers (mirroring studio.html lines ~6450–6530) ---
const state = { identityMedia: { profileImage: { src: 'data:image/png;base64,AAA', fit: { x: 50, y: 50, zoom: 1 } } } };
function clampProfileImageFit(fit) {
  function n(v, d) { v = parseFloat(v); return Number.isFinite(v) ? v : d; }
  function c(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  fit = fit || {};
  return { x: c(n(fit.x, 50), 0, 100), y: c(n(fit.y, 50), 0, 100), zoom: c(n(fit.zoom, 1), 1, 3) };
}
function defaultProfileImageFit() { return { x: 50, y: 50, zoom: 1 }; }
function rawSetProfileImageFit(fit) {
  state.identityMedia.profileImage.fit = clampProfileImageFit(fit);
  return state.identityMedia.profileImage.fit;
}
function getProfileImageFit() { return clampProfileImageFit(state.identityMedia.profileImage.fit); }

// --- Wrapper that the bug routed through ---
let refreshCalls = 0;
function refreshIdentityMediaSurfaces() {
  refreshCalls++;
  // Simulate the real re-render: blow away the panel DOM, mimicking what
  // renderLivingProfile() does to its container.
  const wrap = doc.querySelector('.lp-hero-slot-wrap');
  if (wrap) wrap.innerHTML = '<div class="lp-hero-slot has-image"></div>';
}
function setProfileImageFitWrapped(fit) {
  const out = rawSetProfileImageFit(fit);
  refreshIdentityMediaSurfaces();
  return out;
}
// Mirror studio.html: window.setProfileImageFit gets the wrapper; the raw
// is kept in _setProfileImageFit.
const _setProfileImageFit = rawSetProfileImageFit;
win.setProfileImageFit = setProfileImageFitWrapped;
win.getProfileImageFit = getProfileImageFit;

// --- Fit panel markup matching renderProfileImageFitPanel / renderProfileImageSlot ---
function mountPanel(prefix) {
  doc.body.innerHTML =
    '<div class="lp-hero-slot-wrap">' +
      '<div class="lp-hero-slot has-image" title="Profile image" ' +
           'style="--lp-hero-img-x:50%;--lp-hero-img-y:50%;--lp-hero-img-zoom:1;">' +
        '<img class="lp-hero-slot-img" alt="Profile image" src="">' +
      '</div>' +
      '<div class="lp-id-controls">' +
        '<button type="button" id="' + prefix + '-profile-image-adjust" aria-expanded="false">Adjust</button>' +
      '</div>' +
      '<div class="lp-id-fit" id="' + prefix + '-profile-image-fit">' +
        '<div class="lp-id-fit-row"><label for="' + prefix + '-profile-image-fit-x">X</label>' +
          '<input type="range" id="' + prefix + '-profile-image-fit-x" min="0" max="100" step="1" value="50">' +
          '<span data-fit-val="x">50%</span></div>' +
        '<div class="lp-id-fit-row"><label for="' + prefix + '-profile-image-fit-y">Y</label>' +
          '<input type="range" id="' + prefix + '-profile-image-fit-y" min="0" max="100" step="1" value="50">' +
          '<span data-fit-val="y">50%</span></div>' +
        '<div class="lp-id-fit-row"><label for="' + prefix + '-profile-image-fit-zoom">Zoom</label>' +
          '<input type="range" id="' + prefix + '-profile-image-fit-zoom" min="1" max="3" step="0.05" value="1">' +
          '<span data-fit-val="zoom">1.00×</span></div>' +
        '<div class="lp-id-fit-actions">' +
          '<button type="button" id="' + prefix + '-profile-image-fit-reset">Reset</button>' +
          '<button type="button" id="' + prefix + '-profile-image-fit-done">Done</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

// --- Extract wireProfileImageFitControls from studio.html and eval it
// against our local helpers. We rewrite document → doc-bound to the jsdom.
const wireSource = (src.match(/function wireProfileImageFitControls\(prefix\) \{[\s\S]*?\n    \}\n/) || [''])[0];
assert(!!wireSource, 'extracted wireProfileImageFitControls source');

// Wrap into a factory that closes over the helpers it needs.
const factorySrc =
  'return (function (document, _setProfileImageFit, clampProfileImageFit, defaultProfileImageFit) {\n' +
  '  ' + wireSource.trim() + '\n' +
  '  return wireProfileImageFitControls;\n' +
  '});';
let wireProfileImageFitControls;
try {
  // eslint-disable-next-line no-new-func
  const factory = new Function(factorySrc)();
  wireProfileImageFitControls = factory(doc, _setProfileImageFit, clampProfileImageFit, defaultProfileImageFit);
  pass('extracted wiring function compiled');
} catch (e) {
  fail('extracted wiring failed to compile: ' + e.message);
}

function fireInput(el, value) {
  el.value = String(value);
  el.dispatchEvent(new win.Event('input',  { bubbles: true }));
}

function runScenario(prefix) {
  console.log('\n  scenario: ' + prefix);
  refreshCalls = 0;
  state.identityMedia.profileImage.fit = { x: 50, y: 50, zoom: 1 };
  mountPanel(prefix);
  wireProfileImageFitControls(prefix);

  const adjust = doc.getElementById(prefix + '-profile-image-adjust');
  const panel  = doc.getElementById(prefix + '-profile-image-fit');

  // Open via Adjust click
  adjust.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  assert(panel.classList.contains('is-open'), prefix + ': panel opens on Adjust click');
  assert(adjust.getAttribute('aria-expanded') === 'true', prefix + ': aria-expanded=true on open');

  const xIn = doc.getElementById(prefix + '-profile-image-fit-x');
  const yIn = doc.getElementById(prefix + '-profile-image-fit-y');
  const zIn = doc.getElementById(prefix + '-profile-image-fit-zoom');

  // Simulate dragging: pointer down then input events on each slider.
  xIn.dispatchEvent(new win.MouseEvent('pointerdown', { bubbles: true }));
  fireInput(xIn, 25);
  assert(panel.classList.contains('is-open'),  prefix + ': panel stays open after X input');
  fireInput(yIn, 70);
  assert(panel.classList.contains('is-open'),  prefix + ': panel stays open after Y input');
  fireInput(zIn, 1.5);
  assert(panel.classList.contains('is-open'),  prefix + ': panel stays open after Zoom input');

  // The wrapped setter (which would have re-rendered) must NOT have fired.
  assert(refreshCalls === 0, prefix + ': refreshIdentityMediaSurfaces NOT called during drag');

  // CSS vars updated live on the slot.
  const slot = doc.querySelector('.lp-hero-slot.has-image');
  assert(slot.style.getPropertyValue('--lp-hero-img-x').trim()    === '25%',
    prefix + ': --lp-hero-img-x updated live (got ' + slot.style.getPropertyValue('--lp-hero-img-x') + ')');
  assert(slot.style.getPropertyValue('--lp-hero-img-y').trim()    === '70%',
    prefix + ': --lp-hero-img-y updated live (got ' + slot.style.getPropertyValue('--lp-hero-img-y') + ')');
  assert(slot.style.getPropertyValue('--lp-hero-img-zoom').trim() === '1.5',
    prefix + ': --lp-hero-img-zoom updated live (got ' + slot.style.getPropertyValue('--lp-hero-img-zoom') + ')');

  // Numeric label readouts updated.
  assert(panel.querySelector('[data-fit-val="x"]').textContent    === '25%',  prefix + ': X label updated');
  assert(panel.querySelector('[data-fit-val="y"]').textContent    === '70%',  prefix + ': Y label updated');
  assert(panel.querySelector('[data-fit-val="zoom"]').textContent === '1.50×', prefix + ': Zoom label updated');

  // State persisted via raw setter.
  const fit = getProfileImageFit();
  assert(Math.round(fit.x) === 25 && Math.round(fit.y) === 70 && Math.abs(fit.zoom - 1.5) < 1e-6,
    prefix + ': state.identityMedia.profileImage.fit reflects slider values');

  // Done closes the panel.
  doc.getElementById(prefix + '-profile-image-fit-done').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  assert(!panel.classList.contains('is-open'), prefix + ': Done closes the panel');
  assert(adjust.getAttribute('aria-expanded') === 'false', prefix + ': aria-expanded=false on Done');
}

runScenario('lp');
runScenario('ph');

if (failed > 0) {
  console.error('\nFAIL: ' + failed + ' assertion(s) failed.');
  process.exit(1);
} else {
  console.log('\nOK: profile image fit panel regression test passed.');
}
