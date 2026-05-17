// Live-render regression for cuRenderOmCipherSection.
//
// Extracts the renderer block + the input-builder + cipher-name helper
// from studio.html, evaluates them against a fake window+document, and
// verifies the engine output is actually painted into the reserved
// data-* hooks. Pins the canonical SVG sigil injection, gematria grid,
// activation sequence label, and the disabled-flag fallback.
//
// Run:  node tests/om-cipher-section-render.test.js

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');

// Load the canonical engine. The renderer reads window.cuOmCipher.generate
// so we attach it manually onto the fake window below.
const om = require('../sdk/om_cipher.js');

const html = fs.readFileSync(path.join(__dirname, '..', 'studio.html'), 'utf8');

// ─── Extract renderer source from studio.html ───
function extractFn(name) {
  const re = new RegExp('function\\s+' + name + '\\s*\\(');
  const start = html.search(re);
  assert.ok(start > 0, 'could not locate function ' + name);
  // Scan braces to find matching close.
  let depth = 0, i = html.indexOf('{', start);
  assert.ok(i > 0);
  const open = i;
  for (; i < html.length; i++) {
    const c = html[i];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  return html.slice(start, i);
}

const SRC_CIPHER_NAME = extractFn('cuCipherNameFromRecord');
const SRC_ACTIVATION  = extractFn('cuActivationLineFromDisplay');
const SRC_BUILD_INPUT = extractFn('cuBuildOmCipherInput');
// Strip the outer try/catch from the renderer so test failures surface
// the underlying assertion rather than silently no-op.
let SRC_RENDER = extractFn('cuRenderOmCipherSection');
SRC_RENDER = SRC_RENDER
  .replace(/try\s*\{\s*\n\s*if\s*\(window\.CU_OM_CIPHER_ENABLED/, '{ if (window.CU_OM_CIPHER_ENABLED')
  .replace(/\}\s*catch\s*\(_\)\s*\{[^}]*\}\s*\}\s*$/, '} }');

// ─── Minimal fake DOM ───
class FakeClassList {
  constructor() { this.set = new Set(); }
  add(c) { this.set.add(c); }
  remove(c) { this.set.delete(c); }
  contains(c) { return this.set.has(c); }
  toString() { return Array.from(this.set).join(' '); }
}
class FakeEl {
  constructor(tag) {
    this.tagName = (tag || 'div').toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.attrs = {};
    this.classList = new FakeClassList();
    this._inner = '';
    this.textContent = '';
  }
  set innerHTML(v) { this._inner = v; this._htmlReceived = v; }
  get innerHTML() { return this._inner; }
  appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k] != null ? this.attrs[k] : null; }
  querySelector(sel) {
    const all = [this, ...this._descendants()];
    for (const el of all) if (matches(el, sel)) return el;
    return null;
  }
  querySelectorAll(sel) {
    const all = [this, ...this._descendants()];
    return all.filter(el => matches(el, sel));
  }
  closest(sel) { let n = this; while (n) { if (matches(n, sel)) return n; n = n.parentNode; } return null; }
  _descendants() {
    const out = [];
    (function walk(node) {
      for (const c of node.children) { out.push(c); walk(c); }
    })(this);
    return out;
  }
}
function matches(el, sel) {
  if (!el) return false;
  // Support: [data-x], [data-x="v"], .class, tag.class, '[data-x="..."]', '.lp-hero-slot.is-sigil'
  if (sel.startsWith('[') && sel.endsWith(']')) {
    const inner = sel.slice(1, -1);
    const eq = inner.indexOf('=');
    if (eq < 0) return el.attrs[inner] != null;
    const k = inner.slice(0, eq);
    let v = inner.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    return el.attrs[k] === v;
  }
  if (sel.startsWith('.')) {
    const parts = sel.slice(1).split('.');
    return parts.every(p => el.classList.contains(p));
  }
  // Two-token "tag.class" combinations
  const dot = sel.indexOf('.');
  if (dot > 0) {
    const tag = sel.slice(0, dot).toUpperCase();
    const rest = '.' + sel.slice(dot + 1);
    if (el.tagName !== tag) return false;
    return matches(el, rest);
  }
  return el.tagName === sel.toUpperCase();
}

