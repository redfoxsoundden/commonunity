/* Living Profile follow-up regressions:
 *   1. Full-name resolution: companion ("Vesna") + profile.last_name
 *      ("Lucca") must yield "Vesna Lucca" — not just "Vesna".
 *   2. Foundation alias capture: birthdate/birthplace/current_location
 *      must be read from profile.* AND a nested foundation.* block AND
 *      compassData top-level (`dob`, `pob`, `location`) AND birthData
 *      so historical/imported shapes all fill the foundation layer.
 *   3. Doorway action rename: the modal must use "Book a meeting" and
 *      must not surface "Request studio hours" anywhere.
 *
 * Usage:  node tests/living-profile-foundation.test.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const studioPath = path.resolve(__dirname, '..', 'studio.html');
const src = fs.readFileSync(studioPath, 'utf8');

let failed = 0;
function pass(msg) { console.log('  ok  ' + msg); }
function fail(msg) { console.error('  FAIL ' + msg); failed++; }
function assert(cond, msg) { cond ? pass(msg) : fail(msg); }

console.log('static-source checks');
assert(!/Request studio hours/.test(src), 'no "Request studio hours" label remains in studio.html');
assert(src.match(/Book a meeting/g) && src.match(/Book a meeting/g).length >= 2,
  'at least two "Book a meeting" labels (top CTA + doorway band)');
assert(/lp-top-cta/.test(src), 'lp-top-cta block present (primary CTAs surfaced just under the hero)');
assert(!/lp-hero-eyebrow">Doorway · into the CommonUnity field/.test(src),
  'hero "Doorway · into the CommonUnity field" eyebrow removed from visible hero');
assert(/cleanNameContext/.test(src),
  'cleanNameContext exists to strip prompt-hangover residue from name-context capture');
assert(/lp-modal-head .builder-modal-close/.test(src),
  'lp-modal-head close-button override is present (× pulled out of brand row)');
assert(/lp-brand\.cu-wordmark-sm \.cu-lockup \{ height: 20px/.test(src),
  'CU lockup inside Living Profile head sized larger than the default 16px');
assert(/foundationBlock/.test(src) && /state\.birthData/.test(src),
  'buildFoundationItems reads foundation block / birthData fallbacks');

// Extract lpResolveDisplayName + helpers and exercise them.
console.log('\nlpResolveDisplayName: companion + profile.last_name');
const fnMatch = src.match(/function lpResolveDisplayName\(companion, profile, sourceText\)\s*\{[\s\S]*?\n    \}\n/);
if (!fnMatch) {
  fail('could not extract lpResolveDisplayName');
} else {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(fnMatch[0] + ';\nthis.lpResolveDisplayName = lpResolveDisplayName;', sandbox);
  const fn = sandbox.lpResolveDisplayName;
  assert(fn('Vesna', { last_name: 'Lucca' }, '') === 'Vesna Lucca',
    'companion="Vesna" + profile.last_name="Lucca" → "Vesna Lucca"');
  assert(fn('Vesna', { surname: 'Lucca' }, '') === 'Vesna Lucca',
    'companion + profile.surname alias also resolves');
  assert(fn('Vesna', { first_name: 'Vesna', last_name: 'Lucca' }, '') === 'Vesna Lucca',
    'explicit first_name + last_name still wins');
  assert(fn('Vesna', { full_name: 'Vesna Lucca' }, '') === 'Vesna Lucca',
    'full_name path unchanged');
  assert(fn('Vesna', {}, '') === 'Vesna',
    'companion-only still falls back to first name when nothing else known');
  assert(fn('', { first_name: 'Vesna', last_name: 'Lucca' }, '') === 'Vesna Lucca',
    'empty companion + explicit first/last still resolves');
}

// Static check: buildFoundationItems references all expected aliases.
console.log('\nbuildFoundationItems alias coverage');
const aliasNeedles = [
  // birthday
  'p.birthdate', 'p.birthday', 'p.date_of_birth', 'p.dob',
  'foundationBlock.birthdate', 'foundationBlock.date_of_birth', 'foundationBlock.dob',
  'cd.birthdate', 'cd.dob', 'bd.dob',
  // birthplace
  'p.birthplace', 'p.place_of_birth', 'p.pob',
  'foundationBlock.birthplace', 'foundationBlock.pob',
  'cd.birthplace', 'cd.pob', 'bd.pob',
  // current location
  'p.current_location', 'p.location',
  'foundationBlock.current_location', 'foundationBlock.location',
  'cd.current_location', 'cd.location',
  // human design + astrology + gene keys nested blocks
  'p.human_design', 'p.humanDesign', 'foundationBlock.human_design',
  'p.astrology', 'foundationBlock.astrology',
  'p.gene_keys', 'foundationBlock.gene_keys'
];
aliasNeedles.forEach(function (needle) {
  assert(src.indexOf(needle) !== -1, 'foundation alias present: ' + needle);
});

if (failed) {
  console.error('\nFAILED: ' + failed + ' check(s).');
  process.exit(1);
} else {
  console.log('\nOK: living-profile foundation regressions pass.');
}
