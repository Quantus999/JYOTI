/* ═══════════════════════════════════════════════════════════════════════════
   JYOTI Chart Features — 20 Revolutionary Improvements
   Making the chart ALIVE, TEACHING, and SACRED
   ═══════════════════════════════════════════════════════════════════════════ */

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS (in case not available from app.js scope)
// ═══════════════════════════════════════════════════════════════════════════

// Ordinal suffix helper (1st, 2nd, 3rd, etc.)
const ordinal = typeof window.ordinal === 'function' ? window.ordinal :
  (n => n + (['th','st','nd','rd'][n%10>3?0:(n%100-n%10!==10)*(n%10)] || 'th'));

// ═══════════════════════════════════════════════════════════════════════════
// CHART STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

const ChartFeatures = {
  // Current view mode: 'square' or 'wheel'
  viewMode: 'square',

  // Feature toggles
  showNakshatras: false,
  showTransits: false,
  showAspects: false,
  symbolsOnly: false,
  silentMode: false,
  audioEnabled: false,
  teachModeActive: false,
  focusedHouse: null,
  comparisonMode: false,

  // House category highlighting
  highlightCategory: null, // 'kendra', 'trikona', 'dusthana', or null

  // Progressive revelation state
  revealedHouses: new Set([1]), // Start with lagna revealed
  progressiveMode: false,

  // Exploration progress (persisted)
  exploredHouses: new Set(),
  exploredPlanets: new Set(),

  // Aspect data for current selection
  activeAspectPlanet: null,

  // Teach mode state
  teachStep: 0,
  teachSteps: [],

  // Current transit positions (would be calculated from ephemeris)
  transits: null,

  // Speech synthesis for audio
  speechSynth: window.speechSynthesis,

  // Initialize from localStorage
  init() {
    this.loadProgress();
    this.setupTooltip();
    this.setupKeyboardShortcuts();
  },

  // Load exploration progress from localStorage
  loadProgress() {
    try {
      const saved = localStorage.getItem('jyoti_chart_progress');
      if (saved) {
        const data = JSON.parse(saved);
        this.exploredHouses = new Set(data.houses || []);
        this.exploredPlanets = new Set(data.planets || []);
      }
    } catch (e) {
      console.log('No saved progress found');
    }
  },

  // Save exploration progress
  saveProgress() {
    try {
      localStorage.setItem('jyoti_chart_progress', JSON.stringify({
        houses: Array.from(this.exploredHouses),
        planets: Array.from(this.exploredPlanets)
      }));
    } catch (e) {
      console.log('Could not save progress');
    }
  },

  // Mark house as explored
  exploreHouse(houseNum) {
    this.exploredHouses.add(houseNum);
    this.revealedHouses.add(houseNum);
    this.saveProgress();
  },

  // Mark planet as explored
  explorePlanet(planetName) {
    this.exploredPlanets.add(planetName);
    this.saveProgress();
  },

  // Get exploration percentage
  getExplorationPercent() {
    const totalHouses = 12;
    const totalPlanets = 9;
    const explored = this.exploredHouses.size + this.exploredPlanets.size;
    return Math.round((explored / (totalHouses + totalPlanets)) * 100);
  },

  // Get unexplored items hint
  getUnexploredHint() {
    const unexploredHouses = [];
    for (let i = 1; i <= 12; i++) {
      if (!this.exploredHouses.has(i)) unexploredHouses.push(i);
    }
    if (unexploredHouses.length > 0) {
      return `You haven't explored house${unexploredHouses.length > 1 ? 's' : ''} ${unexploredHouses.slice(0, 3).join(', ')}${unexploredHouses.length > 3 ? '...' : ''} yet`;
    }
    const allPlanets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
    const unexploredPlanets = allPlanets.filter(p => !this.exploredPlanets.has(p));
    if (unexploredPlanets.length > 0) {
      return `Discover ${unexploredPlanets[0]}'s influence in your chart`;
    }
    return 'You\'ve explored your entire chart! ✦';
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// TEACHING TOOLTIPS DATA (#4)
// ═══════════════════════════════════════════════════════════════════════════

const HOUSE_TOOLTIPS = {
  1: { title: "1st House — The Self", sanskrit: "तनु", brief: "How you appear to the world", detailed: "The Ascendant house represents your physical body, personality, and the mask you wear. It's the starting point of your life journey." },
  2: { title: "2nd House — Resources", sanskrit: "धन", brief: "What you value and possess", detailed: "Wealth, speech, family values, and what you consume. This house shows how you resource yourself and what you find valuable." },
  3: { title: "3rd House — Courage", sanskrit: "सहज", brief: "Your will to act", detailed: "Siblings, short journeys, communication, and courage. The house of effort and self-expression through action." },
  4: { title: "4th House — Home", sanskrit: "बन्धु", brief: "Your emotional foundation", detailed: "Mother, home, property, inner peace, and emotional security. Where you return when all else falls away." },
  5: { title: "5th House — Creation", sanskrit: "पुत्र", brief: "What you create and enjoy", detailed: "Children, creativity, romance, intelligence, and past-life merit. The fountain of creative expression." },
  6: { title: "6th House — Service", sanskrit: "शत्रु", brief: "Daily challenges and growth", detailed: "Health, enemies, obstacles, service, and daily work. The forge where difficulties become strength." },
  7: { title: "7th House — Partnership", sanskrit: "कलत्र", brief: "The Other in your life", detailed: "Spouse, business partners, contracts, and open enemies. The mirror that reflects who you truly are." },
  8: { title: "8th House — Transformation", sanskrit: "आयु", brief: "Death and rebirth", detailed: "Longevity, inheritance, hidden knowledge, and transformation. Where the ego dies and the soul awakens." },
  9: { title: "9th House — Dharma", sanskrit: "धर्म", brief: "Your higher purpose", detailed: "Father, guru, luck, religion, and long journeys. The house of grace, wisdom, and life's deeper meaning." },
  10: { title: "10th House — Career", sanskrit: "कर्म", brief: "Your public contribution", detailed: "Career, reputation, authority, and karma yoga. How you contribute to the world and are remembered." },
  11: { title: "11th House — Gains", sanskrit: "लाभ", brief: "Wishes fulfilled", detailed: "Friends, networks, hopes, and gains. Where your desires manifest and community supports growth." },
  12: { title: "12th House — Liberation", sanskrit: "व्यय", brief: "Beyond the material", detailed: "Loss, spirituality, foreign lands, and moksha. The house of endings, dreams, and ultimate freedom." }
};

const PLANET_TOOLTIPS = {
  Sun: { title: "Sun — The King", sanskrit: "सूर्य", brief: "Your soul's purpose", detailed: "The Ātman — eternal witness-consciousness. Father, authority, ego, and vitality." },
  Moon: { title: "Moon — The Queen", sanskrit: "चन्द्र", brief: "Your emotional mind", detailed: "Manas — the reactive mind. Mother, emotions, nurturing, and public image." },
  Mars: { title: "Mars — The Warrior", sanskrit: "मङ्गल", brief: "Your drive and courage", detailed: "Kuṇḍalinī Śakti — raw life force. Brothers, property, competition, and energy." },
  Mercury: { title: "Mercury — The Messenger", sanskrit: "बुध", brief: "Your intellect", detailed: "Buddhi — discriminative wisdom. Communication, commerce, and learning." },
  Jupiter: { title: "Jupiter — The Guru", sanskrit: "गुरु", brief: "Your wisdom and grace", detailed: "The Guru principle — divine grace. Teachers, children, dharma, and expansion." },
  Venus: { title: "Venus — The Artist", sanskrit: "शुक्र", brief: "Your capacity for love", detailed: "Bhakti — devotional love. Relationships, beauty, art, and pleasure." },
  Saturn: { title: "Saturn — The Judge", sanskrit: "शनि", brief: "Your karma teacher", detailed: "Vairāgya — dispassion through time. Discipline, structure, and what endures." },
  Rahu: { title: "Rahu — The Disruptor", sanskrit: "राहु", brief: "Your worldly desires", detailed: "Māyā — cosmic illusion. Foreign things, obsession, and amplification." },
  Ketu: { title: "Ketu — The Liberator", sanskrit: "केतु", brief: "Your path to freedom", detailed: "Mokṣa — liberation. Past lives, detachment, and spiritual insight." }
};

// ═══════════════════════════════════════════════════════════════════════════
// #1 DUAL-VIEW TOGGLE: Square ↔ Wheel
// ═══════════════════════════════════════════════════════════════════════════

function toggleChartView(mode) {
  ChartFeatures.viewMode = mode;
  const container = document.getElementById('chart-main-container');
  if (!container) return;

  // Update toggle buttons
  document.querySelectorAll('.chart-view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === mode);
  });

  // Re-render chart
  if (mode === 'wheel') {
    container.innerHTML = renderWheelChart();
  } else {
    container.innerHTML = renderSquareChart();
  }
}

function renderWheelChart() {
  if (!chartData) return '<div>No chart data</div>';

  const c = chartData;
  const centerX = 200;
  const centerY = 200;
  const outerRadius = 180;
  const innerRadius = 100;
  const planetRadius = 140;
  const houseNumRadius = 165;

  // Create SVG paths for zodiac segments
  let segments = '';
  let signLabels = '';
  let houseNumbers = '';
  let houseLines = '';
  let planetGlyphs = '';

  for (let i = 0; i < 12; i++) {
    const signIndex = (c.lagna + i) % 12;
    const houseNum = i + 1;
    const startAngle = (i * 30 - 90) * (Math.PI / 180);
    const endAngle = ((i + 1) * 30 - 90) * (Math.PI / 180);
    const midAngle = ((i + 0.5) * 30 - 90) * (Math.PI / 180);

    // Segment path
    const x1 = centerX + outerRadius * Math.cos(startAngle);
    const y1 = centerY + outerRadius * Math.sin(startAngle);
    const x2 = centerX + outerRadius * Math.cos(endAngle);
    const y2 = centerY + outerRadius * Math.sin(endAngle);
    const x3 = centerX + innerRadius * Math.cos(endAngle);
    const y3 = centerY + innerRadius * Math.sin(endAngle);
    const x4 = centerX + innerRadius * Math.cos(startAngle);
    const y4 = centerY + innerRadius * Math.sin(startAngle);

    const isLagna = i === 0;
    segments += `
      <path class="wheel-segment${isLagna ? ' wheel-lagna' : ''}"
            d="M${x1},${y1} A${outerRadius},${outerRadius} 0 0,1 ${x2},${y2} L${x3},${y3} A${innerRadius},${innerRadius} 0 0,0 ${x4},${y4} Z"
            data-house="${houseNum}"
            onclick="showHouseModal(${houseNum}); ChartFeatures.exploreHouse(${houseNum});" />
    `;

    // Sign glyph in segment
    const labelRadius = (outerRadius + innerRadius) / 2;
    const labelX = centerX + labelRadius * Math.cos(midAngle);
    const labelY = centerY + labelRadius * Math.sin(midAngle);
    signLabels += `<text class="wheel-sign-label" x="${labelX}" y="${labelY}">${SIGN_GLYPHS[signIndex]}</text>`;

    // House number near outer edge
    const numX = centerX + houseNumRadius * Math.cos(midAngle);
    const numY = centerY + houseNumRadius * Math.sin(midAngle);
    houseNumbers += `<text class="wheel-house-num" x="${numX}" y="${numY}">${houseNum}</text>`;

    // House divider line
    houseLines += `<line class="wheel-divider" x1="${centerX + innerRadius * Math.cos(startAngle)}" y1="${centerY + innerRadius * Math.sin(startAngle)}" x2="${x1}" y2="${y1}" />`;

    // Planets in this house
    const planetsHere = c.planets.filter(p => p.house === houseNum);
    planetsHere.forEach((planet, pIdx) => {
      const pAngle = ((i + 0.25 + pIdx * 0.25) * 30 - 90) * (Math.PI / 180);
      const px = centerX + planetRadius * Math.cos(pAngle);
      const py = centerY + planetRadius * Math.sin(pAngle);

      let colorClass = planet.exalted ? 'exalted' : planet.debilitated ? 'debilitated' : '';

      planetGlyphs += `
        <g class="wheel-planet-group" onclick="showPlanetModal('${planet.name}'); ChartFeatures.explorePlanet('${planet.name}');">
          <circle cx="${px}" cy="${py}" r="14" class="wheel-planet-bg ${colorClass}" />
          <text class="wheel-planet-text" x="${px}" y="${py}">${planet.glyph}</text>
        </g>
      `;
    });
  }

  return `
    <div class="wheel-chart-container">
      <svg class="wheel-chart-svg" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="wheel-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.1"/>
          </filter>
        </defs>
        <!-- Background circles -->
        <circle cx="${centerX}" cy="${centerY}" r="${outerRadius}" fill="none" stroke="#e0d5c7" stroke-width="2" />
        <circle cx="${centerX}" cy="${centerY}" r="${innerRadius}" fill="#faf8f5" stroke="#e0d5c7" stroke-width="1" />
        <!-- Segments (clickable) -->
        ${segments}
        <!-- Divider lines -->
        ${houseLines}
        <!-- House numbers -->
        ${houseNumbers}
        <!-- Sign glyphs -->
        ${signLabels}
        <!-- Planets -->
        ${planetGlyphs}
        <!-- Center -->
        <circle cx="${centerX}" cy="${centerY}" r="45" fill="white" stroke="#e0d5c7" filter="url(#wheel-shadow)" />
        <text x="${centerX}" y="${centerY - 8}" class="wheel-center-label">Lagna</text>
        <text x="${centerX}" y="${centerY + 12}" class="wheel-center-sign">${SIGNS[c.lagna]}</text>
      </svg>
    </div>
  `;
}

function renderSquareChart() {
  if (!chartData) return '<div>No chart data</div>';

  const c = chartData;
  const layout = [11,0,1,2,10,null,null,3,9,null,null,4,8,7,6,5];
  const breatheClass = `chart-breathing`;
  const dashaPlanet = c.dasha?.maha?.planet || 'Saturn';

  let cells = layout.map((signOffset, idx) => {
    if (signOffset === null) {
      return '<div class="chart-cell-interactive empty" style="background: var(--stone-soft);"></div>';
    }

    const sign = (c.lagna + signOffset) % 12;
    const houseNum = signOffset + 1;
    const planetsHere = c.planets.filter(p => p.house === houseNum);
    const isLagna = signOffset === 0;
    const isEmpty = planetsHere.length === 0;
    const bhava = BHAVA_DETAILS[houseNum];

    // Build planet HTML with dignity indicators
    const planetHtml = planetsHere.map(p => {
      let dignityClass = '';
      let dignityRing = '';
      if (p.exalted) { dignityClass = 'exalted'; dignityRing = 'exalted'; }
      else if (p.debilitated) { dignityClass = 'debilitated'; dignityRing = 'debilitated'; }
      else if (p.ownSign) { dignityRing = 'own-sign'; }

      const retroClass = p.retro ? 'planet-retrograde' : '';

      return `
        <span class="planet-dignity-ring ${dignityRing} ${retroClass}">
          <span class="planet-glyph-interactive ${dignityClass}${p.isAK ? ' ak' : ''}"
                data-tooltip="planet"
                onclick="event.stopPropagation(); showChartTooltip(event, 'planet', '${p.name}'); ChartFeatures.explorePlanet('${p.name}');"
                ondblclick="event.stopPropagation(); showPlanetModal('${p.name}');"
                title="${p.name} ${fmtDeg(p.degree)}">
            ${p.glyph}
          </span>
          ${p.retro ? '<span class="retrograde-indicator">℞</span>' : ''}
        </span>
      `;
    }).join('');

    // Empty house content
    const emptyContent = isEmpty ? `
      <span class="empty-sanskrit">${bhava?.sanskrit || ''}</span>
    ` : '';

    // Determine if revealed (for progressive mode)
    const isRevealed = ChartFeatures.revealedHouses.has(houseNum) || !ChartFeatures.progressiveMode;
    const revealedClass = isRevealed ? 'revealed' : '';

    // House category classes for highlighting
    let categoryClass = '';
    if (ChartFeatures.highlightCategory === 'kendra' && [1,4,7,10].includes(houseNum)) {
      categoryClass = 'kendra-highlight';
    } else if (ChartFeatures.highlightCategory === 'trikona' && [1,5,9].includes(houseNum)) {
      categoryClass = 'trikona-highlight';
    } else if (ChartFeatures.highlightCategory === 'dusthana' && [6,8,12].includes(houseNum)) {
      categoryClass = 'dusthana-highlight';
    }

    return `
      <div class="chart-cell-interactive${isLagna ? ' lagna' : ''}${isEmpty ? ' empty-house' : ''} ${revealedClass} ${categoryClass}"
           data-tooltip="house"
           onclick="showChartTooltip(event, 'house', ${houseNum}); ChartFeatures.exploreHouse(${houseNum});"
           ondblclick="showHouseModal(${houseNum})"
           data-house="${houseNum}"
           data-empty-text="${isEmpty ? 'Awaiting activation' : ''}">
        <span class="cell-house-num">${houseNum}</span>
        <span class="cell-sign-interactive">${SIGNS[sign]}</span>
        <div class="cell-planets-interactive">${planetHtml}</div>
        ${emptyContent}
      </div>
    `;
  }).join('');

  return `
    <div class="si-chart-interactive ${breatheClass}" data-dasha="${dashaPlanet}">
      ${cells}
    </div>
    <div id="aspect-overlay" class="aspect-overlay">
      <svg width="100%" height="100%" style="position:absolute;inset:0;"></svg>
    </div>
    <div id="lord-trace-overlay" class="lord-trace-line">
      <svg width="100%" height="100%" style="position:absolute;inset:0;"></svg>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════
// #2 BREATHING CHART — Animation tied to Dasha
// ═══════════════════════════════════════════════════════════════════════════

function updateChartBreathing() {
  if (!chartData) return;
  const chart = document.querySelector('.chart-breathing');
  if (chart) {
    chart.dataset.dasha = chartData.dasha?.maha?.planet || 'Saturn';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// #3 PROGRESSIVE HOUSE REVELATION
// ═══════════════════════════════════════════════════════════════════════════

function toggleProgressiveMode(enable) {
  ChartFeatures.progressiveMode = enable;
  if (enable) {
    ChartFeatures.revealedHouses = new Set([1]); // Reset to just lagna
  }
  refreshChart();
}

function revealNextHouse() {
  const nextHouse = ChartFeatures.revealedHouses.size + 1;
  if (nextHouse <= 12) {
    ChartFeatures.revealedHouses.add(nextHouse);
    refreshChart();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// #4 HOVER TEACHING TOOLTIPS
// ═══════════════════════════════════════════════════════════════════════════

let tooltipTimeout = null;
let tooltipElement = null;

ChartFeatures.setupTooltip = function() {
  if (tooltipElement) return;
  tooltipElement = document.createElement('div');
  tooltipElement.className = 'chart-tooltip';
  tooltipElement.innerHTML = `
    <button class="tooltip-close" onclick="hideChartTooltip()" aria-label="Close">×</button>
    <div class="tooltip-title"></div>
    <div class="tooltip-sanskrit"></div>
    <div class="tooltip-text"></div>
  `;
  document.body.appendChild(tooltipElement);

  // Close tooltip when clicking outside
  document.addEventListener('click', (e) => {
    if (tooltipElement && !tooltipElement.contains(e.target) && !e.target.closest('[data-tooltip]')) {
      hideChartTooltip();
    }
  });
};

function showChartTooltip(event, type, id) {
  if (!tooltipElement) ChartFeatures.setupTooltip();

  // Stop event propagation to prevent immediate close
  event.stopPropagation();

  let data;
  if (type === 'house') {
    data = HOUSE_TOOLTIPS[id];
  } else if (type === 'planet') {
    data = PLANET_TOOLTIPS[id];
  }

  if (!data) return;

  // Use brief for overview, detailed for chart section
  const isOverview = event.target.closest('.bento-card') !== null;
  const text = isOverview ? data.brief : data.detailed;

  tooltipElement.querySelector('.tooltip-title').textContent = data.title;
  tooltipElement.querySelector('.tooltip-sanskrit').textContent = data.sanskrit;
  tooltipElement.querySelector('.tooltip-text').textContent = text;

  // Position tooltip near the clicked element
  const rect = event.target.getBoundingClientRect();
  const tooltipWidth = 280;
  let left = rect.left + rect.width / 2;
  let top = rect.bottom + 10;

  // Keep tooltip within viewport
  if (left - tooltipWidth / 2 < 10) left = tooltipWidth / 2 + 10;
  if (left + tooltipWidth / 2 > window.innerWidth - 10) left = window.innerWidth - tooltipWidth / 2 - 10;
  if (top + 200 > window.innerHeight) top = rect.top - 10;

  tooltipElement.style.left = left + 'px';
  tooltipElement.style.top = top + 'px';
  tooltipElement.style.transform = top < rect.top ? 'translate(-50%, -100%)' : 'translateX(-50%)';

  tooltipElement.classList.add('visible');
}

function hideChartTooltip() {
  clearTimeout(tooltipTimeout);
  if (tooltipElement) {
    tooltipElement.classList.remove('visible');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// #5 ASPECT LINES ON DEMAND
// ═══════════════════════════════════════════════════════════════════════════

const VEDIC_ASPECTS = {
  Sun: [7],
  Moon: [7],
  Mars: [4, 7, 8],
  Mercury: [7],
  Jupiter: [5, 7, 9],
  Venus: [7],
  Saturn: [3, 7, 10],
  Rahu: [5, 7, 9],
  Ketu: [5, 7, 9]
};

function showAspects(planetName) {
  if (!chartData) return;

  const planet = chartData.planets.find(p => p.name === planetName);
  if (!planet) return;

  ChartFeatures.activeAspectPlanet = planetName;
  ChartFeatures.showAspects = true;

  const aspects = VEDIC_ASPECTS[planetName] || [7];
  const overlay = document.getElementById('aspect-overlay');
  if (!overlay) return;

  const svg = overlay.querySelector('svg');
  svg.innerHTML = '';

  // Get planet's cell position
  const planetCell = document.querySelector(`[data-house="${planet.house}"]`);
  if (!planetCell) return;

  const chartContainer = planetCell.closest('.si-chart-interactive');
  if (!chartContainer) return;

  const containerRect = chartContainer.getBoundingClientRect();
  const planetRect = planetCell.getBoundingClientRect();
  const fromX = planetRect.left - containerRect.left + planetRect.width / 2;
  const fromY = planetRect.top - containerRect.top + planetRect.height / 2;

  aspects.forEach(aspectDist => {
    const targetHouse = ((planet.house - 1 + aspectDist) % 12) + 1;
    const targetCell = document.querySelector(`[data-house="${targetHouse}"]`);
    if (!targetCell) return;

    const targetRect = targetCell.getBoundingClientRect();
    const toX = targetRect.left - containerRect.left + targetRect.width / 2;
    const toY = targetRect.top - containerRect.top + targetRect.height / 2;

    // Determine aspect type for coloring
    let aspectType = 'opposition';
    if (aspectDist === 5 || aspectDist === 9) aspectType = 'trine';
    else if (aspectDist === 4 || aspectDist === 8) aspectType = 'square';
    else if (aspectDist === 7) aspectType = 'opposition';

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', fromX);
    line.setAttribute('y1', fromY);
    line.setAttribute('x2', toX);
    line.setAttribute('y2', toY);
    line.setAttribute('class', `aspect-line ${aspectType} visible`);
    svg.appendChild(line);
  });

  // Highlight the planet
  planetCell.classList.add('planet-aspect-active');
}

function hideAspects() {
  ChartFeatures.showAspects = false;
  ChartFeatures.activeAspectPlanet = null;

  const overlay = document.getElementById('aspect-overlay');
  if (overlay) {
    overlay.querySelector('svg').innerHTML = '';
  }

  document.querySelectorAll('.planet-aspect-active').forEach(el => {
    el.classList.remove('planet-aspect-active');
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// #6 "TEACH ME THIS CHART" MODE
// ═══════════════════════════════════════════════════════════════════════════

const TEACH_STEPS = [
  {
    element: '[data-house="1"]',
    text: "This is your Lagna — your Ascendant. It's where your soul enters the world, shaping how others perceive you.",
    highlight: 'lagna'
  },
  {
    element: null,
    text: "The planets in your chart are like actors in a cosmic theater. Each plays a role in your life story.",
    highlight: 'planets'
  },
  {
    element: null,
    text: "Your Moon sign represents your emotional nature and inner world — often more important than your Sun sign in Vedic astrology.",
    highlight: 'moon'
  },
  {
    element: null,
    text: "Your Ātmakāraka (soul significator) is the planet with the highest degree. It reveals your soul's deepest desire.",
    highlight: 'atmakaraka'
  },
  {
    element: null,
    text: "Houses 1, 5, and 9 form the Dharma Trikona — houses of purpose, creativity, and fortune. They're your natural strengths.",
    highlight: 'trikona'
  },
  {
    element: null,
    text: "You're now in a specific Dasha period — a planetary chapter that colors all experiences for years at a time.",
    highlight: 'dasha'
  }
];

function startTeachMode() {
  if (!chartData) return;

  ChartFeatures.teachModeActive = true;
  ChartFeatures.teachStep = 0;
  ChartFeatures.teachSteps = buildTeachSteps();

  showTeachStep();

  document.querySelector('.teach-me-btn')?.classList.add('active');
}

function buildTeachSteps() {
  if (!chartData) return TEACH_STEPS;

  // Customize steps based on actual chart
  const steps = [...TEACH_STEPS];

  // Add Moon position
  const moon = chartData.planets.find(p => p.name === 'Moon');
  if (moon) {
    steps[2].element = `[data-house="${moon.house}"]`;
  }

  // Add Atmakaraka
  const ak = chartData.planets.find(p => p.name === chartData.atmakaraka);
  if (ak) {
    steps[3].element = `[data-house="${ak.house}"]`;
  }

  return steps;
}

function showTeachStep() {
  const step = ChartFeatures.teachSteps[ChartFeatures.teachStep];
  if (!step) {
    endTeachMode();
    return;
  }

  // Remove existing narration
  document.querySelector('.teach-mode-narration')?.remove();

  // Clear highlights
  document.querySelectorAll('.teach-highlight').forEach(el => el.classList.remove('teach-highlight'));

  // Highlight element if specified
  if (step.element) {
    document.querySelector(step.element)?.classList.add('teach-highlight');
  }

  // Apply category highlight
  if (step.highlight === 'trikona') {
    ChartFeatures.highlightCategory = 'trikona';
    refreshChart();
  }

  // Create narration box
  const narration = document.createElement('div');
  narration.className = 'teach-mode-narration';
  narration.innerHTML = `
    <p style="font-size: 1rem; line-height: 1.6; margin-bottom: 16px;">${step.text}</p>
    <div class="teach-mode-progress">
      ${ChartFeatures.teachSteps.map((_, i) => `
        <div class="teach-step-dot ${i < ChartFeatures.teachStep ? 'completed' : ''} ${i === ChartFeatures.teachStep ? 'active' : ''}"></div>
      `).join('')}
    </div>
    <div style="display: flex; gap: 12px; justify-content: center; margin-top: 16px;">
      ${ChartFeatures.teachStep > 0 ? '<button onclick="prevTeachStep()" style="padding: 8px 16px; background: transparent; border: 1px solid white; color: white; border-radius: 100px; cursor: pointer;">← Back</button>' : ''}
      <button onclick="nextTeachStep()" style="padding: 8px 16px; background: var(--gold); border: none; color: black; border-radius: 100px; cursor: pointer; font-weight: 500;">
        ${ChartFeatures.teachStep < ChartFeatures.teachSteps.length - 1 ? 'Continue →' : 'Finish ✦'}
      </button>
    </div>
    <button onclick="endTeachMode()" style="position: absolute; top: 12px; right: 12px; background: none; border: none; color: white; opacity: 0.5; cursor: pointer; font-size: 1.2rem;">×</button>
  `;

  document.body.appendChild(narration);

  // Speak if audio enabled
  if (ChartFeatures.audioEnabled && ChartFeatures.speechSynth) {
    const utterance = new SpeechSynthesisUtterance(step.text);
    utterance.rate = 0.9;
    ChartFeatures.speechSynth.speak(utterance);
  }
}

function nextTeachStep() {
  ChartFeatures.teachStep++;
  if (ChartFeatures.teachStep >= ChartFeatures.teachSteps.length) {
    endTeachMode();
  } else {
    showTeachStep();
  }
}

function prevTeachStep() {
  if (ChartFeatures.teachStep > 0) {
    ChartFeatures.teachStep--;
    showTeachStep();
  }
}

function endTeachMode() {
  ChartFeatures.teachModeActive = false;
  ChartFeatures.highlightCategory = null;

  document.querySelector('.teach-mode-narration')?.remove();
  document.querySelectorAll('.teach-highlight').forEach(el => el.classList.remove('teach-highlight'));
  document.querySelector('.teach-me-btn')?.classList.remove('active');

  if (ChartFeatures.speechSynth) {
    ChartFeatures.speechSynth.cancel();
  }

  refreshChart();
}

// ═══════════════════════════════════════════════════════════════════════════
// #8 HOUSE LORD TRACE
// ═══════════════════════════════════════════════════════════════════════════

const SIGN_LORDS = {
  0: 'Mars',      // Aries
  1: 'Venus',     // Taurus
  2: 'Mercury',   // Gemini
  3: 'Moon',      // Cancer
  4: 'Sun',       // Leo
  5: 'Mercury',   // Virgo
  6: 'Venus',     // Libra
  7: 'Mars',      // Scorpio
  8: 'Jupiter',   // Sagittarius
  9: 'Saturn',    // Capricorn
  10: 'Saturn',   // Aquarius
  11: 'Jupiter'   // Pisces
};

function showHouseLordTrace(houseNum) {
  if (!chartData) return;

  const houseSign = (chartData.lagna + houseNum - 1) % 12;
  const lordName = SIGN_LORDS[houseSign];
  const lord = chartData.planets.find(p => p.name === lordName);

  if (!lord) return;

  const overlay = document.getElementById('lord-trace-overlay');
  if (!overlay) return;

  const svg = overlay.querySelector('svg');
  svg.innerHTML = '';

  const fromCell = document.querySelector(`[data-house="${houseNum}"]`);
  const toCell = document.querySelector(`[data-house="${lord.house}"]`);

  if (!fromCell || !toCell) return;

  const container = fromCell.closest('.si-chart-interactive');
  if (!container) return;

  const containerRect = container.getBoundingClientRect();
  const fromRect = fromCell.getBoundingClientRect();
  const toRect = toCell.getBoundingClientRect();

  const fromX = fromRect.left - containerRect.left + fromRect.width / 2;
  const fromY = fromRect.top - containerRect.top + fromRect.height / 2;
  const toX = toRect.left - containerRect.left + toRect.width / 2;
  const toY = toRect.top - containerRect.top + toRect.height / 2;

  // Create curved path
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2 - 30;

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', `M${fromX},${fromY} Q${midX},${midY} ${toX},${toY}`);
  path.setAttribute('class', 'lord-trace-path animate');
  svg.appendChild(path);

  // Add arrow
  const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  arrow.setAttribute('cx', toX);
  arrow.setAttribute('cy', toY);
  arrow.setAttribute('r', 5);
  arrow.setAttribute('class', 'lord-trace-arrow');
  svg.appendChild(arrow);

  // Add label
  const indicator = document.createElement('div');
  indicator.className = 'house-lord-indicator';
  indicator.textContent = `Lord: ${lordName}`;
  indicator.style.left = toX + containerRect.left + 'px';
  indicator.style.top = toY + containerRect.top - 25 + 'px';
  document.body.appendChild(indicator);

  // Remove after delay
  setTimeout(() => {
    svg.innerHTML = '';
    indicator.remove();
  }, 3000);
}

// ═══════════════════════════════════════════════════════════════════════════
// #11 NAKSHATRA LAYER
// ═══════════════════════════════════════════════════════════════════════════

function toggleNakshatraLayer(show) {
  ChartFeatures.showNakshatras = show;

  document.querySelectorAll('.nakshatra-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.layer === (show ? 'nakshatra' : 'rashi'));
  });

  // Update planet display to show nakshatra info
  if (chartData) {
    document.querySelectorAll('.planet-glyph-interactive').forEach(glyph => {
      const planetName = glyph.getAttribute('title')?.split(' ')[0];
      const planet = chartData.planets.find(p => p.name === planetName);
      if (planet && show) {
        glyph.setAttribute('title', `${planet.name} in ${NAKSHATRAS[planet.nakshatra]}`);
      } else if (planet) {
        glyph.setAttribute('title', `${planet.name} ${fmtDeg(planet.degree)}`);
      }
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// #12 CURRENT TRANSIT GHOST
// ═══════════════════════════════════════════════════════════════════════════

async function showTransitGhost() {
  ChartFeatures.showTransits = true;

  // In a real implementation, we'd calculate current positions
  // For now, show a simplified version
  const transitInfo = document.createElement('div');
  transitInfo.className = 'transit-legend';
  transitInfo.innerHTML = `
    <span class="transit-legend-dot"></span>
    <span>Current transits shown in ghost overlay</span>
  `;

  const chartContainer = document.querySelector('.si-chart-interactive');
  if (chartContainer) {
    chartContainer.parentElement.appendChild(transitInfo);
  }
}

function hideTransitGhost() {
  ChartFeatures.showTransits = false;
  document.querySelector('.transit-legend')?.remove();
}

// ═══════════════════════════════════════════════════════════════════════════
// #13 KENDRA-TRIKONA HIGHLIGHTING
// ═══════════════════════════════════════════════════════════════════════════

function highlightHouseCategory(category) {
  if (ChartFeatures.highlightCategory === category) {
    ChartFeatures.highlightCategory = null;
  } else {
    ChartFeatures.highlightCategory = category;
  }

  // Update buttons
  document.querySelectorAll('.house-category-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === ChartFeatures.highlightCategory);
  });

  refreshChart();
}

// ═══════════════════════════════════════════════════════════════════════════
// #15 SYMBOLIC GLYPHS ONLY MODE
// ═══════════════════════════════════════════════════════════════════════════

function toggleSymbolsOnly(enable) {
  ChartFeatures.symbolsOnly = enable;

  // Apply to both square and wheel chart containers
  const squareChart = document.querySelector('.si-chart-interactive');
  const wheelChart = document.querySelector('.wheel-chart-container');

  if (squareChart) {
    squareChart.classList.toggle('chart-symbols-only', enable);
  }
  if (wheelChart) {
    wheelChart.classList.toggle('chart-symbols-only', enable);
  }

  // Also apply to main chart container for consistent styling
  const mainContainer = document.getElementById('chart-main-container');
  if (mainContainer) {
    mainContainer.classList.toggle('chart-symbols-only', enable);
  }

  document.querySelectorAll('.symbols-toggle-switch').forEach(sw => {
    sw.classList.toggle('active', enable);
  });

  // Re-render chart to apply changes
  refreshChart();
}

// ═══════════════════════════════════════════════════════════════════════════
// #17 FOCUS MODE — One House at a Time
// ═══════════════════════════════════════════════════════════════════════════

function enterFocusMode(houseNum) {
  ChartFeatures.focusedHouse = houseNum;

  const chartContainer = document.querySelector('.si-chart-interactive');
  if (chartContainer) {
    chartContainer.classList.add('chart-focus-mode');
  }

  document.querySelectorAll('.chart-cell-interactive').forEach(cell => {
    const cellHouse = parseInt(cell.dataset.house);
    cell.classList.toggle('focused', cellHouse === houseNum);
  });

  // Add exit button
  const exitBtn = document.createElement('button');
  exitBtn.className = 'focus-exit-btn';
  exitBtn.textContent = '← Exit Focus Mode';
  exitBtn.onclick = exitFocusMode;
  document.body.appendChild(exitBtn);

  // Show house lord trace
  showHouseLordTrace(houseNum);
}

function exitFocusMode() {
  ChartFeatures.focusedHouse = null;

  const chartContainer = document.querySelector('.si-chart-interactive');
  if (chartContainer) {
    chartContainer.classList.remove('chart-focus-mode');
  }

  document.querySelectorAll('.chart-cell-interactive').forEach(cell => {
    cell.classList.remove('focused');
  });

  document.querySelector('.focus-exit-btn')?.remove();
}

// ═══════════════════════════════════════════════════════════════════════════
// #18 AUDIBLE CHART
// ═══════════════════════════════════════════════════════════════════════════

function toggleAudioMode(enable) {
  ChartFeatures.audioEnabled = enable;

  document.querySelectorAll('.audio-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', enable);
  });
}

function speakPlanetInfo(planetName) {
  if (!ChartFeatures.audioEnabled || !ChartFeatures.speechSynth) return;
  if (!chartData) return;

  const planet = chartData.planets.find(p => p.name === planetName);
  if (!planet) return;

  const tooltip = PLANET_TOOLTIPS[planetName];
  const text = `${tooltip?.sanskrit || planetName}. ${planetName}. In ${SIGNS[planet.sign]}. ${ordinal(planet.house)} house.`;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.8;
  utterance.lang = 'en-US';

  ChartFeatures.speechSynth.cancel();
  ChartFeatures.speechSynth.speak(utterance);
}

// ═══════════════════════════════════════════════════════════════════════════
// #19 SAVE CHART STATES — Progress Tracking
// ═══════════════════════════════════════════════════════════════════════════

function renderProgressTracker() {
  const percent = ChartFeatures.getExplorationPercent();
  const circumference = 2 * Math.PI * 20;
  const offset = circumference - (percent / 100) * circumference;

  return `
    <div class="chart-progress">
      <div class="progress-ring">
        <svg width="48" height="48">
          <circle class="progress-ring-circle" cx="24" cy="24" r="20" />
          <circle class="progress-ring-progress" cx="24" cy="24" r="20"
                  stroke-dasharray="${circumference}"
                  stroke-dashoffset="${offset}" />
        </svg>
        <div class="progress-ring-text">${percent}%</div>
      </div>
      <div class="progress-info">
        <div class="progress-title">Chart Exploration</div>
        <div class="progress-subtitle">${ChartFeatures.exploredHouses.size}/12 houses • ${ChartFeatures.exploredPlanets.size}/9 planets</div>
        <div class="unexplored-hint">${ChartFeatures.getUnexploredHint()}</div>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════
// #20 SILENT CHART — Sacred Meditation Mode
// ═══════════════════════════════════════════════════════════════════════════

function toggleSilentMode(enable) {
  ChartFeatures.silentMode = enable;

  const card = document.querySelector('.chart-card, .card');
  if (card) {
    card.classList.toggle('chart-silent-mode', enable);
  }

  // Also add the toggle button
  let toggleBtn = document.querySelector('.silent-mode-toggle');
  if (!toggleBtn && enable) {
    toggleBtn = document.createElement('button');
    toggleBtn.className = 'silent-mode-toggle';
    toggleBtn.textContent = '☀ Exit Sacred Mode';
    toggleBtn.onclick = () => toggleSilentMode(false);
    document.body.appendChild(toggleBtn);
  } else if (toggleBtn && !enable) {
    toggleBtn.remove();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════════════════════════

ChartFeatures.setupKeyboardShortcuts = function() {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch(e.key.toLowerCase()) {
      case 's':
        if (e.ctrlKey || e.metaKey) return;
        toggleSymbolsOnly(!ChartFeatures.symbolsOnly);
        break;
      case 'w':
        toggleChartView(ChartFeatures.viewMode === 'wheel' ? 'square' : 'wheel');
        break;
      case 'm':
        toggleSilentMode(!ChartFeatures.silentMode);
        break;
      case 't':
        if (!ChartFeatures.teachModeActive) {
          startTeachMode();
        } else {
          endTeachMode();
        }
        break;
      case 'escape':
        if (ChartFeatures.focusedHouse) exitFocusMode();
        if (ChartFeatures.teachModeActive) endTeachMode();
        hideAspects();
        break;
    }
  });
};

// ═══════════════════════════════════════════════════════════════════════════
// CHART TOOLBAR RENDERER
// ═══════════════════════════════════════════════════════════════════════════

function renderChartToolbar() {
  return `
    <div class="chart-toolbar">
      <!-- View Toggle -->
      <div class="chart-toolbar-group">
        <button class="chart-view-btn ${ChartFeatures.viewMode === 'square' ? 'active' : ''}"
                data-view="square" onclick="toggleChartView('square')" title="South Indian (Square)">▢</button>
        <button class="chart-view-btn ${ChartFeatures.viewMode === 'wheel' ? 'active' : ''}"
                data-view="wheel" onclick="toggleChartView('wheel')" title="Western (Wheel)">○</button>
      </div>

      <div class="chart-toolbar-divider"></div>

      <!-- Layer Toggle -->
      <div class="nakshatra-toggle">
        <button class="nakshatra-toggle-btn ${!ChartFeatures.showNakshatras ? 'active' : ''}"
                data-layer="rashi" onclick="toggleNakshatraLayer(false)">Rāśi</button>
        <button class="nakshatra-toggle-btn ${ChartFeatures.showNakshatras ? 'active' : ''}"
                data-layer="nakshatra" onclick="toggleNakshatraLayer(true)">Nakshatra</button>
      </div>

      <div class="chart-toolbar-divider"></div>

      <!-- House Categories -->
      <div class="chart-toolbar-group">
        <button class="chart-toolbar-btn ${ChartFeatures.highlightCategory === 'kendra' ? 'active' : ''}"
                data-category="kendra" onclick="highlightHouseCategory('kendra')" title="KENDRA (Pillars): Houses 1,4,7,10 — The four pillars of life: Self, Home, Partnership, Career. Most powerful positions for planets.">Kendra</button>
        <button class="chart-toolbar-btn ${ChartFeatures.highlightCategory === 'trikona' ? 'active' : ''}"
                data-category="trikona" onclick="highlightHouseCategory('trikona')" title="TRIKONA (Trines): Houses 1,5,9 — The dharma houses: Purpose, Creativity, Fortune. Most auspicious positions bringing luck and blessings.">Trikona</button>
        <button class="chart-toolbar-btn ${ChartFeatures.highlightCategory === 'dusthana' ? 'active' : ''}"
                data-category="dusthana" onclick="highlightHouseCategory('dusthana')" title="DUSTHANA (Challenges): Houses 6,8,12 — The difficult houses: Obstacles, Transformation, Losses. Areas requiring growth and surrender.">Dusthana</button>
      </div>

      <div class="chart-toolbar-divider"></div>

      <!-- Feature Toggles -->
      <div class="chart-toolbar-group">
        <button class="chart-toolbar-btn" onclick="toggleSymbolsOnly(!ChartFeatures.symbolsOnly)" title="Glyphs only (S)">
          ${ChartFeatures.symbolsOnly ? '☉' : 'Aa'}
        </button>
        <button class="chart-toolbar-btn" onclick="toggleAudioMode(!ChartFeatures.audioEnabled)" title="Audio mode">
          ${ChartFeatures.audioEnabled ? '🔊' : '🔇'}
        </button>
        <button class="chart-toolbar-btn" onclick="toggleSilentMode(!ChartFeatures.silentMode)" title="Sacred mode (M)">
          🕯
        </button>
      </div>

      <div class="chart-toolbar-divider"></div>

      <!-- Teach Mode -->
      <button class="teach-me-btn" onclick="startTeachMode()">
        <span>✦</span>
        <span>Teach Me</span>
      </button>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════
// ENHANCED CHART — Immersive, Teaching, Stunning
// ═══════════════════════════════════════════════════════════════════════════

function renderEnhancedChart() {
  if (!chartData || !chartData.planets) {
    return `
      <div class="chart-empty">
        <div class="chart-empty-glyph">✦</div>
        <h3>Your Chart Awaits</h3>
        <p>Enter birth details to reveal your cosmic blueprint</p>
        <button onclick="document.getElementById('sanctum').classList.add('hidden'); document.getElementById('threshold').classList.remove('hidden');" class="chart-empty-btn">
          Begin
        </button>
      </div>
    `;
  }

  const c = chartData;
  const moon = c.planets.find(p => p.name === 'Moon');
  const dashaPlanet = c.dasha?.maha?.planet || 'Saturn';
  const highlightClass = ChartFeatures.highlightCategory || '';
  const sacredClass = ChartFeatures.silentMode ? 'chart-sacred' : '';

  // Get the Sanskrit mantra for current dasha
  const mantras = {
    Sun: 'ॐ सूर्याय नमः',
    Moon: 'ॐ चन्द्राय नमः',
    Mars: 'ॐ मङ्गलाय नमः',
    Mercury: 'ॐ बुधाय नमः',
    Jupiter: 'ॐ गुरवे नमः',
    Venus: 'ॐ शुक्राय नमः',
    Saturn: 'ॐ शनैश्चराय नमः',
    Rahu: 'ॐ राहवे नमः',
    Ketu: 'ॐ केतवे नमः'
  };

  return `
    <div class="chart-immersive ${sacredClass}">

      ${ChartFeatures.silentMode ? `
        <div class="sacred-header">
          <div class="sacred-mantra">${mantras[dashaPlanet] || 'ॐ'}</div>
          <div class="sacred-subtitle">Breathe. Observe. Receive.</div>
        </div>
      ` : `
        <div class="chart-header">
          <h2 class="chart-title">Your Rāśi Chart</h2>
          <p class="chart-subtitle">Click any house to learn its meaning</p>
        </div>
      `}

      <!-- THE CHART — Large, commanding, beautiful -->
      <div class="chart-container">
        <div id="chart-main-container" class="chart-grid-wrapper ${highlightClass}">
          ${renderLargeSquareChart()}
        </div>
      </div>

      ${!ChartFeatures.silentMode ? `
        <!-- ESSENCE — Key information -->
        <div class="chart-essence">
          <div class="essence-card" onclick="showHouseModal(1)">
            <span class="essence-glyph">${SIGN_GLYPHS[c.lagna]}</span>
            <span class="essence-name">${SIGNS[c.lagna]}</span>
            <span class="essence-role">Ascendant</span>
          </div>
          <div class="essence-card" onclick="showPlanetModal('Moon')">
            <span class="essence-glyph">☽</span>
            <span class="essence-name">${moon ? SIGNS[moon.sign] : ''}</span>
            <span class="essence-role">Moon Sign</span>
          </div>
          <div class="essence-card" onclick="showPlanetModal('${dashaPlanet}')">
            <span class="essence-glyph">${P_GLYPHS[dashaPlanet] || '✦'}</span>
            <span class="essence-name">${dashaPlanet}</span>
            <span class="essence-role">Current Dasha</span>
          </div>
        </div>

        <!-- HOUSE CATEGORIES -->
        <div class="category-section">
          <div class="category-label">Highlight house groups:</div>
          <div class="category-buttons">
            <button class="category-btn ${ChartFeatures.highlightCategory === 'kendra' ? 'active kendra' : ''}"
                    onclick="window.applyChartFilter('kendra')">
              <span class="cat-name">Kendra</span>
              <span class="cat-desc">The Pillars (1,4,7,10)</span>
            </button>
            <button class="category-btn ${ChartFeatures.highlightCategory === 'trikona' ? 'active trikona' : ''}"
                    onclick="window.applyChartFilter('trikona')">
              <span class="cat-name">Trikona</span>
              <span class="cat-desc">Fortune (1,5,9)</span>
            </button>
            <button class="category-btn ${ChartFeatures.highlightCategory === 'dusthana' ? 'active dusthana' : ''}"
                    onclick="window.applyChartFilter('dusthana')">
              <span class="cat-name">Dusthana</span>
              <span class="cat-desc">Challenges (6,8,12)</span>
            </button>
          </div>
          ${ChartFeatures.highlightCategory ? `
            <div class="category-explanation">
              ${ChartFeatures.highlightCategory === 'kendra' ?
                'Kendra houses are the four pillars supporting your life. Planets here manifest strongly in the world.' :
                ChartFeatures.highlightCategory === 'trikona' ?
                'Trikona houses bring dharma, luck, and divine grace. The most auspicious positions for benefics.' :
                'Dusthana houses teach through challenge. They transform weakness into wisdom.'}
            </div>
          ` : ''}
        </div>

        <!-- ACTIONS -->
        <div class="chart-footer">
          <button class="footer-btn teach" onclick="startTeachMode()">
            <span>✦</span> Teach Me This Chart
          </button>
          <button class="footer-btn sacred" onclick="window.toggleSacredMode()">
            <span>☽</span> Enter Sacred Mode
          </button>
        </div>
      ` : `
        <!-- SACRED MODE FOOTER -->
        <div class="sacred-footer">
          <button class="sacred-exit" onclick="window.toggleSacredMode()">
            Return to Study
          </button>
        </div>
      `}

    </div>
  `;
}

// Large square chart with sign NAMES
function renderLargeSquareChart() {
  if (!chartData) return '<div>No chart data</div>';

  const c = chartData;
  const layout = [11,0,1,2,10,null,null,3,9,null,null,4,8,7,6,5];

  let cells = layout.map((signOffset) => {
    if (signOffset === null) {
      return '<div class="chart-cell empty"></div>';
    }

    const sign = (c.lagna + signOffset) % 12;
    const houseNum = signOffset + 1;
    const planetsHere = c.planets.filter(p => p.house === houseNum);
    const isLagna = signOffset === 0;
    const bhava = BHAVA_DETAILS ? BHAVA_DETAILS[houseNum] : null;

    const planetHtml = planetsHere.map(p => {
      let dignityClass = p.exalted ? ' exalted' : p.debilitated ? ' debilitated' : '';
      let retroMark = p.retro ? '<span class="retro-mark">℞</span>' : '';
      return `<span class="planet-badge${dignityClass}${p.isAK ? ' atmakaraka' : ''}"
                   onclick="event.stopPropagation(); showPlanetModal('${p.name}')"
                   title="${p.name}${p.retro ? ' (Retrograde)' : ''}${p.exalted ? ' — Exalted' : ''}${p.debilitated ? ' — Debilitated' : ''}">
                ${p.glyph}${retroMark}
              </span>`;
    }).join('');

    return `
      <div class="chart-cell${isLagna ? ' lagna' : ''}${planetsHere.length === 0 ? ' empty-house' : ''}"
           onclick="showHouseModal(${houseNum})"
           data-house="${houseNum}">
        <div class="cell-header">
          <span class="house-number">${houseNum}</span>
          <span class="sign-glyph">${SIGN_GLYPHS[sign]}</span>
        </div>
        <div class="sign-name">${SIGNS[sign]}</div>
        <div class="cell-planets">${planetHtml}</div>
        ${planetsHere.length === 0 && bhava ? `<div class="house-hint">${bhava.shortName || ''}</div>` : ''}
      </div>
    `;
  }).join('');

  return `<div class="chart-grid">${cells}</div>`;
}

// Toggle sacred mode and re-render
function toggleSacredMode() {
  ChartFeatures.silentMode = !ChartFeatures.silentMode;
  const contentArea = document.getElementById('content-area');
  if (contentArea && typeof window.renderEnhancedChart === 'function') {
    contentArea.innerHTML = window.renderEnhancedChart();
  }
}

window.toggleSacredMode = toggleSacredMode;

// Apply chart filter (Kendra, Trikona, Dusthana)
function applyChartFilter(category) {
  if (ChartFeatures.highlightCategory === category) {
    ChartFeatures.highlightCategory = null;
  } else {
    ChartFeatures.highlightCategory = category;
  }

  // Re-render chart section
  const contentArea = document.getElementById('content-area');
  if (contentArea && typeof window.renderEnhancedChart === 'function') {
    contentArea.innerHTML = window.renderEnhancedChart();
  }
}

window.applyChartFilter = applyChartFilter;

function renderChartInfoCards() {
  if (!chartData) return '';

  const c = chartData;
  const moon = c.planets.find(p => p.name === 'Moon');
  const sun = c.planets.find(p => p.name === 'Sun');
  const ak = c.planets.find(p => p.name === c.atmakaraka);
  const theme = DASHA_THEMES[c.dasha?.maha?.planet] || {};

  return `
    <div class="liquid-card" style="padding: 16px; text-align: center; cursor: pointer;"
         data-tooltip="house"
         onclick="showChartTooltip(event, 'house', 1); ChartFeatures.exploreHouse(1);"
         ondblclick="showPlanetModal('Ascendant')">
      <div style="font-size: 1.5rem; margin-bottom: 4px;">${SIGN_GLYPHS[c.lagna]}</div>
      <div style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted);">Rising (Rāśi)</div>
      <div style="font-size: 0.9rem; font-weight: 500; color: var(--prussian);">${SIGNS[c.lagna]}</div>
      <div style="font-size: 0.7rem; color: var(--text-muted);">${NAKSHATRAS[c.lagnaNakshatra]}</div>
    </div>
    <div class="liquid-card" style="padding: 16px; text-align: center; cursor: pointer;"
         data-tooltip="planet"
         onclick="showChartTooltip(event, 'planet', 'Moon'); ChartFeatures.explorePlanet('Moon');"
         ondblclick="showPlanetModal('Moon')">
      <div style="font-size: 1.5rem; margin-bottom: 4px;">☽</div>
      <div style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted);">Moon</div>
      <div style="font-size: 0.9rem; font-weight: 500; color: var(--prussian);">${moon ? SIGNS[moon.sign] : '—'}</div>
      <div style="font-size: 0.7rem; color: var(--text-muted);">${moon ? NAKSHATRAS[moon.nakshatra] : ''}</div>
    </div>
    <div class="liquid-card" style="padding: 16px; text-align: center; cursor: pointer;"
         data-tooltip="planet"
         onclick="showChartTooltip(event, 'planet', 'Sun'); ChartFeatures.explorePlanet('Sun');"
         ondblclick="showPlanetModal('Sun')">
      <div style="font-size: 1.5rem; margin-bottom: 4px;">☉</div>
      <div style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted);">Sun</div>
      <div style="font-size: 0.9rem; font-weight: 500; color: var(--prussian);">${sun ? SIGNS[sun.sign] : '—'}</div>
      <div style="font-size: 0.7rem; color: var(--text-muted);">${sun ? NAKSHATRAS[sun.nakshatra] : ''}</div>
    </div>
    <div class="liquid-card" style="padding: 16px; text-align: center; cursor: pointer;"
         data-tooltip="planet"
         onclick="showChartTooltip(event, 'planet', '${c.atmakaraka}'); ChartFeatures.explorePlanet('${c.atmakaraka}');"
         ondblclick="showPlanetModal('${c.atmakaraka}')">
      <div style="font-size: 1.5rem; margin-bottom: 4px;">${ak ? ak.glyph : '◉'}</div>
      <div style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted);">Ātmakāraka</div>
      <div style="font-size: 0.9rem; font-weight: 500; color: var(--prussian);">${c.atmakaraka}</div>
      <div style="font-size: 0.7rem; color: var(--text-muted);">${ak ? SIGNS[ak.sign] : ''}</div>
    </div>
    <div class="liquid-card" style="padding: 16px; text-align: center; grid-column: span 2;">
      <div style="font-size: 1.5rem; margin-bottom: 4px;">${P_GLYPHS[c.dasha?.maha?.planet] || '✦'}</div>
      <div style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted);">Current Dasha</div>
      <div style="font-size: 0.9rem; font-weight: 500; color: var(--prussian);">${c.dasha?.maha?.planet || '—'} Mahādashā</div>
      <div style="font-size: 0.7rem; color: var(--text-muted);">${theme.chapter || ''}</div>
    </div>
  `;
}

// Helper function to refresh chart
function refreshChart() {
  const container = document.getElementById('chart-main-container');
  if (container) {
    if (ChartFeatures.viewMode === 'wheel') {
      container.innerHTML = renderWheelChart();
    } else {
      container.innerHTML = renderSquareChart();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ENHANCED OVERVIEW CHART — Clean chart for bento card
// Fits inside the existing bento layout, click to explore
// ═══════════════════════════════════════════════════════════════════════════

function renderEnhancedOverviewChart() {
  if (!chartData) return '<div class="overview-placeholder">Generate your chart to see overview</div>';

  const c = chartData;
  const layout = [11,0,1,2,10,null,null,3,9,null,null,4,8,7,6,5];

  return `
    <div class="overview-chart-grid">
      ${layout.map((signOffset) => {
        if (signOffset === null) {
          return '<div class="overview-cell empty"></div>';
        }
        const sign = (c.lagna + signOffset) % 12;
        const houseNum = signOffset + 1;
        const planetsHere = c.planets.filter(p => p.house === houseNum);
        const isLagna = signOffset === 0;

        return `
          <div class="overview-cell${isLagna ? ' lagna' : ''}"
               onclick="showHouseModal(${houseNum})">
            <div class="ov-header">
              <span class="ov-house">${houseNum}</span>
              <span class="ov-glyph">${SIGN_GLYPHS[sign]}</span>
            </div>
            <div class="ov-sign">${SIGNS[sign]}</div>
            <div class="ov-planets">
              ${planetsHere.map(p => {
                let dignityClass = p.exalted ? ' exalted' : p.debilitated ? ' debilitated' : '';
                return `<span class="ov-planet${dignityClass}"
                             onclick="event.stopPropagation(); showPlanetModal('${p.name}')"
                             title="${p.name}">${p.glyph}</span>`;
              }).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
    <div style="text-align: center; margin-top: 20px;">
      <button onclick="showSection('chart')" class="overview-explore-btn">
        Explore Full Chart →
      </button>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION & GLOBAL EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ChartFeatures.init());
} else {
  ChartFeatures.init();
}

// Export functions to window for onclick handlers
window.ChartFeatures = ChartFeatures;
window.toggleChartView = toggleChartView;
window.renderSquareChart = renderSquareChart;
window.renderWheelChart = renderWheelChart;
window.showChartTooltip = showChartTooltip;
window.hideChartTooltip = hideChartTooltip;
window.showAspects = showAspects;
window.hideAspects = hideAspects;
window.startTeachMode = startTeachMode;
window.nextTeachStep = nextTeachStep;
window.prevTeachStep = prevTeachStep;
window.endTeachMode = endTeachMode;
window.showHouseLordTrace = showHouseLordTrace;
window.toggleNakshatraLayer = toggleNakshatraLayer;
window.highlightHouseCategory = highlightHouseCategory;
window.toggleSymbolsOnly = toggleSymbolsOnly;
window.toggleAudioMode = toggleAudioMode;
window.speakPlanetInfo = speakPlanetInfo;
window.toggleSilentMode = toggleSilentMode;
window.enterFocusMode = enterFocusMode;
window.exitFocusMode = exitFocusMode;
window.toggleProgressiveMode = toggleProgressiveMode;
window.revealNextHouse = revealNextHouse;
window.refreshChart = refreshChart;
window.renderEnhancedChart = renderEnhancedChart;
window.renderEnhancedOverviewChart = renderEnhancedOverviewChart;
window.renderChartToolbar = renderChartToolbar;
window.renderProgressTracker = renderProgressTracker;

console.log('✦ JYOTI Chart Features loaded — 20 Revolutionary Improvements');
