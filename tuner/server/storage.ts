import { db } from "./db";
import {
  instruments, chakras, biofieldZones, ayurvedaElements, centers,
  clientProfiles, questionnaireResponses, protocolTemplates, sessionLogs, soundscapes,
  type Instrument, type Chakra, type BiofieldZone, type AyurvedaElement, type Center,
  type ClientProfile, type InsertClientProfile,
  type QuestionnaireResponse, type InsertQuestionnaire,
  type ProtocolTemplate,
  type SessionLog, type InsertSessionLog,
  type Soundscape, type InsertSoundscape,
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
}

export const storage = new DatabaseStorage();
