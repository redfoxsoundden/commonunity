const path = require("path");
const db = require("./db");
const sigil = require("../../sdk/sigil.js");
const views = require("./views");
const { currentUser, registerAuthRoutes } = require("./auth");
const { importVesnaSeed } = require("./importers");

function ensureAuth(req, res, next) {
  const u = currentUser(req);
  if (!u) return res.status(401).json({ ok: false, error: "auth required" });
  req.user = u;
  next();
}

function registerRoutes(app) {
  registerAuthRoutes(app);

  // ─── Public pages ─────────────────────────────────────────────────────
  app.get(["/", "/field"], (req, res) => {
    const user = currentUser(req);
    const profiles = db.listPublishedProfiles({ limit: 60 });
    res.send(views.renderGallery({ user, profiles }));
  });

  app.get("/field/enter", (req, res) => {
    const user = currentUser(req);
    res.send(views.renderEnter({ user }));
  });

  app.get("/field/:handle", (req, res) => {
    const profile = db.getProfileByHandle(req.params.handle);
    if (!profile) return res.status(404).send(views.renderNotFound({ user: currentUser(req) }));
    const user = currentUser(req);
    const isOwner = user && user.id === profile.user_id;

    // Log presence — visiting a profile is "entering their field"
    if (user && !isOwner) {
      db.recordPresence({ visitorUserId: user.id, profileUserId: profile.user_id });
    } else if (!user) {
      // anonymous presence: log a coarse label only, never the IP
      db.recordPresence({ visitorLabel: "anonymous", profileUserId: profile.user_id });
    }

    const presences = isOwner ? db.recentPresencesFor(profile.user_id, 24) : [];
    const attuneCount = isOwner ? db.attunementCountFor(profile.user_id) : 0;

    res.send(views.renderProfile({ user, profile, isOwner, presences, attuneCount }));
  });

  // Sigil-as-asset, for OG tags
  app.get("/field/:handle/sigil.svg", (req, res) => {
    const profile = db.getProfileByHandle(req.params.handle);
    if (!profile || !profile.sigil_svg) return res.status(404).end();
    res.set("Content-Type", "image/svg+xml");
    res.send(profile.sigil_svg);
  });

  // ─── API ──────────────────────────────────────────────────────────────
  app.get("/field-api/health", (_req, res) => {
    res.json({ ok: true, service: "commonunity-field", time: new Date().toISOString(), sqlite: db.isSqlite() });
  });

  app.get("/field-api/profiles", (_req, res) => {
    const profiles = db.listPublishedProfiles({ limit: 100 }).map(p => ({
      handle: p.handle, display_name: p.display_name, archetype_tagline: p.archetype_tagline,
      essence: p.essence, presence_status: p.presence_status, published_at: p.published_at,
    }));
    res.json({ ok: true, profiles });
  });

  // Studio → Field publish.
  // Auth required (the publisher must be logged in beta user).
  // Payload shape documented in field/seeds/README.md.
  app.post("/field-api/profile", ensureAuth, (req, res) => {
    const u = req.user;
    const body = req.body || {};
    if (!body.display_name) return res.status(400).json({ ok: false, error: "display_name required" });

    const handle = (body.handle && String(body.handle).trim()) || sigil.proposeHandle(body.display_name) || `user-${u.id}`;
    // Handle collision: if someone else owns it, suffix the user's id.
    const conflict = db.getUserByHandle(handle);
    const finalHandle = (conflict && conflict.id !== u.id) ? `${handle}-${u.id}` : handle;

    // Update user's display_name + handle (single source of truth for header).
    db.upsertUser({ email: u.email, handle: finalHandle, display_name: body.display_name });

    // Compute sigil
    const tone = body.frequency_signature || body.tone || {};
    const seed = sigil.encodeSigilSeed({
      display_name: body.display_name,
      full_name: body.full_name || body.display_name,
      birthdate: body.birthdate || null,
      gene_keys: body.gene_keys || {},
      compass: body.compass || {},
      tone: {
        tonal_center: tone.tonal_center,
        dominant_hz: tone.dominant_hz,
        seed_syllable: body.seed_syllable || "Om",
      },
    });
    const svg = sigil.renderSigilSVG(seed);

    const profile = db.upsertProfile(u.id, {
      handle: finalHandle,
      display_name: body.display_name,
      archetype_tagline: body.archetype_tagline,
      essence: body.essence,
      statement: body.statement,
      presence_status: body.presence_status || "in_the_field",
      compass: body.compass,
      frequency_signature: body.frequency_signature,
      creative_stream: body.creative_stream,
      offerings: body.offerings,
      sigil_seed: seed,
      sigil_svg: svg,
      published_at: new Date().toISOString(),
    });

    res.json({ ok: true, profile: { handle: profile.handle, url: `/field/${profile.handle}` } });
  });

  app.post("/field-api/attune/:handle", ensureAuth, (req, res) => {
    const target = db.getUserByHandle(req.params.handle);
    if (!target) return res.status(404).json({ ok: false, error: "not found" });
    const result = db.recordAttune(req.user.id, target.id);
    res.json({ ok: true, ...result });
  });

  app.post("/field-api/tone/:handle", ensureAuth, (req, res) => {
    const target = db.getUserByHandle(req.params.handle);
    if (!target) return res.status(404).json({ ok: false, error: "not found" });
    const intention = String((req.body && req.body.intention) || "").slice(0, 280);
    const seedSyllable = String((req.body && req.body.seed_syllable) || "").slice(0, 32);
    db.recordTone({ fromUserId: req.user.id, toUserId: target.id, intention, seedSyllable });
    res.json({ ok: true });
  });

  app.get("/field-api/tones/inbox", ensureAuth, (req, res) => {
    const tones = db.inboxTonesFor(req.user.id, 50);
    res.json({ ok: true, tones });
  });

  app.get("/field-api/presences/me", ensureAuth, (req, res) => {
    const presences = db.recentPresencesFor(req.user.id, 50);
    res.json({ ok: true, presences });
  });

  // Dev-only convenience: seed Vesna from the workspace JSON.
  // Disabled in production unless EXPLICIT_SEED_ENDPOINT=1.
  app.post("/field-api/dev/seed-vesna", (req, res) => {
    if (process.env.NODE_ENV === "production" && process.env.EXPLICIT_SEED_ENDPOINT !== "1") {
      return res.status(403).json({ ok: false, error: "disabled in production" });
    }
    try {
      const result = importVesnaSeed();
      res.json({ ok: true, ...result });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });
}

module.exports = { registerRoutes };
