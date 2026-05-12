/* Living Profile · CTA consolidation:
 *   1. Knock / Leave a note / Book a meeting live exclusively in the
 *      hero-under toolbar (.lp-top-cta). The lower "Ways to engage"
 *      (.lp-door) section is content-only — no lp-door-actions block,
 *      no Calendar match / Visit · contact anchors in the door band.
 *   2. The top toolbar carries all three button IDs that the wiring
 *      needs: lp-door-meeting-top (or anchor), lp-door-knock-top,
 *      lp-door-note-toggle. Plus the knock-state + note-panel divs.
 *   3. The legacy lower-button IDs (lp-door-knock, lp-door-meeting)
 *      have been removed.
 *
 * Usage:  node tests/cta-consolidation.test.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '..', 'studio.html'), 'utf8');

let failed = 0;
function pass(msg) { console.log('  ok  ' + msg); }
function fail(msg) { console.error('  FAIL ' + msg); failed++; }
function assert(cond, msg) { cond ? pass(msg) : fail(msg); }

// 1. Top toolbar is the single home for the three CTAs + the
//    supporting knock-state + note panel.
console.log('hero-under toolbar (lp-top-cta)');
const topMatch = src.match(/<section class="lp-top-cta"[\s\S]*?<\/section>/);
assert(!!topMatch, 'lp-top-cta section exists');
if (topMatch) {
  const top = topMatch[0];
  assert(/id="lp-door-knock-top"/.test(top),
    'top toolbar carries Knock button id=lp-door-knock-top');
  assert(/id="lp-door-note-toggle"/.test(top),
    'top toolbar carries Leave a note button id=lp-door-note-toggle');
  assert(/Book a meeting/.test(top),
    'top toolbar carries Book a meeting label');
  assert(/id="lp-door-knock-state"/.test(top),
    'knock state lives inside lp-top-cta');
  assert(/id="lp-door-note-panel"/.test(top),
    'note panel lives inside lp-top-cta');
  assert(/id="lp-door-note-save"/.test(top) && /id="lp-door-note-cancel"/.test(top),
    'note save + cancel buttons live inside lp-top-cta');
  assert(/lp-top-cta-row/.test(top),
    'top toolbar uses lp-top-cta-row wrapper around the buttons');
}

// 2. Lower Ways to engage section has NO CTA toolbar.
console.log('\nlower Ways to engage (lp-door)');
assert(/<section class="lp-door"/.test(src), 'lp-door section still rendered');
const doorMatch = src.match(/<section class="lp-door"[\s\S]*?<\/section>/);
assert(!!doorMatch, 'lp-door section extracted');
if (doorMatch) {
  const door = doorMatch[0];
  assert(!/lp-door-actions/.test(door),
    'lp-door-actions block REMOVED from Ways to engage');
  assert(!/id="lp-door-knock"\b/.test(door),
    'legacy id=lp-door-knock button is gone from Ways to engage');
  assert(!/id="lp-door-meeting"\b/.test(door),
    'legacy id=lp-door-meeting button is gone from Ways to engage');
  assert(!/id="lp-door-note-toggle"/.test(door),
    'Leave a note toggle is gone from Ways to engage');
  // We assert on rendered output, not comments — the comment block
  // inside renderLivingProfile mentions the relocated channels.
  assert(!/lp-door-action[^"]*"\s+href="[^"]*"[^>]*>[\s\S]{0,60}Calendar match/.test(door),
    'No Calendar match anchor rendered inside Ways to engage');
  assert(!/lp-door-action[^"]*"\s+href="[^"]*"[^>]*>[\s\S]{0,60}Visit · contact/.test(door),
    'No Visit · contact anchor rendered inside Ways to engage');
  assert(/lp-door-rows/.test(door) || /No door rows yet/.test(door) || /<\/section>/.test(door),
    'lp-door still renders door content (rows or empty fallback)');
}

// 3. Global checks: only one rendered "Leave a note" button (matched
//    by the action-glyph that precedes the visible label). Comments
//    elsewhere in the file are intentionally ignored.
console.log('\nglobal occurrence counts');
const renderedLeave = (src.match(/aria-hidden="true">✎<\/span>Leave a note/g) || []).length;
assert(renderedLeave === 1,
  'rendered "Leave a note" button appears exactly once (got ' + renderedLeave + ')');
const noteToggleCount = (src.match(/id="lp-door-note-toggle"/g) || []).length;
assert(noteToggleCount === 1,
  'id=lp-door-note-toggle defined exactly once (got ' + noteToggleCount + ')');

if (failed) {
  console.error('\nFAILED: ' + failed + ' check(s).');
  process.exit(1);
} else {
  console.log('\nOK: CTA consolidation regressions pass.');
}
