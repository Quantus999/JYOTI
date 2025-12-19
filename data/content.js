/* ═══════════════════════════════════════════════════════════════════════════
   JYOTI — Content & Interpretive Data
   House meanings, Dasha themes, Glossary terms
   Extracted from jyoti-v10_8-fixed.html (lines 8233-8273)
   ═══════════════════════════════════════════════════════════════════════════ */

// House (Bhava) Meanings and Significations
const BHAVA_DETAILS = {
  1: {
    english: "Self",
    sanskrit: "Tanu",
    keywords: ["Identity", "Body", "Persona", "Vitality"],
    meaning: "The mask you wear meeting the world. Your physical vessel and how others first perceive you.",
    spiritual: "The gateway of incarnation — through which consciousness takes form.",
    questionToAsk: "How do I meet life? What face do I show the world?"
  },
  2: {
    english: "Resources",
    sanskrit: "Dhana",
    keywords: ["Wealth", "Speech", "Values", "Family"],
    meaning: "What you possess, what you value, how you nourish yourself and others.",
    spiritual: "The treasury of the soul — what you bring from past lives and cultivate now.",
    questionToAsk: "What do I truly value? How do I resource myself?"
  },
  3: {
    english: "Effort",
    sanskrit: "Sahaja",
    keywords: ["Courage", "Siblings", "Skills", "Communication"],
    meaning: "Your will to act, short journeys, and all forms of self-expression.",
    spiritual: "The arena of effort — where intention becomes action.",
    questionToAsk: "What am I willing to work for? What skills am I developing?"
  },
  4: {
    english: "Home",
    sanskrit: "Bandhu",
    keywords: ["Home", "Mother", "Peace", "Property"],
    meaning: "Your emotional foundation, inner sanctuary, and roots.",
    spiritual: "The heart's abode — where you return when all else falls away.",
    questionToAsk: "Where is my sanctuary? What provides deep peace?"
  },
  5: {
    english: "Creativity",
    sanskrit: "Putra",
    keywords: ["Creativity", "Children", "Romance", "Intelligence"],
    meaning: "What you create and send forth into the world — children, art, ideas.",
    spiritual: "The fountain of creation — where divine creative force flows through you.",
    questionToAsk: "What wants to be born through me? What gives me joy?"
  },
  6: {
    english: "Service",
    sanskrit: "Shatru",
    keywords: ["Health", "Enemies", "Work", "Obstacles"],
    meaning: "Daily challenges, service, health maintenance, and overcoming obstacles.",
    spiritual: "The forge of strength — where difficulties become medicine.",
    questionToAsk: "What must I overcome? How do I serve?"
  },
  7: {
    english: "Partnership",
    sanskrit: "Yuvati",
    keywords: ["Marriage", "Contracts", "The Other", "Business"],
    meaning: "The mirror of relationship — all significant one-to-one bonds.",
    spiritual: "The dance of self and other — where we discover ourselves through reflection.",
    questionToAsk: "Who am I in relation? What do I seek in partnership?"
  },
  8: {
    english: "Transformation",
    sanskrit: "Randhra",
    keywords: ["Death/Rebirth", "Mystery", "Occult", "Inheritance"],
    meaning: "Psychological depths, hidden resources, and profound transformation.",
    spiritual: "The crucible of alchemy — where lead becomes gold through fire.",
    questionToAsk: "What must die so I can be reborn? What lies hidden?"
  },
  9: {
    english: "Purpose",
    sanskrit: "Dharma",
    keywords: ["Dharma", "Guru", "Fortune", "Higher Learning"],
    meaning: "Your life's meaning, teachers, philosophy, and long journeys.",
    spiritual: "The compass of dharma — pointing toward your highest purpose.",
    questionToAsk: "What gives my life meaning? Who are my teachers?"
  },
  10: {
    english: "Career",
    sanskrit: "Karma",
    keywords: ["Career", "Status", "Authority", "Father"],
    meaning: "Your visible contribution to the world, reputation, and public role.",
    spiritual: "The throne of action — where inner purpose meets outer expression.",
    questionToAsk: "What is my contribution? What legacy am I building?"
  },
  11: {
    english: "Gains",
    sanskrit: "Labha",
    keywords: ["Gains", "Friends", "Networks", "Hopes"],
    meaning: "Your community, the fruits of effort, aspirations, and elder siblings.",
    spiritual: "The harvest field — where seeds planted bear fruit.",
    questionToAsk: "Who are my people? What do I hope for?"
  },
  12: {
    english: "Liberation",
    sanskrit: "Vyaya",
    keywords: ["Release", "Spirituality", "Loss", "Foreign Lands"],
    meaning: "Surrender, the unseen realm, isolation, and spiritual liberation.",
    spiritual: "The ocean of dissolution — where the river of self returns to source.",
    questionToAsk: "What must I surrender? What lies beyond?"
  }
};

