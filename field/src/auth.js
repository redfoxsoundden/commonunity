// Magic-link beta auth for the Field.
// Flow:
//   1. POST /auth/request-link { email } → server creates a token, emails it
//      (or prints the URL to the console in dev). Beta-seeded emails are
//      auto-created; everyone else gets a generic "we'll be in touch" message.
//   2. GET  /auth/callback?token=... → if valid, sets session cookie, redirects.
//   3. POST /auth/logout → destroys session.

const db = require("./db");

const BETA_USERS = (process.env.BETA_USERS || "markus@jointidea.com;vesna@example.com;eda@example.com")
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
    const base = process.env.FIELD_BASE_URL || `${req.protocol}://${req.get("host")}`;
    const link = `${base}/auth/callback?token=${token}`;
    const delivery = await deliverMagicLink({ email, link });
    res.json({ ok: true, queued: true, dev: delivery.delivered ? undefined : { link } });
  });

  app.get("/auth/callback", (req, res) => {
    const token = String(req.query.token || "");
    const row = db.consumeMagicToken(token);
    if (!row) return res.status(400).send(renderError("This link is no longer valid. Request a new one from the Field entrance."));
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
  return `<!doctype html><meta charset="utf-8"><title>The Field</title>
  <body style="background:#0a0806;color:#d2a13a;font-family:Georgia,serif;display:grid;place-items:center;height:100vh;margin:0;">
    <div style="max-width:32rem;text-align:center;padding:2rem;line-height:1.6;">
      <p style="font-size:1.2rem;">${escapeHtml(msg)}</p>
      <p><a href="/field" style="color:#d2a13a;">Return to the Field</a></p>
    </div>
  </body>`;
}

function escapeHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

module.exports = { registerAuthRoutes, currentUser, isBetaEmail, BETA_USERS };
