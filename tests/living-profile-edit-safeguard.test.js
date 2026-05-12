/* Regression test: Living Profile v0.1 manual-edit safeguard.
 *
 * The Living Profile lets the owner edit hero/identity fields
 * (name, essence, statement, contact.*, foundation.*) through the
 * existing #lp-edit-popover. v0.1 layers an auto-draft safeguard on
 * top: the deterministic auto value is preserved separately from
 * the manual override, and the popover gains a "Restore auto draft"
 * button that clears the override (or rewrites the field with the
 * saved auto value) so the auto draft is never destroyed by an
 * edit.
 *
 * What this test asserts (static + dynamic):
 *   1. State seed declares state.livingProfile.auto, and the seven
 *      safeguard helpers (lpEnsureSafeguardState, lpSetAutoDraft,
 *      lpGetAutoDraft, lpAutoDraftKey) exist.
 *   2. buildLivingProfile snapshots the essence auto BEFORE the
 *      manual override wins (so the manual still wins on render,
 *      but the auto value is preserved).
 *   3. The Restore button exists in the popover markup, with the
 *      "No auto draft yet" disabled state when there is no auto.
 *   4. Old prompt fragments cannot leak into the auto essence
 *      draft — the snapshot reads capEssence / compass, never the
 *      spark prompt copy.
 *   5. Dynamically: lpSetAutoDraft / lpGetAutoDraft round-trip, do
 *      not collide with state.builder.captures, and trimming-only
 *      empty strings are treated as "no auto draft yet".
 *
 * Usage:  node tests/living-profile-edit-safeguard.test.js
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
// 1) Static-source guards.
// ---------------------------------------------------------------------------
console.log('static-source checks');

assert(/livingProfile:\s*\{\s*auto:\s*\{\}\s*\}/.test(src),
  'state seed declares livingProfile.auto');
assert(/function lpEnsureSafeguardState\(/.test(src), 'lpEnsureSafeguardState defined');
assert(/function lpSetAutoDraft\(/.test(src),          'lpSetAutoDraft defined');
assert(/function lpGetAutoDraft\(/.test(src),          'lpGetAutoDraft defined');
assert(/function lpAutoDraftKey\(/.test(src),          'lpAutoDraftKey defined');

// Restore button in the popover.
assert(/id="lp-edit-popover-restore"/.test(src),
  'Restore auto draft button present in #lp-edit-popover markup');
assert(/restoreBtn\.onclick\s*=\s*function/.test(src),
  'Restore button click handler wired in openLpEditPopover');
assert(/No auto draft yet/.test(src),
  '"No auto draft yet" disabled-state copy present');
assert(/restoreBtn\.disabled\s*=\s*true/.test(src),
  'Restore button is disabled when no auto draft exists');

// buildLivingProfile snapshots the essence auto BEFORE the manual
// override wins.
const buildBlock = src.match(/var autoEssence = capEssence \|\| \(essenceFromCompass[\s\S]*?lpSetAutoDraft\('essence', autoEssence\);/);
assert(!!buildBlock, 'essence auto snapshot precedes the manual override application');

// Name auto: the resolver runs again against a profile clone with
// full_name etc. stripped, then saved as the name auto draft.
assert(/var autoNameProfile = \{\};[\s\S]{0,400}lpSetAutoDraft\('name', autoName\);/.test(src),
  'name auto snapshot strips full_name/display_name before resolving');

// First-edit snapshot in the save handler — so contact / foundation
// / statement get a true auto draft from the value that was on
// screen the first time the owner overrides it.
assert(/if \(autoDraftKey && !lpGetAutoDraft\(autoDraftKey\) && current\)/.test(src),
  'save handler snapshots the previous on-screen value as auto draft on first edit');

// ── Prompt-residue protection: the essence snapshot reads ONLY
// capEssence (cleaned excerpt) or essenceFromCompass (web_heading /
// theme) — never the spark prompt copy. Confirm the spark prompt
// string is NOT what feeds autoEssence.
const sparkEssencePrompt = 'Write the first sentence of your living profile';
assert(src.indexOf(sparkEssencePrompt) !== -1, 'spark prompt copy still present (sanity)');
const autoEssenceLine = src.match(/var autoEssence = capEssence \|\| \(essenceFromCompass[^;]*\);/);
assert(!!autoEssenceLine, 'extracted autoEssence assignment');
if (autoEssenceLine) {
  assert(autoEssenceLine[0].indexOf(sparkEssencePrompt) === -1,
    'autoEssence assignment does not reference the spark prompt string');
  assert(/capEssence/.test(autoEssenceLine[0]) && /essenceFromCompass/.test(autoEssenceLine[0]),
    'autoEssence is built from cleaned capture + compass values only');
}

// Statement auto chain check: in the build path, statement is owner-
// authored only and there is no auto chain — the safeguard relies on
// the first-edit snapshot in the save handler, NOT a build snapshot.
assert(/Only the owner-edited profile\.statement_manual is ever\s*\n\s*\/\/ rendered/.test(src),
  'statement remains owner-authored only; no prompt fragments rebuild it from captures');

// ── Restore behavior per type — confirm the handler clears the
// right manual fields (essence_manual / full_name) or rewrites the
// stored auto draft into the canonical slot (statement_manual /
// contact / foundation). This is the "restore the cleaned auto
// draft, not prompt residue" guarantee.
const restoreFn = src.match(/restoreBtn\.onclick = function \(\)[\s\S]*?renderLivingProfile\(\);\s*\};/);
assert(!!restoreFn, 'extracted Restore button click body');
const restoreBody = restoreFn ? restoreFn[0] : '';
assert(/delete p2\.essence_manual/.test(restoreBody) && /delete p2\.essence\b/.test(restoreBody),
  'Restore for essence clears essence_manual and the alias');
assert(/p2\.statement_manual = autoVal/.test(restoreBody),
  'Restore for statement rewrites the saved auto draft back into statement_manual');
assert(/delete p2\.full_name/.test(restoreBody),
  'Restore for name clears full_name so the resolver wins on re-render');

// ---------------------------------------------------------------------------
// 2) Dynamic guards — extract the helpers and drive them directly.
// ---------------------------------------------------------------------------
console.log('\ndynamic safeguard simulation');

const fakeWindow = { state: { livingProfile: { auto: {} } } };

function extract(name) {
  const re = new RegExp('function ' + name + '\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n    \\}', 'm');
  const m = src.match(re);
  if (!m) throw new Error('could not extract ' + name);
  return m[0];
}

const helperNames = [
  'lpEnsureSafeguardState',
  'lpSetAutoDraft',
  'lpGetAutoDraft',
  'lpAutoDraftKey'
];

let factorySrc = 'return (function (window) {\n';
helperNames.forEach(function (n) { factorySrc += extract(n) + '\n'; });
factorySrc += '  return {\n';
helperNames.forEach(function (n) { factorySrc += '    ' + n + ': ' + n + ',\n'; });
factorySrc += '  };\n});';

let helpers;
try {
  // eslint-disable-next-line no-new-func
  const factory = new Function(factorySrc)();
  helpers = factory(fakeWindow);
  pass('extracted safeguard helpers compiled');
} catch (e) {
  fail('extracted helpers failed to compile: ' + e.message);
  console.error(e);
  process.exit(1);
}

// ── Test: round-trip. ────────────────────────────────────────
helpers.lpSetAutoDraft('essence', 'auto essence text');
assert(helpers.lpGetAutoDraft('essence') === 'auto essence text', 'essence auto draft round-trips');

// ── Test: empty / whitespace strings are treated as no draft. ──
helpers.lpSetAutoDraft('statement', '');
assert(helpers.lpGetAutoDraft('statement') === '', 'empty string treated as no auto draft yet');
helpers.lpSetAutoDraft('statement', '   ');
assert(helpers.lpGetAutoDraft('statement') === '', 'whitespace-only treated as no auto draft yet');

// ── Test: keys for contact / foundation include the field id so
// each contact channel and each foundation row has its own auto. ──
assert(helpers.lpAutoDraftKey('contact', 'email')      === 'contact.email',
  'contact key includes the field id');
assert(helpers.lpAutoDraftKey('foundation', 'birthplace') === 'foundation.birthplace',
  'foundation key includes the field id');
assert(helpers.lpAutoDraftKey('essence', '')           === 'essence',
  'simple types use their own name as the key');
assert(helpers.lpAutoDraftKey('statement', '')         === 'statement',
  'statement key is just "statement"');

// ── Test: namespaced storage — does not collide with the existing
// state.builder.captures pipeline. ──
assert(fakeWindow.state.livingProfile && fakeWindow.state.livingProfile.auto,
  'safeguard state lives at state.livingProfile.auto');
assert(fakeWindow.state.builder === undefined,
  'safeguard does not allocate state.builder (capture pipeline is untouched)');

// ── Test: prompt-residue cannot leak through the safeguard. The
// helper accepts whatever it is given — the protection lives in
// the build path, which we covered statically. Here we sanity-check
// that the helper does NOT introduce any string transformation
// that could re-insert prompt copy. ──
helpers.lpSetAutoDraft('essence', sparkEssencePrompt);
// The helper stores verbatim — protection is upstream — so we
// assert the build path elsewhere never *gives* the helper a
// prompt string. (Already covered in the static section above.)
assert(helpers.lpGetAutoDraft('essence') === sparkEssencePrompt,
  'helper stores values verbatim — upstream build path is where prompt residue is filtered');

if (failed > 0) {
  console.error('\nFAIL: ' + failed + ' assertion(s) failed.');
  process.exit(1);
} else {
  console.log('\nOK: living-profile-edit-safeguard test passed.');
}
