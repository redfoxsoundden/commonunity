/* Regression test: Studio usability — dashboard de-crowding,
 * Field Notes / Nexus resizing, and responsive room layout.
 *
 * Covers three user-reported issues:
 *   1. Field Notes (.notepad-textarea) and Nexus (.mirror-input)
 *      must be user-resizable so longer entries are comfortable;
 *      Nexus in particular was capped at 100px max-height.
 *   2. When the browser is resized, the rooms (.room-archive /
 *      .room-workbench / .room-mirror) must stay inside their
 *      grid tracks instead of overflowing into adjacent panels.
 *      Fix: min-width:0 on each column child + an intermediate
 *      901–1180px breakpoint that trims the side tracks.
 *   3. The Studio Path header button (id=studio-path-open-header)
 *      was removed for v0.1 to reduce dashboard crowding; the
 *      Living Profile header button stays.
 *
 * Usage:  node tests/studio-layout-and-resize.test.js
 * Deps:   jsdom (for DOM parsing of the studio.html markup)
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
// 1) Dashboard de-crowding — Studio Path header button removed,
//    Living Profile button retained.
// ---------------------------------------------------------------------------
console.log('dashboard de-crowding');

const dom = new JSDOM(src);
const doc = dom.window.document;

assert(doc.getElementById('studio-path-open-header') === null,
  'Studio Path header button (#studio-path-open-header) is absent from the dashboard');
assert(doc.getElementById('studio-path-living-profile-header') !== null,
  'Living Profile header button (#studio-path-living-profile-header) is still present');
// Entry points elsewhere should remain — Studio Path is still reachable
// from the entrance trail and the Oṁ widget, so we have not stranded
// the modal.
assert(doc.getElementById('studio-path-open-entrance') !== null,
  'Studio Path entrance-trail CTA still exists — modal stays reachable');

// The JS wiring guards getElementById with `if (headerPathBtn)`, so
// removing the button must not introduce a runtime error path. Sanity-
// check that the guard pattern is in place:
assert(/var headerPathBtn\s*=\s*document\.getElementById\('studio-path-open-header'\);[\s\S]{0,200}if \(headerPathBtn\)/.test(src),
  'header button wiring is null-guarded — removing the button is safe');

// ---------------------------------------------------------------------------
// 2) Field Notes + Nexus resizing
// ---------------------------------------------------------------------------
console.log('\nField Notes + Nexus resizing');

// .notepad-textarea — was resize:none. Must now be resize:vertical with
// a sensible min and a max that keeps it under viewport height.
const notepadRule = src.match(/\.notepad-textarea\s*\{[^}]*\}/);
assert(!!notepadRule, 'extracted .notepad-textarea rule');
if (notepadRule) {
  const r = notepadRule[0];
  assert(/resize:\s*vertical/.test(r),
    '.notepad-textarea uses resize:vertical (user can drag taller)');
  assert(!/resize:\s*none/.test(r),
    '.notepad-textarea no longer has resize:none');
  assert(/min-height:\s*200px/.test(r),
    '.notepad-textarea keeps a 200px floor so it stays usable');
  assert(/max-height:\s*\d+vh/.test(r),
    '.notepad-textarea caps growth at a vh value so it cannot push entries off-screen');
}

// .mirror-input — was max-height:100px which forced anything past a
// sentence to scroll inside a tiny viewport. Must allow far more room.
// The later rule wins via cascade — collect all .mirror-input blocks
// and check the LAST occurrence (which is the one actually applied).
const mirrorRules = src.match(/\.mirror-input\s*\{[^}]*\}/g) || [];
assert(mirrorRules.length > 0, 'extracted .mirror-input rule(s)');
const liveMirrorRule = mirrorRules[mirrorRules.length - 1];
if (liveMirrorRule) {
  const r = liveMirrorRule;
  assert(/resize:\s*vertical/.test(r),
    '.mirror-input uses resize:vertical (Nexus user can drag taller)');
  // Numeric guards: min-height grew from 40 → at least 56; max-height
  // moved from 100px to a vh value (much bigger).
  const mn = r.match(/min-height:\s*(\d+)px/);
  assert(mn && Number(mn[1]) >= 56,
    '.mirror-input min-height is at least 56px (was 40px)');
  assert(/max-height:\s*\d+vh/.test(r),
    '.mirror-input max-height switched to a vh value (was 100px)');
  assert(!/max-height:\s*100px/.test(r),
    '.mirror-input no longer caps at 100px');
}

// The textarea itself — rows attribute bumped so the resting size is
// already taller, not just the resize ceiling.
const mirrorTextareaMatch = src.match(/<textarea class="mirror-input"[\s\S]*?>/);
assert(!!mirrorTextareaMatch, 'extracted #mirror-input textarea tag');
if (mirrorTextareaMatch) {
  const rowsMatch = mirrorTextareaMatch[0].match(/rows="(\d+)"/);
  assert(rowsMatch && Number(rowsMatch[1]) >= 3,
    '#mirror-input textarea defaults to >= 3 rows (was 2)');
}

// ---------------------------------------------------------------------------
// 3) Responsive room layout — overflow / overlap fix.
// ---------------------------------------------------------------------------
console.log('\nresponsive room layout');

// .room-body — the 1fr middle track must be minmax(0, 1fr) so the
// centre column can shrink past intrinsic content size (this is the
// canonical fix for grid items pushing siblings out of their tracks).
const roomBodyRule = src.match(/\/\* ── Room layout — DAW style[\s\S]*?\.room-body\s*\{[^}]*\}/);
assert(!!roomBodyRule, 'extracted DAW-style .room-body rule');
if (roomBodyRule) {
  const r = roomBodyRule[0];
  assert(/grid-template-columns:\s*220px\s+minmax\(0,\s*1fr\)\s+340px/.test(r),
    '.room-body uses minmax(0, 1fr) for the centre column');
  assert(/min-width:\s*0/.test(r),
    '.room-body container has min-width:0');
}

// Intermediate breakpoint at 901–1180px must exist and trim the side
// tracks so the centre Notepad stays usable.
assert(/@media\s*\(min-width:\s*901px\)\s*and\s*\(max-width:\s*1180px\)\s*\{[\s\S]*?\.room-body[\s\S]*?grid-template-columns/.test(src),
  '901–1180px breakpoint trims .room-body side tracks');

// Each column child must have min-width:0 — without it long words /
// fixed-width Gene Key chips can push the column wider than its
// grid track and overlap the next column.
['.room-archive', '.room-workbench', '.room-mirror'].forEach(function (sel) {
  const re = new RegExp(sel.replace('.', '\\.') + '\\s*\\{[^}]*\\}', 'g');
  let found = false;
  let m;
  while ((m = re.exec(src)) !== null) {
    if (/min-width:\s*0/.test(m[0])) { found = true; break; }
  }
  assert(found, sel + ' has min-width:0 (prevents grid-track overflow)');
});

// .room-header must flex-wrap so the toolbar wraps instead of pushing
// the Living Profile button / ON AIR pill off-screen at narrow widths.
// Cascade: take the last .room-header rule (the active one).
const headerRules = src.match(/\.room-header\s*\{[^}]*\}/g) || [];
assert(headerRules.length > 0, 'extracted .room-header rule(s)');
const liveHeader = headerRules[headerRules.length - 1];
if (liveHeader) {
  assert(/flex-wrap:\s*wrap/.test(liveHeader),
    '.room-header allows flex-wrap so toolbar wraps gracefully');
}

// .entrance-right must overflow-x:hidden and min-width:0 so the
// dashboard sidebar cannot bleed into the portal column when the
// browser is resized between desktop and mobile.
const entranceRightRules = src.match(/\.entrance-right\s*\{[^}]*\}/g) || [];
assert(entranceRightRules.length > 0, 'extracted .entrance-right rule(s)');
const liveEntranceRight = entranceRightRules[entranceRightRules.length - 1];
if (liveEntranceRight) {
  const r = liveEntranceRight;
  assert(/overflow-x:\s*hidden/.test(r),
    '.entrance-right hides horizontal overflow');
  assert(/min-width:\s*0/.test(r),
    '.entrance-right allows itself to shrink (min-width:0)');
}

// Tablet (601–960px) breakpoint must shrink the portal and the
// sidebar so they fit side-by-side without overlap.
assert(/@media\s*\(min-width:\s*601px\)\s*and\s*\(max-width:\s*960px\)\s*\{[\s\S]*?\.entrance-right[\s\S]*?width:\s*300px/.test(src),
  '601–960px breakpoint shrinks .entrance-right to 300px');
assert(/@media\s*\(min-width:\s*601px\)\s*and\s*\(max-width:\s*960px\)\s*\{[\s\S]*?\.portal-wrap[\s\S]*?\.torus-canvas[\s\S]*?width:\s*min\(320px/.test(src),
  '601–960px breakpoint shrinks the portal canvas');

if (failed > 0) {
  console.error('\nFAIL: ' + failed + ' assertion(s) failed.');
  process.exit(1);
} else {
  console.log('\nOK: studio-layout-and-resize test passed.');
}
