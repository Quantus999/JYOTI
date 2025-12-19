/* ═══════════════════════════════════════════════════════════════════════════
   JYOTI — Vedic Astrology Constants
   Core astronomical and astrological data arrays
   Extracted from jyoti-v10_8-fixed.html (lines 7234-7264)
   ═══════════════════════════════════════════════════════════════════════════ */

// Zodiac Signs (Rashi)
const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

const SIGN_GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

// Lunar Mansions (27 Nakshatras)
const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
];

// Nakshatra Lords (for Vimshottari Dasha)
const NAK_LORDS = [
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'
];

// Nine Planets (Navagraha)
const PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

// Planet Glyphs (Unicode symbols)
const P_GLYPHS = {
  Sun: '☉',
  Moon: '☽',
  Mars: '♂',
  Mercury: '☿',
  Jupiter: '♃',
  Venus: '♀',
  Saturn: '♄',
  Rahu: '☊',
  Ketu: '☋'
};

// Vimshottari Dasha Sequence (120-year cycle)
const DASHA_SEQ = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];

// Dasha Period Durations (in years)
const DASHA_YRS = {
  Ketu: 7,
  Venus: 20,
  Sun: 6,
  Moon: 10,
  Mars: 7,
  Rahu: 18,
  Jupiter: 16,
  Saturn: 19,
  Mercury: 17
};

// Planetary Dignities (exaltation, debilitation, own signs)
// Sign indices: 0=Aries, 1=Taurus, ... 11=Pisces
const DIGNITIES = {
  Sun:     { exalt: 0,  debi: 6,  own: [4] },       // Exalted in Aries, Debilitated in Libra, Owns Leo
  Moon:    { exalt: 1,  debi: 7,  own: [3] },       // Exalted in Taurus, Debilitated in Scorpio, Owns Cancer
  Mars:    { exalt: 9,  debi: 3,  own: [0, 7] },    // Exalted in Capricorn, Debilitated in Cancer, Owns Aries & Scorpio
  Mercury: { exalt: 5,  debi: 11, own: [2, 5] },    // Exalted in Virgo, Debilitated in Pisces, Owns Gemini & Virgo
  Jupiter: { exalt: 3,  debi: 9,  own: [8, 11] },   // Exalted in Cancer, Debilitated in Capricorn, Owns Sagittarius & Pisces
  Venus:   { exalt: 11, debi: 5,  own: [1, 6] },    // Exalted in Pisces, Debilitated in Virgo, Owns Taurus & Libra
  Saturn:  { exalt: 6,  debi: 0,  own: [9, 10] },   // Exalted in Libra, Debilitated in Aries, Owns Capricorn & Aquarius
  Rahu:    { exalt: 1,  debi: 7,  own: [10] },      // Exalted in Taurus, Debilitated in Scorpio, Owns Aquarius
  Ketu:    { exalt: 7,  debi: 1,  own: [7] }        // Exalted in Scorpio, Debilitated in Taurus, Owns Scorpio
};

// Planet Archetypes and Meanings
const GRAHA_DETAILS = {
  Sun: {
    sanskrit: "Sūrya",
    archetype: "The King",
    theaterRole: "The CEO — steering the ship of self.",
    significations: ["Soul", "Father", "Authority", "Ego", "Vitality", "Government", "Gold"],
    spiritualMeaning: "The Ātman — eternal witness-consciousness. The Sun represents your unchanging essence beyond all roles and identities."
  },
  Moon: {
    sanskrit: "Chandra",
    archetype: "The Queen",
    theaterRole: "The Emotional Intelligence Officer.",
    significations: ["Mind", "Mother", "Emotions", "Memory", "Public", "Water", "Silver"],
    spiritualMeaning: "Manas — the reactive mind that reflects consciousness like the moon reflects sunlight. Your emotional body and capacity for nurturing."
  },
  Mars: {
    sanskrit: "Maṅgala",
    archetype: "The General",
    theaterRole: "The General — defending territory, taking action.",
    significations: ["Energy", "Courage", "Brothers", "Property", "Competition", "Surgery", "Fire"],
    spiritualMeaning: "Kuṇḍalinī Śakti — the spiritual fire that can either destroy or illuminate. Mars channels raw life force."
  },
  Mercury: {
    sanskrit: "Budha",
    archetype: "The Messenger",
    theaterRole: "The Communications Director.",
    significations: ["Intellect", "Communication", "Commerce", "Learning", "Youth", "Writing", "Analysis"],
    spiritualMeaning: "Buddhi — discriminative wisdom that distinguishes real from unreal. The bridge between higher mind and daily life."
  },
  Jupiter: {
    sanskrit: "Guru",
    archetype: "The Guru",
    theaterRole: "The Chief Wisdom Officer.",
    significations: ["Wisdom", "Teachers", "Fortune", "Children", "Dharma", "Expansion", "Faith"],
    spiritualMeaning: "The Guru principle — 'that which leads from darkness to light.' Jupiter represents divine grace and the path of meaning."
  },
  Venus: {
    sanskrit: "Śukra",
    archetype: "The Artist",
    theaterRole: "The Creative Director.",
    significations: ["Love", "Beauty", "Relationships", "Art", "Pleasure", "Luxury", "Devotion"],
    spiritualMeaning: "Bhakti — devotional love that begins with earthly beauty and evolves toward divine love. The path of the heart."
  },
  Saturn: {
    sanskrit: "Śani",
    archetype: "The Judge",
    theaterRole: "Quality Control — ensuring only what's real remains.",
    significations: ["Karma", "Time", "Discipline", "Structure", "Longevity", "Delays", "Servants"],
    spiritualMeaning: "Vairāgya — dispassion born from understanding impermanence. Saturn strips away illusion to reveal what endures."
  },
  Rahu: {
    sanskrit: "Rāhu",
    archetype: "The Outsider",
    theaterRole: "The Disruptor — breaking conventions.",
    significations: ["Desire", "Foreign", "Innovation", "Obsession", "Technology", "Amplification", "Illusion"],
    spiritualMeaning: "Māyā — the cosmic illusion that projects consciousness into material experience. Rahu represents insatiable worldly desire."
  },
  Ketu: {
    sanskrit: "Ketu",
    archetype: "The Monk",
    theaterRole: "The Hermit — pointing beyond all form.",
    significations: ["Liberation", "Past lives", "Detachment", "Spirituality", "Mysticism", "Dissolution", "Enlightenment"],
    spiritualMeaning: "Mokṣa — liberation through release. Ketu dissolves what Rahu grasps, pointing toward the source beyond name and form."
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS (Calculation Helpers)
// ═══════════════════════════════════════════════════════════════════════════

// Normalize degrees to 0-360 range
function norm360(deg) {
  return ((deg % 360) + 360) % 360;
}

// Convert longitude to sign index (0-11)
function lonToSign(lon) {
  return Math.floor(norm360(lon) / 30);
}

// Convert longitude to degree within sign (0-30)
function lonToDeg(lon) {
  return norm360(lon) % 30;
}

// Convert longitude to nakshatra index (0-26)
function lonToNak(lon) {
  return Math.floor(norm360(lon) / (360 / 27));
}

// Calculate house number (1-12) from sign and lagna
function calcHouse(sign, lagna) {
  return ((sign - lagna + 12) % 12) + 1;
}

// Format degrees as D°M' string
function fmtDeg(deg) {
  const d = Math.floor(deg);
  const m = Math.floor((deg - d) * 60);
  return `${d}°${m}'`;
}
