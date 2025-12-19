/* ═══════════════════════════════════════════════════════════════════════════
   JYOTI — Main Application Logic
   Auto-extracted from jyoti-v10_8-fixed.html lines 6080-15085
   Depends on: constants.js, content.js (loaded before this file)
   ═══════════════════════════════════════════════════════════════════════════ */

// NOTE: SIGNS, NAKSHATRAS, PLANETS, DIGNITIES, GRAHA_DETAILS now in js/constants.js
// NOTE: BHAVA_DETAILS, DASHA_THEMES, GLOSSARY, HOUSE_COLORS, PLANET_COLORS now in data/content.js

// ════════════════════════════════════════════════════════════════════════════
// JYOTI v9.0 — SOPHISTICATED DESIGN SYSTEM
// Version: 10.0.0 (Dec 15, 2025) - 10 Premium Design Features
console.log('🔮 JYOTI v10.0.0 loaded - 10 Sophisticated Design Features');
window.jyotiLoaded = true; // Mark as loaded

// Wrap in async IIFE for await support
(async function() {
// ════════════════════════════════════════════════════════════════════════════
// EPHEMERIS ENGINE — Swiss Ephemeris (Primary) + Astronomy Engine (Fallback)
// ════════════════════════════════════════════════════════════════════════════

// Update loading text immediately
const loadingTextEl = document.getElementById('loading-text');
if (loadingTextEl) loadingTextEl.textContent = 'Initializing Swiss Ephemeris...';

// Ephemeris state
let swissEphemeris = null;
let astronomyEngine = null;
let ephemerisSource = 'none';
let ephemerisReady = false;

// Swiss Ephemeris CDN sources (tried in order) - using GitHub for browser WASM compatibility
const SWISS_EPHEMERIS_SOURCES = [
  {
    name: 'swisseph-wasm-github',
    url: 'https://cdn.jsdelivr.net/gh/prolaxu/swisseph-wasm@main/src/swisseph.js',
    type: 'esm',
    initMethod: 'class' // new SwissEph() then initSwissEph()
  }
];

// Quiet mode for ephemeris loading - suppress warnings
const EPHEMERIS_QUIET_MODE = true;

// Known test values for self-verification (Sun longitude on Jan 1, 2000, 12:00 UT)
const TEST_VALUES = {
  julianDay: 2451545.0, // J2000.0 epoch
  sunTropical: 280.46, // Sun tropical longitude (degrees) ± 0.5°
  moonTropical: 218.32, // Moon tropical longitude (degrees) ± 1°
  tolerance: 1.5 // degrees tolerance for self-test
};

// Load script dynamically
async function loadScript(url, type = 'script') {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Script load timeout'));
    }, 10000); // 10 second timeout
    
    if (type === 'esm') {
      // Dynamic ESM import
      import(url)
        .then(module => {
          clearTimeout(timeout);
          resolve(module);
        })
        .catch(err => {
          clearTimeout(timeout);
          reject(err);
        });
    } else {
      // Regular script tag
      const script = document.createElement('script');
      script.src = url;
      script.type = type === 'module' ? 'module' : 'text/javascript';
      script.onload = () => {
        clearTimeout(timeout);
        resolve(window.SwissEph || window.sweph || window);
      };
      script.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(`Failed to load: ${url}`));
      };
      document.head.appendChild(script);
    }
  });
}

// Self-test ephemeris calculations
async function selfTestEphemeris(swe, sourceName) {
  try {
    // Test Julian Day calculation - handle different API styles
    let jd = null;
    
    if (typeof swe.julday === 'function') {
      jd = swe.julday(2000, 1, 1, 12.0);
    } else if (typeof swe.swe_julday === 'function') {
      jd = swe.swe_julday(2000, 1, 1, 12.0, 1);
    }
    
    if (!jd || Math.abs(jd - TEST_VALUES.julianDay) > 0.01) {
      throw new Error(`Julian day mismatch: got ${jd}, expected ${TEST_VALUES.julianDay}`);
    }
    
    // Test Sun position - handle different API styles
    let sunLon = null;
    
    if (typeof swe.calc_ut === 'function') {
      // prolaxu style: swe.calc_ut(jd, swe.SE_SUN, swe.SEFLG_SWIEPH)
      const SE_SUN = swe.SE_SUN || 0;
      const FLAG = swe.SEFLG_SWIEPH || swe.SEFLG_SPEED || 256;
      const sunResult = swe.calc_ut(jd, SE_SUN, FLAG);
      sunLon = Array.isArray(sunResult) ? sunResult[0] : (sunResult?.longitude || sunResult?.lon);
    } else if (typeof swe.swe_calc_ut === 'function') {
      const sunResult = swe.swe_calc_ut(jd, 0, 256);
      sunLon = Array.isArray(sunResult) ? sunResult[0] : (sunResult?.longitude || sunResult?.lon);
    }
    
    // Validate Sun position (allow wider tolerance for different ephemeris versions)
    if (sunLon !== null) {
      const diff = Math.abs(sunLon - TEST_VALUES.sunTropical);
      if (diff > 2.0) { // 2 degree tolerance
        throw new Error(`Sun position mismatch: got ${sunLon?.toFixed(2)}°, expected ~${TEST_VALUES.sunTropical}°`);
      }
    }
    
    console.log(`✓ Swiss Ephemeris self-test passed (${sourceName}): JD=${jd?.toFixed(2)}, Sun=${sunLon?.toFixed(2)}°`);
    return true;
  } catch (e) {
    console.warn(`✗ Swiss Ephemeris self-test failed (${sourceName}):`, e.message);
    return false;
  }
}

// Try to initialize Swiss Ephemeris from multiple sources
async function initSwissEphemeris() {
  const maxRetries = 2;
  
  for (const source of SWISS_EPHEMERIS_SOURCES) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (loadingTextEl) {
          loadingTextEl.textContent = `Trying ${source.name} (attempt ${attempt}/${maxRetries})...`;
        }
        
        if (!EPHEMERIS_QUIET_MODE) console.log(`Attempting Swiss Ephemeris: ${source.name} (attempt ${attempt})`);
        
        const module = await loadScript(source.url, source.type);
        
        // Initialize the module based on its init method
        let swe = null;
        
        if (source.initMethod === 'class') {
          // prolaxu/swisseph-wasm style: new SwissEph() then initSwissEph()
          const SwissEph = module.default || module;
          swe = new SwissEph();
          if (typeof swe.initSwissEph === 'function') {
            await swe.initSwissEph();
          }
        } else if (source.initMethod === 'init') {
          // ptprashanttripathi/sweph-wasm style: SwissEPH.init()
          const SwissEPH = module.default || module;
          if (typeof SwissEPH.init === 'function') {
            swe = await SwissEPH.init();
          } else {
            swe = SwissEPH;
          }
        } else {
          // Generic initialization
          swe = module.default || module;
          if (typeof swe.init === 'function') {
            swe = await swe.init();
          }
          if (typeof swe.initialize === 'function') {
            await swe.initialize();
          }
        }
        
        if (!swe) {
          throw new Error('Failed to initialize Swiss Ephemeris instance');
        }
        
        // Self-test the ephemeris
        const testPassed = await selfTestEphemeris(swe, source.name);
        
        if (testPassed) {
          swissEphemeris = swe;
          ephemerisSource = source.name;
          console.log(`✓ Swiss Ephemeris loaded from ${source.name}`);
          return true;
        }
      } catch (e) {
        if (!EPHEMERIS_QUIET_MODE) {
          console.warn(`Swiss Ephemeris ${source.name} attempt ${attempt} failed:`, e.message);
        }
        // Wait before retry
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
  }
  
  return false;
}

// Search for alternative Swiss Ephemeris sources dynamically
async function searchAlternativeSources() {
  // Additional sources to try
  const alternativeSources = [
    {
      url: 'https://cdn.jsdelivr.net/gh/prolaxu/swisseph-wasm@main/src/swisseph.js',
      initMethod: 'class'
    },
    {
      url: 'https://unpkg.com/swisseph-wasm@0.0.2/src/swisseph.js',
      initMethod: 'class'
    }
  ];
  
  for (const source of alternativeSources) {
    try {
      if (!EPHEMERIS_QUIET_MODE) console.log('Trying alternative source:', source.url);
      const module = await loadScript(source.url, 'esm');
      
      let swe = null;
      if (source.initMethod === 'class') {
        const SwissEph = module.default || module;
        swe = new SwissEph();
        if (typeof swe.initSwissEph === 'function') {
          await swe.initSwissEph();
        }
      } else {
        swe = module.default || module;
        if (typeof swe.init === 'function') swe = await swe.init();
      }
      
      if (swe) {
        const testPassed = await selfTestEphemeris(swe, source.url);
        if (testPassed) {
          swissEphemeris = swe;
          ephemerisSource = 'swiss-ephemeris';
          console.log('✓ Swiss Ephemeris loaded (professional-grade accuracy)');
          return true;
        }
      }
    } catch (e) {
      if (!EPHEMERIS_QUIET_MODE) console.warn('Alternative source failed:', source.url);
    }
  }
  
  return false;
}

// Initialize Astronomy Engine as fallback
async function initAstronomyEngine() {
  try {
    if (loadingTextEl) {
      loadingTextEl.textContent = 'Loading Astronomy Engine (fallback)...';
    }
    
    const module = await import('https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/+esm');
    astronomyEngine = module;
    ephemerisSource = 'astronomy-engine';
    console.log('✓ Astronomy Engine loaded (fallback)');
    return true;
  } catch (e) {
    console.error('Failed to load Astronomy Engine:', e);
    return false;
  }
}

// Main ephemeris initialization
async function initEphemeris() {
  console.log('═══════════════════════════════════════════════════════════');
  if (!EPHEMERIS_QUIET_MODE) {
    console.log('JYOTI Ephemeris Initialization');
    console.log('═══════════════════════════════════════════════════════════');
  }
  
  // Try Swiss Ephemeris first (more accurate: 0.001 arcseconds)
  let success = await initSwissEphemeris();
  
  // If failed, search for alternatives
  if (!success) {
    if (!EPHEMERIS_QUIET_MODE) console.log('Trying alternative Swiss Ephemeris sources...');
    success = await searchAlternativeSources();
  }
  
  // If still failed, fall back to Astronomy Engine (still very accurate: ~1 arcminute)
  if (!success) {
    success = await initAstronomyEngine();
  }
  
  if (success) {
    ephemerisReady = true;
    if (loadingTextEl) {
      const icon = ephemerisSource.includes('swiss') || ephemerisSource.includes('sweph') ? '🔬' : '✓';
      loadingTextEl.textContent = `${icon} ${ephemerisSource} ready`;
    }
    console.log(`✓ Ephemeris ready: ${ephemerisSource}`);
  } else {
    if (loadingTextEl) {
      loadingTextEl.textContent = '⚠️ Ephemeris initialization failed';
    }
    console.error('All ephemeris sources failed!');
  }
  
  return success;
}

// Start initialization immediately
const ephemerisInitPromise = initEphemeris();

// Also keep Astronomy as a reference for compatibility
let Astronomy = null;
import('https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/+esm')
  .then(mod => {
    Astronomy = mod;
    astronomyEngine = mod;
  })
  .catch(() => {});

// ════════════════════════════════════════════════════════════════════════════
// THEME SYSTEM — Dark/Light Mode
// ════════════════════════════════════════════════════════════════════════════

let currentTheme = 'light';
try {
  currentTheme = localStorage.getItem('jyoti_theme') || 'light';
} catch (e) {
  console.warn('localStorage not available, using default theme');
}

function initTheme() {
  document.documentElement.setAttribute('data-theme', currentTheme);
  updateThemeIcon();
}

window.toggleTheme = function() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);
  localStorage.setItem('jyoti_theme', currentTheme);
  updateThemeIcon();
  
  // Smooth transition
  document.body.style.transition = 'background 0.5s ease, color 0.5s ease';
  setTimeout(() => document.body.style.transition = '', 500);
};

function updateThemeIcon() {
  const icon = document.getElementById('theme-icon');
  if (icon) {
    icon.textContent = currentTheme === 'light' ? '🌙' : '☀️';
    icon.style.animation = 'none';
    icon.offsetHeight; // Trigger reflow
    icon.style.animation = 'rotateIn 0.4s ease forwards';
  }
}

// Update ambient background based on current Dasha period
function updateDashaAmbient(dashaLord) {
  const ambient = document.getElementById('dasha-ambient');
  if (!ambient) return;
  
  // Remove all planet classes
  const planets = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];
  planets.forEach(p => ambient.classList.remove(p));
  
  // Add the current dasha planet class
  if (dashaLord) {
    const planet = dashaLord.toLowerCase();
    if (planets.includes(planet)) {
      ambient.classList.add(planet);
    }
  }
}

// Initialize theme on load
initTheme();

// ════════════════════════════════════════════════════════════════════════════
// COSMIC BACKGROUND — DISABLED for pure zen aesthetic
// ════════════════════════════════════════════════════════════════════════════

// All cosmic elements (stars, particles, shooting stars) are hidden via CSS
// for a cleaner, more sophisticated experience

// ════════════════════════════════════════════════════════════════════════════
// SOPHISTICATED DESIGN SYSTEM — JavaScript
// ════════════════════════════════════════════════════════════════════════════

// Planet frequencies for sound signatures (Hz based on planetary frequencies)
const PLANET_FREQUENCIES = {
  Sun: 126.22,      // Solar frequency
  Moon: 210.42,     // Lunar frequency
  Mars: 144.72,     // Mars frequency
  Mercury: 141.27,  // Mercury frequency
  Jupiter: 183.58,  // Jupiter frequency
  Venus: 221.23,    // Venus frequency
  Saturn: 147.85,   // Saturn frequency
  Rahu: 170.00,     // Deep mysterious
  Ketu: 190.00      // Ethereal
};

// Planet Sanskrit names
const PLANET_SANSKRIT = {
  Sun: 'सूर्य',
  Moon: 'चन्द्र',
  Mars: 'मंगल',
  Mercury: 'बुध',
  Jupiter: 'गुरु',
  Venus: 'शुक्र',
  Saturn: 'शनि',
  Rahu: 'राहु',
  Ketu: 'केतु',
  Ascendant: 'लग्न'
};

// House themes for contextual highlighting
const HOUSE_THEMES = {
  1: { planets: ['Sun', 'Mars'], relatedHouses: [5, 9] },
  2: { planets: ['Venus', 'Jupiter'], relatedHouses: [6, 11] },
  3: { planets: ['Mercury', 'Mars'], relatedHouses: [6, 11] },
  4: { planets: ['Moon', 'Venus'], relatedHouses: [1, 7, 10] },
  5: { planets: ['Sun', 'Jupiter'], relatedHouses: [1, 9] },
  6: { planets: ['Mars', 'Saturn'], relatedHouses: [8, 12] },
  7: { planets: ['Venus', 'Jupiter'], relatedHouses: [1, 4, 10] },
  8: { planets: ['Saturn', 'Mars'], relatedHouses: [2, 6, 12] },
  9: { planets: ['Jupiter', 'Sun'], relatedHouses: [1, 5] },
  10: { planets: ['Saturn', 'Sun', 'Mars'], relatedHouses: [1, 4, 7] },
  11: { planets: ['Jupiter', 'Saturn'], relatedHouses: [2, 5, 9] },
  12: { planets: ['Ketu', 'Venus'], relatedHouses: [4, 8] }
};

// 1. ORBITAL PLANET WHEEL — Render planets in circular orbit with sound and highlighting
function renderOrbitalWheel(planets, container) {
  if (!planets || !container) return;
  
  const wheelHTML = `
    <div class="orbital-wheel">
      <div class="orbital-ring orbital-ring-1"></div>
      <div class="orbital-ring orbital-ring-2"></div>
      <div class="orbital-ring orbital-ring-3"></div>
      <div class="orbital-center">
        <span style="font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.15em; color: var(--gold);">ग्रह</span>
      </div>
      ${planets.map((planet, index) => {
        const angle = (planet.longitude || (index * 40)) * (Math.PI / 180);
        const radius = 42; // percentage from center
        const x = 50 + radius * Math.cos(angle - Math.PI/2);
        const y = 50 + radius * Math.sin(angle - Math.PI/2);
        const glyph = P_GLYPHS[planet.name] || planet.name[0];
        
        // Determine dignity class
        const dignityClass = planet.exalted ? 'exalted' : 
                            planet.debilitated ? 'debilitated' : '';
        
        return `
          <div class="orbital-planet contextual-glow ${dignityClass}" 
               style="left: calc(${x}% - 28px); top: calc(${y}% - 28px);"
               data-planet="${planet.name.toLowerCase()}"
               onclick="showPlanetModal('${planet.name}'); playPlanetTone('${planet.name}')"
               onmouseenter="highlightContext('${planet.name}'); playPlanetTone('${planet.name}')"
               onmouseleave="clearContextHighlights()">
            <span class="glyph breathing-glyph">${glyph}</span>
            <span class="name">${planet.name.substring(0, 3)}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
  
  container.innerHTML = wheelHTML;
}

// 2. LIQUID METAL CARDS — Apply 3D tilt effect
function initLiquidCards() {
  document.querySelectorAll('.liquid-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = (y - centerY) / 20;
      const rotateY = (centerX - x) / 20;
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)';
    });
  });
}

// 4. DIGNITY SPECTRUM — Calculate position on spectrum
function getDignityPosition(dignity) {
  const positions = {
    'Exalted': 100,
    'Moolatrikona': 90,
    'Own Sign': 80,
    'Great Friend': 70,
    'Friend': 60,
    'Neutral': 50,
    'Enemy': 30,
    'Great Enemy': 15,
    'Debilitated': 0
  };
  return positions[dignity] || 50;
}

function renderDignitySpectrum(dignity) {
  const position = getDignityPosition(dignity);
  return `
    <div class="dignity-spectrum">
      <div class="dignity-marker" style="left: ${position}%;"></div>
    </div>
    <div class="dignity-labels">
      <span>Debilitated</span>
      <span>Neutral</span>
      <span>Exalted</span>
    </div>
  `;
}

// 5. HOUSE WHEEL NAVIGATION — Show/hide and handle clicks
let houseWheelVisible = false;

function showHouseWheel() {
  let wheel = document.querySelector('.house-wheel-nav');
  if (!wheel) {
    wheel = document.createElement('div');
    wheel.className = 'house-wheel-nav';
    wheel.innerHTML = Array.from({length: 12}, (_, i) => 
      `<button class="house-wheel-segment" data-house="${i+1}" onclick="scrollToHouse(${i+1})">${i+1}</button>`
    ).join('');
    document.body.appendChild(wheel);
  }
  wheel.classList.add('visible');
  houseWheelVisible = true;
}

function hideHouseWheel() {
  const wheel = document.querySelector('.house-wheel-nav');
  if (wheel) wheel.classList.remove('visible');
  houseWheelVisible = false;
}

function highlightHouseSegment(houseNum) {
  document.querySelectorAll('.house-wheel-segment').forEach(seg => {
    seg.classList.remove('active', 'highlighted');
    if (parseInt(seg.dataset.house) === houseNum) {
      seg.classList.add('active');
    }
  });
  
  // Highlight related houses
  const theme = HOUSE_THEMES[houseNum];
  if (theme) {
    theme.relatedHouses.forEach(h => {
      const seg = document.querySelector(`.house-wheel-segment[data-house="${h}"]`);
      if (seg) seg.classList.add('highlighted');
    });
  }
}

function scrollToHouse(houseNum) {
  const houseEl = document.querySelector(`[data-house="${houseNum}"]`);
  if (houseEl) {
    houseEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    highlightHouseSegment(houseNum);
  }
}

// 7. SOUND SIGNATURES — Play unique tone per planet
function playPlanetTone(planetName) {
  if (!soundEnabled || !audioContext) return;
  
  const freq = PLANET_FREQUENCIES[planetName] || 200;
  
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  
  osc.connect(gain);
  gain.connect(audioContext.destination);
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, audioContext.currentTime);
  
  gain.gain.setValueAtTime(0, audioContext.currentTime);
  gain.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1.5);
  
  osc.start();
  osc.stop(audioContext.currentTime + 1.5);
}

// 8. BREATHING DATA — Initialize alive numbers
function initBreathingData() {
  document.querySelectorAll('.degree-value, .position-value').forEach(el => {
    el.classList.add('breathing-degree');
  });
}

// 9. CONTEXTUAL DEPTH — Highlight related elements
function highlightContext(planetName) {
  // Clear previous highlights
  document.querySelectorAll('.context-highlight').forEach(el => {
    el.classList.remove('related', 'primary');
  });
  
  // Find planet's houses
  if (chartData && chartData.planets) {
    const planet = chartData.planets.find(p => p.name === planetName);
    if (planet && planet.house) {
      const houseNum = planet.house;
      const theme = HOUSE_THEMES[houseNum];
      
      // Highlight primary house
      const primaryHouse = document.querySelector(`[data-house="${houseNum}"]`);
      if (primaryHouse) primaryHouse.classList.add('primary');
      
      // Highlight related houses
      if (theme) {
        theme.relatedHouses.forEach(h => {
          const el = document.querySelector(`[data-house="${h}"]`);
          if (el) el.classList.add('related');
        });
      }
    }
  }
}

function clearContextHighlights() {
  document.querySelectorAll('.context-highlight').forEach(el => {
    el.classList.remove('related', 'primary');
  });
}

// 10. CINEMATIC TRANSITIONS — Enhanced section switching
function cinematicTransition(fromSection, toSection, callback) {
  const from = document.querySelector(fromSection);
  const to = document.querySelector(toSection);
  
  if (from) {
    from.classList.add('cinematic-exit');
    setTimeout(() => {
      from.classList.add('hidden');
      from.classList.remove('cinematic-exit');
    }, 300);
  }
  
  setTimeout(() => {
    if (to) {
      to.classList.remove('hidden');
      to.classList.add('cinematic-enter');
      
      // Trigger stagger animation for children
      const staggerContainer = to.querySelector('.stagger-children');
      if (staggerContainer) {
        setTimeout(() => staggerContainer.classList.add('revealed'), 100);
      }
      
      setTimeout(() => {
        to.classList.remove('cinematic-enter');
        if (callback) callback();
      }, 500);
    }
  }, 300);
}

// Initialize sophisticated design systems
function initSophisticatedDesign() {
  // Initialize liquid cards
  setTimeout(initLiquidCards, 500);
  
  // Initialize breathing data
  setTimeout(initBreathingData, 1000);
  
  // Add sound class to body when enabled
  if (soundEnabled) {
    document.body.classList.add('sound-enabled');
  }
  
  console.log('✨ Sophisticated Design System initialized');
}

// Call on load
setTimeout(initSophisticatedDesign, 100);

// ════════════════════════════════════════════════════════════════════════════
// AMBIENT SOUND SYSTEM — Cosmic Audio Experience
// ════════════════════════════════════════════════════════════════════════════

let soundEnabled = false;
let audioContext = null;
let ambientOscillator = null;
let gainNode = null;

// Initialize sound (user must interact first due to browser policies)
function initAudio() {
  if (audioContext) return;
  
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = audioContext.createGain();
    gainNode.gain.value = 0;
    gainNode.connect(audioContext.destination);
    
    // Create a gentle ambient drone
    ambientOscillator = audioContext.createOscillator();
    ambientOscillator.type = 'sine';
    ambientOscillator.frequency.value = 136.1; // Om frequency
    
    // Add gentle modulation
    const lfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();
    lfo.frequency.value = 0.1; // Very slow modulation
    lfoGain.gain.value = 5;
    lfo.connect(lfoGain);
    lfoGain.connect(ambientOscillator.frequency);
    
    ambientOscillator.connect(gainNode);
    ambientOscillator.start();
    lfo.start();
    
  } catch (e) {
    console.warn('Audio not available:', e);
  }
}

window.toggleSound = function() {
  initAudio();
  
  soundEnabled = !soundEnabled;
  const btn = document.getElementById('sound-toggle');
  const icon = document.getElementById('sound-icon');
  
  if (soundEnabled) {
    btn.classList.add('active');
    icon.textContent = '🔊';
    // Fade in
    if (gainNode) {
      gainNode.gain.setTargetAtTime(0.03, audioContext.currentTime, 0.5);
    }
  } else {
    btn.classList.remove('active');
    icon.textContent = '🔇';
    // Fade out
    if (gainNode) {
      gainNode.gain.setTargetAtTime(0, audioContext.currentTime, 0.3);
    }
  }
};

// Play a soft chime (for UI interactions)
function playChime(frequency = 528) {
  if (!soundEnabled || !audioContext) return;
  
  const osc = audioContext.createOscillator();
  const chimeGain = audioContext.createGain();
  
  osc.type = 'sine';
  osc.frequency.value = frequency;
  chimeGain.gain.value = 0.1;
  
  osc.connect(chimeGain);
  chimeGain.connect(audioContext.destination);
  
  osc.start();
  chimeGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1);
  osc.stop(audioContext.currentTime + 1);
}

// ════════════════════════════════════════════════════════════════════════════
// PLANET SOUND SIGNATURES — Unique tones per Graha
// ════════════════════════════════════════════════════════════════════════════

const planetSoundSignatures = {
  sun: { freq: 126.22, type: 'sine', duration: 0.8, name: 'Radiant' },        // D3 - majestic
  moon: { freq: 210.42, type: 'sine', duration: 1.2, name: 'Flowing' },       // G#3 - soothing
  mars: { freq: 144.72, type: 'square', duration: 0.4, name: 'Sharp' },       // D3 - aggressive
  mercury: { freq: 282.54, type: 'triangle', duration: 0.3, name: 'Quick' },  // C#4 - bright
  jupiter: { freq: 183.58, type: 'sine', duration: 1.5, name: 'Expansive' },  // F#3 - deep
  venus: { freq: 221.23, type: 'sine', duration: 1.0, name: 'Sweet' },        // A3 - harmonious
  saturn: { freq: 147.85, type: 'sawtooth', duration: 2.0, name: 'Grave' },   // D3 - heavy
  rahu: { freq: 171.0, type: 'triangle', duration: 0.6, name: 'Mysterious' }, // F3 - shadowy
  ketu: { freq: 207.65, type: 'sine', duration: 0.5, name: 'Ethereal' }       // G#3 - subtle
};

function playPlanetSound(planet) {
  if (!soundEnabled || !audioContext) return;
  
  const sig = planetSoundSignatures[planet.toLowerCase()];
  if (!sig) return;
  
  const osc = audioContext.createOscillator();
  const envGain = audioContext.createGain();
  
  osc.type = sig.type;
  osc.frequency.value = sig.freq;
  
  envGain.gain.setValueAtTime(0, audioContext.currentTime);
  envGain.gain.linearRampToValueAtTime(0.08, audioContext.currentTime + 0.05);
  envGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + sig.duration);
  
  osc.connect(envGain);
  envGain.connect(audioContext.destination);
  
  osc.start();
  osc.stop(audioContext.currentTime + sig.duration);
}

// ════════════════════════════════════════════════════════════════════════════
// CONTEXTUAL DEPTH — Highlight related elements
// ════════════════════════════════════════════════════════════════════════════

const planetHouseRulers = {
  sun: [5],       // Rules Leo (5th natural house)
  moon: [4],      // Rules Cancer (4th)
  mars: [1, 8],   // Rules Aries (1st), Scorpio (8th)
  mercury: [3, 6], // Rules Gemini (3rd), Virgo (6th)
  jupiter: [9, 12], // Rules Sagittarius (9th), Pisces (12th)
  venus: [2, 7],  // Rules Taurus (2nd), Libra (7th)
  saturn: [10, 11], // Rules Capricorn (10th), Aquarius (11th)
  rahu: [11],     // Co-rules Aquarius
  ketu: [8]       // Co-rules Scorpio
};

const planetRelationships = {
  sun: ['moon', 'mars', 'jupiter'],
  moon: ['sun', 'mercury'],
  mars: ['sun', 'moon', 'jupiter'],
  mercury: ['sun', 'venus'],
  jupiter: ['sun', 'moon', 'mars'],
  venus: ['mercury', 'saturn'],
  saturn: ['mercury', 'venus'],
  rahu: ['venus', 'saturn'],
  ketu: ['mars', 'jupiter']
};

function highlightRelatedElements(planetName) {
  const planet = planetName.toLowerCase();
  
  // Get related houses
  const relatedHouses = planetHouseRulers[planet] || [];
  
  // Get friendly planets
  const relatedPlanets = planetRelationships[planet] || [];
  
  // Highlight related house cells
  document.querySelectorAll('.chart-cell, .house-segment').forEach(cell => {
    const houseNum = parseInt(cell.dataset.house);
    if (relatedHouses.includes(houseNum)) {
      cell.classList.add('related');
    } else {
      cell.classList.add('dimmed');
    }
  });
  
  // Highlight related planets
  document.querySelectorAll('.orbital-planet, [data-planet]').forEach(el => {
    const pName = el.dataset.planet;
    if (pName === planet) {
      el.classList.add('active');
    } else if (relatedPlanets.includes(pName)) {
      el.classList.add('related');
    } else if (pName) {
      el.classList.add('dimmed');
    }
  });
}

function clearContextualHighlights() {
  document.querySelectorAll('.related, .dimmed, .contextual-glow.active').forEach(el => {
    el.classList.remove('related', 'dimmed', 'active');
  });
}

// ════════════════════════════════════════════════════════════════════════════
// HOUSE WHEEL NAVIGATION — Floating ring navigation
// ════════════════════════════════════════════════════════════════════════════

function createHouseWheelNav() {
  const existing = document.querySelector('.house-wheel-nav');
  if (existing) existing.remove();
  
  const nav = document.createElement('div');
  nav.className = 'house-wheel-nav';
  nav.innerHTML = Array.from({length: 12}, (_, i) => `
    <div class="house-segment" 
         data-house="${i + 1}" 
         onclick="scrollToHouse(${i + 1})"
         onmouseenter="highlightHouseSegment(${i + 1})"
         onmouseleave="clearContextualHighlights()">
      ${i + 1}
    </div>
  `).join('');
  
  document.body.appendChild(nav);
  return nav;
}

// ════════════════════════════════════════════════════════════════════════════
// DEEP LEARNING CONTENT — Educational Material
// ════════════════════════════════════════════════════════════════════════════

const JYOTI_LESSONS = {
  intro: {
    title: "What is Jyoti?",
    subtitle: "The Science of Light",
    content: `
      <p><strong>Jyoti</strong> (ज्योति) is Sanskrit for "light" — and <strong>Jyotish</strong> literally means "the science of light." It's the traditional Indian system of understanding cosmic patterns, dating back over 5,000 years.</p>
      
      <div class="lesson-callout">
        <h4>🌟 The Core Idea</h4>
        <p>At the moment you were born, the planets were in specific positions in the sky. These positions create a unique "cosmic fingerprint" — your birth chart. Jyotish reads this fingerprint to understand your nature, challenges, and opportunities.</p>
      </div>
      
      <h4>How is it Different from Western Astrology?</h4>
      <p>The main difference is the <strong>Zodiac system</strong>:</p>
      <ul>
        <li><strong>Western (Tropical):</strong> Fixed to the seasons. Spring always begins at 0° Aries.</li>
        <li><strong>Vedic (Sidereal):</strong> Fixed to the actual stars. Accounts for the Earth's wobble (precession).</li>
      </ul>
      <p>Currently, there's about a 24° difference between the two systems. So if Western astrology says you're a Taurus Sun, Vedic might say you're an Aries Sun!</p>
      
      <div class="lesson-example">
        <h4>💡 Real Example</h4>
        <p>Someone born on May 12th:</p>
        <ul>
          <li><strong>Western:</strong> Sun in Taurus (the Bull)</li>
          <li><strong>Vedic:</strong> Sun in Aries (the Ram) — exalted position!</li>
        </ul>
        <p>The Vedic position often reveals a completely different personality emphasis.</p>
      </div>
    `,
    nextLesson: "grahas"
  },
  
  grahas: {
    title: "The Nine Grahas",
    subtitle: "Cosmic Energies That Shape Your Life",
    content: `
      <p>In Jyotish, <strong>Graha</strong> (ग्रह) means "that which seizes" — because these cosmic forces "grab" our attention and pull us toward certain experiences.</p>
      
      <div class="lesson-callout">
        <h4>🌟 The Key Insight</h4>
        <p>Grahas are not just planets — they're archetypal energies. They represent fundamental patterns of human experience: the desire to shine (Sun), to nurture (Moon), to fight (Mars), to communicate (Mercury), to teach (Jupiter), to love (Venus), to discipline (Saturn), to obsess (Rahu), and to transcend (Ketu).</p>
      </div>
      
      <h4>The Nine Grahas at a Glance</h4>
      
      <div class="graha-grid">
        <div class="graha-mini">
          <span class="graha-symbol">☉</span>
          <strong>Sun (Sūrya)</strong>
          <p>Soul, ego, father, authority, vitality</p>
        </div>
        <div class="graha-mini">
          <span class="graha-symbol">☽</span>
          <strong>Moon (Chandra)</strong>
          <p>Mind, emotions, mother, nurturing</p>
        </div>
        <div class="graha-mini">
          <span class="graha-symbol">♂</span>
          <strong>Mars (Maṅgala)</strong>
          <p>Energy, courage, brothers, competition</p>
        </div>
        <div class="graha-mini">
          <span class="graha-symbol">☿</span>
          <strong>Mercury (Budha)</strong>
          <p>Intellect, communication, commerce</p>
        </div>
        <div class="graha-mini">
          <span class="graha-symbol">♃</span>
          <strong>Jupiter (Guru)</strong>
          <p>Wisdom, teachers, fortune, children</p>
        </div>
        <div class="graha-mini">
          <span class="graha-symbol">♀</span>
          <strong>Venus (Śukra)</strong>
          <p>Love, beauty, art, luxury</p>
        </div>
        <div class="graha-mini">
          <span class="graha-symbol">♄</span>
          <strong>Saturn (Śani)</strong>
          <p>Karma, time, discipline, structure</p>
        </div>
        <div class="graha-mini">
          <span class="graha-symbol">☊</span>
          <strong>Rahu (North Node)</strong>
          <p>Desires, obsessions, foreign things</p>
        </div>
        <div class="graha-mini">
          <span class="graha-symbol">☋</span>
          <strong>Ketu (South Node)</strong>
          <p>Liberation, past lives, spirituality</p>
        </div>
      </div>
      
      <div class="lesson-example">
        <h4>💡 How to Think About Dignity</h4>
        <p>Each planet is stronger in certain signs:</p>
        <ul>
          <li><strong>Exalted:</strong> Like being a CEO at your dream company — maximum power</li>
          <li><strong>Own Sign:</strong> Like being at home — comfortable and natural</li>
          <li><strong>Debilitated:</strong> Like a fish out of water — struggles to express</li>
        </ul>
        <p>Example: Sun is exalted in Aries (pure leadership energy), but debilitated in Libra (too focused on others' opinions).</p>
      </div>
    `,
    nextLesson: "bhavas"
  },
  
  bhavas: {
    title: "The Twelve Bhāvas",
    subtitle: "Life Arenas Where the Drama Unfolds",
    content: `
      <p><strong>Bhāva</strong> (भाव) means "house" or "state of being." The 12 houses divide life into 12 distinct arenas. Think of them as departments in the corporation of your life.</p>
      
      <div class="lesson-callout">
        <h4>🌟 The Key Insight</h4>
        <p>While Grahas are the actors, Bhāvas are the stages. A planet's house placement tells you WHERE in life its energy manifests. Mars in the 10th house expresses differently than Mars in the 4th house — same energy, different arena.</p>
      </div>
      
      <h4>The 12 Houses at a Glance</h4>
      
      <div class="house-grid">
        <div class="house-mini"><strong>1st — Lagna</strong><br>Self, body, personality</div>
        <div class="house-mini"><strong>2nd — Dhana</strong><br>Wealth, family, speech</div>
        <div class="house-mini"><strong>3rd — Sahaja</strong><br>Siblings, courage, skills</div>
        <div class="house-mini"><strong>4th — Sukha</strong><br>Home, mother, emotions</div>
        <div class="house-mini"><strong>5th — Putra</strong><br>Children, creativity, intelligence</div>
        <div class="house-mini"><strong>6th — Ari</strong><br>Enemies, health, service</div>
        <div class="house-mini"><strong>7th — Kāma</strong><br>Partnership, marriage, others</div>
        <div class="house-mini"><strong>8th — Āyu</strong><br>Transformation, hidden, occult</div>
        <div class="house-mini"><strong>9th — Dharma</strong><br>Fortune, father, philosophy</div>
        <div class="house-mini"><strong>10th — Karma</strong><br>Career, status, public image</div>
        <div class="house-mini"><strong>11th — Lābha</strong><br>Gains, friends, aspirations</div>
        <div class="house-mini"><strong>12th — Vyaya</strong><br>Loss, liberation, foreign lands</div>
      </div>
      
      <div class="lesson-example">
        <h4>💡 House Groupings</h4>
        <ul>
          <li><strong>Kendras (1, 4, 7, 10):</strong> Angular houses — pillars of life, strongest positions</li>
          <li><strong>Trikonas (1, 5, 9):</strong> Trines — dharma houses, most auspicious</li>
          <li><strong>Dusthānas (6, 8, 12):</strong> Difficult houses — challenges that promote growth</li>
          <li><strong>Upachayas (3, 6, 10, 11):</strong> Growing houses — improve with time</li>
        </ul>
      </div>
    `,
    nextLesson: "dashas"
  },
  
  dashas: {
    title: "Viṁśottarī Dasha",
    subtitle: "The Cosmic Timeline of Your Life",
    content: `
      <p>Unlike Western astrology which focuses heavily on transits, Jyotish uses a <strong>Dasha system</strong> — a cosmic timetable unique to your birth chart that tells you which planetary period you're in.</p>
      
      <div class="lesson-callout">
        <h4>🌟 The Key Insight</h4>
        <p>Your Moon's nakshatra (lunar mansion) at birth determines where you start in the cycle. Each planet gets its own ruling period, lasting from 6 to 20 years. During that period, that planet's themes dominate your life.</p>
      </div>
      
      <h4>The 120-Year Cycle</h4>
      <div class="dasha-cycle">
        <div class="dasha-item">Ketu — 7 years</div>
        <div class="dasha-item">Venus — 20 years</div>
        <div class="dasha-item">Sun — 6 years</div>
        <div class="dasha-item">Moon — 10 years</div>
        <div class="dasha-item">Mars — 7 years</div>
        <div class="dasha-item">Rahu — 18 years</div>
        <div class="dasha-item">Jupiter — 16 years</div>
        <div class="dasha-item">Saturn — 19 years</div>
        <div class="dasha-item">Mercury — 17 years</div>
      </div>
      
      <div class="lesson-example">
        <h4>💡 Real-Life Example</h4>
        <p>Imagine someone starting their <strong>Saturn Mahādashā</strong> (19 years):</p>
        <ul>
          <li>If Saturn is strong (exalted/own sign): Career advancement, building lasting structures, mastery through discipline</li>
          <li>If Saturn is weak (debilitated/afflicted): Delays, hard lessons, feeling restricted — but ultimately strengthening</li>
        </ul>
        <p>The planet's condition in your chart determines HOW its period unfolds.</p>
      </div>
      
      <h4>Sub-Periods (Bhukti)</h4>
      <p>Each major period is divided into sub-periods, following the same 9-planet sequence. So you might be in "Jupiter Mahādashā, Venus Bhukti" — Jupiter themes filtered through Venusian energy.</p>
    `,
    nextLesson: "reading"
  },
  
  reading: {
    title: "Reading Your Chart",
    subtitle: "Putting It All Together",
    content: `
      <p>Now you understand the building blocks. Let's see how to synthesize them into meaningful insights.</p>
      
      <div class="lesson-callout">
        <h4>🌟 The Three-Point Anchor</h4>
        <p>Every reading begins with three key reference points:</p>
        <ol>
          <li><strong>Lagna (Ascendant):</strong> Your overall life approach and physical constitution</li>
          <li><strong>Ātmakāraka:</strong> The planet with highest degree — your soul's primary desire</li>
          <li><strong>Current Dasha:</strong> What planetary period are you in right now?</li>
        </ol>
      </div>
      
      <h4>Step-by-Step Approach</h4>
      
      <div class="lesson-steps">
        <div class="step">
          <span class="step-num">1</span>
          <div>
            <strong>Note the Lagna sign and its lord</strong>
            <p>Where is the lord of your ascendant? Its condition colors your entire life experience.</p>
          </div>
        </div>
        <div class="step">
          <span class="step-num">2</span>
          <div>
            <strong>Check planetary dignities</strong>
            <p>Which planets are exalted, debilitated, or in own sign? These are your strongest/weakest players.</p>
          </div>
        </div>
        <div class="step">
          <span class="step-num">3</span>
          <div>
            <strong>Note house placements</strong>
            <p>Where are your planets positioned? This shows which life areas they activate.</p>
          </div>
        </div>
        <div class="step">
          <span class="step-num">4</span>
          <div>
            <strong>Check the current Dasha</strong>
            <p>Which planet rules this period? Its natal condition determines how the period unfolds.</p>
          </div>
        </div>
      </div>
      
      <div class="lesson-example">
        <h4>💡 The 70/30 Principle</h4>
        <p>~70% of life reflects <strong>Prarabdha Karma</strong> (patterns already in motion), while ~30% remains <strong>Kriyaman Karma</strong> (your response in this moment).</p>
        <p><em>The chart shows the weather. You choose how to dress.</em></p>
      </div>
    `,
    nextLesson: null
  }
};

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════


// [CONSTANTS BLOCK EXTRACTED TO js/constants.js]


// ════════════════════════════════════════════════════════════════════════════
// BEAUTIFUL MARKDOWN RENDERER FOR ORACLE RESPONSES
// Transforms AI markdown into stunning, readable HTML
// ════════════════════════════════════════════════════════════════════════════

function renderOracleResponse(text, question = '', summary = '', factors = []) {
  if (!text) return '';
  
  // Correct spelling in question
  const correctedQuestion = correctSpelling(question);
  
  // Detect truncation (response cut off mid-sentence)
  const isTruncated = detectTruncation(text);
  
  // Pre-process: Clean up any excessive whitespace
  let html = text.trim();
  
  // Extract chapters/sections for TOC (match #, ##, or ### headers)
  const chapterMatches = html.match(/^#{1,3} .+$/gm) || [];
  const chapters = chapterMatches.map((ch, idx) => {
    const title = ch.replace(/^#{1,3} /, '').trim();
    const id = `chapter-${idx + 1}`;
    return { title, id, num: idx + 1 };
  });
  
  // Convert markdown to HTML
  
  // Headers: #, ##, and ### - add IDs for navigation
  let chapterIdx = 0;
  
  // H1: # Header (main title - convert to styled h2)
  html = html.replace(/^# (.+)$/gm, (match, title) => {
    chapterIdx++;
    return `</div><div class="oracle-chapter oracle-chapter-main" id="chapter-${chapterIdx}"><span class="oracle-chapter-num">Overview</span><h2 class="oracle-title">${title}</h2>`;
  });
  
  // H2: ## Header (major sections)
  html = html.replace(/^## (.+)$/gm, (match, title) => {
    chapterIdx++;
    return `</div><div class="oracle-chapter" id="chapter-${chapterIdx}"><span class="oracle-chapter-num">Section ${chapterIdx}</span><h2>${title}</h2>`;
  });
  
  // H3: ### Header (subsections)
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  
  // H4: #### Header (minor headings)
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  
  // Remove first </div> and add opening wrapper
  if (html.startsWith('</div>')) {
    html = html.substring(6);
  }
  
  // Close last chapter if we have chapters
  if (chapterIdx > 0) {
    html += '</div>';
  }
  
  // Horizontal rules: --- or ___
  html = html.replace(/^[-_]{3,}$/gm, '<hr>');
  
  // Bold: **text** or __text__ (handle across lines too)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  
  // Italic: *text* or _text_ (but not inside bold or lists)
  html = html.replace(/(?<![*_])\*([^*\n]+)\*(?![*_])/g, '<em>$1</em>');
  html = html.replace(/(?<![*_])_([^_\n]+)_(?![*_])/g, '<em>$1</em>');
  
  // Inline code: `text`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Degree citations: Style planetary degrees specially
  html = html.replace(/(\d{1,2})°(\d{1,2})'?/g, '<span class="degree-citation">$1°$2\'</span>');
  
  // Blockquotes: > text
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/<\/blockquote>\n<blockquote>/g, '<br>');
  
  // Unordered lists: - item or * item
  html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);
  
  // Numbered lists: 1. item
  html = html.replace(/^\d+\. (.+)$/gm, '<oli>$1</oli>');
  html = html.replace(/(<oli>.*<\/oli>\n?)+/g, (match) => {
    const fixed = match.replace(/<\/?oli>/g, (m) => m === '<oli>' ? '<li>' : '</li>');
    return `<ol>${fixed}</ol>`;
  });
  
  // Paragraphs: Split by double newlines
  const blocks = html.split(/\n\n+/);
  html = blocks.map(block => {
    block = block.trim();
    if (/^<(h[1-6]|ul|ol|blockquote|hr|div|\/div|span)/.test(block)) {
      return block;
    }
    if (!block) return '';
    return `<p>${block.replace(/\n/g, '<br>')}</p>`;
  }).join('\n\n');
  
  // Clean up
  html = html.replace(/<p><p>/g, '<p>');
  html = html.replace(/<\/p><\/p>/g, '</p>');
  html = html.replace(/<p>\s*<\/p>/g, '');
  
  // Style special sections
  html = html.replace(/<h2>([^<]*(?:SYNTHESIS|SUMMARY|CONCLUSION|NEXT STEPS|REMEDIES)[^<]*)<\/h2>/gi, 
    '<div class="oracle-summary"><h3>$1</h3></div>');
  html = html.replace(/<h3>([^<]*(?:KEY|IMPORTANT|CRITICAL|TIMING)[^<]*)<\/h3>/gi,
    '<div class="oracle-highlight"><div class="oracle-highlight-title">$1</div></div>');
  
  // Build the complete output
  let output = '';
  
  // Question header (with spelling correction)
  if (correctedQuestion) {
    output += `
      <div class="oracle-question-header">
        <div class="oracle-question-label">Your Question</div>
        <div class="oracle-question-text">"${correctedQuestion}"</div>
      </div>
    `;
  }
  
  // Action buttons
  output += `
    <div class="oracle-actions">
      <button class="oracle-action-btn" onclick="copyOracleResponse()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        Copy Text
      </button>
      <button class="oracle-action-btn" onclick="printOracleResponse()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Print / PDF
      </button>
      <button class="oracle-action-btn" onclick="downloadOraclePDF()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3"/></svg>
        Export PDF
      </button>
    </div>
  `;
  
  // Executive Summary Card (if provided)
  if (summary) {
    output += `
      <div class="oracle-summary-card">
        <h3>✦ Executive Summary</h3>
        <p>${summary}</p>
        ${factors.length > 0 ? `
          <div class="oracle-key-factors">
            ${factors.map(f => `<span class="oracle-factor-tag">${f}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }
  
  // Table of contents (if we have chapters)
  if (chapters.length > 1) {
    output += `
      <div class="oracle-toc">
        <div class="oracle-toc-title">Contents</div>
        <div class="oracle-toc-list">
          ${chapters.map(ch => `
            <a class="oracle-toc-link" href="#${ch.id}" data-num="${ch.num}" onclick="event.preventDefault(); document.getElementById('${ch.id}').scrollIntoView({behavior: 'smooth'})">
              <span class="oracle-toc-link-text">${ch.title}</span>
            </a>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  // Main content
  output += `<div class="oracle-content">${html}</div>`;
  
  // Truncation warning
  if (isTruncated) {
    output += `
      <div class="oracle-truncation-warning">
        <span>⚠️</span>
        <p><strong>Response may be incomplete.</strong> The oracle's wisdom was cut short. Consider asking a more focused question or try again.</p>
      </div>
    `;
  }
  
  return output;
}

// Detect if response was truncated mid-sentence
function detectTruncation(text) {
  if (!text) return false;
  const trimmed = text.trim();
  
  // Check for common truncation indicators
  const truncationPatterns = [
    /[a-z,]\s*$/,           // Ends with lowercase letter or comma
    /\.\.\.\s*$/,           // Ends with ellipsis
    /—\s*$/,                // Ends with em dash
    /-\s*$/,                // Ends with hyphen
    /:\s*$/,                // Ends with colon (list about to start)
    /\*\*[^*]*$/,           // Unclosed bold
    /\*[^*]*$/,             // Unclosed italic
    /\([^)]*$/,             // Unclosed parenthesis
  ];
  
  for (const pattern of truncationPatterns) {
    if (pattern.test(trimmed)) return true;
  }
  
  // Check if ends with proper sentence terminator
  const properEndings = /[.!?]["']?\s*$/;
  if (!properEndings.test(trimmed)) return true;
  
  return false;
}

// Copy response to clipboard
window.copyOracleResponse = function() {
  const content = document.querySelector('.oracle-content');
  if (!content) return;
  
  // Get text content
  const text = content.innerText;
  navigator.clipboard.writeText(text).then(() => {
    alert('✓ Copied to clipboard!');
  }).catch(err => {
    console.error('Copy failed:', err);
  });
};

// Print response
window.printOracleResponse = function() {
  window.print();
};

// Download response as text file
window.downloadOracleResponse = function() {
  const content = document.querySelector('.oracle-content');
  const question = document.querySelector('.oracle-question-text');
  if (!content) return;
  
  let text = '';
  if (question) {
    text += 'QUESTION: ' + question.innerText + '\n\n';
    text += '='.repeat(60) + '\n\n';
  }
  text += 'JYOTI ORACLE RESPONSE\n';
  text += '='.repeat(60) + '\n\n';
  text += content.innerText;
  
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'jyoti-oracle-response.txt';
  a.click();
  URL.revokeObjectURL(url);
};

// Expose globally
window.renderOracleResponse = renderOracleResponse;

// ════════════════════════════════════════════════════════════════════════════
// RESPONSE ENHANCEMENT SYSTEM
// Spell correction, Summary generation, Key factors, Validation, PDF export
// ════════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════════
// SPIRITUAL LOADING MESSAGES — Patience quotes for long waits
// ════════════════════════════════════════════════════════════════════════════

const SPIRITUAL_LOADING_MESSAGES = [
  { quote: "Shraddha aur Saburi", translation: "Faith and Patience", source: "Shirdi Sai Baba" },
  { quote: "सब्र का फल मीठा होता है", translation: "The fruit of patience is sweet", source: "Ancient Wisdom" },
  { quote: "The stars move slowly, but they cross the sky", translation: null, source: "Sanskrit Proverb" },
  { quote: "Drushti so Srushti", translation: "As is your vision, so is your creation", source: "Vedantic Teaching" },
  { quote: "In the depth of winter, I found an invincible summer", translation: null, source: "Albert Camus" },
  { quote: "अंधेरे से ही सितारे दिखते हैं", translation: "Stars are visible only in darkness", source: "Hindi Proverb" },
  { quote: "The cosmos unfolds in its own time", translation: null, source: "Jyotish Wisdom" },
  { quote: "What is meant for you will not pass you by", translation: null, source: "Universal Truth" },
  { quote: "ॐ गं गणपतये नमः", translation: "Obstacles dissolve in divine timing", source: "Ganesha Mantra" },
  { quote: "The deeper the roots, the taller the tree", translation: null, source: "Nature's Teaching" },
  { quote: "Trust the wait. Embrace the uncertainty.", translation: null, source: "Contemplative Wisdom" },
  { quote: "कर्मण्येवाधिकारस्ते", translation: "Your right is to action alone", source: "Bhagavad Gita 2.47" },
];

let loadingMessageInterval = null;
let loadingStartTime = null;

function startLoadingMessages(outputElement) {
  loadingStartTime = Date.now();
  let messageIndex = 0;
  
  // Initial state
  updateLoadingDisplay(outputElement, null, 0);
  
  // Show first message after 8 seconds
  setTimeout(() => {
    if (loadingMessageInterval) { // Still loading
      const message = SPIRITUAL_LOADING_MESSAGES[messageIndex % SPIRITUAL_LOADING_MESSAGES.length];
      messageIndex++;
      updateLoadingDisplay(outputElement, message, 8);
    }
  }, 8000);
  
  // Rotate messages every 15 seconds after that
  loadingMessageInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - loadingStartTime) / 1000);
    const message = SPIRITUAL_LOADING_MESSAGES[messageIndex % SPIRITUAL_LOADING_MESSAGES.length];
    messageIndex++;
    
    updateLoadingDisplay(outputElement, message, elapsed);
  }, 15000); // 15 seconds
}

function updateLoadingDisplay(outputElement, message, elapsedSeconds) {
  const loadingDiv = outputElement.querySelector('.ai-loading');
  if (!loadingDiv) return;
  
  // Add elapsed time indicator after 8 seconds
  let timeText = '';
  if (elapsedSeconds >= 8) {
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    timeText = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  }
  
  // Build message HTML
  let messageHtml = '';
  if (message) {
    messageHtml = `
      <div class="loading-wisdom" style="margin-top: 20px; padding: 16px; background: var(--gold-soft); border-radius: 12px; border: 1px solid var(--gold); max-width: 320px; margin-left: auto; margin-right: auto;">
        <p style="font-family: var(--font-display); font-size: 1rem; color: var(--gold-dark); margin-bottom: 6px; font-style: italic;">"${message.quote}"</p>
        ${message.translation ? `<p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 8px;">${message.translation}</p>` : ''}
        <p style="font-size: 0.7rem; color: var(--gold); text-align: right;">— ${message.source}</p>
      </div>
    `;
  }
  
  // Check if we need to add the wisdom section
  const existingWisdom = loadingDiv.querySelector('.loading-wisdom');
  if (message && !existingWisdom) {
    loadingDiv.insertAdjacentHTML('beforeend', messageHtml);
  } else if (message && existingWisdom) {
    existingWisdom.outerHTML = messageHtml;
  }
  
  // Update time indicator after 8 seconds
  let timeIndicator = loadingDiv.querySelector('.loading-time');
  if (elapsedSeconds >= 8) {
    if (!timeIndicator) {
      const spinner = loadingDiv.querySelector('.spinner');
      if (spinner) {
        spinner.insertAdjacentHTML('afterend', `<p class="loading-time" style="font-size: 0.65rem; color: var(--text-muted); margin-top: 8px;">Deep contemplation... ${timeText}</p>`);
      }
    } else {
      timeIndicator.textContent = `Deep contemplation... ${timeText}`;
    }
  }
}

function stopLoadingMessages() {
  if (loadingMessageInterval) {
    clearInterval(loadingMessageInterval);
    loadingMessageInterval = null;
  }
  loadingStartTime = null;
}

// ════════════════════════════════════════════════════════════════════════════
// TIME FORMAT PARSER — Supports both European (14:00, 14.00) and US (2:00 PM)
// ════════════════════════════════════════════════════════════════════════════

function parseTimeInput(timeStr) {
  if (!timeStr) return null;
  
  const cleaned = timeStr.trim().toLowerCase();
  
  // Try different formats
  let hours = null, minutes = 0;
  
  // Format: 14:00 or 14.00 or 1400 (24-hour)
  let match = cleaned.match(/^(\d{1,2})[:.](\d{2})$/);
  if (match) {
    hours = parseInt(match[1], 10);
    minutes = parseInt(match[2], 10);
  }
  
  // Format: 1400 (military)
  if (!match) {
    match = cleaned.match(/^(\d{2})(\d{2})$/);
    if (match) {
      hours = parseInt(match[1], 10);
      minutes = parseInt(match[2], 10);
    }
  }
  
  // Format: 2pm, 2 pm, 2:00pm, 2:00 pm, 2.00pm, 2.00 pm, 2:00 p.m.
  if (!match) {
    match = cleaned.match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?m\.?|p\.?m\.?)$/);
    if (match) {
      hours = parseInt(match[1], 10);
      minutes = match[2] ? parseInt(match[2], 10) : 0;
      const isPM = match[3].startsWith('p');
      
      if (isPM && hours !== 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
    }
  }
  
  // Format: just a number like 14 or 2
  if (!match) {
    match = cleaned.match(/^(\d{1,2})$/);
    if (match) {
      hours = parseInt(match[1], 10);
      minutes = 0;
    }
  }
  
  // Validate
  if (hours === null || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  
  // Return standardized 24-hour format
  return {
    hours,
    minutes,
    formatted24: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
    formatted12: formatTime12(hours, minutes)
  };
}

function formatTime12(hours, minutes) {
  const isPM = hours >= 12;
  const displayHours = hours % 12 || 12;
  const minStr = minutes.toString().padStart(2, '0');
  return `${displayHours}:${minStr} ${isPM ? 'PM' : 'AM'}`;
}

// Expose globally
window.parseTimeInput = parseTimeInput;

// Common typo corrections (astrology-focused + general)
const SPELL_CORRECTIONS = {
  // Astrology terms
  'mahadasha': 'Mahādashā', 'mahadasa': 'Mahādashā', 'maha dasha': 'Mahādashā',
  'antardasha': 'Antardashā', 'antardasa': 'Antardashā',
  'atmakara': 'Ātmakāraka', 'atmakaraka': 'Ātmakāraka', 'atma karaka': 'Ātmakāraka',
  'nakshatra': 'nakshatra', 'nakshatras': 'nakshatras',
  'jyotish': 'Jyotish', 'jyotis': 'Jyotish',
  'rahu': 'Rahu', 'ketu': 'Ketu',
  'jupiter': 'Jupiter', 'saturn': 'Saturn', 'venus': 'Venus', 'mars': 'Mars',
  'mercury': 'Mercury', 'moon': 'Moon', 'sun': 'Sun',
  'lagna': 'Lagna', 'ascendant': 'Ascendant',
  'bhava': 'Bhāva', 'bhavas': 'Bhāvas',
  'graha': 'Graha', 'grahas': 'Grahas',
  // Common typos
  'becuase': 'because', 'beacuse': 'because', 'becasue': 'because',
  'recieve': 'receive', 'recieved': 'received',
  'occured': 'occurred', 'occuring': 'occurring',
  'seperate': 'separate', 'seperately': 'separately',
  'definately': 'definitely', 'definatly': 'definitely',
  'untill': 'until', 'untl': 'until',
  'occassion': 'occasion', 'occassionally': 'occasionally',
  'wierd': 'weird',
  'acheive': 'achieve', 'achive': 'achieve',
  'beleive': 'believe', 'belive': 'believe',
  'calender': 'calendar',
  'carrieer': 'career', 'carreer': 'career',
  'defintion': 'definition',
  'diffrent': 'different', 'diferent': 'different',
  'enviroment': 'environment',
  'explaination': 'explanation',
  'finacial': 'financial', 'financal': 'financial',
  'goverment': 'government',
  'happend': 'happened', 'happended': 'happened',
  'heatlh': 'health', 'helath': 'health',
  'independant': 'independent',
  'knowlege': 'knowledge', 'knowlegde': 'knowledge',
  'maintainance': 'maintenance',
  'neccessary': 'necessary', 'necessery': 'necessary',
  'occurence': 'occurrence',
  'posession': 'possession',
  'prefered': 'preferred',
  'realy': 'really', 'realyl': 'really',
  'relevent': 'relevant',
  'remeber': 'remember', 'rember': 'remember',
  'responsability': 'responsibility',
  'succesful': 'successful', 'successfull': 'successful',
  'tommorow': 'tomorrow', 'tommorrow': 'tomorrow',
  'truely': 'truly',
  'unforseen': 'unforeseen',
  'unfortunatly': 'unfortunately',
  'wether': 'whether',
  'writting': 'writing',
  'youre': "you're", 'dont': "don't", 'doesnt': "doesn't", 'cant': "can't", 'wont': "won't",
  'im': "I'm", 'ive': "I've", 'id': "I'd",
  'thier': 'their', 'teh': 'the', 'adn': 'and', 'hte': 'the',
  'taht': 'that', 'whta': 'what', 'waht': 'what',
  'relaitonship': 'relationship', 'realtionship': 'relationship', 'relatioship': 'relationship',
  'spirtual': 'spiritual', 'spritual': 'spiritual', 'spiritula': 'spiritual',
  'yogi': 'yogi', 'rearely': 'rarely', 'rarley': 'rarely'
};

// HTML escape function to prevent XSS
function escapeHtml(text) {
  if (!text) return text;
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function correctSpelling(text) {
  if (!text) return text;
  
  // First escape HTML to prevent XSS
  let corrected = escapeHtml(text);
  
  // Apply corrections (case-insensitive match, preserve original case style)
  for (const [wrong, right] of Object.entries(SPELL_CORRECTIONS)) {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    corrected = corrected.replace(regex, (match) => {
      // Preserve capitalization style
      if (match === match.toUpperCase()) return right.toUpperCase();
      if (match[0] === match[0].toUpperCase()) return right.charAt(0).toUpperCase() + right.slice(1);
      return right;
    });
  }
  
  // Fix common punctuation issues
  corrected = corrected.replace(/\s+([.,!?;:])/g, '$1'); // Remove space before punctuation
  corrected = corrected.replace(/([.,!?;:])([A-Za-z])/g, '$1 $2'); // Add space after punctuation
  corrected = corrected.replace(/\bi\b/g, 'I'); // Capitalize standalone "i"
  
  return corrected;
}

// Expose globally
window.escapeHtml = escapeHtml;

// Generate executive summary from full response
async function generateSummary(fullResponse, question, category) {
  if (!openRouterKey || !fullResponse) return null;
  
  const summaryPrompt = `You are a concise summarizer. Read this Vedic astrology analysis and create EXACTLY 3 sentences:

QUESTION: "${question}"

FULL ANALYSIS:
${fullResponse.substring(0, 3000)}

Create a 3-sentence executive summary that:
1. First sentence: State the core answer/finding
2. Second sentence: Name the key planetary factors (be specific with planet names and houses)
3. Third sentence: Give the timing or most actionable insight

RULES:
- EXACTLY 3 sentences, no more
- Be specific (use planet names, house numbers, dates)
- No introductory phrases like "This analysis shows..."
- Direct, factual, authoritative tone

SUMMARY:`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openRouterKey}`,
        'HTTP-Referer': window.location.href
      },
      body: JSON.stringify({
        model: AI_MODELS.claude.id, // Fast model for summary
        messages: [{ role: 'user', content: summaryPrompt }],
        max_tokens: 250,
        temperature: 0.3
      })
    });
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (e) {
    console.error('Summary generation failed:', e);
    return null;
  }
}

// Extract key planetary factors from response
function extractKeyFactors(response) {
  if (!response) return [];
  
  const factors = [];
  const text = response.toLowerCase();
  
  // Planet patterns
  const planetPatterns = [
    { regex: /sun.*(?:exalted|9th house|atmakaraka)/i, tag: '☉ Sun Exalted (AK)', priority: 1 },
    { regex: /sun.*debilitated/i, tag: '☉ Sun Debilitated', priority: 1 },
    { regex: /moon.*virgo|virgo.*moon/i, tag: '☽ Moon in Virgo', priority: 2 },
    { regex: /jupiter.*debilitated|debilitated.*jupiter/i, tag: '♃ Jupiter Debilitated', priority: 1 },
    { regex: /jupiter.*6th house/i, tag: '♃ Jupiter in 6th', priority: 2 },
    { regex: /saturn.*7th.*lord|7th.*lord.*saturn/i, tag: '♄ Saturn rules 7th', priority: 1 },
    { regex: /saturn.*10th house/i, tag: '♄ Saturn in 10th', priority: 2 },
    { regex: /saturn.*venus|venus.*saturn/i, tag: '♄♀ Saturn-Venus conjunction', priority: 1 },
    { regex: /mars.*7th house/i, tag: '♂ Mars in 7th', priority: 2 },
    { regex: /rahu.*5th house/i, tag: '☊ Rahu in 5th', priority: 2 },
    { regex: /ketu.*11th house/i, tag: '☋ Ketu in 11th', priority: 3 },
    { regex: /mercury.*lagna.*lord|lagna.*lord.*mercury/i, tag: '☿ Mercury (Lagna Lord)', priority: 1 },
    { regex: /venus.*debilitated/i, tag: '♀ Venus Debilitated', priority: 1 },
    { regex: /mars.*debilitated/i, tag: '♂ Mars Debilitated', priority: 1 },
  ];
  
  // Dasha patterns
  const dashaPatterns = [
    { regex: /jupiter\s*mah[aā]d[aā]sh[aā]/i, tag: '⏱ Jupiter Dasha Active', priority: 1 },
    { regex: /saturn\s*mah[aā]d[aā]sh[aā].*202[6-9]/i, tag: '⏱ Saturn Dasha from 2026', priority: 1 },
    { regex: /rahu\s*mah[aā]d[aā]sh[aā]/i, tag: '⏱ Rahu Dasha Period', priority: 2 },
  ];
  
  // House patterns
  const housePatterns = [
    { regex: /6th house.*disease|disease.*6th house/i, tag: '🏠 6th House (Health)', priority: 3 },
    { regex: /7th house.*partner|partner.*7th house/i, tag: '🏠 7th House (Partnership)', priority: 3 },
    { regex: /8th house.*transform/i, tag: '🏠 8th House (Transformation)', priority: 3 },
    { regex: /9th house.*dharma|dharma.*9th/i, tag: '🏠 9th House (Dharma)', priority: 3 },
    { regex: /10th house.*career|career.*10th/i, tag: '🏠 10th House (Career)', priority: 3 },
  ];
  
  // Check all patterns
  [...planetPatterns, ...dashaPatterns, ...housePatterns].forEach(p => {
    if (p.regex.test(response)) {
      factors.push({ tag: p.tag, priority: p.priority });
    }
  });
  
  // Sort by priority and dedupe
  const seen = new Set();
  return factors
    .sort((a, b) => a.priority - b.priority)
    .filter(f => {
      if (seen.has(f.tag)) return false;
      seen.add(f.tag);
      return true;
    })
    .slice(0, 8) // Max 8 factors
    .map(f => f.tag);
}

// Validate response quality
function validateResponse(response, category) {
  const issues = [];
  const text = response || '';
  const wordCount = text.split(/\s+/).length;
  
  // Check minimum length
  const minWords = { health: 600, finance: 500, relationship: 500, career: 400, spiritual: 600, general: 350 };
  const required = minWords[category] || 350;
  if (wordCount < required * 0.7) {
    issues.push({ type: 'length', message: `Response too short (${wordCount} words, need ${required}+)` });
  }
  
  // Check for truncation
  if (detectTruncation(text)) {
    issues.push({ type: 'truncated', message: 'Response appears cut off mid-sentence' });
  }
  
  // Check for degree citations
  const degrees = (text.match(/\d+°\d*'?/g) || []).length;
  if (degrees < 2) {
    issues.push({ type: 'specificity', message: 'Missing specific planetary degrees' });
  }
  
  // Check for dasha mention
  if (!/mah[aā]d[aā]sh[aā]/i.test(text)) {
    issues.push({ type: 'dasha', message: 'No Mahādashā analysis found' });
  }
  
  // Check for conclusion/summary section
  if (!/conclusion|summary|synthesis|key (insight|takeaway)|in summary/i.test(text)) {
    issues.push({ type: 'structure', message: 'Missing conclusion section' });
  }
  
  // Check for house mentions
  const houseMentions = (text.match(/\d+(st|nd|rd|th)\s+house/gi) || []).length;
  if (houseMentions < 3) {
    issues.push({ type: 'houses', message: 'Insufficient house analysis' });
  }
  
  return {
    isValid: issues.filter(i => i.type === 'truncated' || i.type === 'length').length === 0,
    issues,
    score: Math.max(0, 100 - (issues.length * 15))
  };
}

// Generate proper PDF with styling
async function generatePDF(question, responseHtml, metadata = {}) {
  // Create a print-optimized document
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    alert('Please allow popups to generate PDF');
    return;
  }
  
  const correctedQuestion = correctSpelling(question);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  // Get text content for PDF
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = responseHtml;
  
  printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>JYOTI Oracle Reading - ${dateStr}</title>
  <style>
    @page {
      margin: 1in 0.75in;
      size: letter;
    }
    
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a2e;
      max-width: 100%;
      margin: 0;
      padding: 0;
    }
    
    .pdf-header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 3px double #c9a227;
      margin-bottom: 24px;
    }
    
    .pdf-logo {
      font-size: 28pt;
      font-weight: bold;
      color: #c9a227;
      letter-spacing: 0.15em;
      margin-bottom: 4px;
    }
    
    .pdf-tagline {
      font-size: 9pt;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.2em;
    }
    
    .pdf-meta {
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      color: #666;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #ddd;
    }
    
    .pdf-question-box {
      background: #f9f7f0;
      border: 2px solid #c9a227;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 24px;
    }
    
    .pdf-question-label {
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: #c9a227;
      margin-bottom: 8px;
    }
    
    .pdf-question-text {
      font-size: 13pt;
      font-style: italic;
      color: #1a1a2e;
      line-height: 1.5;
    }
    
    .pdf-summary-box {
      background: linear-gradient(135deg, #fef9e7 0%, #fdf6e3 100%);
      border-left: 4px solid #c9a227;
      padding: 16px 20px;
      margin-bottom: 24px;
      page-break-inside: avoid;
    }
    
    .pdf-summary-title {
      font-size: 10pt;
      font-weight: bold;
      color: #c9a227;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    
    .pdf-summary-text {
      font-size: 11pt;
      line-height: 1.7;
    }
    
    .pdf-factors {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 12px;
    }
    
    .pdf-factor-tag {
      background: white;
      border: 1px solid #c9a227;
      border-radius: 4px;
      padding: 4px 10px;
      font-size: 8pt;
      color: #8b7355;
    }
    
    .pdf-content h2 {
      font-size: 14pt;
      color: #1a3a4a;
      border-bottom: 2px solid #c9a227;
      padding-bottom: 8px;
      margin: 28px 0 16px 0;
      page-break-after: avoid;
    }
    
    .pdf-content h3 {
      font-size: 12pt;
      color: #2a5a6a;
      margin: 20px 0 12px 0;
      page-break-after: avoid;
    }
    
    .pdf-content p {
      margin-bottom: 12px;
      text-align: justify;
    }
    
    .pdf-content ul, .pdf-content ol {
      margin: 12px 0 12px 24px;
    }
    
    .pdf-content li {
      margin-bottom: 8px;
    }
    
    .pdf-content strong {
      color: #1a3a4a;
    }
    
    .pdf-content em {
      color: #2a5a6a;
    }
    
    .degree-citation {
      font-family: 'Courier New', monospace;
      font-size: 10pt;
      background: #f0f0f0;
      padding: 1px 4px;
      border-radius: 3px;
    }
    
    .pdf-chapter {
      page-break-inside: avoid;
      margin-bottom: 20px;
      padding: 16px;
      background: #fafafa;
      border-left: 3px solid #c9a227;
    }
    
    .pdf-footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #ddd;
      font-size: 8pt;
      color: #999;
      text-align: center;
    }
    
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .pdf-summary-box, .pdf-question-box { -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="pdf-header">
    <div class="pdf-logo">✦ JYOTI ✦</div>
    <div class="pdf-tagline">Science of Light • Vedic Astrology</div>
    <div class="pdf-meta">
      <span>Generated: ${dateStr}</span>
      <span>${metadata.name || 'Personal Reading'}</span>
      <span>${metadata.model || 'Oracle Council'}</span>
    </div>
  </div>
  
  <div class="pdf-question-box">
    <div class="pdf-question-label">Your Question</div>
    <div class="pdf-question-text">"${correctedQuestion}"</div>
  </div>
  
  ${metadata.summary ? `
  <div class="pdf-summary-box">
    <div class="pdf-summary-title">✦ Executive Summary</div>
    <div class="pdf-summary-text">${metadata.summary}</div>
    ${metadata.factors?.length ? `
    <div class="pdf-factors">
      ${metadata.factors.map(f => `<span class="pdf-factor-tag">${f}</span>`).join('')}
    </div>
    ` : ''}
  </div>
  ` : ''}
  
  <div class="pdf-content">
    ${responseHtml}
  </div>
  
  <div class="pdf-footer">
    JYOTI - Science of Light • This reading is for personal guidance only • ${window.location.origin}
  </div>
</body>
</html>
  `);
  
  printWindow.document.close();
  
  // Wait for content to load then print
  setTimeout(() => {
    printWindow.print();
  }, 500);
}

// Store current response data for PDF generation
let currentOracleData = {
  question: '',
  response: '',
  summary: '',
  factors: [],
  model: ''
};

// Expose functions globally
window.correctSpelling = correctSpelling;
window.generateSummary = generateSummary;
window.extractKeyFactors = extractKeyFactors;
window.validateResponse = validateResponse;
window.generatePDF = generatePDF;


// [CONTENT BLOCK EXTRACTED TO data/content.js]


const LEARNING_MODULES = [
  {
    num: 0,
    title: "What is Jyotish?",
    subtitle: "Experience before theory",
    content: `
      <h5>The Science of Light</h5>
      <p>Jyotish (ज्योतिष) literally means "Science of Light" — the ancient Vedic system of understanding life through celestial patterns. While often called "Vedic Astrology," it's more accurately a contemplative practice of self-inquiry using the language of the cosmos.</p>
      
      <div class="module-sacred">
        <p>"As above, so below. As within, so without."</p>
      </div>
      
      <h5>Key Differences from Western Astrology</h5>
      <ul>
        <li><strong>Sidereal Zodiac:</strong> Jyotish uses the actual position of stars, which shifts about 1° every 72 years from the tropical zodiac. Your Vedic sign may differ from your Western sign.</li>
        <li><strong>Moon Emphasis:</strong> While Western astrology emphasizes the Sun sign, Jyotish considers the Moon (mind) and Ascendant (soul interface) equally or more important.</li>
        <li><strong>Dasha System:</strong> Jyotish uses sophisticated timing systems that reveal when specific karmas activate — not just character but life chapters.</li>
        <li><strong>Spiritual Purpose:</strong> Traditional Jyotish aims at moksha (liberation), not just prediction. It's a tool for awakening.</li>
      </ul>
      
      <h5>What Jyotish Can and Cannot Do</h5>
      <p><strong>It can</strong> reveal patterns, tendencies, timing, and karmic themes. It illuminates what you came here to learn and when certain lessons intensify.</p>
      <p><strong>It cannot</strong> predict exact events, override free will, or tell you what will definitely happen. The chart shows the weather; you decide how to dress.</p>
    `
  },
  {
    num: 1,
    title: "The Nine Grahas",
    subtitle: "Cosmic forces as inner energies",
    content: `
      <h5>The Players on Your Stage</h5>
      <p>The nine grahas (that which seizes) represent archetypal energies operating through you. They're not external forces controlling you — they're patterns of consciousness you're working with.</p>
      
      <h5>The Luminaries</h5>
      <ul>
        <li><strong>Sun (Sūrya) ☉:</strong> Soul, ego, father, authority, vitality. The eternal witness behind all experience.</li>
        <li><strong>Moon (Chandra) ☽:</strong> Mind, emotions, mother, memory, public. The lens through which you experience life.</li>
      </ul>
      
      <h5>The Classical Planets</h5>
      <ul>
        <li><strong>Mars (Maṅgala) ♂:</strong> Energy, courage, action, competition. Your capacity to assert and defend.</li>
        <li><strong>Mercury (Budha) ☿:</strong> Intellect, communication, learning, commerce. Your thinking and connecting functions.</li>
        <li><strong>Jupiter (Guru) ♃:</strong> Wisdom, teachers, fortune, faith. Your capacity for meaning and expansion.</li>
        <li><strong>Venus (Śukra) ♀:</strong> Love, beauty, pleasure, art. Your capacity for relationship and appreciation.</li>
        <li><strong>Saturn (Śani) ♄:</strong> Time, karma, discipline, endurance. Your capacity for structure and perseverance.</li>
      </ul>
      
      <h5>The Shadow Planets</h5>
      <ul>
        <li><strong>Rahu ☊:</strong> Worldly desire, obsession, innovation. Where you grasp for new experience.</li>
        <li><strong>Ketu ☋:</strong> Liberation, detachment, past mastery. Where you release and transcend.</li>
      </ul>
      
      <div class="module-sacred">
        <p>"The planets don't make anything happen. They indicate when the karmas stored in you will ripen."</p>
      </div>
    `
  },
  {
    num: 2,
    title: "The Twelve Bhāvas",
    subtitle: "Arenas of life experience",
    content: `
      <h5>The Stage of Life</h5>
      <p>While grahas are the actors, bhāvas (houses) are the stages where they perform. Each house represents a distinct arena of life experience.</p>
      
      <h5>The Four Pillars</h5>
      <ul>
        <li><strong>1st House (Lagna):</strong> Self, body, identity — your interface with existence.</li>
        <li><strong>4th House (Bandhu):</strong> Home, mother, peace — your emotional foundation.</li>
        <li><strong>7th House (Yuvati):</strong> Partnership, others, contracts — your mirror in relationship.</li>
        <li><strong>10th House (Karma):</strong> Career, status, public role — your visible contribution.</li>
      </ul>
      
      <h5>The Triads</h5>
      <ul>
        <li><strong>Dharma Houses (1, 5, 9):</strong> Purpose, creativity, meaning — why you're here.</li>
        <li><strong>Artha Houses (2, 6, 10):</strong> Resources, work, career — how you sustain yourself.</li>
        <li><strong>Kama Houses (3, 7, 11):</strong> Desire, partnership, community — what you want.</li>
        <li><strong>Moksha Houses (4, 8, 12):</strong> Home, transformation, liberation — where you transcend.</li>
      </ul>
      
      <h5>Difficult Houses — The Growth Zones</h5>
      <p>Houses 6, 8, and 12 are called "dusthanas" (difficult places). But they're not curses — they're where the most profound transformation happens. The 6th builds strength through obstacles. The 8th transforms through crisis. The 12th liberates through surrender.</p>
    `
  },
  {
    num: 3,
    title: "The Dasha System",
    subtitle: "Life's chapters unfold",
    content: `
      <h5>Timing is Everything</h5>
      <p>The Vimśottari Dasha system divides life into 120 years of planetary periods. Each planet rules a portion of your life, and its themes become prominent during that time.</p>
      
      <h5>How It Works</h5>
      <p>Your Moon's nakshatra at birth determines where you begin in the dasha sequence. The balance remaining in that period depends on the Moon's exact position within the nakshatra.</p>
      
      <h5>The Periods</h5>
      <ul>
        <li>Ketu: 7 years — Spiritual initiation, release</li>
        <li>Venus: 20 years — Love, beauty, relationships</li>
        <li>Sun: 6 years — Identity, authority, father</li>
        <li>Moon: 10 years — Mind, emotions, mother</li>
        <li>Mars: 7 years — Action, courage, conflict</li>
        <li>Rahu: 18 years — Worldly desire, expansion</li>
        <li>Jupiter: 16 years — Wisdom, teachers, fortune</li>
        <li>Saturn: 19 years — Discipline, karma, structure</li>
        <li>Mercury: 17 years — Learning, communication, commerce</li>
      </ul>
      
      <div class="module-sacred">
        <p>"The wise person cooperates with their current dasha rather than fighting it."</p>
      </div>
    `
  },
  {
    num: 4,
    title: "Reading Your Chart",
    subtitle: "Synthesis and the Three-Point Anchor",
    content: `
      <h5>The Three-Point Anchor</h5>
      <p>Begin any chart reading with three reference points:</p>
      <ul>
        <li><strong>Ascendant + Nakshatra:</strong> Your soul's chosen entry point into this incarnation. The doorway through which consciousness took form.</li>
        <li><strong>Ātmakāraka + House:</strong> The planet at highest degree shows your soul's primary lesson. Its house shows where that lesson plays out.</li>
        <li><strong>Current Dasha:</strong> What chapter of your life story is currently being written? What planetary themes are active now?</li>
      </ul>
      
      <h5>Questions to Ask</h5>
      <p>For any chart exploration, hold these questions:</p>
      <ul>
        <li>What is the soul learning this lifetime? (Ātmakāraka)</li>
        <li>What resources did they bring? (2nd house, planets in strength)</li>
        <li>What challenges did they choose? (Difficult placements, dusthanas)</li>
        <li>What is ripening now? (Current dasha)</li>
        <li>What is the invitation? (Synthesis)</li>
      </ul>
      
      <h5>The 70/30 Principle</h5>
      <p>Approximately 70% of life reflects Prarabdha Karma — patterns already set in motion from past actions. But 30% remains Kriyaman Karma — your response in this moment. The chart shows tendencies, not certainties. Your awareness changes everything.</p>
      
      <div class="module-sacred">
        <p>"The chart is a map, not the territory. The map describes the terrain; you choose the path."</p>
      </div>
    `
  }
];

// ════════════════════════════════════════════════════════════════════════════
// GLOBAL STATE
// ════════════════════════════════════════════════════════════════════════════

// Astronomy Engine is loaded via import at the top
let astroEngineReady = true;
let chartData = window.chartData = null;
let selectedLocation = null;
let expandedPlanet = null;
let logoTapCount = 0;
let logoTapTimer = null;
let searchTimeout = null;

// ════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════════════════════════════════

const ordinal = n => n + (['th','st','nd','rd'][n%10>3?0:(n%100-n%10!==10)*(n%10)] || 'th');
const fmtDate = d => {
  if (!d || !(d instanceof Date) || isNaN(d)) return 'Unknown';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};
const fmtDeg = d => Math.floor(d) + '°' + Math.floor((d%1)*60) + "'";
const norm360 = x => ((x % 360) + 360) % 360;
const lonToSign = lon => Math.floor(norm360(lon) / 30);
const lonToDeg = lon => norm360(lon) % 30;
const lonToNak = lon => Math.floor(norm360(lon) / (360 / 27));
const calcHouse = (pSign, lagnaSign) => { let h = pSign - lagnaSign + 1; return h <= 0 ? h + 12 : h; };

// ════════════════════════════════════════════════════════════════════════════
// LOCATION AUTOCOMPLETE (OpenStreetMap Nominatim)
// ════════════════════════════════════════════════════════════════════════════

async function searchLocations(query) {
  if (query.length < 2) return [];
  
  // Get the birth date from the form if available (correct ID is 'dob')
  const dobInput = document.getElementById('dob');
  const birthDate = dobInput?.value || null;
  
  console.log('[JYOTI] Searching for location:', query);
  
  // Try Nominatim first (with required User-Agent header)
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6&addressdetails=1`,
      { 
        headers: { 
          'Accept-Language': 'en',
          'User-Agent': 'JYOTI-Vedic-Astrology/10.0 (https://jyoti.app)'
        } 
      }
    );
    
    console.log('[JYOTI] Nominatim status:', response.status);
    
    if (response.ok) {
      const results = await response.json();
      console.log('[JYOTI] Nominatim found:', results.length, 'results');
      
      if (results.length > 0) {
        return results.map(r => ({
          display: r.display_name,
          name: [r.address?.city, r.address?.town, r.address?.village, r.address?.state, r.address?.country]
            .filter(Boolean).slice(0, 3).join(', ') || r.display_name.split(',').slice(0, 2).join(','),
          lat: parseFloat(r.lat),
          lon: parseFloat(r.lon),
          country: r.address?.country || '',
          timezone: estimateTimezone(parseFloat(r.lon), r.address?.country, birthDate)
        }));
      }
    }
  } catch (error) {
    console.warn('[JYOTI] Nominatim error:', error.message);
  }
  
  // Fallback to Photon geocoder (Komoot - also uses OSM data, no User-Agent required)
  console.log('[JYOTI] Trying Photon fallback...');
  try {
    const response = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6&lang=en`
    );
    
    if (response.ok) {
      const data = await response.json();
      console.log('[JYOTI] Photon found:', data.features?.length || 0, 'results');
      
      if (data.features && data.features.length > 0) {
        return data.features.map(f => ({
          display: f.properties.name + (f.properties.country ? ', ' + f.properties.country : ''),
          name: [f.properties.city || f.properties.name, f.properties.state, f.properties.country]
            .filter(Boolean).slice(0, 3).join(', '),
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0],
          country: f.properties.country || '',
          timezone: estimateTimezone(f.geometry.coordinates[0], f.properties.country, birthDate)
        }));
      }
    }
  } catch (error) {
    console.error('[JYOTI] Photon fallback error:', error.message);
  }
  
  console.log('[JYOTI] No results from any geocoder');
  return [];
}

function estimateTimezone(lon, country, dateStr) {
  // Better timezone estimation including daylight saving time
  // Note: This is approximate - for precise results, user should verify
  
  // Check if date is in DST period (rough approximation: April-October)
  // IMPORTANT: Many European countries didn't have DST before 1980
  let isDST = false;
  let year = new Date().getFullYear();
  
  if (dateStr) {
    const parts = dateStr.split('-');
    year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    
    // DST only applies after 1980 for most of Europe
    // Germany, France, etc. reintroduced DST in 1980 after the oil crisis
    if (year >= 1980 && month >= 4 && month <= 10) {
      isDST = true;
    }
  }
  
  const tzMap = {
    'India': 5.5,
    'United States': () => {
      const base = lon < -115 ? -8 : lon < -100 ? -7 : lon < -85 ? -6 : -5;
      return isDST ? base + 1 : base;
    },
    'United Kingdom': isDST ? 1 : 0,
    'Germany': isDST ? 2 : 1,
    'France': isDST ? 2 : 1,
    'Spain': isDST ? 2 : 1,
    'Italy': isDST ? 2 : 1,
    'Netherlands': isDST ? 2 : 1,
    'Belgium': isDST ? 2 : 1,
    'Austria': isDST ? 2 : 1,
    'Switzerland': isDST ? 2 : 1,
    'Poland': isDST ? 2 : 1,
    'Japan': 9,
    'China': 8,
    'Australia': isDST ? 11 : 10,
    'Russia': Math.round(lon / 15),
  };
  
  if (country && tzMap[country] !== undefined) {
    const val = tzMap[country];
    return typeof val === 'function' ? val() : val;
  }
  
  // Fallback: estimate from longitude
  return Math.round(lon / 15);
}

function setupLocationAutocomplete() {
  const input = document.getElementById('location-search');
  const dropdown = document.getElementById('autocomplete-dropdown');
  
  console.log('[JYOTI] Setting up location autocomplete');
  
  // Make selectLocation globally accessible
  window.selectLocationByIndex = function(index) {
    try {
      console.log('[JYOTI] selectLocationByIndex called with index:', index);
      const results = JSON.parse(dropdown.dataset.results || '[]');
      console.log('[JYOTI] Retrieved results:', results.length);
      if (results[index]) {
        selectLocation(results[index]);
      } else {
        console.error('[JYOTI] No result at index', index);
      }
    } catch (e) {
      console.error('[JYOTI] Error selecting location:', e);
    }
  };
  
  // Use mousedown instead of click for more reliable handling
  dropdown.addEventListener('mousedown', function(e) {
    const item = e.target.closest('.autocomplete-item');
    if (item) {
      e.preventDefault();
      e.stopPropagation();
      const index = parseInt(item.dataset.index, 10);
      console.log('[JYOTI] Mousedown on autocomplete item, index:', index);
      window.selectLocationByIndex(index);
    }
  });
  
  // Keep click handler as backup
  dropdown.addEventListener('click', function(e) {
    const item = e.target.closest('.autocomplete-item');
    if (item) {
      e.preventDefault();
      e.stopPropagation();
      const index = parseInt(item.dataset.index, 10);
      console.log('[JYOTI] Click on autocomplete item, index:', index);
      window.selectLocationByIndex(index);
    }
  });
  
  // Also handle touchend for mobile
  dropdown.addEventListener('touchend', function(e) {
    const item = e.target.closest('.autocomplete-item');
    if (item) {
      e.preventDefault();
      const index = parseInt(item.dataset.index, 10);
      console.log('[JYOTI] Touch on autocomplete item, index:', index);
      window.selectLocationByIndex(index);
    }
  });
  
  input.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    
    clearTimeout(searchTimeout);
    
    if (query.length < 2) {
      dropdown.classList.remove('open');
      return;
    }
    
    dropdown.innerHTML = '<div class="autocomplete-loading">Searching...</div>';
    dropdown.classList.add('open');
    
    searchTimeout = setTimeout(async () => {
      const results = await searchLocations(query);
      
      if (results.length === 0) {
        dropdown.innerHTML = '<div class="autocomplete-loading">No locations found</div>';
        return;
      }
      
      // Store results for selection
      dropdown.dataset.results = JSON.stringify(results);
      
      // Simpler HTML without inline onclick (use event delegation above)
      dropdown.innerHTML = results.map((r, i) => `
        <div class="autocomplete-item" data-index="${i}">
          <div class="autocomplete-item-main">${r.name}</div>
          <div class="autocomplete-item-sub">${r.lat.toFixed(4)}°N, ${r.lon.toFixed(4)}°E • UTC${r.timezone >= 0 ? '+' : ''}${r.timezone}</div>
        </div>
      `).join('');
    }, 300);
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.location-input-wrapper')) {
      dropdown.classList.remove('open');
    }
  });
}

function selectLocation(location) {
  console.log('[JYOTI] selectLocation called with:', location);
  
  if (!location || !location.lat || !location.lon) {
    console.error('[JYOTI] Invalid location object:', location);
    return;
  }
  
  selectedLocation = location;
  
  // Hide location input, show confirmation + details
  const stepLocation = document.getElementById('step-location');
  const stepDetails = document.getElementById('step-details');
  
  if (!stepLocation || !stepDetails) {
    console.error('[JYOTI] Step elements not found!');
    return;
  }
  
  console.log('[JYOTI] Transitioning from step-location to step-details');
  
  // Update classes
  stepLocation.classList.remove('active');
  stepLocation.classList.add('completed');
  stepDetails.classList.add('active');
  
  // Update confirmed location display
  const confirmedPlace = document.getElementById('confirmed-place');
  const confirmedCoords = document.getElementById('confirmed-coords');
  
  if (confirmedPlace) {
    confirmedPlace.textContent = location.name;
  }
  if (confirmedCoords) {
    confirmedCoords.textContent = 
      `${location.lat.toFixed(4)}°N, ${location.lon.toFixed(4)}°E • UTC${location.timezone >= 0 ? '+' : ''}${location.timezone}`;
  }
  
  // Set hidden form values
  document.getElementById('lat').value = location.lat;
  document.getElementById('lon').value = location.lon;
  document.getElementById('tz').value = location.timezone;
  
  // Close dropdown
  document.getElementById('autocomplete-dropdown').classList.remove('open');
  
  // Focus name input
  setTimeout(() => {
    const nameInput = document.getElementById('name');
    if (nameInput) {
      nameInput.focus();
      console.log('[JYOTI] Focused name input');
    }
  }, 100);
  
  console.log('[JYOTI] Location selection completed successfully');
}

window.editLocation = function() {
  selectedLocation = null;
  
  document.getElementById('step-details').classList.remove('active');
  document.getElementById('step-location').classList.remove('completed');
  document.getElementById('step-location').classList.add('active');
  
  const input = document.getElementById('location-search');
  input.value = '';
  input.focus();
};

// ════════════════════════════════════════════════════════════════════════════
// EPHEMERIS CALCULATIONS — High-Precision Built-in (No external dependencies)
// Moon uses ELP2000-82 simplified theory - accurate to ~0.1° for Dasha calculations
// ════════════════════════════════════════════════════════════════════════════

function getLahiriAyanamsa(jd) {
  // Lahiri Ayanamsa - Official Indian Ephemeris calculation
  // Reference: Lahiri ayanamsa on Jan 1, 1900 = 22°27'37.76" = 22.460489°
  // Precession rate: approximately 50.29" per year
  
  const T = (jd - 2415020.0) / 36525; // Centuries from Jan 0.5, 1900
  
  // Newcomb's precession formula (used by Lahiri)
  const precession = 50.2564 + 0.0222 * T; // arcseconds per year
  const years = (jd - 2415020.0) / 365.25;
  
  // Lahiri ayanamsa at epoch + accumulated precession
  // Epoch: Jan 1, 1900 = 22.460489°
  const ayanamsa = 22.460489 + (precession * years) / 3600;
  
  return ayanamsa;
}

// High-precision Moon longitude using ELP2000-82 main terms
function getMoonLongitude(jd) {
  const T = (jd - 2451545.0) / 36525; // Centuries from J2000.0
  
  // Fundamental arguments (in degrees)
  // Mean longitude of Moon
  const Lp = norm360(218.3164477 + 481267.88123421 * T - 0.0015786 * T*T + T*T*T/538841 - T*T*T*T/65194000);
  
  // Mean elongation of Moon from Sun
  const D = norm360(297.8501921 + 445267.1114034 * T - 0.0018819 * T*T + T*T*T/545868 - T*T*T*T/113065000);
  
  // Mean anomaly of Sun
  const M = norm360(357.5291092 + 35999.0502909 * T - 0.0001536 * T*T + T*T*T/24490000);
  
  // Mean anomaly of Moon
  const Mp = norm360(134.9633964 + 477198.8675055 * T + 0.0087414 * T*T + T*T*T/69699 - T*T*T*T/14712000);
  
  // Moon's argument of latitude
  const F = norm360(93.2720950 + 483202.0175233 * T - 0.0036539 * T*T - T*T*T/3526000 + T*T*T*T/863310000);
  
  // Additional arguments
  const A1 = norm360(119.75 + 131.849 * T); // Venus perturbation
  const A2 = norm360(53.09 + 479264.290 * T); // Jupiter perturbation
  const A3 = norm360(313.45 + 481266.484 * T);
  const E = 1 - 0.002516 * T - 0.0000074 * T*T; // Eccentricity correction
  
  // Convert to radians for trig
  const toRad = Math.PI / 180;
  const Drad = D * toRad, Mrad = M * toRad, Mprad = Mp * toRad, Frad = F * toRad;
  const A1rad = A1 * toRad, A2rad = A2 * toRad, A3rad = A3 * toRad;
  
  // Main longitude perturbations (in 0.000001 degrees, from ELP2000-82)
  let sumL = 0;
  
  // Principal terms
  sumL += 6288774 * Math.sin(Mprad);
  sumL += 1274027 * Math.sin(2*Drad - Mprad);
  sumL += 658314 * Math.sin(2*Drad);
  sumL += 213618 * Math.sin(2*Mprad);
  sumL += -185116 * E * Math.sin(Mrad);
  sumL += -114332 * Math.sin(2*Frad);
  sumL += 58793 * Math.sin(2*Drad - 2*Mprad);
  sumL += 57066 * E * Math.sin(2*Drad - Mrad - Mprad);
  sumL += 53322 * Math.sin(2*Drad + Mprad);
  sumL += 45758 * E * Math.sin(2*Drad - Mrad);
  sumL += -40923 * E * Math.sin(Mrad - Mprad);
  sumL += -34720 * Math.sin(Drad);
  sumL += -30383 * E * Math.sin(Mrad + Mprad);
  sumL += 15327 * Math.sin(2*Drad - 2*Frad);
  sumL += -12528 * Math.sin(Mprad + 2*Frad);
  sumL += 10980 * Math.sin(Mprad - 2*Frad);
  sumL += 10675 * Math.sin(4*Drad - Mprad);
  sumL += 10034 * Math.sin(3*Mprad);
  sumL += 8548 * Math.sin(4*Drad - 2*Mprad);
  sumL += -7888 * E * Math.sin(2*Drad + Mrad - Mprad);
  sumL += -6766 * E * Math.sin(2*Drad + Mrad);
  sumL += -5163 * Math.sin(Drad - Mprad);
  sumL += 4987 * E * Math.sin(Drad + Mrad);
  sumL += 4036 * E * Math.sin(2*Drad - Mrad + Mprad);
  sumL += 3994 * Math.sin(2*Drad + 2*Mprad);
  sumL += 3861 * Math.sin(4*Drad);
  sumL += 3665 * Math.sin(2*Drad - 3*Mprad);
  sumL += -2689 * E * Math.sin(Mrad - 2*Mprad);
  sumL += -2602 * Math.sin(2*Drad - Mprad + 2*Frad);
  sumL += 2390 * E * Math.sin(2*Drad - Mrad - 2*Mprad);
  sumL += -2348 * Math.sin(Drad + Mprad);
  sumL += 2236 * E*E * Math.sin(2*Drad - 2*Mrad);
  sumL += -2120 * E * Math.sin(Mrad + 2*Mprad);
  sumL += -2069 * E*E * Math.sin(2*Mrad);
  sumL += 2048 * E*E * Math.sin(2*Drad - 2*Mrad - Mprad);
  sumL += -1773 * Math.sin(2*Drad + Mprad - 2*Frad);
  sumL += -1595 * Math.sin(2*Drad + 2*Frad);
  sumL += 1215 * E * Math.sin(4*Drad - Mrad - Mprad);
  sumL += -1110 * Math.sin(2*Mprad + 2*Frad);
  sumL += -892 * Math.sin(3*Drad - Mprad);
  sumL += -810 * E * Math.sin(2*Drad + Mrad + Mprad);
  sumL += 759 * E * Math.sin(4*Drad - Mrad - 2*Mprad);
  sumL += -713 * E*E * Math.sin(2*Mrad - Mprad);
  sumL += -700 * E*E * Math.sin(2*Drad + 2*Mrad - Mprad);
  sumL += 691 * E * Math.sin(2*Drad + Mrad - 2*Mprad);
  sumL += 596 * E * Math.sin(2*Drad - Mrad - 2*Frad);
  sumL += 549 * Math.sin(4*Drad + Mprad);
  sumL += 537 * Math.sin(4*Mprad);
  sumL += 520 * E * Math.sin(4*Drad - Mrad);
  sumL += -487 * Math.sin(Drad - 2*Mprad);
  sumL += -399 * E * Math.sin(2*Drad + Mrad - 2*Frad);
  sumL += -381 * Math.sin(2*Mprad - 2*Frad);
  sumL += 351 * E * Math.sin(Drad + Mrad + Mprad);
  sumL += -340 * Math.sin(3*Drad - 2*Mprad);
  sumL += 330 * Math.sin(4*Drad - 3*Mprad);
  sumL += 327 * E * Math.sin(2*Drad - Mrad + 2*Mprad);
  sumL += -323 * E*E * Math.sin(2*Mrad + Mprad);
  sumL += 299 * E * Math.sin(Drad + Mrad - Mprad);
  sumL += 294 * Math.sin(2*Drad + 3*Mprad);
  
  // Additional corrections
  sumL += 3958 * Math.sin(A1rad);
  sumL += 1962 * Math.sin(Lp * toRad - Frad);
  sumL += 318 * Math.sin(A2rad);
  
  // Convert from 0.000001 degrees to degrees and add to mean longitude
  const moonLon = Lp + sumL / 1000000;
  
  return norm360(moonLon);
}

// Convert Julian Day to JavaScript Date
function jdToDate(jd) {
  return new Date((jd - 2440587.5) * 86400000);
}

// Get tropical longitude, then convert to sidereal
function getPlanetPosition(planet, jd) {
  const ayanamsa = getLahiriAyanamsa(jd);
  const date = jdToDate(jd);
  
  let tropicalLon = 0;
  let speed = 1;
  let source = 'unknown';
  
  // Swiss Ephemeris planet IDs
  const SE_PLANETS = {
    'Sun': 0, 'Moon': 1, 'Mercury': 2, 'Venus': 3, 'Mars': 4,
    'Jupiter': 5, 'Saturn': 6, 'Rahu': 10, 'Ketu': 11 // 10 = mean node
  };
  
  // Try Swiss Ephemeris first (highest precision)
  if (swissEphemeris && SE_PLANETS[planet] !== undefined) {
    try {
      const planetId = SE_PLANETS[planet];
      let result = null;
      
      // Handle different Swiss Ephemeris API variations
      // prolaxu style: swe.calc_ut(jd, swe.SE_SUN, swe.SEFLG_SWIEPH)
      // ptprashanttripathi style: swe.swe_calc_ut(jd, 0, 256)
      
      const FLAG = swissEphemeris.SEFLG_SWIEPH || swissEphemeris.SEFLG_SPEED || 256;
      
      if (typeof swissEphemeris.calc_ut === 'function') {
        result = swissEphemeris.calc_ut(jd, planetId, FLAG);
      } else if (typeof swissEphemeris.swe_calc_ut === 'function') {
        result = swissEphemeris.swe_calc_ut(jd, planetId, FLAG);
      }
      
      if (result) {
        tropicalLon = Array.isArray(result) ? result[0] : (result.longitude || result.lon || result[0]);
        speed = Array.isArray(result) ? (result[3] || 1) : (result.speed || 1);
        source = 'swiss-ephemeris';
        
        // For Ketu, add 180° to Rahu
        if (planet === 'Ketu') {
          tropicalLon = norm360(tropicalLon + 180);
        }
        
        return { lon: norm360(tropicalLon - ayanamsa), speed, source };
      }
    } catch (e) {
      // Fall through to Astronomy Engine
    }
  }
  
  // Try Astronomy Engine (good precision, always available)
  if (Astronomy || astronomyEngine) {
    const astro = Astronomy || astronomyEngine;
    try {
      source = 'astronomy-engine';
      
      if (planet === 'Sun') {
        const sun = astro.SunPosition(date);
        tropicalLon = sun.elon;
        speed = 0.9856;
      } 
      else if (planet === 'Moon') {
        const moon = astro.EclipticGeoMoon(date);
        tropicalLon = moon.lon;
        speed = 13.176;
      }
      else if (planet === 'Rahu') {
        const T = (jd - 2451545.0) / 36525;
        tropicalLon = norm360(125.04452 - 1934.13618 * T);
        speed = -0.053;
        source = 'mean-node';
      }
      else if (planet === 'Ketu') {
        const T = (jd - 2451545.0) / 36525;
        tropicalLon = norm360(125.04452 - 1934.13618 * T + 180);
        speed = -0.053;
        source = 'mean-node';
      }
      else {
        const bodyMap = {
          'Mercury': astro.Body.Mercury,
          'Venus': astro.Body.Venus,
          'Mars': astro.Body.Mars,
          'Jupiter': astro.Body.Jupiter,
          'Saturn': astro.Body.Saturn
        };
        
        const body = bodyMap[planet];
        if (body) {
          const geo = astro.GeoVector(body, date, true);
          const ecl = astro.Ecliptic(geo);
          tropicalLon = ecl.elon;
          
          const speeds = { Mercury: 4.092, Venus: 1.602, Mars: 0.524, Jupiter: 0.083, Saturn: 0.034 };
          speed = speeds[planet] || 1;
        }
      }
      
      return { lon: norm360(tropicalLon - ayanamsa), speed, source };
    } catch (e) {
      // Fall through to built-in calculations
    }
  }
  
  // Final fallback: Built-in calculations
  source = 'built-in';
  const T = (jd - 2451545.0) / 36525;
  
  switch(planet) {
    case 'Moon':
      tropicalLon = getMoonLongitude(jd);
      speed = 13.176;
      break;
    case 'Sun':
      const L0 = norm360(280.46646 + 36000.76983 * T);
      const M = norm360(357.52911 + 35999.05029 * T);
      const Mrad = M * Math.PI / 180;
      const C = (1.914602 - 0.004817 * T) * Math.sin(Mrad)
              + (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad);
      tropicalLon = L0 + C;
      speed = 0.9856;
      break;
    case 'Mars':
      tropicalLon = norm360(355.45332 + 19140.30268 * T);
      speed = 0.524;
      break;
    case 'Mercury':
      tropicalLon = norm360(252.25084 + 149472.67411 * T);
      speed = 4.092;
      break;
    case 'Jupiter':
      tropicalLon = norm360(34.35151 + 3034.90567 * T);
      speed = 0.083;
      break;
    case 'Venus':
      tropicalLon = norm360(181.97973 + 58517.81539 * T);
      speed = 1.602;
      break;
    case 'Saturn':
      tropicalLon = norm360(50.07744 + 1222.11379 * T);
      speed = 0.034;
      break;
    case 'Rahu':
      tropicalLon = norm360(125.04452 - 1934.13618 * T);
      speed = -0.053;
      break;
    case 'Ketu':
      tropicalLon = norm360(125.04452 - 1934.13618 * T + 180);
      speed = -0.053;
      break;
  }
  
  return { lon: norm360(tropicalLon - ayanamsa), speed, source };
}

function getAscendant(jd, lat, lon) {
  // Calculate proper Ascendant using astronomical formula
  const ayanamsa = getLahiriAyanamsa(jd);
  
  const T = (jd - 2451545.0) / 36525; // Julian centuries from J2000
  
  // Mean sidereal time at Greenwich (in degrees)
  // Using IAU formula
  let GMST = 280.46061837 
           + 360.98564736629 * (jd - 2451545.0) 
           + 0.000387933 * T * T 
           - T * T * T / 38710000;
  GMST = norm360(GMST);
  
  // Local Sidereal Time (add east longitude)
  const LST = norm360(GMST + lon);
  const RAMC = LST * Math.PI / 180; // in radians
  
  // Latitude in radians
  const latRad = lat * Math.PI / 180;
  
  // Obliquity of the ecliptic (mean obliquity)
  const epsilon = (23.439291 - 0.0130042 * T - 0.00000016 * T * T) * Math.PI / 180;
  
  // Ascendant formula (Meeus, Astronomical Algorithms Ch. 13)
  // tan(ASC) = cos(RAMC) / -[sin(ε)*tan(φ) + cos(ε)*sin(RAMC)]
  const y = Math.cos(RAMC);
  const x = -(Math.sin(epsilon) * Math.tan(latRad) + Math.cos(epsilon) * Math.sin(RAMC));
  
  let ascRad = Math.atan2(y, x);
  let ascDeg = norm360(ascRad * 180 / Math.PI);
  
  // This gives us TROPICAL Ascendant, convert to SIDEREAL
  const siderealAsc = norm360(ascDeg - ayanamsa);
  
  
  return siderealAsc;
}

function calcStrength(planet, sign, house, speed) {
  const d = DIGNITIES[planet];
  let s = 50;
  
  if (sign === d.exalt) s += 30;
  if (sign === d.debi) s -= 25;
  if (d.own?.includes(sign)) s += 20;
  if ([1,4,7,10].includes(house)) s += 12;
  if ([5,9].includes(house)) s += 10;
  if (speed < 0 && !['Sun','Moon','Rahu','Ketu'].includes(planet)) s += 8;
  
  return Math.max(0, Math.min(100, s));
}

function calcDasha(moonLon, birthDate) {
  const nak = lonToNak(moonLon);
  const ruler = NAK_LORDS[nak];
  const posInNak = (norm360(moonLon) % (360/27)) / (360/27);
  const balance = (1 - posInNak) * DASHA_YRS[ruler];
  
  const periods = [];
  let date = new Date(birthDate);
  let planet = ruler;
  
  // First period (partial)
  let end = new Date(date.getTime() + balance * 365.25 * 24 * 60 * 60 * 1000);
  periods.push({ planet, start: new Date(date), end, years: balance });
  date = end;
  
  // Subsequent periods
  let idx = DASHA_SEQ.indexOf(ruler);
  for (let c = 0; c < 3; c++) {
    for (let i = 0; i < 9; i++) {
      idx = (idx + 1) % 9;
      planet = DASHA_SEQ[idx];
      end = new Date(date.getTime() + DASHA_YRS[planet] * 365.25 * 24 * 60 * 60 * 1000);
      periods.push({ planet, start: new Date(date), end, years: DASHA_YRS[planet] });
      date = end;
    }
  }
  
  const now = new Date();
  const maha = periods.find(p => now >= p.start && now < p.end) || periods[0];
  
  return { nak, ruler, balance, maha, allPeriods: periods };
}

function computeChart(name, dob, tob, lat, lon, tz, place) {
  const [year, month, day] = dob.split('-').map(Number);
  const [hour, min] = tob.split(':').map(Number);
  
  // Convert local time to UT
  const ut = hour + min/60 - parseFloat(tz);
  
  // Julian Day calculation (Meeus formula)
  let y = year, m = month;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5 + ut/24;
  
  
  const lagnaLon = getAscendant(jd, lat, lon);
  const lagna = lonToSign(lagnaLon);
  
  const planets = PLANETS.map(pname => {
    const pos = getPlanetPosition(pname, jd);
    const sign = lonToSign(pos.lon);
    const deg = lonToDeg(pos.lon);
    const nak = lonToNak(pos.lon);
    const house = calcHouse(sign, lagna);
    const strength = calcStrength(pname, sign, house, pos.speed);
    const d = DIGNITIES[pname];
    
    return {
      name: pname,
      glyph: P_GLYPHS[pname],
      lon: pos.lon,
      sign,
      degree: deg,
      nakshatra: nak,
      house,
      retro: pos.speed < 0,
      strength,
      exalted: sign === d.exalt,
      debilitated: sign === d.debi,
      ownSign: d.own?.includes(sign),
      source: pos.source || 'builtin'
    };
  });
  
  const moon = planets.find(p => p.name === 'Moon');
  if (!moon) {
    console.error('ERROR: Moon not found in planetary calculations!');
    throw new Error('Failed to calculate Moon position');
  }
  
  // Create proper birth date in UTC (accounting for timezone)
  const birthDateUTC = new Date(Date.UTC(year, month-1, day, hour, min) - parseFloat(tz) * 60 * 60 * 1000);
  
  const dasha = calcDasha(moon.lon, birthDateUTC);
  
  // Calculate Atmakaraka (highest degree planet, excluding nodes)
  const akCandidates = planets.filter(p => !['Rahu','Ketu'].includes(p.name));
  const atmakaraka = akCandidates.reduce((max, p) => p.degree > max.degree ? p : max, akCandidates[0]).name;
  
  const akP = planets.find(p => p.name === atmakaraka);
  if (akP) akP.isAK = true;
  
  return {
    name, dob, tob, lat, lon, tz: parseFloat(tz), place,
    lagna, lagnaLon, lagnaNakshatra: lonToNak(lagnaLon),
    planets, dasha, atmakaraka
  };
}

// ════════════════════════════════════════════════════════════════════════════
// AI INTEGRATION — OpenRouter (CORS-enabled, works in browsers!)
// Supports: Claude, GPT-4, Gemini, Llama, Mistral and more
// ════════════════════════════════════════════════════════════════════════════

const CRISIS_KEYWORDS = ['suicide', 'kill myself', 'end my life', 'want to die', 'self harm'];

function checkForCrisis(text) {
  return CRISIS_KEYWORDS.some(kw => text.toLowerCase().includes(kw));
}

// OpenRouter API key (user provides this)
let openRouterKey = null;
try {
  openRouterKey = localStorage.getItem('openrouter_api_key') || null;
} catch (e) {
  console.warn('localStorage not available');
}

// Available models via OpenRouter
const AI_MODELS = {
  // PREMIUM MODELS - Verified OpenRouter model IDs (updated Dec 2024)
  'claude': { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  'gpt5': { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  'gemini': { id: 'google/gemini-pro', name: 'Gemini Pro', provider: 'Google' },
  'llama': { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'Meta' },
  'mistral': { id: 'mistralai/mistral-large', name: 'Mistral Large', provider: 'Mistral' },
  'deepseek': { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', provider: 'DeepSeek' }
};

// ═══════════════════════════════════════════════════════════════════════════
// SMART MODEL UPDATE CHECKER
// ═══════════════════════════════════════════════════════════════════════════

// Models we track for auto-upgrade suggestions
const TRACKED_MODELS = {
  'anthropic/claude': { current: 'claude-sonnet-4.5', pattern: /claude-sonnet-(\d+\.?\d*)/i },
  'openai/gpt': { current: 'gpt-4.1', pattern: /gpt-(\d+\.?\d*)/i },
  'google/gemini': { current: 'gemini-3-pro', pattern: /gemini-(\d+)-pro/i }
};

let availableUpgrades = [];
let lastUpdateCheck = 0;
try {
  lastUpdateCheck = parseInt(localStorage.getItem('last_model_check') || '0');
} catch (e) {}
const UPDATE_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // Check once per day

async function checkForModelUpdates(force = false) {
  // Only check once per day (or if forced)
  const now = Date.now();
  if (!force && (now - lastUpdateCheck) < UPDATE_CHECK_INTERVAL) {
    return;
  }
  
  if (!openRouterKey) {
    return;
  }
  
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Authorization': `Bearer ${openRouterKey}` }
    });
    
    if (!response.ok) {
      return;
    }
    
    const data = await response.json();
    const models = data.data || [];
    
    availableUpgrades = [];
    
    // Check for Claude upgrades
    const claudeModels = models.filter(m => m.id.startsWith('anthropic/claude-sonnet'));
    const latestClaude = claudeModels
      .map(m => ({ id: m.id, version: extractVersion(m.id, 'sonnet') }))
      .filter(m => m.version)
      .sort((a, b) => compareVersions(b.version, a.version))[0];
    
    if (latestClaude && latestClaude.id !== AI_MODELS.claude.id) {
      availableUpgrades.push({
        current: AI_MODELS.claude.id,
        latest: latestClaude.id,
        name: 'Claude Sonnet',
        key: 'claude'
      });
    }
    
    // Check for GPT upgrades
    const gptModels = models.filter(m => m.id.match(/openai\/gpt-\d/));
    const latestGPT = gptModels
      .filter(m => !m.id.includes('mini') && !m.id.includes('pro'))
      .map(m => ({ id: m.id, version: extractVersion(m.id, 'gpt') }))
      .filter(m => m.version)
      .sort((a, b) => compareVersions(b.version, a.version))[0];
    
    if (latestGPT && latestGPT.id !== AI_MODELS.gpt5.id) {
      availableUpgrades.push({
        current: AI_MODELS.gpt5.id,
        latest: latestGPT.id,
        name: 'GPT',
        key: 'gpt5'
      });
    }
    
    // Check for Gemini upgrades
    const geminiModels = models.filter(m => m.id.match(/google\/gemini-\d.*pro/));
    const latestGemini = geminiModels
      .map(m => ({ id: m.id, version: extractVersion(m.id, 'gemini') }))
      .filter(m => m.version)
      .sort((a, b) => compareVersions(b.version, a.version))[0];
    
    if (latestGemini && latestGemini.id !== AI_MODELS.gemini.id) {
      availableUpgrades.push({
        current: AI_MODELS.gemini.id,
        latest: latestGemini.id,
        name: 'Gemini Pro',
        key: 'gemini'
      });
    }
    
    // Save check timestamp
    lastUpdateCheck = now;
    localStorage.setItem('last_model_check', now.toString());
    
    // Show notification if updates available
    if (availableUpgrades.length > 0) {
      showUpdateNotification();
    } else {
    }
    
  } catch (e) {
  }
}

function extractVersion(modelId, type) {
  if (type === 'sonnet') {
    const match = modelId.match(/claude-sonnet-(\d+\.?\d*)/i);
    return match ? match[1] : null;
  }
  if (type === 'gpt') {
    const match = modelId.match(/gpt-(\d+\.?\d*)/i);
    return match ? match[1] : null;
  }
  if (type === 'gemini') {
    const match = modelId.match(/gemini-(\d+)/i);
    return match ? match[1] : null;
  }
  return null;
}

function compareVersions(a, b) {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }
  return 0;
}

function showUpdateNotification() {
  // Remove existing notification if any
  const existing = document.getElementById('model-update-notification');
  if (existing) existing.remove();
  
  const notification = document.createElement('div');
  notification.id = 'model-update-notification';
  notification.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #1a5f7a 0%, #2d6a4f 100%);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      z-index: 10000;
      max-width: 320px;
      font-family: var(--font-body);
      animation: slideIn 0.3s ease;
    ">
      <style>
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      </style>
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <span style="font-size: 1.5rem;">✨</span>
        <div style="flex: 1;">
          <div style="font-weight: 600; margin-bottom: 6px;">Newer AI Models Available</div>
          <div style="font-size: 0.8rem; opacity: 0.9; margin-bottom: 12px;">
            ${availableUpgrades.map(u => `${u.name}: ${u.latest.split('/')[1]}`).join('<br>')}
          </div>
          <div style="display: flex; gap: 8px;">
            <button onclick="applyModelUpgrades()" style="
              background: white;
              color: #1a5f7a;
              border: none;
              padding: 8px 16px;
              border-radius: 6px;
              font-weight: 600;
              cursor: pointer;
              font-size: 0.75rem;
            ">Upgrade Now</button>
            <button onclick="dismissUpdateNotification()" style="
              background: transparent;
              color: white;
              border: 1px solid rgba(255,255,255,0.3);
              padding: 8px 12px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 0.75rem;
            ">Later</button>
          </div>
        </div>
        <button onclick="dismissUpdateNotification()" style="
          background: none;
          border: none;
          color: white;
          opacity: 0.7;
          cursor: pointer;
          font-size: 1.2rem;
          padding: 0;
          line-height: 1;
        ">×</button>
      </div>
    </div>
  `;
  document.body.appendChild(notification);
}

window.dismissUpdateNotification = function() {
  const notification = document.getElementById('model-update-notification');
  if (notification) {
    notification.style.animation = 'slideOut 0.3s ease forwards';
    notification.innerHTML += '<style>@keyframes slideOut { to { transform: translateX(100%); opacity: 0; } }</style>';
    setTimeout(() => notification.remove(), 300);
  }
};

window.applyModelUpgrades = function() {
  availableUpgrades.forEach(upgrade => {
    AI_MODELS[upgrade.key].id = upgrade.latest;
    AI_MODELS[upgrade.key].name = upgrade.latest.split('/')[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  });
  
  
  // Save to localStorage so it persists
  localStorage.setItem('custom_model_overrides', JSON.stringify(
    availableUpgrades.reduce((acc, u) => ({ ...acc, [u.key]: u.latest }), {})
  ));
  
  window.dismissUpdateNotification();
  
  // Show success toast
  const toast = document.createElement('div');
  toast.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #2d6a4f;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-family: var(--font-body);
      font-size: 0.85rem;
      z-index: 10001;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    ">
      ✓ Oracle Council upgraded to latest models!
    </div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
};

// Load any saved model overrides on startup
function loadModelOverrides() {
  try {
    const overrides = JSON.parse(localStorage.getItem('custom_model_overrides') || '{}');
    Object.entries(overrides).forEach(([key, newId]) => {
      if (AI_MODELS[key]) {
        AI_MODELS[key].id = newId;
        console.log(`📦 Loaded model override: ${key} → ${newId}`);
      }
    });
  } catch (e) {
  }
}

// Manual check function (can be called from console)
window.checkModelUpdates = () => checkForModelUpdates(true);

// ═══════════════════════════════════════════════════════════════════════════

// Safe localStorage wrapper
function safeGetStorage(key, defaultValue = null) {
  try {
    return localStorage.getItem(key) || defaultValue;
  } catch (e) {
    console.warn(`localStorage read failed for ${key}:`, e);
    return defaultValue;
  }
}

function safeSetStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.warn(`localStorage write failed for ${key}:`, e);
    return false;
  }
}

let selectedModel = safeGetStorage('selected_ai_model', 'claude'); // Default to Claude

// Oracle Council - the 3 models that will be consulted
const COUNCIL_MODELS = ['claude', 'gpt4', 'gemini'];
let useCouncilMode = safeGetStorage('use_council_mode', 'false') === 'true';

// Toggle council mode
window.toggleCouncilMode = function(enabled) {
  useCouncilMode = enabled;
  try {
    localStorage.setItem('use_council_mode', enabled);
  } catch (e) {
    console.warn('Could not save council mode setting');
  }
  window.showSection('prashna'); // Re-render prashna section
};

// Call a specific model directly (for council)
async function callModelDirect(modelId, prompt, systemPrompt) {
  console.log('[JYOTI] callModelDirect called with model:', modelId);
  
  if (!openRouterKey) {
    console.error('[JYOTI] No API key available');
    return { text: null, error: 'No API key. Please connect your Oracle in the Prashna tab.' };
  }
  
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout (increased)
  
  try {
    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });
    
    console.log('[JYOTI] Sending request to OpenRouter...');
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openRouterKey}`,
        'HTTP-Referer': window.location.href,
        'X-Title': 'JYOTI - Vedic Astrology'
      },
      body: JSON.stringify({
        model: modelId,
        messages: messages,
        max_tokens: 4000,
        temperature: 0.7
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log('[JYOTI] Response status:', response.status);
    
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('[JYOTI] API error:', err);
      
      // Provide helpful error messages
      let errorMsg = err.error?.message || `Error ${response.status}`;
      if (response.status === 401) {
        errorMsg = 'Invalid API key. Please check your OpenRouter API key.';
      } else if (response.status === 402) {
        errorMsg = 'Insufficient credits. Please add credits to your OpenRouter account.';
      } else if (response.status === 404) {
        errorMsg = `Model "${modelId}" not found. It may not be available on OpenRouter.`;
      } else if (response.status === 429) {
        errorMsg = 'Rate limited. Please wait a moment and try again.';
      }
      
      return { text: null, error: errorMsg };
    }
    
    const data = await response.json();
    console.log('[JYOTI] Response received successfully');
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('[JYOTI] Unexpected response format:', data);
      return { text: null, error: 'Unexpected response format from API' };
    }
    
    return { 
      text: data.choices[0].message.content || null,
      model: modelId.split('/').pop(),
      usage: data.usage
    };
  } catch (e) {
    clearTimeout(timeoutId);
    console.error('[JYOTI] Request error:', e);
    
    if (e.name === 'AbortError') {
      return { text: null, error: 'Request timed out after 90 seconds. The AI may be overloaded - please try again.' };
    }
    return { text: null, error: e.message };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// ULTRA-DEEP PROMPT SYSTEM — Topic-Specific Analysis Frameworks
// ════════════════════════════════════════════════════════════════════════════

const DEEP_ANALYSIS_FRAMEWORKS = {
  
  // ═══════════════════════════════════════════════════════════════════
  // HEALTH & MEDICAL ASTROLOGY
  // ═══════════════════════════════════════════════════════════════════
  health: `
## MEDICAL ASTROLOGY DEEP ANALYSIS PROTOCOL

### LAYER 1: COMPLETE DASHA HISTORY CORRELATION
Examine the FULL dasha sequence the person has lived through:
- What dasha was running when symptoms FIRST appeared?
- What was that planet's dignity, house, and body-part rulership?
- Has the condition persisted across multiple dashas? Why?
- Current dasha: Is this planet connected to 6th, 8th, or 12th house?

### LAYER 2: BODY MAPPING (Kaalpurush System)
Map the specific complaint to astrological factors:

HOUSES → Body Parts:
1st: Head, brain, overall constitution, vitality
2nd: Face, throat, right eye, speech organs
3rd: Shoulders, arms, hands, ears, nervous courage
4th: Chest, heart, lungs, breast, emotional heart
5th: Stomach, upper abdomen, spine, digestive fire
6th: Intestines, immune system, acute disease, navel
7th: Kidneys, lower back, reproductive, bladder
8th: CHRONIC illness, colon, hidden diseases, genitals
9th: Thighs, hips, liver, arterial blood
10th: Knees, joints, skeletal structure, patella
11th: Calves, ankles, circulation, left ear
12th: Feet, lymphatic, hospitalization, left eye

PLANETS → Tissues & Functions:
☉ Sun: Bones, heart, right eye, spine, vitality, pitta fire
☽ Moon: Blood, fluids, mind, stomach, left eye, kapha
♂ Mars: Muscles, bone marrow, blood cells, inflammation, accidents
☿ Mercury: Nervous system, skin, lungs, speech, vata disorders
♃ Jupiter: Liver, fat tissue, pancreas, growth, diabetes, ears
♀ Venus: Kidneys, reproductive organs, urinary, face, hormones
♄ Saturn: Chronic pain, joints, teeth, muscles, degenerative diseases
☊ Rahu: Mysterious/undiagnosed diseases, toxins, skin, mental illness
☋ Ketu: Nervous disorders, intestinal, viral, sudden ailments, past-life

### LAYER 3: DUSTHANA AXIS ANALYSIS (6-8-12)
The disease triangle:
- 6th house: Acute disease, enemies of health, immune response
- 8th house: CHRONIC disease, surgery, transformation, hidden causes
- 12th house: Hospitalization, expenses on health, foreign treatment
- Where are the LORDS of these houses placed?
- What planets OCCUPY these houses?
- Any connection between 6th lord and 8th lord? (Chronic becoming acute)

### LAYER 4: SPECIFIC DISEASE INDICATORS
For the user's specific body part/condition:
- Which planet rules this body part? Is it afflicted?
- Which house rules this body part? What's there?
- Mars-Saturn: Chronic inflammation, surgeries
- Moon-Rahu: Mental health, anxiety, unknown fears
- Mercury-Ketu: Nervous disorders, skin issues
- Jupiter afflicted: Liver, diabetes, growth disorders
- Venus-Saturn: Kidney stones, reproductive issues

### LAYER 5: PAST LIFE & KARMIC DISEASE PATTERNS
Disease often has karmic roots:
- 5th house (Purva Punya): Past life merit/demerit affecting health
- 8th house: Inherited disease patterns, ancestral karma
- Ketu's position: What the soul neglected in past lives
- 12th house: Karmic debts expressing as health loss
- Saturn's aspects: Karmic lessons through physical limitation

### LAYER 6: EMOTIONAL/PSYCHOLOGICAL ROOTS
Many physical diseases have emotional origins:
- Moon condition: Overall mental/emotional state
- Moon-Saturn: Depression, heaviness, chronic sadness affecting body
- Moon-Rahu: Anxiety, panic, obsessive thoughts manifesting physically
- 4th house: Emotional security, mother relationship, heart health
- Mercury: Overthinking, nervous exhaustion

### LAYER 7: AUTO-IMMUNE ANALYSIS
If auto-immune is suspected:
- Mars-Saturn connection: Body's fire attacking its own structure
- Rahu involvement: Immune system confusion, attacking self
- 6th lord in 8th or vice versa: Acute becoming chronic self-attack
- Moon affliction: Immune dysfunction at cellular level

### LAYER 8: HEALING TIMING & REMEDIES
- When does the current difficult dasha END?
- What is the NEXT dasha lord's condition?
- Favorable upcoming transits for recovery?
- Specific remedies addressing ROOT cause planet
- Gemstone, mantra, charity recommendations tied to analysis`,

  // ═══════════════════════════════════════════════════════════════════
  // FINANCE & WEALTH
  // ═══════════════════════════════════════════════════════════════════
  finance: `
## FINANCIAL ASTROLOGY DEEP ANALYSIS PROTOCOL

### LAYER 1: THE WEALTH TRIANGLE (2-5-11)
Primary wealth indicators:
- 2nd house: Accumulated wealth, family money, speech that earns
- 5th house: Speculative gains, investments, creative income, lottery
- 11th house: Gains, income, fulfillment of desires, large sums
- Where are these lords? Strong or weak? Connected?

### LAYER 2: DHANA YOGAS (Wealth Combinations)
Check for classical wealth combinations:
- 2nd lord + 11th lord connection?
- 5th lord + 9th lord (Lakshmi Yoga)?
- Lagna lord with 2nd, 5th, 9th, or 11th lords?
- Jupiter aspecting 2nd, 5th, or 11th?
- Moon-Jupiter combination (Gaja-Kesari)?

### LAYER 3: DEBT & LOSS ANALYSIS (6-8-12)
Why money leaves:
- 6th house: Debts, enemies, litigation draining wealth
- 8th house: Sudden losses, inheritance battles, hidden expenses
- 12th house: Expenses, foreign investment loss, hospitals
- 6th lord in 2nd: Debts eating savings
- 12th lord in 11th: Gains becoming losses

### LAYER 4: CAREER-WEALTH CONNECTION (10th House)
How do they earn?
- 10th house condition: Career strength
- 10th lord placement: Where career energy flows
- 10th lord in 2nd: Career directly builds wealth
- 10th lord in 12th: Career may involve foreign lands or losses

### LAYER 5: DASHA TIMING FOR WEALTH
Financial periods in life:
- Which planet's dasha brought financial growth historically?
- Current dasha lord's connection to wealth houses?
- Upcoming dashas: Which will favor accumulation?
- Venus, Jupiter, Mercury dashas for wealth indicators

### LAYER 6: REAL ESTATE & PROPERTY (4th House)
Property wealth specifically:
- 4th house: Land, property, vehicles, fixed assets
- 4th lord condition: Strong = property gains
- Mars (natural karaka for land): Well-placed?
- 4th lord in 11th: Gains through property

### LAYER 7: BUSINESS VS. SERVICE
Should they be employed or entrepreneurial?
- 7th house (partnerships, business): Strong for entrepreneurship
- 10th house alone strong: Service/employment better
- 3rd house (courage, initiative): Entrepreneurial courage
- Mercury, Venus, Jupiter for commerce

### LAYER 8: TIMING OF IMPROVEMENT
- When will debt clear? (6th lord transit, dasha change)
- Best upcoming period for investment?
- Remedies for wealth-blocking planets
- Specific actions aligned with planetary strengths`,

  // ═══════════════════════════════════════════════════════════════════
  // RELATIONSHIPS & MARRIAGE
  // ═══════════════════════════════════════════════════════════════════
  relationship: `
## RELATIONSHIP ASTROLOGY DEEP ANALYSIS PROTOCOL

### LAYER 1: THE RELATIONSHIP HOUSES (1-5-7-8-12)
Core relationship indicators:
- 1st house: Self, what you bring to relationships
- 5th house: Romance, love affairs, courtship, children
- 7th house: Marriage, committed partnership, spouse nature
- 8th house: Intimacy, shared resources, in-laws, transformation
- 12th house: Bedroom pleasures, secret affairs, loss of self

### LAYER 2: 7TH HOUSE DEEP ANALYSIS
The marriage house:
- Sign on 7th cusp: Nature of partner expected
- Planets IN 7th: What energies you attract in partners
- 7th lord: Where is it placed? Dignity?
- 7th lord in 6th: Conflicts in marriage
- 7th lord in 8th: Transformative but challenging unions
- 7th lord in 12th: Foreign spouse or bedroom-focused

### LAYER 3: VENUS & MARS ANALYSIS
The love planets:
- Venus (for males): Condition shows wife/feminine relationships
- Mars (for females): Condition shows husband/masculine relationships
- Venus-Mars combination: Passion but possible conflicts
- Venus afflicted: Challenges in love, may attract wrong partners
- Mars afflicted: Aggression in relationships, accidents in love

### LAYER 4: MOON & EMOTIONAL COMPATIBILITY
Emotional relating patterns:
- Moon sign: Emotional needs in relationship
- Moon nakshatra: Deep compatibility requirements
- Moon afflicted: Emotional instability affecting relationships
- Moon-Saturn: Fear of intimacy, delayed relationships
- Moon-Rahu: Obsessive attractions, unconventional choices

### LAYER 5: MANGLIK/KUJA DOSHA CHECK
Mars affliction analysis:
- Mars in 1st, 4th, 7th, 8th, or 12th from Lagna/Moon/Venus?
- Severity: Full, partial, or cancelled?
- Cancellation factors: Mars in own sign, Saturn aspect, etc.
- What does Manglik actually mean for THIS chart?

### LAYER 6: TIMING OF RELATIONSHIP
When will love/marriage come?
- 7th lord dasha or antardasha?
- Venus or Jupiter transiting 7th?
- Current dasha favorable for partnership?
- Age predictions based on dasha sequence

### LAYER 7: WHY RELATIONSHIPS FAILED (If applicable)
Past relationship analysis:
- What dasha was running during past breakups?
- 6th, 8th, 12th house involvement?
- Rahu-Ketu axis across 1-7 or 5-11?
- Saturn's restrictive influence on 7th?

### LAYER 8: COMPATIBILITY FACTORS
What kind of partner suits them?
- 7th sign qualities needed in partner
- Navamsha 7th house (D9 for marriage details)
- Upapada Lagna (spouse's nature)
- Best nakshatra compatibility based on Moon`,

  // ═══════════════════════════════════════════════════════════════════
  // CAREER & PROFESSION
  // ═══════════════════════════════════════════════════════════════════
  career: `
## CAREER ASTROLOGY DEEP ANALYSIS PROTOCOL

### LAYER 1: THE CAREER TRIANGLE (2-6-10)
Core career indicators:
- 10th house: Karma, profession, public image, authority
- 6th house: Daily work, service, competition, colleagues
- 2nd house: Income from career, financial fruits of work

### LAYER 2: 10TH HOUSE DEEP ANALYSIS
The house of action:
- Sign on 10th: Career field tendencies
- Planets IN 10th: Active career influences
- 10th lord: Where career energy is directed
- 10th lord strong: Career success, recognition
- 10th lord afflicted: Career struggles, changes

### LAYER 3: PROFESSIONAL PLANET ANALYSIS
Career significators:
- Sun: Government, authority, leadership, father's profession
- Moon: Public dealing, nursing, hospitality, liquids
- Mars: Military, surgery, engineering, sports, fire
- Mercury: Communication, writing, commerce, accounting
- Jupiter: Teaching, law, finance, counseling, religion
- Venus: Arts, luxury goods, entertainment, beauty, hospitality
- Saturn: Labor, construction, mining, service, chronic work
- Rahu: Foreign companies, unconventional careers, technology
- Ketu: Research, spirituality, alternative healing

### LAYER 4: AMATYAKARAKA ANALYSIS
The career planet (2nd highest degree):
- Which planet is Amatyakaraka?
- Its house and sign placement
- This planet's significations = career direction
- Aspects on Amatyakaraka

### LAYER 5: BUSINESS VS. SERVICE DETERMINATION
Entrepreneurship or employment?
- 7th house strong: Business partnerships
- 10th alone strong: Service, employment
- 3rd house: Courage for self-employment
- Rahu in 10th: Unconventional, possibly own business
- Saturn in 10th: Slow rise through service

### LAYER 6: CAREER TIMING
Professional phases:
- Which dasha brought career growth?
- Current dasha lord's connection to 10th house?
- Saturn transit to 10th (responsibility increase)
- Jupiter transit to 10th (expansion, promotion)

### LAYER 7: FOREIGN CAREER POSSIBILITIES
Working abroad:
- 12th house connection to 10th?
- Rahu-10th connection?
- 9th lord (foreign lands) linked to career?
- 4th lord weak (leaving homeland)?

### LAYER 8: CAREER REMEDIES & OPTIMIZATION
- Best days for important career moves
- Colors, directions aligned with 10th lord
- Remedies for career-blocking planets
- Optimal career pivot based on dasha`,

  // ═══════════════════════════════════════════════════════════════════
  // SPIRITUALITY & LIFE PURPOSE
  // ═══════════════════════════════════════════════════════════════════
  spiritual: `
## SPIRITUAL ASTROLOGY DEEP ANALYSIS PROTOCOL

### LAYER 1: THE MOKSHA TRIANGLE (4-8-12)
Liberation indicators:
- 4th house: Inner peace, meditation capacity, heart wisdom
- 8th house: Transformation, occult, kundalini, death/rebirth
- 12th house: Moksha, transcendence, dissolution of ego, ashrams

### LAYER 2: ATMAKARAKA ANALYSIS
The Soul's Desire:
- Which planet is Atmakaraka (highest degree)?
- This is what your SOUL came to master
- House and sign of Atmakaraka
- Challenges and gifts of this planet
- Sun AK: Ego transcendence through leadership
- Moon AK: Emotional mastery, nurturing path
- Mars AK: Warrior-monk path, energy mastery
- Mercury AK: Knowledge as spiritual path
- Jupiter AK: Teaching, wisdom, guru path
- Venus AK: Devotion, beauty as divine door
- Saturn AK: Service, karma yoga, patience

### LAYER 3: KETU — THE MOKSHA KARAKA
Natural liberation significator:
- Ketu's house: Where you've already mastered (past life)
- Ketu's sign: Qualities you can easily access
- Ketu conjunctions: Spiritualized planets
- Ketu in 12th: Natural moksha tendency
- Ketu in 9th: Past-life spiritual practice

### LAYER 4: 9TH HOUSE — DHARMA & GURU
Path of righteousness:
- 9th house: Philosophy, guru, father, higher learning
- 9th lord condition: Access to teachers
- Jupiter's condition: Grace, wisdom, spiritual growth
- 9th lord in 12th: Guru from foreign/spiritual land

### LAYER 5: 12TH HOUSE — FINAL LIBERATION
The house of transcendence:
- Planets in 12th: What you surrender
- 12th lord placement: Where liberation energy flows
- Strong 12th: Ashram life, foreign spiritual journeys
- 12th lord in 9th: Philosophy leads to liberation

### LAYER 6: PAST LIFE INDICATORS
What soul brought from before:
- Ketu's position: Mastered abilities
- 5th house: Purva punya (past merit)
- D60 chart if available: Past life specifics
- 9th house: Dharmic continuity

### LAYER 7: SPIRITUAL DASHA TIMING
When spirituality awakens:
- Ketu dasha: Intense spiritual periods
- Jupiter dasha: Expansion of wisdom
- Saturn dasha: Karma yoga, discipline
- 12th lord dasha: Dissolution experiences

### LAYER 8: RECOMMENDED PRACTICES
Based on chart:
- Meditation style suited to Moon sign
- Deity aligned with Atmakaraka
- Pilgrimage destinations based on planetary rulers
- Mantras for spiritual growth`,

  // ═══════════════════════════════════════════════════════════════════
  // FAMILY & CHILDREN
  // ═══════════════════════════════════════════════════════════════════
  family: `
## FAMILY ASTROLOGY DEEP ANALYSIS PROTOCOL

### LAYER 1: CORE FAMILY HOUSES
- 2nd house: Birth family, lineage, early environment
- 4th house: Mother, home, emotional foundation
- 5th house: Children, creativity, first child especially
- 9th house: Father, ancestors, blessings from elders

### LAYER 2: CHILDREN ANALYSIS (5th House Deep Dive)
- 5th house sign: Children's nature
- Planets in 5th: Influences on children
- 5th lord: Fertility, children's wellbeing
- Jupiter (putra karaka): Natural significator of children
- 5th lord in dusthanas: Challenges with children

### LAYER 3: PARENT RELATIONSHIPS
Mother (4th house):
- Moon's condition: Relationship quality
- 4th lord placement: Mother's influence
- Malefics in 4th: Challenges with mother

Father (9th house):
- Sun's condition: Father relationship
- 9th lord placement: Father's influence
- 9th house afflicted: Father challenges

### LAYER 4: SIBLINGS (3rd House)
- 3rd house: Younger siblings
- 11th house: Elder siblings
- Mars (natural karaka): Sibling relationship quality

### LAYER 5: FAMILY KARMA
- 4th house afflictions: Ancestral healing needed
- Pitru dosha indicators: Father's line karma
- Saturn-Moon: Mother relationship karma
- 2nd lord afflicted: Family lineage challenges`,

  // ═══════════════════════════════════════════════════════════════════
  // TRAVEL & RELOCATION
  // ═══════════════════════════════════════════════════════════════════
  travel: `
## TRAVEL & RELOCATION ASTROLOGY DEEP ANALYSIS

### LAYER 1: TRAVEL HOUSES
- 3rd house: Short journeys, nearby travel
- 9th house: Long-distance, foreign travel, pilgrimages
- 12th house: Foreign residence, distant lands

### LAYER 2: FOREIGN SETTLEMENT INDICATORS
- Rahu in 9th or 12th: Strong foreign pull
- 12th lord in 9th: Settling abroad
- 4th lord weak: Leaving homeland
- Moon in 12th: Emotional home abroad

### LAYER 3: DIRECTION ANALYSIS
- Sun rules East
- Moon rules Northwest  
- Mars rules South
- Mercury rules North
- Jupiter rules Northeast
- Venus rules Southeast
- Saturn rules West
- Rahu rules Southwest

### LAYER 4: TIMING OF TRAVEL/RELOCATION
- 9th lord dasha: Long-distance travel
- 12th lord dasha: Foreign residence
- Rahu dasha with 9th/12th connection: Overseas move
- Saturn transit to 4th: Home changes`,

  // ═══════════════════════════════════════════════════════════════════
  // EDUCATION & LEARNING
  // ═══════════════════════════════════════════════════════════════════
  education: `
## EDUCATION ASTROLOGY DEEP ANALYSIS

### LAYER 1: EDUCATION HOUSES
- 2nd house: Primary education, speech, early learning
- 4th house: Formal education, degrees, academic environment
- 5th house: Intelligence, creative learning, higher studies
- 9th house: Advanced degrees, philosophy, wisdom

### LAYER 2: INTELLIGENCE ANALYSIS
- Mercury: Analytical intelligence, communication
- Jupiter: Wisdom, comprehensive understanding
- 5th lord: Creative intelligence
- Moon: Memory, receptive learning

### LAYER 3: FIELD OF STUDY INDICATORS
Based on strong planets and houses:
- Sun/Leo: Leadership, politics, administration
- Moon/Cancer: Psychology, nursing, public service
- Mars/Aries/Scorpio: Engineering, surgery, military
- Mercury/Gemini/Virgo: Commerce, writing, analysis
- Jupiter/Sagittarius/Pisces: Law, philosophy, teaching
- Venus/Taurus/Libra: Arts, design, hospitality
- Saturn/Capricorn/Aquarius: Science, research, technology`,

  // ═══════════════════════════════════════════════════════════════════
  // PROPERTY & REAL ESTATE
  // ═══════════════════════════════════════════════════════════════════
  property: `
## PROPERTY & REAL ESTATE ASTROLOGY DEEP ANALYSIS

### LAYER 1: PROPERTY HOUSES
- 4th house: Landed property, home, mother's property
- 2nd house: Accumulated assets, family property
- 11th house: Gains from property

### LAYER 2: KEY PLANETS
- Mars: Natural karaka for land and property
- Saturn: Old buildings, agricultural land
- Venus: Beautiful homes, luxury real estate
- 4th lord: Primary property indicator

### LAYER 3: PROPERTY TIMING
- 4th lord dasha: Home purchase/construction
- Mars dasha with 4th connection: Land acquisition
- Jupiter transit to 4th: Property expansion
- Saturn transit to 4th: Construction, renovation`,

  // ═══════════════════════════════════════════════════════════════════
  // GENERAL/TIMING QUESTIONS
  // ═══════════════════════════════════════════════════════════════════
  timing: `
## TIMING & GENERAL LIFE DIRECTION ANALYSIS

### LAYER 1: CURRENT DASHA ANALYSIS
- Mahādashā lord: What life phase are you in?
- Antardashā lord: Current sub-theme
- Pratyantara: Immediate influences
- How long until next major shift?

### LAYER 2: TRANSIT ANALYSIS
- Saturn's current position: Where are you building/being tested?
- Jupiter's current position: Where is expansion happening?
- Rahu-Ketu axis: Karmic focus area

### LAYER 3: UPCOMING 6-12 MONTH FORECAST
- Dasha transitions
- Major transits (Saturn, Jupiter, eclipses)
- Best and challenging periods

### LAYER 4: LIFE DIRECTION FROM ATMAKARAKA
- Soul's primary desire in this incarnation
- Current dasha's support or challenge to soul purpose`
};

// ════════════════════════════════════════════════════════════════════════════
// UNIVERSAL DEPTH ENFORCEMENT PROMPT
// ════════════════════════════════════════════════════════════════════════════

const DEPTH_ENFORCEMENT_PROMPT = `
## ABSOLUTE DEPTH REQUIREMENTS — EVERY RESPONSE MUST INCLUDE:

### MANDATORY ANALYSIS ELEMENTS:
1. **COMPLETE DASHA HISTORY**: Not just current — trace the SEQUENCE. What dasha was running during key life events? What's the PATTERN across dashas?

2. **HOUSE LORD CHAINS**: Don't just say "7th house for relationships." Trace: 7th lord is X, placed in Y house, which is ruled by Z, which is placed in... Follow the chain!

3. **MULTIPLE LAYER VERIFICATION**: Check from Lagna, Moon, AND relevant karaka. If all three confirm, it's strong. If they conflict, explain the nuance.

4. **TEMPORAL DEPTH**: 
   - What was the situation during PREVIOUS dasha?
   - What is it NOW?
   - What will it become in NEXT dasha?
   
5. **KARMIC TRACING**: For every major pattern, ask:
   - 5th house (past life merit): Is this earned or new?
   - 9th house (dharma): Is this aligned with purpose?
   - 12th house (past life debts): Is this a clearing?

6. **SPECIFIC DEGREES MATTER**: Don't just say "Moon in Virgo." Say "Moon at 5°16' Virgo in Uttara Phalguni nakshatra, ruled by Sun, pada 1."

7. **INTER-PLANET RELATIONSHIPS**: Who aspects whom? Who is in whose nakshatra? Nakshatra lord chains.

8. **PRACTICAL & SPIRITUAL INTEGRATION**: Every reading should end with:
   - Practical next steps (what to DO)
   - Spiritual perspective (what to UNDERSTAND)
   - Remedial measures (how to BALANCE)

### DEPTH CHECKLIST (Must address ALL):
☐ Why is this happening? (Karmic cause)
☐ When did it start? (Dasha correlation)  
☐ How long will it last? (Timing)
☐ What's the deeper lesson? (Spiritual meaning)
☐ What can be done? (Remedies & actions)
☐ What's the opportunity here? (Silver lining)

### RESPONSE LENGTH REQUIREMENTS:
- Simple factual questions: 300-500 words
- Life area questions (health, career, etc.): 800-1200 words
- Deep existential questions: 1000-1500 words

NEVER give surface-level answers. The querent is paying for DEPTH. Deliver it.`;

// ════════════════════════════════════════════════════════════════════════════
// AUTONOMOUS PROMPT EVOLUTION SYSTEM
// Prompts that rewrite themselves and get saved permanently
// ════════════════════════════════════════════════════════════════════════════

const PROMPT_EVOLUTION_SYSTEM = {
  storageKey: 'jyoti_evolved_prompts',
  historyKey: 'jyoti_prompt_history',
  evolvedPrompts: {},  // Initialize with empty object for safety
  promptHistory: {},   // Initialize with empty object for safety
  
  // Initialize - load evolved prompts from localStorage
  init() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      this.evolvedPrompts = stored ? JSON.parse(stored) : {};
      
      const history = localStorage.getItem(this.historyKey);
      this.promptHistory = history ? JSON.parse(history) : {};
      
    } catch (e) {
      console.warn('Could not load evolved prompts:', e);
      this.evolvedPrompts = {};
      this.promptHistory = {};
    }
    return this;
  },
  
  // Get the BEST prompt for a category (evolved or fallback to base)
  getPrompt(category) {
    // Safety check
    if (!this.evolvedPrompts) this.evolvedPrompts = {};
    
    // Check if we have an evolved (and validated) prompt
    if (this.evolvedPrompts[category]?.validated) {
      console.log(`📜 Using EVOLVED prompt for ${category} (v${this.evolvedPrompts[category].version})`);
      return this.evolvedPrompts[category].text;
    }
    
    // Fall back to base framework
    return DEEP_ANALYSIS_FRAMEWORKS[category] || DEEP_ANALYSIS_FRAMEWORKS.timing;
  },
  
  // Save a new evolved prompt (after validation)
  savePrompt(category, newPromptText, metadata = {}) {
    if (!this.evolvedPrompts) this.evolvedPrompts = {};
    if (!this.promptHistory) this.promptHistory = {};
    
    const version = (this.evolvedPrompts[category]?.version || 0) + 1;
    
    // Store current as history before overwriting
    if (this.evolvedPrompts[category]) {
      if (!this.promptHistory[category]) this.promptHistory[category] = [];
      this.promptHistory[category].push({
        ...this.evolvedPrompts[category],
        replacedAt: Date.now()
      });
      // Keep only last 5 versions
      if (this.promptHistory[category].length > 5) {
        this.promptHistory[category] = this.promptHistory[category].slice(-5);
      }
    }
    
    // Save new evolved prompt
    this.evolvedPrompts[category] = {
      text: newPromptText,
      version,
      evolvedAt: Date.now(),
      validated: metadata.validated || false,
      validationScore: metadata.score || null,
      reason: metadata.reason || 'Manual update',
      improvementsApplied: metadata.improvements || []
    };
    
    this._persist();
    console.log(`✅ Saved evolved prompt for ${category} (v${version})`);
    return version;
  },
  
  // Rollback to previous version if new prompt is worse
  rollback(category) {
    if (this.promptHistory[category]?.length > 0) {
      const previous = this.promptHistory[category].pop();
      this.evolvedPrompts[category] = previous;
      this._persist();
      console.log(`⏪ Rolled back ${category} to v${previous.version}`);
      return true;
    }
    return false;
  },
  
  // AI-powered prompt evolution
  async evolvePrompt(category) {
    // Safety checks
    if (!PROMPT_LEARNING_SYSTEM?.learnings?.patterns) {
      return null;
    }
    
    const learnings = PROMPT_LEARNING_SYSTEM.learnings.patterns[category];
    const responseCount = (PROMPT_LEARNING_SYSTEM.learnings.responses || []).filter(r => r.category === category).length;
    
    if (!learnings || responseCount < 5) {
      console.log(`⚠️ Need at least 5 responses in ${category} before evolving (have ${responseCount})`);
      return null;
    }
    
    const currentPrompt = this.getPrompt(category);
    const basePrompt = DEEP_ANALYSIS_FRAMEWORKS[category] || '';
    
    // Safely get missing elements
    const missingElements = learnings.missingElements || [];
    
    const evolutionRequest = `You are a prompt engineering expert specializing in Vedic astrology AI systems.

TASK: Analyze the performance data and REWRITE the prompt to produce better responses.

═══════════════════════════════════════════════════════════════════════════════
CURRENT PROMPT FOR "${category.toUpperCase()}" CATEGORY:
═══════════════════════════════════════════════════════════════════════════════
${currentPrompt}

═══════════════════════════════════════════════════════════════════════════════
PERFORMANCE DATA FROM REAL RESPONSES:
═══════════════════════════════════════════════════════════════════════════════
Average word count: ${learnings.avgWordCount || 0} words
Average house mentions: ${learnings.avgHouseMentions || 0}
Average planet mentions: ${learnings.avgPlanetMentions || 0}

MISSING ELEMENTS (frequently absent from responses):
${missingElements.length > 0 ? missingElements.map(m => `- ${m.replace(/_/g, ' ')}`).join('\n') : '- None identified'}

QUALITY ISSUES DETECTED:
${(learnings.avgWordCount || 0) < 600 ? '- Responses too short (need more depth)' : ''}
${missingElements.includes('specific_degrees') ? '- Planetary degrees often missing' : ''}
${missingElements.includes('dasha_analysis') ? '- Dasha sequence analysis often incomplete' : ''}
${missingElements.includes('remedies') ? '- Remedies frequently omitted' : ''}
${missingElements.includes('karmic_perspective') ? '- Karmic/spiritual perspective often missing' : ''}

═══════════════════════════════════════════════════════════════════════════════
YOUR TASK:
═══════════════════════════════════════════════════════════════════════════════

1. ANALYZE why the current prompt isn't producing the desired elements
2. REWRITE the prompt to FORCE the missing elements to appear
3. Add SPECIFIC instructions that address each identified issue
4. Make the prompt more DEMANDING of depth and specificity
5. Include EXAMPLES of what good responses should contain

OUTPUT FORMAT:
Return ONLY the new prompt text. No explanations, no markdown code blocks.
The prompt should be self-contained and ready to use.
Start directly with "## ${category.toUpperCase()} DEEP ANALYSIS PROTOCOL"`;

    console.log(`🧬 Evolving prompt for ${category}...`);
    
    try {
      const result = await callModelDirect(AI_MODELS.claude.id, evolutionRequest,
        'You are a world-class prompt engineer. Output ONLY the improved prompt text, nothing else.');
      
      if (result.text && result.text.length > 500) {
        // Don't save yet - needs validation first
        console.log(`🧬 Generated evolved prompt for ${category} (${result.text.length} chars)`);
        return {
          category,
          newPrompt: result.text,
          oldPrompt: currentPrompt,
          issues: missingElements
        };
      }
    } catch (e) {
      console.error('Evolution failed:', e);
    }
    return null;
  },
  
  // Persist to localStorage
  _persist() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.evolvedPrompts));
      localStorage.setItem(this.historyKey, JSON.stringify(this.promptHistory));
    } catch (e) {
      console.warn('Could not persist prompts:', e);
    }
  },
  
  // Get stats for display
  getStats() {
    const categories = Object.keys(this.evolvedPrompts);
    return {
      evolvedCategories: categories,
      totalEvolutions: categories.reduce((sum, cat) => sum + (this.evolvedPrompts[cat]?.version || 0), 0),
      historyDepth: Object.keys(this.promptHistory).reduce((sum, cat) => sum + (this.promptHistory[cat]?.length || 0), 0)
    };
  }
};

// ════════════════════════════════════════════════════════════════════════════
// PROMPT TESTING & VALIDATION SYSTEM
// Ensures new prompts are actually BETTER before saving
// ════════════════════════════════════════════════════════════════════════════

const PROMPT_TESTING_SYSTEM = {
  // Benchmark questions for each category
  benchmarks: {
    health: {
      question: "I have had chronic digestive issues and fatigue for many years. What does my chart show about the root cause and when might I find relief?",
      requiredElements: ['specific_degrees', 'dasha_sequence', 'body_mapping', 'karmic_root', 'remedies', 'timing'],
      minWords: 800
    },
    finance: {
      question: "I have significant debts and financial struggles. When will this improve and what should I focus on?",
      requiredElements: ['wealth_houses', 'debt_houses', 'dasha_timing', 'remedies', 'practical_steps'],
      minWords: 700
    },
    relationship: {
      question: "I am 45 and still single despite wanting marriage. What is blocking me and when might I find a partner?",
      requiredElements: ['7th_house', 'venus_mars', 'dasha_timing', 'karmic_factors', 'remedies'],
      minWords: 700
    },
    career: {
      question: "I feel stuck in my career with no growth. Should I change jobs or start my own business?",
      requiredElements: ['10th_house', 'business_indicators', 'dasha_timing', 'practical_guidance'],
      minWords: 600
    },
    spiritual: {
      question: "What is my soul's purpose in this life? I feel lost and disconnected from meaning.",
      requiredElements: ['atmakaraka', 'moksha_houses', 'ketu_position', 'spiritual_practices', 'karmic_lessons'],
      minWords: 800
    }
  },
  
  // Score a response based on required elements
  scoreResponse(response, category) {
    const benchmark = this.benchmarks[category];
    if (!benchmark) return { score: 50, details: 'No benchmark for category' };
    
    let score = 0;
    const details = [];
    const text = response.toLowerCase();
    
    // Word count scoring (0-25 points)
    const wordCount = response.split(/\s+/).length;
    if (wordCount >= benchmark.minWords) {
      score += 25;
      details.push(`✓ Word count: ${wordCount} (meets ${benchmark.minWords} minimum)`);
    } else {
      const partial = Math.round((wordCount / benchmark.minWords) * 25);
      score += partial;
      details.push(`△ Word count: ${wordCount} (below ${benchmark.minWords}, ${partial}/25 points)`);
    }
    
    // Specific degrees (0-15 points)
    const degreeMatches = response.match(/\d+°\d*'?/g) || [];
    if (degreeMatches.length >= 3) {
      score += 15;
      details.push(`✓ Specific degrees: ${degreeMatches.length} citations`);
    } else if (degreeMatches.length > 0) {
      score += 8;
      details.push(`△ Specific degrees: only ${degreeMatches.length} citations`);
    } else {
      details.push(`✗ No specific degrees cited`);
    }
    
    // Dasha analysis (0-15 points)
    const dashaDepth = (text.match(/mahādashā|mahadasha|antardasha|bhukti/gi) || []).length;
    const mentionsDashaSequence = /previous.*dasha|dasha.*sequence|dasha.*history|before.*dasha/i.test(text);
    if (dashaDepth >= 3 && mentionsDashaSequence) {
      score += 15;
      details.push(`✓ Dasha analysis: comprehensive (${dashaDepth} mentions + sequence)`);
    } else if (dashaDepth >= 2) {
      score += 10;
      details.push(`△ Dasha analysis: present but shallow`);
    } else {
      details.push(`✗ Dasha analysis: insufficient`);
    }
    
    // House analysis depth (0-15 points)
    const houseMentions = (response.match(/\d+(st|nd|rd|th)\s+house/gi) || []).length;
    const uniqueHouses = new Set((response.match(/\d+(?=st|nd|rd|th)/gi) || []).map(Number)).size;
    if (uniqueHouses >= 4 && houseMentions >= 6) {
      score += 15;
      details.push(`✓ House analysis: ${uniqueHouses} unique houses, ${houseMentions} mentions`);
    } else if (uniqueHouses >= 2) {
      score += 8;
      details.push(`△ House analysis: limited (${uniqueHouses} houses)`);
    } else {
      details.push(`✗ House analysis: minimal`);
    }
    
    // Karmic/spiritual depth (0-10 points)
    const karmaIndicators = /karma|karmic|past.?life|soul|purva punya|spiritual lesson/gi;
    if (karmaIndicators.test(text)) {
      score += 10;
      details.push(`✓ Karmic perspective: included`);
    } else {
      details.push(`✗ Karmic perspective: missing`);
    }
    
    // Remedies (0-10 points)
    const remedyIndicators = /remedy|remedies|gemstone|mantra|charity|worship|fasting/gi;
    const remedyMatches = text.match(remedyIndicators) || [];
    if (remedyMatches.length >= 2) {
      score += 10;
      details.push(`✓ Remedies: ${remedyMatches.length} specific recommendations`);
    } else if (remedyMatches.length === 1) {
      score += 5;
      details.push(`△ Remedies: only 1 mentioned`);
    } else {
      details.push(`✗ Remedies: missing`);
    }
    
    // Timing predictions (0-10 points)
    const timingIndicators = /\d{4}|next \d+ (months?|years?)|upcoming|will (begin|end|improve)|june|july|august/gi;
    if (timingIndicators.test(text)) {
      score += 10;
      details.push(`✓ Timing: specific predictions included`);
    } else {
      details.push(`✗ Timing: no specific predictions`);
    }
    
    return { score, details, maxScore: 100 };
  },
  
  // Run A/B test comparing old prompt vs new prompt
  async runABTest(category, oldPrompt, newPrompt, chartContext) {
    console.log(`🔬 Running A/B test for ${category}...`);
    
    const benchmark = this.benchmarks[category];
    if (!benchmark) {
      console.warn(`No benchmark for ${category}`);
      return null;
    }
    
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    const systemPrompt = `You are a master Vedic astrologer. Today is ${today}. Use ONLY the chart data provided. Cite specific degrees.`;
    
    const buildPrompt = (framework) => `TODAY: ${today}

CHART DATA:
${chartContext}

QUESTION: "${benchmark.question}"

ANALYSIS FRAMEWORK:
${framework}

${DEPTH_ENFORCEMENT_PROMPT}

Provide your complete analysis:`;
    
    // Run both prompts
    const [oldResult, newResult] = await Promise.all([
      callModelDirect(AI_MODELS.claude.id, buildPrompt(oldPrompt), systemPrompt),
      callModelDirect(AI_MODELS.claude.id, buildPrompt(newPrompt), systemPrompt)
    ]);
    
    if (!oldResult.text || !newResult.text) {
      console.error('A/B test failed - one or both prompts produced no response');
      return null;
    }
    
    // Score both responses
    const oldScore = this.scoreResponse(oldResult.text, category);
    const newScore = this.scoreResponse(newResult.text, category);
    
    const result = {
      category,
      oldScore: oldScore.score,
      newScore: newScore.score,
      improvement: newScore.score - oldScore.score,
      isImproved: newScore.score > oldScore.score,
      oldDetails: oldScore.details,
      newDetails: newScore.details,
      oldWordCount: oldResult.text.split(/\s+/).length,
      newWordCount: newResult.text.split(/\s+/).length,
      timestamp: Date.now()
    };
    
    console.log(`📊 A/B Test Results for ${category}:`);
    console.log(`   Old prompt score: ${oldScore.score}/100`);
    console.log(`   New prompt score: ${newScore.score}/100`);
    
    return result;
  },
  
  // Full evolution + validation cycle
  async evolveAndValidate(category, chartContext) {
    console.log(`\n🧬 Starting evolution cycle for ${category}...`);
    
    // Step 1: Generate evolved prompt
    const evolution = await PROMPT_EVOLUTION_SYSTEM.evolvePrompt(category);
    if (!evolution) {
      return null;
    }
    
    // Step 2: A/B test old vs new
    const testResult = await this.runABTest(
      category, 
      evolution.oldPrompt, 
      evolution.newPrompt,
      chartContext
    );
    
    if (!testResult) {
      return null;
    }
    
    // Step 3: If new is better by at least 5 points, save it
    if (testResult.isImproved && testResult.improvement >= 5) {
      PROMPT_EVOLUTION_SYSTEM.savePrompt(category, evolution.newPrompt, {
        validated: true,
        score: testResult.newScore,
        reason: `A/B tested: +${testResult.improvement} improvement`,
        improvements: evolution.issues
      });
      
      console.log(`\n✅ EVOLVED PROMPT SAVED for ${category}!`);
      console.log(`   Score improved from ${testResult.oldScore} → ${testResult.newScore}`);
      return { success: true, ...testResult };
    } else {
      console.log(`\n⚠️ New prompt not significantly better. Keeping current.`);
      console.log(`   Would need +5 improvement, got ${testResult.improvement}`);
      return { success: false, ...testResult };
    }
  },
  
  // Run benchmark test on current prompts (for debugging)
  async benchmarkCategory(category, chartContext) {
    const prompt = PROMPT_EVOLUTION_SYSTEM.getPrompt(category);
    const benchmark = this.benchmarks[category];
    
    if (!benchmark) {
      console.log(`No benchmark defined for ${category}`);
      return null;
    }
    
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    const fullPrompt = `TODAY: ${today}

CHART DATA:
${chartContext}

QUESTION: "${benchmark.question}"

ANALYSIS FRAMEWORK:
${prompt}

${DEPTH_ENFORCEMENT_PROMPT}

Provide your complete analysis:`;

    console.log(`🧪 Benchmarking ${category} prompt...`);
    
    const result = await callModelDirect(AI_MODELS.claude.id, fullPrompt,
      `You are a master Vedic astrologer. Today is ${today}. Use ONLY the chart data provided.`);
    
    if (result.text) {
      const score = this.scoreResponse(result.text, category);
      console.log(`\n📊 Benchmark Results for ${category}:`);
      console.log(`   Score: ${score.score}/100`);
      return { score: score.score, details: score.details, response: result.text };
    }
    
    return null;
  }
};

// Initialize systems
PROMPT_EVOLUTION_SYSTEM.init();

// ════════════════════════════════════════════════════════════════════════════
// SCHEDULED EVOLUTION (runs automatically after enough responses)
// ════════════════════════════════════════════════════════════════════════════

const AUTO_EVOLUTION_CONFIG = {
  minResponsesBeforeEvolution: 10,  // Need 10 responses before trying to evolve
  minDaysBetweenEvolutions: 7,      // Don't evolve same category more than weekly
  evolutionThreshold: 5,            // Need +5 score improvement to save
  
  // Check if we should auto-evolve
  shouldEvolve(category) {
    // Safety checks
    if (!PROMPT_LEARNING_SYSTEM?.learnings?.responses) return false;
    if (!PROMPT_EVOLUTION_SYSTEM?.evolvedPrompts) return false;
    
    const responses = PROMPT_LEARNING_SYSTEM.learnings.responses.filter(r => r.category === category);
    if (responses.length < this.minResponsesBeforeEvolution) return false;
    
    const lastEvolution = PROMPT_EVOLUTION_SYSTEM.evolvedPrompts[category]?.evolvedAt;
    if (lastEvolution) {
      const daysSince = (Date.now() - lastEvolution) / (1000 * 60 * 60 * 24);
      if (daysSince < this.minDaysBetweenEvolutions) return false;
    }
    
    // Check if there are significant missing elements
    const patterns = PROMPT_LEARNING_SYSTEM.learnings.patterns?.[category];
    return patterns?.missingElements?.length >= 2 || (patterns?.avgWordCount && patterns.avgWordCount < 600);
  }
};

// Expose everything globally
window.promptEvolution = PROMPT_EVOLUTION_SYSTEM;
window.promptTesting = PROMPT_TESTING_SYSTEM;
window.evolvePrompt = (category) => PROMPT_EVOLUTION_SYSTEM.evolvePrompt(category);
window.testPrompt = (category) => PROMPT_TESTING_SYSTEM.benchmarkCategory(category, window.getChartContext?.() || 'No chart loaded');
window.evolveAndValidate = (category) => PROMPT_TESTING_SYSTEM.evolveAndValidate(category, window.getChartContext?.() || 'No chart loaded');
window.rollbackPrompt = (category) => PROMPT_EVOLUTION_SYSTEM.rollback(category);
window.promptVersions = () => {
  for (const cat of Object.keys(DEEP_ANALYSIS_FRAMEWORKS)) {
    const evolved = PROMPT_EVOLUTION_SYSTEM.evolvedPrompts[cat];
    if (evolved) {
      console.log(`   ${cat}: v${evolved.version} (evolved ${new Date(evolved.evolvedAt).toLocaleDateString()}, score: ${evolved.validationScore || 'n/a'})`);
    } else {
      console.log(`   ${cat}: v0 (base prompt)`);
    }
  }
};


// ════════════════════════════════════════════════════════════════════════════
// SELF-LEARNING PROMPT OPTIMIZATION SYSTEM
// ════════════════════════════════════════════════════════════════════════════

const PROMPT_LEARNING_SYSTEM = {
  // Store for learning data
  storageKey: 'jyoti_prompt_learnings',
  learnings: { responses: [], patterns: {}, improvements: [], version: 1, lastOptimized: null },  // Default
  
  // Initialize or load existing learnings
  init() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.learnings = JSON.parse(stored);
      } else {
        this.learnings = {
          responses: [],
          patterns: {},
          improvements: [],
          version: 1,
          lastOptimized: null
        };
      }
    } catch (e) {
      console.warn('Could not load prompt learnings:', e);
      this.learnings = { responses: [], patterns: {}, improvements: [], version: 1 };
    }
    return this;
  },
  
  // Record a response for learning
  recordResponse(category, question, response, userFeedback = null) {
    // Safety check
    if (!this.learnings) this.learnings = { responses: [], patterns: {}, improvements: [], version: 1 };
    if (!this.learnings.responses) this.learnings.responses = [];
    
    const record = {
      timestamp: Date.now(),
      category,
      question,
      responseLength: response.length,
      wordCount: response.split(/\s+/).length,
      hasSpecificDegrees: /\d+°\d+'/.test(response),
      mentionsDashas: /dasha|mahādashā|antardashā/i.test(response),
      mentionsHouses: (response.match(/\d+(st|nd|rd|th)\s+house/gi) || []).length,
      mentionsPlanets: (response.match(/Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu/g) || []).length,
      mentionsRemedies: /remedy|remedies|gemstone|mantra|charity/i.test(response),
      mentionsTiming: /when|timing|period|upcoming|next/i.test(response),
      mentionsKarma: /karma|karmic|past life|past-life/i.test(response),
      userFeedback // null, 'positive', 'negative'
    };
    
    this.learnings.responses.push(record);
    
    // Keep only last 100 responses
    if (this.learnings.responses.length > 100) {
      this.learnings.responses = this.learnings.responses.slice(-100);
    }
    
    // Update patterns
    this.updatePatterns(category, record);
    
    // Save
    this.save();
    
    return record;
  },
  
  // Update learned patterns
  updatePatterns(category, record) {
    // Safety check
    if (!this.learnings) this.learnings = { responses: [], patterns: {}, improvements: [], version: 1 };
    if (!this.learnings.patterns) this.learnings.patterns = {};
    
    if (!this.learnings.patterns[category]) {
      this.learnings.patterns[category] = {
        avgWordCount: 0,
        avgHouseMentions: 0,
        avgPlanetMentions: 0,
        successfulPatterns: [],
        missingElements: []
      };
    }
    
    const p = this.learnings.patterns[category];
    const responses = (this.learnings.responses || []).filter(r => r.category === category);
    
    // Avoid division by zero
    if (responses.length === 0) return;
    
    // Calculate averages
    p.avgWordCount = Math.round(responses.reduce((s, r) => s + (r.wordCount || 0), 0) / responses.length);
    p.avgHouseMentions = Math.round(responses.reduce((s, r) => s + (r.mentionsHouses || 0), 0) / responses.length);
    p.avgPlanetMentions = Math.round(responses.reduce((s, r) => s + (r.mentionsPlanets || 0), 0) / responses.length);
    
    // Track what's often missing
    const missing = [];
    if (responses.filter(r => !r.hasSpecificDegrees).length > responses.length * 0.5) {
      missing.push('specific_degrees');
    }
    if (responses.filter(r => !r.mentionsDashas).length > responses.length * 0.3) {
      missing.push('dasha_analysis');
    }
    if (responses.filter(r => !r.mentionsRemedies).length > responses.length * 0.4) {
      missing.push('remedies');
    }
    if (responses.filter(r => !r.mentionsKarma).length > responses.length * 0.5) {
      missing.push('karmic_perspective');
    }
    p.missingElements = missing;
  },
  
  // Generate improvement suggestions
  generateImprovements() {
    const improvements = [];
    
    // Safety check
    if (!this.learnings?.patterns) return improvements;
    
    for (const [category, patterns] of Object.entries(this.learnings.patterns)) {
      const missing = patterns?.missingElements || [];
      
      if (missing.includes('specific_degrees')) {
        improvements.push({
          category,
          issue: 'Responses lack specific planetary degrees',
          suggestion: 'Add to prompt: "ALWAYS cite exact degrees, e.g., Moon at 5°16\' Virgo"'
        });
      }
      if (missing.includes('dasha_analysis')) {
        improvements.push({
          category,
          issue: 'Dasha analysis often missing',
          suggestion: 'Add to prompt: "MANDATORY: Trace dasha sequence — past, present, future"'
        });
      }
      if (missing.includes('remedies')) {
        improvements.push({
          category,
          issue: 'Remedies frequently omitted',
          suggestion: 'Add to prompt: "Every response MUST end with specific remedial measures"'
        });
      }
      if ((patterns?.avgWordCount || 0) < 500) {
        improvements.push({
          category,
          issue: `Responses too short (avg ${patterns?.avgWordCount || 0} words)`,
          suggestion: 'Add to prompt: "Minimum 800 words for this category. Depth over brevity."'
        });
      }
    }
    
    this.learnings.improvements = improvements;
    this.save();
    
    return improvements;
  },
  
  // AI-powered prompt rewriting (uses Claude to analyze and improve)
  async optimizePrompts() {
    if (!this.learnings?.responses || this.learnings.responses.length < 10) {
      return null;
    }
    
    const analysis = this.generateImprovements();
    
    const optimizationPrompt = `You are a prompt engineering expert. Analyze these patterns from a Vedic astrology app and suggest improved prompts.

CURRENT RESPONSE PATTERNS:
${JSON.stringify(this.learnings.patterns, null, 2)}

IDENTIFIED ISSUES:
${analysis.map(a => `- ${a.category}: ${a.issue}`).join('\n')}

CURRENT PROMPT FRAMEWORK BEING USED:
${DEPTH_ENFORCEMENT_PROMPT}

YOUR TASK:
1. Identify what's causing shallow responses
2. Suggest 3-5 specific prompt additions that would force deeper analysis
3. For each category with issues, provide an enhanced prompt section

Format your response as JSON:
{
  "global_additions": ["addition1", "addition2"],
  "category_enhancements": {
    "health": "enhanced prompt text",
    "finance": "enhanced prompt text"
  },
  "new_enforcement_rules": ["rule1", "rule2"]
}`;

    try {
      const result = await callModelDirect(AI_MODELS.claude.id, optimizationPrompt, 
        'You are an expert in prompt engineering for AI systems. Respond only with valid JSON.');
      
      if (result.text) {
        const suggestions = JSON.parse(result.text.replace(/```json|```/g, '').trim());
        this.learnings.lastOptimized = Date.now();
        this.learnings.optimizationSuggestions = suggestions;
        this.save();
        return suggestions;
      }
    } catch (e) {
      console.warn('Prompt optimization failed:', e);
    }
    
    return null;
  },
  
  // Get enhanced prompt for a category - NOW USES EVOLVED PROMPTS!
  getEnhancedPrompt(category) {
    // FIRST: Check if we have an evolved (and validated) prompt
    const evolvedPrompt = PROMPT_EVOLUTION_SYSTEM.getPrompt(category);
    
    // If it's an evolved prompt (not base), use it directly
    if (PROMPT_EVOLUTION_SYSTEM?.evolvedPrompts?.[category]?.validated) {
      console.log(`🧬 Using evolved prompt for ${category} v${PROMPT_EVOLUTION_SYSTEM.evolvedPrompts[category].version}`);
      return evolvedPrompt;
    }
    
    // Otherwise, use base prompt with dynamic enhancements
    let enhanced = evolvedPrompt;
    
    // Add learned improvements based on recent response patterns
    const missing = this.learnings?.patterns?.[category]?.missingElements || [];
    
    if (missing.includes('specific_degrees')) {
      enhanced += '\n\n⚠️ CRITICAL: You MUST cite exact planetary degrees (e.g., "Sun at 28°10\' Aries")';
    }
    if (missing.includes('karmic_perspective')) {
      enhanced += '\n\n⚠️ MANDATORY: Include karmic/past-life perspective for this question.';
    }
    if (missing.includes('remedies')) {
      enhanced += '\n\n⚠️ REQUIRED: End with specific remedies (gemstones, mantras, actions).';
    }
    if (missing.includes('dasha_analysis')) {
      enhanced += '\n\n⚠️ ESSENTIAL: Trace the complete dasha sequence - past, present, and future.';
    }
    
    // Add optimization suggestions if available
    if (this.learnings?.optimizationSuggestions?.category_enhancements?.[category]) {
      enhanced += '\n\n' + this.learnings.optimizationSuggestions.category_enhancements[category];
    }
    
    // Check if we should trigger auto-evolution
    try {
      if (AUTO_EVOLUTION_CONFIG.shouldEvolve(category)) {
        console.log(`🧬 ${category} is eligible for evolution. Run evolveAndValidate("${category}") to improve prompts.`);
      }
    } catch (e) {
      // Ignore evolution check errors
    }
    
    return enhanced;
  },
  
  // Record user feedback (thumbs up/down)
  recordFeedback(responseId, isPositive) {
    if (!this.learnings?.responses) return;
    const response = this.learnings.responses.find(r => r.timestamp === responseId);
    if (response) {
      response.userFeedback = isPositive ? 'positive' : 'negative';
      this.save();
    }
  },
  
  // Save to localStorage
  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.learnings));
    } catch (e) {
      console.warn('Could not save prompt learnings:', e);
    }
  },
  
  // Get learning stats for display
  getStats() {
    return {
      totalResponses: this.learnings.responses.length,
      categoriesTracked: Object.keys(this.learnings.patterns).length,
      improvementsSuggested: this.learnings.improvements.length,
      lastOptimized: this.learnings.lastOptimized 
        ? new Date(this.learnings.lastOptimized).toLocaleDateString() 
        : 'Never',
      version: this.learnings.version
    };
  }
};

// Initialize learning system
PROMPT_LEARNING_SYSTEM.init();

// Expose for console access
window.promptLearning = PROMPT_LEARNING_SYSTEM;
window.optimizePrompts = () => PROMPT_LEARNING_SYSTEM.optimizePrompts();
window.promptStats = () => PROMPT_LEARNING_SYSTEM.getStats();
window.getChartContext = () => buildChartContext();


// ════════════════════════════════════════════════════════════════════════════
// CATEGORY DETECTION
// ════════════════════════════════════════════════════════════════════════════

function detectQuestionCategory(question) {
  const q = question.toLowerCase();
  
  // Health keywords
  if (/health|pain|disease|illness|sick|body|chronic|medical|doctor|hospital|cure|heal|symptom|suffer|autoimmune|immune|stomach|nerve|blood|liver|kidney|heart|mental|anxiety|depression/.test(q)) {
    return 'health';
  }
  
  // Finance keywords
  if (/money|wealth|finance|debt|income|salary|investment|property|real estate|business|profit|loss|bankrupt|rich|poor|savings|loan|credit|stock|crypto/.test(q)) {
    return 'finance';
  }
  
  // Relationship keywords
  if (/marriage|relationship|partner|spouse|husband|wife|love|romance|dating|divorce|breakup|soulmate|compatible|affair|ex-|boyfriend|girlfriend/.test(q)) {
    return 'relationship';
  }
  
  // Career keywords
  if (/career|job|work|profession|promotion|business|employ|boss|colleague|resign|fired|hire|office|company|interview/.test(q)) {
    return 'career';
  }
  
  // Spiritual keywords
  if (/spiritual|purpose|soul|karma|past life|meditation|enlighten|moksha|dharma|meaning|why am i|life purpose|destiny|divine|god|guru/.test(q)) {
    return 'spiritual';
  }
  
  // Family keywords
  if (/child|parent|mother|father|son|daughter|sibling|brother|sister|family|ancestor|pregnancy|fertility|conceive/.test(q)) {
    return 'family';
  }
  
  // Travel keywords
  if (/travel|abroad|foreign|relocat|move|immigra|visa|country|settle|overseas/.test(q)) {
    return 'travel';
  }
  
  // Education keywords
  if (/education|study|degree|exam|university|college|learn|school|academic|course|PhD|masters/.test(q)) {
    return 'education';
  }
  
  // Property keywords
  if (/property|house|home|land|real estate|buy|sell|construction|apartment|flat/.test(q)) {
    return 'property';
  }
  
  // Default to timing/general
  return 'timing';
}

// Oracle Council: Query 3 models in parallel, then synthesize
async function askOracleCouncil(question, chartContext) {
  // Get current date for temporal grounding
  const today = new Date();
  const currentDate = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  // Detect question category for topic-specific prompting
  const category = detectQuestionCategory(question);
  
  // Get the deep analysis framework for this category
  const topicFramework = PROMPT_LEARNING_SYSTEM.getEnhancedPrompt(category);
  
  const councilSystemPrompt = `You are a master Vedic astrologer (Jyotishi) with 40+ years of experience. You are known for EXCEPTIONALLY DEEP readings that leave nothing unexplored.

⚠️ ABSOLUTE RULES — VIOLATION IS FAILURE:

1. ONLY USE DATA FROM THE CHART BELOW. Do NOT guess, assume, or hallucinate any planetary positions.
2. If a planet's position is not explicitly stated, DO NOT mention it.
3. TODAY IS: ${currentDate}. Never reference past dates as future.
4. Quote exact positions WITH DEGREES: "Sun at 28°10' Aries in 9th house" not "Sun in Aries"
5. Every claim must trace back to the provided chart data.
6. Go DEEP. Surface-level readings are unacceptable. The querent deserves mastery-level analysis.

You do NOT have access to ephemeris data. You CANNOT calculate positions yourself. Trust ONLY what is written in the chart data.

${DEPTH_ENFORCEMENT_PROMPT}`;

  const councilPrompt = `TODAY'S DATE: ${currentDate}

═══════════════════════════════════════════════════════════════════════════════
BIRTH CHART DATA (USE ONLY THIS DATA — CITE EXACT DEGREES)
═══════════════════════════════════════════════════════════════════════════════
${chartContext}
═══════════════════════════════════════════════════════════════════════════════

QUERENT'S QUESTION: "${question}"
DETECTED CATEGORY: ${category.toUpperCase()}

═══════════════════════════════════════════════════════════════════════════════
MANDATORY DEEP ANALYSIS FRAMEWORK FOR ${category.toUpperCase()}
═══════════════════════════════════════════════════════════════════════════════
${topicFramework}
═══════════════════════════════════════════════════════════════════════════════

ANALYSIS REQUIREMENTS:

1. COMPLETE THE FRAMEWORK ABOVE — Every layer must be addressed
2. CITE EXACT DEGREES from the chart data (e.g., "Moon at 5°16' Virgo")
3. TRACE DASHA HISTORY — Not just current dasha, but the SEQUENCE and patterns
4. MULTIPLE HOUSE ANALYSIS — Check from Lagna, Moon, and relevant karaka
5. KARMIC PERSPECTIVE — Why is this happening at soul level?
6. TIMING — When did it start, when will it shift, what's next?
7. REMEDIES — Specific, actionable, tied to the analysis

MINIMUM RESPONSE: 800 words for this category. Depth over brevity.

⚠️ DO NOT invent positions. If uncertain, say "the chart shows..." and quote directly.

BEGIN YOUR DEEP ANALYSIS:`;

  // Query all 3 models in parallel
  const startTime = Date.now();
  
  const [claudeResult, gptResult, geminiResult] = await Promise.all([
    callModelDirect(AI_MODELS.claude.id, councilPrompt, councilSystemPrompt),
    callModelDirect(AI_MODELS.gpt5.id, councilPrompt, councilSystemPrompt),
    callModelDirect(AI_MODELS.gemini.id, councilPrompt, councilSystemPrompt)
  ]);
  
  
  // Collect successful responses
  const responses = [];
  if (claudeResult.text) responses.push({ model: 'Claude', text: claudeResult.text });
  if (gptResult.text) responses.push({ model: 'GPT-5.2', text: gptResult.text });
  if (geminiResult.text) responses.push({ model: 'Gemini', text: geminiResult.text });
  
  if (responses.length === 0) {
    return { text: null, error: 'All council members failed to respond. Check your API credits.' };
  }
  
  if (responses.length === 1) {
    // Only one succeeded, return it directly
    // Record for learning
    PROMPT_LEARNING_SYSTEM.recordResponse(category, question, responses[0].text);
    return { text: responses[0].text, model: responses[0].model + ' (solo)', councilSize: 1, category };
  }
  
  // Synthesize with Claude - enhanced prompt with fact-checking and depth requirements
  const synthesisPrompt = `You are the Oracle Synthesizer — a master astrologer creating the ULTIMATE unified reading from multiple expert analyses.

TODAY: ${currentDate}
QUESTION CATEGORY: ${category.toUpperCase()}

═══════════════════════════════════════════════════════════════════════════════
ORIGINAL CHART DATA (SOURCE OF TRUTH — VERIFY ALL CLAIMS AGAINST THIS)
═══════════════════════════════════════════════════════════════════════════════
${chartContext}
═══════════════════════════════════════════════════════════════════════════════

THE QUERENT'S QUESTION: "${question}"

EXPERT ANALYSES TO SYNTHESIZE:

--- CLAUDE'S ANALYSIS ---
${responses.find(r => r.model === 'Claude')?.text || '[Did not respond]'}

--- GPT-5.2'S ANALYSIS ---
${responses.find(r => r.model === 'GPT-5.2')?.text || '[Did not respond]'}

--- GEMINI'S ANALYSIS ---
${responses.find(r => r.model === 'Gemini')?.text || '[Did not respond]'}

═══════════════════════════════════════════════════════════════════════════════
YOUR SYNTHESIS MISSION:
═══════════════════════════════════════════════════════════════════════════════

1. **FACT-CHECK EVERY CLAIM** against the original chart data
   - Remove any invented positions
   - Flag any contradictions between experts
   - Keep only verifiable insights

2. **EXTRACT THE DEEPEST INSIGHTS** from each expert
   - What unique perspective did each bring?
   - What did one catch that others missed?
   - Where do all three agree? (High confidence)

3. **CREATE A UNIFIED MASTERPIECE** that is BETTER than any single response
   - Comprehensive structure following the ${category} framework
   - All layers of analysis covered
   - Specific degrees cited throughout
   - Dasha sequence fully traced
   - Karmic perspective included
   - Clear timing predictions
   - Actionable remedies at the end

4. **DEPTH REQUIREMENTS**
   - Minimum 1000 words
   - Every major claim supported by chart evidence
   - Spiritual AND practical perspectives
   - Past, present, AND future covered

5. **FORMAT**
   - Use clear headers for each section
   - Bold key insights
   - End with "Summary & Next Steps"

Create the reading the querent DESERVES — one that changes how they understand their life.`;

  const synthesisSystemPrompt = `You are the Oracle Synthesizer — the final voice of wisdom that unifies multiple expert astrological analyses into one masterpiece. Today is ${currentDate}. You prioritize accuracy, depth, and transformative insight. MINIMUM 1000 words.`;

  const synthesis = await callModelDirect(AI_MODELS.claude.id, synthesisPrompt, synthesisSystemPrompt);
  
  if (synthesis.text) {
    // Record for learning system
    PROMPT_LEARNING_SYSTEM.recordResponse(category, question, synthesis.text);
    
    return { 
      text: synthesis.text, 
      model: `Oracle Council (${responses.length} voices)`,
      councilSize: responses.length,
      individualResponses: responses,
      category,
      responseId: Date.now()
    };
  } else {
    // Fallback: return the first successful response
    PROMPT_LEARNING_SYSTEM.recordResponse(category, question, responses[0].text);
    return { 
      text: responses[0].text, 
      model: responses[0].model + ' (council synthesis failed)',
      councilSize: responses.length,
      category
    };
  }
}

// Check if API key is configured
function hasApiKey() {
  return !!openRouterKey;
}

// Save API key
window.saveOpenRouterKey = function(key) {
  openRouterKey = key;
  localStorage.setItem('openrouter_api_key', key);
  console.log('✓ OpenRouter API key saved');
  // Refresh current section
  const activeSection = document.querySelector('.nav-pill.active')?.dataset.section;
  if (activeSection) showSection(activeSection);
};

// Select model
window.selectAIModel = function(modelKey) {
  selectedModel = modelKey;
  localStorage.setItem('selected_ai_model', modelKey);
  document.querySelectorAll('.model-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.model === modelKey);
  });
};

// Call OpenRouter API (works from browser!)
async function callAI(prompt, systemPrompt = '') {
  if (!openRouterKey) {
    return { text: null, needsKey: true };
  }
  
  const model = AI_MODELS[selectedModel] || AI_MODELS.claude;
  
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout
  
  try {
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openRouterKey}`,
        'HTTP-Referer': window.location.href,
        'X-Title': 'JYOTI - Science of Light'
      },
      body: JSON.stringify({
        model: model.id,
        messages: messages,
        max_tokens: 4000,
        temperature: 0.7
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenRouter Error:', response.status, errorData);
      
      if (response.status === 401) {
        return { text: null, error: 'Invalid API key. Please check your OpenRouter key.' };
      }
      if (response.status === 402) {
        return { text: null, error: 'Insufficient credits for this model. Try a FREE model (Llama, Gemma, or Qwen) or add credits at openrouter.ai' };
      }
      return { text: null, error: errorData.error?.message || `API Error: ${response.status}` };
    }
    
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    
    return { 
      text: text || null,
      model: model.name,
      usage: data.usage
    };
    
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return { text: null, error: 'Request timed out after 90 seconds. The AI may be overloaded - try again.' };
    }
    console.error('AI API error:', error);
    return { text: null, error: error.message };
  }
}

// The JYOTI Oracle System Prompt
const JYOTI_SYSTEM_PROMPT = `You are JYOTI, a contemplative Vedic astrology oracle with deep expertise in classical Jyotish. You combine profound knowledge of Parashara, Jaimini, and Bhrigu systems with psychological wisdom and empowering language.

Your approach:
- Reference SPECIFIC chart positions by name (planets, signs, houses, nakshatras)
- Consider house lordships, planetary dignities, aspects (drishti), and nakshatra influences
- Include timing guidance based on current and upcoming Dasha periods
- Use empowering language: "You have capacity for..." not "You will..."
- Frame all challenges as growth opportunities
- Never say "bad placement" — say "intensive learning area"
- Reference nakshatra symbolism and planetary karakas where relevant
- Be specific, grounded, wise, and always reference actual chart positions

You are compassionate yet precise, spiritual yet practical.`;

// Build chart context for AI
function buildChartContext() {
  if (!chartData) return 'NO CHART DATA AVAILABLE. Please calculate a chart first.';
  
  const c = chartData;
  const moon = c.planets.find(p => p.name === 'Moon');
  const sun = c.planets.find(p => p.name === 'Sun');
  const ak = c.planets.find(p => p.name === c.atmakaraka);
  
  // Calculate remaining time in current Mahādashā
  const now = new Date();
  const mahaEnd = new Date(c.dasha.maha.end);
  const remainingMs = mahaEnd - now;
  const remainingYears = (remainingMs / (365.25 * 24 * 60 * 60 * 1000)).toFixed(1);
  const remainingMonths = Math.round(remainingMs / (30.44 * 24 * 60 * 60 * 1000));
  
  // Find next Mahādashā
  const currentMahaIdx = c.dasha.allPeriods.findIndex(p => 
    now >= p.start && now < p.end
  );
  const nextMaha = c.dasha.allPeriods[currentMahaIdx + 1];
  
  // Determine lagna lord
  const lagnaLords = {0:'Mars',1:'Venus',2:'Mercury',3:'Moon',4:'Sun',5:'Mercury',6:'Venus',7:'Mars',8:'Jupiter',9:'Saturn',10:'Saturn',11:'Jupiter'};
  const lagnaLord = lagnaLords[c.lagna];
  const lagnaLordPlanet = c.planets.find(p => p.name === lagnaLord);
  
  return `
████████████████████████████████████████████████████████████████
█                                                              █
█   ⚠️⚠️⚠️  VERIFIED CHART DATA — MUST USE EXACTLY  ⚠️⚠️⚠️      █
█                                                              █
████████████████████████████████████████████████████████████████

QUERENT: ${c.name}
Birth: ${c.dob} at ${c.tob} in ${c.place}

╔══════════════════════════════════════════════════════════════╗
║  🔴 MANDATORY: ASCENDANT IS ${SIGNS[c.lagna].toUpperCase()}                      
║                                                              
║  The Ascendant (Lagna) is ${SIGNS[c.lagna]}.                            
║  Nakshatra: ${NAKSHATRAS[c.lagnaNakshatra]}                              
║  Lagna Lord: ${lagnaLord} in ${ordinal(lagnaLordPlanet?.house||1)} house                       
╚══════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════╗
║  🔴 MANDATORY FACT #2: HOUSE-SIGN MAPPING                    
║                                                              
║  1st house = ${SIGNS[c.lagna].padEnd(12)} (Ascendant)                    
║  2nd house = ${SIGNS[(c.lagna + 1) % 12].padEnd(12)} (NOT ${SIGNS[c.lagna]}!)              
║  3rd house = ${SIGNS[(c.lagna + 2) % 12].padEnd(12)}                                 
║  4th house = ${SIGNS[(c.lagna + 3) % 12].padEnd(12)}                                 
║  5th house = ${SIGNS[(c.lagna + 4) % 12].padEnd(12)}                                 
║  6th house = ${SIGNS[(c.lagna + 5) % 12].padEnd(12)}                                 
║  7th house = ${SIGNS[(c.lagna + 6) % 12].padEnd(12)}                                 
║  8th house = ${SIGNS[(c.lagna + 7) % 12].padEnd(12)}                                 
║  9th house = ${SIGNS[(c.lagna + 8) % 12].padEnd(12)}                                 
║  10th house= ${SIGNS[(c.lagna + 9) % 12].padEnd(12)}                                 
║  11th house= ${SIGNS[(c.lagna + 10) % 12].padEnd(12)}                                
║  12th house= ${SIGNS[(c.lagna + 11) % 12].padEnd(12)}                                
╚══════════════════════════════════════════════════════════════╝

ĀTMAKĀRAKA (Soul Significator): ${c.atmakaraka} at ${fmtDeg(ak?.degree||0)} in ${ordinal(ak?.house||1)} house
Sun: ${SIGNS[sun.sign]} ${fmtDeg(sun.degree)}${sun.exalted?' [EXALTED]':''}${sun.debilitated?' [DEBILITATED]':''}
Moon: ${SIGNS[moon.sign]} ${fmtDeg(moon.degree)} (${NAKSHATRAS[moon.nakshatra]})

CURRENT TIMING:
━━━━━━━━━━━━━━
Mahādashā: ${c.dasha.maha.planet} (${fmtDate(c.dasha.maha.start)} to ${fmtDate(c.dasha.maha.end)})
Time remaining: ~${remainingMonths} months (${remainingYears} years)
${nextMaha ? `Next Mahādashā: ${nextMaha.planet} begins ${fmtDate(nextMaha.start)}` : ''}

ALL PLANETARY POSITIONS (Sidereal/Lahiri):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${c.planets.map(p => 
  `${p.name.padEnd(8)}: ${SIGNS[p.sign].padEnd(12)} ${fmtDeg(p.degree).padEnd(8)} ${ordinal(p.house).padEnd(5)}house | ${NAKSHATRAS[p.nakshatra]}${p.exalted?' ✦EXALTED':''}${p.debilitated?' ⚠DEBILITATED':''}${p.retro?' ℞RETRO':''}${p.ownSign?' 🏠OWN':''}${p.isAK?' ★AK':''}`
).join('\n')}

HOUSE LORDSHIPS (from ${SIGNS[c.lagna]} Lagna):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${[1,2,3,4,5,6,7,8,9,10,11,12].map(h => {
  const sign = (c.lagna + h - 1) % 12;
  const lords = {0:'Mars',1:'Venus',2:'Mercury',3:'Moon',4:'Sun',5:'Mercury',6:'Venus',7:'Mars',8:'Jupiter',9:'Saturn',10:'Saturn',11:'Jupiter'};
  const lord = lords[sign];
  const lordP = c.planets.find(p => p.name === lord);
  const dignity = lordP?.exalted ? ' ✦EXALTED' : lordP?.debilitated ? ' ⚠DEBILITATED' : lordP?.ownSign ? ' 🏠OWN' : '';
  return `${ordinal(h).padEnd(5)}= ${SIGNS[sign].padEnd(12)} | Lord: ${lord.padEnd(8)} in ${ordinal(lordP?.house||1)} house${dignity}`;
}).join('\n')}

████████████████████████████████████████████████████████████████
█  VERIFIED: Ascendant is ${SIGNS[c.lagna].toUpperCase()}, ruled by ${lagnaLord.toUpperCase()}.    
████████████████████████████████████████████████████████████████`
}

// ════════════════════════════════════════════════════════════════════════════
// RENDER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

// Deep Learning Section
let currentLesson = 'intro';

function renderLearn() {
  const lesson = JYOTI_LESSONS[currentLesson];
  const lessonKeys = Object.keys(JYOTI_LESSONS);
  const currentIndex = lessonKeys.indexOf(currentLesson);
  
  return `
    <div class="card" style="position: relative; overflow: hidden; background: linear-gradient(180deg, var(--bg-card) 0%, rgba(201,162,39,0.03) 100%);">
      <!-- Sanskrit watermark -->
      <span style="position: absolute; top: 20px; right: 30px; font-family: 'Noto Sans Devanagari', sans-serif; font-size: 6rem; font-weight: 200; color: var(--gold); opacity: 0.04; pointer-events: none; line-height: 1;">विद्या</span>
      
      <div class="card-header" style="text-align: center; position: relative; z-index: 1;">
        <p class="whisper">The Path of Knowledge</p>
        <h2 class="display-lg" style="color: var(--prussian);">Learn Jyotish</h2>
      </div>
      
      <!-- Progress Bar -->
      <div style="max-width: 400px; margin: 0 auto var(--space-lg);">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-size: 0.7rem; color: var(--text-muted);">Progress</span>
          <span style="font-size: 0.7rem; color: var(--gold);">${currentIndex + 1} of ${lessonKeys.length}</span>
        </div>
        <div style="height: 4px; background: var(--stone-soft); border-radius: 2px; overflow: hidden;">
          <div style="height: 100%; width: ${((currentIndex + 1) / lessonKeys.length) * 100}%; background: linear-gradient(90deg, var(--gold) 0%, var(--prussian) 100%); border-radius: 2px; transition: width 0.5s ease;"></div>
        </div>
      </div>
      
      <!-- Lesson Tabs - Visual -->
      <div style="display: flex; justify-content: center; gap: 8px; margin-bottom: var(--space-lg); flex-wrap: wrap;">
        ${lessonKeys.map((key, i) => `
          <button onclick="navigateLesson('${key}')"
                  style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid ${key === currentLesson ? 'var(--gold)' : 'var(--border)'}; 
                         background: ${key === currentLesson ? 'linear-gradient(135deg, var(--gold) 0%, #d4a84b 100%)' : 'white'}; 
                         color: ${key === currentLesson ? 'white' : 'var(--text-muted)'}; 
                         font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.3s;
                         ${i < currentIndex ? 'background: var(--teal); border-color: var(--teal); color: white;' : ''}">
            ${i < currentIndex ? '✓' : (i + 1)}
          </button>
        `).join('')}
      </div>
      
      <!-- Main Lesson Content -->
      <div style="max-width: 700px; margin: 0 auto; padding: var(--space-lg); background: white; border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: var(--space-lg); padding-bottom: var(--space-lg); border-bottom: 1px solid var(--border);">
          <h3 style="font-size: 1.6rem; color: var(--prussian); margin-bottom: 12px; font-weight: 500;">${lesson.title}</h3>
          <p style="font-size: 0.95rem; color: var(--gold); font-style: italic;">${lesson.subtitle}</p>
        </div>
        
        <div class="lesson-body" style="font-family: var(--font-body); line-height: 2; color: var(--ink-soft); font-size: 1rem;">
          ${lesson.content}
        </div>
      </div>
      
      <!-- Navigation -->
      <div style="display: flex; justify-content: space-between; align-items: center; max-width: 700px; margin: var(--space-lg) auto 0;">
        <button onclick="navigateLesson('${lessonKeys[currentIndex - 1] || ''}')"
                style="padding: 12px 24px; border-radius: 100px; border: 1px solid var(--border); background: white; color: var(--text-muted); font-size: 0.85rem; cursor: pointer; transition: all 0.2s;"
                ${currentIndex === 0 ? 'disabled style="opacity: 0.3; cursor: not-allowed; padding: 12px 24px; border-radius: 100px; border: 1px solid var(--border); background: white; color: var(--text-muted); font-size: 0.85rem;"' : ''}>
          ← Previous
        </button>
        
        ${lesson.nextLesson ? `
          <button onclick="navigateLesson('${lesson.nextLesson}')"
                  style="padding: 12px 24px; border-radius: 100px; border: none; background: linear-gradient(135deg, var(--prussian) 0%, #2a7a9c 100%); color: white; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 15px rgba(26, 95, 122, 0.3);">
            Continue →
          </button>
        ` : `
          <button onclick="showSection('overview')"
                  style="padding: 12px 24px; border-radius: 100px; border: none; background: linear-gradient(135deg, var(--gold) 0%, #d4a84b 100%); color: white; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 15px rgba(201, 162, 39, 0.3);">
            View Your Chart ✦
          </button>
        `}
      </div>
    </div>
  `;
}

window.navigateLesson = function(lessonKey) {
  if (lessonKey && JYOTI_LESSONS[lessonKey]) {
    currentLesson = lessonKey;
    showSection('learn');
  }
};

// Enhanced overview chart with breathing, tooltips, and navigation
function renderOverviewChartInner(c, layout) {
  // Use enhanced version if available
  if (typeof window.renderEnhancedOverviewChart === 'function') {
    return window.renderEnhancedOverviewChart();
  }

  // Fallback to basic version
  const dashaPlanet = c.dasha?.maha?.planet || 'Saturn';

  return `
    <div class="si-chart-interactive overview-chart-breathing" data-dasha="${dashaPlanet}">
      ${layout.map((signOffset, idx) => {
        if (signOffset === null) {
          return '<div class="chart-cell-interactive empty"></div>';
        }
        const sign = (c.lagna + signOffset) % 12;
        const houseNum = signOffset + 1;
        const planetsHere = c.planets.filter(p => p.house === houseNum);
        const isLagna = signOffset === 0;

        return '<div class="chart-cell-interactive' + (isLagna ? ' lagna' : '') + '" onclick="showHouseModal(' + houseNum + ')" data-house="' + houseNum + '"><span class="cell-house-num">' + houseNum + '</span><span class="cell-sign-interactive">' + SIGNS[sign] + '</span><div class="cell-planets-interactive">' + planetsHere.map(p => '<span class="planet-glyph-interactive' + (p.exalted ? ' exalted' : '') + (p.debilitated ? ' debilitated' : '') + (p.isAK ? ' ak' : '') + '" onclick="event.stopPropagation(); showPlanetModal(\'' + p.name + '\')" title="' + p.name + '">' + p.glyph + '</span>').join('') + '</div></div>';
      }).join('')}
    </div>
    <p style="text-align: center; font-size: 0.65rem; color: var(--text-muted); margin-top: 12px;">
      Click any cell to explore • Hover for quick info
    </p>
  `;
}

function renderOverview() {
  const c = chartData;
  const moon = c.planets.find(p => p.name === 'Moon');
  const sun = c.planets.find(p => p.name === 'Sun');
  const ak = c.planets.find(p => p.name === c.atmakaraka);
  const theme = DASHA_THEMES[c.dasha.maha.planet];
  
  // Calculate dasha progress
  const now = new Date();
  const mahaStart = new Date(c.dasha.maha.start);
  const mahaEnd = new Date(c.dasha.maha.end);
  const totalMs = mahaEnd - mahaStart;
  const elapsedMs = now - mahaStart;
  const progress = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
  const remainingYears = ((mahaEnd - now) / (365.25 * 24 * 60 * 60 * 1000)).toFixed(1);
  
  // Mini chart layout
  const layout = [11,0,1,2,10,null,null,3,9,null,null,4,8,7,6,5];
  
  return `
    <div class="card" style="background: transparent; border: none; box-shadow: none; padding: 0;">
      <div class="card-header" style="text-align: center; margin-bottom: 24px;">
        <p class="whisper">Chart Overview</p>
        <h2 class="display-lg" style="color: var(--prussian);">${c.name}</h2>
        <p class="body-sm">${c.dob} at ${c.tob} • ${c.place}</p>
      </div>
      
      <div class="bento-grid">
        <!-- Ascendant Card -->
        <div class="bento-card" onclick="showPlanetModal('Ascendant')">
          <div class="bento-header">
            <div class="bento-icon">${SIGN_GLYPHS[c.lagna]}</div>
          </div>
          <div class="bento-label">Rising Sign</div>
          <div class="bento-value">${SIGNS[c.lagna]}</div>
          <div class="bento-sub">${NAKSHATRAS[c.lagnaNakshatra]} Nakshatra</div>
        </div>
        
        <!-- Moon Card -->
        <div class="bento-card" onclick="showPlanetModal('Moon')">
          <div class="bento-header">
            <div class="bento-icon">☽</div>
          </div>
          <div class="bento-label">Moon Sign</div>
          <div class="bento-value">${SIGNS[moon.sign]}</div>
          <div class="bento-sub">${NAKSHATRAS[moon.nakshatra]} • ${ordinal(moon.house)} House</div>
        </div>
        
        <!-- Sun Card -->
        <div class="bento-card" onclick="showPlanetModal('Sun')">
          <div class="bento-header">
            <div class="bento-icon">☉</div>
          </div>
          <div class="bento-label">Sun Sign</div>
          <div class="bento-value">${SIGNS[sun.sign]}</div>
          <div class="bento-sub">${sun.exalted ? '✦ Exalted' : sun.debilitated ? '⚠ Debilitated' : ordinal(sun.house) + ' House'}</div>
        </div>
        
        <!-- Atmakaraka Card -->
        <div class="bento-card" onclick="showPlanetModal('${c.atmakaraka}')" title="Ātmakāraka: The planet with the highest degree in your chart. It represents your soul's deepest desire and the primary lesson you came to learn in this lifetime.">
          <div class="bento-header">
            <div class="bento-icon" style="background: linear-gradient(135deg, var(--teal) 0%, var(--prussian) 100%); color: white;">${P_GLYPHS[c.atmakaraka]}</div>
          </div>
          <div class="bento-label">Soul Teacher (AK)</div>
          <div class="bento-value">${c.atmakaraka}</div>
          <div class="bento-sub">${ordinal(ak?.house||1)} House • ${SIGNS[ak?.sign||0]}</div>
        </div>
        
        <!-- Interactive Chart Card (Large) - Enhanced with tooltips, breathing, retrograde indicators -->
        <div class="bento-card large" style="cursor: default;">
          <div class="bento-label" style="margin-bottom: 12px;">Interactive Birth Chart</div>
          <div id="overview-chart-container">
            ${renderOverviewChartInner(c, layout)}
          </div>
        </div>
        
        <!-- Current Dasha Card (Wide) -->
        <div class="bento-card wide">
          <div class="bento-header">
            <div>
              <div class="bento-label">Current Life Chapter</div>
              <div class="bento-value" style="font-size: 1.4rem;">${c.dasha.maha.planet} Mahādashā</div>
            </div>
            <div class="bento-glyph">${P_GLYPHS[c.dasha.maha.planet]}</div>
          </div>
          <div class="bento-sub" style="margin-bottom: 8px;">"${theme.chapter}"</div>
          
          <!-- Progress bar -->
          <div style="background: var(--stone-soft); border-radius: 8px; height: 10px; overflow: hidden; margin: 16px 0;">
            <div style="background: linear-gradient(90deg, var(--gold) 0%, var(--brass) 100%); height: 100%; width: ${progress}%; border-radius: 8px; transition: width 0.5s;"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-muted);">
            <span>${fmtDate(c.dasha.maha.start)}</span>
            <span style="color: var(--gold); font-weight: 600;">${remainingYears} years remaining</span>
            <span>${fmtDate(c.dasha.maha.end)}</span>
          </div>
        </div>
        
        <!-- Soul Story Preview Card (Wide) -->
        <div class="bento-card wide" onclick="showSection('narrative')" style="cursor: pointer;">
          <div class="bento-header">
            <div>
              <div class="bento-label">Premium Feature</div>
              <div class="bento-value" style="font-size: 1.2rem;">✦ Soul Story</div>
            </div>
            <span class="badge-premium">AI</span>
          </div>
          <p class="bento-story-preview">
            Discover your unique soul narrative woven from the celestial patterns of your birth chart. 
            ${SIGNS[c.lagna]} rising through ${NAKSHATRAS[c.lagnaNakshatra]} shapes how you meet the world, 
            while ${c.atmakaraka} as your Ātmakāraka reveals the deepest lesson your soul came to learn...
          </p>
          <button class="bento-cta">
            Generate My Story →
          </button>
        </div>
        
        <!-- Quick Stats Cards -->
        <div class="bento-card">
          <div class="bento-label">Benefics</div>
          <div class="bento-value" style="font-size: 1.3rem; display: flex; gap: 8px;">
            ${c.planets.filter(p => ['Jupiter', 'Venus', 'Mercury', 'Moon'].includes(p.name) && (p.exalted || !p.debilitated)).map(p => `<span title="${p.name}">${p.glyph}</span>`).join('') || '—'}
          </div>
          <div class="bento-sub">Strong helpful forces</div>
        </div>
        
        <div class="bento-card">
          <div class="bento-label">Challenges</div>
          <div class="bento-value" style="font-size: 1.3rem; display: flex; gap: 8px;">
            ${c.planets.filter(p => p.debilitated).map(p => `<span title="${p.name} debilitated">${p.glyph}</span>`).join('') || '—'}
          </div>
          <div class="bento-sub">Areas for growth</div>
        </div>
        
        <div class="bento-card">
          <div class="bento-label">Retrogrades</div>
          <div class="bento-value" style="font-size: 1.3rem; display: flex; gap: 8px;">
            ${c.planets.filter(p => p.retro).map(p => `<span title="${p.name} Rx">${p.glyph}</span>`).join('') || '—'}
          </div>
          <div class="bento-sub">Inner reflection points</div>
        </div>
        
        <div class="bento-card" onclick="showSection('prashna')" style="cursor: pointer;">
          <div class="bento-icon" style="background: linear-gradient(135deg, var(--gold) 0%, var(--brass) 100%); color: white; margin-bottom: 12px;">✦</div>
          <div class="bento-label">AI Oracle</div>
          <div class="bento-value" style="font-size: 1rem;">Ask a Question</div>
          <div class="bento-sub">Get personalized guidance</div>
        </div>
        
        <!-- Share Profile Card -->
        <div class="bento-card" onclick="generateProfileCard()" style="cursor: pointer;">
          <div class="bento-icon" style="background: linear-gradient(135deg, var(--teal) 0%, var(--prussian) 100%); color: white; margin-bottom: 12px;">📤</div>
          <div class="bento-label">Share</div>
          <div class="bento-value" style="font-size: 1rem;">Profile Card</div>
          <div class="bento-sub">Download shareable image</div>
        </div>
      </div>
      
      <!-- Journey Guide -->
      <div style="margin-top: var(--space-xl); padding: 24px; background: linear-gradient(135deg, rgba(26,95,122,0.05) 0%, rgba(201,162,39,0.05) 100%); border-radius: 20px; border: 1px solid var(--border-whisper);">
        <h3 style="font-size: 1rem; color: var(--prussian); margin-bottom: 16px; text-align: center;">✦ Your Journey Through the Stars</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; font-size: 0.75rem;">
          <div style="text-align: center; cursor: pointer; padding: 12px; border-radius: 12px; transition: background 0.3s;" onclick="showSection('chart')" onmouseenter="this.style.background='rgba(26,95,122,0.1)'" onmouseleave="this.style.background='transparent'">
            <div style="font-size: 1.2rem; margin-bottom: 6px;">📜</div>
            <div style="font-weight: 500; color: var(--prussian);">Chart</div>
            <div style="color: var(--text-muted); font-size: 0.65rem;">See the map</div>
          </div>
          <div style="text-align: center; cursor: pointer; padding: 12px; border-radius: 12px; transition: background 0.3s;" onclick="showSection('planets')" onmouseenter="this.style.background='rgba(26,95,122,0.1)'" onmouseleave="this.style.background='transparent'">
            <div style="font-size: 1.2rem; margin-bottom: 6px;">☉</div>
            <div style="font-weight: 500; color: var(--prussian);">Grahas</div>
            <div style="color: var(--text-muted); font-size: 0.65rem;">Planetary forces</div>
          </div>
          <div style="text-align: center; cursor: pointer; padding: 12px; border-radius: 12px; transition: background 0.3s;" onclick="showSection('houses')" onmouseenter="this.style.background='rgba(26,95,122,0.1)'" onmouseleave="this.style.background='transparent'">
            <div style="font-size: 1.2rem; margin-bottom: 6px;">🏛</div>
            <div style="font-weight: 500; color: var(--prussian);">Bhāvas</div>
            <div style="color: var(--text-muted); font-size: 0.65rem;">Life arenas</div>
          </div>
          <div style="text-align: center; cursor: pointer; padding: 12px; border-radius: 12px; transition: background 0.3s;" onclick="showSection('dashas')" onmouseenter="this.style.background='rgba(26,95,122,0.1)'" onmouseleave="this.style.background='transparent'">
            <div style="font-size: 1.2rem; margin-bottom: 6px;">⏳</div>
            <div style="font-weight: 500; color: var(--prussian);">Timing</div>
            <div style="color: var(--text-muted); font-size: 0.65rem;">When things unfold</div>
          </div>
          <div style="text-align: center; cursor: pointer; padding: 12px; border-radius: 12px; transition: background 0.3s;" onclick="showSection('prashna')" onmouseenter="this.style.background='rgba(201,162,39,0.1)'" onmouseleave="this.style.background='transparent'">
            <div style="font-size: 1.2rem; margin-bottom: 6px;">✦</div>
            <div style="font-weight: 500; color: var(--gold);">Oracle</div>
            <div style="color: var(--text-muted); font-size: 0.65rem;">Ask AI</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modal for planet/house info -->
    <div class="chart-modal-overlay" id="chart-modal-overlay" onclick="closeChartModal(event)">
      <div class="chart-modal" id="chart-modal">
        <button class="modal-close" onclick="closeChartModal()">×</button>
        <div id="chart-modal-content">
          <!-- Filled dynamically -->
        </div>
      </div>
    </div>
  `;
}

function renderPrashna() {
  const hasKey = hasApiKey();
  const currentModel = AI_MODELS[selectedModel] || AI_MODELS['claude'];
  
  // Only show premium AIs
  const PREMIUM_AIS = {
    claude: AI_MODELS.claude,
    gpt5: AI_MODELS.gpt5,
    gemini: AI_MODELS.gemini
  };
  
  return `
    <div class="card" style="position: relative; overflow: hidden;">
      <!-- Sanskrit watermark -->
      <span class="sanskrit-watermark top-right" style="opacity: 0.04; font-size: 8rem;">प्रश्न</span>
      
      <div class="card-header" style="text-align: center; position: relative; z-index: 1;">
        <p class="whisper">The Oracle Awaits</p>
        <h2 class="display-lg" style="color: var(--prussian);">Prashna</h2>
      </div>
      
      <div class="prashna-container">
        ${!hasKey ? `
        <!-- Elegant API Key Setup -->
        <div style="max-width: 400px; margin: 0 auto var(--space-lg); text-align: center;">
          <div style="width: 64px; height: 64px; margin: 0 auto var(--space-md); border: 2px solid var(--gold); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 1.5rem;">🔑</span>
          </div>
          <h3 style="color: var(--prussian); margin-bottom: 8px; font-weight: 400;">Connect Your Oracle</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: var(--space-md);">
            Access Claude, GPT-5, and Gemini through OpenRouter
          </p>
          <input type="password" id="api-key-input" class="field-input" placeholder="Paste your OpenRouter key..." style="text-align: center; margin-bottom: 12px;" />
          <button class="btn-primary" style="width: 100%;" onclick="saveOpenRouterKey(document.getElementById('api-key-input').value)">
            Connect
          </button>
          <p style="font-size: 0.7rem; color: var(--text-muted); margin-top: 12px;">
            <a href="https://openrouter.ai/keys" target="_blank" style="color: var(--prussian);">Get a free key →</a>
          </p>
        </div>
        ` : `
        <!-- Connected - Clean Oracle Selection -->
        <div style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-bottom: var(--space-lg);">
          <span style="width: 8px; height: 8px; background: #22c55e; border-radius: 50%; animation: pulse-green 2s infinite;"></span>
          <span style="font-size: 0.75rem; color: var(--text-muted);">Oracle Ready</span>
          <button style="font-size: 0.65rem; color: var(--text-muted); background: none; border: none; cursor: pointer; text-decoration: underline;" 
                  onclick="if(confirm('Disconnect oracle?')){localStorage.removeItem('openrouter_api_key');location.reload();}">disconnect</button>
        </div>
        
        <!-- Council Mode Toggle - Elegant -->
        <div style="max-width: 420px; margin: 0 auto var(--space-lg);">
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; background: ${useCouncilMode ? 'linear-gradient(135deg, var(--prussian) 0%, #2a7a9c 100%)' : 'var(--stone-soft)'}; border-radius: 16px; border: 1px solid ${useCouncilMode ? 'transparent' : 'var(--border)'}; cursor: pointer; transition: all 0.3s;"
               onclick="window.toggleCouncilMode(${!useCouncilMode})">
            <div>
              <div style="font-size: 0.9rem; font-weight: 500; color: ${useCouncilMode ? 'white' : 'var(--prussian)'}; margin-bottom: 4px;">
                ✦ Oracle Council
              </div>
              <div style="font-size: 0.7rem; color: ${useCouncilMode ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)'};">
                ${useCouncilMode ? '⚠️ Uses 4× API calls (~$0.30/question)' : 'Enable for consensus-based insights'}
              </div>
            </div>
            <div style="width: 48px; height: 28px; background: ${useCouncilMode ? 'rgba(255,255,255,0.3)' : 'var(--border)'}; border-radius: 14px; position: relative; transition: all 0.3s;">
              <div style="width: 24px; height: 24px; background: white; border-radius: 50%; position: absolute; top: 2px; ${useCouncilMode ? 'right: 2px;' : 'left: 2px;'} transition: all 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
            </div>
          </div>
        </div>
        
        <!-- Single Oracle Selection (only when council off) -->
        ${!useCouncilMode ? `
        <div style="text-align: center; margin-bottom: var(--space-lg);">
          <p style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.1em;">Or choose one oracle</p>
          <div style="display: flex; justify-content: center; gap: 12px;">
            ${Object.entries(PREMIUM_AIS).map(([key, model]) => `
              <button onclick="selectAIModel('${key}')"
                      style="padding: 12px 20px; border-radius: 100px; border: 2px solid ${selectedModel === key ? 'var(--prussian)' : 'var(--border)'}; 
                             background: ${selectedModel === key ? 'var(--prussian)' : 'white'}; 
                             color: ${selectedModel === key ? 'white' : 'var(--ink-soft)'}; 
                             font-size: 0.8rem; cursor: pointer; transition: all 0.2s; font-weight: 500;">
                ${model.name.split(' ')[0]}
              </button>
            `).join('')}
          </div>
        </div>
        ` : ''}
        `}
        
        <!-- Question Area - Elegant -->
        <div style="max-width: 600px; margin: 0 auto;">
          <p style="font-style: italic; color: var(--ink-soft); text-align: center; margin-bottom: var(--space-sm); font-size: 1.1rem;">
            What question weighs on your heart?
          </p>
          <textarea class="question-textarea" id="prashna-question" 
                    placeholder="Ask about career, relationships, timing, spiritual growth..."
                    style="min-height: 120px; font-size: 1rem; border-radius: 16px;"
                    ${!hasKey ? 'disabled style="opacity: 0.5;"' : ''}></textarea>
          <button class="btn-primary" onclick="submitPrashna()" 
                  style="width: 100%; padding: 18px; font-size: 1rem; border-radius: 12px; margin-top: 12px;"
                  ${!hasKey ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
            ${hasKey && useCouncilMode ? '✦ Consult the Council' : '✦ Ask the Oracle'}
          </button>
        </div>
        
        <!-- SPLIT-SCREEN CONSULTATION AREA -->
        <div class="prashna-split-container" id="prashna-split" style="display: none;">
          <div class="prashna-chart-panel">
            <h4>Your Chart</h4>
            <div class="prashna-mini-chart" id="prashna-mini-chart">
              ${renderMiniChart()}
            </div>
            <div style="margin-top: 12px; font-size: 0.65rem; color: var(--text-muted); text-align: center;">
              Planets glow when mentioned ✦
            </div>
          </div>
          <div class="prashna-response-panel">
            <div id="prashna-output" class="prashna-response-streaming"></div>
          </div>
        </div>
        
        <div id="prashna-output-fallback"></div>
      </div>
      
      <div style="margin-top: var(--space-lg); padding: 16px; text-align: center;">
        <p style="font-size: 0.7rem; color: var(--text-muted);">
          The oracle illuminates patterns, not fixed futures.
        </p>
      </div>
    </div>
  `;
}

// Render mini chart for split-screen consultation
function renderMiniChart() {
  if (!chartData) return '<div style="color: var(--text-muted); text-align: center; padding: 20px;">Generate your chart first</div>';
  
  const c = chartData;
  const layout = [11,0,1,2,10,null,null,3,9,null,null,4,8,7,6,5];
  
  return layout.map((signOffset, idx) => {
    if (signOffset === null) {
      return '<div class="prashna-mini-cell empty"></div>';
    }
    const houseNum = signOffset + 1;
    const planetsHere = c.planets.filter(p => p.house === houseNum);
    
    return `
      <div class="prashna-mini-cell" data-house="${houseNum}">
        <span class="cell-house">${houseNum}</span>
        <span class="cell-planets">
          ${planetsHere.map(p => `<span class="mini-planet" data-planet="${p.name}">${p.glyph}</span>`).join('')}
        </span>
      </div>
    `;
  }).join('');
}

// Highlight planets mentioned in AI response
function highlightPlanetsInResponse(text) {
  const planets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
  const mentioned = [];
  
  planets.forEach(planet => {
    if (text.includes(planet)) {
      mentioned.push(planet);
    }
  });
  
  // Highlight in mini chart
  const miniChart = document.getElementById('prashna-mini-chart');
  if (miniChart) {
    // Reset all highlights first
    miniChart.querySelectorAll('.planet-highlighted').forEach(el => {
      el.classList.remove('planet-highlighted');
    });
    miniChart.querySelectorAll('.prashna-mini-cell.highlighted').forEach(el => {
      el.classList.remove('highlighted');
    });
    
    // Add new highlights
    mentioned.forEach(planet => {
      const planetEl = miniChart.querySelector(`[data-planet="${planet}"]`);
      if (planetEl) {
        planetEl.classList.add('planet-highlighted');
        planetEl.closest('.prashna-mini-cell')?.classList.add('highlighted');
      }
    });
  }
  
  return mentioned;
}

// Global lock to prevent multiple simultaneous API calls
let apiCallInProgress = false;

window.submitPrashna = async function() {
  // PREVENT MULTIPLE SIMULTANEOUS CALLS
  if (apiCallInProgress) {
    console.log('API call already in progress, ignoring duplicate request');
    return;
  }
  apiCallInProgress = true;
  
  const question = document.getElementById('prashna-question').value.trim();
  if (!question) {
    apiCallInProgress = false;
    return;
  }
  
  // Disable the submit button immediately
  const submitBtn = document.querySelector('#prashna-output')?.closest('.card')?.querySelector('.btn-primary');
  if (submitBtn) submitBtn.disabled = true;
  
  try {
    // Safety check
    if (checkForCrisis(question)) {
      document.getElementById('prashna-output').innerHTML = `
        <div class="safety-shield">
          <h3>✦ Support is Available</h3>
          <p>
            If you're going through a difficult time, please know that support is available. 
            You matter, and there are people who want to help.
          </p>
          <p>
            <a href="https://findahelpline.com/" target="_blank">Find a helpline in your country →</a>
          </p>
        </div>
      `;
      return;
    }
    
    const output = document.getElementById('prashna-output-fallback') || document.getElementById('prashna-output');
    const dot = document.getElementById('prashna-dot');
    if (dot) dot.classList.add('loading');
    
    const currentModel = AI_MODELS[selectedModel];
    const chartContext = buildChartContext();
    
    // Different loading message for council vs single
    if (useCouncilMode) {
      output.innerHTML = `
        <div class="ai-loading">
          <div class="spinner"></div>
          <p class="body-sm" style="margin-bottom: 8px;">✦ Oracle Council Convening ✦</p>
          <p style="font-size: 0.65rem; color: var(--text-muted);">Consulting Claude, GPT-5.2 & Gemini in parallel...</p>
        </div>
      `;
    } else {
      output.innerHTML = `
        <div class="ai-loading">
          <div class="spinner"></div>
          <p class="body-sm">Consulting ${currentModel.name}...</p>
        </div>
      `;
    }
  
  // Start rotating spiritual messages for long waits
  startLoadingMessages(output);
  
  let result;
  let retryCount = 0;
  const maxRetries = 1; // Reduced from 2 to save API costs
    
    // Get current date for temporal grounding
    const today = new Date();
    const currentDate = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    // DEBUG: Log council mode state
    
    // Retry loop for validation
    while (retryCount <= maxRetries) {
      if (useCouncilMode) {
        result = await askOracleCouncil(question, chartContext);
      } else {
        const prompt = `TODAY'S DATE: ${currentDate}

BIRTH CHART DATA:
${chartContext}

QUERENT'S QUESTION: "${question}"

Provide a deep Vedic astrology analysis specific to this question:

1. RELEVANT HOUSES — Which houses govern this life area? Who rules them? Where are those rulers placed?
2. PLANETARY DIGNITIES — Are key planets exalted, debilitated, retrograde, or in own sign?
3. NAKSHATRA INFLUENCES — What subtle energies do the nakshatras bring?
4. DASHA TIMING — What does the current Mahādashā/Antardashā mean for this question? When might shifts occur?
5. PRACTICAL GUIDANCE — Specific advice rooted in the chart (not generic platitudes)
6. REFLECTION — End with a contemplative question

CRITICAL: Today is ${currentDate}. Do NOT reference past dates as future. Be specific to THIS chart.

Write 350-450 words with elegance and precision.`;
        
        const systemPromptWithDate = JYOTI_SYSTEM_PROMPT + `\n\nIMPORTANT: Today's date is ${currentDate}. Never reference past dates as if they are future.`;
        
        result = await callAI(prompt, systemPromptWithDate);
      }
      
      // Validate response
      if (result.text) {
        const validation = validateResponse(result.text, result.category || 'general');
        
        if (validation.isValid || retryCount >= maxRetries) {
          // Valid or out of retries, proceed
          if (!validation.isValid && retryCount >= maxRetries) {
            console.log('⚠️ Response validation issues after retries:', validation.issues);
          }
          break;
        } else {
          // Invalid response, retry
          console.log(`🔄 Response failed validation (attempt ${retryCount + 1}), retrying...`, validation.issues);
          retryCount++;
          
          // Update loading message
          output.innerHTML = `
            <div class="ai-loading">
              <div class="spinner"></div>
              <p class="body-sm" style="margin-bottom: 8px;">✦ Refining Response ✦</p>
              <p style="font-size: 0.65rem; color: var(--text-muted);">Ensuring completeness (attempt ${retryCount + 1})...</p>
            </div>
          `;
        }
      } else {
        break; // No text, exit loop
      }
    }
    
    // Stop the spiritual loading messages
    stopLoadingMessages();
    if (dot) dot.classList.remove('loading');
    
    if (result.needsKey) {
      output.innerHTML = `
        <div class="oracle-resting">
          <h3>✦ API Key Required</h3>
          <p>Please enter your OpenRouter API key above to enable the oracle.</p>
        </div>
      `;
      return;
    }
    
    if (result.text) {
      const category = result.category || 'general';
      
      // Show split-screen container
      const splitContainer = document.getElementById('prashna-split');
      if (splitContainer) {
        splitContainer.style.display = 'grid';
        // Update mini chart
        const miniChart = document.getElementById('prashna-mini-chart');
        if (miniChart) miniChart.innerHTML = renderMiniChart();
      }
      
      // Update loading for enhancement phase
      output.innerHTML = `
        <div class="ai-loading">
          <div class="spinner"></div>
          <p class="body-sm" style="margin-bottom: 8px;">✦ Enhancing Response ✦</p>
          <p style="font-size: 0.65rem; color: var(--text-muted);">Generating executive summary...</p>
        </div>
      `;
      
      // Generate summary (async)
      const summary = await generateSummary(result.text, question, category);
      
      // Extract key factors
      const factors = extractKeyFactors(result.text);
      
      // Store data for PDF export
      currentOracleData = {
        question: question,
        response: result.text,
        summary: summary || '',
        factors: factors,
        model: result.model,
        category: category
      };
      
      // Use beautiful markdown renderer with summary and factors
      const renderedContent = renderOracleResponse(result.text, question, summary, factors);
      
      output.innerHTML = `
        <div class="soul-story-output" id="oracle-response-container">
          <div class="soul-story-header">
            <span class="soul-story-style-badge">✦ Oracle Reading</span>
            <span class="soul-story-meta">${result.councilSize ? `${result.councilSize} Oracles Synthesized` : `via ${result.model}`}${result.category ? ` • ${result.category}` : ''}</span>
          </div>
          ${renderedContent}
        </div>
      `;
      
      // Highlight planets mentioned in the response
      highlightPlanetsInResponse(result.text);
      
    } else {
      output.innerHTML = `
        <div class="oracle-resting">
          <h3>✦ The Oracle is Resting</h3>
          <p>${result.error || 'Connection issue. Please try again.'}</p>
          <button class="btn-secondary" onclick="submitPrashna()">Retry</button>
        </div>
      `;
    }
  } catch (e) {
    stopLoadingMessages();
    if (dot) dot.classList.remove('loading');
    output.innerHTML = `
      <div class="oracle-resting">
        <h3>✦ Connection Error</h3>
        <p>${e.message}</p>
        <button class="btn-secondary" onclick="submitPrashna()">Retry</button>
      </div>
    `;
  } finally {
    // ALWAYS reset the lock and re-enable button
    apiCallInProgress = false;
    const submitBtn = document.querySelector('#prashna-output')?.closest('.card')?.querySelector('.btn-primary');
    if (submitBtn) submitBtn.disabled = false;
  }
};

// PDF export using stored data
window.downloadOraclePDF = function() {
  if (!currentOracleData.response) {
    alert('No oracle response to export. Please ask a question first.');
    return;
  }
  
  const content = document.querySelector('.oracle-content');
  if (!content) return;
  
  generatePDF(
    currentOracleData.question,
    content.innerHTML,
    {
      summary: currentOracleData.summary,
      factors: currentOracleData.factors,
      model: currentOracleData.model,
      name: chartData?.name || 'Personal Reading'
    }
  );
};

const NARRATIVE_STYLES = [
  { id: 'mythological', name: 'Mythological' },
  { id: 'psychological', name: 'Psychological' },
  { id: 'poetic', name: 'Poetic' },
  { id: 'practical', name: 'Practical' },
  { id: 'karmic', name: 'Karmic' },
  { id: 'coach', name: 'Strategic' }
];

let selectedNarrativeStyle = 'mythological';

function renderNarrative() {
  const hasKey = hasApiKey();
  const currentModel = AI_MODELS[selectedModel] || AI_MODELS['claude'];
  const usePremium = localStorage.getItem('use_premium_narrative') === 'true';
  
  return `
    <div class="card">
      <div class="card-header" style="text-align: center;">
        <p class="whisper">Soul Story Generator</p>
        <h2 class="display-lg" style="color: var(--prussian);">Your Karmic Narrative</h2>
        <p class="body-md" style="max-width: 500px; margin: var(--space-sm) auto 0;">
          Choose a lens. The oracle will weave your chart's patterns into a meaningful story.
        </p>
      </div>
      
      ${hasKey ? `
      <!-- Premium Toggle -->
      <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: var(--space-md); padding: 16px; background: linear-gradient(135deg, rgba(201,162,39,0.08) 0%, rgba(26,95,122,0.08) 100%); border-radius: 12px; border: 1px solid var(--gold);">
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="checkbox" id="premium-narrative-toggle" 
                 ${usePremium ? 'checked' : ''} 
                 onchange="togglePremiumNarrative(this.checked)"
                 style="width: 18px; height: 18px; accent-color: var(--gold);" />
          <span style="font-size: 0.85rem; font-weight: 500; color: var(--prussian);">
            ✨ Premium Soul Story
          </span>
        </label>
        <span style="font-size: 0.7rem; color: var(--text-muted);">
          ${usePremium 
            ? 'Claude 4.5 + GPT-5.2 + Gemini 3 Pro synthesize your story' 
            : `Using ${currentModel.name}`}
        </span>
      </div>
      ` : `
      <div style="background: linear-gradient(135deg, var(--champagne-soft) 0%, var(--stone-soft) 100%); padding: 24px; border-radius: 16px; margin-bottom: var(--space-md); border: 1px solid var(--sand); text-align: center;">
        <p style="font-size: 0.9rem; color: var(--ink-soft);">
          🔑 <strong>Connect your AI oracle in the Prashna tab</strong> to enable narrative generation.
        </p>
      </div>
      `}
      
      <div class="narrative-selector">
        ${NARRATIVE_STYLES.map(s => `
          <button class="narrative-btn${s.id === selectedNarrativeStyle ? ' active' : ''}" 
                  data-style="${s.id}" 
                  onclick="selectNarrativeStyle('${s.id}')"
                  ${!hasKey ? 'disabled style="opacity: 0.5;"' : ''}>
            ${s.name}
          </button>
        `).join('')}
      </div>
      
      <button class="btn-primary" onclick="generateNarrative()" style="width: 100%; margin-bottom: var(--space-md);"${!hasKey ? ' disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
        ${usePremium ? '✦ Generate Premium Soul Story' : '✦ Generate Soul Story'}
      </button>
      
      <div id="narrative-output"></div>
    </div>
  `;
}

window.togglePremiumNarrative = function(enabled) {
  localStorage.setItem('use_premium_narrative', enabled);
  showSection('narrative'); // Re-render
};

window.selectNarrativeStyle = function(style) {
  selectedNarrativeStyle = style;
  document.querySelectorAll('.narrative-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.style === style);
  });
};

window.generateNarrative = async function() {
  const output = document.getElementById('narrative-output');
  const currentModel = AI_MODELS[selectedModel];
  const usePremium = localStorage.getItem('use_premium_narrative') === 'true';
  
  // Start loading messages for long waits
  startLoadingMessages(output);
  
  const chartContext = buildChartContext();
  const lagnaSign = SIGNS[chartData.lagna];
  const lagnaNak = NAKSHATRAS[chartData.lagnaNakshatra];
  const akName = chartData.atmakaraka;
  const akHouse = chartData.planets.find(p => p.name === akName)?.house || 1;
  const mahaP = chartData.dasha.maha.planet;
  
  // Style-specific guidance
  const styleGuides = {
    mythological: {
      name: "The Hero's Journey",
      instruction: "Write as Joseph Campbell would. Frame the soul's journey through archetypal stages: the Call, Threshold Guardians, Transformation, and Return. Use mythological language.",
      icon: "🏛️"
    },
    psychological: {
      name: "Jungian Depth",
      instruction: "Write as Carl Jung would. Explore Shadow integration, Persona development, Anima/Animus dynamics. Frame planets as psychic complexes seeking wholeness.",
      icon: "🧠"
    },
    poetic: {
      name: "Literary Soul",
      instruction: "Write as Kahlil Gibran or Rumi would. Use flowing prose, metaphor, and beauty. Let the chart become a living poem about becoming.",
      icon: "✨"
    },
    practical: {
      name: "Strategic Wisdom",
      instruction: "Write as a wise mentor. Focus on actionable insights, timing windows, and practical guidance. Clear, grounded, strategic.",
      icon: "🎯"
    },
    karmic: {
      name: "Soul Evolution",
      instruction: "Write about the soul's journey across lifetimes. What karmic patterns are completing? What new lessons awakening? Frame through dharma.",
      icon: "🔄"
    },
    coach: {
      name: "Executive Brief",
      instruction: "Write as a world-class executive coach. Strategic analysis, leverage points, risk factors. No flowery language — pure wisdom and strategy.",
      icon: "📊"
    }
  };
  
  const style = styleGuides[selectedNarrativeStyle];
  
  // Loading state
  output.innerHTML = `
    <div class="ai-loading">
      <div class="spinner"></div>
      <p class="body-sm" style="margin-bottom: 8px;">${style.icon} ${style.name} Soul Story</p>
      <p style="font-size: 0.65rem; color: var(--text-muted);">${usePremium ? 'Oracle Council synthesizing your narrative...' : `${currentModel.name} weaving your story...`}</p>
    </div>
  `;
  
  // Build ultra-specific Soul Story prompt with MANDATORY fact-checking
  const soulStorySystemPrompt = `You are JYOTI, a master Vedic astrologer writing soul narratives.

ABSOLUTE RULES — VIOLATION MEANS FAILURE:
1. The Ascendant is ${lagnaSign.toUpperCase()} — if you write "${lagnaSign === 'Virgo' ? 'Leo' : 'Virgo'} Ascendant" your response is WRONG
2. The Lagna Lord is ${lagnaSign === 'Virgo' ? 'MERCURY' : lagnaSign === 'Leo' ? 'SUN' : 'the ruler of ' + lagnaSign}
3. You MUST use the exact house positions from the chart data
4. Every planetary claim must match the provided chart data

NARRATIVE STYLE: ${selectedNarrativeStyle.toUpperCase()} — ${style.name}
${style.instruction}

STRUCTURE YOUR RESPONSE AS:
## Title (create an evocative title for this soul's journey)

### The Foundation
[Describe the Ascendant and its nakshatra — what interface does this soul present to the world?]

### The Soul's Purpose  
[Describe the Ātmakāraka and what it reveals about deepest desires and lessons]

### The Current Chapter
[Describe the current Mahādashā and its meaning for this life phase]

### The Path Forward
[Timing insights and wisdom for the journey ahead]

### A Reflection
[End with a contemplative question or empowering insight]

MANDATORY FACTS TO INCLUDE:
- Ascendant: ${lagnaSign} in ${lagnaNak} nakshatra
- Lagna Lord: Located in house (check chart data)
- Ātmakāraka: ${akName} in ${ordinal(akHouse)} house
- Current Dasha: ${mahaP} Mahādashā
- Moon Sign: ${SIGNS[chartData.planets.find(p => p.name === 'Moon')?.sign || 0]}

Write 500-700 words. Be specific to THIS chart — not generic astrology.`;

  const soulStoryPrompt = `${chartContext}

═══════════════════════════════════════════════════════════════
SOUL STORY REQUEST
═══════════════════════════════════════════════════════════════

Write a ${selectedNarrativeStyle.toUpperCase()} soul narrative for ${chartData.name}.

VERIFICATION BEFORE WRITING:
✓ Ascendant is ${lagnaSign} (NOT ${lagnaSign === 'Virgo' ? 'Leo' : 'Virgo'}!)
✓ Lagna nakshatra is ${lagnaNak}
✓ Ātmakāraka is ${akName} in ${ordinal(akHouse)} house
✓ Current Mahādashā is ${mahaP}

Now write the soul narrative using the EXACT chart data provided above.`;

  try {
    let result;
    
    if (usePremium) {
      result = await askOracleCouncil(soulStoryPrompt, ''); // Context already in prompt
    } else {
      result = await callAI(soulStoryPrompt, soulStorySystemPrompt);
    }
    
    stopLoadingMessages();
    
    if (result.needsKey) {
      output.innerHTML = `
        <div class="oracle-resting">
          <h3>✦ API Key Required</h3>
          <p>Please connect your OpenRouter API key in the Prashna tab first.</p>
        </div>
      `;
      return;
    }
    
    if (result.text) {
      // Validate response doesn't have wrong Ascendant
      const wrongAscendant = lagnaSign === 'Virgo' ? 'Leo' : 'Virgo';
      if (result.text.toLowerCase().includes(`${wrongAscendant.toLowerCase()} ascendant`) ||
          result.text.toLowerCase().includes(`${wrongAscendant.toLowerCase()} rising`)) {
        console.warn('⚠️ Soul Story contains wrong Ascendant! Showing warning.');
      }
      
      // Generate summary and factors
      const summary = await generateSummary(result.text, 'Soul Story', 'spiritual');
      const factors = extractKeyFactors(result.text);
      
      // Store for PDF export
      currentOracleData = {
        question: `${style.name} Soul Story`,
        response: result.text,
        summary: summary || '',
        factors: factors,
        model: result.model,
        category: 'spiritual'
      };
      
      // Render with beautiful formatting
      const renderedContent = renderOracleResponse(result.text, `${style.icon} ${style.name} Soul Story`, summary, factors);
      
      output.innerHTML = `
        <div class="soul-story-output" id="soul-story-response-container">
          <div class="soul-story-header">
            <span class="soul-story-style-badge">${style.icon} ${style.name}</span>
            <span class="soul-story-meta">${usePremium ? `✨ ${result.councilSize || 3} Oracles Synthesized` : `via ${result.model}`}</span>
          </div>
          ${renderedContent}
        </div>
      `;
    } else {
      output.innerHTML = `
        <div class="oracle-resting">
          <h3>✦ The Oracle is Resting</h3>
          <p>${result.error || 'Connection issue. Please try again.'}</p>
          <button class="btn-secondary" onclick="generateNarrative()">Retry</button>
        </div>
      `;
    }
  } catch (e) {
    stopLoadingMessages();
    output.innerHTML = `
      <div class="oracle-resting">
        <h3>✦ Connection Error</h3>
        <p>${e.message}</p>
        <button class="btn-secondary" onclick="generateNarrative()">Retry</button>
      </div>
    `;
  }
};

function renderPlanets() {
  // Don't show house wheel - it's confusing
  hideHouseWheel();
  
  // Check if chart data exists
  if (!chartData || !chartData.planets) {
    return `
      <div class="card" style="text-align: center; padding: 60px 40px;">
        <div style="font-size: 4rem; margin-bottom: 24px; opacity: 0.3;">☽</div>
        <h3 style="font-family: var(--font-display); font-size: 1.5rem; color: var(--ink); margin-bottom: 16px;">No Chart Calculated</h3>
        <p style="color: var(--text-muted); max-width: 400px; margin: 0 auto 24px; line-height: 1.7;">
          Enter your birth details on the home screen to generate your chart, then explore the Grahas (planets) here.
        </p>
        <button onclick="document.getElementById('sanctum').classList.add('hidden'); document.getElementById('threshold').classList.remove('hidden');" 
                style="padding: 14px 28px; background: var(--prussian); color: white; border: none; border-radius: 100px; font-size: 0.9rem; cursor: pointer;">
          ← Return to Entry
        </button>
      </div>
    `;
  }
  
  const hasKey = hasApiKey();
  
  return `
    <div class="card" style="position: relative; overflow: hidden; background: linear-gradient(180deg, var(--bg-card) 0%, rgba(26,95,122,0.03) 100%);">
      <!-- Sanskrit watermark - positioned better -->
      <span style="position: absolute; top: 20px; right: 30px; font-family: 'Noto Sans Devanagari', sans-serif; font-size: 6rem; font-weight: 200; color: var(--prussian); opacity: 0.04; pointer-events: none; line-height: 1;">ग्रह</span>
      
      <div class="card-header" style="position: relative; z-index: 1; text-align: center; padding-bottom: var(--space-md);">
        <p class="whisper">The Nine Cosmic Forces</p>
        <h2 class="display-lg" style="color: var(--prussian);">Grahas</h2>
        <p class="body-sm" style="max-width: 400px; margin: 8px auto 0;">Each planet holds a key to understanding your nature.</p>
      </div>
      
      <!-- Generate Complete Report Button -->
      ${hasKey ? `
      <div style="max-width: 400px; margin: 0 auto var(--space-lg); text-align: center;">
        <button id="generate-planet-report-btn" onclick="generateCompletePlanetReport()" 
                style="padding: 16px 32px; background: linear-gradient(135deg, var(--prussian) 0%, #2a7a9c 100%); color: white; border: none; border-radius: 100px; font-size: 0.9rem; font-weight: 600; cursor: pointer; box-shadow: 0 4px 15px rgba(26, 95, 122, 0.3); transition: all 0.3s;">
          ✦ Generate Complete Planet Report (PDF)
        </button>
        <p style="font-size: 0.7rem; color: var(--text-muted); margin-top: 8px;">
          One AI call for all 9 planets — saves ~9x vs individual calls
        </p>
      </div>
      ` : `
      <div style="max-width: 400px; margin: 0 auto var(--space-lg); text-align: center;">
        <p style="font-size: 0.8rem; color: var(--text-muted); padding: 16px; background: var(--stone-soft); border-radius: 12px;">
          🔑 Connect your Oracle in Prashna tab to generate AI reports
        </p>
      </div>
      `}
      
      <!-- Orbital Wheel - Interactive -->
      <div id="orbital-wheel-container" style="margin: var(--space-md) 0;"></div>
      
      <!-- Orbital Wheel Legend -->
      <div style="max-width: 400px; margin: 0 auto var(--space-md); display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 6px; font-size: 0.7rem; color: var(--text-muted);">
          <span style="width: 20px; height: 20px; border-radius: 50%; background: rgba(201,162,39,0.3); box-shadow: 0 0 10px rgba(201,162,39,0.5);"></span>
          Exalted (Golden glow)
        </div>
        <div style="display: flex; align-items: center; gap: 6px; font-size: 0.7rem; color: var(--text-muted);">
          <span style="width: 20px; height: 20px; border-radius: 50%; background: rgba(192,57,43,0.3); box-shadow: 0 0 10px rgba(192,57,43,0.5);"></span>
          Debilitated (Red glow)
        </div>
        <div style="display: flex; align-items: center; gap: 6px; font-size: 0.7rem; color: var(--text-muted);">
          <span style="width: 20px; height: 20px; border-radius: 50%; background: var(--stone-soft); border: 1px solid var(--border);"></span>
          Neutral
        </div>
      </div>
      <p style="text-align: center; font-size: 0.7rem; color: var(--text-muted); margin-bottom: var(--space-md);">Click any planet to see details</p>
      
      <!-- Dignity Legend -->
      <div style="max-width: 300px; margin: 0 auto var(--space-lg); text-align: center;">
        <p style="font-size: 0.65rem; color: var(--text-muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.1em;">Planetary Strength</p>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 0.6rem; color: #c0392b;">Weak</span>
          <div style="flex: 1; height: 4px; background: linear-gradient(90deg, #c0392b 0%, #95a5a6 50%, #c9a227 100%); border-radius: 2px;"></div>
          <span style="font-size: 0.6rem; color: #c9a227;">Strong</span>
        </div>
      </div>
      
      <!-- Planet Cards - Cleaner -->
      <div class="planet-list" id="planets-list" style="display: grid; gap: 12px;">
        ${chartData.planets.map(p => renderPlanetRow(p)).join('')}
      </div>
    </div>
  `;
}

function renderPlanetRow(p) {
  const d = GRAHA_DETAILS[p.name];
  const isExpanded = expandedPlanet === p.name;
  const dignityPosition = getDignityPosition(
    p.exalted ? 'Exalted' : 
    p.debilitated ? 'Debilitated' : 
    p.ownSign ? 'Own Sign' : 'Neutral'
  );
  
  // Dignity color
  const dignityColor = p.exalted ? '#c9a227' : p.debilitated ? '#c0392b' : p.ownSign ? '#22c55e' : '#95a5a6';
  
  return `
    <div class="planet-card-wrapper" data-planet="${p.name}" style="position: relative;">
      <div class="liquid-card" 
           style="padding: 20px; cursor: pointer; border-left: 3px solid ${dignityColor};"
           onclick="togglePlanet('${p.name}')"
           onmouseenter="playPlanetTone('${p.name}')">
        
        <div style="display: flex; align-items: center; gap: 16px;">
          <!-- Planet Glyph -->
          <div style="width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; background: linear-gradient(135deg, rgba(201,162,39,0.1) 0%, transparent 100%); border-radius: 12px;">
            ${p.glyph}
          </div>
          
          <!-- Planet Info -->
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span style="font-size: 1.1rem; font-weight: 500; color: var(--prussian);">${p.name}</span>
              ${p.retro ? '<span style="font-size: 0.6rem; padding: 2px 6px; background: var(--turmeric-soft); color: var(--turmeric); border-radius: 4px;">℞</span>' : ''}
              ${p.isAK ? '<span style="font-size: 0.6rem; padding: 2px 6px; background: var(--prussian); color: white; border-radius: 4px; cursor: help;" title="Ātmakāraka - Your Soul Teacher">AK</span>' : ''}
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">
              ${SIGNS[p.sign]} ${fmtDeg(p.degree)} · House ${p.house}
            </div>
            <!-- Dignity bar -->
            <div style="margin-top: 8px; max-width: 150px; height: 3px; background: linear-gradient(90deg, #c0392b 0%, #95a5a6 50%, #c9a227 100%); border-radius: 2px; position: relative;">
              <div style="position: absolute; left: ${dignityPosition}%; top: -3px; width: 8px; height: 8px; background: white; border: 2px solid ${dignityColor}; border-radius: 50%; transform: translateX(-50%);"></div>
            </div>
          </div>
          
          <!-- Expand Arrow -->
          <div style="color: var(--text-muted); transition: transform 0.3s; ${isExpanded ? 'transform: rotate(180deg);' : ''}">▼</div>
        </div>
      </div>
      
      <!-- Expanded Detail -->
      <div style="max-height: ${isExpanded ? '500px' : '0'}; overflow: hidden; transition: max-height 0.4s ease-out;">
        <div style="padding: 20px; background: var(--stone-soft); border-radius: 0 0 16px 16px; margin-top: -8px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div>
              <h5 style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); margin-bottom: 8px;">Archetype</h5>
              <p style="font-size: 0.9rem; color: var(--prussian); font-weight: 500;">${d?.archetype || p.name}</p>
              <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">${d?.theaterRole || ''}</p>
            </div>
            <div>
              <h5 style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); margin-bottom: 8px;">Significations</h5>
              <p style="font-size: 0.8rem; color: var(--ink-soft);">${(d?.significations || []).slice(0,4).join(', ')}</p>
            </div>
          </div>
          <div style="padding: 16px; background: rgba(201,162,39,0.05); border-radius: 12px; margin-bottom: 16px;">
            <p style="font-size: 0.85rem; font-style: italic; color: var(--ink-soft);">"${d?.spiritualMeaning || 'This planet carries deep karmic significance in your journey.'}"</p>
          </div>
          <button class="btn-primary" style="width: 100%;" onclick="event.stopPropagation(); generateAIPlanetInsight('${p.name}')">
            ✦ Ask Oracle About ${p.name}
          </button>
        </div>
      </div>
    </div>
  `;
}

window.togglePlanet = function(name) {
  expandedPlanet = expandedPlanet === name ? null : name;
  const list = document.getElementById('planets-list');
  list.innerHTML = chartData.planets.map(p => renderPlanetRow(p)).join('');
  
  // Reinitialize liquid cards
  setTimeout(initLiquidCards, 100);
  
  // Highlight related houses
  if (expandedPlanet) {
    const planet = chartData.planets.find(p => p.name === expandedPlanet);
    if (planet) highlightHouseSegment(planet.house);
  }
};

function renderHouses() {
  // Hide house wheel - confusing
  hideHouseWheel();
  
  // Check if chart data exists
  if (!chartData || !chartData.planets) {
    return `
      <div class="card" style="text-align: center; padding: 60px 40px;">
        <div style="font-size: 4rem; margin-bottom: 24px; opacity: 0.3;">🏛️</div>
        <h3 style="font-family: var(--font-display); font-size: 1.5rem; color: var(--ink); margin-bottom: 16px;">No Chart Calculated</h3>
        <p style="color: var(--text-muted); max-width: 400px; margin: 0 auto 24px; line-height: 1.7;">
          Enter your birth details on the home screen to generate your chart, then explore the Bhāvas (houses) here.
        </p>
        <button onclick="document.getElementById('sanctum').classList.add('hidden'); document.getElementById('threshold').classList.remove('hidden');" 
                style="padding: 14px 28px; background: var(--gold); color: white; border: none; border-radius: 100px; font-size: 0.9rem; cursor: pointer;">
          ← Return to Entry
        </button>
      </div>
    `;
  }
  
  // House themes for visual variety
  const HOUSE_COLORS = {
    1: '#1a5f7a', 2: '#22c55e', 3: '#f59e0b', 4: '#6366f1',
    5: '#c9a227', 6: '#ef4444', 7: '#ec4899', 8: '#7c3aed',
    9: '#f97316', 10: '#1a5f7a', 11: '#10b981', 12: '#8b5cf6'
  };
  
  const hasKey = hasApiKey();
  
  return `
    <div class="card" style="position: relative; overflow: hidden; background: linear-gradient(180deg, var(--bg-card) 0%, rgba(201,162,39,0.03) 100%);">
      <!-- Sanskrit watermark -->
      <span style="position: absolute; top: 20px; right: 30px; font-family: 'Noto Sans Devanagari', sans-serif; font-size: 6rem; font-weight: 200; color: var(--gold); opacity: 0.04; pointer-events: none; line-height: 1;">भाव</span>
      
      <div class="card-header" style="position: relative; z-index: 1; text-align: center; padding-bottom: var(--space-md);">
        <p class="whisper">The Twelve Arenas of Life</p>
        <h2 class="display-lg" style="color: var(--prussian);">Bhāvas</h2>
        <p class="body-sm" style="max-width: 400px; margin: 8px auto 0;">Each house represents a domain where life unfolds.</p>
      </div>
      
      <!-- Generate Complete Report Button -->
      ${hasKey ? `
      <div style="max-width: 400px; margin: 0 auto var(--space-lg); text-align: center;">
        <button id="generate-house-report-btn" onclick="generateCompleteHouseReport()" 
                style="padding: 16px 32px; background: linear-gradient(135deg, var(--gold) 0%, #d4a84b 100%); color: white; border: none; border-radius: 100px; font-size: 0.9rem; font-weight: 600; cursor: pointer; box-shadow: 0 4px 15px rgba(201, 162, 39, 0.3); transition: all 0.3s;">
          ✦ Generate Complete House Report (PDF)
        </button>
        <p style="font-size: 0.7rem; color: var(--text-muted); margin-top: 8px;">
          One AI call for all 12 houses — saves ~12x vs individual calls
        </p>
      </div>
      ` : `
      <div style="max-width: 400px; margin: 0 auto var(--space-lg); text-align: center;">
        <p style="font-size: 0.8rem; color: var(--text-muted); padding: 16px; background: var(--stone-soft); border-radius: 12px;">
          🔑 Connect your Oracle in Prashna tab to generate AI reports
        </p>
      </div>
      `}
      
      <!-- House Color Legend -->
      <div style="max-width: 500px; margin: 0 auto var(--space-lg); padding: 16px; background: var(--stone-soft); border-radius: 12px;">
        <p style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); margin-bottom: 12px; text-align: center;">House Colors by Life Theme (Puruṣārtha)</p>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="display: flex; gap: 3px;">
              <span style="width: 12px; height: 12px; background: #1a5f7a; border-radius: 3px;"></span>
              <span style="width: 12px; height: 12px; background: #c9a227; border-radius: 3px;"></span>
              <span style="width: 12px; height: 12px; background: #f97316; border-radius: 3px;"></span>
            </div>
            <span><strong>Dharma</strong> (1,5,9) Purpose</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="display: flex; gap: 3px;">
              <span style="width: 12px; height: 12px; background: #22c55e; border-radius: 3px;"></span>
              <span style="width: 12px; height: 12px; background: #ef4444; border-radius: 3px;"></span>
              <span style="width: 12px; height: 12px; background: #1a5f7a; border-radius: 3px;"></span>
            </div>
            <span><strong>Artha</strong> (2,6,10) Resources</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="display: flex; gap: 3px;">
              <span style="width: 12px; height: 12px; background: #f59e0b; border-radius: 3px;"></span>
              <span style="width: 12px; height: 12px; background: #ec4899; border-radius: 3px;"></span>
              <span style="width: 12px; height: 12px; background: #10b981; border-radius: 3px;"></span>
            </div>
            <span><strong>Kāma</strong> (3,7,11) Desires</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="display: flex; gap: 3px;">
              <span style="width: 12px; height: 12px; background: #6366f1; border-radius: 3px;"></span>
              <span style="width: 12px; height: 12px; background: #7c3aed; border-radius: 3px;"></span>
              <span style="width: 12px; height: 12px; background: #8b5cf6; border-radius: 3px;"></span>
            </div>
            <span><strong>Mokṣa</strong> (4,8,12) Liberation</span>
          </div>
        </div>
      </div>
      
      <!-- Visual House Wheel with Puruṣārtha Labels -->
      <div style="max-width: 420px; margin: 0 auto var(--space-lg); aspect-ratio: 1; position: relative;">
        <div style="position: absolute; inset: 0; border: 2px solid var(--border); border-radius: 50%;"></div>
        <div style="position: absolute; inset: 15%; border: 1px solid var(--border-whisper); border-radius: 50%;"></div>
        <div style="position: absolute; inset: 35%; border: 1px solid var(--border-whisper); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 0.7rem; color: var(--text-muted);">Lagna: ${SIGNS[chartData.lagna]}</span>
        </div>
        ${[1,2,3,4,5,6,7,8,9,10,11,12].map(h => {
          const angle = (h - 1) * 30 - 60; // Position around circle
          const rad = angle * Math.PI / 180;
          const x = 50 + 38 * Math.cos(rad);
          const y = 50 + 38 * Math.sin(rad);
          const planetsHere = chartData.planets.filter(p => p.house === h);
          
          // Purusartha category
          const purusartha = [1,5,9].includes(h) ? 'D' : // Dharma
                            [2,6,10].includes(h) ? 'A' : // Artha
                            [3,7,11].includes(h) ? 'K' : // Kama
                            'M'; // Moksha
          const purusarthaColor = [1,5,9].includes(h) ? '#1a5f7a' : 
                                  [2,6,10].includes(h) ? '#22c55e' : 
                                  [3,7,11].includes(h) ? '#f59e0b' : '#8b5cf6';
          
          return `
            <div style="position: absolute; left: ${x}%; top: ${y}%; transform: translate(-50%, -50%); 
                        width: 42px; height: 42px; background: white; border: 3px solid ${purusarthaColor}; 
                        border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center;
                        cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
                 onclick="document.getElementById('house-${h}').scrollIntoView({behavior:'smooth', block:'center'})"
                 onmouseenter="this.style.transform='translate(-50%,-50%) scale(1.15)'; this.style.boxShadow='0 4px 15px ${purusarthaColor}40';"
                 onmouseleave="this.style.transform='translate(-50%,-50%) scale(1)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)';">
              <span style="font-size: 0.9rem; font-weight: 700; color: ${purusarthaColor}; line-height: 1;">${h}</span>
              <span style="font-size: 0.5rem; font-weight: 600; color: ${purusarthaColor}; opacity: 0.7;">${purusartha}</span>
              ${planetsHere.length > 0 ? '<span style="position:absolute;top:-2px;right:-2px;width:10px;height:10px;background:var(--gold);border-radius:50%;border:2px solid white;"></span>' : ''}
            </div>
          `;
        }).join('')}
        
        <!-- Legend below wheel -->
        <div style="position: absolute; bottom: -60px; left: 0; right: 0; display: flex; justify-content: center; gap: 16px; font-size: 0.65rem;">
          <span style="color: #1a5f7a;"><strong>D</strong> = Dharma</span>
          <span style="color: #22c55e;"><strong>A</strong> = Artha</span>
          <span style="color: #f59e0b;"><strong>K</strong> = Kāma</span>
          <span style="color: #8b5cf6;"><strong>M</strong> = Mokṣa</span>
        </div>
      </div>
      
      <!-- House Cards - Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
        ${[1,2,3,4,5,6,7,8,9,10,11,12].map(h => renderHouseCard(h)).join('')}
      </div>
    </div>
  `;
}

function renderHouseCard(houseNum) {
  const bhava = BHAVA_DETAILS[houseNum];
  const sign = (chartData.lagna + houseNum - 1) % 12;
  const planetsHere = chartData.planets.filter(p => p.house === houseNum);
  
  // House theme colors
  const HOUSE_COLORS = {
    1: '#1a5f7a', 2: '#22c55e', 3: '#f59e0b', 4: '#6366f1',
    5: '#c9a227', 6: '#ef4444', 7: '#ec4899', 8: '#7c3aed',
    9: '#f97316', 10: '#1a5f7a', 11: '#10b981', 12: '#8b5cf6'
  };
  
  return `
    <div class="liquid-card house-expandable" id="house-${houseNum}"
         style="position: relative; overflow: visible; padding: 20px; border-left: 3px solid ${HOUSE_COLORS[houseNum]}; cursor: pointer;"
         onclick="toggleHouseCard(this)">
      
      <!-- Header -->
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <div style="width: 40px; height: 40px; background: ${HOUSE_COLORS[houseNum]}10; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: 600; color: ${HOUSE_COLORS[houseNum]};">
          ${houseNum}
        </div>
        <div>
          <div style="font-size: 1rem; font-weight: 500; color: var(--prussian);">${bhava.english}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${SIGN_GLYPHS[sign]} ${SIGNS[sign]}</div>
        </div>
        ${planetsHere.length > 0 ? `
          <div style="margin-left: auto; display: flex; gap: 4px;">
            ${planetsHere.map(p => `<span style="font-size: 1.2rem;" title="${p.name}">${p.glyph}</span>`).join('')}
          </div>
        ` : ''}
        <span class="expand-arrow" style="color: var(--text-muted); transition: transform 0.3s;">▼</span>
      </div>
      
      <!-- Keywords -->
      <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 12px;">
        ${bhava.keywords.join(' · ')}
      </div>
      
      <!-- Expandable Content -->
      <div class="house-detail-content" style="display: none;">
        <div style="padding-top: 12px; border-top: 1px solid var(--border);">
          <p style="font-size: 0.85rem; color: var(--ink-soft); margin-bottom: 12px;">${bhava.meaning}</p>
          <div style="padding: 12px; background: ${HOUSE_COLORS[houseNum]}08; border-radius: 8px; margin-bottom: 12px;">
            <p style="font-size: 0.8rem; font-style: italic; color: ${HOUSE_COLORS[houseNum]};">${bhava.spiritual}</p>
          </div>
          ${bhava.questionToAsk ? `
            <p style="margin-bottom: 12px; font-size: 0.75rem; color: var(--text-muted);">
              <strong>Reflect:</strong> ${bhava.questionToAsk}
            </p>
          ` : ''}
          
          <!-- AI Insight Button -->
          <button class="btn-primary" style="width: 100%; padding: 12px; font-size: 0.85rem;" 
                  onclick="event.stopPropagation(); generateHouseInsight(${houseNum})" 
                  id="house-insight-btn-${houseNum}">
            ✦ Ask Oracle About House ${houseNum}
          </button>
          <div id="house-insight-result-${houseNum}" style="margin-top: 12px;"></div>
        </div>
      </div>
      
      <!-- Expand indicator -->
      <div class="expand-hint" style="text-align: center; margin-top: 8px; color: var(--text-muted); font-size: 0.6rem;">
        Click to explore ▾
      </div>
    </div>
  `;
}

function renderDashas() {
  // Data validation
  if (!chartData || !chartData.dasha || !chartData.planets) {
    return `
      <div class="card" style="text-align: center; padding: 60px 40px;">
        <div style="font-size: 4rem; margin-bottom: 24px; opacity: 0.3;">⏱️</div>
        <h3 style="font-family: var(--font-display); font-size: 1.5rem; color: var(--ink); margin-bottom: 16px;">No Chart Calculated</h3>
        <p style="color: var(--text-muted); max-width: 400px; margin: 0 auto 24px; line-height: 1.7;">
          Enter your birth details on the home screen to generate your chart, then explore the Dasha timing system here.
        </p>
        <button onclick="document.getElementById('sanctum').classList.add('hidden'); document.getElementById('threshold').classList.remove('hidden');" 
                style="padding: 14px 28px; background: var(--prussian); color: white; border: none; border-radius: 100px; font-size: 0.9rem; cursor: pointer;">
          ← Return to Entry
        </button>
      </div>
    `;
  }
  
  const d = chartData.dasha;
  const now = new Date();
  const moon = chartData.planets.find(p => p.name === 'Moon');
  
  if (!moon) {
    return '<div class="card"><p style="color: var(--text-muted); text-align: center; padding: 40px;">Moon data not found. Please recalculate your chart.</p></div>';
  }
  if (!d.allPeriods || d.allPeriods.length === 0) {
    return '<div class="card"><p style="color: var(--text-muted); text-align: center; padding: 40px;">Dasha periods could not be calculated. Please recalculate your chart.</p></div>';
  }
  
  // Pre-calculate all values to avoid errors in template
  const calcMethod = moon.source === 'swiss-ephemeris' ? 'Swiss Ephemeris (0.001")' : 
                      (moon.source === 'astronomy-engine' ? 'Astronomy Engine (~1\')' : 
                       (moon.source === 'built-in' ? 'Built-in Calculations' : moon.source));
  const moonLon = moon.lon ? moon.lon.toFixed(4) : 'N/A';
  const moonDeg = moon.degree ? moon.degree.toFixed(2) : 'N/A';
  const nakDegree = 360/27;
  const posInNak = moon.lon ? ((moon.lon % nakDegree) / nakDegree * 100).toFixed(2) : 'N/A';
  const pada = moon.lon ? Math.floor((moon.lon % nakDegree) / (nakDegree/4)) + 1 : 'N/A';
  const balanceYears = d.balance ? d.balance.toFixed(4) : 'N/A';
  const tzDisplay = chartData.tz >= 0 ? '+' + chartData.tz : String(chartData.tz);
  
  // Calculate ayanamsa for display
  let ayanamsaDisplay = '~24°';
  try {
    const birthYear = parseInt(chartData.dob.split('-')[0]);
    const jdApprox = 2451545 + (birthYear - 2000) * 365.25;
    ayanamsaDisplay = getLahiriAyanamsa(jdApprox).toFixed(4) + '°';
  } catch(e) {
    console.warn('Ayanamsa calc error:', e);
  }
  
  return `
    <div class="card">
      <div class="card-header">
        <p class="whisper">Vimśottari Dasha System</p>
        <h2 class="display-lg" style="color: var(--prussian);">Timing</h2>
        <p class="body-sm">Life unfolds in planetary chapters. Your current chapter and what lies ahead.</p>
      </div>
      
      <div class="insight breath">
        <div class="insight-title">Birth Nakshatra</div>
        <p>
          Your Moon in <strong>${NAKSHATRAS[d.nak]}</strong> nakshatra places you in the ${d.ruler} sequence.
          At birth, ${d.balance.toFixed(2)} years of ${d.ruler} Dasha remained.
        </p>
      </div>
      
      <!-- Debug Info - IMPORTANT FOR VERIFICATION -->
      <div style="margin-bottom: var(--space-md); padding: 20px; background: var(--teal-soft); border: 1px solid var(--teal); border-radius: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h4 style="color: var(--teal); font-size: 0.85rem; margin: 0;">🔍 Calculation Verification</h4>
          <span style="font-size: 0.7rem; padding: 4px 10px; background: ${moon.source === 'swiss-ephemeris' ? 'linear-gradient(135deg, var(--brass) 0%, var(--gold) 100%)' : 'var(--prussian)'}; color: white; border-radius: 20px; font-weight: 500;">
            ${moon.source === 'swiss-ephemeris' ? '🔬 Swiss Ephemeris' : (moon.source === 'astronomy-engine' ? '✓ Astronomy Engine' : '⚙ Built-in')}
          </span>
        </div>
        <div style="font-size: 0.8rem; font-family: monospace; color: var(--ink-soft); line-height: 2;">
          <p><strong>Precision:</strong> ${moon.source === 'swiss-ephemeris' ? '0.001 arcseconds (professional grade)' : (moon.source === 'astronomy-engine' ? '~1 arcminute (high precision)' : '~0.1° (basic)')} </p>
          <p style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border);">
            <strong>Moon Sidereal Longitude:</strong> ${moonLon}°
          </p>
          <p><strong>Moon Sign:</strong> ${SIGNS[moon.sign]} (${moonDeg}°)</p>
          <p><strong>Nakshatra:</strong> ${NAKSHATRAS[d.nak]} (pada ${pada})</p>
          <p><strong>Nakshatra Lord:</strong> ${d.ruler}</p>
          <p><strong>Position in Nakshatra:</strong> ${posInNak}%</p>
          <p><strong>Balance at Birth:</strong> ${balanceYears} years of ${d.ruler}</p>
          <p style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border);">
            <strong>Birth:</strong> ${chartData.dob} at ${chartData.tob}
          </p>
          <p><strong>Location:</strong> ${chartData.place}</p>
          <p><strong>Timezone:</strong> UTC${tzDisplay}</p>
          <p><strong>Lahiri Ayanamsa:</strong> ${ayanamsaDisplay}</p>
        </div>
        <p style="margin-top: 12px; font-size: 0.75rem; color: var(--text-muted);">
          <strong>📋 To verify:</strong> Compare Moon sidereal longitude with Jagannatha Hora (free) or astro.com (sidereal, Lahiri).
        </p>
      </div>
      
      <!-- HORIZONTAL DASHA RIVER TIMELINE -->
      <div class="dasha-river">
        <div class="dasha-river-title">
          <span class="dasha-river-icon">✦</span>
          <span>Life Timeline</span>
        </div>
        <div class="dasha-river-track">
          <div class="dasha-river-scroll">
            ${d.allPeriods.slice(0, 12).map((p, idx) => {
              const isCurrent = now >= p.start && now < p.end;
              const isPast = now >= p.end;
              const startYear = p.start.getFullYear();
              const endYear = p.end.getFullYear();
              const planetColors = {
                'Sun': '#f1c40f', 'Moon': '#bdc3c7', 'Mars': '#e74c3c', 
                'Mercury': '#27ae60', 'Jupiter': '#f39c12', 'Venus': '#ff9ff3',
                'Saturn': '#34495e', 'Rahu': '#9b59b6', 'Ketu': '#7f8c8d'
              };
              const color = planetColors[p.planet] || '#c9a227';
              
              return `
                <div class="dasha-river-period ${isCurrent ? 'current' : ''} ${isPast ? 'past' : ''}"
                     style="--period-color: ${color}">
                  <div class="dasha-river-dot" style="background: ${color}"></div>
                  <div class="dasha-river-label">
                    <span class="dasha-river-glyph">${P_GLYPHS[p.planet] || '●'}</span>
                    <span class="dasha-river-planet">${p.planet}</span>
                    <span class="dasha-river-years">${startYear}-${endYear}</span>
                  </div>
                  ${isCurrent ? '<div class="dasha-river-marker">NOW</div>' : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
        <div class="dasha-river-legend">
          <span class="dasha-river-legend-item past-indicator">← Past</span>
          <span class="dasha-river-legend-item current-indicator">● Now</span>
          <span class="dasha-river-legend-item future-indicator">Future →</span>
        </div>
      </div>
      
      <div class="timeline">
        ${d.allPeriods.slice(0, 12).map(p => {
          const isCurrent = now >= p.start && now < p.end;
          const isPast = now >= p.end;
          const theme = DASHA_THEMES[p.planet] || { chapter: 'Unknown', advice: '' };
          
          return `
            <div class="timeline-item${isCurrent ? ' current' : ''}${isPast ? ' past' : ''}" style="cursor: pointer;" onclick="this.classList.toggle('expanded')">
              <div class="timeline-header">
                <div class="timeline-planet">
                  <span class="timeline-planet-glyph">${P_GLYPHS[p.planet] || '●'}</span>
                  <span class="timeline-planet-name">${p.planet || 'Unknown'} Mahādashā</span>
                  ${isCurrent ? '<span class="badge badge-prussian" style="margin-left: 10px;">CURRENT</span>' : ''}
                </div>
                <span class="timeline-years">${p.years ? p.years.toFixed(1) : '?'} years</span>
              </div>
              <div class="timeline-dates">${fmtDate(p.start)} – ${fmtDate(p.end)}</div>
              <div class="timeline-theme" style="${isCurrent ? '' : 'max-height: 0; overflow: hidden; transition: max-height 0.3s;'}">
                <div class="timeline-chapter">${theme.chapter || ''}</div>
                <div class="timeline-advice">${theme.advice || ''}</div>
              </div>
              ${!isCurrent ? '<div style="text-align: center; font-size: 0.6rem; color: var(--text-muted); margin-top: 4px;">Click to see theme ▾</div>' : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderChart() {
  if (!chartData || !chartData.planets) {
    return `
      <div class="card" style="text-align: center; padding: 60px 40px;">
        <div style="font-size: 4rem; margin-bottom: 24px; opacity: 0.3;">◇</div>
        <h3 style="font-family: var(--font-display); font-size: 1.5rem; color: var(--ink); margin-bottom: 16px;">No Chart Calculated</h3>
        <p style="color: var(--text-muted); max-width: 400px; margin: 0 auto 24px; line-height: 1.7;">
          Enter your birth details on the home screen to generate your Rāśi chart.
        </p>
        <button onclick="document.getElementById('sanctum').classList.add('hidden'); document.getElementById('threshold').classList.remove('hidden');" 
                style="padding: 14px 28px; background: var(--prussian); color: white; border: none; border-radius: 100px; font-size: 0.9rem; cursor: pointer;">
          ← Return to Entry
        </button>
      </div>
    `;
  }
  
  const c = chartData;
  const layout = [11,0,1,2,10,null,null,3,9,null,null,4,8,7,6,5];
  
  return `
    <div class="card" style="position: relative; overflow: hidden; background: linear-gradient(180deg, var(--bg-card) 0%, rgba(26,95,122,0.03) 100%);">
      <!-- Sanskrit watermark -->
      <span style="position: absolute; top: 20px; right: 30px; font-family: 'Noto Sans Devanagari', sans-serif; font-size: 6rem; font-weight: 200; color: var(--prussian); opacity: 0.04; pointer-events: none; line-height: 1;">राशि</span>
      
      <div class="card-header" style="text-align: center; position: relative; z-index: 1;">
        <p class="whisper">Your Cosmic Blueprint</p>
        <h2 class="display-lg" style="color: var(--prussian);">Rāśi Chart</h2>
        <p class="body-sm">South Indian format • Click any cell to explore</p>
      </div>
      
      <!-- Chart with subtle animation -->
      <div style="max-width: 500px; margin: var(--space-md) auto; position: relative;">
        <!-- Decorative outer ring -->
        <div style="position: absolute; inset: -10px; border: 1px solid var(--border-whisper); border-radius: 20px; pointer-events: none;"></div>
        
        <div class="si-chart-interactive" style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.08);">
          ${layout.map((signOffset, idx) => {
            if (signOffset === null) {
              return '<div class="chart-cell-interactive empty" style="background: var(--stone-soft);"></div>';
            }
            const sign = (c.lagna + signOffset) % 12;
            const houseNum = signOffset + 1;
            const planetsHere = c.planets.filter(p => p.house === houseNum);
            const isLagna = signOffset === 0;
            
            const planetHtml = planetsHere.map(p => {
              const classes = 'planet-glyph-interactive' + 
                (p.exalted ? ' exalted' : '') + 
                (p.debilitated ? ' debilitated' : '') + 
                (p.isAK ? ' ak' : '');
              return '<span class="' + classes + '" onclick="event.stopPropagation(); showPlanetModal(\'' + p.name + '\')" title="' + p.name + ' ' + fmtDeg(p.degree) + '" style="font-size: 1.1rem; cursor: pointer; transition: transform 0.2s;" onmouseenter="this.style.transform=\'scale(1.3)\'" onmouseleave="this.style.transform=\'scale(1)\'">' + p.glyph + '</span>';
            }).join('');
            
            return '<div class="chart-cell-interactive' + (isLagna ? ' lagna' : '') + '" onclick="showHouseModal(' + houseNum + ')" data-house="' + houseNum + '" style="cursor: pointer; transition: all 0.3s; position: relative;"><span class="cell-house-num" style="position: absolute; top: 4px; left: 6px; font-size: 0.65rem; color: var(--text-muted);">' + houseNum + '</span><span class="cell-sign-interactive" style="font-size: 0.7rem; color: var(--ink-soft);">' + SIGNS[sign] + '</span><div class="cell-planets-interactive" style="display: flex; flex-wrap: wrap; gap: 2px; justify-content: center; margin-top: 4px;">' + planetHtml + '</div></div>';
          }).join('')}
        </div>
      </div>
      
      <!-- Legend - cleaner -->
      <div style="display: flex; justify-content: center; gap: 24px; margin-top: var(--space-md); flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 6px; font-size: 0.7rem; color: var(--text-muted);">
          <span style="width: 12px; height: 12px; background: var(--champagne-soft); border: 1px solid var(--gold); border-radius: 3px;"></span>
          Ascendant
        </div>
        <div style="display: flex; align-items: center; gap: 6px; font-size: 0.7rem; color: var(--text-muted);">
          <span style="color: var(--gold); font-size: 1rem;">✦</span>
          Exalted
        </div>
        <div style="display: flex; align-items: center; gap: 6px; font-size: 0.7rem; color: var(--text-muted);">
          <span style="color: #c0392b; font-size: 1rem;">⚠</span>
          Challenged
        </div>
        <div style="display: flex; align-items: center; gap: 6px; font-size: 0.7rem; color: var(--text-muted);">
          <span style="color: var(--teal); font-size: 1rem;">◉</span>
          Soul Teacher
        </div>
      </div>
      
      <!-- Key Chart Info - Same as Overview -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-top: var(--space-lg);">
        ${(() => {
          const moon = c.planets.find(p => p.name === 'Moon');
          const sun = c.planets.find(p => p.name === 'Sun');
          const ak = c.planets.find(p => p.name === c.atmakaraka);
          const theme = DASHA_THEMES[c.dasha?.maha?.planet] || {};
          return `
            <div class="liquid-card" style="padding: 16px; text-align: center; cursor: pointer;" onclick="showPlanetModal('Ascendant')">
              <div style="font-size: 1.5rem; margin-bottom: 4px;">${SIGN_GLYPHS[c.lagna]}</div>
              <div style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted);">Rising</div>
              <div style="font-size: 0.9rem; font-weight: 500; color: var(--prussian);">${SIGNS[c.lagna]}</div>
              <div style="font-size: 0.7rem; color: var(--text-muted);">${NAKSHATRAS[c.lagnaNakshatra]}</div>
            </div>
            <div class="liquid-card" style="padding: 16px; text-align: center; cursor: pointer;" onclick="showPlanetModal('Moon')">
              <div style="font-size: 1.5rem; margin-bottom: 4px;">☽</div>
              <div style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted);">Moon</div>
              <div style="font-size: 0.9rem; font-weight: 500; color: var(--prussian);">${moon ? SIGNS[moon.sign] : '—'}</div>
              <div style="font-size: 0.7rem; color: var(--text-muted);">${moon ? NAKSHATRAS[moon.nakshatra] : ''}</div>
            </div>
            <div class="liquid-card" style="padding: 16px; text-align: center; cursor: pointer;" onclick="showPlanetModal('Sun')">
              <div style="font-size: 1.5rem; margin-bottom: 4px;">☉</div>
              <div style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted);">Sun</div>
              <div style="font-size: 0.9rem; font-weight: 500; color: var(--prussian);">${sun ? SIGNS[sun.sign] : '—'}</div>
              <div style="font-size: 0.7rem; color: var(--text-muted);">${sun ? NAKSHATRAS[sun.nakshatra] : ''}</div>
            </div>
            <div class="liquid-card" style="padding: 16px; text-align: center; cursor: pointer;" onclick="showPlanetModal('${c.atmakaraka}')">
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
        })()}
      </div>
    </div>
  `;
}

function renderGlossary() {
  return `
    <div class="card" style="position: relative; overflow: hidden;">
      <!-- Sanskrit watermark -->
      <span style="position: absolute; top: 20px; right: 30px; font-family: 'Noto Sans Devanagari', sans-serif; font-size: 6rem; font-weight: 200; color: var(--gold); opacity: 0.04; pointer-events: none; line-height: 1;">शब्द</span>
      
      <div class="card-header" style="text-align: center; position: relative; z-index: 1;">
        <p class="whisper">Sanskrit Terminology</p>
        <h2 class="display-lg" style="color: var(--prussian);">Glossary</h2>
        <p class="body-sm">Click any term to explore its deeper meaning</p>
      </div>
      
      <!-- Search -->
      <div style="max-width: 400px; margin: 0 auto var(--space-lg);">
        <input type="text" id="glossary-search" placeholder="Search terms..." 
               oninput="filterGlossary(this.value)"
               style="width: 100%; padding: 14px 20px; border: 1px solid var(--border); border-radius: 100px; font-size: 0.9rem; text-align: center; transition: all 0.3s;"
               onfocus="this.style.borderColor='var(--gold)'; this.style.boxShadow='0 0 0 3px rgba(201,162,39,0.1)';"
               onblur="this.style.borderColor='var(--border)'; this.style.boxShadow='none';" />
      </div>
      
      <div class="glossary-list" id="glossary-list" style="display: grid; gap: 12px;">
        ${GLOSSARY.map((g, i) => `
          <div class="glossary-term liquid-card" data-term="${g.term.toLowerCase()}" data-sanskrit="${g.sanskrit}"
               style="padding: 20px; cursor: pointer; border-left: 3px solid var(--gold);"
               onclick="this.classList.toggle('open')">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h5 style="font-size: 1rem; color: var(--prussian); margin-bottom: 4px;">${g.term}</h5>
                <span style="font-size: 0.8rem; color: var(--gold); font-family: 'Noto Sans Devanagari', sans-serif;">${g.sanskrit}</span>
              </div>
              <span style="color: var(--text-muted); transition: transform 0.3s;" class="glossary-arrow">▼</span>
            </div>
            <p style="font-size: 0.85rem; font-style: italic; color: var(--text-muted); margin-top: 8px;">"${g.literal}"</p>
            <div class="glossary-detail" style="max-height: 0; overflow: hidden; transition: max-height 0.4s ease-out;">
              <div style="padding-top: 16px; margin-top: 16px; border-top: 1px solid var(--border);">
                <p style="font-size: 0.9rem; color: var(--ink-soft); margin-bottom: 16px;">${g.plain}</p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                  <div style="padding: 12px; background: #fee2e2; border-radius: 8px;">
                    <p style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: #c0392b; margin-bottom: 4px;">⚠ The Trap</p>
                    <p style="font-size: 0.8rem; color: #7f1d1d;">${g.trap}</p>
                  </div>
                  <div style="padding: 12px; background: var(--gold-soft); border-radius: 8px;">
                    <p style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--gold-dark); margin-bottom: 4px;">✦ The Gift</p>
                    <p style="font-size: 0.8rem; color: #78350f;">${g.opportunity}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Glossary search filter
window.filterGlossary = function(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('.glossary-term').forEach(term => {
    const termText = term.dataset.term || '';
    const sanskrit = term.dataset.sanskrit || '';
    const matches = termText.includes(q) || sanskrit.includes(q);
    term.style.display = matches ? 'block' : 'none';
  });
};

// ════════════════════════════════════════════════════════════════════════════
// LEARNING SECTION
// ════════════════════════════════════════════════════════════════════════════

function renderLearningModules() {
  return LEARNING_MODULES.map(m => `
    <div class="learning-module" onclick="this.classList.toggle('expanded')">
      <div class="module-header">
        <div class="module-number">${m.num}</div>
        <div class="module-info">
          <h4>${m.title}</h4>
          <p>${m.subtitle}</p>
        </div>
      </div>
      <div class="module-content">
        ${m.content}
      </div>
    </div>
  `).join('');
}

window.showLearning = function() {
  document.getElementById('threshold').classList.add('hidden');
  document.getElementById('learning-section').classList.remove('hidden');
  document.getElementById('learning-content').innerHTML = renderLearningModules();
  window.scrollTo(0, 0);
};

window.hideLearning = function() {
  document.getElementById('learning-section').classList.add('hidden');
  document.getElementById('threshold').classList.remove('hidden');
  window.scrollTo(0, 0);
};

// ════════════════════════════════════════════════════════════════════════════
// NAVIGATION
// ════════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════════
// INTERACTIVE CHART MODAL FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

function showPlanetModal(planetName) {
  if (!chartData) return;
  
  const overlay = document.getElementById('chart-modal-overlay');
  const content = document.getElementById('chart-modal-content');
  
  if (!overlay || !content) return;
  
  // Handle Ascendant specially
  if (planetName === 'Ascendant') {
    const nakDetails = {
      'Ashwini': 'Swift healing, new beginnings, Ketu-ruled',
      'Bharani': 'Transformation, Venus-ruled, intense vitality',
      'Krittika': 'Cutting through illusion, Sun-ruled, fiery',
      'Rohini': 'Creative abundance, Moon-ruled, magnetic',
      'Mrigashira': 'Eternal seeker, Mars-ruled, curious',
      'Ardra': 'Storm and renewal, Rahu-ruled, transformative',
      'Punarvasu': 'Return to light, Jupiter-ruled, resilient',
      'Pushya': 'Nourishment, Saturn-ruled, devoted',
      'Ashlesha': 'Serpent wisdom, Mercury-ruled, intuitive',
      'Magha': 'Royal ancestry, Ketu-ruled, dignified',
      'Purva Phalguni': 'Creative pleasure, Venus-ruled, artistic',
      'Uttara Phalguni': 'Patronage, Sun-ruled, contractual',
      'Hasta': 'Skilled hands, Moon-ruled, crafty',
      'Chitra': 'Jewel of creation, Mars-ruled, brilliant',
      'Swati': 'Independent wind, Rahu-ruled, free',
      'Vishakha': 'Forked path, Jupiter-ruled, determined',
      'Anuradha': 'Devoted friendship, Saturn-ruled, loyal',
      'Jyeshtha': 'Elder wisdom, Mercury-ruled, protective',
      'Mula': 'Root destruction, Ketu-ruled, foundational',
      'Purva Ashadha': 'Invincible, Venus-ruled, confident',
      'Uttara Ashadha': 'Final victory, Sun-ruled, universal',
      'Shravana': 'Listening, Moon-ruled, learning',
      'Dhanishta': 'Wealth of music, Mars-ruled, rhythmic',
      'Shatabhisha': 'Hundred healers, Rahu-ruled, mysterious',
      'Purva Bhadrapada': 'Burning feet, Jupiter-ruled, intense',
      'Uttara Bhadrapada': 'Warrior of depth, Saturn-ruled, wise',
      'Revati': 'Wealthy end, Mercury-ruled, nurturing'
    };
    
    content.innerHTML = `
      <div class="modal-header">
        <div class="modal-glyph">${SIGN_GLYPHS[chartData.lagna]}</div>
        <div>
          <h3 class="modal-title">${SIGNS[chartData.lagna]} Rising</h3>
          <p class="modal-subtitle">Your Ascendant • The Mask You Wear</p>
        </div>
      </div>
      
      <div class="modal-section">
        <div class="modal-section-title">Nakshatra</div>
        <div class="modal-section-content">
          <strong>${NAKSHATRAS[chartData.lagnaNakshatra]}</strong><br>
          ${nakDetails[NAKSHATRAS[chartData.lagnaNakshatra]] || 'Ancient lunar mansion'}
        </div>
      </div>
      
      <div class="modal-section">
        <div class="modal-section-title">What This Means</div>
        <div class="modal-section-content">
          The Ascendant is the zodiac sign rising on the eastern horizon at your birth moment. 
          It represents your physical body, personality, and how the world first perceives you.
          <br><br>
          With <strong>${SIGNS[chartData.lagna]} Rising</strong>, you approach life with the qualities 
          of this sign—it's the "costume" your soul chose for this incarnation.
        </div>
      </div>
      
      <div class="modal-insight">
        <div class="modal-insight-title">✦ Soul Insight</div>
        Through ${NAKSHATRAS[chartData.lagnaNakshatra]}, your soul enters the world with a specific 
        energetic signature. This nakshatra colors everything about how you begin new ventures 
        and how others initially experience you.
      </div>
    `;
    
    overlay.classList.add('active');
    return;
  }
  
  // Find the planet
  const planet = chartData.planets.find(p => p.name === planetName);
  if (!planet) return;
  
  const details = GRAHA_DETAILS[planetName];
  if (!details) return;
  
  // Build dignity info
  let dignityText = '';
  if (planet.exalted) dignityText = '✦ EXALTED — Operating at highest potential';
  else if (planet.debilitated) dignityText = '⚠ DEBILITATED — Working to overcome challenges';
  else if (planet.ownSign) dignityText = '🏠 OWN SIGN — Comfortable and strong';
  else dignityText = 'Neutral placement';
  
  content.innerHTML = `
    <div class="modal-header">
      <div class="modal-glyph">${planet.glyph}</div>
      <div>
        <h3 class="modal-title">${planetName}</h3>
        <p class="modal-subtitle">${details.sanskrit} • ${details.archetype}</p>
      </div>
    </div>
    
    <div class="modal-section">
      <div class="modal-section-title">Position</div>
      <div class="modal-section-content">
        <strong>${fmtDeg(planet.degree)}</strong> in <strong>${SIGNS[planet.sign]}</strong><br>
        ${ordinal(planet.house)} House • ${NAKSHATRAS[planet.nakshatra]} Nakshatra
        ${planet.retro ? '<br><em style="color: var(--brass);">℞ Retrograde</em>' : ''}
        ${planet.isAK ? '<br><strong style="color: var(--teal);">★ Ātmakāraka (Soul Significator)</strong>' : ''}
      </div>
    </div>
    
    <div class="modal-section">
      <div class="modal-section-title">Dignity</div>
      <div class="modal-section-content" style="color: ${planet.exalted ? 'var(--brass)' : planet.debilitated ? 'var(--danger)' : 'inherit'};">
        ${dignityText}
      </div>
    </div>
    
    <div class="modal-section">
      <div class="modal-section-title">Significations</div>
      <div class="modal-tags">
        ${details.significations.map(s => `<span class="modal-tag">${s}</span>`).join('')}
      </div>
    </div>
    
    <div class="modal-section">
      <div class="modal-section-title">The Role</div>
      <div class="modal-section-content">${details.theaterRole}</div>
    </div>
    
    <div class="modal-insight">
      <div class="modal-insight-title">✦ Spiritual Meaning</div>
      ${details.spiritualMeaning}
    </div>
    
    <button class="ai-insight-btn" onclick="generatePlanetInsight('${planetName}')" id="ai-insight-btn-${planetName}">
      <span class="ai-insight-btn-icon">✦</span>
      <span>Generate AI Insight for YOUR Chart</span>
    </button>
    <div id="ai-insight-result-${planetName}" class="ai-insight-result"></div>
  `;
  
  overlay.classList.add('active');
}

// Generate AI-powered personalized insight for a planet
async function generatePlanetInsight(planetName) {
  console.log('[JYOTI] generatePlanetInsight called for:', planetName);
  
  if (!chartData) {
    console.error('[JYOTI] No chart data');
    alert('Please calculate your chart first.');
    return;
  }
  
  if (!hasApiKey()) {
    console.error('[JYOTI] No API key');
    alert('Please connect your Oracle (API key) in the Prashna tab first.');
    return;
  }
  
  const btn = document.getElementById(`ai-insight-btn-${planetName}`);
  const resultDiv = document.getElementById(`ai-insight-result-${planetName}`);
  
  if (!btn || !resultDiv) {
    console.error('[JYOTI] Button or result div not found');
    return;
  }
  
  // Show loading state
  btn.disabled = true;
  btn.innerHTML = '<span class="ai-insight-btn-icon spinning">✦</span><span>Reading the stars...</span>';
  resultDiv.innerHTML = '';
  
  const planet = chartData.planets.find(p => p.name === planetName);
  if (!planet) {
    console.error('[JYOTI] Planet not found:', planetName);
    btn.disabled = false;
    btn.innerHTML = '<span class="ai-insight-btn-icon">✦</span><span>Generate AI Insight for YOUR Chart</span>';
    return;
  }
  
  const prompt = `You are a master Vedic astrologer. Give a brief but profound personal insight (3-4 sentences) about ${planetName} for this specific person:

Position: ${planetName} at ${fmtDeg(planet.degree)} in ${SIGNS[planet.sign]} (${ordinal(planet.house)} house)
Nakshatra: ${NAKSHATRAS[planet.nakshatra]}
${planet.exalted ? 'EXALTED - operating at highest potential' : ''}
${planet.debilitated ? 'DEBILITATED - working through challenges' : ''}
${planet.ownSign ? 'In own sign - comfortable and strong' : ''}
${planet.retro ? 'RETROGRADE - internalized energy' : ''}
${planet.isAK ? 'ATMAKARAKA - the soul significator' : ''}

Current Dasha: ${chartData.dasha?.maha?.planet} Mahādashā

Be specific to THIS placement. No generic descriptions. Speak directly to the person. Focus on what this placement means for their soul journey and current life phase.`;

  try {
    console.log('[JYOTI] Calling AI for planet insight...');
    const result = await callModelDirect(AI_MODELS.claude.id, prompt, 
      'You are a compassionate Vedic astrologer. Be concise, specific, and spiritually insightful.');
    
    console.log('[JYOTI] AI result:', result);
    
    if (result.error) {
      console.error('[JYOTI] AI error:', result.error);
      resultDiv.innerHTML = `<div class="ai-insight-error">Error: ${result.error}</div>`;
      resultDiv.classList.add('visible');
    } else if (result.text) {
      // Simple text display - convert line breaks to <br> for readability
      const formattedText = result.text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
        .replace(/\n\n/g, '</p><p>') // Paragraphs
        .replace(/\n/g, '<br>'); // Line breaks
      resultDiv.innerHTML = `<div class="ai-insight-content"><p>${formattedText}</p></div>`;
      resultDiv.classList.add('visible');
    } else {
      resultDiv.innerHTML = `<div class="ai-insight-error">No response received. Please try again.</div>`;
      resultDiv.classList.add('visible');
    }
  } catch (e) {
    console.error('[JYOTI] Error:', e);
    resultDiv.innerHTML = `<div class="ai-insight-error">Could not generate insight: ${e.message}</div>`;
    resultDiv.classList.add('visible');
  }
  
  // Reset button
  btn.disabled = false;
  btn.innerHTML = '<span class="ai-insight-btn-icon">✦</span><span>Generate Another Insight</span>';
}

// Generate AI insight for a house
async function generateHouseInsight(houseNum) {
  console.log('[JYOTI] generateHouseInsight called for house:', houseNum);
  
  if (!chartData) {
    console.error('[JYOTI] No chart data');
    alert('Please calculate your chart first.');
    return;
  }
  
  if (!hasApiKey()) {
    console.error('[JYOTI] No API key');
    alert('Please connect your Oracle (API key) in the Prashna tab first.');
    return;
  }
  
  const btn = document.getElementById(`house-insight-btn-${houseNum}`);
  const resultDiv = document.getElementById(`house-insight-result-${houseNum}`);
  
  if (!btn || !resultDiv) {
    console.error('[JYOTI] Button or result div not found');
    return;
  }
  
  // Show loading state
  btn.disabled = true;
  btn.innerHTML = '✦ Reading the stars...';
  resultDiv.innerHTML = '';
  
  const bhava = BHAVA_DETAILS[houseNum];
  const sign = (chartData.lagna + houseNum - 1) % 12;
  const planetsHere = chartData.planets.filter(p => p.house === houseNum);
  const houseLord = getHouseLord(sign);
  const lordPlanet = chartData.planets.find(p => p.name === houseLord);
  
  const prompt = `You are a master Vedic astrologer. Give a brief but profound personal insight (3-4 sentences) about the ${ordinal(houseNum)} house (${bhava.english}) for this specific person:

House Sign: ${SIGNS[sign]}
House Lord: ${houseLord} ${lordPlanet ? `in ${SIGNS[lordPlanet.sign]} (${ordinal(lordPlanet.house)} house)` : ''}
Planets in House: ${planetsHere.length > 0 ? planetsHere.map(p => `${p.name} at ${fmtDeg(p.degree)}${p.exalted ? ' (exalted)' : ''}${p.debilitated ? ' (debilitated)' : ''}`).join(', ') : 'Empty - lord rules from elsewhere'}

This house governs: ${bhava.keywords.join(', ')}
Spiritual significance: ${bhava.spiritual}

Current Dasha: ${chartData.dasha?.maha?.planet} Mahādashā

Be specific to THIS chart. No generic descriptions. Speak directly to the person. Focus on what this house reveals about their life journey.`;

  try {
    console.log('[JYOTI] Calling AI for house insight...');
    const result = await callModelDirect(AI_MODELS.claude.id, prompt, 
      'You are a compassionate Vedic astrologer. Be concise, specific, and spiritually insightful.');
    
    console.log('[JYOTI] AI result:', result);
    
    if (result.error) {
      console.error('[JYOTI] AI error:', result.error);
      resultDiv.innerHTML = `<div style="padding: 12px; background: #fee2e2; border-radius: 8px; color: #c0392b; font-size: 0.8rem;">Error: ${result.error}</div>`;
    } else if (result.text) {
      const formattedText = result.text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
      resultDiv.innerHTML = `<div style="padding: 16px; background: linear-gradient(135deg, rgba(201,162,39,0.1) 0%, rgba(26,95,122,0.1) 100%); border-radius: 12px; border-left: 3px solid var(--gold);"><p style="font-size: 0.85rem; line-height: 1.7; color: var(--ink-soft);">${formattedText}</p></div>`;
    } else {
      resultDiv.innerHTML = `<div style="padding: 12px; background: #fee2e2; border-radius: 8px; color: #c0392b; font-size: 0.8rem;">No response received. Please try again.</div>`;
    }
  } catch (e) {
    console.error('[JYOTI] Error:', e);
    resultDiv.innerHTML = `<div style="padding: 12px; background: #fee2e2; border-radius: 8px; color: #c0392b; font-size: 0.8rem;">Could not generate insight: ${e.message}</div>`;
  }
  
  // Reset button
  btn.disabled = false;
  btn.innerHTML = `✦ Ask Again About House ${houseNum}`;
}

// Helper: Get house lord based on sign
function getHouseLord(signIndex) {
  const lords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  return lords[signIndex] || 'Unknown';
}

window.generateHouseInsight = generateHouseInsight;

// Toggle house card expansion
window.toggleHouseCard = function(card) {
  const content = card.querySelector('.house-detail-content');
  const arrow = card.querySelector('.expand-arrow');
  const hint = card.querySelector('.expand-hint');
  
  if (content.style.display === 'none' || content.style.display === '') {
    content.style.display = 'block';
    if (arrow) arrow.style.transform = 'rotate(180deg)';
    if (hint) hint.textContent = 'Click to collapse ▲';
    card.classList.add('expanded');
  } else {
    content.style.display = 'none';
    if (arrow) arrow.style.transform = 'rotate(0deg)';
    if (hint) hint.textContent = 'Click to explore ▾';
    card.classList.remove('expanded');
  }
};

// Generate complete house report as PDF - ONE API call for all 12 houses
async function generateCompleteHouseReport() {
  console.log('[JYOTI] generateCompleteHouseReport called');
  
  if (!chartData) {
    console.error('[JYOTI] No chart data available');
    alert('Please calculate your chart first before generating a report.');
    return;
  }
  
  if (!hasApiKey()) {
    console.error('[JYOTI] No API key configured');
    alert('Please connect your Oracle (API key) in the Prashna tab first.');
    return;
  }
  
  const btn = document.getElementById('generate-house-report-btn');
  if (!btn) {
    console.error('[JYOTI] Button not found');
    return;
  }
  
  // Show loading state
  btn.disabled = true;
  btn.innerHTML = '⏳ Generating Report... (this may take 30-60 seconds)';
  btn.style.opacity = '0.7';
  
  console.log('[JYOTI] Building house data for prompt...');
  
  // Build comprehensive house data for prompt
  const houseDataList = [];
  for (let h = 1; h <= 12; h++) {
    const bhava = BHAVA_DETAILS[h];
    const sign = (chartData.lagna + h - 1) % 12;
    const planetsHere = chartData.planets.filter(p => p.house === h);
    const houseLord = getHouseLord(sign);
    const lordPlanet = chartData.planets.find(p => p.name === houseLord);
    
    houseDataList.push({
      num: h,
      name: bhava.english,
      sanskrit: bhava.sanskrit,
      sign: SIGNS[sign],
      lord: houseLord,
      lordPosition: lordPlanet ? `${SIGNS[lordPlanet.sign]} (House ${lordPlanet.house})` : 'N/A',
      planets: planetsHere.map(p => `${p.name}${p.exalted ? ' (exalted)' : ''}${p.debilitated ? ' (debilitated)' : ''}`).join(', ') || 'Empty',
      keywords: bhava.keywords.join(', ')
    });
  }
  
  const prompt = `You are a master Vedic astrologer creating a comprehensive house report. For EACH of the 12 houses below, provide a 2-3 sentence personalized insight based on the specific placements.

CHART DETAILS:
Name: ${chartData.name}
Ascendant: ${SIGNS[chartData.lagna]}
Current Dasha: ${chartData.dasha?.maha?.planet} Mahādashā

HOUSE DATA:
${houseDataList.map(h => `
House ${h.num} (${h.name} - ${h.sanskrit}):
- Sign: ${h.sign}
- Lord: ${h.lord} in ${h.lordPosition}
- Planets: ${h.planets}
- Themes: ${h.keywords}
`).join('\n')}

FORMAT YOUR RESPONSE EXACTLY LIKE THIS (use these exact markers):
===HOUSE 1===
[Your insight for House 1]
===HOUSE 2===
[Your insight for House 2]
...continue for all 12 houses...
===HOUSE 12===
[Your insight for House 12]

Be specific to THIS chart. Reference actual placements. Keep each insight focused and meaningful.`;

  try {
    console.log('[JYOTI] Calling AI model...');
    const result = await callModelDirect(AI_MODELS.claude.id, prompt, 
      'You are a compassionate Vedic astrologer. Provide clear, specific insights for each house.');
    
    console.log('[JYOTI] AI result:', result);
    
    if (result.error) {
      console.error('[JYOTI] AI error:', result.error);
      alert('Could not generate report: ' + result.error);
      btn.disabled = false;
      btn.innerHTML = '✦ Generate Complete House Report (PDF)';
      btn.style.opacity = '1';
      return;
    }
    
    if (result.text) {
      console.log('[JYOTI] Parsing response...');
      // Parse the response into house insights
      const insights = {};
      for (let h = 1; h <= 12; h++) {
        const regex = new RegExp(`===HOUSE ${h}===([\\s\\S]*?)(?====HOUSE|$)`);
        const match = result.text.match(regex);
        insights[h] = match ? match[1].trim() : 'Insight not available';
      }
      
      console.log('[JYOTI] Generating PDF...');
      // Generate PDF
      generateHouseReportPDF(insights, houseDataList);
      console.log('[JYOTI] PDF generation complete');
    } else {
      console.error('[JYOTI] No text in response');
      alert('No response received from AI. Please try again.');
    }
  } catch (e) {
    console.error('[JYOTI] Report generation error:', e);
    alert('Could not generate report: ' + e.message);
  }
  
  // Reset button
  btn.disabled = false;
  btn.innerHTML = '✦ Generate Complete House Report (PDF)';
  btn.style.opacity = '1';
}

// Generate the PDF
function generateHouseReportPDF(insights, houseDataList) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  
  // Colors (RGB arrays)
  const prussian = [26, 95, 122];
  const gold = [201, 162, 39];
  const ink = [45, 45, 45];
  const muted = [120, 120, 120];
  const lightGrey = [245, 245, 245];
  
  let y = margin;
  let pageNum = 1;
  
  // House colors
  const HOUSE_COLORS = {
    1: [26,95,122], 2: [34,139,34], 3: [218,165,32], 4: [75,0,130],
    5: [184,134,11], 6: [178,34,34], 7: [199,21,133], 8: [106,13,173],
    9: [210,105,30], 10: [25,25,112], 11: [0,128,128], 12: [128,0,128]
  };
  
  // Helper: Add page header
  function addHeader() {
    doc.setFontSize(8);
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.text('JYOTI - Bhava Analysis Report', margin, 12);
    doc.text(chartData.name, pageWidth - margin, 12, { align: 'right' });
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, 15, pageWidth - margin, 15);
    y = 25;
  }
  
  // Helper: Add page footer
  function addFooter() {
    doc.setFontSize(8);
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.text('Page ' + pageNum, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }
  
  // ══════════════════════════════════════════════════════════════════
  // COVER PAGE
  // ══════════════════════════════════════════════════════════════════
  
  // Header bar
  doc.setFillColor(prussian[0], prussian[1], prussian[2]);
  doc.rect(0, 0, pageWidth, 6, 'F');
  doc.setFillColor(gold[0], gold[1], gold[2]);
  doc.rect(0, 6, pageWidth, 1.5, 'F');
  
  // Title
  doc.setFontSize(32);
  doc.setTextColor(prussian[0], prussian[1], prussian[2]);
  doc.text('JYOTI', pageWidth / 2, 45, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(gold[0], gold[1], gold[2]);
  doc.text('SCIENCE OF LIGHT', pageWidth / 2, 54, { align: 'center' });
  
  // Divider
  doc.setDrawColor(gold[0], gold[1], gold[2]);
  doc.setLineWidth(0.5);
  doc.line(70, 65, 140, 65);
  
  // Report title
  doc.setFontSize(16);
  doc.setTextColor(ink[0], ink[1], ink[2]);
  doc.text('Bhava Analysis Report', pageWidth / 2, 82, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text('The Twelve Houses of Life', pageWidth / 2, 90, { align: 'center' });
  
  // Info box
  doc.setFillColor(lightGrey[0], lightGrey[1], lightGrey[2]);
  doc.roundedRect(margin + 25, 105, contentWidth - 50, 45, 3, 3, 'F');
  
  doc.setFontSize(16);
  doc.setTextColor(ink[0], ink[1], ink[2]);
  doc.text(chartData.name, pageWidth / 2, 120, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text('Born: ' + chartData.dob + ' at ' + chartData.tob, pageWidth / 2, 130, { align: 'center' });
  doc.text(chartData.place, pageWidth / 2, 138, { align: 'center' });
  
  // Chart details
  doc.setFontSize(11);
  doc.setTextColor(prussian[0], prussian[1], prussian[2]);
  doc.text('Lagna: ' + SIGNS[chartData.lagna], pageWidth / 2 - 30, 165, { align: 'center' });
  var dashaText = 'Dasha: ';
  if (chartData.dasha && chartData.dasha.maha && chartData.dasha.maha.planet) {
    dashaText += chartData.dasha.maha.planet;
  } else {
    dashaText += 'N/A';
  }
  doc.text(dashaText, pageWidth / 2 + 30, 165, { align: 'center' });
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text('Generated by JYOTI - Vedic Astrology', pageWidth / 2, pageHeight - 20, { align: 'center' });
  doc.text(new Date().toLocaleDateString(), pageWidth / 2, pageHeight - 14, { align: 'center' });
  
  // Footer bar
  doc.setFillColor(gold[0], gold[1], gold[2]);
  doc.rect(0, pageHeight - 7.5, pageWidth, 1.5, 'F');
  doc.setFillColor(prussian[0], prussian[1], prussian[2]);
  doc.rect(0, pageHeight - 6, pageWidth, 6, 'F');
  
  // ══════════════════════════════════════════════════════════════════
  // HOUSE PAGES
  // ══════════════════════════════════════════════════════════════════
  
  doc.addPage();
  addHeader();
  
  for (var h = 1; h <= 12; h++) {
    var houseData = houseDataList[h - 1];
    var insight = insights[h] || 'Insight not available for this house.';
    
    // Calculate space needed
    doc.setFontSize(10);
    var insightLines = doc.splitTextToSize(insight, contentWidth - 24);
    
    // Also check detail lines length
    doc.setFontSize(9);
    var detailLine1 = 'Sign: ' + houseData.sign + '  |  Lord: ' + houseData.lord + ' in ' + houseData.lordPosition;
    var detail1Lines = doc.splitTextToSize(detailLine1, contentWidth - 24);
    var detailLine2 = 'Planets: ' + houseData.planets;
    var detail2Lines = doc.splitTextToSize(detailLine2, contentWidth - 24);
    
    var cardHeight = 35 + (detail1Lines.length * 5) + (detail2Lines.length * 5) + (insightLines.length * 5);
    
    // Check if we need a new page
    if (y + cardHeight > pageHeight - 25) {
      addFooter();
      pageNum++;
      doc.addPage();
      addHeader();
    }
    
    // Card background
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(230, 230, 230);
    doc.roundedRect(margin, y, contentWidth, cardHeight, 3, 3, 'FD');
    
    // Left color accent
    var hColor = HOUSE_COLORS[h];
    doc.setFillColor(hColor[0], hColor[1], hColor[2]);
    doc.rect(margin, y, 4, cardHeight, 'F');
    
    // House number and name on same line with proper spacing
    doc.setFontSize(13);
    doc.setTextColor(prussian[0], prussian[1], prussian[2]);
    var houseLabel = 'House ' + h + ': ';
    doc.text(houseLabel, margin + 12, y + 11);
    
    // Get width of house label to position name correctly
    var labelWidth = doc.getTextWidth(houseLabel);
    
    doc.setFontSize(12);
    doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.text(houseData.name, margin + 12 + labelWidth, y + 11);
    
    y += 20;
    
    // Details line 1 (already split in calculation section)
    doc.setFontSize(9);
    doc.setTextColor(muted[0], muted[1], muted[2]);
    for (var d1 = 0; d1 < detail1Lines.length; d1++) {
      doc.text(detail1Lines[d1], margin + 12, y);
      y += 5;
    }
    y += 1;
    
    // Details line 2 - planets (already split in calculation section)
    for (var d2 = 0; d2 < detail2Lines.length; d2++) {
      doc.text(detail2Lines[d2], margin + 12, y);
      y += 5;
    }
    y += 5;
    for (var d2 = 0; d2 < detail2Lines.length; d2++) {
      doc.text(detail2Lines[d2], margin + 12, y);
      y += 5;
    }
    y += 5;
    
    // Insight text
    doc.setFontSize(10);
    doc.setTextColor(ink[0], ink[1], ink[2]);
    for (var i = 0; i < insightLines.length; i++) {
      doc.text(insightLines[i], margin + 12, y);
      y += 5;
    }
    
    y += 8;
  }
  
  addFooter();
  
  // Save
  var fileName = 'JYOTI-Bhava-Report-' + chartData.name.replace(/[^a-zA-Z0-9]/g, '-') + '.pdf';
  doc.save(fileName);
}

window.generateCompleteHouseReport = generateCompleteHouseReport;

// Generate complete planet report as PDF - ONE API call for all 9 planets
async function generateCompletePlanetReport() {
  console.log('[JYOTI] generateCompletePlanetReport called');
  
  if (!chartData) {
    console.error('[JYOTI] No chart data available');
    alert('Please calculate your chart first before generating a report.');
    return;
  }
  
  if (!hasApiKey()) {
    console.error('[JYOTI] No API key configured');
    alert('Please connect your Oracle (API key) in the Prashna tab first.');
    return;
  }
  
  const btn = document.getElementById('generate-planet-report-btn');
  if (!btn) {
    console.error('[JYOTI] Button not found');
    return;
  }
  
  // Show loading state
  btn.disabled = true;
  btn.innerHTML = '⏳ Generating Report... (this may take 30-60 seconds)';
  btn.style.opacity = '0.7';
  
  console.log('[JYOTI] Building planet data for prompt...');
  
  // Build comprehensive planet data for prompt
  const planetDataList = chartData.planets.map(p => {
    const d = GRAHA_DETAILS[p.name] || {};
    return {
      name: p.name,
      glyph: p.glyph,
      sign: SIGNS[p.sign],
      degree: fmtDeg(p.degree),
      house: p.house,
      nakshatra: NAKSHATRAS[p.nakshatra],
      exalted: p.exalted,
      debilitated: p.debilitated,
      ownSign: p.ownSign,
      retro: p.retro,
      isAK: p.isAK,
      archetype: d.archetype || p.name,
      significations: d.significations ? d.significations.slice(0, 4).join(', ') : ''
    };
  });
  
  const prompt = `You are a master Vedic astrologer creating a comprehensive planet report. For EACH of the 9 planets below, provide a 2-3 sentence personalized insight based on the specific placements.

CHART DETAILS:
Name: ${chartData.name}
Ascendant: ${SIGNS[chartData.lagna]}
Current Dasha: ${chartData.dasha?.maha?.planet} Mahādashā

PLANET DATA:
${planetDataList.map(p => `
${p.name} (${p.archetype}):
- Position: ${p.sign} at ${p.degree} in House ${p.house}
- Nakshatra: ${p.nakshatra}
- Status: ${p.exalted ? 'EXALTED' : p.debilitated ? 'DEBILITATED' : p.ownSign ? 'Own Sign' : 'Neutral'}${p.retro ? ', RETROGRADE' : ''}${p.isAK ? ', ATMAKARAKA (Soul Significator)' : ''}
- Signifies: ${p.significations}
`).join('\n')}

FORMAT YOUR RESPONSE EXACTLY LIKE THIS (use these exact markers):
===SUN===
[Your insight for Sun]
===MOON===
[Your insight for Moon]
===MARS===
[Your insight for Mars]
===MERCURY===
[Your insight for Mercury]
===JUPITER===
[Your insight for Jupiter]
===VENUS===
[Your insight for Venus]
===SATURN===
[Your insight for Saturn]
===RAHU===
[Your insight for Rahu]
===KETU===
[Your insight for Ketu]

Be specific to THIS chart. Reference actual placements. Keep each insight focused and meaningful.`;

  try {
    console.log('[JYOTI] Calling AI model...');
    const result = await callModelDirect(AI_MODELS.claude.id, prompt, 
      'You are a compassionate Vedic astrologer. Provide clear, specific insights for each planet.');
    
    console.log('[JYOTI] AI result:', result);
    
    if (result.error) {
      console.error('[JYOTI] AI error:', result.error);
      alert('Could not generate report: ' + result.error);
      btn.disabled = false;
      btn.innerHTML = '✦ Generate Complete Planet Report (PDF)';
      btn.style.opacity = '1';
      return;
    }
    
    if (result.text) {
      console.log('[JYOTI] Parsing response...');
      // Parse the response into planet insights
      const insights = {};
      const planetNames = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
      planetNames.forEach(name => {
        const regex = new RegExp(`===${name.toUpperCase()}===([\\s\\S]*?)(?====|$)`);
        const match = result.text.match(regex);
        insights[name] = match ? match[1].trim() : 'Insight not available';
      });
      
      console.log('[JYOTI] Generating PDF...');
      // Generate PDF
      generatePlanetReportPDF(insights, planetDataList);
      console.log('[JYOTI] PDF generation complete');
    } else {
      console.error('[JYOTI] No text in response');
      alert('No response received from AI. Please try again.');
    }
  } catch (e) {
    console.error('[JYOTI] Report generation error:', e);
    alert('Could not generate report: ' + e.message);
  }
  
  // Reset button
  btn.disabled = false;
  btn.innerHTML = '✦ Generate Complete Planet Report (PDF)';
  btn.style.opacity = '1';
}

// Generate the Planet PDF
// Generate the Planet PDF
function generatePlanetReportPDF(insights, planetDataList) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  
  // Colors (RGB arrays)
  const prussian = [26, 95, 122];
  const gold = [201, 162, 39];
  const ink = [45, 45, 45];
  const muted = [120, 120, 120];
  const lightGrey = [245, 245, 245];
  const red = [220, 53, 69];
  const green = [40, 167, 69];
  
  let y = margin;
  let pageNum = 1;
  
  // Planet colors
  const PLANET_COLORS = {
    'Sun': [255, 165, 0], 
    'Moon': [169, 169, 169], 
    'Mars': [220, 53, 69],
    'Mercury': [40, 167, 69], 
    'Jupiter': [255, 193, 7], 
    'Venus': [232, 62, 140],
    'Saturn': [52, 58, 64], 
    'Rahu': [111, 66, 193], 
    'Ketu': [108, 117, 125]
  };
  
  // Helper: Add page header
  function addHeader() {
    doc.setFontSize(8);
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.text('JYOTI - Graha Analysis Report', margin, 12);
    doc.text(chartData.name, pageWidth - margin, 12, { align: 'right' });
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, 15, pageWidth - margin, 15);
    y = 25;
  }
  
  // Helper: Add page footer
  function addFooter() {
    doc.setFontSize(8);
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.text('Page ' + pageNum, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }
  
  // ══════════════════════════════════════════════════════════════════
  // COVER PAGE
  // ══════════════════════════════════════════════════════════════════
  
  // Header bar
  doc.setFillColor(prussian[0], prussian[1], prussian[2]);
  doc.rect(0, 0, pageWidth, 6, 'F');
  doc.setFillColor(gold[0], gold[1], gold[2]);
  doc.rect(0, 6, pageWidth, 1.5, 'F');
  
  // Title
  doc.setFontSize(32);
  doc.setTextColor(prussian[0], prussian[1], prussian[2]);
  doc.text('JYOTI', pageWidth / 2, 45, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(gold[0], gold[1], gold[2]);
  doc.text('SCIENCE OF LIGHT', pageWidth / 2, 54, { align: 'center' });
  
  // Divider
  doc.setDrawColor(gold[0], gold[1], gold[2]);
  doc.setLineWidth(0.5);
  doc.line(70, 65, 140, 65);
  
  // Report title
  doc.setFontSize(16);
  doc.setTextColor(ink[0], ink[1], ink[2]);
  doc.text('Graha Analysis Report', pageWidth / 2, 82, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text('The Nine Cosmic Influences', pageWidth / 2, 90, { align: 'center' });
  
  // Info box
  doc.setFillColor(lightGrey[0], lightGrey[1], lightGrey[2]);
  doc.roundedRect(margin + 25, 105, contentWidth - 50, 45, 3, 3, 'F');
  
  doc.setFontSize(16);
  doc.setTextColor(ink[0], ink[1], ink[2]);
  doc.text(chartData.name, pageWidth / 2, 120, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text('Born: ' + chartData.dob + ' at ' + chartData.tob, pageWidth / 2, 130, { align: 'center' });
  doc.text(chartData.place, pageWidth / 2, 138, { align: 'center' });
  
  // Chart details
  doc.setFontSize(11);
  doc.setTextColor(prussian[0], prussian[1], prussian[2]);
  doc.text('Lagna: ' + SIGNS[chartData.lagna], pageWidth / 2 - 30, 165, { align: 'center' });
  var dashaText = 'Dasha: ';
  if (chartData.dasha && chartData.dasha.maha && chartData.dasha.maha.planet) {
    dashaText += chartData.dasha.maha.planet;
  } else {
    dashaText += 'N/A';
  }
  doc.text(dashaText, pageWidth / 2 + 30, 165, { align: 'center' });
  
  // Planet summary grid
  doc.setFontSize(8);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text('Planets at a glance:', margin, 185);
  
  var summaryY = 193;
  var summaryX = margin;
  var colWidth = (contentWidth) / 5;
  
  for (var i = 0; i < planetDataList.length; i++) {
    var p = planetDataList[i];
    var pColor = PLANET_COLORS[p.name] || prussian;
    
    // Color dot
    doc.setFillColor(pColor[0], pColor[1], pColor[2]);
    doc.circle(summaryX + 2, summaryY - 1, 1.5, 'F');
    
    // Planet text
    doc.setFontSize(7);
    doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.text(p.name + ': ' + p.sign, summaryX + 5, summaryY);
    
    summaryX += colWidth;
    
    // New row after 5 planets
    if (i === 4) {
      summaryX = margin;
      summaryY += 8;
    }
  }
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text('Generated by JYOTI - Vedic Astrology', pageWidth / 2, pageHeight - 20, { align: 'center' });
  doc.text(new Date().toLocaleDateString(), pageWidth / 2, pageHeight - 14, { align: 'center' });
  
  // Footer bar
  doc.setFillColor(gold[0], gold[1], gold[2]);
  doc.rect(0, pageHeight - 7.5, pageWidth, 1.5, 'F');
  doc.setFillColor(prussian[0], prussian[1], prussian[2]);
  doc.rect(0, pageHeight - 6, pageWidth, 6, 'F');
  
  // ══════════════════════════════════════════════════════════════════
  // PLANET PAGES
  // ══════════════════════════════════════════════════════════════════
  
  doc.addPage();
  addHeader();
  
  for (var idx = 0; idx < planetDataList.length; idx++) {
    var planet = planetDataList[idx];
    var insight = insights[planet.name] || 'Insight not available for this planet.';
    
    // Calculate space needed
    doc.setFontSize(10);
    var insightLines = doc.splitTextToSize(insight, contentWidth - 24);
    
    // Check detail line length
    doc.setFontSize(9);
    var detailLine = planet.sign + '  |  ' + planet.degree + '  |  House ' + planet.house + '  |  ' + planet.nakshatra;
    var detailLines = doc.splitTextToSize(detailLine, contentWidth - 24);
    
    var cardHeight = 42 + (detailLines.length * 5) + (insightLines.length * 5);
    if (planet.retro) cardHeight += 6;
    
    // Check if we need a new page
    if (y + cardHeight > pageHeight - 25) {
      addFooter();
      pageNum++;
      doc.addPage();
      addHeader();
    }
    
    // Card background
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(230, 230, 230);
    doc.roundedRect(margin, y, contentWidth, cardHeight, 3, 3, 'FD');
    
    // Left color accent
    var plColor = PLANET_COLORS[planet.name] || prussian;
    doc.setFillColor(plColor[0], plColor[1], plColor[2]);
    doc.rect(margin, y, 4, cardHeight, 'F');
    
    // Planet name
    doc.setFontSize(14);
    doc.setTextColor(prussian[0], prussian[1], prussian[2]);
    doc.text(planet.name, margin + 12, y + 11);
    
    // Get width of planet name to position archetype
    var nameWidth = doc.getTextWidth(planet.name);
    
    // Archetype after planet name with proper spacing
    doc.setFontSize(10);
    doc.setTextColor(gold[0], gold[1], gold[2]);
    doc.text(' - ' + planet.archetype, margin + 12 + nameWidth, y + 11);
    
    // Status text on RIGHT side (simple text, no fancy badges)
    var statusParts = [];
    if (planet.isAK) statusParts.push('ATMAKARAKA');
    if (planet.exalted) statusParts.push('EXALTED');
    if (planet.debilitated) statusParts.push('DEBILITATED');
    if (planet.ownSign) statusParts.push('OWN SIGN');
    
    if (statusParts.length > 0) {
      doc.setFontSize(8);
      if (planet.exalted) {
        doc.setTextColor(green[0], green[1], green[2]);
      } else if (planet.debilitated) {
        doc.setTextColor(red[0], red[1], red[2]);
      } else {
        doc.setTextColor(gold[0], gold[1], gold[2]);
      }
      doc.text(statusParts.join(' | '), pageWidth - margin - 8, y + 11, { align: 'right' });
    }
    
    y += 20;
    
    // Details line (already split in calculation section)
    doc.setFontSize(9);
    doc.setTextColor(muted[0], muted[1], muted[2]);
    for (var dl = 0; dl < detailLines.length; dl++) {
      doc.text(detailLines[dl], margin + 12, y);
      y += 5;
    }
    y += 2;
    
    // Retrograde indicator
    if (planet.retro) {
      doc.setFontSize(8);
      doc.setTextColor(red[0], red[1], red[2]);
      doc.text('RETROGRADE', margin + 12, y);
      y += 6;
    }
    
    y += 4;
    
    // Insight text
    doc.setFontSize(10);
    doc.setTextColor(ink[0], ink[1], ink[2]);
    for (var j = 0; j < insightLines.length; j++) {
      doc.text(insightLines[j], margin + 12, y);
      y += 5;
    }
    
    y += 8;
  }
  
  addFooter();
  
  // Save
  var fileName = 'JYOTI-Graha-Report-' + chartData.name.replace(/[^a-zA-Z0-9]/g, '-') + '.pdf';
  doc.save(fileName);
}

window.generateCompletePlanetReport = generateCompletePlanetReport;

function showHouseModal(houseNum) {
  if (!chartData) return;
  
  const overlay = document.getElementById('chart-modal-overlay');
  const content = document.getElementById('chart-modal-content');
  
  if (!overlay || !content) return;
  
  const details = BHAVA_DETAILS[houseNum];
  if (!details) return;
  
  // Find planets in this house
  const planetsHere = chartData.planets.filter(p => p.house === houseNum);
  
  // Find the sign on this house
  const signOnHouse = (chartData.lagna + houseNum - 1) % 12;
  
  content.innerHTML = `
    <div class="modal-header">
      <div class="modal-glyph" style="font-size: 2rem; background: linear-gradient(135deg, var(--prussian) 0%, var(--teal) 100%); color: white; border-radius: 50%; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center;">${houseNum}</div>
      <div>
        <h3 class="modal-title">${ordinal(houseNum)} House</h3>
        <p class="modal-subtitle">${details.sanskrit} Bhāva • ${details.english}</p>
      </div>
    </div>
    
    <div class="modal-section">
      <div class="modal-section-title">Sign on Cusp</div>
      <div class="modal-section-content">
        <span style="font-size: 1.5rem; margin-right: 8px;">${SIGN_GLYPHS[signOnHouse]}</span>
        <strong>${SIGNS[signOnHouse]}</strong>
      </div>
    </div>
    
    <div class="modal-section">
      <div class="modal-section-title">Planets Here</div>
      <div class="modal-section-content">
        ${planetsHere.length > 0 
          ? planetsHere.map(p => `
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; cursor: pointer;" onclick="showPlanetModal('${p.name}')">
                <span style="font-size: 1.5rem;">${p.glyph}</span>
                <span><strong>${p.name}</strong> at ${fmtDeg(p.degree)}${p.exalted ? ' ✦' : ''}${p.debilitated ? ' ⚠' : ''}</span>
              </div>
            `).join('')
          : '<em style="color: var(--text-muted);">Empty house — ruled by its lord from elsewhere</em>'
        }
      </div>
    </div>
    
    <div class="modal-section">
      <div class="modal-section-title">Keywords</div>
      <div class="modal-tags">
        ${details.keywords.map(k => `<span class="modal-tag">${k}</span>`).join('')}
      </div>
    </div>
    
    <div class="modal-section">
      <div class="modal-section-title">Meaning</div>
      <div class="modal-section-content">${details.meaning}</div>
    </div>
    
    <div class="modal-insight">
      <div class="modal-insight-title">✦ ${details.questionToAsk}</div>
      ${details.spiritual}
    </div>
  `;
  
  overlay.classList.add('active');
}

function closeChartModal(event) {
  // If clicking the overlay background (not the modal itself), close
  if (event && event.target.id !== 'chart-modal-overlay') return;
  
  const overlay = document.getElementById('chart-modal-overlay');
  if (overlay) {
    overlay.classList.remove('active');
  }
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeChartModal();
});

// Generate shareable profile card
function generateProfileCard() {
  if (!chartData) return;
  
  const c = chartData;
  const sun = c.planets.find(p => p.name === 'Sun');
  const moon = c.planets.find(p => p.name === 'Moon');
  const ak = c.planets.find(p => p.name === c.atmakaraka);
  
  // Create canvas for the profile card - larger to include chart
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 1200);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#16213e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 800, 1200);
  
  // Gold accent bar at top
  ctx.fillStyle = '#c9a227';
  ctx.fillRect(0, 0, 800, 8);
  
  // JYOTI Logo
  ctx.fillStyle = '#c9a227';
  ctx.font = '700 42px "Cormorant Garamond", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('✦ JYOTI ✦', 400, 60);
  
  // Tagline
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('VEDIC ASTROLOGY', 400, 85);
  
  // Name
  ctx.fillStyle = '#ffffff';
  ctx.font = '300 36px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(c.name.toUpperCase(), 400, 140);
  
  // Birth info
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(`${c.dob} at ${c.tob} • ${c.place}`, 400, 170);
  
  // ═══════════════════════════════════════════════════════════
  // SOUTH INDIAN CHART
  // ═══════════════════════════════════════════════════════════
  const chartX = 150;
  const chartY = 200;
  const chartSize = 500;
  const cellSize = chartSize / 4;
  
  // Draw chart background
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fillRect(chartX, chartY, chartSize, chartSize);
  
  // Draw grid lines
  ctx.strokeStyle = 'rgba(201, 162, 39, 0.3)';
  ctx.lineWidth = 1;
  
  // Outer border
  ctx.strokeRect(chartX, chartY, chartSize, chartSize);
  
  // Inner grid - South Indian format (4x4 with center empty)
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(chartX + i * cellSize, chartY);
    ctx.lineTo(chartX + i * cellSize, chartY + chartSize);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(chartX, chartY + i * cellSize);
    ctx.lineTo(chartX + chartSize, chartY + i * cellSize);
    ctx.stroke();
  }
  
  // South Indian layout: fixed signs, houses rotate based on lagna
  const layout = [
    [11, 0, 1, 2],
    [10, null, null, 3],
    [9, null, null, 4],
    [8, 7, 6, 5]
  ];
  
  // Draw each cell
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const signOffset = layout[row][col];
      if (signOffset === null) continue;
      
      const cellX = chartX + col * cellSize;
      const cellY = chartY + row * cellSize;
      const sign = (c.lagna + signOffset) % 12;
      const houseNum = signOffset + 1;
      
      // Highlight Lagna house
      if (signOffset === 0) {
        ctx.fillStyle = 'rgba(201, 162, 39, 0.15)';
        ctx.fillRect(cellX + 1, cellY + 1, cellSize - 2, cellSize - 2);
      }
      
      // House number (top left)
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(houseNum.toString(), cellX + 8, cellY + 18);
      
      // Sign name
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(SIGNS[sign], cellX + cellSize/2, cellY + 35);
      
      // Planets in this house
      const planetsHere = c.planets.filter(p => p.house === houseNum);
      if (planetsHere.length > 0) {
        const planetStr = planetsHere.map(p => {
          let glyph = p.glyph;
          if (p.exalted) glyph += '✦';
          if (p.debilitated) glyph += '↓';
          if (p.retro) glyph += 'ℛ';
          return glyph;
        }).join(' ');
        
        ctx.fillStyle = '#c9a227';
        ctx.font = '18px serif';
        ctx.fillText(planetStr, cellX + cellSize/2, cellY + 70);
      }
    }
  }
  
  // Center text
  ctx.fillStyle = '#c9a227';
  ctx.font = '14px "Cormorant Garamond", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('RĀŚI CHART', 400, chartY + chartSize/2 - 10);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(`Lagna: ${SIGNS[c.lagna]}`, 400, chartY + chartSize/2 + 15);
  
  // ═══════════════════════════════════════════════════════════
  // PLANET POSITIONS LIST
  // ═══════════════════════════════════════════════════════════
  const listY = chartY + chartSize + 40;
  
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PLANETARY POSITIONS', 400, listY);
  
  // Two columns of planets
  const leftPlanets = c.planets.slice(0, 5);
  const rightPlanets = c.planets.slice(5, 9);
  
  leftPlanets.forEach((p, i) => {
    const y = listY + 30 + i * 28;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#c9a227';
    ctx.font = '16px serif';
    ctx.fillText(p.glyph, 120, y);
    ctx.fillStyle = '#ffffff';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(`${p.name}: ${SIGNS[p.sign]}`, 150, y);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(`${NAKSHATRAS[p.nakshatra]} • H${p.house}`, 150, y + 12);
  });
  
  rightPlanets.forEach((p, i) => {
    const y = listY + 30 + i * 28;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#c9a227';
    ctx.font = '16px serif';
    ctx.fillText(p.glyph, 420, y);
    ctx.fillStyle = '#ffffff';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(`${p.name}: ${SIGNS[p.sign]}`, 450, y);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(`${NAKSHATRAS[p.nakshatra]} • H${p.house}`, 450, y + 12);
  });
  
  // ═══════════════════════════════════════════════════════════
  // KEY INFO SECTION
  // ═══════════════════════════════════════════════════════════
  const infoY = listY + 180;
  
  ctx.strokeStyle = 'rgba(201, 162, 39, 0.3)';
  ctx.beginPath();
  ctx.moveTo(100, infoY);
  ctx.lineTo(700, infoY);
  ctx.stroke();
  
  // Atmakaraka
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText('ĀTMAKĀRAKA (SOUL TEACHER)', 250, infoY + 30);
  ctx.fillStyle = '#c9a227';
  ctx.font = '20px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(c.atmakaraka, 250, infoY + 55);
  
  // Current Dasha
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText('CURRENT MAHĀDASHĀ', 550, infoY + 30);
  ctx.fillStyle = '#c9a227';
  ctx.font = '20px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(c.dasha.maha.planet, 550, infoY + 55);
  
  const endDate = new Date(c.dasha.maha.end);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(`until ${endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`, 550, infoY + 75);
  
  // Footer
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText('Generated by JYOTI • jyoti.app', 400, 1160);
  
  // Download the image
  const link = document.createElement('a');
  link.download = `${c.name.replace(/\s+/g, '-')}-jyoti-chart.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// Expose globally
window.showPlanetModal = showPlanetModal;
window.showHouseModal = showHouseModal;
window.generatePlanetInsight = generatePlanetInsight;
window.generateAIPlanetInsight = function(planetName) {
  // Open the planet modal and trigger AI insight
  showPlanetModal(planetName);
  setTimeout(() => generatePlanetInsight(planetName), 500);
};
window.generateProfileCard = generateProfileCard;
window.closeChartModal = closeChartModal;
window.showSection = showSection;

const sections = {
  learn: renderLearn,
  overview: renderOverview,
  prashna: renderPrashna,
  narrative: renderNarrative,
  planets: renderPlanets,
  houses: renderHouses,
  dashas: renderDashas,
  chart: () => typeof window.renderEnhancedChart === 'function' ? window.renderEnhancedChart() : renderChart(),
  glossary: renderGlossary
};

function showSection(section) {
  document.querySelectorAll('.nav-pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.section === section);
  });
  
  const contentArea = document.getElementById('content-area');
  
  // Cinematic exit
  contentArea.classList.add('cinematic-exit');
  
  // Always hide house wheel - it's confusing
  hideHouseWheel();
  
  setTimeout(() => {
    try {
      contentArea.innerHTML = sections[section]();
      
      // Cinematic enter
      contentArea.classList.remove('cinematic-exit');
      contentArea.classList.add('cinematic-enter');
      
      // Initialize liquid cards
      setTimeout(initLiquidCards, 100);
      
      // Initialize orbital wheel if planets section
      if (section === 'planets') {
        setTimeout(() => {
          const container = document.getElementById('orbital-wheel-container');
          if (container && chartData && chartData.planets) {
            renderOrbitalWheel(chartData.planets, container);
          }
        }, 150);
      }
      
      // Trigger stagger animations
      const staggerContainers = contentArea.querySelectorAll('.stagger-children');
      staggerContainers.forEach((container, i) => {
        setTimeout(() => container.classList.add('revealed'), 100 + i * 50);
      });
      
      setTimeout(() => contentArea.classList.remove('cinematic-enter'), 500);
      
    } catch (error) {
      contentArea.classList.remove('cinematic-exit');
      contentArea.innerHTML = `
        <div style="padding: 40px; background: #fee2e2; border: 2px solid #dc2626; border-radius: 16px; margin: 20px;">
          <h3 style="color: #dc2626; margin-bottom: 16px;">⚠️ Error rendering "${section}"</h3>
          <pre style="background: #fff; padding: 20px; border-radius: 8px; overflow: auto; font-size: 12px; white-space: pre-wrap;">${error.message}

${error.stack}</pre>
          <p style="margin-top: 16px; color: #666;">Please screenshot this error message.</p>
        </div>
      `;
      console.error('Section render error:', error);
      return;
    }
    
    window.scrollTo({ top: 200, behavior: 'smooth' });
  }, 300);
}

function updateAnchorBar() {
  const c = chartData;
  const ak = c.planets.find(p => p.name === c.atmakaraka);
  
  document.getElementById('anchor-lagna-glyph').textContent = SIGN_GLYPHS[c.lagna];
  document.getElementById('anchor-lagna').textContent = SIGNS[c.lagna];
  
  document.getElementById('anchor-ak-glyph').textContent = P_GLYPHS[c.atmakaraka];
  document.getElementById('anchor-ak').textContent = c.atmakaraka;
  
  document.getElementById('anchor-dasha-glyph').textContent = P_GLYPHS[c.dasha.maha.planet];
  document.getElementById('anchor-dasha').textContent = c.dasha.maha.planet;
}

// ════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ════════════════════════════════════════════════════════════════════════════

async function init() {
  const loadingText = document.getElementById('loading-text');
  
  // Wait for ephemeris initialization to complete
  try {
    await ephemerisInitPromise;
    
    // Show which ephemeris source is being used
    const sourceIcon = ephemerisSource.includes('swiss') || ephemerisSource.includes('sweph') ? '🔬' : '✓';
    const sourceLabel = ephemerisSource.includes('swiss') || ephemerisSource.includes('sweph') 
      ? 'Swiss Ephemeris' 
      : (ephemerisSource === 'astronomy-engine' ? 'Astronomy Engine' : ephemerisSource);
    
    loadingText.textContent = `${sourceIcon} ${sourceLabel} ready`;
    console.log(`✓ Ephemeris initialized: ${ephemerisSource}`);
  } catch (e) {
    loadingText.textContent = '⚠️ Ephemeris error - using fallback';
    console.warn('Ephemeris init error:', e);
  }
  
  // Load any saved model overrides
  loadModelOverrides();
  
  // Setup location autocomplete
  setupLocationAutocomplete();
  
  // Sticky nav shadow on scroll
  const navSection = document.querySelector('.nav-section');
  if (navSection) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        navSection.classList.add('scrolled');
      } else {
        navSection.classList.remove('scrolled');
      }
    }, { passive: true });
  }
  
  // Hide loading overlay
  setTimeout(() => {
    document.getElementById('loading-overlay').classList.add('fade-out');
  }, 800);
  
  // Check for model updates (after 2 seconds, non-blocking)
  setTimeout(() => {
    if (openRouterKey) {
      checkForModelUpdates();
    }
  }, 2000);
  
  // Form submission
  document.getElementById('birth-form').addEventListener('submit', e => {
    e.preventDefault();
    
    if (!selectedLocation) {
      alert('Please select a birth location');
      return;
    }
    
    const name = document.getElementById('name').value;
    const dob = document.getElementById('dob').value;
    const tobRaw = document.getElementById('tob').value;
    const lat = parseFloat(document.getElementById('lat').value);
    const lon = parseFloat(document.getElementById('lon').value);
    const tz = document.getElementById('tz').value;
    
    // Parse time input (supports 14:00, 14.00, 2pm, 2:00 PM, etc.)
    const parsedTime = parseTimeInput(tobRaw);
    if (!parsedTime) {
      alert('Invalid time format. Please use formats like: 14:00, 14.00, 2pm, 2:00 PM');
      return;
    }
    const tob = parsedTime.formatted24; // Use 24-hour format internally
    
    chartData = window.chartData = computeChart(name, dob, tob, lat, lon, tz, selectedLocation.name);
    
    // Update ambient background based on current Dasha
    updateDashaAmbient(chartData.dasha?.maha?.planet);
    
    // Switch to results view
    document.getElementById('threshold').classList.add('hidden');
    document.getElementById('learning-section').classList.add('hidden');
    document.getElementById('sanctum').classList.remove('hidden');
    
    updateAnchorBar();
    showSection('overview');
    
    // Scroll to top of results (show anchor bar + nav at top of viewport)
    setTimeout(() => {
      document.querySelector('.anchor-bar').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  });
  
  // Navigation pills
  document.querySelectorAll('.nav-pill').forEach(pill => {
    pill.addEventListener('click', () => showSection(pill.dataset.section));
  });
  
  // Logo triple-tap for settings
  document.getElementById('logo-star').addEventListener('click', () => {
    logoTapCount++;
    clearTimeout(logoTapTimer);
    logoTapTimer = setTimeout(() => logoTapCount = 0, 600);
    
    if (logoTapCount >= 3) {
      logoTapCount = 0;
      alert('Settings panel coming soon!');
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTONOMOUS TEST HARNESS — Run via console: runOracleTests()
// ═══════════════════════════════════════════════════════════════════════════

const TEST_QUESTIONS = [
  { q: "When will I come out of my financial debts?", category: "finance", houses: [2, 6, 11] },
  { q: "Will I find my life partner soon?", category: "relationship", houses: [7, 5, 1] },
  { q: "Is this a good time to start my own business?", category: "career", houses: [10, 1, 7, 11] },
  { q: "How can I improve my health?", category: "health", houses: [1, 6, 8] },
  { q: "Should I move to another country for work?", category: "travel", houses: [9, 4, 10, 12] },
  { q: "What is my spiritual purpose in this life?", category: "spiritual", houses: [9, 12, 5] },
  { q: "Will I succeed in my creative pursuits?", category: "creative", houses: [5, 3, 10] },
  { q: "How is my relationship with my children going to evolve?", category: "family", houses: [5, 9, 4] },
  { q: "Is investing in real estate good for me?", category: "property", houses: [4, 2, 11] },
  { q: "What should I focus on in the next 6 months?", category: "timing", houses: [1, 10, 9] }
];

function analyzeOracleResponse(text, chartData) {
  const analysis = {
    wordCount: text.split(/\s+/).length,
    hasFactCheck: /fact.?check|verified|✓/i.test(text),
    citesSpecificDegrees: /\d+\.?\d*°/.test(text),
    citesHouses: (text.match(/\d+(st|nd|rd|th)\s+house/gi) || []).length,
    mentionsDasha: /dasha|mahādashā/i.test(text),
    hasTiming: /\d{4}|months?|years?|june|july/i.test(text),
    hasReflection: /\?[^?]*$/m.test(text),
    hasPracticalGuidance: /should|recommend|focus|practice|avoid|embrace/i.test(text),
    wrongDateReference: /202[0-4]|early 2025/i.test(text) && !/was|were|past|before/i.test(text),
    poeticWords: ['celestial','cosmic','wisdom','journey','path','transformation','sacred','divine','illuminate'].filter(w => text.toLowerCase().includes(w)).length,
    errors: []
  };
  
  // Verify planetary positions
  if (chartData?.planets) {
    chartData.planets.forEach(planet => {
      const wrongHouseRegex = new RegExp(`${planet.name}[^.]{0,50}in\\s*(\\d+)(st|nd|rd|th)\\s*house`, 'i');
      const match = text.match(wrongHouseRegex);
      if (match) {
        const claimedHouse = parseInt(match[1]);
        if (claimedHouse !== planet.house) {
          analysis.errors.push(`${planet.name}: claimed ${claimedHouse}${match[2]}, actual ${ordinal(planet.house)}`);
        }
      }
    });
  }
  
  // Quality score
  analysis.qualityScore = Math.min(100,
    (analysis.citesSpecificDegrees ? 15 : 0) +
    (analysis.citesHouses >= 3 ? 15 : analysis.citesHouses * 5) +
    (analysis.mentionsDasha ? 10 : 0) +
    (analysis.hasTiming ? 10 : 0) +
    (analysis.hasReflection ? 10 : 0) +
    (analysis.hasPracticalGuidance ? 10 : 0) +
    (analysis.hasFactCheck ? 10 : 0) +
    (analysis.wordCount >= 300 && analysis.wordCount <= 600 ? 10 : 5) +
    (analysis.errors.length === 0 ? 10 : -analysis.errors.length * 5) +
    (analysis.wrongDateReference ? -15 : 0) +
    (analysis.poeticWords * 2)
  );
  
  return analysis;
}

window.runOracleTests = async function(numTests = 10) {
  if (!chartData) {
    console.error('❌ No chart loaded! Enter birth data first.');
    return;
  }
  if (!hasApiKey()) {
    console.error('❌ No API key! Configure OpenRouter first.');
    return;
  }
  
  console.log('%c╔══════════════════════════════════════════════════════════════════╗', 'color: #1a5f7a; font-weight: bold');
  console.log('%c║     JYOTI ORACLE COUNCIL — AUTONOMOUS TEST HARNESS              ║', 'color: #1a5f7a; font-weight: bold');
  console.log('%c╚══════════════════════════════════════════════════════════════════╝', 'color: #1a5f7a; font-weight: bold');
  console.log(`\n📋 Chart: ${chartData.name} | Testing ${numTests} questions\n`);
  
  const results = [];
  const chartContext = buildChartContext();
  const questions = TEST_QUESTIONS.slice(0, numTests);
  
  for (let i = 0; i < questions.length; i++) {
    const { q, category, houses } = questions[i];
    console.log(`\n%c[${i+1}/${numTests}] ${category.toUpperCase()}`, 'color: #c9a227; font-weight: bold');
    console.log(`   Q: "${q}"`);
    
    const startTime = Date.now();
    
    try {
      const response = await askOracleCouncil(q, chartContext);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      
      if (response.text) {
        const analysis = analyzeOracleResponse(response.text, chartData);
        
        results.push({
          question: q,
          category,
          response: response.text,
          councilSize: response.councilSize,
          analysis,
          elapsed
        });
        
        const scoreColor = analysis.qualityScore >= 80 ? 'color: #2d6a4f' : 
                          analysis.qualityScore >= 60 ? 'color: #e9c46a' : 'color: #e63946';
        
        console.log(`   %cScore: ${analysis.qualityScore}/100`, scoreColor + '; font-weight: bold');
        console.log(`   📝 Words: ${analysis.wordCount} | Houses: ${analysis.citesHouses} | Degrees: ${analysis.citesSpecificDegrees ? '✓' : '✗'} | Time: ${elapsed}s`);
        
        if (analysis.errors.length > 0) {
          console.log(`   %c⚠️ ERRORS: ${analysis.errors.join('; ')}`, 'color: #e63946');
        }
        if (analysis.wrongDateReference) {
          console.log(`   %c⚠️ WRONG DATE REFERENCE`, 'color: #e63946');
        }
      } else {
        console.log(`   ❌ Failed: ${response.error}`);
        results.push({ question: q, category, error: response.error });
      }
    } catch (e) {
      console.log(`   ❌ Error: ${e.message}`);
      results.push({ question: q, category, error: e.message });
    }
    
    // Delay between tests
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Summary
  const valid = results.filter(r => r.analysis);
  const avgScore = valid.reduce((s, r) => s + r.analysis.qualityScore, 0) / valid.length;
  const totalErrors = valid.reduce((s, r) => s + r.analysis.errors.length, 0);
  const avgTime = valid.reduce((s, r) => s + parseFloat(r.elapsed), 0) / valid.length;
  
  console.log('\n%c═══════════════════════════════════════════════════════════════════', 'color: #1a5f7a');
  console.log('%c                    QUALITY ANALYSIS REPORT', 'color: #1a5f7a; font-weight: bold');
  console.log('%c═══════════════════════════════════════════════════════════════════', 'color: #1a5f7a');
  
  console.log(`\n📊 OVERALL METRICS:`);
  console.log(`   Average Quality Score: %c${avgScore.toFixed(1)}/100`, avgScore >= 75 ? 'color: #2d6a4f; font-weight: bold' : 'color: #e9c46a');
  console.log(`   Total Factual Errors: ${totalErrors}`);
  console.log(`   Average Response Time: ${avgTime.toFixed(1)}s`);
  console.log(`   Fact-Check Visible: ${valid.filter(r => r.analysis.hasFactCheck).length}/${valid.length}`);
  console.log(`   Cites Degrees: ${valid.filter(r => r.analysis.citesSpecificDegrees).length}/${valid.length}`);
  console.log(`   Has Reflection: ${valid.filter(r => r.analysis.hasReflection).length}/${valid.length}`);
  
  console.log(`\n📂 BY CATEGORY:`);
  const cats = [...new Set(valid.map(r => r.category))];
  cats.forEach(cat => {
    const catResults = valid.filter(r => r.category === cat);
    const catAvg = catResults.reduce((s, r) => s + r.analysis.qualityScore, 0) / catResults.length;
    console.log(`   ${cat.padEnd(12)}: ${catAvg.toFixed(0)}/100`);
  });
  
  // AI 2030 Improvements
  console.log('\n%c═══════════════════════════════════════════════════════════════════', 'color: #c9a227');
  console.log('%c       AI 2030 × APPLE STYLE — IMPROVEMENT SUGGESTIONS', 'color: #c9a227; font-weight: bold');
  console.log('%c═══════════════════════════════════════════════════════════════════\n', 'color: #c9a227');
  
  const improvements = [
    { title: '🎯 CONFIDENCE MARKERS', desc: 'Add ⭐⭐⭐/⭐⭐/⭐ when models agree/partially agree/diverge', priority: 'HIGH' },
    { title: '⚡ STREAMING RESPONSE', desc: 'Stream synthesis token-by-token. 15s wait → instant feedback', priority: 'HIGH' },
    { title: '📊 VISIBLE FACT-CHECK', desc: 'Show "VERIFIED: Sun 28°10\' Aries ✓" before reading', priority: 'HIGH' },
    { title: '🎭 THREE-ACT STRUCTURE', desc: 'Format as: The Now → The Transition → The Emerging Path', priority: 'MEDIUM' },
    { title: '✨ ACTION CARDS', desc: 'End with 3 cards: "This Week" / "This Month" / "This Year"', priority: 'MEDIUM' },
    { title: '📈 PLANET STRENGTH VIZ', desc: 'Mini strength bars for relevant planets (Apple-style)', priority: 'LOW' },
    { title: '🔍 DISAGREEMENT TRANSPARENCY', desc: 'Show when Claude vs GPT-5.2 see differently', priority: 'MEDIUM' }
  ];
  
  improvements.forEach((imp, i) => {
    console.log(`${i+1}. %c${imp.title}`, 'font-weight: bold');
    console.log(`   ${imp.desc}`);
    console.log(`   Priority: ${imp.priority}\n`);
  });
  
  // Store for later
  window.lastTestResults = { results, avgScore, totalErrors, improvements };
  console.log('\n💾 Results stored in window.lastTestResults');
  
  return { results, avgScore, totalErrors, improvements };
};

// Quick test - just 3 questions
window.quickOracleTest = () => runOracleTests(3);

console.log('🧪 Test harness ready! Run: runOracleTests() or quickOracleTest()');

// Start
init();

})(); // End async IIFE