// Dasha Period Themes and Guidance
const DASHA_THEMES = {
  Sun: {
    chapter: "The Coronation",
    advice: "A period to shine authentically. Lead through genuine self-expression, not borrowed authority. Your identity crystallizes.",
    positive: ["Recognition", "Confidence", "Father themes resolve", "Leadership opportunities"],
    challenging: ["Ego inflation", "Authority conflicts", "Heart health focus"]
  },
  Moon: {
    chapter: "The Homecoming",
    advice: "A period of emotional growth and inner development. Build your sanctuary. Mother themes arise.",
    positive: ["Emotional intelligence", "Public connection", "Nurturing relationships", "Home establishment"],
    challenging: ["Emotional volatility", "Dependency patterns", "Mind fluctuations"]
  },
  Mars: {
    chapter: "The Campaign",
    advice: "A period of action and initiative. Channel energy into worthy battles. Courage is tested and built.",
    positive: ["Physical vitality", "Courage development", "Property matters", "Competition success"],
    challenging: ["Anger management", "Accident proneness", "Conflict with siblings"]
  },
  Mercury: {
    chapter: "The Study",
    advice: "A period of learning and communication. Develop skills, make connections, analyze and improve.",
    positive: ["Learning acceleration", "Communication success", "Business acumen", "Mental agility"],
    challenging: ["Nervous tension", "Scattered focus", "Overthinking"]
  },
  Jupiter: {
    chapter: "The Blessing",
    advice: "A blessed period of expansion. Teachers appear when you're ready. Faith grows through testing.",
    positive: ["Spiritual growth", "Teacher connections", "Children themes", "Financial expansion"],
    challenging: ["Overexpansion", "Religious dogmatism", "Weight gain"]
  },
  Venus: {
    chapter: "The Romance",
    advice: "Twenty years of Venus themes unfold. Enjoy beauty without attachment. Love is both teacher and lesson.",
    positive: ["Relationships flourish", "Artistic expression", "Material comfort", "Pleasure and joy"],
    challenging: ["Excessive indulgence", "Relationship attachment", "Vanity"]
  },
  Saturn: {
    chapter: "The Crystallization",
    advice: "The great building period. What you construct now endures. Discipline becomes freedom.",
    positive: ["Structure building", "Career establishment", "Longevity", "Wisdom through difficulty"],
    challenging: ["Delays and obstacles", "Depression", "Isolation", "Heavy responsibilities"]
  },
  Rahu: {
    chapter: "The Frontier",
    advice: "Expansion into unfamiliar territory. Don't lose yourself in desire. Innovation and unconventional paths call.",
    positive: ["Worldly success", "Innovation", "Foreign opportunities", "Breaking limitations"],
    challenging: ["Obsessive desires", "Confusion", "Unconventional problems", "Deception"]
  },
  Ketu: {
    chapter: "The Release",
    advice: "Spiritual ripening through release. Let go of what no longer serves. Past life themes surface for completion.",
    positive: ["Spiritual awakening", "Intuitive development", "Moksha progress", "Past karma resolution"],
    challenging: ["Losses for growth", "Confusion about direction", "Detachment from desires"]
  }
};

