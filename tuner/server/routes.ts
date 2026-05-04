import type { Express } from "express";
import { calculateRadiance, synthesizeRadianceProfile } from "../shared/genekeys";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import nodemailer from "nodemailer";
import Anthropic from "@anthropic-ai/sdk";

const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL ?? "markus@jointidea.com";
const SMTP_HOST = process.env.SMTP_HOST ?? "";
const SMTP_PORT = parseInt(process.env.SMTP_PORT ?? "587");
const SMTP_USER = process.env.SMTP_USER ?? "";
const SMTP_PASS = process.env.SMTP_PASS ?? "";

async function sendIntakeNotification(q: any) {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return; // skip if not configured
  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    const flags = (() => { try { return JSON.parse(q.contraindicationFlags ?? "[]"); } catch { return []; } })();
    const flagLine = flags.length > 0 ? `⚠️ Flags: ${flags.join(", ")}` : "✅ No contraindication flags";
    await transporter.sendMail({
      from: `"CommonUnity Tuner" <${SMTP_USER}>`,
      to: NOTIFY_EMAIL,
      subject: `New intake: ${q.clientName ?? "Client"} — ${q.recommendedProtocolId ?? "protocol pending"}`,
      text: [
        `New remote intake received.`,
        ``,
        `Name: ${q.clientName ?? "—"}`,
        `Date: ${q.sessionDate ?? "—"}`,
        `Dominant quality: ${q.dominantDosha ?? "—"}`,
        `Dominant center: ${q.dominantCenter ?? "—"}`,
        `Recommended protocol: ${q.recommendedProtocolId ?? "—"}`,
        `Comfort tier: ${q.recommendedComfortTier ?? "—"}`,
        flagLine,
        ``,
        `Intention: ${q.intentionText ?? "not provided"}`,
        ``,
        `View in Tuner: https://ideal-trust-production-7782.up.railway.app/#/clients`,
      ].join("\n"),
    });
  } catch (err) {
    console.warn("Email notification failed:", err);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Seed on startup
  try { seedDatabase(); } catch (e) { console.warn("Seed error:", e); }

  // ─── INSTRUMENTS ────────────────────────────────────────────────────────────
  app.get("/api/instruments", (_req, res) => {
    res.json(storage.getAllInstruments());
  });
  app.get("/api/instruments/:id", (req, res) => {
    const item = storage.getInstrumentById(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  });

  // ─── CHAKRAS ─────────────────────────────────────────────────────────────────
  app.get("/api/chakras", (_req, res) => {
    res.json(storage.getAllChakras());
  });
  app.get("/api/chakras/:id", (req, res) => {
    const item = storage.getChakraById(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  });

  // ─── BIOFIELD ZONES ──────────────────────────────────────────────────────────
  app.get("/api/biofield-zones", (_req, res) => {
    res.json(storage.getAllBiofieldZones());
  });

  // ─── AYURVEDA / ELEMENTS ─────────────────────────────────────────────────────
  app.get("/api/ayurveda", (_req, res) => {
    res.json(storage.getAllAyurvedaElements());
  });
  app.get("/api/ayurveda/type/:type", (req, res) => {
    res.json(storage.getAyurvedaElementsByType(req.params.type));
  });

  // ─── CENTERS ─────────────────────────────────────────────────────────────────
  app.get("/api/centers", (_req, res) => {
    res.json(storage.getAllCenters());
  });

  // ─── KOSHAS ─────────────────────────────────────────────────────────────────
  app.get("/api/koshas", (_req, res) => {
    res.json(storage.getAllKoshas());
  });
  app.get("/api/koshas/:id", (req, res) => {
    const item = storage.getKoshaById(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  });

  // ─── PROTOCOLS ───────────────────────────────────────────────────────────────
  app.get("/api/protocols", (_req, res) => {
    res.json(storage.getAllProtocols());
  });
  app.get("/api/protocols/:id", (req, res) => {
    const item = storage.getProtocolById(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  });

  // ─── CLIENTS ─────────────────────────────────────────────────────────────────
  app.get("/api/clients", (_req, res) => {
    res.json(storage.getAllClients());
  });
  app.post("/api/clients", (req, res) => {
    const data = { ...req.body, createdAt: new Date().toISOString() };
    res.json(storage.createClient(data));
  });
  app.patch("/api/clients/:id", (req, res) => {
    const updated = storage.updateClient(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });
  app.get("/api/clients/:id", (req, res) => {
    const client = storage.getClientById(Number(req.params.id));
    if (!client) return res.status(404).json({ error: "Not found" });
    res.json(client);
  });

  // ─── GENE KEYS RADIANCE ───────────────────────────────────────────────────────
  // Pure computation — no DB write. POST { birthDate, birthTime? }
  app.post("/api/radiance", (req, res) => {
    const { birthDate, birthTime } = req.body;
    if (!birthDate) return res.status(400).json({ error: "birthDate required (YYYY-MM-DD)" });
    try {
      const activation = calculateRadiance(birthDate, birthTime);
      const profile = synthesizeRadianceProfile(activation);
      res.json(profile);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── QUESTIONNAIRE ────────────────────────────────────────────────────────────
  app.get("/api/questionnaires", (_req, res) => {
    res.json(storage.getAllQuestionnaires());
  });

  app.delete("/api/questionnaires/:id", (req, res) => {
    storage.deleteQuestionnaire(Number(req.params.id));
    res.json({ ok: true });
  });

  // PATCH /api/questionnaires/:id — partial update (birth data editing from RadianceCard)
  app.patch("/api/questionnaires/:id", (req, res) => {
    const updated = storage.updateQuestionnaire(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  app.get("/api/questionnaires/:id", (req, res) => {
    const item = storage.getQuestionnaireById(Number(req.params.id));
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  });

  app.post("/api/questionnaires", (req, res) => {
    const raw = req.body;
    // Compute auto-outputs
    const flags: string[] = [];
    if (raw.hasPacemaker) flags.push("pacemaker-caution");
    if (raw.recentSurgery) flags.push("recent-surgery-caution");
    if (raw.hasEpilepsy) flags.push("epilepsy-seizure-caution");
    if (raw.soundSensitivity) flags.push("sound-sensitivity-caution", "tinnitus-caution");
    if (raw.acuteCrisis) flags.push("acute-trauma-caution", "severe-mental-health-caution");
    if (raw.pregnancyStatus === "yes") flags.push("pregnancy-caution");

    // Dosha tally — balanced is now a first-class outcome
    const doshaCounts: Record<string, number> = { vata: 0, pitta: 0, kapha: 0, balanced: 0 };
    const doshaFields = ["doshaBody","doshaMind","doshaSleep","doshaAppetite","doshaEnergy","doshaEmotions"];
    for (const f of doshaFields) {
      const v = raw[f];
      if (v === "vata-like") doshaCounts.vata++;
      else if (v === "pitta-like") doshaCounts.pitta++;
      else if (v === "kapha-like") doshaCounts.kapha++;
      else if (v === "balanced") doshaCounts.balanced++;
    }
    // Dominant: whichever category scored highest.
    // Tie between balanced and a dosha -> balanced wins (sattvic state takes priority).
    const sorted = Object.entries(doshaCounts).sort((a, b) => b[1] - a[1]);
    const topScore = sorted[0][1];
    // If balanced is tied for top, prefer it
    const dominantDosha = doshaCounts.balanced === topScore ? "balanced" : sorted[0][0];

    // Center tally
    const centerCounts: Record<string, number> = { physical: 0, emotional: 0, intellectual: 0 };
    const centerFields = ["centerDecisions","centerStress","centerLearning","centerTrust","centerNeglected","centerSelf"];
    for (const f of centerFields) {
      const v = raw[f];
      if (v === "physical") centerCounts.physical++;
      else if (v === "emotional") centerCounts.emotional++;
      else if (v === "intellectual") centerCounts.intellectual++;
    }
    const dominantCenter = Object.entries(centerCounts).sort((a,b) => b[1]-a[1])[0][0];

    // Comfort tier
    let comfortTier = 3;
    const hasAllContraindications = flags.some(f => ["pacemaker-caution","epilepsy-seizure-caution","severe-mental-health-caution"].includes(f));
    if (hasAllContraindications) comfortTier = 1;
    else if (raw.bodyContact === "field-only") comfortTier = 1;
    else if (raw.bodyContact === "limited") comfortTier = 2;
    else if (raw.vocalization === "yes" && raw.chakraFamiliarity === "experienced") comfortTier = 5;
    else if (raw.vocalization === "yes") comfortTier = 4;

    // Chakra focus from dosha — balanced state centres on the heart
    const doshaChakraMap: Record<string, string> = {
      vata: "CH-ROOT", pitta: "CH-SOLAR", kapha: "CH-SACRAL", balanced: "CH-HEART",
    };
    const suggestedChakraFocus = doshaChakraMap[dominantDosha] || "CH-HEART";

    // Protocol recommendation — balanced routes to integration/maintenance
    const protocolMap: Record<string, string> = {
      vata: "PROTO-VATA", pitta: "PROTO-PITTA", kapha: "PROTO-KAPHA",
      balanced: "PROTO-FULL-ASCENDING",
    };
    const focusProtocol = protocolMap[dominantDosha] || "PROTO-GROUNDING";

    const data = {
      ...raw,
      contraindicationFlags: JSON.stringify(flags),
      dominantDosha,
      dominantCenter,
      suggestedChakraFocus,
      recommendedComfortTier: comfortTier,
      recommendedProtocolId: focusProtocol,
    };

    const saved = storage.createQuestionnaire(data);
    // Fire-and-forget email for remote intake submissions
    if (raw._source === "intake") {
      sendIntakeNotification(saved);
    }
    res.json(saved);
  });

  // ─── SESSION LOGS ─────────────────────────────────────────────────────────────
  app.get("/api/sessions", (_req, res) => {
    res.json(storage.getAllSessions());
  });
  app.get("/api/sessions/:id", (req, res) => {
    const item = storage.getSessionById(Number(req.params.id));
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  });
  app.post("/api/sessions", (req, res) => {
    const data = { ...req.body, createdAt: new Date().toISOString() };
    res.json(storage.createSession(data));
  });
  app.patch("/api/sessions/:id", (req, res) => {
    const item = storage.updateSession(Number(req.params.id), req.body);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  });
  app.delete("/api/sessions/:id", (req, res) => {
    storage.deleteSession(Number(req.params.id));
    res.json({ ok: true });
  });

  // ─── SOUNDSCAPES ──────────────────────────────────────────────────────────────
  app.get("/api/soundscapes", (_req, res) => {
    res.json(storage.getAllSoundscapes());
  });
  app.get("/api/soundscapes/:id", (req, res) => {
    const item = storage.getSoundscapeById(Number(req.params.id));
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  });
  app.post("/api/soundscapes", (req, res) => {
    const data = { ...req.body, createdAt: new Date().toISOString() };
    res.json(storage.createSoundscape(data));
  });
  app.patch("/api/soundscapes/:id", (req, res) => {
    const item = storage.updateSoundscape(Number(req.params.id), req.body);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  });
  app.delete("/api/soundscapes/:id", (req, res) => {
    storage.deleteSoundscape(Number(req.params.id));
    res.json({ ok: true });
  });

  // ─── HEALTH ───────────────────────────────────────────────────────────────────
  app.get("/health", (_req, res) => res.json({ ok: true }));

  // ─── NEXUS AI ─────────────────────────────────────────────────────────────────
  // Nexus is the persistent AI presence across all CommonUnity apps.
  // In Tuner it operates as a sound healing practitioner's advisor,
  // contextually aware of what instrument/protocol/client is on screen.

  const NEXUS_SYSTEM = `You are the Nexus — the AI presence within CommonUnity Tuner, a professional sound healing toolkit.

You are not a generic assistant. You are a knowledgeable companion for the sound healing practitioner using this app. You hold deep familiarity with:
- The instruments in this practitioner's collection: tuning forks, singing bowls, bells, and their specific frequencies
- Eileen Day McKusick's Biofield Tuning methodology: left/right polarity, Ancestral Rivers, Earth Star, Sun Star, the toroidal biofield anatomy
- Hans Cousto's Cosmic Octave: planetary frequency derivations, the principle that all frequencies are octave-related to natural cycles
- Solfeggio frequencies and their therapeutic applications (174, 285, 396, 417, 528, 639, 741, 852, 963 Hz)
- Western tonal relationships and where they diverge from healing-system tunings
- Chladni patterns: how different frequencies create distinct geometric nodal figures in sand or water, and what this reveals about a frequency's character
- Chakra system correspondences, dosha relationships (Vata/Pitta/Kapha), and Gurdjieff centers (moving/emotional/intellectual)
- Session design: opening with OM at 136.10 Hz, sequencing instruments, grounding, clearing, heart-centering
- Practical contraindications: pacemakers, pregnancy, acute inflammation, post-surgery
- The OM practice: two heart-frequency forks at the sternum during co-chanting at 136.10 Hz is the ceremonial container

Your nature:
- Precise, not generic. Every response should feel specifically relevant to this practitioner and what they are working on.
- Warm but efficient. You are a professional tool, not a spiritual influencer. No performance of reverence.
- You ask one question at a time when you need more context. You do not ask multiple questions at once.
- Short responses by default: 2–4 sentences. Expand only when a genuine explanation is needed.
- You never use: journey, impact, passion, empower, transform, dynamic, leverage, holistic, authentic, innovative, synergy, thrive, unlock, game-changer.
- Plain text only. No markdown, no bullet lists, no headers in your replies.
- When frequency assignments differ between systems (Cousto vs Solfeggio vs Western tonal), you name the difference and its source rather than picking one.
- Every protocol has an off-body option. If someone cannot receive direct application, you know how to adapt.

Return plain text only. No markdown.`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // GET /api/nexus/memory — fetch current persisted memory
  app.get("/api/nexus/memory", (_req, res) => {
    const mem = storage.getNexusMemory();
    res.json({ memory: mem?.memory ?? "", updatedAt: mem?.updatedAt ?? null });
  });

  // POST /api/nexus/memory — save updated compressed memory
  app.post("/api/nexus/memory", (req, res) => {
    const { memory } = req.body;
    if (typeof memory !== "string") return res.status(400).json({ error: "memory must be a string" });
    const saved = storage.upsertNexusMemory(memory);
    res.json(saved);
  });

  // POST /api/nexus/chat — SSE streaming conversation
  // Body: { message: string, history: {role:"user"|"nexus", text:string}[], pageContext: string, nexusMemory?: string }
  app.post("/api/nexus/chat", async (req, res) => {
    const { message, history = [], pageContext = "", nexusMemory: clientMemory } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message required" });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: "ANTHROPIC_API_KEY not configured" });
    }

    // Build system prompt with current memory + page context
    const memRecord = storage.getNexusMemory();
    const persistedMemory = clientMemory ?? memRecord?.memory ?? "";

    let systemWithContext = NEXUS_SYSTEM;
    if (persistedMemory) {
      systemWithContext += `\n\nWhat you know about this practitioner across sessions:\n${persistedMemory}`;
    }
    if (pageContext) {
      systemWithContext += `\n\nCurrent context (what the practitioner is looking at right now):\n${pageContext}`;
    }

    // Build message history (last 10 turns)
    const messages: { role: "user" | "assistant"; content: string }[] = [];
    for (const msg of (history as { role: string; text: string }[]).slice(-10)) {
      const role = msg.role === "nexus" ? "assistant" : "user";
      messages.push({ role, content: msg.text });
    }
    messages.push({ role: "user", content: message });

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    try {
      const stream = anthropic.messages.stream({
        model: "claude-sonnet-4-5",
        max_tokens: 300,
        system: systemWithContext,
        messages,
      });

      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          res.write(`data: ${JSON.stringify({ chunk: chunk.delta.text })}\n\n`);
        }
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
    } finally {
      res.end();
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
