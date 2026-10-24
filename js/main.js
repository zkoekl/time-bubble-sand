import { W, H, MAT, MAT_NAMES } from './constants.js';
import { createWorld, loadLevel } from './world.js';
import { stepSimulation, paintBrush, resolvePlayer } from './sim.js';
import { createRenderer, drawWorld, present } from './render.js';

const canvas = document.getElementById('game');
const stage = document.getElementById('stage');
const fpsEl = document.getElementById('fps');
const bubbleInfo = document.getElementById('bubble-info');
const paletteEl = document.getElementById('palette');
const bubbleSlider = document.getElementById('bubble-radius');
const radiusMinus = document.getElementById('radius-minus');
const radiusPlus = document.getElementById('radius-plus');
const joystick = document.getElementById('joystick');
const joystickThumb = document.getElementById('joystick-thumb');

const world = createWorld();
loadLevel(world.cells);

const renderer = createRenderer(canvas);

let playerX = 160;
let playerY = 90;
let bubbleRadius = 35;

const keys = new Set();
let painting = false;
let selectedMat = MAT.SAND;

const materials = [MAT.EMPTY, MAT.STONE, MAT.SAND, MAT.WATER, MAT.FIRE, MAT.WOOD];

function buildPalette() {
  materials.forEach((m, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'palette-btn' + (m === selectedMat ? ' active' : '');
    btn.textContent = `${i + 1}. ${MAT_NAMES[m]}`;
    btn.dataset.mat = String(m);
    btn.addEventListener('click', () => selectMat(m));
    paletteEl.appendChild(btn);
  });
}

function selectMat(m) {
  selectedMat = m;
  paletteEl.querySelectorAll('.palette-btn').forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.mat) === m);
  });
}

function setBubbleRadius(r) {
  bubbleRadius = Math.max(15, Math.min(60, r));
  bubbleSlider.value = String(bubbleRadius);
}

// ---- Painting (mouse / touch on canvas) ----

function canvasCoords(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * W;
  const y = ((clientY - rect.top) / rect.height) * H;
  return { x: Math.floor(x), y: Math.floor(y) };
}

function paintAt(clientX, clientY) {
  const { x, y } = canvasCoords(clientX, clientY);
  paintBrush(world.cells, world.life, x, y, selectedMat, 2);
}

canvas.addEventListener('pointerdown', (e) => {
  painting = true;
  canvas.setPointerCapture(e.pointerId);
  paintAt(e.clientX, e.clientY);
});

canvas.addEventListener('pointermove', (e) => {
  if (painting) paintAt(e.clientX, e.clientY);
});

canvas.addEventListener('pointerup', () => {
  painting = false;
});

canvas.addEventListener('pointercancel', () => {
  painting = false;
});

// ---- Keyboard (desktop) ----

window.addEventListener('keydown', (e) => {
  keys.add(e.key.toLowerCase());
  if (e.key === '[') setBubbleRadius(bubbleRadius - 2);
  if (e.key === ']') setBubbleRadius(bubbleRadius + 2);
  const num = Number(e.key);
  if (num >= 1 && num <= 6) selectMat(materials[num - 1]);
});

window.addEventListener('keyup', (e) => {
  keys.delete(e.key.toLowerCase());
});

function keyboardVector() {
  let x = 0;
  let y = 0;
  if (keys.has('a') || keys.has('arrowleft')) x -= 1;
  if (keys.has('d') || keys.has('arrowright')) x += 1;
  if (keys.has('w') || keys.has('arrowup')) y -= 1;
  if (keys.has('s') || keys.has('arrowdown')) y += 1;
  if (x === 0 && y === 0) return null;
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
}

// ---- Virtual joystick (touch, own dedicated hit zone so it never
// fights with painting on the canvas underneath it) ----

const joystickVector = { x: 0, y: 0 };
let joystickPointerId = null;
const JOY_MAX = 36; // px, thumb travel radius

function joystickReset() {
  joystickVector.x = 0;
  joystickVector.y = 0;
  joystickThumb.style.transform = 'translate(0, 0)';
}

function joystickMove(clientX, clientY) {
  const rect = joystick.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let dx = clientX - cx;
  let dy = clientY - cy;
  const dist = Math.hypot(dx, dy) || 1;
  const clamped = Math.min(dist, JOY_MAX);
  dx = (dx / dist) * clamped;
  dy = (dy / dist) * clamped;
  joystickThumb.style.transform = `translate(${dx}px, ${dy}px)`;
  joystickVector.x = dx / JOY_MAX;
  joystickVector.y = dy / JOY_MAX;
}

joystick.addEventListener('pointerdown', (e) => {
  joystickPointerId = e.pointerId;
  joystick.setPointerCapture(e.pointerId);
  joystickMove(e.clientX, e.clientY);
});

joystick.addEventListener('pointermove', (e) => {
  if (e.pointerId === joystickPointerId) joystickMove(e.clientX, e.clientY);
});

function joystickEnd(e) {
  if (e.pointerId === joystickPointerId) {
    joystickPointerId = null;
    joystickReset();
  }
}

joystick.addEventListener('pointerup', joystickEnd);
joystick.addEventListener('pointercancel', joystickEnd);
joystick.addEventListener('pointerleave', (e) => {
  // only relevant while the finger that owns the drag is still captured;
  // pointer capture keeps delivering move/up events even if it leaves the
  // element bounds, so this is just a safety net for stray browsers.
  if (e.pointerId === joystickPointerId && e.buttons === 0) joystickEnd(e);
});

/** Keyboard takes priority when active; otherwise use the joystick vector. */
function getMoveVector() {
  const kb = keyboardVector();
  if (kb) return kb;
  return joystickVector;
}

// ---- Radius controls ----

bubbleSlider.addEventListener('input', () => setBubbleRadius(Number(bubbleSlider.value)));
radiusMinus.addEventListener('click', () => setBubbleRadius(bubbleRadius - 2));
radiusPlus.addEventListener('click', () => setBubbleRadius(bubbleRadius + 2));

// Extra safety net against page scroll/zoom gestures on touch devices.
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());

// ---- Canvas sizing: fit the stage while keeping the 320x180 aspect ratio,
// so it looks correct in both portrait and landscape. ----

function resizeCanvas() {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  const scale = Math.min(w / W, h / H);
  canvas.style.width = `${Math.floor(W * scale)}px`;
  canvas.style.height = `${Math.floor(H * scale)}px`;
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', resizeCanvas);

buildPalette();
setBubbleRadius(bubbleRadius);
resizeCanvas();

// ---- Main loop ----

let lastTime = performance.now();
let lastFpsTime = lastTime;
let fps = 0;
let frameCount = 0;

function tick(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  frameCount++;
  if (now - lastFpsTime >= 500) {
    fps = Math.round((frameCount * 1000) / (now - lastFpsTime));
    frameCount = 0;
    lastFpsTime = now;
  }

  const move = getMoveVector();
  const speed = 55;
  const vx = move.x * speed * dt;
  const vy = move.y * speed * dt;
  const resolved = resolvePlayer(world.cells, playerX, playerY, vx, vy);
  playerX = resolved.x;
  playerY = resolved.y;

  stepSimulation(world, playerX, playerY, bubbleRadius);

  drawWorld(renderer, world.cells, playerX, playerY, bubbleRadius);
  present(renderer, playerX, playerY, bubbleRadius);

  fpsEl.textContent = `FPS: ${fps}`;
  bubbleInfo.textContent = `R: ${bubbleRadius}`;

  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
