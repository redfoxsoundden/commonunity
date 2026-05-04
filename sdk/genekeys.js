var CommonUnityGK = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var genekeys_exports = {};
  __export(genekeys_exports, {
    calculateRadiance: () => calculateRadiance,
    dateToJD: () => dateToJD,
    jdToSolarLongitude: () => jdToSolarLongitude,
    longitudeToGateLine: () => longitudeToGateLine,
    synthesizeRadianceProfile: () => synthesizeRadianceProfile
  });
  const GATES = {
    1: { name: "Freshness", shadow: "Entropy", gift: "Freshness", siddhi: "Beauty", center: "G", codonRing: "Ring of Fire" },
    2: { name: "Disorientation", shadow: "Disorientation", gift: "Orientation", siddhi: "Unity", center: "G", codonRing: "Ring of Life & Death" },
    3: { name: "Chaos", shadow: "Chaos", gift: "Innovation", siddhi: "Innocence", center: "SACRAL", codonRing: "Ring of Mutation" },
    4: { name: "Intolerance", shadow: "Intolerance", gift: "Understanding", siddhi: "Forgiveness", center: "AJNA", codonRing: "Ring of Alchemy" },
    5: { name: "Impatience", shadow: "Impatience", gift: "Patience", siddhi: "Timelessness", center: "SACRAL", codonRing: "Ring of Destiny" },
    6: { name: "Conflict", shadow: "Conflict", gift: "Diplomacy", siddhi: "Peace", center: "SPLEEN", codonRing: "Ring of Alchemy" },
    7: { name: "Division", shadow: "Division", gift: "Guidance", siddhi: "Virtue", center: "G", codonRing: "Ring of Divinity" },
    8: { name: "Mediocrity", shadow: "Mediocrity", gift: "Style", siddhi: "Exquisiteness", center: "THROAT", codonRing: "Ring of Fire" },
    9: { name: "Inertia", shadow: "Inertia", gift: "Determination", siddhi: "Invincibility", center: "SACRAL", codonRing: "Ring of Destiny" },
    10: { name: "Self-Obsession", shadow: "Self-Obsession", gift: "Naturalness", siddhi: "Being", center: "G", codonRing: "Ring of Humanity" },
    11: { name: "Obscurity", shadow: "Obscurity", gift: "Idealism", siddhi: "Light", center: "AJNA", codonRing: "Ring of Light" },
    12: { name: "Vanity", shadow: "Vanity", gift: "Discrimination", siddhi: "Purity", center: "THROAT", codonRing: "Ring of Trials" },
    13: { name: "Discord", shadow: "Discord", gift: "Discernment", siddhi: "Empathy", center: "G", codonRing: "Ring of Divinity" },
    14: { name: "Compromise", shadow: "Compromise", gift: "Competence", siddhi: "Bounteousness", center: "SACRAL", codonRing: "Ring of Light" },
    15: { name: "Dullness", shadow: "Dullness", gift: "Magnetism", siddhi: "Florescence", center: "G", codonRing: "Ring of Humanity" },
    16: { name: "Indifference", shadow: "Indifference", gift: "Versatility", siddhi: "Mastery", center: "THROAT", codonRing: "Ring of Purification" },
    17: { name: "Opinion", shadow: "Opinion", gift: "Far-sightedness", siddhi: "Omniscience", center: "AJNA", codonRing: "Ring of Fulfillment" },
    18: { name: "Judgment", shadow: "Judgment", gift: "Integrity", siddhi: "Perfection", center: "SPLEEN", codonRing: "Ring of Purification" },
    19: { name: "Co-dependence", shadow: "Co-dependence", gift: "Sensitivity", siddhi: "Sacrifice", center: "ROOT", codonRing: "Ring of Trials" },
    20: { name: "Superficiality", shadow: "Superficiality", gift: "Self-Assurance", siddhi: "Presence", center: "THROAT", codonRing: "Ring of the Sphinx" },
    21: { name: "Control", shadow: "Control", gift: "Authority", siddhi: "Valour", center: "HEART", codonRing: "Ring of Maya" },
    22: { name: "Dishonour", shadow: "Dishonour", gift: "Graciousness", siddhi: "Grace", center: "SPLEEN", codonRing: "Ring of Compassion" },
    23: { name: "Complexity", shadow: "Complexity", gift: "Simplicity", siddhi: "Quintessence", center: "THROAT", codonRing: "Ring of Alchemy" },
    24: { name: "Addiction", shadow: "Addiction", gift: "Invention", siddhi: "Silence", center: "AJNA", codonRing: "Ring of the Sphinx" },
    25: { name: "Constriction", shadow: "Constriction", gift: "Acceptance", siddhi: "Universal Love", center: "G", codonRing: "Ring of Humanity" },
    26: { name: "Pride", shadow: "Pride", gift: "Artfulness", siddhi: "Invisibility", center: "HEART", codonRing: "Ring of Prosperity" },
    27: { name: "Self-Destruction", shadow: "Self-Destruction", gift: "Altruism", siddhi: "Selflessness", center: "SACRAL", codonRing: "Ring of Life & Death" },
    28: { name: "Purposelessness", shadow: "Purposelessness", gift: "Totality", siddhi: "Immortality", center: "SPLEEN", codonRing: "Ring of Life & Death" },
    29: { name: "Half-heartedness", shadow: "Half-heartedness", gift: "Commitment", siddhi: "Devotion", center: "SACRAL", codonRing: "Ring of Destiny" },
    30: { name: "Desire", shadow: "Desire", gift: "Lightness", siddhi: "Rapture", center: "SPLEEN", codonRing: "Ring of Compassion" },
    31: { name: "Arrogance", shadow: "Arrogance", gift: "Leadership", siddhi: "Humility", center: "THROAT", codonRing: "Ring of Humanity" },
    32: { name: "Failure", shadow: "Failure", gift: "Preservation", siddhi: "Veneration", center: "SPLEEN", codonRing: "Ring of Purification" },
    33: { name: "Forgetting", shadow: "Forgetting", gift: "Mindfulness", siddhi: "Revelation", center: "THROAT", codonRing: "Ring of the Sphinx" },
    34: { name: "Force", shadow: "Force", gift: "Strength", siddhi: "Majesty", center: "SACRAL", codonRing: "Ring of Sovereignty" },
    35: { name: "Hunger", shadow: "Hunger", gift: "Adventure", siddhi: "Boundlessness", center: "THROAT", codonRing: "Ring of Miracles" },
    36: { name: "Turbulence", shadow: "Turbulence", gift: "Humanity", siddhi: "Compassion", center: "SPLEEN", codonRing: "Ring of Compassion" },
    37: { name: "Weakness", shadow: "Weakness", gift: "Equality", siddhi: "Tenderness", center: "SPLEEN", codonRing: "Ring of Trials" },
    38: { name: "Struggle", shadow: "Struggle", gift: "Perseverance", siddhi: "Honour", center: "ROOT", codonRing: "Ring of Seeking" },
    39: { name: "Provocation", shadow: "Provocation", gift: "Dynamism", siddhi: "Liberation", center: "ROOT", codonRing: "Ring of Seeking" },
    40: { name: "Exhaustion", shadow: "Exhaustion", gift: "Resolve", siddhi: "Divine Will", center: "HEART", codonRing: "Ring of Alchemy" },
    41: { name: "Fantasy", shadow: "Fantasy", gift: "Anticipation", siddhi: "Emanation", center: "ROOT", codonRing: "Ring of Origin" },
    42: { name: "Expectation", shadow: "Expectation", gift: "Detachment", siddhi: "Celebration", center: "SACRAL", codonRing: "Ring of Mutation" },
    43: { name: "Deafness", shadow: "Deafness", gift: "Insight", siddhi: "Epiphany", center: "AJNA", codonRing: "Ring of Illuminati" },
    44: { name: "Interference", shadow: "Interference", gift: "Teamwork", siddhi: "Synarchy", center: "SPLEEN", codonRing: "Ring of Prosperity" },
    45: { name: "Dominance", shadow: "Dominance", gift: "Synergy", siddhi: "Communion", center: "THROAT", codonRing: "Ring of Light" },
    46: { name: "Seriousness", shadow: "Seriousness", gift: "Delight", siddhi: "Ecstasy", center: "G", codonRing: "Ring of the Whirlwind" },
    47: { name: "Oppression", shadow: "Oppression", gift: "Transmutation", siddhi: "Transfiguration", center: "AJNA", codonRing: "Ring of Illuminati" },
    48: { name: "Inadequacy", shadow: "Inadequacy", gift: "Resourcefulness", siddhi: "Wisdom", center: "SPLEEN", codonRing: "Ring of the Whirlwind" },
    49: { name: "Reaction", shadow: "Reaction", gift: "Revolution", siddhi: "Rebirth", center: "SPLEEN", codonRing: "Ring of Origin" },
    50: { name: "Corruption", shadow: "Corruption", gift: "Nurturing", siddhi: "Harmony", center: "SPLEEN", codonRing: "Ring of Fulfillment" },
    51: { name: "Agitation", shadow: "Agitation", gift: "Initiative", siddhi: "Awakening", center: "HEART", codonRing: "Ring of Seeking" },
    52: { name: "Stress", shadow: "Stress", gift: "Restraint", siddhi: "Stillness", center: "ROOT", codonRing: "Ring of Stillness" },
    53: { name: "Immaturity", shadow: "Immaturity", gift: "Expansion", siddhi: "Superabundance", center: "ROOT", codonRing: "Ring of Mutation" },
    54: { name: "Greed", shadow: "Greed", gift: "Aspiration", siddhi: "Ascension", center: "ROOT", codonRing: "Ring of Prosperity" },
    55: { name: "Victimisation", shadow: "Victimisation", gift: "Freedom", siddhi: "Freedom", center: "SPLEEN", codonRing: "Ring of the Whirlwind" },
    56: { name: "Distraction", shadow: "Distraction", gift: "Enrichment", siddhi: "Intoxication", center: "THROAT", codonRing: "Ring of Miracles" },
    57: { name: "Unease", shadow: "Unease", gift: "Intuition", siddhi: "Clarity", center: "SPLEEN", codonRing: "Ring of Divinity" },
    58: { name: "Dissatisfaction", shadow: "Dissatisfaction", gift: "Vitality", siddhi: "Bliss", center: "ROOT", codonRing: "Ring of Illuminati" },
    59: { name: "Dishonesty", shadow: "Dishonesty", gift: "Intimacy", siddhi: "Transparency", center: "SACRAL", codonRing: "Ring of the Whirlwind" },
    60: { name: "Limitation", shadow: "Limitation", gift: "Realism", siddhi: "Justice", center: "ROOT", codonRing: "Ring of Stillness" },
    61: { name: "Psychosis", shadow: "Psychosis", gift: "Inspiration", siddhi: "Sanctity", center: "CROWN", codonRing: "Ring of Origin" },
    62: { name: "Intellectualism", shadow: "Intellectualism", gift: "Precision", siddhi: "Impeccability", center: "THROAT", codonRing: "Ring of Stillness" },
    63: { name: "Doubt", shadow: "Doubt", gift: "Inquiry", siddhi: "Truth", center: "AJNA", codonRing: "Ring of Fulfillment" },
    64: { name: "Confusion", shadow: "Confusion", gift: "Imagination", siddhi: "Illumination", center: "CROWN", codonRing: "Ring of Origin" }
  };
  const CENTER_TO_CHAKRA = {
    // ── Lower Self / material / somatic domain ────────────────────────────────
    ROOT: { chakraId: "CH-ROOT", chakraName: "M\u016Bl\u0101dh\u0101ra (Root)", freqHz: 194.18, instrumentId: "TF-PW-ROOT", axis: "below" },
    SACRAL: { chakraId: "CH-SACRAL", chakraName: "Sv\u0101dhi\u1E63\u1E6Dh\u0101na (Sacral)", freqHz: 210.42, instrumentId: "TF-PW-SACRAL", axis: "below" },
    SOLAR: { chakraId: "CH-SOLAR", chakraName: "Ma\u1E47ip\u016Bra (Solar Plexus)", freqHz: 126.22, instrumentId: "TF-PW-SOLAR", axis: "below" },
    // Spleen center: lower body, sacral/solar boundary — somatic domain
    SPLEEN: { chakraId: "CH-SACRAL", chakraName: "Sv\u0101dhi\u1E63\u1E6Dh\u0101na / Spleen field", freqHz: 210.42, instrumentId: "TF-PW-SACRAL", axis: "below" },
    // ── Heart pivot — equilibrium axis ────────────────────────────────────────
    // HD EGO/HEART and G-center both map here. OM fork (136.10 Hz) is the axis instrument.
    HEART: { chakraId: "CH-HEART", chakraName: "An\u0101hata (Heart)", freqHz: 136.1, instrumentId: "TF-PW-HEART", axis: "heart" },
    G: { chakraId: "CH-HEART", chakraName: "G-Center / An\u0101hata bridge", freqHz: 136.1, instrumentId: "TF-PW-HEART", axis: "heart" },
    // ── Higher Self / spiritual / field domain ────────────────────────────────
    THROAT: { chakraId: "CH-THROAT", chakraName: "Vi\u015Buddha (Throat)", freqHz: 141.27, instrumentId: "TF-PW-THROAT", axis: "above" },
    AJNA: { chakraId: "CH-THIRD-EYE", chakraName: "\u0100j\xF1\u0101 (Third Eye)", freqHz: 221.23, instrumentId: "TF-PW-3RD", axis: "above" },
    CROWN: { chakraId: "CH-CROWN", chakraName: "Sahasr\u0101ra (Crown)", freqHz: 172.06, instrumentId: "TF-PW-CROWN", axis: "above" }
  };
  const CHAKRA_TO_KOSHA = {
    "CH-ROOT": { layer: 1, name: "Annamaya Kosha", biofieldPosition: "0\u20132 inches from body" },
    "CH-SACRAL": { layer: 2, name: "Pranamaya Kosha", biofieldPosition: "1\u20134 inches from body" },
    "CH-SOLAR": { layer: 3, name: "Manomaya Kosha", biofieldPosition: "2\u20138 inches from body" },
    "CH-HEART": { layer: 4, name: "Vijnanamaya Kosha", biofieldPosition: "6\u201312 inches from body" },
    "CH-THROAT": { layer: 5, name: "Anandamaya Kosha", biofieldPosition: "18 inches\u20132 feet" },
    "CH-THIRD-EYE": { layer: 6, name: "Buddhimaya Kosha", biofieldPosition: "2\u20133 feet from body" },
    "CH-CROWN": { layer: 7, name: "Atmamaya Kosha", biofieldPosition: "3+ feet from body" }
  };
  const CODON_RING_TO_ELEMENT = {
    "Ring of Fire": { element: "Fire", dosha: "Pitta", quality: "transformative, sharp, metabolic" },
    "Ring of Life & Death": { element: "Water", dosha: "Kapha-Vata", quality: "cyclical, releasing, dissolution" },
    "Ring of Mutation": { element: "Water", dosha: "Vata", quality: "fluid, spontaneous, breakthrough" },
    "Ring of Alchemy": { element: "Fire", dosha: "Pitta", quality: "transformative, catalytic" },
    "Ring of Destiny": { element: "Earth", dosha: "Kapha", quality: "patient, accumulative, grounded" },
    "Ring of Fulfillment": { element: "Space", dosha: "Vata", quality: "expansive, visionary, connective" },
    "Ring of Divinity": { element: "Space", dosha: "Vata", quality: "refined, transcendent, non-local" },
    "Ring of Humanity": { element: "Air", dosha: "Vata-Pitta", quality: "relational, empathic, social" },
    "Ring of Purification": { element: "Fire", dosha: "Pitta", quality: "clarifying, precise, corrective" },
    "Ring of Trials": { element: "Earth", dosha: "Kapha-Pitta", quality: "resilient, enduring, testing" },
    "Ring of Light": { element: "Fire", dosha: "Pitta", quality: "illuminating, visionary, solar" },
    "Ring of Miracles": { element: "Space", dosha: "Vata", quality: "spontaneous, unexpected grace" },
    "Ring of Compassion": { element: "Water", dosha: "Kapha", quality: "nurturing, feeling, receptive" },
    "Ring of Seeking": { element: "Fire", dosha: "Pitta-Vata", quality: "questing, restless, purposeful" },
    "Ring of Prosperity": { element: "Earth", dosha: "Kapha", quality: "abundant, consolidating, material" },
    "Ring of Sovereignty": { element: "Fire", dosha: "Pitta", quality: "powerful, directing, embodied will" },
    "Ring of the Sphinx": { element: "Air", dosha: "Vata", quality: "mysterious, paradoxical, liminal" },
    "Ring of Illuminati": { element: "Space", dosha: "Vata-Pitta", quality: "revealing, cognitive, awakening" },
    "Ring of the Whirlwind": { element: "Air", dosha: "Vata", quality: "spiralling, fast, catalytic change" },
    "Ring of Origin": { element: "Space", dosha: "Vata", quality: "primordial, source-level, cosmic" },
    "Ring of Stillness": { element: "Earth", dosha: "Kapha", quality: "consolidating, resting, gathered" },
    "Ring of Maya": { element: "Air", dosha: "Vata-Kapha", quality: "illusory, dreamy, boundary-dissolving" }
  };
  const LINE_DATA = {
    1: {
      archetype: "Foundation",
      bodyLayer: "Bones / Skeleton",
      bodyLayerDesc: "Structural foundation \u2014 mineral density, periosteum, deep support tissue. The Radiance energy seeks expression through the most fundamental physical structure.",
      somaticKoshaLayer: 1,
      somaticKoshaName: "Annamaya Kosha",
      fieldDepth: "Body contact \u2014 0 to 2 inches",
      applicationMode: "Weighted forks applied directly to bone landmarks: sacrum, sternum, mastoid process, long bones. Allow vibration to travel through the skeletal structure. Deep, slow, sustained contact \u2014 minimum 30 seconds per placement. The body needs to feel held before it opens.",
      primaryInstrumentTypes: ["weighted-bone-conduction"],
      entryVector: "somatic-first",
      forkPolarity: "weighted"
    },
    2: {
      archetype: "Hermit",
      bodyLayer: "Organs",
      bodyLayerDesc: "Autonomous organ intelligence \u2014 innate self-regulating function. The Radiance energy works through the organ systems' natural wisdom rather than the thinking mind.",
      somaticKoshaLayer: 1,
      somaticKoshaName: "Annamaya / Pranamaya boundary",
      fieldDepth: "Near field \u2014 1 to 4 inches",
      applicationMode: "Weighted forks placed over organ areas (not on protruding bones) \u2014 solar plexus, liver/spleen region, lower abdomen. Light touch, allow the fork to rest rather than press. The organs respond to invitation, not force. Also effective in near-field (1\u20134 inches) hovering above the organ area.",
      primaryInstrumentTypes: ["weighted-soft-tissue"],
      entryVector: "somatic-first",
      forkPolarity: "weighted"
    },
    3: {
      archetype: "Martyr",
      bodyLayer: "Glands / Endocrine System",
      bodyLayerDesc: "Chemical translation layer \u2014 hormonal rhythms, adaptive stress response, the body's intelligence for translating vibrational input into biochemical change.",
      somaticKoshaLayer: 2,
      somaticKoshaName: "Pranamaya Kosha",
      fieldDepth: "Near-to-mid field \u2014 2 to 8 inches",
      applicationMode: "Solfeggio and planetary forks near endocrine sites: thyroid/throat region (141.27 Hz), adrenal/kidney area (194.18 Hz), gonads/sacral region (210.42 Hz), pineal/crown area (172.06 Hz). Hold in the near field \u2014 2 to 6 inches from body surface. The endocrine system responds to sustained tonal presence rather than movement.",
      primaryInstrumentTypes: ["solfeggio", "planetary-near-field"],
      entryVector: "bridge",
      forkPolarity: "bridge"
    },
    4: {
      archetype: "Opportunist",
      bodyLayer: "Nervous System",
      bodyLayerDesc: "Connectivity and signal transmission \u2014 the relational network of the body. The Radiance energy communicates through the nervous system's capacity for sensitivity and pattern recognition.",
      somaticKoshaLayer: 3,
      somaticKoshaName: "Manomaya Kosha",
      fieldDepth: "Mid field \u2014 4 to 12 inches",
      applicationMode: "Unweighted forks in the air field \u2014 the nervous system responds primarily to air conduction and acoustic resonance rather than physical vibration. Sweep slowly through the mid-field around the head, spine, and solar plexus. Tuning fork pairs creating interval resonance are especially effective here. Allow pauses \u2014 the nervous system integrates in the silence between tones.",
      primaryInstrumentTypes: ["unweighted-field"],
      entryVector: "field-first",
      forkPolarity: "unweighted"
    },
    5: {
      archetype: "Heretic",
      bodyLayer: "Blood / Circulation",
      bodyLayerDesc: "Distribution and nourishment \u2014 the life force carried through the entire system. The Radiance energy works through the whole-body circulation as an integrating, distributing intelligence.",
      somaticKoshaLayer: 4,
      somaticKoshaName: "Vijnanamaya Kosha",
      fieldDepth: "Mid-to-far field \u2014 6 to 24 inches",
      applicationMode: "Full-body sweeps and whole-field envelope work. Begin at the feet and sweep upward through the entire biofield. The circulatory layer responds to momentum and flow \u2014 keep the fork moving rather than holding. Finish by creating a complete torus envelope around the client from head to toe. Session tone: distributive, complete, whole-body.",
      primaryInstrumentTypes: ["unweighted-sweep", "field-envelope"],
      entryVector: "field-first",
      forkPolarity: "unweighted"
    },
    6: {
      archetype: "Role Model",
      bodyLayer: "Cells / DNA",
      bodyLayerDesc: "Identity at source \u2014 epigenetic expression, cellular memory, the DNA as receiver of vibrational information. The Radiance energy operates at the most refined level of physical intelligence.",
      somaticKoshaLayer: 5,
      somaticKoshaName: "Anandamaya / Buddhimaya",
      fieldDepth: "Far field \u2014 18 inches to 3+ feet",
      applicationMode: "Far-field and subtle body work. Fibonacci forks (144 Hz unweighted) combed slowly through the outer field \u2014 their mathematical ratio is said to 'cut through heavy distortions in the electromagnetic biofield.' Tibetan bell struck in the space above and around the client. Long silences. This is the most refined application layer \u2014 presence and intention are primary instruments. The cellular level is reached through the quality of stillness, not through mechanical application.",
      primaryInstrumentTypes: ["fibonacci", "bell", "far-field"],
      entryVector: "field-first",
      forkPolarity: "unweighted"
    }
  };
  const CENTER_INSTRUMENTS = {
    ROOT: { primary: ["TF-OTTO-128", "TF-BT-SLIDER", "TF-PW-ROOT"], secondary: ["TF-BT-SCHU-62", "TF-BT-SOL-174"] },
    SACRAL: { primary: ["TF-PW-SACRAL", "TF-BT-SOL-417"], secondary: ["TF-BT-FIB-89", "TF-PW-ROOT"] },
    SOLAR: { primary: ["TF-PW-SOLAR", "TF-BT-FIB-144W"], secondary: ["TF-BT-SOL-528", "TF-OTTO-128"] },
    HEART: { primary: ["TF-PW-HEART", "TF-OM-136W", "TF-BT-SOL-528"], secondary: ["BOWL-528", "BELL-771"] },
    SPLEEN: { primary: ["TF-PW-SACRAL", "TF-BT-SOL-417"], secondary: ["TF-BT-FIB-89", "TF-PW-ROOT"] },
    THROAT: { primary: ["TF-PW-THROAT", "TF-BT-FIB-144U", "TF-BT-FIB-144W"], secondary: ["BELL-771", "TF-BT-222"] },
    G: { primary: ["TF-PW-HEART", "TF-OM-136W"], secondary: ["TF-BT-SOL-528", "BOWL-528"] },
    AJNA: { primary: ["TF-PW-3RD", "TF-BT-222"], secondary: ["BOWL-429", "TF-BT-FIB-144U"] },
    CROWN: { primary: ["TF-PW-CROWN", "BELL-771", "TF-BT-222"], secondary: ["TF-BT-FIB-144U", "TF-PW-3RD"] }
  };
  const LINE_INSTRUMENTS = {
    1: { add: ["TF-OTTO-128", "TF-BT-SLIDER"] },
    2: { add: ["TF-OTTO-128", "TF-BT-SCHU-54"] },
    3: { add: ["TF-BT-SOL-174", "TF-BT-SOL-417"] },
    4: { add: ["TF-BT-FIB-144U", "TF-BT-222"] },
    5: { add: ["TF-BT-FIB-144U", "TF-BT-FIB-144W"] },
    6: { add: ["TF-BT-FIB-144U", "BELL-771"] }
  };
  const HD_GATE_WHEEL = [
    { gate: 25, start: 0 },
    { gate: 17, start: 3.875 },
    { gate: 21, start: 9.5 },
    { gate: 51, start: 15.125 },
    { gate: 42, start: 20.75 },
    { gate: 3, start: 26.375 },
    { gate: 27, start: 32 },
    { gate: 24, start: 37.625 },
    { gate: 2, start: 43.25 },
    { gate: 23, start: 48.875 },
    { gate: 8, start: 54.5 },
    { gate: 20, start: 60.125 },
    { gate: 16, start: 65.75 },
    { gate: 35, start: 71.375 },
    { gate: 45, start: 77 },
    { gate: 12, start: 82.625 },
    { gate: 15, start: 88.25 },
    { gate: 52, start: 93.875 },
    { gate: 39, start: 99.5 },
    { gate: 53, start: 105.125 },
    { gate: 62, start: 110.75 },
    { gate: 56, start: 116.375 },
    { gate: 31, start: 122 },
    { gate: 33, start: 127.625 },
    { gate: 7, start: 133.25 },
    { gate: 4, start: 138.875 },
    { gate: 29, start: 144.5 },
    { gate: 59, start: 150.125 },
    { gate: 40, start: 155.75 },
    { gate: 64, start: 161.375 },
    { gate: 47, start: 167 },
    { gate: 6, start: 172.625 },
    { gate: 46, start: 178.25 },
    { gate: 18, start: 183.875 },
    { gate: 48, start: 189.5 },
    { gate: 57, start: 195.125 },
    { gate: 32, start: 200.75 },
    { gate: 50, start: 206.375 },
    { gate: 28, start: 212 },
    { gate: 44, start: 217.625 },
    { gate: 1, start: 223.25 },
    { gate: 43, start: 228.875 },
    { gate: 14, start: 234.5 },
    { gate: 34, start: 240.125 },
    { gate: 9, start: 245.75 },
    { gate: 5, start: 251.375 },
    { gate: 26, start: 257 },
    { gate: 11, start: 262.625 },
    { gate: 10, start: 268.25 },
    { gate: 58, start: 273.875 },
    { gate: 38, start: 279.5 },
    { gate: 54, start: 285.125 },
    { gate: 61, start: 290.75 },
    { gate: 60, start: 296.375 },
    { gate: 41, start: 302 },
    { gate: 19, start: 307.625 },
    { gate: 13, start: 313.25 },
    { gate: 49, start: 318.875 },
    { gate: 30, start: 324.5 },
    { gate: 55, start: 330.125 },
    { gate: 37, start: 335.75 },
    { gate: 63, start: 341.375 },
    { gate: 22, start: 347 },
    { gate: 36, start: 352.625 }
  ];
  function dateToJD(date) {
    let year = date.getUTCFullYear();
    let month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const hourFrac = (date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600) / 24;
    if (month <= 2) {
      year -= 1;
      month += 12;
    }
    const A = Math.floor(year / 100);
    const B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + hourFrac + B - 1524.5;
  }
  function jdToSolarLongitude(jd) {
    const T = (jd - 2451545) / 36525;
    let L0 = 280.46646 + 36000.76983 * T + 3032e-7 * T * T;
    L0 = (L0 % 360 + 360) % 360;
    let M = 357.52911 + 35999.05029 * T - 1537e-7 * T * T;
    M = (M % 360 + 360) % 360;
    const Mrad = M * Math.PI / 180;
    const C = (1.914602 - 4817e-6 * T - 14e-6 * T * T) * Math.sin(Mrad) + (0.019993 - 101e-6 * T) * Math.sin(2 * Mrad) + 289e-6 * Math.sin(3 * Mrad);
    const sunTrueLon = L0 + C;
    let omega = 125.04452 - 1934.136261 * T;
    omega = (omega % 360 + 360) % 360;
    const apparent = sunTrueLon - 569e-5 - 478e-5 * Math.sin(omega * Math.PI / 180);
    return (apparent % 360 + 360) % 360;
  }
  function longitudeToGateLine(lon) {
    const norm = (lon % 360 + 360) % 360;
    for (let i = HD_GATE_WHEEL.length - 1; i >= 0; i--) {
      if (norm >= HD_GATE_WHEEL[i].start) {
        const posInGate = norm - HD_GATE_WHEEL[i].start;
        const line = Math.min(Math.floor(posInGate / 0.9375) + 1, 6);
        return { gate: HD_GATE_WHEEL[i].gate, line };
      }
    }
    return { gate: 25, line: 1 };
  }
  function calculateRadiance(birthDateStr, birthTimeStr) {
    var _a;
    const [y, m, d] = birthDateStr.split("-").map(Number);
    let hr = 12;
    let mn = 0;
    if (birthTimeStr) {
      const parts = birthTimeStr.split(":");
      hr = parseInt(parts[0], 10);
      mn = parseInt((_a = parts[1]) != null ? _a : "0", 10);
    }
    const precise = !!birthTimeStr;
    const birthUTC = new Date(Date.UTC(y, m - 1, d, hr, mn, 0));
    const jdBirth = dateToJD(birthUTC);
    const csLon = jdToSolarLongitude(jdBirth);
    const radianceLon = (csLon - 88 + 360) % 360;
    const { gate, line } = longitudeToGateLine(radianceLon);
    return { gate, line, precise };
  }
  function synthesizeRadianceProfile(activation) {
    var _a, _b, _c, _d;
    const { gate, line } = activation;
    const gateData = GATES[gate];
    if (!gateData) throw new Error(`Unknown gate: ${gate}`);
    const centerData = CENTER_TO_CHAKRA[gateData.center];
    const koshaField = CHAKRA_TO_KOSHA[centerData.chakraId];
    const codonData = (_a = CODON_RING_TO_ELEMENT[gateData.codonRing]) != null ? _a : { element: "Space", dosha: "Vata", quality: "subtle" };
    const lineData = LINE_DATA[line];
    const koshasConverge = koshaField.layer === lineData.somaticKoshaLayer;
    const axis = centerData.axis;
    const ev = lineData.entryVector;
    let verticalConvergence;
    if (axis === "heart") {
      verticalConvergence = "heart-bridge";
    } else if (ev === "bridge") {
      verticalConvergence = "neutral";
    } else if (axis === "above" && ev === "field-first" || axis === "below" && ev === "somatic-first") {
      verticalConvergence = "aligned";
    } else {
      verticalConvergence = "split";
    }
    const omAnchor = verticalConvergence === "heart-bridge" || verticalConvergence === "split";
    const centerInst = (_b = CENTER_INSTRUMENTS[gateData.center]) != null ? _b : { primary: [], secondary: [] };
    const lineAdd = (_d = (_c = LINE_INSTRUMENTS[line]) == null ? void 0 : _c.add) != null ? _d : [];
    const WEIGHTED_IDS = /* @__PURE__ */ new Set(["TF-OTTO-128", "TF-BT-SLIDER", "TF-OM-136W", "TF-PW-ROOT", "TF-PW-SACRAL", "TF-PW-SOLAR", "TF-PW-HEART", "TF-PW-THROAT", "TF-PW-3RD", "TF-PW-CROWN", "TF-BT-SCHU-54", "TF-BT-SCHU-62"]);
    const UNWEIGHTED_IDS = /* @__PURE__ */ new Set(["TF-BT-FIB-144U", "TF-BT-FIB-89", "TF-BT-222", "BELL-771", "TF-BT-SOL-174", "TF-BT-SOL-417", "TF-BT-SOL-528", "TF-BT-FIB-144W", "BOWL-528", "BOWL-429"]);
    const polarity = lineData.forkPolarity;
    let mergedPrimary = [.../* @__PURE__ */ new Set([...centerInst.primary, ...lineAdd])];
    let mergedSecondary = [...new Set(centerInst.secondary)];
    if (polarity === "unweighted") {
      const promoted = mergedPrimary.filter((id) => !WEIGHTED_IDS.has(id) || id === "TF-OM-136W");
      const demoted = mergedPrimary.filter((id) => WEIGHTED_IDS.has(id) && id !== "TF-OM-136W");
      mergedPrimary = [...promoted];
      mergedSecondary = [.../* @__PURE__ */ new Set([...demoted, ...mergedSecondary])];
    } else if (polarity === "weighted") {
      const farField = /* @__PURE__ */ new Set(["TF-BT-FIB-144U", "BELL-771", "BOWL-429", "BOWL-528"]);
      const demoted = mergedPrimary.filter((id) => farField.has(id));
      mergedPrimary = mergedPrimary.filter((id) => !farField.has(id));
      mergedSecondary = [.../* @__PURE__ */ new Set([...mergedSecondary, ...demoted])];
    }
    if (omAnchor && !mergedPrimary.includes("TF-OM-136W")) {
      mergedPrimary.unshift("TF-OM-136W");
    }
    const allPrimary = mergedPrimary.filter((id) => !mergedSecondary.includes(id) || mergedPrimary.indexOf(id) < mergedSecondary.indexOf(id)).slice(0, 5);
    const allSecondary = mergedSecondary.filter((id) => !allPrimary.includes(id)).slice(0, 3);
    const axisLabel = axis === "above" ? "Higher Self / field domain (above heart)" : axis === "heart" ? "Heart pivot (equilibrium axis)" : "Lower Self / somatic domain (below heart)";
    const evLabel = ev === "field-first" ? "field-first (frequency \u2192 breath \u2192 intent)" : ev === "bridge" ? "bridge (breath as carrier \u2014 either direction)" : "somatic-first (body opens the field)";
    let convergenceNote;
    if (verticalConvergence === "aligned") {
      if (axis === "above") {
        convergenceNote = `Strong alignment \u2014 ${axisLabel} and ${evLabel}. Lead with unweighted forks in the air field. Breath and sustained tonal presence are the primary instruments. Physical fork application is secondary and optional. The subtle body organises; the physical body responds downstream.`;
      } else {
        convergenceNote = `Strong alignment \u2014 ${axisLabel} and ${evLabel}. Lead with weighted fork contact. Begin at the foundational body layer (${lineData.bodyLayer}), allow vibration to anchor before expanding to the field.`;
      }
    } else if (verticalConvergence === "heart-bridge") {
      convergenceNote = `Heart-axis gate \u2014 An\u0101hata (136.10 Hz) is the session pivot. OM fork at the sternum is the opener AND closer. From the heart, work in both directions: weighted forks downward into the somatic body (${lineData.bodyLayer}), unweighted forks upward into the field (${lineData.fieldDepth}). Entry order: OM anchor first, then follow the ${evLabel} entry for the rest of the session.`;
    } else if (verticalConvergence === "split") {
      const gateDir = axis === "above" ? "field / unweighted" : "somatic / weighted";
      const lineDir = ev === "field-first" ? "field / unweighted" : "somatic / weighted";
      convergenceNote = `Split signal \u2014 gate points to ${axisLabel} (${gateDir}) while line points to ${evLabel} (${lineDir}). The heart/OM fork bridges the two halves. Open with OM at the sternum, then honour the line's entry vector (${evLabel}) for the primary work, addressing the gate's chakra layer (${centerData.chakraName}) afterward.`;
    } else {
      convergenceNote = `Bridge line \u2014 entry direction is open. Breath is the primary carrier. Begin with near-field breath awareness, introduce unweighted forks near endocrine sites (${centerData.chakraName} region), then anchor with weighted contact if the client's body calls for it. Glandular/endocrine system responds to sustained tonal presence.`;
    }
    if (koshasConverge) {
      convergenceNote += ` Kosha convergence: both gate and line resolve to ${koshaField.name} (Layer ${koshaField.layer}) \u2014 strong therapeutic focus layer.`;
    } else {
      convergenceNote += ` Kosha split: gate field layer is ${koshaField.name} (Layer ${koshaField.layer}); line somatic layer is ${lineData.somaticKoshaName} (Layer ${lineData.somaticKoshaLayer}). Address both within the session.`;
    }
    const nexusSummary = [
      `RADIANCE SPHERE \u2014 GK ${gate}.${line} (${gateData.name})`,
      `Shadow: ${gateData.shadow} \u2192 Gift: ${gateData.gift} \u2192 Siddhi: ${gateData.siddhi}`,
      `Codon Ring: ${gateData.codonRing} | Element: ${codonData.element} | Dosha tendency: ${codonData.dosha}`,
      `HD Center: ${gateData.center} \u2192 ${centerData.chakraName} (${centerData.freqHz} Hz) | Axis: ${centerData.axis}`,
      `Field layer (gate\u2192chakra\u2192kosha): ${koshaField.name} | Biofield: ${koshaField.biofieldPosition}`,
      `Line ${line} \u2014 ${lineData.archetype} | Body: ${lineData.bodyLayer}`,
      `Entry vector: ${lineData.entryVector} | Fork polarity: ${lineData.forkPolarity}`,
      `Somatic layer (line\u2192body\u2192kosha): ${lineData.somaticKoshaName}`,
      `Application depth: ${lineData.fieldDepth}`,
      `Vertical convergence: ${verticalConvergence.toUpperCase()}${omAnchor ? " | OM anchor: YES" : ""}`,
      koshasConverge ? `Kosha convergence: STRONG \u2014 both signals align at Layer ${koshaField.layer}` : `Kosha convergence: SPLIT \u2014 field layer ${koshaField.layer}, somatic layer ${lineData.somaticKoshaLayer}`,
      `Primary forks: ${allPrimary.join(", ")}`,
      `Application: ${lineData.applicationMode.slice(0, 120)}...`
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
      chakraAxis: centerData.axis,
      fieldKoshaLayer: koshaField.layer,
      fieldKoshaName: koshaField.name,
      fieldBiofieldPosition: koshaField.biofieldPosition,
      lineArchetype: lineData.archetype,
      bodyLayer: lineData.bodyLayer,
      bodyLayerDescription: lineData.bodyLayerDesc,
      entryVector: lineData.entryVector,
      forkPolarity: lineData.forkPolarity,
      somaticKoshaLayer: lineData.somaticKoshaLayer,
      somaticKoshaName: lineData.somaticKoshaName,
      fieldDepth: lineData.fieldDepth,
      applicationMode: lineData.applicationMode,
      koshasConverge,
      verticalConvergence,
      convergenceNote,
      primaryInstruments: allPrimary,
      secondaryInstruments: allSecondary,
      omAnchor,
      nexusSummary
    };
  }
  return __toCommonJS(genekeys_exports);
})();
