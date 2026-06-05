/* ═══════════════════════════════════════════════════════════
   growing-up / js / main.js
   Navigation, garden growth, progress tracking, transitions
═══════════════════════════════════════════════════════════ */

/* ── Room order (used for progress calculation) ── */
const ROOM_ORDER = [
  'title',
  'B01', 'B02a', 'B02b', 'B03', 'B04', 'B05', 'B06',
  'T01', 'T02',  'T03',  'T04', 'T05', 'T05a','T05b','T05c','T06','T07',
  'A01', 'A02',  'A03',  'A04', 'A05', 'A06', 'A07', 'A08', 'end'
];

const TOTAL_UNIQUE = 22; // unique story rooms (excludes title, excludes loops)

/* ── Stage display labels ── */
const STAGE_LABELS = {
  birth: 'Birth',
  teen:  'Teen Years',
  adult: 'Adulthood',
  final: 'The Ordinary Day'
};

/* ── Garden SVG layers and the progress threshold at which each appears ── */
const GARDEN_LAYERS = [
  { id: 'g-grass',    threshold: 0.02 },
  { id: 'g-shrubs',   threshold: 0.12 },
  { id: 'g-flowers',  threshold: 0.30 },
  { id: 'g-trees-sm', threshold: 0.50 },
  { id: 'g-trees-lg', threshold: 0.70 },
  { id: 'g-canopy',   threshold: 0.90 },
];

/* ── State ── */
let visitedRooms = new Set(['title']);
let currentRoom  = 'title';
let isFinalRoom  = false;

/* ══════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════ */

/**
 * Navigate to a room by ID.
 * Called from onclick handlers in index.html.
 */
function go(roomId) {
  // Hide the current room
  const currentEl = document.getElementById('room-' + currentRoom);
  if (currentEl) currentEl.classList.remove('active');

  // Resolve element ID ('title' maps to the title card)
  const targetId = roomId === 'title' ? 'room-title' : 'room-' + roomId;
  const target   = document.getElementById(targetId);
  if (!target) {
    console.warn('Room not found:', roomId);
    return;
  }

  // Update state
  visitedRooms.add(roomId);
  currentRoom = roomId;

  // Show and re-animate the new room
  target.classList.add('active');
  target.style.animation = 'none';
  target.offsetHeight;          // force reflow to restart animation
  target.style.animation = '';

  // Scroll to top so the full room is visible
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Update progress bar and garden
  updateProgress();

  // Trigger final room bloom if applicable
  if (roomId === 'A08') triggerFinalRoom();

  // Update stage label (top-right)
  updateStageLabel(roomId);
  // Stop all room audio first
document.querySelectorAll('audio[id^="audio-"]').forEach(a => {
  a.pause();
  a.currentTime = 0;
});

// Play audio for specific rooms
if (roomId === 'B01') {
  setTimeout(() => {
    const a = document.getElementById('audio-b01');
    if (a) {
      a.currentTime = 0;
      a.play().catch(() => {});
    }
  }, 300);
}
}

/* ══════════════════════════════════════════
   STAGE TRANSITIONS (black-screen interstitial)
══════════════════════════════════════════ */

/**
 * Show a brief black screen with atmospheric text,
 * then navigate to the next room.
 * @param {string} stage    - 'teen' | 'adult'
 * @param {string} nextRoom - room ID to navigate to after
 */
function stageTransition(stage, nextRoom) {
  const messages = {
    teen:  'a black screen.\na door.\nthe sound of a school bell.',
    adult: 'your name\non a form.\na key.\na number in a bank account\nthat is only yours.'
  };

  const screen     = document.getElementById('transition-screen');
  const textEl     = document.getElementById('transition-text');
  const bellEl     = document.getElementById('bell-container');
  const figuresEl  = document.getElementById('figures-container');

  textEl.textContent = messages[stage] || '';
  screen.classList.add('active');

  // ── AUDIO ──
const transAudio = document.getElementById(
  stage === 'teen' ? 'audio-bell' : 'audio-typing'
);
if (transAudio) {
  transAudio.currentTime = 0;
  transAudio.play().catch(() => {});
}

  // Show bell for birth → teen only
  if (bellEl) {
    bellEl.style.display = stage === 'teen' ? 'block' : 'none';
  }

  // Show figures for teen → adult only, and reset their animations
  if (figuresEl) {
    if (stage === 'adult') {
      figuresEl.style.display = 'block';
      const teen  = document.getElementById('fig-teen');
      const adult = document.getElementById('fig-adult');
      if (teen) {
        teen.style.animation = 'none';
        teen.offsetHeight;
        teen.style.animation = '';
      }
      if (adult) {
        adult.style.animation = 'none';
        adult.offsetHeight;
        adult.style.animation = '';
      }
    } else {
      figuresEl.style.display = 'none';
    }
  }

  document.getElementById('stage-label').textContent =
    STAGE_LABELS[stage === 'teen' ? 'teen' : 'adult'];

  // Adult transition runs longer to show both figures appearing
  const duration = stage === 'adult' ? 5000 : 2800;
  
  setTimeout(() => {
  screen.classList.remove('active');
  if (transAudio) { transAudio.pause(); transAudio.currentTime = 0; }
  if (bellEl)    bellEl.style.display    = 'none';
  if (figuresEl) figuresEl.style.display = 'none';
  go(nextRoom);
}, duration);
}
/* ══════════════════════════════════════════
   PROGRESS & GARDEN
══════════════════════════════════════════ */

