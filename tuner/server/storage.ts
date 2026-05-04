import { db } from "./db";
import {
  instruments, chakras, biofieldZones, ayurvedaElements, centers,
  clientProfiles, questionnaireResponses, protocolTemplates, sessionLogs, soundscapes,
  nexusMemory, koshas,
  type Instrument, type Chakra, type BiofieldZone, type AyurvedaElement, type Center,
  type ClientProfile, type InsertClientProfile,
  type QuestionnaireResponse, type InsertQuestionnaire,
  type ProtocolTemplate,
  type SessionLog, type InsertSessionLog,
  type Soundscape, type InsertSoundscape,
  type NexusMemory,
  type Kosha,
} from "../shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Instruments
  getAllInstruments(): Instrument[];
  getInstrumentById(id: string): Instrument | undefined;
  getInstrumentsByType(type: string): Instrument[];

  // Chakras
  getAllChakras(): Chakra[];
  getChakraById(id: string): Chakra | undefined;

  // Biofield zones
  getAllBiofieldZones(): BiofieldZone[];
  getBiofieldZoneById(id: string): BiofieldZone | undefined;

  // Ayurveda / Elements
  getAllAyurvedaElements(): AyurvedaElement[];
  getAyurvedaElementById(id: string): AyurvedaElement | undefined;
  getAyurvedaElementsByType(type: string): AyurvedaElement[];

  // Centers
  getAllCenters(): Center[];
  getCenterById(id: string): Center | undefined;

  // Client profiles
  getAllClients(): ClientProfile[];
  getClientById(id: number): ClientProfile | undefined;
  createClient(data: InsertClientProfile): ClientProfile;
  updateClient(id: number, data: Partial<InsertClientProfile>): ClientProfile | undefined;

  // Questionnaire responses
  getAllQuestionnaires(): QuestionnaireResponse[];
  getQuestionnairesByClient(clientId: number): QuestionnaireResponse[];
  getQuestionnaireById(id: number): QuestionnaireResponse | undefined;
  createQuestionnaire(data: InsertQuestionnaire): QuestionnaireResponse;
  deleteQuestionnaire(id: number): void;

  // Protocol templates
  getAllProtocols(): ProtocolTemplate[];
  getProtocolById(id: string): ProtocolTemplate | undefined;

  // Session logs
  getAllSessions(): SessionLog[];
  getSessionById(id: number): SessionLog | undefined;
  getSessionsByClient(clientId: number): SessionLog[];
  createSession(data: InsertSessionLog): SessionLog;
  updateSession(id: number, data: Partial<InsertSessionLog>): SessionLog | undefined;
  deleteSession(id: number): void;

  // Soundscapes
  getAllSoundscapes(): Soundscape[];
  getSoundscapeById(id: number): Soundscape | undefined;
  createSoundscape(data: InsertSoundscape): Soundscape;
  updateSoundscape(id: number, data: Partial<InsertSoundscape>): Soundscape | undefined;
  deleteSoundscape(id: number): void;

  // Koshas
  getAllKoshas(): Kosha[];
  getKoshaById(id: string): Kosha | undefined;
}

export class DatabaseStorage implements IStorage {
  getAllInstruments(): Instrument[] {
    return db.select().from(instruments).all();
  }
  getInstrumentById(id: string): Instrument | undefined {
    return db.select().from(instruments).where(eq(instruments.id, id)).get();
  }
  getInstrumentsByType(type: string): Instrument[] {
    return db.select().from(instruments).where(eq(instruments.type, type)).all();
  }

  getAllChakras(): Chakra[] {
    return db.select().from(chakras).all();
  }
  getChakraById(id: string): Chakra | undefined {
    return db.select().from(chakras).where(eq(chakras.id, id)).get();
  }

  getAllBiofieldZones(): BiofieldZone[] {
    return db.select().from(biofieldZones).all();
  }
  getBiofieldZoneById(id: string): BiofieldZone | undefined {
    return db.select().from(biofieldZones).where(eq(biofieldZones.id, id)).get();
  }

  getAllAyurvedaElements(): AyurvedaElement[] {
    return db.select().from(ayurvedaElements).all();
  }
  getAyurvedaElementById(id: string): AyurvedaElement | undefined {
    return db.select().from(ayurvedaElements).where(eq(ayurvedaElements.id, id)).get();
  }
  getAyurvedaElementsByType(type: string): AyurvedaElement[] {
    return db.select().from(ayurvedaElements).where(eq(ayurvedaElements.type, type)).all();
  }

  getAllCenters(): Center[] {
    return db.select().from(centers).all();
  }
  getCenterById(id: string): Center | undefined {
    return db.select().from(centers).where(eq(centers.id, id)).get();
  }

