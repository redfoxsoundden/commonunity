// Magic-link auth tests — focused on link URL generation and mail fallback.
// These do NOT send real email; they only exercise pure helpers and the
// console-fallback path that runs when SMTP is unset.

process.env.NODE_ENV = "test";
delete process.env.SMTP_HOST;
delete process.env.SMTP_USER;
delete process.env.SMTP_PASS;

const assert = require("node:assert/strict");

let passed = 0, failed = 0;
function test(name, fn) {
  const run = async () => {
    try { await fn(); console.log("  ✓", name); passed++; }
    catch (e) { console.error("  ✗", name, "\n    ", e.message); failed++; }
  };
  return run();
}

(async () => {
  console.log("field/auth: publicBaseUrl + magic-link delivery fallback");

  // Snapshot + clear env vars that the helper reads so tests are deterministic.
  const SAVED = {
    FIELD_BASE_URL: process.env.FIELD_BASE_URL,
    CU_FIELD_URL: process.env.CU_FIELD_URL,
    RAILWAY_PUBLIC_DOMAIN: process.env.RAILWAY_PUBLIC_DOMAIN,
  };
  delete process.env.FIELD_BASE_URL;
  delete process.env.CU_FIELD_URL;
  delete process.env.RAILWAY_PUBLIC_DOMAIN;

  const { publicBaseUrl, deliverMagicLink } = require("../src/auth");

  const fakeReq = (host, proto = "http") => ({
    protocol: proto,
    get: (h) => (h.toLowerCase() === "host" ? host : undefined),
  });

  await test("publicBaseUrl: falls back to request host when nothing configured", () => {
    assert.equal(publicBaseUrl(fakeReq("localhost:5050")), "http://localhost:5050");
  });

  await test("publicBaseUrl: FIELD_BASE_URL wins over request host", () => {
    process.env.FIELD_BASE_URL = "https://commonunity.io";
    try {
      assert.equal(publicBaseUrl(fakeReq("commons-production-xxxx.railway.internal")), "https://commonunity.io");
    } finally { delete process.env.FIELD_BASE_URL; }
  });

  await test("publicBaseUrl: trims trailing slash from configured base", () => {
    process.env.FIELD_BASE_URL = "https://commonunity.io/";
    try { assert.equal(publicBaseUrl(fakeReq("x")), "https://commonunity.io"); }
    finally { delete process.env.FIELD_BASE_URL; }
  });

  await test("publicBaseUrl: CU_FIELD_URL is honored when FIELD_BASE_URL is unset", () => {
    process.env.CU_FIELD_URL = "https://cu-field.example.com";
    try { assert.equal(publicBaseUrl(fakeReq("x")), "https://cu-field.example.com"); }
    finally { delete process.env.CU_FIELD_URL; }
  });

  await test("publicBaseUrl: RAILWAY_PUBLIC_DOMAIN is upgraded to https", () => {
    process.env.RAILWAY_PUBLIC_DOMAIN = "commons-production.up.railway.app";
    try {
      assert.equal(publicBaseUrl(fakeReq("commons-production-xxxx.railway.internal")), "https://commons-production.up.railway.app");
    } finally { delete process.env.RAILWAY_PUBLIC_DOMAIN; }
  });

  await test("deliverMagicLink: no SMTP config -> console fallback, no throw", async () => {
    // Silence console.log for this test
    const origLog = console.log;
    let logged = "";
    console.log = (...args) => { logged += args.join(" ") + "\n"; };
    try {
      const r = await deliverMagicLink({ email: "t@example.com", link: "https://x/y" });
      assert.equal(r.delivered, false);
      assert.equal(r.devLink, "https://x/y");
      assert.match(logged, /magic link for t@example.com/);
    } finally { console.log = origLog; }
  });

  await test("deliverMagicLink: nodemailer module is resolvable (regression for missing dep)", () => {
    // The whole reason for this PR: confirm `require('nodemailer')` does not throw.
    // We only verify the module loads; we don't actually open an SMTP connection.
    const nodemailer = require("nodemailer");
    assert.equal(typeof nodemailer.createTransport, "function");
  });

  // Restore env
  for (const [k, v] of Object.entries(SAVED)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
})();
