/**
 * CommonUnity Tuner — Gene Keys Radiance Synthesis Engine
 *
 * Calculates the Radiance sphere (Venus Sequence) from birth date/time,
 * then synthesises a full cross-atlas resonance profile linking:
 *   Gate → HD Center → Chakra → Kosha (field layer)
 *   Gate → Codon Ring → Element → Dosha tendency
 *   Line → Body layer (bones → cells, Purpose Lines)
 *   Line → Kosha resonance (somatic depth)
 *   Line → Field depth + instrument application mode
 *
 * The Radiance sphere is calculated as the position of the Sun at
 * ~88 solar degrees (≈88 days) BEFORE the moment of birth.
 * This is the standard Human Design / Gene Keys unconscious Sun calculation.
 *
 * Sources:
 *   Human Design body graph center/gate assignments — Ra Uru Hu / IHDS
 *   Gene Keys gate/codon ring data — Richard Rudd, The Gene Keys (2009/2013)
 *   Purpose Lines (bones→cells) — Richard Rudd, Gene Keys (bodily wisdom chapters)
 *   Chakra/Kosha correspondences — Taittiriya Upanishad + Brennan synthesis
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RadianceActivation {
  gate: number;         // 1–64
  line: number;         // 1–6
  precise: boolean;     // true if birth time was provided
}

export interface RadianceProfile {
  activation: RadianceActivation;

  // Gate-derived
  gkName: string;
  shadow: string;
  gift: string;
  siddhi: string;
  codonRing: string;
  element: string;
  doshaTendency: string;

  // HD Center / Chakra chain
  hdCenter: string;
  chakraId: string;
  chakraName: string;
  chakraFrequencyHz: number;
  chakraInstrumentId: string;

  // Gate → Kosha (field layer)
  fieldKoshaLayer: number;
  fieldKoshaName: string;
  fieldBiofieldPosition: string;

  // Line → Body layer (Purpose Lines)
  lineArchetype: string;
  bodyLayer: string;
  bodyLayerDescription: string;

  // Line → Kosha (somatic depth)
  somaticKoshaLayer: number;
  somaticKoshaName: string;

  // Line → Application depth
  fieldDepth: string;
  applicationMode: string;

  // Convergence
  koshasConverge: boolean;  // field + somatic kosha layers match
  convergenceNote: string;

  // Instrument shortlist (ids from inventory)
  primaryInstruments: string[];
  secondaryInstruments: string[];

  // Nexus-ready summary string
  nexusSummary: string;
}

// ─── Gate data ────────────────────────────────────────────────────────────────
// Each gate: { name, shadow, gift, siddhi, center, codonRing }
// Center codes: ROOT | SACRAL | SOLAR | HEART | THROAT | AJNA | CROWN | G | SPLEEN
// (G-center = identity/direction center in HD, maps to heart chakra space)

const GATES: Record<number, {
  name: string; shadow: string; gift: string; siddhi: string;
  center: string; codonRing: string;
}> = {
  1:  { name: "Freshness",        shadow: "Entropy",       gift: "Freshness",      siddhi: "Beauty",          center: "G",      codonRing: "Ring of Fire" },
  2:  { name: "Disorientation",   shadow: "Disorientation",gift: "Orientation",    siddhi: "Unity",           center: "G",      codonRing: "Ring of Life & Death" },
  3:  { name: "Chaos",            shadow: "Chaos",         gift: "Innovation",     siddhi: "Innocence",       center: "SACRAL", codonRing: "Ring of Mutation" },
  4:  { name: "Intolerance",      shadow: "Intolerance",   gift: "Understanding",  siddhi: "Forgiveness",     center: "AJNA",   codonRing: "Ring of Alchemy" },
  5:  { name: "Impatience",       shadow: "Impatience",    gift: "Patience",       siddhi: "Timelessness",    center: "SACRAL", codonRing: "Ring of Destiny" },
  6:  { name: "Conflict",         shadow: "Conflict",      gift: "Diplomacy",      siddhi: "Peace",           center: "SPLEEN", codonRing: "Ring of Alchemy" },
  7:  { name: "Division",         shadow: "Division",      gift: "Guidance",       siddhi: "Virtue",          center: "G",      codonRing: "Ring of Divinity" },
  8:  { name: "Mediocrity",       shadow: "Mediocrity",    gift: "Style",          siddhi: "Exquisiteness",   center: "THROAT", codonRing: "Ring of Fire" },
  9:  { name: "Inertia",          shadow: "Inertia",       gift: "Determination",  siddhi: "Invincibility",   center: "SACRAL", codonRing: "Ring of Destiny" },
  10: { name: "Self-Obsession",   shadow: "Self-Obsession",gift: "Naturalness",    siddhi: "Being",           center: "G",      codonRing: "Ring of Humanity" },
  11: { name: "Obscurity",        shadow: "Obscurity",     gift: "Idealism",       siddhi: "Light",           center: "AJNA",   codonRing: "Ring of Light" },
  12: { name: "Vanity",           shadow: "Vanity",        gift: "Discrimination", siddhi: "Purity",          center: "THROAT", codonRing: "Ring of Trials" },
  13: { name: "Discord",          shadow: "Discord",       gift: "Discernment",    siddhi: "Empathy",         center: "G",      codonRing: "Ring of Divinity" },
  14: { name: "Compromise",       shadow: "Compromise",    gift: "Competence",     siddhi: "Bounteousness",   center: "SACRAL", codonRing: "Ring of Light" },
  15: { name: "Dullness",         shadow: "Dullness",      gift: "Magnetism",      siddhi: "Florescence",     center: "G",      codonRing: "Ring of Humanity" },
  16: { name: "Indifference",     shadow: "Indifference",  gift: "Versatility",    siddhi: "Mastery",         center: "THROAT", codonRing: "Ring of Purification" },
  17: { name: "Opinion",          shadow: "Opinion",       gift: "Far-sightedness",siddhi: "Omniscience",     center: "AJNA",   codonRing: "Ring of Fulfillment" },
  18: { name: "Judgment",         shadow: "Judgment",      gift: "Integrity",      siddhi: "Perfection",      center: "SPLEEN", codonRing: "Ring of Purification" },
  19: { name: "Co-dependence",    shadow: "Co-dependence", gift: "Sensitivity",    siddhi: "Sacrifice",       center: "ROOT",   codonRing: "Ring of Trials" },
  20: { name: "Superficiality",   shadow: "Superficiality",gift: "Self-Assurance", siddhi: "Presence",        center: "THROAT", codonRing: "Ring of the Sphinx" },
  21: { name: "Control",          shadow: "Control",       gift: "Authority",      siddhi: "Valour",          center: "HEART",  codonRing: "Ring of Maya" },
  22: { name: "Dishonour",        shadow: "Dishonour",     gift: "Graciousness",   siddhi: "Grace",           center: "SPLEEN", codonRing: "Ring of Compassion" },
  23: { name: "Complexity",       shadow: "Complexity",    gift: "Simplicity",     siddhi: "Quintessence",    center: "THROAT", codonRing: "Ring of Alchemy" },
  24: { name: "Addiction",        shadow: "Addiction",     gift: "Invention",      siddhi: "Silence",         center: "AJNA",   codonRing: "Ring of the Sphinx" },
  25: { name: "Constriction",     shadow: "Constriction",  gift: "Acceptance",     siddhi: "Universal Love",  center: "G",      codonRing: "Ring of Humanity" },
  26: { name: "Pride",            shadow: "Pride",         gift: "Artfulness",     siddhi: "Invisibility",    center: "HEART",  codonRing: "Ring of Prosperity" },
  27: { name: "Self-Destruction", shadow: "Self-Destruction",gift:"Altruism",      siddhi: "Selflessness",    center: "SACRAL", codonRing: "Ring of Life & Death" },
  28: { name: "Purposelessness",  shadow: "Purposelessness",gift:"Totality",       siddhi: "Immortality",     center: "SPLEEN", codonRing: "Ring of Life & Death" },
  29: { name: "Half-heartedness", shadow: "Half-heartedness",gift:"Commitment",    siddhi: "Devotion",        center: "SACRAL", codonRing: "Ring of Destiny" },
  30: { name: "Desire",           shadow: "Desire",        gift: "Lightness",      siddhi: "Rapture",         center: "SPLEEN", codonRing: "Ring of Compassion" },
  31: { name: "Arrogance",        shadow: "Arrogance",     gift: "Leadership",     siddhi: "Humility",        center: "THROAT", codonRing: "Ring of Humanity" },
  32: { name: "Failure",          shadow: "Failure",       gift: "Preservation",   siddhi: "Veneration",      center: "SPLEEN", codonRing: "Ring of Purification" },
  33: { name: "Forgetting",       shadow: "Forgetting",    gift: "Mindfulness",    siddhi: "Revelation",      center: "THROAT", codonRing: "Ring of the Sphinx" },
  34: { name: "Force",            shadow: "Force",         gift: "Strength",       siddhi: "Majesty",         center: "SACRAL", codonRing: "Ring of Sovereignty" },
  35: { name: "Hunger",           shadow: "Hunger",        gift: "Adventure",      siddhi: "Boundlessness",   center: "THROAT", codonRing: "Ring of Miracles" },
  36: { name: "Turbulence",       shadow: "Turbulence",    gift: "Humanity",       siddhi: "Compassion",      center: "SPLEEN", codonRing: "Ring of Compassion" },
  37: { name: "Weakness",         shadow: "Weakness",      gift: "Equality",       siddhi: "Tenderness",      center: "SPLEEN", codonRing: "Ring of Trials" },
  38: { name: "Struggle",         shadow: "Struggle",      gift: "Perseverance",   siddhi: "Honour",          center: "ROOT",   codonRing: "Ring of Seeking" },
  39: { name: "Provocation",      shadow: "Provocation",   gift: "Dynamism",       siddhi: "Liberation",      center: "ROOT",   codonRing: "Ring of Seeking" },
  40: { name: "Exhaustion",       shadow: "Exhaustion",    gift: "Resolve",        siddhi: "Divine Will",     center: "HEART",  codonRing: "Ring of Alchemy" },
  41: { name: "Fantasy",          shadow: "Fantasy",       gift: "Anticipation",   siddhi: "Emanation",       center: "ROOT",   codonRing: "Ring of Origin" },
  42: { name: "Expectation",      shadow: "Expectation",   gift: "Detachment",     siddhi: "Celebration",     center: "SACRAL", codonRing: "Ring of Mutation" },
  43: { name: "Deafness",         shadow: "Deafness",      gift: "Insight",        siddhi: "Epiphany",        center: "AJNA",   codonRing: "Ring of Illuminati" },
  44: { name: "Interference",     shadow: "Interference",  gift: "Teamwork",       siddhi: "Synarchy",        center: "SPLEEN", codonRing: "Ring of Prosperity" },
  45: { name: "Dominance",        shadow: "Dominance",     gift: "Synergy",        siddhi: "Communion",       center: "THROAT", codonRing: "Ring of Light" },
  46: { name: "Seriousness",      shadow: "Seriousness",   gift: "Delight",        siddhi: "Ecstasy",         center: "G",      codonRing: "Ring of the Whirlwind" },
  47: { name: "Oppression",       shadow: "Oppression",    gift: "Transmutation",  siddhi: "Transfiguration", center: "AJNA",   codonRing: "Ring of Illuminati" },
  48: { name: "Inadequacy",       shadow: "Inadequacy",    gift: "Resourcefulness",siddhi: "Wisdom",          center: "SPLEEN", codonRing: "Ring of the Whirlwind" },
  49: { name: "Reaction",         shadow: "Reaction",      gift: "Revolution",     siddhi: "Rebirth",         center: "SPLEEN", codonRing: "Ring of Origin" },
  50: { name: "Corruption",       shadow: "Corruption",    gift: "Nurturing",      siddhi: "Harmony",         center: "SPLEEN", codonRing: "Ring of Fulfillment" },
  51: { name: "Agitation",        shadow: "Agitation",     gift: "Initiative",     siddhi: "Awakening",       center: "HEART",  codonRing: "Ring of Seeking" },
  52: { name: "Stress",           shadow: "Stress",        gift: "Restraint",      siddhi: "Stillness",       center: "ROOT",   codonRing: "Ring of Stillness" },
  53: { name: "Immaturity",       shadow: "Immaturity",    gift: "Expansion",      siddhi: "Superabundance",  center: "ROOT",   codonRing: "Ring of Mutation" },
  54: { name: "Greed",            shadow: "Greed",         gift: "Aspiration",     siddhi: "Ascension",       center: "ROOT",   codonRing: "Ring of Prosperity" },
  55: { name: "Victimisation",    shadow: "Victimisation", gift: "Freedom",        siddhi: "Freedom",         center: "SPLEEN", codonRing: "Ring of the Whirlwind" },
  56: { name: "Distraction",      shadow: "Distraction",   gift: "Enrichment",     siddhi: "Intoxication",    center: "THROAT", codonRing: "Ring of Miracles" },
  57: { name: "Unease",           shadow: "Unease",        gift: "Intuition",      siddhi: "Clarity",         center: "SPLEEN", codonRing: "Ring of Divinity" },
  58: { name: "Dissatisfaction",  shadow: "Dissatisfaction",gift:"Vitality",       siddhi: "Bliss",           center: "ROOT",   codonRing: "Ring of Illuminati" },
  59: { name: "Dishonesty",       shadow: "Dishonesty",    gift: "Intimacy",       siddhi: "Transparency",    center: "SACRAL", codonRing: "Ring of the Whirlwind" },
  60: { name: "Limitation",       shadow: "Limitation",    gift: "Realism",        siddhi: "Justice",         center: "ROOT",   codonRing: "Ring of Stillness" },
  61: { name: "Psychosis",        shadow: "Psychosis",     gift: "Inspiration",    siddhi: "Sanctity",        center: "CROWN",  codonRing: "Ring of Origin" },
  62: { name: "Intellectualism",  shadow: "Intellectualism",gift:"Precision",      siddhi: "Impeccability",   center: "THROAT", codonRing: "Ring of Stillness" },
  63: { name: "Doubt",            shadow: "Doubt",         gift: "Inquiry",        siddhi: "Truth",           center: "AJNA",   codonRing: "Ring of Fulfillment" },
  64: { name: "Confusion",        shadow: "Confusion",     gift: "Imagination",    siddhi: "Illumination",    center: "CROWN",  codonRing: "Ring of Origin" },
};

// ─── HD Center → Chakra mapping ───────────────────────────────────────────────
// HD has 9 centers; we map to the 7-chakra system + note where HD centers overlap

const CENTER_TO_CHAKRA: Record<string, {
  chakraId: string; chakraName: string; freqHz: number; instrumentId: string;
}> = {
  ROOT:   { chakraId: "CH-ROOT",      chakraName: "Mūlādhāra (Root)",       freqHz: 194.18, instrumentId: "TF-PW-ROOT" },
  SACRAL: { chakraId: "CH-SACRAL",    chakraName: "Svādhiṣṭhāna (Sacral)",   freqHz: 210.42, instrumentId: "TF-PW-SACRAL" },
  SOLAR:  { chakraId: "CH-SOLAR",     chakraName: "Maṇipūra (Solar Plexus)", freqHz: 126.22, instrumentId: "TF-PW-SOLAR" },
  HEART:  { chakraId: "CH-HEART",     chakraName: "Anāhata (Heart)",         freqHz: 136.10, instrumentId: "TF-PW-HEART" },
  // HD HEART/EGO center maps to heart chakra territory
  SPLEEN: { chakraId: "CH-SACRAL",    chakraName: "Svādhiṣṭhāna / Spleen field", freqHz: 210.42, instrumentId: "TF-PW-SACRAL" },
  // Spleen center sits in the lower body; closest is sacral/solar boundary — we use sacral
  THROAT: { chakraId: "CH-THROAT",    chakraName: "Viśuddha (Throat)",       freqHz: 141.27, instrumentId: "TF-PW-THROAT" },
  G:      { chakraId: "CH-HEART",     chakraName: "G-Center / Anāhata bridge",freqHz: 136.10, instrumentId: "TF-PW-HEART" },
  // G-center (identity/love/direction) is the heart of HD — maps to Anāhata
  AJNA:   { chakraId: "CH-THIRD-EYE", chakraName: "Ājñā (Third Eye)",        freqHz: 221.23, instrumentId: "TF-PW-3RD" },
  CROWN:  { chakraId: "CH-CROWN",     chakraName: "Sahasrāra (Crown)",       freqHz: 172.06, instrumentId: "TF-PW-CROWN" },
};

// ─── Chakra → Kosha (field layer) mapping ─────────────────────────────────────

const CHAKRA_TO_KOSHA: Record<string, { layer: number; name: string; biofieldPosition: string }> = {
  "CH-ROOT":      { layer: 1, name: "Annamaya Kosha",    biofieldPosition: "0–2 inches from body" },
  "CH-SACRAL":    { layer: 2, name: "Pranamaya Kosha",   biofieldPosition: "1–4 inches from body" },
  "CH-SOLAR":     { layer: 3, name: "Manomaya Kosha",    biofieldPosition: "2–8 inches from body" },
  "CH-HEART":     { layer: 4, name: "Vijnanamaya Kosha", biofieldPosition: "6–12 inches from body" },
  "CH-THROAT":    { layer: 5, name: "Anandamaya Kosha",  biofieldPosition: "18 inches–2 feet" },
  "CH-THIRD-EYE": { layer: 6, name: "Buddhimaya Kosha",  biofieldPosition: "2–3 feet from body" },
  "CH-CROWN":     { layer: 7, name: "Atmamaya Kosha",    biofieldPosition: "3+ feet from body" },
};

// ─── Codon Ring → Element → Dosha ─────────────────────────────────────────────

const CODON_RING_TO_ELEMENT: Record<string, { element: string; dosha: string; quality: string }> = {
  "Ring of Fire":        { element: "Fire",  dosha: "Pitta",       quality: "transformative, sharp, metabolic" },
  "Ring of Life & Death":{ element: "Water", dosha: "Kapha-Vata",  quality: "cyclical, releasing, dissolution" },
  "Ring of Mutation":    { element: "Water", dosha: "Vata",        quality: "fluid, spontaneous, breakthrough" },
  "Ring of Alchemy":     { element: "Fire",  dosha: "Pitta",       quality: "transformative, catalytic" },
  "Ring of Destiny":     { element: "Earth", dosha: "Kapha",       quality: "patient, accumulative, grounded" },
  "Ring of Fulfillment": { element: "Space", dosha: "Vata",        quality: "expansive, visionary, connective" },
  "Ring of Divinity":    { element: "Space", dosha: "Vata",        quality: "refined, transcendent, non-local" },
  "Ring of Humanity":    { element: "Air",   dosha: "Vata-Pitta",  quality: "relational, empathic, social" },
  "Ring of Purification":{ element: "Fire",  dosha: "Pitta",       quality: "clarifying, precise, corrective" },
  "Ring of Trials":      { element: "Earth", dosha: "Kapha-Pitta", quality: "resilient, enduring, testing" },
  "Ring of Light":       { element: "Fire",  dosha: "Pitta",       quality: "illuminating, visionary, solar" },
  "Ring of Miracles":    { element: "Space", dosha: "Vata",        quality: "spontaneous, unexpected grace" },
  "Ring of Compassion":  { element: "Water", dosha: "Kapha",       quality: "nurturing, feeling, receptive" },
  "Ring of Seeking":     { element: "Fire",  dosha: "Pitta-Vata",  quality: "questing, restless, purposeful" },
  "Ring of Prosperity":  { element: "Earth", dosha: "Kapha",       quality: "abundant, consolidating, material" },
  "Ring of Sovereignty": { element: "Fire",  dosha: "Pitta",       quality: "powerful, directing, embodied will" },
  "Ring of the Sphinx":  { element: "Air",   dosha: "Vata",        quality: "mysterious, paradoxical, liminal" },
  "Ring of Illuminati":  { element: "Space", dosha: "Vata-Pitta",  quality: "revealing, cognitive, awakening" },
  "Ring of the Whirlwind":{ element: "Air",  dosha: "Vata",        quality: "spiralling, fast, catalytic change" },
  "Ring of Origin":      { element: "Space", dosha: "Vata",        quality: "primordial, source-level, cosmic" },
  "Ring of Stillness":   { element: "Earth", dosha: "Kapha",       quality: "consolidating, resting, gathered" },
  "Ring of Maya":        { element: "Air",   dosha: "Vata-Kapha",  quality: "illusory, dreamy, boundary-dissolving" },
};

// ─── Line → Purpose Line (Body layer) + application data ──────────────────────

const LINE_DATA: Record<number, {
  archetype: string;
  bodyLayer: string;
  bodyLayerDesc: string;
  somaticKoshaLayer: number;
  somaticKoshaName: string;
  fieldDepth: string;
  applicationMode: string;
  primaryInstrumentTypes: string[];   // descriptive types for shortlisting
}> = {
  1: {
    archetype: "Foundation",
    bodyLayer: "Bones / Skeleton",
    bodyLayerDesc: "Structural foundation — mineral density, periosteum, deep support tissue. The Radiance energy seeks expression through the most fundamental physical structure.",
    somaticKoshaLayer: 1,
    somaticKoshaName: "Annamaya Kosha",
    fieldDepth: "Body contact — 0 to 2 inches",
    applicationMode: "Weighted forks applied directly to bone landmarks: sacrum, sternum, mastoid process, long bones. Allow vibration to travel through the skeletal structure. Deep, slow, sustained contact — minimum 30 seconds per placement. The body needs to feel held before it opens.",
    primaryInstrumentTypes: ["weighted-bone-conduction"],
  },
  2: {
    archetype: "Hermit",
    bodyLayer: "Organs",
    bodyLayerDesc: "Autonomous organ intelligence — innate self-regulating function. The Radiance energy works through the organ systems' natural wisdom rather than the thinking mind.",
    somaticKoshaLayer: 1,
    somaticKoshaName: "Annamaya / Pranamaya boundary",
    fieldDepth: "Near field — 1 to 4 inches",
    applicationMode: "Weighted forks placed over organ areas (not on protruding bones) — solar plexus, liver/spleen region, lower abdomen. Light touch, allow the fork to rest rather than press. The organs respond to invitation, not force. Also effective in near-field (1–4 inches) hovering above the organ area.",
    primaryInstrumentTypes: ["weighted-soft-tissue"],
  },
  3: {
    archetype: "Martyr",
    bodyLayer: "Glands / Endocrine System",
    bodyLayerDesc: "Chemical translation layer — hormonal rhythms, adaptive stress response, the body's intelligence for translating vibrational input into biochemical change.",
    somaticKoshaLayer: 2,
    somaticKoshaName: "Pranamaya Kosha",
    fieldDepth: "Near-to-mid field — 2 to 8 inches",
    applicationMode: "Solfeggio and planetary forks near endocrine sites: thyroid/throat region (141.27 Hz), adrenal/kidney area (194.18 Hz), gonads/sacral region (210.42 Hz), pineal/crown area (172.06 Hz). Hold in the near field — 2 to 6 inches from body surface. The endocrine system responds to sustained tonal presence rather than movement.",
    primaryInstrumentTypes: ["solfeggio", "planetary-near-field"],
  },
  4: {
    archetype: "Opportunist",
    bodyLayer: "Nervous System",
    bodyLayerDesc: "Connectivity and signal transmission — the relational network of the body. The Radiance energy communicates through the nervous system's capacity for sensitivity and pattern recognition.",
    somaticKoshaLayer: 3,
    somaticKoshaName: "Manomaya Kosha",
    fieldDepth: "Mid field — 4 to 12 inches",
    applicationMode: "Unweighted forks in the air field — the nervous system responds primarily to air conduction and acoustic resonance rather than physical vibration. Sweep slowly through the mid-field around the head, spine, and solar plexus. Tuning fork pairs creating interval resonance are especially effective here. Allow pauses — the nervous system integrates in the silence between tones.",
    primaryInstrumentTypes: ["unweighted-field"],
  },
  5: {
    archetype: "Heretic",
    bodyLayer: "Blood / Circulation",
    bodyLayerDesc: "Distribution and nourishment — the life force carried through the entire system. The Radiance energy works through the whole-body circulation as an integrating, distributing intelligence.",
    somaticKoshaLayer: 4,
    somaticKoshaName: "Vijnanamaya Kosha",
    fieldDepth: "Mid-to-far field — 6 to 24 inches",
    applicationMode: "Full-body sweeps and whole-field envelope work. Begin at the feet and sweep upward through the entire biofield. The circulatory layer responds to momentum and flow — keep the fork moving rather than holding. Finish by creating a complete torus envelope around the client from head to toe. Session tone: distributive, complete, whole-body.",
    primaryInstrumentTypes: ["unweighted-sweep", "field-envelope"],
  },
  6: {
    archetype: "Role Model",
    bodyLayer: "Cells / DNA",
    bodyLayerDesc: "Identity at source — epigenetic expression, cellular memory, the DNA as receiver of vibrational information. The Radiance energy operates at the most refined level of physical intelligence.",
    somaticKoshaLayer: 5,
    somaticKoshaName: "Anandamaya / Buddhimaya",
    fieldDepth: "Far field — 18 inches to 3+ feet",
    applicationMode: "Far-field and subtle body work. Fibonacci forks (144 Hz unweighted) combed slowly through the outer field — their mathematical ratio is said to 'cut through heavy distortions in the electromagnetic biofield.' Tibetan bell struck in the space above and around the client. Long silences. This is the most refined application layer — presence and intention are primary instruments. The cellular level is reached through the quality of stillness, not through mechanical application.",
    primaryInstrumentTypes: ["fibonacci", "bell", "far-field"],
  },
};

// ─── Instrument shortlisting by center/line combination ───────────────────────

const CENTER_INSTRUMENTS: Record<string, { primary: string[]; secondary: string[] }> = {
  ROOT:   { primary: ["TF-OTTO-128", "TF-BT-SLIDER", "TF-PW-ROOT"],          secondary: ["TF-BT-SCHU-62", "TF-BT-SOL-174"] },
  SACRAL: { primary: ["TF-PW-SACRAL", "TF-BT-SOL-417"],                       secondary: ["TF-BT-FIB-89", "TF-PW-ROOT"] },
  SOLAR:  { primary: ["TF-PW-SOLAR", "TF-BT-FIB-144W"],                       secondary: ["TF-BT-SOL-528", "TF-OTTO-128"] },
  HEART:  { primary: ["TF-PW-HEART", "TF-OM-136W", "TF-BT-SOL-528"],          secondary: ["BOWL-528", "BELL-771"] },
  SPLEEN: { primary: ["TF-PW-SACRAL", "TF-BT-SOL-417"],                       secondary: ["TF-BT-FIB-89", "TF-PW-ROOT"] },
  THROAT: { primary: ["TF-PW-THROAT", "TF-BT-FIB-144U", "TF-BT-FIB-144W"],   secondary: ["BELL-771", "TF-BT-222"] },
  G:      { primary: ["TF-PW-HEART", "TF-OM-136W"],                           secondary: ["TF-BT-SOL-528", "BOWL-528"] },
  AJNA:   { primary: ["TF-PW-3RD", "TF-BT-222"],                              secondary: ["BOWL-429", "TF-BT-FIB-144U"] },
  CROWN:  { primary: ["TF-PW-CROWN", "BELL-771", "TF-BT-222"],                secondary: ["TF-BT-FIB-144U", "TF-PW-3RD"] },
};

// Line-specific additions (merged with center instruments)
const LINE_INSTRUMENTS: Record<number, { add: string[] }> = {
  1: { add: ["TF-OTTO-128", "TF-BT-SLIDER"] },
  2: { add: ["TF-OTTO-128", "TF-BT-SCHU-54"] },
  3: { add: ["TF-BT-SOL-174", "TF-BT-SOL-417"] },
  4: { add: ["TF-BT-FIB-144U", "TF-BT-222"] },
  5: { add: ["TF-BT-FIB-144U", "TF-BT-FIB-144W"] },
  6: { add: ["TF-BT-FIB-144U", "BELL-771"] },
};

// ─── Solar longitude → HD gate lookup ─────────────────────────────────────────
// Each gate spans 5.625° of solar arc (360° / 64 gates)
// The HD wheel begins at gate 41 at 0° Aries and proceeds in a specific sequence
// This is the authentic IHDS gate wheel order

const GATE_WHEEL: number[] = [
  41, 19, 13, 49, 30, 55, 37, 63, 22, 36, 25, 17, 21, 51, 42, 3,
  27, 24, 2,  23, 8,  20, 16, 35, 45, 12, 15, 52, 39, 53, 62, 56,
  31, 33, 7,  4,  29, 59, 40, 64, 47, 6,  46, 18, 48, 57, 32, 50,
  28, 44, 1,  43, 14, 34, 9,  5,  26, 11, 10, 58, 38, 54, 61, 60,
];

// Solar longitude of the Sun for a given date (approximate, accurate to ~0.5°)
function getSolarLongitude(date: Date): number {
  // Days since J2000.0 (2000-01-01 12:00 TT)
  const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
  const n = (date.getTime() - J2000) / 86400000;

  // Mean longitude of the Sun (degrees)
  const L = (280.460 + 0.9856474 * n) % 360;
  // Mean anomaly (degrees)
  const g = ((357.528 + 0.9856003 * n) % 360) * (Math.PI / 180);
  // Ecliptic longitude
  const lambda = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) % 360;
  return lambda < 0 ? lambda + 360 : lambda;
}

// Convert solar longitude to HD gate + line
function longitudeToGateLine(lon: number): { gate: number; line: number } {
  // Normalise: HD wheel starts at gate 41 at 0° Aries (0° ecliptic)
  const gateIndex = Math.floor(lon / 5.625) % 64;
  const gate = GATE_WHEEL[gateIndex];
  const degWithinGate = lon % 5.625;
  const line = Math.min(6, Math.floor(degWithinGate / 0.9375) + 1);
  return { gate, line };
}

// ─── Main calculation ──────────────────────────────────────────────────────────

/**
 * Calculate the Radiance Gene Key activation from a birth date.
 * The Radiance sphere = unconscious Sun = Sun position 88° before birth.
 *
 * @param birthDateStr  ISO date string "YYYY-MM-DD"
 * @param birthTimeStr  Optional "HH:MM" (24h) — improves line accuracy
 */
