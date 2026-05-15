/* Publish to cOMmons — Studio integration test (Phase 1 / Mi→Fa)
 *
 * Guards:
 *   1. The hero-under CTA toolbar (lp-top-cta) renders a "Publish to cOMmons"
 *      button with id="lp-publish-field" (id stable for backward compat).
 *   2. window.publishToField is defined in the inline script.
 *   3. The Mi→Fa OM-veil holder (cuMountOmVeil / cuHoldOmThen) uses the
 *      shared #cu-logo-lockup symbol so the held moment belongs to the
 *      same visual world as the homepage / studio.
 *   4. The publisher POSTs to /field-api/profile with credentials.
 *   5. Visible copy says "cOMmons", not "Field" (the visible-brand rename
 *      Markus asked for — file paths and API routes stay /field for now).
 *
 * Usage:  node tests/publish-to-field.test.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '..', 'studio.html'), 'utf8');

let failed = 0;
function pass(m) { console.log('  ok  ' + m); }
function fail(m) { console.error('  FAIL ' + m); failed++; }

if (src.indexOf("id=\"lp-publish-field\"") === -1 && src.indexOf("id='lp-publish-field'") === -1) {
  fail('Publish to Field button (id="lp-publish-field") not rendered in hero-under CTA toolbar');
} else {
  pass('Publish to Field button rendered');
}

// The button must live inside the JS-built lp-top-cta section, not Studio Door.
// Find the JS string occurrence (the renderer builds the HTML via string concat).
const jsRenderIdx = src.indexOf('html += \'<section class="lp-top-cta"');
const rowEnd = jsRenderIdx >= 0 ? src.indexOf("'</section>'", jsRenderIdx) : -1;
const rowSlice = jsRenderIdx >= 0 && rowEnd > jsRenderIdx ? src.slice(jsRenderIdx, rowEnd) : '';
if (!/lp-publish-field/.test(rowSlice)) {
  fail('Publish to Field is not anchored to the hero-under CTA toolbar (lp-top-cta)');
} else {
  pass('Publish to Field anchored to the lp-top-cta toolbar');
}

if (!/window\.publishToField\s*=/.test(src)) {
  fail('window.publishToField is not defined');
} else {
  pass('window.publishToField defined');
}

if (!/cuMountOmVeil|cu-om-veil/.test(src)) {
  fail('OM-veil holder for the Mi→Fa moment is missing');
} else {
  pass('Mi→Fa OM-veil holder present');
}

if (!/cuPlayOmTone|AudioContext/.test(src)) {
  fail('OM tone (sound-forward, per spec §4.3) is missing');
} else {
  pass('OM tone playback present');
}

if (!/\/field-api\/profile/.test(src)) {
  fail('Publish does not POST to /field-api/profile');
} else {
  pass('Publish POSTs to /field-api/profile');
}

if (!/credentials:\s*['"]include['"]/.test(src)) {
  fail('Publish fetch is missing credentials: "include" for cross-origin Studio→Field session');
} else {
  pass('Publish fetch sends credentials');
}

// Anti-addiction: the publish CTA must not surface counts/metrics.
if (/Publish.*\d+\s*(attunements|likes|followers)/i.test(src)) {
  fail('Publish UI surfaces a count — anti-addiction guardrail violated');
} else {
  pass('Publish UI surfaces no counts (anti-addiction guardrail)');
}

// Visible brand label uses "cOMmons", not the old "Publish to Field" string.
if (!/Publish to cOMmons/.test(src)) {
  fail('Publish button label must say "Publish to cOMmons" (visible brand rename)');
} else {
  pass('Publish button label uses "cOMmons" brand');
}

// The held OM moment must use the shared homepage/studio lockup, not the
// literal ॐ glyph from the first cut.
const veilSliceStart = src.indexOf('cuMountOmVeil');
const veilSliceEnd = src.indexOf('cuPlayOmTone', veilSliceStart);
const veilSlice = veilSliceStart >= 0 ? src.slice(veilSliceStart, veilSliceEnd > 0 ? veilSliceEnd : veilSliceStart + 4000) : '';
if (!/#cu-logo-lockup/.test(veilSlice)) {
  fail('OM veil must reuse the shared #cu-logo-lockup symbol (homepage parity)');
} else {
  pass('OM veil uses the shared CommonUnity lockup');
}

// ---------- cuPublishFieldUrl behavior ----------
// Dynamically extract cuPublishFieldUrl and exercise it under different
// host conditions. Production must NOT fall back to a same-origin blank
// URL (the bug that caused "can't connect" — POST hit Studio's host on
// /field-api/profile, which does not exist there).
const vm = require('vm');
const fnMatch = src.match(/var CU_FIELD_URL_PROD_DEFAULT = '([^']+)';\s*function cuPublishFieldUrl\(\)\s*\{[\s\S]*?\n    \}\n/m);
if (!fnMatch) {
  fail('could not extract cuPublishFieldUrl for dynamic test');
} else {
  var PROD_DEFAULT = fnMatch[1];
  if (!/^https:\/\/commons-production-/.test(PROD_DEFAULT)) {
    fail('production default URL is not the commons-production Railway host: ' + PROD_DEFAULT);
  } else {
    pass('production default URL points to commons-production Railway host');
  }

  function evalIn(env) {
    var sandbox = {
      window: env.window || {},
      document: env.document || { querySelector: function () { return null; } },
      location: env.location || { origin: 'https://example.com' },
    };
    vm.createContext(sandbox);
    vm.runInContext(fnMatch[0] + '; this.cuPublishFieldUrl = cuPublishFieldUrl;', sandbox);
    return sandbox.cuPublishFieldUrl();
  }

  // 1) Production studio host with no override → must return the cOMmons URL,
  //    never the empty string (the original bug).
  var prodResult = evalIn({
    window: {},
    location: { origin: 'https://commonunity-production.up.railway.app' },
  });
  if (prodResult === '' || prodResult.indexOf('/field-api') !== -1) {
    fail('production publish URL falls back to blank/same-origin (the live bug): "' + prodResult + '"');
  } else if (prodResult.indexOf('commons-production-') === -1) {
    fail('production publish URL does not point at the cOMmons service: "' + prodResult + '"');
  } else {
    pass('production publish URL targets the cOMmons service');
  }

  // 2) localhost dev still gets the local fallback.
  var localResult = evalIn({
    window: {},
    location: { origin: 'http://localhost:3000' },
  });
  if (localResult !== 'http://localhost:5050') {
    fail('localhost dev fallback broken — got: "' + localResult + '"');
  } else {
    pass('localhost dev fallback preserved (http://localhost:5050)');
  }

  // 3) window.CU_FIELD_URL overrides everything.
  var overrideResult = evalIn({
    window: { CU_FIELD_URL: 'https://override.example.com' },
    location: { origin: 'https://commonunity-production.up.railway.app' },
  });
  if (overrideResult !== 'https://override.example.com') {
    fail('window.CU_FIELD_URL override not honored — got: "' + overrideResult + '"');
  } else {
    pass('window.CU_FIELD_URL override honored');
  }

  // 4) <meta name="cu-field-url"> override works when window global is absent.
  var metaResult = evalIn({
    window: {},
    document: { querySelector: function (sel) {
      if (sel === 'meta[name="cu-field-url"]') return { content: 'https://meta.example.com' };
      return null;
    } },
    location: { origin: 'https://commonunity-production.up.railway.app' },
  });
  if (metaResult !== 'https://meta.example.com') {
    fail('<meta name="cu-field-url"> override not honored — got: "' + metaResult + '"');
  } else {
    pass('<meta name="cu-field-url"> override honored');
  }
}

// The published-profile "Open" link must use the same cOMmons base URL,
// not a fragment of the Studio host. The renderer concatenates `base` with
// the profile.url path returned by the API.
if (!/state\.innerHTML\s*=\s*'Published to the cOMmons\.[\s\S]{0,200}'\s*\+\s*base\s*\+\s*j\.profile\.url/.test(src)) {
  fail('Open link after publish does not use the cOMmons base URL');
} else {
  pass('Open link after publish uses the cOMmons base URL');
}

// 401/403 must surface an auth-distinct message, not a generic "can't connect".
if (!/responseStatus\s*===\s*401\s*\|\|\s*responseStatus\s*===\s*403/.test(src)) {
  fail('Publish does not distinguish auth-required responses (401/403)');
} else {
  pass('Publish distinguishes auth-required (401/403) from connection failure');
}

if (failed) { console.error('\n' + failed + ' test(s) failed'); process.exit(1); }
console.log('\nAll publish-to-cOMmons tests passed.');
