import { W, H, MAT, MAT_NAMES } from './constants.js';
import { createWorld, loadLevel } from './world.js';
import { stepSimulation, paintBrush, resolvePlayer } from './sim.js';
import { createRenderer, drawWorld, present } from './render.js';

const canvas = document.getElementById('game');
const fpsEl = document.getElementById('fps');
const bubbleInfo = document.getElementById('bubble-info');
const paletteEl = document.getElementById('palette');
const bubbleSlider = document.getElementById('bubble-radius');

const world = createWorld();
loadLevel(world.cells);

const renderer = createRenderer(canvas);

let playerX = 160;
let playerY = 90;
let bubbleRadius = 35;

let keys = new Set();
let moveInput = { x: 0, y: 0 };
let painting = false;
let selectedMat = MAT.SAND;

const materials = [
  MAT.EMPTY,
  MAT.STONE,
  MAT.SAND,
  MAT.WATER,
  MAT.FIRE,
  MAT.WOOD,
];

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

window.addEventListener('keydown', (e) => {
  keys.add(e.key.toLowerCase());
  if (e.key === '[') bubbleRadius = Math.max(15, bubbleRadius - 2);
  if (e.key === ']') bubbleRadius = Math.min(60, bubbleRadius + 2);
  const num = Number(e.key);
  if (num >= 1 && num <= 6) selectMat(materials[num - 1]);
});

window.addEventListener('keyup', (e) => {
  keys.delete(e.key.toLowerCase());
});

function updateMoveInput() {
  let x = 0;
  let y = 0;
  if (keys.has('a') || keys.has('arrowleft')) x -= 1;
  if (keys.has('d') || keys.has('arrowright')) x += 1;
  if (keys.has('w') || keys.has('arrowup')) y -= 1;
  if (keys.has('s') || keys.has('arrowdown')) y += 1;
  moveInput.x = x;
  moveInput.y = y;
}

document.querySelectorAll('#dpad button[data-move]').forEach((btn) => {
  const [dx, dy] = btn.dataset.move.split(',').map(Number);
  const apply = (on) => {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (dx) moveInput.x = dx;
      if (dy) moveInput.y = dy;
    });
    btn.addEventListener('pointerup', () => {
      if (dx && moveInput.x === dx) moveInput.x = 0;
      if (dy && moveInput.y === dy) moveInput.y = 0;
    });
    btn.addEventListener('pointerleave', () => {
      if (dx && moveInput.x === dx) moveInput.x = 0;
      if (dy && moveInput.y === dy) moveInput.y = 0;
    });
  };
  apply(true);
});

bubbleSlider.addEventListener('input', () => {
  bubbleRadius = Number(bubbleSlider.value);
});

buildPalette();
bubbleSlider.value = String(bubbleRadius);

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

  updateMoveInput();
  const speed = 55;
  const vx = moveInput.x * speed * dt;
  const vy = moveInput.y * speed * dt;
  const resolved = resolvePlayer(world.cells, playerX, playerY, vx, vy);
  playerX = resolved.x;
  playerY = resolved.y;

  stepSimulation(world, playerX, playerY, bubbleRadius);

  drawWorld(renderer, world.cells, playerX, playerY, bubbleRadius);
  present(renderer, playerX, playerY, bubbleRadius);

  fpsEl.textContent = `FPS: ${fps}`;
  bubbleInfo.textContent = `R: ${bubbleRadius}`;
  bubbleSlider.value = String(bubbleRadius);

  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
