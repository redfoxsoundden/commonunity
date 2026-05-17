// Layer 6 — contemplative outputs.
//
// Verifies:
//   - The 108-entry mantra table is loaded and indexed deterministically.
//   - Archetypal story seed composes from expression / soul urge / personality.
//   - Cipher contemplation returns the lunar-phase phrase + solar modifier.
//   - The Markus baseline (LP22, Ex8, SU6, Pe2, lunar phase 7) maps to a
//     concrete, stable entry.
//
// Run:  node tests/om-cipher-layer6.test.js

'use strict';

const assert = require('node:assert/strict');
const om = require('../sdk/om_cipher.js');
const data = require('../sdk/om_cipher_layer6_data.js');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  ✓', name); passed++; }
  catch (e) { console.error('  ✗', name, '\n   ', e.message); failed++; }
}

console.log('Layer 6 — mantra table');

test('table contains exactly 108 entries', () => {
  assert.equal(data.MANTRA_TABLE.size, 108);
  assert.equal(data.MANTRA_TABLE.entries.length, 108);
});

test('every entry has mantra + keynote + life_path_affinity', () => {
  for (const e of data.MANTRA_TABLE.entries) {
    assert.ok(typeof e.mantra === 'string' && e.mantra.length > 0);
    assert.ok(typeof e.keynote === 'string');
    assert.ok(Array.isArray(e.life_path_affinity));
  }
});

test('omCipherMantra: deterministic — same inputs return same entry', () => {
  const a = om.omCipherMantra(22, 8, 7);
  const b = om.omCipherMantra(22, 8, 7);
  assert.deepEqual(a, b);
  assert.equal(a.index, (22 + 8 + 7) % 108);
});

test('omCipherMantra: different inputs return different indices', () => {
  const a = om.omCipherMantra(1, 1, 0);
  const b = om.omCipherMantra(2, 2, 0);
  assert.notEqual(a.index, b.index);
});

console.log('\nLayer 6 — archetypal story seed');

test('archetypalStorySeed: Markus baseline (Ex8, SU6) resolves the keyed 8_6 entry', () => {
  const s = om.archetypalStorySeed(8, 6, 2);
  assert.ok(s, 'story seed returned');
  assert.equal(s.key, '8_6');
  assert.equal(s.source, 'keyed');
  assert.ok(/paradox of power and service/.test(s.seed),
    'keyed 8_6 story carries the canonical opening line');
});

test('archetypalStorySeed: falls back to fragment composition when key missing', () => {
  // Pick an Expression/Soul Urge pair that is intentionally not in the
  // keyed stories table to exercise the fallback path. The composed
  // seed must still carry the three slot fragments.
  const s = om.archetypalStorySeed(4, 2, 3);
  assert.ok(s, 'fallback seed returned');
  assert.equal(s.source, 'fragments');
  assert.ok(s.expression_fragment);
  assert.ok(s.soul_urge_fragment);
  assert.ok(s.personality_fragment);
  assert.ok(s.seed.includes(s.expression_fragment));
});

test('archetypalStorySeed: deterministic — same inputs return same seed', () => {
  const a = om.archetypalStorySeed(8, 6, 2);
  const b = om.archetypalStorySeed(8, 6, 2);
  assert.equal(a.seed, b.seed);
});

test('archetypalStorySeed: returns null on no inputs', () => {
  assert.equal(om.archetypalStorySeed(null, null, null), null);
});

console.log('\nLayer 6 — cipher contemplation');

test('cipherContemplation: phase 6 is the documented "I do less now, and allow more."', () => {
  const c = om.cipherContemplation(6, 0);
  assert.ok(c);
  assert.equal(c.phrase, 'I do less now, and allow more.');
});

test('cipherContemplation: all 8 lunar phases resolve', () => {
  for (let i = 0; i < 8; i++) {
    const c = om.cipherContemplation(i, 0);
    assert.ok(c && c.phrase, 'phase ' + i + ' must resolve');
  }
});

test('cipherContemplation: includes a solar modifier when provided', () => {
  const c = om.cipherContemplation(0, 2);
  assert.ok(c.solar_modifier);
  assert.ok(c.combined.includes(c.phrase));
  assert.ok(c.combined.includes(c.solar_modifier));
});

console.log('\nLayer 6 — engine integration (Markus baseline)');

test('generate() surfaces Layer 6 outputs in metadata', () => {
  process.env.OM_CIPHER_ENABLED = '1';
  const rec = om.generate({
    birth_date: '1973-11-18',
    birth_time: '03:21',
    legal_name: 'Markus Lehto',
    preferred_name: 'Markus',
  }, { featureFlag: true });
  assert.ok(!rec.pending);
  assert.ok(rec.metadata.om_cipher_mantra, 'om_cipher_mantra present');
  assert.ok(rec.metadata.om_cipher_mantra.mantra);
  assert.ok(rec.metadata.archetypal_story_seed, 'archetypal_story_seed present');
  assert.ok(rec.metadata.archetypal_story_seed.seed.length > 0);
  assert.ok(rec.metadata.cipher_contemplation, 'cipher_contemplation present');
  assert.ok(rec.metadata.cipher_contemplation.phrase);
});

test('temporal_gate label uses "local birth time" wording (Rev 10), not "UTC"', () => {
  process.env.OM_CIPHER_ENABLED = '1';
  const rec = om.generate({
    birth_date: '1973-11-18',
    birth_time: '03:21',
    legal_name: 'Markus Lehto',
  }, { featureFlag: true });
  const label = rec.metadata.temporal_gate.label;
  assert.ok(/local birth time/.test(label), 'label uses local birth time wording: ' + label);
  assert.ok(!/UTC/.test(label), 'label must not mention UTC: ' + label);
});

console.log('\n' + (failed === 0 ? '✅ all passed' : '❌ ' + failed + ' failed') +
  ` (${passed} passed, ${failed} failed)`);
if (failed > 0) process.exit(1);
