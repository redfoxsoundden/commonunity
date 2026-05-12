/* Living Profile v0.6 regressions:
 *   1. Hero exposes an editable, separate "profile statement" field
 *      alongside name + essence — with its own Edit affordance and
 *      its own openLpEditPopover('statement', …) wiring.
 *   2. Visible hero text never carries known prompt fragments
 *      ("Lineages, places, communities…", "Beyond your name…") — the
 *      stripPromptResidue helper exists and is applied to public text.
 *   3. Lower engagement band is renamed: eyebrow "Studio Door",
 *      title "What's open now", lede starts with "Current invitations".
 *      Card labels include "Building now", "Offering", "Looking for".
 *   4. A My Studio + glowing On Air pill is rendered inside the
 *      Studio Door band, re-using the existing .onair-pill styling.
 *   5. The hero-under CTA toolbar (lp-top-cta) still owns Knock /
 *      Leave a note / Book a meeting — Studio Door does NOT duplicate
 *      those CTAs.
 *   6. The CSS variable --space-7 is defined so popup/contact padding
 *      no longer falls back to 0.
 *
 * Usage:  node tests/living-profile-v06.test.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '..', 'studio.html'), 'utf8');

let failed = 0;
function pass(msg) { console.log('  ok  ' + msg); }
function fail(msg) { console.error('  FAIL ' + msg); failed++; }
function assert(cond, msg) { cond ? pass(msg) : fail(msg); }

console.log('hero profile statement');
assert(/id="lp-hero-statement-text"/.test(src),
  'hero renders a profile statement element (id=lp-hero-statement-text)');
assert(/data-lp-edit="statement"/.test(src),
  'profile statement is click-to-edit (data-lp-edit="statement")');
assert(/id="lp-hero-edit-statement"/.test(src),
  'hero edit row exposes Edit statement button');
assert(/statement_manual/.test(src),
  'statement persistence writes profile.statement_manual');
assert(/openLpEditPopover\('statement'/.test(src) || /openLpEditPopover\("statement"/.test(src),
  'statement edit wiring calls openLpEditPopover("statement", …)');
assert(/type === 'statement'/.test(src),
  'openLpEditPopover handles type "statement"');

console.log('\nno visible prompt fragments');
// stripPromptResidue helper exists.
assert(/function stripPromptResidue\s*\(/.test(src),
  'stripPromptResidue helper is defined');
// Sanity check the helper actually drops the leaked phrasings.
const stripBlock = src.match(/function stripPromptResidue[\s\S]{0,1400}/);
assert(stripBlock && /Beyond your name/i.test(stripBlock[0]),
  'stripPromptResidue handles "Beyond your name…" prompt residue');
assert(stripBlock && /Lineages,[\s\S]*places,[\s\S]*communities/i.test(stripBlock[0]),
  'stripPromptResidue handles "Lineages, places, communities…" residue');
// And that it is applied to the hero statement before render.
assert(/idStatement = stripPromptResidue/.test(src),
  'hero idStatement is cleaned by stripPromptResidue before render');
assert(/idEssence = stripPromptResidue/.test(src),
  'hero essence is cleaned by stripPromptResidue before render');

console.log('\nStudio Door rename + labels');
// New eyebrow / title / lede.
assert(/<span class="lp-door-eye">Studio Door<\/span>/.test(src),
  'door eyebrow is "Studio Door"');
assert(/<h3 class="lp-door-title">What.s <em>open now<\/em><\/h3>/.test(src),
  'door title is "What\'s open now"');
assert(/Current invitations, offerings, projects, and ways to connect/.test(src),
  'door lede matches new copy');
// Legacy strings gone from rendered output.
assert(!/<span class="lp-door-eye">At the door<\/span>/.test(src),
  'old "At the door" eyebrow string is gone');
assert(!/Ways to <em>engage<\/em>/.test(src),
  'old "Ways to engage" title is gone');
assert(!/What is alive, what is on offer, and threads worth pulling/.test(src),
  'old lede string is gone');
// Improved row labels.
assert(/'Building now'/.test(src),
  'door row label "Building now" present');
assert(/'Offering'/.test(src),
  'door row label "Offering" present');
assert(/'Looking for · thriving with'/.test(src),
  'door row label "Looking for · thriving with" present');
assert(/'Sharing · open to'/.test(src),
  'door row label "Sharing · open to" present');

console.log('\nMy Studio · On Air');
assert(/class="lp-my-studio"/.test(src),
  '.lp-my-studio block is rendered inside the door section');
assert(/lp-my-studio-label[^>]*>My Studio</.test(src),
  'My Studio label rendered');
assert(/id="lp-my-studio-onair"/.test(src),
  'On Air element carries id=lp-my-studio-onair');
assert(/class="onair-pill lp-my-studio-pill"/.test(src),
  'On Air pill re-uses existing .onair-pill styling');
// And lp-my-studio sits inside the lp-door section (not in the hero or top-cta).
const doorBlock = src.match(/<section class="lp-door"[\s\S]*?<\/section>'/);
assert(!!doorBlock, 'lp-door section template extracted');
if (doorBlock) {
  assert(/lp-my-studio/.test(doorBlock[0]),
    'lp-my-studio is rendered inside the Studio Door section template');
}

console.log('\nCTA toolbar unchanged');
const topMatch = src.match(/<section class="lp-top-cta"[\s\S]*?<\/section>/);
assert(!!topMatch, 'lp-top-cta section still exists');
if (topMatch) {
  assert(/id="lp-door-knock-top"/.test(topMatch[0]),
    'top toolbar still carries Knock button');
  assert(/id="lp-door-note-toggle"/.test(topMatch[0]),
    'top toolbar still carries Leave a note toggle');
  assert(/Book a meeting/.test(topMatch[0]),
    'top toolbar still carries Book a meeting');
}
// Door must NOT duplicate the three CTAs. Inspect the rendered section
// template (skip its trailing comment block, which legitimately
// references the relocated channels).
const renderedDoor = src.match(/<section class="lp-door"[\s\S]*?<\/section>'/);
if (renderedDoor) {
  // Strip JS line comments so the explanatory note doesn't trigger a
  // false positive on "Book a meeting" / "Leave a note".
  const doorRendered = renderedDoor[0].replace(/\/\/[^\n]*/g, '');
  assert(!/id="lp-door-knock-top"/.test(doorRendered),
    'Studio Door does NOT duplicate Knock button');
  assert(!/id="lp-door-note-toggle"/.test(doorRendered),
    'Studio Door does NOT duplicate Leave a note toggle');
  assert(!/Book a meeting/.test(doorRendered),
    'Studio Door does NOT duplicate Book a meeting');
}

console.log('\npadding fix · --space-7 defined');
assert(/--space-7:\s*[0-9.]+rem/.test(src),
  'CSS variable --space-7 is defined (popup/contact padding clamp() now resolves)');

if (failed) {
  console.error('\nFAILED: ' + failed + ' check(s).');
  process.exit(1);
} else {
  console.log('\nOK: living-profile v0.6 regressions pass.');
}
