/* Compass save JSON foundation-field regressions:
 *
 * The Compass `saveJSON()` build path must emit the foundational
 * identity fields that Studio's Living Profile reads. We extract
 * `buildCompassExport()` from index.html and verify the shape of the
 * exported object includes:
 *   - profile.first_name / profile.last_name / profile.full_name
 *   - profile.birthdate / profile.date_of_birth / profile.birth_time
 *   - profile.birthplace / profile.place_of_birth
 *   - profile.current_location
 *   - profile.human_design.{type, profile}
 *   - profile.astrology.{sun, moon, rising}
 *   - profile.gene_keys.life_work (derived from points.work.gk_num)
 *   - profile.foundation block carrying the same fields
 *   - top-level dob/tob/pob preserved + date_of_birth/birth_time/place_of_birth aliases
 *
 * Usage: node tests/compass-save-foundation.test.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const compassPath = path.resolve(__dirname, '..', 'index.html');
const src = fs.readFileSync(compassPath, 'utf8');

let failed = 0;
function pass(msg) { console.log('  ok  ' + msg); }
function fail(msg) { console.error('  FAIL ' + msg); failed++; }
function assert(cond, msg) { cond ? pass(msg) : fail(msg); }

console.log('extract buildCompassExport from index.html');
const fnMatch = src.match(/function buildCompassExport\(s\)\s*\{[\s\S]*?\n\}\n/);
if (!fnMatch) {
  fail('could not extract buildCompassExport');
  process.exit(1);
}
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(fnMatch[0] + ';\nthis.buildCompassExport = buildCompassExport;', sandbox);
const buildCompassExport = sandbox.buildCompassExport;
pass('buildCompassExport extracted and loaded');

console.log('\ncase 1: full state with all foundation fields');
const fullState = {
  theme: 'A',
  tradition: 'GK',
  guide: 'Markus',
  companion: 'Vesna Lucca',
  dob: '1985-03-14',
  tob: '04:30',
  pob: 'Belgrade, Serbia',
  gk_profile: { cs: { gate: 22, line: 3 }, us: null, ce: null, ue: null },
  profile: {
    current_location: 'Lisbon, Portugal',
    human_design_type: 'Manifesting Generator',
    human_design_profile: '2/4',
    astrology_sun: 'Pisces',
    astrology_moon: 'Aquarius',
    astrology_rising: 'Scorpio'
  },
  points: {
    work:  { raw: '', gk_num: '22', gk_line: '3' },
    lens:  { raw: '' },
    field: { raw: '' },
    call:  { raw: '' }
  }
};
const out = buildCompassExport(fullState);

assert(out.profile.first_name === 'Vesna',          'profile.first_name derived from companion');
assert(out.profile.last_name  === 'Lucca',          'profile.last_name derived from companion');
assert(out.profile.full_name  === 'Vesna Lucca',    'profile.full_name composed from first+last');
assert(out.profile.birthdate      === '1985-03-14', 'profile.birthdate mirrors dob');
assert(out.profile.date_of_birth  === '1985-03-14', 'profile.date_of_birth mirrors dob');
assert(out.profile.birth_time     === '04:30',      'profile.birth_time mirrors tob');
assert(out.profile.birthplace     === 'Belgrade, Serbia', 'profile.birthplace mirrors pob');
assert(out.profile.place_of_birth === 'Belgrade, Serbia', 'profile.place_of_birth mirrors pob');
assert(out.profile.current_location === 'Lisbon, Portugal', 'profile.current_location preserved');

assert(out.profile.human_design && out.profile.human_design.type === 'Manifesting Generator',
  'profile.human_design.type from flat input');
assert(out.profile.human_design && out.profile.human_design.profile === '2/4',
  'profile.human_design.profile from flat input');
assert(out.profile.astrology && out.profile.astrology.sun    === 'Pisces',   'profile.astrology.sun');
assert(out.profile.astrology && out.profile.astrology.moon   === 'Aquarius', 'profile.astrology.moon');
assert(out.profile.astrology && out.profile.astrology.rising === 'Scorpio',  'profile.astrology.rising');
assert(out.profile.gene_keys && out.profile.gene_keys.life_work === 'GK 22.3',
  'profile.gene_keys.life_work derived from points.work');

// Nested foundation block
const fb = out.profile.foundation;
assert(fb && fb.first_name === 'Vesna',        'foundation.first_name present');
assert(fb && fb.last_name  === 'Lucca',        'foundation.last_name present');
assert(fb && fb.birthdate  === '1985-03-14',   'foundation.birthdate present');
assert(fb && fb.birthplace === 'Belgrade, Serbia', 'foundation.birthplace present');
assert(fb && fb.current_location === 'Lisbon, Portugal', 'foundation.current_location present');
assert(fb && fb.human_design && fb.human_design.type === 'Manifesting Generator',
  'foundation.human_design.type present');
assert(fb && fb.astrology && fb.astrology.sun === 'Pisces',
  'foundation.astrology.sun present');

// Top-level fields preserved + aliased
assert(out.dob === '1985-03-14', 'top-level dob preserved');
assert(out.tob === '04:30',      'top-level tob preserved');
assert(out.pob === 'Belgrade, Serbia', 'top-level pob preserved');
assert(out.date_of_birth   === '1985-03-14',       'top-level date_of_birth alias added');
assert(out.birth_time      === '04:30',            'top-level birth_time alias added');
assert(out.place_of_birth  === 'Belgrade, Serbia', 'top-level place_of_birth alias added');
assert(out.current_location === 'Lisbon, Portugal', 'top-level current_location alias added');

console.log('\ncase 2: minimal state (just companion + dob) still produces profile.*');
const minState = {
  companion: 'Vesna',
  dob: '1985-03-14',
  tob: '',
  pob: '',
  profile: {},
  points: { work: {}, lens: {}, field: {}, call: {} }
};
const minOut = buildCompassExport(minState);
assert(minOut.profile.first_name === 'Vesna', 'single-name companion → first_name');
assert(minOut.profile.last_name === '' || minOut.profile.last_name === undefined,
  'single-name companion → no derived last_name');
assert(minOut.profile.birthdate === '1985-03-14', 'minimal state still gets profile.birthdate');
assert(!minOut.profile.human_design, 'no human_design block when no inputs given');
assert(!minOut.profile.astrology,    'no astrology block when no inputs given');

console.log('\ncase 3: explicit profile.first_name / last_name wins over companion split');
const explicitState = {
  companion: 'Vesna Lucca',
  dob: '',
  tob: '',
  pob: '',
  profile: { first_name: 'Vesna-Marie', last_name: 'Lucca-Smith' },
  points: { work: {}, lens: {}, field: {}, call: {} }
};
const explicitOut = buildCompassExport(explicitState);
assert(explicitOut.profile.first_name === 'Vesna-Marie',  'explicit first_name preserved');
assert(explicitOut.profile.last_name  === 'Lucca-Smith',  'explicit last_name preserved');

console.log('\ncase 4: backwards compatible — existing fields untouched');
const legacyState = {
  theme: 'B',
  tradition: 'GK',
  guide: 'G',
  companion: 'Test',
  dob: '2000-01-01',
  tob: '',
  pob: '',
  gk_profile: { cs: null, us: null, ce: null, ue: null },
  profile: { work_background: 'engineer', communities: 'tribe', practices: ['Yoga'] },
  points: { work: { raw: 'r' }, lens: {}, field: {}, call: {} }
};
const legacyOut = buildCompassExport(legacyState);
assert(legacyOut.theme === 'B',                       'legacy theme preserved');
assert(legacyOut.guide === 'G',                       'legacy guide preserved');
assert(legacyOut.companion === 'Test',                'legacy companion preserved');
assert(legacyOut.profile.work_background === 'engineer', 'legacy profile.work_background preserved');
assert(legacyOut.profile.communities === 'tribe',     'legacy profile.communities preserved');
assert(Array.isArray(legacyOut.profile.practices) && legacyOut.profile.practices[0] === 'Yoga',
  'legacy profile.practices preserved');
assert(legacyOut.points.work.raw === 'r',             'legacy points.work.raw preserved');

if (failed) {
  console.error('\nFAILED: ' + failed + ' check(s).');
  process.exit(1);
} else {
  console.log('\nOK: compass save foundation export passes.');
}
