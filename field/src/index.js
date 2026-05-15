// CommonUnity Field — main server entry.
// Express + better-sqlite3 + magic-link auth.

const path = require("path");
const fs = require("fs");
// Load .env if present (no dotenv dep required — minimal parser).
(function loadEnv() {
  const file = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i.exec(line);
    if (m && !process.env[m[1]]) {
      let v = m[2];
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      process.env[m[1]] = v;
    }
  }
})();

const express = require("express");
let session;
try { session = require("express-session"); } catch { session = null; }
let MemoryStoreCtor;
try { if (session) MemoryStoreCtor = require("memorystore")(session); } catch { /* optional */ }

const { registerRoutes } = require("./routes");

const app = express();

// ─── CORS for Studio publish ─────────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:8000,http://localhost:5000")
  .split(",").map(s => s.trim()).filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Credentials", "true");
    res.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: false }));

if (session) {
  app.use(session({
    secret: process.env.SESSION_SECRET || "commonunity-field-dev-secret",
    resave: false,
    saveUninitialized: false,
    store: MemoryStoreCtor ? new MemoryStoreCtor({ checkPeriod: 24 * 60 * 60 * 1000 }) : undefined,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 14 * 24 * 60 * 60 * 1000,
    },
  }));
} else {
  // No session store available — provide a minimal stub so routes don't crash.
  // Real auth will not work in this fallback; it is only useful for SSR smoke tests.
  console.warn("[field] express-session not installed — auth disabled (read-only)");
  app.use((req, _res, next) => { req.session = req.session || {}; next(); });
}

// ─── Static (CSS, JS, favicon) ───────────────────────────────────────────
app.use("/field-static", express.static(path.join(__dirname, "..", "public")));
app.get("/favicon.svg", (_req, res) => {
  res.set("Content-Type", "image/svg+xml");
  res.send(`<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#0a0806"/><text x="16" y="22" text-anchor="middle" font-family="Georgia,serif" font-size="20" fill="#d2a13a">ॐ</text></svg>`);
});

registerRoutes(app);

app.use((err, _req, res, _next) => {
  console.error("[field] error:", err);
  if (res.headersSent) return;
  res.status(err.status || 500).json({ ok: false, error: err.message || "internal error" });
});

const PORT = parseInt(process.env.PORT || "5050", 10);

if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[field] serving on http://0.0.0.0:${PORT}`);
    console.log(`[field] gallery:    /field`);
    console.log(`[field] health:     /field-api/health`);
    console.log(`[field] beta users: ${(process.env.BETA_USERS || "(default)").split(/[;,]/).join(", ")}`);
  });
}

module.exports = { app };