  getAllClients(): ClientProfile[] {
    return db.select().from(clientProfiles).all();
  }
  getClientById(id: number): ClientProfile | undefined {
    return db.select().from(clientProfiles).where(eq(clientProfiles.id, id)).get();
  }
  createClient(data: InsertClientProfile): ClientProfile {
    return db.insert(clientProfiles).values(data).returning().get() as ClientProfile;
  }
  updateClient(id: number, data: Partial<InsertClientProfile>): ClientProfile | undefined {
    return db.update(clientProfiles).set(data).where(eq(clientProfiles.id, id)).returning().get() as ClientProfile | undefined;
  }

  getAllQuestionnaires(): QuestionnaireResponse[] {
    return db.select().from(questionnaireResponses).orderBy(desc(questionnaireResponses.id)).all();
  }
  getQuestionnairesByClient(clientId: number): QuestionnaireResponse[] {
    return db.select().from(questionnaireResponses).where(eq(questionnaireResponses.clientId, clientId)).all();
  }
  getQuestionnaireById(id: number): QuestionnaireResponse | undefined {
    return db.select().from(questionnaireResponses).where(eq(questionnaireResponses.id, id)).get();
  }
  createQuestionnaire(data: InsertQuestionnaire): QuestionnaireResponse {
    return db.insert(questionnaireResponses).values(data).returning().get() as QuestionnaireResponse;
  }
  deleteQuestionnaire(id: number): void {
    db.delete(questionnaireResponses).where(eq(questionnaireResponses.id, id)).run();
  }

  getAllProtocols(): ProtocolTemplate[] {
    return db.select().from(protocolTemplates).all();
  }
  getProtocolById(id: string): ProtocolTemplate | undefined {
    return db.select().from(protocolTemplates).where(eq(protocolTemplates.id, id)).get();
  }

  getAllSessions(): SessionLog[] {
    return db.select().from(sessionLogs).orderBy(desc(sessionLogs.sessionDate)).all();
  }
  getSessionById(id: number): SessionLog | undefined {
    return db.select().from(sessionLogs).where(eq(sessionLogs.id, id)).get();
  }
  getSessionsByClient(clientId: number): SessionLog[] {
    return db.select().from(sessionLogs).where(eq(sessionLogs.clientId, clientId)).orderBy(desc(sessionLogs.sessionDate)).all();
  }
  createSession(data: InsertSessionLog): SessionLog {
    return db.insert(sessionLogs).values(data).returning().get() as SessionLog;
  }
  updateSession(id: number, data: Partial<InsertSessionLog>): SessionLog | undefined {
    return db.update(sessionLogs).set(data).where(eq(sessionLogs.id, id)).returning().get() as SessionLog | undefined;
  }
  deleteSession(id: number): void {
    db.delete(sessionLogs).where(eq(sessionLogs.id, id)).run();
  }

  getAllSoundscapes(): Soundscape[] {
    return db.select().from(soundscapes).orderBy(desc(soundscapes.createdAt)).all();
  }
  getSoundscapeById(id: number): Soundscape | undefined {
    return db.select().from(soundscapes).where(eq(soundscapes.id, id)).get();
  }
  createSoundscape(data: InsertSoundscape): Soundscape {
    return db.insert(soundscapes).values(data).returning().get() as Soundscape;
  }
  updateSoundscape(id: number, data: Partial<InsertSoundscape>): Soundscape | undefined {
    return db.update(soundscapes).set(data).where(eq(soundscapes.id, id)).returning().get() as Soundscape | undefined;
  }
  deleteSoundscape(id: number): void {
    db.delete(soundscapes).where(eq(soundscapes.id, id)).run();
  }

  // ─── Koshas ──────────────────────────────────────────────────
  getAllKoshas(): Kosha[] {
    return db.select().from(koshas).orderBy(koshas.sortOrder).all();
  }
  getKoshaById(id: string): Kosha | undefined {
    return db.select().from(koshas).where(eq(koshas.id, id)).get();
  }

  // ─── Nexus Memory ──────────────────────────────────────────────────────────
  getNexusMemory(): NexusMemory | undefined {
    return db.select().from(nexusMemory).where(eq(nexusMemory.key, "default")).get();
  }
  upsertNexusMemory(memory: string): NexusMemory {
    const now = new Date().toISOString();
    const existing = this.getNexusMemory();
    if (existing) {
      return db.update(nexusMemory)
        .set({ memory, updatedAt: now })
        .where(eq(nexusMemory.key, "default"))
        .returning().get() as NexusMemory;
    } else {
      return db.insert(nexusMemory)
        .values({ key: "default", memory, updatedAt: now })
        .returning().get() as NexusMemory;
    }
  }
}

export const storage = new DatabaseStorage();
