/* Studio Window v0.2 — optional per-image link:
 *   1. studioWindowAdd persists a `link` field; normalizeStudioWindowLink
 *      adds https:// to bare domains and rejects javascript:/data: URLs.
 *   2. studioWindowSetLink mutates the matching entry and clears on
 *      empty input.
 *   3. The display renderer wraps a tile in an <a target="_blank"
 *      rel="noopener noreferrer"> only when a safe link is set.
 *   4. The editor exposes a link <input> on each filled slot.
 *
 * Usage:  node tests/studio-window-link.test.js
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
assert(/function normalizeStudioWindowLink\(/.test(src),
  'normalizeStudioWindowLink helper is defined');
assert(/function studioWindowSetLink\(/.test(src),
  'studioWindowSetLink setter is defined');
assert(/link: normalizeStudioWindowLink\(item && item\.link\)/.test(src),
  'studioWindowAdd seeds the link field via the normalizer');
assert(/data-sw-link-id=/.test(src),
  'editor renders a per-item link input with data-sw-link-id');
assert(/sw-tile-link[\s\S]{0,400}target="_blank"[\s\S]{0,200}rel="noopener noreferrer"/.test(src),
  'display renderer wraps tiles in target=_blank rel=noopener noreferrer');
assert(/safeLink = normalizeStudioWindowLink\(it\.link\)/.test(src),
  'display renderer normalizes the stored link before use');

// Dynamically extract + exercise normalizeStudioWindowLink in isolation.
console.log('\nnormalizeStudioWindowLink dynamic behavior');
const fnMatch = src.match(/function normalizeStudioWindowLink\(raw\)\s*\{[\s\S]*?\n\}\n/m);
if (!fnMatch) {
  fail('could not extract normalizeStudioWindowLink');
} else {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(fnMatch[0] + ';\nthis.normalizeStudioWindowLink = normalizeStudioWindowLink;', sandbox);
  const fn = sandbox.normalizeStudioWindowLink;
  assert(fn('') === '', 'empty input → empty output');
  assert(fn('  ') === '', 'whitespace-only input → empty output');
  assert(fn('https://example.com') === 'https://example.com',
    'absolute https URL preserved');
  assert(fn('http://example.com/x?y=1') === 'http://example.com/x?y=1',
    'absolute http URL preserved');
  assert(fn('example.com') === 'https://example.com',
    'bare domain gets https:// prefix');
  assert(fn('example.com/path?q=1') === 'https://example.com/path?q=1',
    'bare domain with path gets https:// prefix');
  assert(fn('mailto:alice@example.com') === 'mailto:alice@example.com',
    'mailto: links preserved');
  assert(fn('javascript:alert(1)') === '',
    'javascript: scheme rejected');
  assert(fn('JAVASCRIPT:alert(1)') === '',
    'javascript: scheme rejected (case-insensitive)');
  assert(fn('data:text/html,foo') === '',
    'data: scheme rejected');
  assert(fn('vbscript:msgbox') === '',
    'vbscript: scheme rejected');
  assert(fn('not a url') === '',
    'non-URL text → empty output');
}

// Render-side check: verify the conditional wrapping logic — we
// can't run renderStudioWindow without the DOM, but we can verify
// the static template has BOTH the wrapped and unwrapped branch.
console.log('\nrenderStudioWindow conditional wrapping');
assert(/if \(safeLink\)/.test(src), 'render branches on safeLink presence');
assert(/sw-tile s-' \+ lpEscape\(it\.room\) \+ ' has-link/.test(src),
  'linked tiles get a has-link modifier');
assert(/aria-label="Open external link for/.test(src),
  'linked tiles include an accessible label');

if (failed) {
  console.error('\nFAILED: ' + failed + ' check(s).');
  process.exit(1);
} else {
  console.log('\nOK: Studio Window link regressions pass.');
}