/**
 * Recalculate progress (0–1) and update
 * the progress bar and garden silhouette layers.
 */
function updateProgress() {
  const storyRooms = Array.from(visitedRooms).filter(r => r !== 'title');
  const progress   = Math.min(storyRooms.length / TOTAL_UNIQUE, 1);

  // Progress bar width
  document.getElementById('progress-bar').style.width = (progress * 100) + '%';

  // Fade in garden layers as thresholds are crossed
  GARDEN_LAYERS.forEach(layer => {
    const el = document.getElementById(layer.id);
    if (!el) return;
    if (progress >= layer.threshold) {
      const opacity = Math.min((progress - layer.threshold) / 0.12 + 0.1, 1);
      el.style.opacity = opacity;
    }
  });

  // Begin greening the garden at 80% progress
  if (progress > 0.8) {
    const greenAmount = (progress - 0.8) / 0.2; // 0 → 1
    tintGarden(greenAmount);
  }
}

/**
 * Interpolate all garden SVG fills from near-black (#111)
 * toward deep green, based on amount (0–1).
 * @param {number} amount - 0 = black, 1 = full green
 */
function tintGarden(amount) {
  const r   = Math.round(17 + (20  - 17) * amount);
  const g   = Math.round(17 + (100 - 17) * amount);
  const b   = Math.round(17 * (1 - amount));
  const col = `rgb(${r},${g},${b})`;

  document.querySelectorAll(
    '#garden [fill="#111"], #garden rect, #garden ellipse, #garden polygon, #garden path, #garden circle'
  ).forEach(el => el.setAttribute('fill', col));
}

/* ══════════════════════════════════════════
   FINAL ROOM — GREEN BLOOM
══════════════════════════════════════════ */

/**
 * Trigger the full green bloom on reaching room A08.
 * Runs once per session.
 */
function triggerFinalRoom() {
  if (isFinalRoom) return;
  isFinalRoom = true;

  document.body.classList.add('final-room');
  document.getElementById('stage-label').textContent = STAGE_LABELS.final;
   document.body.style.background = '#f5f0e8';
  document.body.style.color = '#1a1a1a';

  // Fully reveal every garden layer with a slow fade
  GARDEN_LAYERS.forEach(layer => {
    const el = document.getElementById(layer.id);
    if (el) {
      el.style.transition = 'opacity 2s ease, fill 3s ease';
      el.style.opacity    = '1';
    }
  });

  // Animate garden fill from current dark tint to full vibrant green
  let t = 0;
  const greenInterval = setInterval(() => {
    t += 0.02;
    tintGarden(t);
    if (t >= 1) {
      clearInterval(greenInterval);
      // Lock in the final green
      document.querySelectorAll('#garden [fill]').forEach(
        el => el.setAttribute('fill', '#2d7a2d')
      );
    }
  }, 60);

  // Shift page background to very dark green
  document.body.style.background = '#050d05';
  document.getElementById('progress-bar').style.background = '#3a8a3a';
}

/* ══════════════════════════════════════════
   ENDINGS
══════════════════════════════════════════ */

/** "Stay here" ending — show the closing room */
function stayHere() {
  const cur = document.getElementById('room-A08');
  if (cur) cur.classList.remove('active');
  const end = document.getElementById('room-end');
  if (end) end.classList.add('active');

   // Play end room audio
  const a = document.getElementById('audio-end');
  if (a) a.play().catch(() => {});

  // Bloom flowers after a short pause
  setTimeout(bloomEndFlowers, 600);
}

