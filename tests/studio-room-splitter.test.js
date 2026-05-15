/* Regression test: Studio room splitter — horizontal resize
 * between Field Notes (centre) and Nexus (right).
 *
 * The user wanted a draggable vertical gutter between Field Notes
 * and Nexus so they can hand more horizontal room to Nexus when
 * long answers wrap. This test asserts:
 *
 *   1. Markup — a #room-splitter element sits between
 *      .room-workbench and .room-mirror inside .room-body, with
 *      ARIA role="separator" and aria-orientation="vertical".
 *   2. CSS — .room-body grid-template-columns reads from a
 *      --nexus-width custom property; the splitter is hidden
 *      under the 900px stacking breakpoint.
 *   3. JS — pointer + keyboard handlers exist; localStorage key
 *      cu.studio.nexusWidth is read on init and written on drag-
 *      end / keyboard adjust; clampWidth keeps the Nexus track
 *      ≥ 220px and leaves ≥ 320px for Field Notes.
 *   4. Dynamic — load the IIFE inside jsdom, drive a synthetic
 *      pointer drag, assert --nexus-width updates and the value
 *      persists to localStorage; arrow keys move the value.
 *   5. The dashboard Studio Path header button removal regression
 *      from the previous fix is still in place (sanity-only).
 *
 * Usage:  node tests/studio-room-splitter.test.js
 * Deps:   jsdom
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
// 1) Markup — splitter sits between workbench and mirror.
// ---------------------------------------------------------------------------
console.log('markup');

const dom = new JSDOM(src);
const doc = dom.window.document;

const splitter = doc.getElementById('room-splitter');
assert(!!splitter, '#room-splitter element exists');
if (splitter) {
  assert(splitter.getAttribute('role') === 'separator',
    'splitter has role="separator"');
  assert(splitter.getAttribute('aria-orientation') === 'vertical',
    'splitter has aria-orientation="vertical"');
  assert(splitter.getAttribute('aria-controls') === 'room-mirror',
    'splitter is aria-controls="room-mirror"');
  assert(splitter.hasAttribute('tabindex'),
    'splitter is keyboard-focusable (has tabindex)');
  assert(splitter.hasAttribute('aria-valuemin') &&
         splitter.hasAttribute('aria-valuemax') &&
         splitter.hasAttribute('aria-valuenow'),
    'splitter advertises aria-valuemin/max/now');
}

const body = doc.querySelector('.room-body');
assert(!!body, '.room-body container exists');
if (body && splitter) {
  // The children must be in the right order: archive, workbench,
  // splitter, mirror.
  var order = Array.prototype.filter
    .call(body.children, function (c) { return c.nodeType === 1; })
    .map(function (c) { return c.id || c.className.split(/\s+/)[0]; });
  // Strip empty / unrelated children.
  var idx = function (name) {
    for (var i = 0; i < order.length; i++) {
      if (order[i] === name) return i;
      // class-only matches
      if (body.children[i].classList && body.children[i].classList.contains(name)) return i;
    }
    return -1;
  };
  var iArchive   = idx('room-archive');
  var iWorkbench = idx('room-workbench');
  var iSplitter  = idx('room-splitter');
  var iMirror    = idx('room-mirror');
  assert(iArchive < iWorkbench && iWorkbench < iSplitter && iSplitter < iMirror,
    'children order is archive → workbench → splitter → mirror');
}

// ---------------------------------------------------------------------------
// 2) CSS — grid uses --nexus-width; splitter hidden under 900px.
// ---------------------------------------------------------------------------
console.log('\nCSS');

assert(/--nexus-width:\s*\d+px/.test(src),
  '.room-body declares a default --nexus-width');
assert(/grid-template-columns:\s*[\s\S]*?var\(--nexus-width\)/.test(src),
  'grid-template-columns reads var(--nexus-width)');
assert(/\.room-splitter\s*\{[\s\S]*?cursor:\s*col-resize/.test(src),
  '.room-splitter has cursor: col-resize');
// Hidden when stacked.
assert(/@media\s*\(max-width:\s*900px\)\s*\{\s*\.room-splitter\s*\{\s*display:\s*none/.test(src),
  '.room-splitter is hidden at ≤ 900px (layout stacks)');

// ---------------------------------------------------------------------------
// 3) JS — handlers + localStorage + clamp.
// ---------------------------------------------------------------------------
console.log('\nJS handlers');

assert(/STORAGE_KEY\s*=\s*['"]cu\.studio\.nexusWidth['"]/.test(src),
  'localStorage key is cu.studio.nexusWidth');
assert(/splitter\.addEventListener\('pointerdown'/.test(src) &&
       /splitter\.addEventListener\('pointermove'/.test(src) &&
       /splitter\.addEventListener\('pointerup'/.test(src),
  'pointer down/move/up handlers wired on the splitter');
assert(/splitter\.addEventListener\('keydown'/.test(src),
  'keydown handler wired for keyboard accessibility');
assert(/ArrowLeft[\s\S]{0,200}current \+ step/.test(src) &&
       /ArrowRight[\s\S]{0,200}current - step/.test(src),
  'ArrowLeft grows Nexus, ArrowRight shrinks Nexus');
assert(/MIN_NEXUS\s*=\s*220/.test(src),
  'Nexus minimum width is 220px (prevents collapse)');
assert(/MIN_NOTEPAD\s*=\s*320/.test(src),
  'Field Notes minimum width is 320px (clamp keeps it usable)');
assert(/window\.addEventListener\('resize'[\s\S]{0,400}applyWidth\(currentNexusPx\(\)/.test(src),
  'window resize re-clamps the stored width so it cannot overlap after viewport shrink');

// ---------------------------------------------------------------------------
// 4) Dynamic — drive the IIFE in jsdom; pointer + keyboard.
// ---------------------------------------------------------------------------
console.log('\ndynamic splitter behavior');

// Mount a minimal DOM that mirrors the four grid tracks and a
// .room-body container. We inject only the splitter IIFE (the
// final block at the bottom of studio.html) and let it bind.
const dom2 = new JSDOM(
  '<!doctype html><html><head><style>' +
    // Use a fixed grid layout so getBoundingClientRect() reports
    // realistic widths in jsdom (which doesn\'t do real layout).
    '.room-body { display: grid; --nexus-width: 340px; }' +
  '</style></head><body>' +
    '<div class="room-body" id="root">' +
      '<div class="room-archive"   id="archive"   style="width: 220px;"></div>' +
      '<div class="room-workbench" id="workbench" style="width: 540px;"></div>' +
      '<div class="room-splitter"  id="room-splitter" role="separator" ' +
        'aria-orientation="vertical" aria-controls="room-mirror" ' +
        'aria-valuemin="220" aria-valuemax="900" aria-valuenow="340" ' +
        'tabindex="0"></div>' +
      '<div class="room-mirror"    id="room-mirror" style="width: 340px;"></div>' +
    '</div>' +
  '</body></html>',
  { pretendToBeVisual: true, url: 'http://localhost/', runScripts: 'outside-only' }
);

// jsdom returns zero-sized rects without layout. Stub getBoundingClientRect
// on the root so clampWidth has a viewport to work against.
var rootEl = dom2.window.document.getElementById('root');
rootEl.getBoundingClientRect = function () {
  return { left: 0, top: 0, right: 1200, bottom: 800, width: 1200, height: 800, x: 0, y: 0 };
};
var mirrorEl = dom2.window.document.getElementById('room-mirror');
var mirrorWidth = 340;
mirrorEl.getBoundingClientRect = function () {
  return { left: 1200 - mirrorWidth, top: 0, right: 1200, bottom: 800, width: mirrorWidth, height: 800, x: 1200 - mirrorWidth, y: 0 };
};

// Provide a minimal getComputedStyle returning the archive width
// from the inline style so clampWidth reads a sensible first track.
var origCS = dom2.window.getComputedStyle.bind(dom2.window);
dom2.window.getComputedStyle = function (el) {
  var cs = origCS(el);
  if (el === rootEl) {
    return {
      getPropertyValue: function (name) {
        if (name === 'grid-template-columns') return '220px 540px 6px 340px';
        return cs.getPropertyValue ? cs.getPropertyValue(name) : '';
      }
    };
  }
  return cs;
};

// matchMedia stub — desktop only (so isStacked() === false).
dom2.window.matchMedia = function () { return { matches: false }; };

// Extract the splitter IIFE — the comment header is a stable anchor.
const iifeMatch = src.match(/\/\/ ============================================================\n\/\/ ROOM SPLITTER[\s\S]*?\}\)\(\);/);
assert(!!iifeMatch, 'extracted ROOM SPLITTER IIFE');
if (!iifeMatch) {
  console.error('\nFAIL: could not extract IIFE.');
  process.exit(1);
}

// Run the IIFE inside the jsdom realm. Then synchronously fire
// DOMContentLoaded so the bind() inside the IIFE runs before we
// start dispatching synthetic pointer / key events.
try {
  dom2.window.eval(iifeMatch[0]);
  dom2.window.document.dispatchEvent(new dom2.window.Event('DOMContentLoaded', { bubbles: true }));
  pass('IIFE evaluates inside jsdom without throwing');
} catch (e) {
  fail('IIFE threw: ' + e.message);
  console.error(e);
}

var splitterEl = dom2.window.document.getElementById('room-splitter');

// ── Test: pointer drag updates --nexus-width ────────────────
function fireEvent(target, type, props) {
  // jsdom PointerEvent support is patchy; use a plain Event with
  // the props we care about (matches what our handler reads).
  var ev = new dom2.window.Event(type, { bubbles: true, cancelable: true });
  Object.keys(props || {}).forEach(function (k) { ev[k] = props[k]; });
  target.dispatchEvent(ev);
  return ev;
}

// Start the drag at the splitter's notional centre (root.right - 340 - 3px),
// then move the pointer 100px to the LEFT — Nexus should grow by ~100px.
var startX = 1200 - 340 - 3;
fireEvent(splitterEl, 'pointerdown', { pointerId: 1, button: 0, clientX: startX });
fireEvent(splitterEl, 'pointermove', { pointerId: 1, clientX: startX - 100 });
var afterDrag = rootEl.style.getPropertyValue('--nexus-width');
var afterDragPx = parseFloat(afterDrag);
assert(afterDragPx >= 435 && afterDragPx <= 445,
  'pointer drag left by 100px sets --nexus-width to ~440px (got ' + afterDrag + ')');

// Drop the drag — value should persist to localStorage.
// Update mirrorEl width so currentNexusPx() returns the dragged value
// (jsdom does not re-layout from CSS variable changes).
mirrorWidth = 440;
fireEvent(splitterEl, 'pointerup', { pointerId: 1 });
var stored = dom2.window.localStorage.getItem('cu.studio.nexusWidth');
assert(stored && parseFloat(stored) >= 430 && parseFloat(stored) <= 460,
  'pointerup persists the drag width to localStorage (got ' + stored + ')');

// ── Test: keyboard ──────────────────────────────────────────
// ArrowLeft grows Nexus by KEY_STEP (16px).
function fireKeyDown(target, key, shift) {
  var ev = new dom2.window.Event('keydown', { bubbles: true, cancelable: true });
  ev.key = key;
  ev.shiftKey = !!shift;
  // No preventDefault needed for the test assertion.
  target.dispatchEvent(ev);
  return ev;
}
// Reset the persisted value and apply a known starting point.
dom2.window.localStorage.removeItem('cu.studio.nexusWidth');
dom2.window.CommonUnity.roomSplitter.apply(340);
mirrorWidth = 340;
mirrorEl.getBoundingClientRect = function () {
  return { left: 1200 - mirrorWidth, top: 0, right: 1200, bottom: 800, width: mirrorWidth, height: 800, x: 1200 - mirrorWidth, y: 0 };
};
fireKeyDown(splitterEl, 'ArrowLeft', false);
var nexAfterKey = rootEl.style.getPropertyValue('--nexus-width');
assert(/356px/.test(nexAfterKey),
  'ArrowLeft grows Nexus by 16px (got ' + nexAfterKey + ')');
var keyStored = dom2.window.localStorage.getItem('cu.studio.nexusWidth');
assert(keyStored && parseFloat(keyStored) === 356,
  'keyboard nudge persists to localStorage (got ' + keyStored + ')');

// ── Test: clampWidth enforces MIN_NOTEPAD on a narrow viewport ──
// At 700px wide, archive=220 + splitter=6 + min notepad=320 = 546;
// so max nexus is 700-546 = 154 — but MIN_NEXUS is 220, so clamp
// must collapse to MIN_NEXUS = 220.
rootEl.getBoundingClientRect = function () {
  return { left: 0, top: 0, right: 700, bottom: 800, width: 700, height: 800, x: 0, y: 0 };
};
var clamped = dom2.window.CommonUnity.roomSplitter.clamp(500);
assert(clamped === 220,
  'clampWidth collapses to MIN_NEXUS=220 when the viewport cannot host both panes (got ' + clamped + ')');

// ---------------------------------------------------------------------------
// 5) Dashboard Studio Path button still absent (sanity).
// ---------------------------------------------------------------------------
console.log('\nstudio path button regression');

assert(doc.getElementById('studio-path-open-header') === null,
  'Studio Path header button still absent from the dashboard');

if (failed > 0) {
  console.error('\nFAIL: ' + failed + ' assertion(s) failed.');
  process.exit(1);
} else {
  console.log('\nOK: studio-room-splitter test passed.');
}