function buildSection() {
  const sec = new FakeEl('section');
  sec.setAttribute('data-cu-om-cipher-section', '1');
  sec.classList.add('lp-om-cipher-section');
  function addLeaf(parent, tag, attrs, classes) {
    const e = new FakeEl(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v));
    (classes || []).forEach(c => e.classList.add(c));
    parent.appendChild(e);
    return e;
  }
  const slot = addLeaf(sec, 'div', {}, ['lp-hero-slot', 'is-sigil']);
  addLeaf(sec, 'em', { 'data-cu-om-cipher-seed': '1' });
  addLeaf(sec, 'h4', { 'data-cu-om-cipher-name': '1' });
  addLeaf(sec, 'p',  { 'data-cu-om-cipher-mantra': '1' });
  addLeaf(sec, 'p',  { 'data-cu-om-cipher-field-pattern': '1' });
  addLeaf(sec, 'p',  { 'data-cu-om-cipher-narrative': '1' });
  addLeaf(sec, 'p',  { 'data-cu-om-cipher-contemplation': '1' });
  addLeaf(sec, 'p',  { 'data-cu-om-cipher-activation': '1' });
  addLeaf(sec, 'p',  { 'data-cu-om-cipher-bhramari': '1' });
  ['life_path','expression','soul_urge','personality','lunar_phase','solar_quarter','temporal_gate'].forEach(k => {
    const item = addLeaf(sec, 'div', { 'data-cu-om-cipher-gematria': k }, ['oc-source-item', 'is-pending']);
    addLeaf(item, 'dt');
    addLeaf(item, 'dd');
  });
  return sec;
}

// ─── Fake window / globals ───
function makeWindow(flagOn) {
  return {
    CU_OM_CIPHER_ENABLED: !!flagOn,
    CU_BHRAMARI_CAPTURE_ENABLED: !!flagOn,
    cuOmCipher: om,
    state: {
      compassData: {
        profile: {
          legal_name: 'Markus Lehto',
          preferred_name: 'Markus',
          birth_date: '1973-11-18',
          birth_time: '03:21',
          birth_place: { lat: 46.4917, lng: -80.9930, city: 'Sudbury', country: 'Canada' },
        },
        points: {},
        seed_syllable: 'Om',
      },
    },
  };
}

// Build the function bodies inside a fake context.
function makeRenderer(win) {
  const ctx = {
    window: win,
    document: { querySelectorAll: () => [] },
  };
  // cuOmCipherDisplay stub — emulates the existing bridge enough to feed
  // the renderer a label fragment for the activation line.
  ctx.cuOmCipherDisplay = function () { return { label: 'Root 22 · Resonance' }; };
  ctx.cuBuildPublishPayload = function () { return {}; };

  // Use Function constructor to evaluate the extracted source.
  const fn = new Function(
    'window', 'document', 'cuOmCipherDisplay', 'cuBuildPublishPayload',
    SRC_CIPHER_NAME + '\n' +
    SRC_ACTIVATION + '\n' +
    SRC_BUILD_INPUT + '\n' +
    SRC_RENDER + '\n' +
    'return { render: cuRenderOmCipherSection, buildInput: cuBuildOmCipherInput, cipherName: cuCipherNameFromRecord };'
  );
  // Mirror the renderer's reliance on globals via window.* — we also expose
  // cuOmCipherDisplay on window so the inner lookup `window.cuOmCipherDisplay`
  // resolves.
  win.cuOmCipherDisplay = ctx.cuOmCipherDisplay;
  return fn(win, ctx.document, ctx.cuOmCipherDisplay, ctx.cuBuildPublishPayload);
}

let passed = 0, failed = 0;
function test(name, body) {
  try { body(); console.log('  ✓', name); passed++; }
  catch (e) { console.error('  ✗', name, '\n   ', e.stack || e.message); failed++; }
}

console.log('cuRenderOmCipherSection — flag gating');

test('flag off → no painting, slot keeps original innerHTML', () => {
  const win = makeWindow(false);
  const r = makeRenderer(win);
  const sec = buildSection();
  const slot = sec.querySelector('.lp-hero-slot.is-sigil');
  slot.innerHTML = '<span>ॐ</span>';
  r.render({}, sec);
  assert.equal(slot.innerHTML, '<span>ॐ</span>', 'slot must keep ॐ when flag off');
  assert.equal(sec.getAttribute('data-cu-om-cipher-state'), null, 'no state attr when flag off');
});

console.log('\ncuRenderOmCipherSection — engine-driven painting (Markus baseline)');

test('flag on + sealed inputs → SVG sigil injected', () => {
  const win = makeWindow(true);
  const r = makeRenderer(win);
  const sec = buildSection();
  const slot = sec.querySelector('.lp-hero-slot.is-sigil');
  slot.innerHTML = '<span>ॐ</span>';
  r.render({}, sec);
  assert.equal(sec.getAttribute('data-cu-om-cipher-state'), 'sealed');
  assert.ok(slot.innerHTML.startsWith('<svg'), 'slot innerHTML should start with <svg>');
  assert.ok(slot.classList.contains('cu-om-cipher-sigil-rendered'));
  assert.equal(slot.getAttribute('data-cu-om-cipher-sigil'), '1');
});

test('cipher seal (data-cu-om-cipher-seed) populated with hash fragment', () => {
  const win = makeWindow(true);
  const r = makeRenderer(win);
  const sec = buildSection();
  r.render({}, sec);
  const seedEl = sec.querySelector('[data-cu-om-cipher-seed]');
  assert.ok(seedEl, 'seed element exists');
  assert.match(seedEl.textContent, /^[0-9a-f]{8}…[0-9a-f]{4}$/, 'seed format <8>…<4>');
});