// Sanskrit Glossary with Traps and Opportunities
const GLOSSARY = [
  {
    term: "Jyotish",
    sanskrit: "ज्योतिष",
    literal: "Science of Light",
    plain: "The ancient Vedic system of astrology from India, practiced for over 5,000 years. Unlike Western astrology, it uses the sidereal zodiac aligned with actual star positions.",
    trap: "Treating it as fortune-telling or fixed fate prediction. Seeking certainty where only patterns exist.",
    opportunity: "Using it as a mirror for self-inquiry and timing awareness. Understanding tendencies grants choice."
  },
  {
    term: "Graha",
    sanskrit: "ग्रह",
    literal: "That which seizes or grasps",
    plain: "The nine cosmic forces (planets) that influence your life patterns. Not just physical planets but archetypal energies.",
    trap: "Blaming planets for problems. Believing planets cause events rather than reflect patterns.",
    opportunity: "Recognizing grahas as inner energies you can work with. What seizes you can be understood and transformed."
  },
  {
    term: "Rāśi",
    sanskrit: "राशि",
    literal: "Heap or collection",
    plain: "The 12 zodiac signs. Each represents a distinct energy pattern and field of experience.",
    trap: "Over-identifying with sun sign. Ignoring the full chart complexity.",
    opportunity: "Understanding signs as energy environments, each with gifts and shadows."
  },
  {
    term: "Bhāva",
    sanskrit: "भाव",
    literal: "State of being or becoming",
    plain: "The 12 houses representing different arenas of life experience — from self to liberation.",
    trap: "Labeling houses as 'good' or 'bad'. Seeing difficult houses as curses.",
    opportunity: "Recognizing each house as a classroom. Even challenging houses offer profound growth."
  },
  {
    term: "Nakshatra",
    sanskrit: "नक्षत्र",
    literal: "That which does not decay",
    plain: "The 27 lunar mansions — a finer division of the zodiac revealing soul-level patterns.",
    trap: "Ignoring nakshatras for signs only. Missing the deeper layer of interpretation.",
    opportunity: "Accessing the soul map. Nakshatras reveal purpose, deity connections, and karmic themes."
  },
  {
    term: "Dasha",
    sanskrit: "दशा",
    literal: "State or condition",
    plain: "Planetary periods that reveal life's chapters. Each planet rules a portion of your life.",
    trap: "Dreading certain dashas. Creating self-fulfilling prophecies of difficulty.",
    opportunity: "Understanding your current life chapter. Working with planetary themes rather than against them."
  },
  {
    term: "Lagna",
    sanskrit: "लग्न",
    literal: "That which attaches",
    plain: "The rising sign (ascendant) — the zodiac sign rising on the eastern horizon at birth. The most important point in the chart.",
    trap: "Confusing lagna with sun sign. Underestimating its significance.",
    opportunity: "Understanding lagna as your soul's chosen entry point into this incarnation."
  },
  {
    term: "Ātmakāraka",
    sanskrit: "आत्मकारक",
    literal: "Soul significator",
    plain: "The planet at the highest degree in your chart. It represents your soul's primary lesson this lifetime.",
    trap: "Fighting against ātmakāraka themes. Resisting your core learning.",
    opportunity: "Embracing your soul teacher. Cooperation with ātmakāraka accelerates spiritual growth."
  },
  {
    term: "Karma",
    sanskrit: "कर्म",
    literal: "Action",
    plain: "The universal principle of cause and effect. Every action creates consequences that ripple through time.",
    trap: "Using karma to justify fatalism or blame victims. Ignoring free will.",
    opportunity: "Understanding karma as empowerment. You created patterns; you can transform them."
  },
  {
    term: "Yoga",
    sanskrit: "योग",
    literal: "Union or combination",
    plain: "Specific planetary combinations that create distinct life patterns — both beneficial and challenging.",
    trap: "Obsessing over yogas. Ignoring context and dasha activation.",
    opportunity: "Recognizing yogas as potential waiting for activation. Understanding what combinations you carry."
  },
  {
    term: "Varga",
    sanskrit: "वर्ग",
    literal: "Division",
    plain: "Divisional charts — the birth chart divided into smaller segments revealing specific life areas in detail.",
    trap: "Reading divisional charts as separate from the birth chart.",
    opportunity: "Gaining precision in prediction. Each varga illuminates a specific life domain."
  },
  {
    term: "Ayanāṃśa",
    sanskrit: "अयनांश",
    literal: "Portion of the path",
    plain: "The angular difference between tropical and sidereal zodiac positions. JYOTI uses Lahiri ayanamsa.",
    trap: "Ignoring ayanamsa or using inconsistent systems.",
    opportunity: "Understanding the cosmic calibration. Aligning with the actual starfield positions."
  }
];

// House Colors for UI
const HOUSE_COLORS = {
  1: '#C9A227',  // Gold - Self
  2: '#2E7D32',  // Green - Wealth
  3: '#F57C00',  // Orange - Effort
  4: '#1565C0',  // Blue - Home
  5: '#7B1FA2',  // Purple - Creativity
  6: '#455A64',  // Gray - Service
  7: '#E91E63',  // Pink - Partnership
  8: '#4A148C',  // Deep Purple - Transformation
  9: '#FF8F00',  // Amber - Purpose
  10: '#1A237E', // Indigo - Career
  11: '#00838F', // Teal - Gains
  12: '#6A1B9A'  // Violet - Liberation
};

// Planet Colors for UI
const PLANET_COLORS = {
  Sun: '#FFB300',
  Moon: '#90CAF9',
  Mars: '#EF5350',
  Mercury: '#66BB6A',
  Jupiter: '#FFD54F',
  Venus: '#F48FB1',
  Saturn: '#78909C',
  Rahu: '#7E57C2',
  Ketu: '#8D6E63'
};
