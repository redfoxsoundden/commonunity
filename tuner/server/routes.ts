import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { seedDatabase } from "./seed";

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

  // ─── QUESTIONNAIRE ────────────────────────────────────────────────────────────
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

    // Dosha tally
    const doshaCounts: Record<string, number> = { vata: 0, pitta: 0, kapha: 0 };
    const doshaFields = ["doshaBody","doshaMind","doshaSleep","doshaAppetite","doshaEnergy","doshaEmotions"];
    for (const f of doshaFields) {
      const v = raw[f];
      if (v === "vata-like") doshaCounts.vata++;
      else if (v === "pitta-like") doshaCounts.pitta++;
      else if (v === "kapha-like") doshaCounts.kapha++;
    }
    const dominantDosha = Object.entries(doshaCounts).sort((a,b) => b[1]-a[1])[0][0];

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

    // Chakra focus from stress + dosha
    const doshaChakraMap: Record<string, string> = { vata: "CH-ROOT", pitta: "CH-SOLAR", kapha: "CH-SACRAL" };
    const suggestedChakraFocus = doshaChakraMap[dominantDosha] || "CH-HEART";

    // Protocol recommendation
    const protocolMap: Record<string, string> = {
      vata: "PROTO-VATA", pitta: "PROTO-PITTA", kapha: "PROTO-KAPHA",
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

    res.json(storage.createQuestionnaire(data));
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

  const httpServer = createServer(app);
  return httpServer;
}