test('gematria grid filled — Life Path 22 master flagged', () => {
  const win = makeWindow(true);
  const r = makeRenderer(win);
  const sec = buildSection();
  r.render({}, sec);
  const lp = sec.querySelector('[data-cu-om-cipher-gematria="life_path"]');
  assert.ok(lp, 'life_path slot');
  assert.ok(lp.querySelector('dd').textContent.startsWith('22'), 'Life Path should be 22');
  assert.ok(lp.classList.contains('is-master'), 'Life Path 22 must carry is-master class');
  assert.ok(!lp.classList.contains('is-pending'), 'should not be pending when value present');
});

test('expression / soul_urge / personality painted from name resonance', () => {
  const win = makeWindow(true);
  const r = makeRenderer(win);
  const sec = buildSection();
  r.render({}, sec);
  ['expression','soul_urge','personality'].forEach(k => {
    const el = sec.querySelector('[data-cu-om-cipher-gematria="' + k + '"]');
    assert.ok(el, k + ' slot');
    assert.ok(el.querySelector('dd').textContent.length > 0, k + ' value painted');
    assert.ok(!el.classList.contains('is-pending'), k + ' not pending');
  });
});

test('activation sequence line populated from display bridge', () => {
  const win = makeWindow(true);
  const r = makeRenderer(win);
  const sec = buildSection();
  r.render({}, sec);
  const act = sec.querySelector('[data-cu-om-cipher-activation]');
  assert.equal(act.textContent, 'Root 22 · Resonance');
  assert.ok(!act.classList.contains('is-pending'));
});

test('cipher name composed from gematria + lunar phase tokens', () => {
  const win = makeWindow(true);
  const r = makeRenderer(win);
  const sec = buildSection();
  r.render({}, sec);
  const nameEl = sec.querySelector('[data-cu-om-cipher-name]');
  assert.ok(nameEl.textContent.startsWith('Markus'), 'name leads with preferred name');
  assert.ok(nameEl.textContent.includes('Master Builder'), 'name carries Life Path label');
  assert.ok(!nameEl.classList.contains('is-pending'));
});

test('mantra uses sealed seed_syllable (no fabrication)', () => {
  const win = makeWindow(true);
  const r = makeRenderer(win);
  const sec = buildSection();
  r.render({}, sec);
  const mantra = sec.querySelector('[data-cu-om-cipher-mantra]');
  assert.ok(mantra.textContent.includes('Om'), 'mantra surfaces seed-syllable');
  assert.ok(!mantra.classList.contains('is-pending'));
});

test('mantra prefers user-provided personal_mantra when set', () => {
  const win = makeWindow(true);
  win.state.compassData.profile.personal_mantra = 'Sat-Chit-Ananda';
  const r = makeRenderer(win);
  const sec = buildSection();
  r.render({}, sec);
  const mantra = sec.querySelector('[data-cu-om-cipher-mantra]');
  assert.equal(mantra.textContent, 'Sat-Chit-Ananda');
});

test('flag on but no birth_date → pending-source state, surfaces left as placeholders', () => {
  const win = makeWindow(true);
  win.state.compassData.profile.birth_date = null;
  delete win.state.compassData.profile.birthdate;
  const r = makeRenderer(win);
  const sec = buildSection();
  const slot = sec.querySelector('.lp-hero-slot.is-sigil');
  slot.innerHTML = '<span>ॐ</span>';
  r.render({}, sec);
  assert.equal(sec.getAttribute('data-cu-om-cipher-state'), 'pending-source');
  assert.equal(slot.innerHTML, '<span>ॐ</span>', 'ॐ fallback preserved when no birth_date');
});

console.log('\ncuBuildOmCipherInput — alias coverage');

test('reads canonical birth_date / birth_time / birth_place', () => {
  const win = makeWindow(true);
  const r = makeRenderer(win);
  const input = r.buildInput(null);
  assert.equal(input.birth_date, '1973-11-18');
  assert.equal(input.birth_time, '03:21');
  assert.equal(input.birth_place.city, 'Sudbury');
});

test('falls back to legacy dob / pob aliases', () => {
  const win = makeWindow(true);
  delete win.state.compassData.profile.birth_date;
  delete win.state.compassData.profile.birth_place;
  win.state.compassData.profile.dob = '1973-11-18';
  win.state.compassData.profile.pob = 'Sudbury, Canada';
  const r = makeRenderer(win);
  const input = r.buildInput(null);
  assert.equal(input.birth_date, '1973-11-18');
  assert.equal(input.birth_place.city, 'Sudbury, Canada');
});

console.log('\n' + (failed === 0 ? '✅ all passed' : '❌ ' + failed + ' failed') +
  ` (${passed} passed, ${failed} failed)`);
if (failed > 0) process.exit(1);
