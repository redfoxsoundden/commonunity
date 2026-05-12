/* Contact fields v0.6 — Compass export + Studio render + edit:
 *   1. buildCompassExport (index.html) collects email / phone / whatsapp
 *      / website / calendar_url / contact_url / linkedin / instagram /
 *      twitter / youtube into profile.contact, preserving aliases and
 *      mirroring back to the flat profile.* keys Studio already reads.
 *   2. studio.html exposes lpBuildContactRows that produces safe hrefs
 *      (mailto:, tel:, wa.me/, https://...) for the populated channels.
 *   3. studio.html renders a "Get in touch" section with editable rows
 *      and an "Open" link per filled channel that uses target=_blank
 *      with rel=noopener noreferrer.
 *   4. The edit popover handles type === 'contact' and persists into
 *      window.state.compassData.profile.contact / flat aliases.
 *
 * Usage:  node tests/contact-fields.test.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const indexSrc  = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
const studioSrc = fs.readFileSync(path.resolve(__dirname, '..', 'studio.html'), 'utf8');

let failed = 0;
function pass(msg) { console.log('  ok  ' + msg); }
function fail(msg) { console.error('  FAIL ' + msg); failed++; }
function assert(cond, msg) { cond ? pass(msg) : fail(msg); }

console.log('compass export — structured profile.contact');
const exportMatch = indexSrc.match(/function buildCompassExport\(s\)\s*\{[\s\S]*?\n  return out;\n\}/m);
if (!exportMatch) {
  fail('could not extract buildCompassExport');
} else {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(exportMatch[0] + ';\nthis.buildCompassExport = buildCompassExport;', sandbox);
  const fn = sandbox.buildCompassExport;

  // Case 1 — flat aliases get rolled up into profile.contact AND
  // mirrored back so older render paths still work.
  const out1 = fn({
    companion: 'Vesna Lucca',
    profile: {
      email: 'v@example.com',
      telephone: '+1 555 100 2000',
      whats_app: '+15551002000',
      calendly_url: 'https://cal.com/vesna',
      site_url: 'vesna.example',
      linkedin_url: 'https://linkedin.com/in/vesna',
      instagram_url: 'https://instagram.com/vesna'
    }
  });
  assert(out1.profile.contact, 'profile.contact block exists on output');
  assert(out1.profile.contact.email === 'v@example.com', 'email collected from profile.email');
  assert(out1.profile.contact.phone === '+1 555 100 2000', 'phone collected from profile.telephone alias');
  assert(out1.profile.contact.whatsapp === '+15551002000', 'whatsapp collected from profile.whats_app alias');
  assert(out1.profile.contact.calendar_url === 'https://cal.com/vesna',
    'calendar_url collected from profile.calendly_url alias');
  assert(out1.profile.contact.website === 'vesna.example',
    'website collected from profile.site_url alias');
  assert(out1.profile.contact.linkedin_url === 'https://linkedin.com/in/vesna',
    'linkedin_url preserved on contact block');
  assert(out1.profile.contact.instagram === 'https://instagram.com/vesna',
    'instagram collected from profile.instagram_url alias');
  // Mirror-back assertions: Studio's old render paths still read flat keys.
  assert(out1.profile.phone === '+1 555 100 2000', 'flat profile.phone mirrored from contact');
  assert(out1.profile.whatsapp === '+15551002000',  'flat profile.whatsapp mirrored from contact');
  assert(out1.profile.calendar_url === 'https://cal.com/vesna',
    'flat profile.calendar_url mirrored from contact');
  assert(out1.profile.website === 'vesna.example', 'flat profile.website mirrored from contact');

  // Case 2 — explicit profile.contact wins over flat aliases.
  const out2 = fn({
    companion: 'Vesna',
    profile: {
      email: 'old@example.com',
      contact: { email: 'new@example.com' }
    }
  });
  assert(out2.profile.contact.email === 'new@example.com',
    'explicit profile.contact.email wins over profile.email');

  // Case 3 — nothing set → no contact block keys (but key may exist as empty object).
  const out3 = fn({ companion: 'Vesna', profile: {} });
  assert(!out3.profile.contact || Object.keys(out3.profile.contact).length === 0,
    'no contact fields → profile.contact is absent or empty');
}

console.log('\nstudio.html — lpBuildContactRows + Get in touch');
assert(/function lpBuildContactRows\(profile\)/.test(studioSrc),
  'lpBuildContactRows helper defined');
assert(/lp-git-grid/.test(studioSrc), 'Get in touch grid class present');
assert(/var gitHeading = 'Get in <em>touch<\/em>'/.test(studioSrc),
  'Get in touch heading present in render path');
assert(/Contact me · across the threshold/.test(studioSrc),
  'Contact me eyebrow present');
assert(/data-lp-edit="contact"/.test(studioSrc),
  'Get in touch rows expose data-lp-edit="contact"');
assert(/target="_blank" rel="noopener noreferrer"/.test(studioSrc),
  'Open links use target=_blank rel=noopener noreferrer');
assert(/contactLabels = \{/.test(studioSrc),
  'edit popover handles contact field labels');
assert(/p\.contact\[field\] = val/.test(studioSrc),
  'saving contact writes profile.contact[field]');
assert(/delete p\.contact\[field\]/.test(studioSrc),
  'empty contact value clears profile.contact[field]');

// Dynamically exercise lpBuildContactRows with a stub for lpNormUrl.
console.log('\nlpBuildContactRows dynamic behavior');
const rowsMatch = studioSrc.match(/function lpBuildContactRows\(profile\)\s*\{[\s\S]*?\n      return rows;\n    \}/m);
if (!rowsMatch) {
  fail('could not extract lpBuildContactRows');
} else {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(
    'function lpNormUrl(u) { return String(u || "").trim().replace(/^(https?):\\s*\\/\\//i, "$1://"); }\n' +
    rowsMatch[0] + ';\nthis.lpBuildContactRows = lpBuildContactRows;',
    sandbox
  );
  const fn = sandbox.lpBuildContactRows;

  // 1. Email → mailto:
  const r1 = fn({ contact: { email: 'a@b.com' } });
  const emailRow = r1.find(function (r) { return r.kind === 'email'; });
  assert(emailRow && emailRow.href === 'mailto:a@b.com', 'email row produces mailto: href');

  // 2. Phone → tel: with whitespace stripped.
  const r2 = fn({ contact: { phone: '+1 555 100 2000' } });
  const phoneRow = r2.find(function (r) { return r.kind === 'phone'; });
  assert(phoneRow && phoneRow.href === 'tel:+15551002000', 'phone row produces tel: href');

  // 3. WhatsApp numeric → wa.me/...; URL preserved.
  const r3 = fn({ contact: { whatsapp: '+1 (555) 100-2000' } });
  const waRow = r3.find(function (r) { return r.kind === 'whatsapp'; });
  assert(waRow && waRow.href === 'https://wa.me/15551002000',
    'whatsapp numeric → https://wa.me/<digits>');
  const r3b = fn({ contact: { whatsapp: 'https://wa.me/15551002000' } });
  const waRow2 = r3b.find(function (r) { return r.kind === 'whatsapp'; });
  assert(waRow2 && waRow2.href === 'https://wa.me/15551002000',
    'whatsapp URL preserved as-is');

  // 4. Bare-domain website → https:// prefix.
  const r4 = fn({ contact: { website: 'example.com' } });
  const siteRow = r4.find(function (r) { return r.kind === 'website'; });
  assert(siteRow && siteRow.href === 'https://example.com',
    'bare-domain website → https:// prefix');

  // 5. Empty profile → empty rows.
  const r5 = fn({});
  assert(r5.length === 0, 'empty profile → 0 rows');

  // 6. Flat aliases (no profile.contact) still work.
  const r6 = fn({ email: 'a@b.com', calendar_url: 'https://cal.com/x' });
  assert(r6.some(function (r) { return r.kind === 'email'; }),
    'flat profile.email is read when profile.contact absent');
  assert(r6.some(function (r) { return r.kind === 'calendar_url'; }),
    'flat profile.calendar_url is read when profile.contact absent');
}

if (failed) {
  console.error('\nFAILED: ' + failed + ' check(s).');
  process.exit(1);
} else {
  console.log('\nOK: contact field regressions pass.');
}