export function calculateRadiance(
  birthDateStr: string,
  birthTimeStr?: string | null
): RadianceActivation {
  const [y, m, d] = birthDateStr.split("-").map(Number);
  let hours = 12; // default to noon when time unknown
  if (birthTimeStr) {
    const parts = birthTimeStr.split(":");
    hours = parseInt(parts[0]) + (parseInt(parts[1] ?? "0") / 60);
  }
  const precise = !!birthTimeStr;

  // Birth moment in UTC (approximate — birthPlace timezone not factored,
  // introduces ±1 line error near boundaries for far-from-UTC timezones)
  const birthMs = Date.UTC(y, m - 1, d, hours, 0, 0);

  // Radiance = 88 solar degrees before birth ≈ 88 days (Earth moves ~1°/day)
  const RADIANCE_OFFSET_MS = 88 * 24 * 60 * 60 * 1000;
  const radianceDate = new Date(birthMs - RADIANCE_OFFSET_MS);

  const lon = getSolarLongitude(radianceDate);
  const { gate, line } = longitudeToGateLine(lon);

  return { gate, line, precise };
}

// ─── Full synthesis ────────────────────────────────────────────────────────────

export function synthesizeRadianceProfile(activation: RadianceActivation): RadianceProfile {
  const { gate, line } = activation;

  const gateData = GATES[gate];
  if (!gateData) throw new Error(`Unknown gate: ${gate}`);

  const centerData = CENTER_TO_CHAKRA[gateData.center];
  const koshaField = CHAKRA_TO_KOSHA[centerData.chakraId];
  const codonData = CODON_RING_TO_ELEMENT[gateData.codonRing] ?? { element: "Space", dosha: "Vata", quality: "subtle" };
  const lineData = LINE_DATA[line];

  // Build instrument shortlist — center instruments + line additions, deduplicated
  const centerInst = CENTER_INSTRUMENTS[gateData.center] ?? { primary: [], secondary: [] };
  const lineAdd = LINE_INSTRUMENTS[line]?.add ?? [];
  const allPrimary = [...new Set([...centerInst.primary, ...lineAdd])].slice(0, 5);
  const allSecondary = [...new Set(centerInst.secondary.filter(i => !allPrimary.includes(i)))].slice(0, 3);

  // Convergence check
  const koshasConverge = koshaField.layer === lineData.somaticKoshaLayer;
  const convergenceNote = koshasConverge
    ? `Gate and Line both point to ${koshaField.name} — strong convergence. This layer is the primary therapeutic focus for this client.`
    : `Gate points to ${koshaField.name} (Layer ${koshaField.layer}, field work) while Line points to ${lineData.somaticKoshaName} (Layer ${lineData.somaticKoshaLayer}, somatic depth). Address both: begin with the deeper somatic layer, then expand to the field layer.`;

  // Nexus summary
  const nexusSummary = [
    `RADIANCE SPHERE — GK ${gate}.${line} (${gateData.name})`,
    `Shadow: ${gateData.shadow} → Gift: ${gateData.gift} → Siddhi: ${gateData.siddhi}`,
    `Codon Ring: ${gateData.codonRing} | Element: ${codonData.element} | Dosha tendency: ${codonData.dosha}`,
    `HD Center: ${gateData.center} → ${centerData.chakraName} (${centerData.freqHz} Hz)`,
    `Field layer (gate→chakra→kosha): ${koshaField.name} | Biofield: ${koshaField.biofieldPosition}`,
    `Line ${line} — ${lineData.archetype} | Body: ${lineData.bodyLayer}`,
    `Somatic layer (line→body→kosha): ${lineData.somaticKoshaName}`,
    `Application depth: ${lineData.fieldDepth}`,
    koshasConverge ? `Convergence: STRONG — both signals align at Layer ${koshaField.layer}` : `Convergence: SPLIT — field layer ${koshaField.layer}, somatic layer ${lineData.somaticKoshaLayer}`,
    `Primary forks: ${allPrimary.join(", ")}`,
    `Application: ${lineData.applicationMode.slice(0, 120)}...`,
  ].join("\n");

  return {
    activation,
    gkName: gateData.name,
    shadow: gateData.shadow,
    gift: gateData.gift,
    siddhi: gateData.siddhi,
    codonRing: gateData.codonRing,
    element: codonData.element,
    doshaTendency: codonData.dosha,
    hdCenter: gateData.center,
    chakraId: centerData.chakraId,
    chakraName: centerData.chakraName,
    chakraFrequencyHz: centerData.freqHz,
    chakraInstrumentId: centerData.instrumentId,
    fieldKoshaLayer: koshaField.layer,
    fieldKoshaName: koshaField.name,
    fieldBiofieldPosition: koshaField.biofieldPosition,
    lineArchetype: lineData.archetype,
    bodyLayer: lineData.bodyLayer,
    bodyLayerDescription: lineData.bodyLayerDesc,
    somaticKoshaLayer: lineData.somaticKoshaLayer,
    somaticKoshaName: lineData.somaticKoshaName,
    fieldDepth: lineData.fieldDepth,
    applicationMode: lineData.applicationMode,
    koshasConverge,
    convergenceNote,
    primaryInstruments: allPrimary,
    secondaryInstruments: allSecondary,
    nexusSummary,
  };
}
