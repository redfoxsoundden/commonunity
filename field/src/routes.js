const path = require("path");
const db = require("./db");
const sigil = require("./sigil.js");
const views = require("./views");
const projections = require("./projections");
const { currentUser, registerAuthRoutes } = require("./auth");
const { importVesnaSeed, importEdaSeed, importMarkusSeed } = require("./importers");

function ensureAuth(req, res, next) {
  const u = currentUser(req);
  if (!u) return res.status(401).json({ ok: false, error: "auth required" });
  req.user = u;
  next();
}

function registerRoutes(app) {
  registerAuthRoutes(app);

  // ─── Public pages ─────────────────────────────────────────────────────
  // All public reads pass through field/src/projections.js. The raw DB row
  // never reaches a view — only the safe projection does.
  app.get(["/", "/field"], (req, res) => {
    const user = currentUser(req);
    const rows = db.listPublishedProfiles({ limit: 60 });
    const cards = projections.toCommonsCoverCards(rows);
    res.send(views.renderGallery({ user, cards }));
  });

  app.get("/field/enter", (req, res) => {
    const user = currentUser(req);
    res.send(views.renderEnter({ user }));
  });

  app.get("/field/:handle", (req, res) => {
    const row = db.getProfileByHandle(req.params.handle);
    if (!row) return res.status(404).send(views.renderNotFound({ user: currentUser(req) }));
    const user = currentUser(req);
    const isOwner = user && user.id === row.user_id;

    // Log presence — visiting a profile is "entering their field"
    if (user && !isOwner) {
      db.recordPresence({ visitorUserId: user.id, profileUserId: row.user_id });
    } else if (!user) {
      // anonymous presence: log a coarse label only, never the IP
      db.recordPresence({ visitorLabel: "anonymous", profileUserId: row.user_id });
    }

    const presences = isOwner ? db.recentPresencesFor(row.user_id, 24) : [];
    const attuneCount = isOwner ? db.attunementCountFor(row.user_id) : 0;

    const profile = projections.toCommonsProfilePublic(row);
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
    // Public listing → cover-card projection only.
    const profiles = projections.toCommonsCoverCards(db.listPublishedProfiles({ limit: 100 }));
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
      // Persist the deterministic-sigil inputs so re-renders (e.g. cover
      // thumbnail variants, Studio preview) reproduce the same glyph from the
      // same input contract. birthdate is private — never surfaced by the
      // public projection layer (see field/src/projections.js).
      birthdate: body.birthdate || null,
      gene_keys: body.gene_keys || {},
      seed_syllable: body.seed_syllable || "Om",
      human_design_type: body.human_design_type || null,
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

  // Dev-only convenience: seed Vesna / Eda from the workspace JSON files.
  // Disabled in production unless EXPLICIT_SEED_ENDPOINT=1.
  function devOnly(req, res) {
    if (process.env.NODE_ENV === "production" && process.env.EXPLICIT_SEED_ENDPOINT !== "1") {
      res.status(403).json({ ok: false, error: "disabled in production" });
      return false;
    }
    return true;
  }
  app.post("/field-api/dev/seed-vesna", (req, res) => {
    if (!devOnly(req, res)) return;
    try { res.json({ ok: true, ...importVesnaSeed() }); }
    catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });
  app.post("/field-api/dev/seed-eda", (req, res) => {
    if (!devOnly(req, res)) return;
    try { res.json({ ok: true, ...importEdaSeed() }); }
    catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });
  app.post("/field-api/dev/seed-markus", (req, res) => {
    if (!devOnly(req, res)) return;
    try { res.json({ ok: true, ...importMarkusSeed() }); }
    catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });
  // Seed all three beta profiles at once — convenience for local smoke tests.
  app.post("/field-api/dev/seed-all", (req, res) => {
    if (!devOnly(req, res)) return;
    const results = [];
    for (const fn of [importVesnaSeed, importEdaSeed, importMarkusSeed]) {
      try { results.push({ ok: true, ...fn() }); }
      catch (e) { results.push({ ok: false, error: e.message }); }
    }
    res.json({ ok: true, results });
  });
}

module.exports = { registerRoutes };