/** Reset everything and optionally restart from the beginning */
function resetJourney() {
  visitedRooms = new Set(['title']);
  isFinalRoom  = false;
  currentRoom  = 'title';

  // Reset visual state
  document.body.classList.remove('final-room');
  document.body.style.background = '';

  const bar = document.getElementById('progress-bar');
  bar.style.background = '#333';
  bar.style.width      = '0%';

  document.getElementById('stage-label').textContent = 'Birth';
  
  // Stop all audio on reset
document.querySelectorAll('audio[id^="audio-"]').forEach(a => {
  a.pause();
  a.currentTime = 0;
});

  // Reset garden opacity and colour
  GARDEN_LAYERS.forEach(layer => {
    const el = document.getElementById(layer.id);
    if (el) {
      el.style.transition = 'opacity 1.2s ease, fill 2s ease';
      el.style.opacity    = '0';
    }
  });
  document.querySelectorAll('#garden [fill]').forEach(
    el => el.setAttribute('fill', '#111')
  );

  // Hide all rooms, re-show title
  document.querySelectorAll('.room').forEach(r => r.classList.remove('active'));
  const title = document.getElementById('room-title');
  if (title) title.classList.add('active');
  const canvas = document.getElementById('flower-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.opacity = '0';
  }
}

/* ══════════════════════════════════════════
   STAGE LABEL HELPER
══════════════════════════════════════════ */
function updateStageLabel(roomId) {
  const label = document.getElementById('stage-label');
  if      (roomId.startsWith('B'))   label.textContent = 'Birth';
  else if (roomId.startsWith('T'))   label.textContent = 'Teen Years';
  else if (roomId.startsWith('A'))   label.textContent = 'Adulthood';
  else if (roomId === 'title')       label.textContent = '';
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
function bloomEndFlowers() {
  const canvas = document.getElementById('flower-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.opacity = '1';

  const greens = ['#5abf2a', '#4aaa20', '#6acf3a', '#3a9a1a', '#72d040'];

  // Draw a single 4-petal clover flower like the reference image
  function drawClover(ctx, x, y, size, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = greens[Math.floor(Math.random() * greens.length)];

    // 4 petals — each is an offset circle
    const offset = size * 0.55;
    const petalR = size * 0.65;

    // top petal
    ctx.beginPath();
    ctx.arc(x, y - offset, petalR, 0, Math.PI * 2);
    ctx.fill();
    // bottom petal
    ctx.beginPath();
    ctx.arc(x, y + offset, petalR, 0, Math.PI * 2);
    ctx.fill();
    // left petal
    ctx.beginPath();
    ctx.arc(x - offset, y, petalR, 0, Math.PI * 2);
    ctx.fill();
    // right petal
    ctx.beginPath();
    ctx.arc(x + offset, y, petalR, 0, Math.PI * 2);
    ctx.fill();
    // centre fill to merge petals
    ctx.beginPath();
    ctx.arc(x, y, petalR * 0.8, 0, Math.PI * 2);
    ctx.fill();


    ctx.restore();
  }

  const flowers = [];
const gardenHeight = window.innerHeight * 0.42;

const zones = [
  { x: 0.06, y: 0.10 },
  { x: 0.18, y: 0.50 },
  { x: 0.08, y: 0.75 },
  { x: 0.88, y: 0.12 },
  { x: 0.92, y: 0.55 },
  { x: 0.82, y: 0.78 },
  { x: 0.30, y: 0.08 },
  { x: 0.70, y: 0.06 },
  { x: 0.15, y: 0.30 },
  { x: 0.85, y: 0.35 },
];

zones.forEach((zone, i) => {
  const x = zone.x * window.innerWidth  + (Math.random() * 30 - 15);
  const y = zone.y * (window.innerHeight - gardenHeight) + (Math.random() * 20 - 10);

  flowers.push({
    x,
    y,
    size:      22 + Math.random() * 16,
    alpha:     0,
    delay:     i * 900 + Math.random() * 400,
    fadeSpeed: 0.0008,
    color:     greens[Math.floor(Math.random() * greens.length)],
  });
});

  let lastTime = null;
  let startTime = null;

  function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    if (!lastTime)  lastTime  = timestamp;
    const elapsed = timestamp - startTime;
    const delta   = timestamp - lastTime;
    lastTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let allDone = true;

    flowers.forEach(f => {
      if (elapsed > f.delay) {
        f.alpha = Math.min(f.alpha + f.fadeSpeed * (delta / 16), 1);
      }
      if (f.alpha < 1) allDone = false;
      if (f.alpha > 0) {
  drawClover(ctx, f.x, f.y, f.size, f.alpha, f.color);
}
});

    if (!allDone) requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
// Unlock audio context on first user interaction
document.addEventListener('click', function unlockAudio() {
  document.querySelectorAll('audio').forEach(a => {
    a.load();
  });
  document.removeEventListener('click', unlockAudio);
}, { once: true });