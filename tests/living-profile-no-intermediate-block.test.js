/* Living Profile cleanup regression:
 *   The intermediate block that used to sit between the Studio Window
 *   (gallery) and the "Get in touch" section — Source notes toggle +
 *   "Contact & invitation" render section — has been removed. This
 *   test makes sure those LP-scoped artifacts do not creep back in.
 *
 *   Notes:
 *   - The Personal Home pane still has its own Source notes block
 *     (ph-source-toggle-btn / ph-source-detail). That one must stay.
 *   - The bottom "Get in touch" section must stay.
 *
 * Usage:  node tests/living-profile-no-intermediate-block.test.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '..', 'studio.html'), 'utf8');

let failed = 0;
function pass(msg) { console.log('  ok  ' + msg); }
function fail(msg) { console.error('  FAIL ' + msg); failed++; }
function assert(cond, msg) { cond ? pass(msg) : fail(msg); }

console.log('Living Profile intermediate block removed');

// 1. The LP-scoped Source notes toggle ids/elements are gone.
assert(!/id="lp-source-toggle-btn"/.test(src),
  'no rendered id="lp-source-toggle-btn" in studio.html');
assert(!/aria-controls="lp-source-detail"/.test(src),
  'no aria-controls="lp-source-detail" left in studio.html');
assert(!/id="lp-source-detail"/.test(src),
  'no rendered id="lp-source-detail" in studio.html');
assert(!/getElementById\(['"]lp-source-toggle-btn['"]\)/.test(src),
  'no JS handler still wiring lp-source-toggle-btn');

// 2. The "Contact & invitation" render section is gone from the LP body.
assert(!/renderSection\(\s*['"]Contact &amp; invitation['"]/.test(src),
  'renderSection("Contact &amp; invitation", …) call is removed');
assert(!/renderSection\(\s*['"]Contact & invitation['"]/.test(src),
  'renderSection("Contact & invitation", …) call is removed');

// 3. Personal Home keeps its own Source notes block (different ids).
assert(/id="ph-source-toggle-btn"/.test(src),
  'Personal Home keeps id="ph-source-toggle-btn"');
assert(/id="ph-source-detail"/.test(src),
  'Personal Home keeps id="ph-source-detail"');

// 4. The bottom Get in touch section is still rendered.
assert(/lp-git-grid/.test(src), 'Get in touch grid (lp-git-grid) still rendered');
assert(/var gitHeading = 'Get in <em>touch<\/em>'/.test(src),
  '"Get in touch" heading still present');
assert(/Contact me · across the threshold/.test(src),
  '"Contact me · across the threshold" eyebrow still present');

if (failed) {
  console.error('\nFAILED: ' + failed + ' check(s).');
  process.exit(1);
} else {
  console.log('\nOK: Living Profile intermediate block removed.');
}
