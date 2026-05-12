/* Living Profile · statement edit regression:
 *   The owner-edited profile statement (profile.statement_manual) must be
 *   the SOLE paragraph rendered for the statement slot in the hero.
 *   The old secondary "source"/context line (<p class="lp-hero-context">),
 *   which used to render below the statement and persisted older
 *   compass-derived sentences such as "I am the founder of …", is gone.
 *
 *   We also re-assert that Edit statement writes profile.statement_manual
 *   and triggers renderLivingProfile() so the hero text actually updates.
 *
 * Usage:  node tests/living-profile-statement-edit.test.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '..', 'studio.html'), 'utf8');

let failed = 0;
function pass(msg) { console.log('  ok  ' + msg); }
function fail(msg) { console.error('  FAIL ' + msg); failed++; }
function assert(cond, msg) { cond ? pass(msg) : fail(msg); }

console.log('hero renders edited statement only');

// Hero owns the canonical statement element with id+data-lp-edit wiring.
assert(/id="lp-hero-statement-text"[^>]*data-lp-edit="statement"/.test(src),
  'hero statement element exposes id=lp-hero-statement-text + data-lp-edit="statement"');

// The legacy secondary context paragraph below the statement is gone:
// no template literal that renders <p class="lp-hero-context">…</p>.
assert(!/<p class="lp-hero-context">/.test(src),
  'hero no longer renders the secondary <p class="lp-hero-context"> line');
assert(!/contextBits \? '<p class="lp-hero-context">/.test(src),
  'no template fragment emits lp-hero-context below the statement');

// Sanity: the statement template fragment is NOT followed by a
// `contextBits ? …` ternary (which was the source of the old source line).
const statementBlock = src.match(/id="lp-hero-statement-text[\s\S]{0,400}/);
assert(!!statementBlock, 'extracted hero statement template region');
if (statementBlock) {
  assert(!/contextBits/.test(statementBlock[0]),
    'statement render region does not reference contextBits');
}

console.log('\nstatement edit persists to profile.statement_manual');
// Edit popover writes statement_manual when type === "statement".
assert(/type === 'statement'/.test(src), 'edit popover handles type "statement"');
// Save-side branch writes p.statement_manual = val.
assert(/} else if \(type === 'statement'\) \{\s*\n\s*p\.statement_manual\s*=\s*val;/.test(src),
  'statement edit writes profile.statement_manual = val (save branch)');

// statementSection prefers manualStatement over any captured/source text.
assert(/var manualStatement = String\(\(profile && \(profile\.statement_manual \|\| profile\.statement\)\) \|\| ''\)/.test(src),
  'statementSection reads profile.statement_manual first');
assert(/value:\s*manualStatement,\s*\n\s*source:\s*manualStatement \? 'captured' : 'empty'/.test(src),
  'statementSection.value is manualStatement only — no fallback to source/import text');

// After save, renderLivingProfile() is invoked so the hero text refreshes.
const savePath = src.match(/p\.statement_manual\s*=\s*val[\s\S]{0,800}renderLivingProfile\(\);/);
assert(!!savePath,
  'statement edit save path calls renderLivingProfile() so the hero re-renders');

if (failed) {
  console.error('\nFAILED: ' + failed + ' check(s).');
  process.exit(1);
} else {
  console.log('\nOK: living-profile statement-edit regression passes.');
}
