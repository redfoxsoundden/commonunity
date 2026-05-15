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

  // ── SMTP transport config: timeouts + secure/port parsing ───────────────
  // We intercept nodemailer.createTransport so no real socket is opened.
  // The deliverMagicLink module was already required above, so monkey-patch
  // the cached nodemailer module's createTransport.
  const nodemailer = require("nodemailer");
  const origCreateTransport = nodemailer.createTransport;

  function withFakeTransport(captured, fn) {
    nodemailer.createTransport = (opts) => {
      captured.opts = opts;
      return { sendMail: async () => ({ messageId: "<fake@test>" }) };
    };
    const SMTP_SAVED = {
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_SECURE: process.env.SMTP_SECURE,
      SMTP_CONNECTION_TIMEOUT_MS: process.env.SMTP_CONNECTION_TIMEOUT_MS,
      SMTP_GREETING_TIMEOUT_MS: process.env.SMTP_GREETING_TIMEOUT_MS,
      SMTP_SOCKET_TIMEOUT_MS: process.env.SMTP_SOCKET_TIMEOUT_MS,
    };
    return Promise.resolve(fn()).finally(() => {
      nodemailer.createTransport = origCreateTransport;
      for (const [k, v] of Object.entries(SMTP_SAVED)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    });
  }

  await test("deliverMagicLink: applies explicit short timeouts by default (no 30s hangs)", async () => {
    const captured = {};
    await withFakeTransport(captured, async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_USER = "u";
      process.env.SMTP_PASS = "p";
      delete process.env.SMTP_CONNECTION_TIMEOUT_MS;
      delete process.env.SMTP_GREETING_TIMEOUT_MS;
      delete process.env.SMTP_SOCKET_TIMEOUT_MS;
      const r = await deliverMagicLink({ email: "x@y.z", link: "https://x/y?token=abcdef123456" });
      assert.equal(r.delivered, true);
      assert.equal(captured.opts.connectionTimeout, 10000);
      assert.equal(captured.opts.greetingTimeout, 10000);
      assert.equal(captured.opts.socketTimeout, 12000);
      // Sanity: each timeout is well under the 30s prod ceiling we hit before.
      for (const k of ["connectionTimeout", "greetingTimeout", "socketTimeout"]) {
        assert.ok(captured.opts[k] <= 15000, `${k} must be <=15s, got ${captured.opts[k]}`);
      }
    });
  });

  await test("deliverMagicLink: SMTP_*_TIMEOUT_MS env vars override defaults", async () => {
    const captured = {};
    await withFakeTransport(captured, async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_USER = "u";
      process.env.SMTP_PASS = "p";
      process.env.SMTP_CONNECTION_TIMEOUT_MS = "8000";
      process.env.SMTP_GREETING_TIMEOUT_MS = "9000";
      process.env.SMTP_SOCKET_TIMEOUT_MS = "11000";
      await deliverMagicLink({ email: "x@y.z", link: "https://x/y?token=t" });
      assert.equal(captured.opts.connectionTimeout, 8000);
      assert.equal(captured.opts.greetingTimeout, 9000);
      assert.equal(captured.opts.socketTimeout, 11000);
    });
  });

  await test("deliverMagicLink: port=465 implies secure=true when SMTP_SECURE unset", async () => {
    const captured = {};
    await withFakeTransport(captured, async () => {
      process.env.SMTP_HOST = "smtpout.secureserver.net";
      process.env.SMTP_USER = "u";
      process.env.SMTP_PASS = "p";
      process.env.SMTP_PORT = "465";
      delete process.env.SMTP_SECURE;
      await deliverMagicLink({ email: "x@y.z", link: "https://x/y?token=t" });
      assert.equal(captured.opts.port, 465);
      assert.equal(captured.opts.secure, true);
    });
  });

  await test("deliverMagicLink: port=587 implies secure=false when SMTP_SECURE unset", async () => {
    const captured = {};
    await withFakeTransport(captured, async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_USER = "u";
      process.env.SMTP_PASS = "p";
      process.env.SMTP_PORT = "587";
      delete process.env.SMTP_SECURE;
      await deliverMagicLink({ email: "x@y.z", link: "https://x/y?token=t" });
      assert.equal(captured.opts.port, 587);
      assert.equal(captured.opts.secure, false);
    });
  });

  await test("deliverMagicLink: explicit SMTP_SECURE=false overrides port=465 implicit secure", async () => {
    const captured = {};
    await withFakeTransport(captured, async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_USER = "u";
      process.env.SMTP_PASS = "p";
      process.env.SMTP_PORT = "465";
      process.env.SMTP_SECURE = "false";
      await deliverMagicLink({ email: "x@y.z", link: "https://x/y?token=t" });
      assert.equal(captured.opts.secure, false);
    });
  });

  await test("deliverMagicLink: SMTP_SECURE accepts boolean-ish strings (true/1/yes/on)", async () => {
    for (const v of ["true", "1", "yes", "on", "TRUE", " Yes "]) {
      const captured = {};
      await withFakeTransport(captured, async () => {
        process.env.SMTP_HOST = "smtp.example.com";
        process.env.SMTP_USER = "u";
        process.env.SMTP_PASS = "p";
        process.env.SMTP_PORT = "587";
        process.env.SMTP_SECURE = v;
        await deliverMagicLink({ email: "x@y.z", link: "https://x/y?token=t" });
        assert.equal(captured.opts.secure, true, `expected true for SMTP_SECURE='${v}'`);
      });
    }
  });

  await test("deliverMagicLink: bogus SMTP_PORT falls back to default 587", async () => {
    const captured = {};
    await withFakeTransport(captured, async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_USER = "u";
      process.env.SMTP_PASS = "p";
      process.env.SMTP_PORT = "not-a-number";
      delete process.env.SMTP_SECURE;
      await deliverMagicLink({ email: "x@y.z", link: "https://x/y?token=t" });
      assert.equal(captured.opts.port, 587);
      assert.equal(captured.opts.secure, false);
    });
  });

  await test("deliverMagicLink: send failure returns ok-shape with code, redacts token, never throws", async () => {
    const captured = {};
    // Custom fake that throws a timeout-like error from sendMail.
    nodemailer.createTransport = (opts) => {
      captured.opts = opts;
      return {
        sendMail: async () => {
          const err = new Error("Connection timeout");
          err.code = "ETIMEDOUT";
          throw err;
        },
      };
    };
    const origLog = console.log;
    const origWarn = console.warn;
    let logged = "";
    console.log = (...a) => { logged += a.join(" ") + "\n"; };
    console.warn = (...a) => { logged += a.join(" ") + "\n"; };
    try {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_USER = "u";
      process.env.SMTP_PASS = "supersecretpass";
      const r = await deliverMagicLink({ email: "x@y.z", link: "https://x/y?token=abcdef0123456789" });
      assert.equal(r.delivered, false);
      assert.equal(r.code, "ETIMEDOUT");
      // Full token must not appear in logs.
      assert.ok(!logged.includes("abcdef0123456789"), "full token should not be logged");
      // Password must not appear in logs.
      assert.ok(!logged.includes("supersecretpass"), "SMTP_PASS must not be logged");
      // Code should appear in the structured failure log.
      assert.ok(/code=ETIMEDOUT/.test(logged), "expected code=ETIMEDOUT in failure log");
    } finally {
      console.log = origLog;
      console.warn = origWarn;
      nodemailer.createTransport = origCreateTransport;
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
    }
  });

  // Restore env
  for (const [k, v] of Object.entries(SAVED)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
})();
