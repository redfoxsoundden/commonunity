// SQLite-backed storage for the Field. Single file, no migrations framework.
// Uses better-sqlite3 if installed; falls back to an in-memory JS store
// (sufficient for tests / dev when native deps aren't present).

const path = require("path");
const fs = require("fs");

const DB_PATH = process.env.DATABASE_URL || path.join(process.cwd(), "field", "data.db");

let useSqlite = false;
let sqlite = null;

try {
  // Lazy require — only fails if native module not installed.
  const Database = require("better-sqlite3");
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  useSqlite = true;
} catch (err) {
  console.warn("[field/db] better-sqlite3 unavailable — using in-memory fallback:", err.message);
}

// ─────────────────────────────────────────────────────────────────────────
// Schema (created idempotently on boot).
// Anti-addiction note: attunement / presence counts exist in the data model
// but are NEVER exposed via public list endpoints — only to the profile owner.
// ─────────────────────────────────────────────────────────────────────────
const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    handle TEXT UNIQUE,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'beta',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS magic_tokens (
    token TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    consumed_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    handle TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    archetype_tagline TEXT,
    essence TEXT,
    statement TEXT,
    presence_status TEXT NOT NULL DEFAULT 'in_the_field',
    compass_json TEXT,
    frequency_signature_json TEXT,
    creative_stream_json TEXT,
    offerings_json TEXT,
    sigil_seed_json TEXT,
    sigil_svg TEXT,
    birthdate TEXT,
    gene_keys_json TEXT,
    seed_syllable TEXT,
    human_design_type TEXT,
    published_at TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS attunements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(from_user_id, to_user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS presences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    visitor_label TEXT,
    profile_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS tones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    intention TEXT,
    seed_syllable TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
];

// ─────────────────────────────────────────────────────────────────────────
// In-memory fallback (used when better-sqlite3 isn't available).
// ─────────────────────────────────────────────────────────────────────────
const mem = {
  users: [],
  magicTokens: new Map(),
  profiles: new Map(),
  attunements: [],
  presences: [],
  tones: [],
  _nextUserId: 1,
};

function nowIso() { return new Date().toISOString(); }

// Idempotent column-add migration. sqlite doesn't have ADD COLUMN IF NOT EXISTS
// pre-3.35; check pragma table_info to be safe across both Railway and dev.
const PROFILE_COLUMN_ADDS = [
  { name: "birthdate",          ddl: "ALTER TABLE profiles ADD COLUMN birthdate TEXT" },
  { name: "gene_keys_json",     ddl: "ALTER TABLE profiles ADD COLUMN gene_keys_json TEXT" },
  { name: "seed_syllable",      ddl: "ALTER TABLE profiles ADD COLUMN seed_syllable TEXT" },
  { name: "human_design_type",  ddl: "ALTER TABLE profiles ADD COLUMN human_design_type TEXT" },
];

function migrateProfilesTable() {
  if (!useSqlite) return;
  let existing;
  try {
    existing = new Set(sqlite.prepare("PRAGMA table_info(profiles)").all().map(r => r.name));
  } catch { return; }
  for (const col of PROFILE_COLUMN_ADDS) {
    if (!existing.has(col.name)) {
      try { sqlite.exec(col.ddl); }
      catch (e) { console.warn(`[field/db] migration add column ${col.name} failed:`, e.message); }
    }
  }
}

function init() {
  if (useSqlite) {
    for (const sql of SCHEMA_SQL) sqlite.exec(sql);
    migrateProfilesTable();
  }
}
init();

// ─────────────────────────────────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────────────────────────────────
function getUserByEmail(email) {
  email = String(email || "").toLowerCase().trim();
  if (!email) return null;
  if (useSqlite) return sqlite.prepare("SELECT * FROM users WHERE email=?").get(email) || null;
  return mem.users.find(u => u.email === email) || null;
}

function getUserByHandle(handle) {
  if (!handle) return null;
  if (useSqlite) return sqlite.prepare("SELECT * FROM users WHERE handle=?").get(handle) || null;
  return mem.users.find(u => u.handle === handle) || null;
}

function getUserById(id) {
  if (useSqlite) return sqlite.prepare("SELECT * FROM users WHERE id=?").get(id) || null;
  return mem.users.find(u => u.id === id) || null;
}

function upsertUser({ email, handle, display_name, role }) {
  email = String(email).toLowerCase().trim();
  const existing = getUserByEmail(email);
  if (existing) {
    if (useSqlite) {
      sqlite.prepare(`UPDATE users SET handle=COALESCE(?,handle), display_name=COALESCE(?,display_name), role=COALESCE(?,role) WHERE id=?`)
        .run(handle || null, display_name || null, role || null, existing.id);
      return getUserById(existing.id);
    } else {
      if (handle) existing.handle = handle;
      if (display_name) existing.display_name = display_name;
      if (role) existing.role = role;
      return existing;
    }
  }
  if (useSqlite) {
    const r = sqlite.prepare("INSERT INTO users (email, handle, display_name, role) VALUES (?,?,?,?)")
      .run(email, handle || null, display_name || null, role || "beta");
    return getUserById(r.lastInsertRowid);
  } else {
    const u = { id: mem._nextUserId++, email, handle: handle || null, display_name: display_name || null, role: role || "beta", created_at: nowIso() };
    mem.users.push(u);
    return u;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Magic-link tokens
// ─────────────────────────────────────────────────────────────────────────
function createMagicToken(email, ttlMinutes = 30) {
  email = String(email).toLowerCase().trim();
  const token = require("crypto").randomBytes(24).toString("hex");
  const expires = new Date(Date.now() + ttlMinutes * 60_000).toISOString();
  if (useSqlite) {
    sqlite.prepare("INSERT INTO magic_tokens (token, email, expires_at) VALUES (?,?,?)").run(token, email, expires);
  } else {
    mem.magicTokens.set(token, { token, email, expires_at: expires, consumed_at: null });
  }
  return token;
}

function consumeMagicToken(token) {
  if (!token) return null;
  let row;
  if (useSqlite) {
    row = sqlite.prepare("SELECT * FROM magic_tokens WHERE token=?").get(token);
  } else {
    row = mem.magicTokens.get(token);
  }
  if (!row) return null;
  if (row.consumed_at) return null;
  if (new Date(row.expires_at) < new Date()) return null;
  if (useSqlite) {
    sqlite.prepare("UPDATE magic_tokens SET consumed_at=datetime('now') WHERE token=?").run(token);
  } else {
    row.consumed_at = nowIso();
  }
  return row;
}

// ─────────────────────────────────────────────────────────────────────────
// Profiles
// ─────────────────────────────────────────────────────────────────────────
function upsertProfile(userId, p) {
  const now = nowIso();
  const fields = {
    handle: p.handle,
    display_name: p.display_name,
    archetype_tagline: p.archetype_tagline || null,
    essence: p.essence || null,
    statement: p.statement || null,
    presence_status: p.presence_status || "in_the_field",
    compass_json: p.compass ? JSON.stringify(p.compass) : null,
    frequency_signature_json: p.frequency_signature ? JSON.stringify(p.frequency_signature) : null,
    creative_stream_json: p.creative_stream ? JSON.stringify(p.creative_stream) : null,
    offerings_json: p.offerings ? JSON.stringify(p.offerings) : null,
    sigil_seed_json: p.sigil_seed ? JSON.stringify(p.sigil_seed) : null,
    sigil_svg: p.sigil_svg || null,
    birthdate: p.birthdate || null,
    gene_keys_json: p.gene_keys ? JSON.stringify(p.gene_keys) : null,
    seed_syllable: p.seed_syllable || null,
    human_design_type: p.human_design_type || null,
    published_at: p.published_at || now,
    updated_at: now,
  };
  if (useSqlite) {
    const existing = sqlite.prepare("SELECT user_id FROM profiles WHERE user_id=?").get(userId);
    if (existing) {
      sqlite.prepare(`UPDATE profiles SET
        handle=?, display_name=?, archetype_tagline=?, essence=?, statement=?, presence_status=?,
        compass_json=?, frequency_signature_json=?, creative_stream_json=?, offerings_json=?,
        sigil_seed_json=?, sigil_svg=?, birthdate=?, gene_keys_json=?, seed_syllable=?,
        human_design_type=?, published_at=?, updated_at=?
        WHERE user_id=?`).run(
        fields.handle, fields.display_name, fields.archetype_tagline, fields.essence,
        fields.statement, fields.presence_status, fields.compass_json, fields.frequency_signature_json,
        fields.creative_stream_json, fields.offerings_json, fields.sigil_seed_json, fields.sigil_svg,
        fields.birthdate, fields.gene_keys_json, fields.seed_syllable, fields.human_design_type,
        fields.published_at, fields.updated_at, userId
      );
    } else {
      sqlite.prepare(`INSERT INTO profiles
        (user_id, handle, display_name, archetype_tagline, essence, statement, presence_status,
         compass_json, frequency_signature_json, creative_stream_json, offerings_json,
         sigil_seed_json, sigil_svg, birthdate, gene_keys_json, seed_syllable, human_design_type,
         published_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        userId, fields.handle, fields.display_name, fields.archetype_tagline, fields.essence,
        fields.statement, fields.presence_status, fields.compass_json, fields.frequency_signature_json,
        fields.creative_stream_json, fields.offerings_json, fields.sigil_seed_json, fields.sigil_svg,
        fields.birthdate, fields.gene_keys_json, fields.seed_syllable, fields.human_design_type,
        fields.published_at, fields.updated_at
      );
    }
    return getProfileByUserId(userId);
  } else {
    const row = { user_id: userId, ...fields };
    mem.profiles.set(userId, row);
    return getProfileByUserId(userId);
  }
}

function deserializeProfileRow(row) {
  if (!row) return null;
  const parse = (s) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };
  return {
    ...row,
    compass: parse(row.compass_json),
    frequency_signature: parse(row.frequency_signature_json),
    creative_stream: parse(row.creative_stream_json),
    offerings: parse(row.offerings_json),
    sigil_seed: parse(row.sigil_seed_json),
    gene_keys: parse(row.gene_keys_json),
  };
}

function getProfileByHandle(handle) {
  if (!handle) return null;
  let row;
  if (useSqlite) {
    row = sqlite.prepare("SELECT * FROM profiles WHERE handle=?").get(handle);
  } else {
    row = Array.from(mem.profiles.values()).find(p => p.handle === handle);
  }
  return deserializeProfileRow(row);
}

function getProfileByUserId(userId) {
  let row;
  if (useSqlite) {
    row = sqlite.prepare("SELECT * FROM profiles WHERE user_id=?").get(userId);
  } else {
    row = mem.profiles.get(userId) || null;
  }
  return deserializeProfileRow(row);
}

function listPublishedProfiles({ limit = 60 } = {}) {
  let rows;
  if (useSqlite) {
    rows = sqlite.prepare("SELECT * FROM profiles WHERE published_at IS NOT NULL ORDER BY published_at DESC LIMIT ?").all(limit);
  } else {
    rows = Array.from(mem.profiles.values()).filter(p => p.published_at).slice(0, limit);
  }
  return rows.map(deserializeProfileRow);
}

// ─────────────────────────────────────────────────────────────────────────
// Attune / Presence / Tone
// ─────────────────────────────────────────────────────────────────────────
function recordAttune(fromUserId, toUserId) {
  if (fromUserId === toUserId) return { ok: false, reason: "self" };
  if (useSqlite) {
    try {
      sqlite.prepare("INSERT INTO attunements (from_user_id, to_user_id) VALUES (?,?)").run(fromUserId, toUserId);
      return { ok: true };
    } catch (e) {
      if (String(e.message).includes("UNIQUE")) return { ok: true, already: true };
      throw e;
    }
  } else {
    const dupe = mem.attunements.find(a => a.from_user_id === fromUserId && a.to_user_id === toUserId);
    if (dupe) return { ok: true, already: true };
    mem.attunements.push({ from_user_id: fromUserId, to_user_id: toUserId, created_at: nowIso() });
    return { ok: true };
  }
}

function attunementCountFor(userId) {
  if (useSqlite) return sqlite.prepare("SELECT COUNT(*) AS n FROM attunements WHERE to_user_id=?").get(userId).n;
  return mem.attunements.filter(a => a.to_user_id === userId).length;
}

function recordPresence({ visitorUserId, visitorLabel, profileUserId }) {
  if (useSqlite) {
    sqlite.prepare("INSERT INTO presences (visitor_user_id, visitor_label, profile_user_id) VALUES (?,?,?)")
      .run(visitorUserId || null, visitorLabel || null, profileUserId);
  } else {
    mem.presences.push({ visitor_user_id: visitorUserId || null, visitor_label: visitorLabel || null, profile_user_id: profileUserId, last_seen_at: nowIso() });
  }
}

function recentPresencesFor(userId, limit = 24) {
  if (useSqlite) {
    return sqlite.prepare(`SELECT p.*, u.display_name AS visitor_display_name, u.handle AS visitor_handle
                           FROM presences p LEFT JOIN users u ON u.id = p.visitor_user_id
                           WHERE p.profile_user_id=? ORDER BY p.last_seen_at DESC LIMIT ?`).all(userId, limit);
  }
  return mem.presences.filter(p => p.profile_user_id === userId).slice(-limit).reverse();
}

function recordTone({ fromUserId, toUserId, intention, seedSyllable }) {
  if (useSqlite) {
    sqlite.prepare("INSERT INTO tones (from_user_id, to_user_id, intention, seed_syllable) VALUES (?,?,?,?)")
      .run(fromUserId, toUserId, intention || null, seedSyllable || null);
  } else {
    mem.tones.push({ from_user_id: fromUserId, to_user_id: toUserId, intention, seed_syllable: seedSyllable, created_at: nowIso() });
  }
}

function inboxTonesFor(userId, limit = 50) {
  if (useSqlite) {
    return sqlite.prepare(`SELECT t.*, u.display_name AS from_display_name, u.handle AS from_handle
                           FROM tones t JOIN users u ON u.id = t.from_user_id
                           WHERE t.to_user_id=? ORDER BY t.created_at DESC LIMIT ?`).all(userId, limit);
  }
  return mem.tones.filter(t => t.to_user_id === userId).slice(-limit).reverse();
}

module.exports = {
  // backend info
  isSqlite: () => useSqlite,
  dbPath: () => DB_PATH,
  // users
  getUserByEmail, getUserByHandle, getUserById, upsertUser,
  // magic tokens
  createMagicToken, consumeMagicToken,
  // profiles
  upsertProfile, getProfileByHandle, getProfileByUserId, listPublishedProfiles,
  // interactions
  recordAttune, attunementCountFor,
  recordPresence, recentPresencesFor,
  recordTone, inboxTonesFor,
};
