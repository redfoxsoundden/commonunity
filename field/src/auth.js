// Magic-link beta auth for the Field.
// Flow:
//   1. POST /auth/request-link { email } → server creates a token, emails it
//      (or prints the URL to the console in dev). Beta-seeded emails are
//      auto-created; everyone else gets a generic "we'll be in touch" message.
//   2. GET  /auth/callback?token=... → if valid, sets session cookie, redirects.
//   3. POST /auth/logout → destroys session.

const db = require("./db");

// Default Phase 1 beta seats. Override via the BETA_USERS env var.
// All three seats are seeded with real public profiles by `npm run seed`
// (Markus → markus-lehto, Vesna → vesna-lucca, Eda → eda-carmikli).
const BETA_USERS = (process.env.BETA_USERS || "markuslehto@mac.com;vesna.lucca@gmail.com;eda@jointidea.com")
  .split(/[;,]/).map(s => s.trim().toLowerCase()).filter(Boolean);

function isBetaEmail(email) {
  return BETA_USERS.includes(String(email || "").toLowerCase());
}

function currentUser(req) {
  if (!req.session || !req.session.userId) return null;
  return db.getUserById(req.session.userId);
}

async function deliverMagicLink({ email, link }) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    console.log(`[field/auth] magic link for ${email}:\n  ${link}\n  (SMTP not configured — dev fallback)`);
    return { delivered: false, devLink: link };
  }
  // Lazy require so nodemailer is optional.
  try {
    const nodemailer = require("nodemailer");
    const transporter = nodemailer.createTransport({
      host, port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: parseInt(process.env.SMTP_PORT || "587", 10) === 465,
      auth: { user, pass },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"CommonUnity Field" <${user}>`,
      to: email,
      subject: "Your CommonUnity Field link",
      text: [
        "Your invitation into the Field is ready.",
        "",
        "Open this link within 30 minutes to enter:",
        link,
        "",
        "If you did not request this, you can ignore it — the link will expire on its own.",
      ].join("\n"),
    });
    return { delivered: true };
  } catch (e) {
    console.warn("[field/auth] mail send failed, falling back to console:", e.message);
    console.log(`[field/auth] magic link for ${email}:\n  ${link}`);
    return { delivered: false, devLink: link, error: e.message };
  }
}

// Resolve the public base URL used in magic-link emails. Order:
//   1. FIELD_BASE_URL / CU_FIELD_URL (explicit config wins)
//   2. RAILWAY_PUBLIC_DOMAIN (Railway-injected public hostname; force https)
//   3. Request host header (dev / localhost fallback)
// Why: Railway's internal Host header (e.g. commons-production-xxxx.railway.internal)
// is unreachable from email clients. The internal host bled into magic-link URLs.
function publicBaseUrl(req) {
  const configured = process.env.FIELD_BASE_URL || process.env.CU_FIELD_URL;
  if (configured) return String(configured).replace(/\/+$/, "");
  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
  if (railwayDomain) return `https://${railwayDomain}`;
  return `${req.protocol}://${req.get("host")}`;
}

function registerAuthRoutes(app) {
  app.post("/auth/request-link", async (req, res) => {
    const email = String((req.body && req.body.email) || "").toLowerCase().trim();
    if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      return res.status(400).json({ ok: false, error: "valid email required" });
    }

    // Beta-seeded users are auto-created; everyone else is queued silently
    // (the response shape is the same so we don't leak whether a beta seat exists).
    if (isBetaEmail(email)) {
      db.upsertUser({ email });
    } else if (db.getUserByEmail(email) == null) {
      // Non-beta: do not create until manually approved. Respond the same.
      console.log(`[field/auth] non-beta link request from ${email} — ignored`);
      return res.json({ ok: true, queued: true });
    }

    const token = db.createMagicToken(email, 30);
    const base = publicBaseUrl(req);
    const link = `${base}/auth/callback?token=${token}`;
    const delivery = await deliverMagicLink({ email, link });
    res.json({ ok: true, queued: true, dev: delivery.delivered ? undefined : { link } });
  });

  app.get("/auth/callback", (req, res) => {
    const token = String(req.query.token || "");
    const row = db.consumeMagicToken(token);
    if (!row) return res.status(400).send(renderError("This link is no longer valid. Request a new one from the cOMmons entrance."));
    const user = db.upsertUser({ email: row.email });
    req.session.userId = user.id;
    res.redirect("/field");
  });

  app.post("/auth/logout", (req, res) => {
    if (req.session) req.session.destroy(() => res.json({ ok: true }));
    else res.json({ ok: true });
  });

  app.get("/field-api/me", (req, res) => {
    const u = currentUser(req);
    if (!u) return res.json({ ok: true, user: null });
    const profile = db.getProfileByUserId(u.id);
    res.json({ ok: true, user: { id: u.id, email: u.email, handle: u.handle, display_name: u.display_name, role: u.role, hasProfile: !!profile } });
  });
}

function renderError(msg) {
  // Inline the homepage palette so the error page belongs to the same world
  // even when the main stylesheet hasn't loaded yet.
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>cOMmons · CommonUnity</title>
  <link rel="stylesheet" href="/field-static/style.css">
  </head>
  <body>
    <main class="cu-main"><div class="wrap">
      <section class="cu-section">
        <div class="cu-enter">
          <p class="cu-eyebrow">threshold</p>
          <p class="cu-lede">${escapeHtml(msg)}</p>
          <p style="margin-top:18px"><a href="/field/enter" style="color:var(--gold-soft);border-bottom:1px solid rgba(212,160,74,0.35);">Request a new link</a></p>
        </div>
      </section>
    </div></main>
  </body></html>`;
}

function escapeHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

module.exports = { registerAuthRoutes, currentUser, isBetaEmail, BETA_USERS, publicBaseUrl, deliverMagicLink };
