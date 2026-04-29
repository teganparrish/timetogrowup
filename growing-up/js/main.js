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

  const screen = document.getElementById('transition-screen');
  const textEl = document.getElementById('transition-text');

  textEl.textContent = messages[stage] || '';
  screen.classList.add('active');

  // Update stage label during the black screen
  document.getElementById('stage-label').textContent =
    STAGE_LABELS[stage === 'teen' ? 'teen' : 'adult'];

  setTimeout(() => {
    screen.classList.remove('active');
    go(nextRoom);
  }, 2800);
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
updateProgress();
