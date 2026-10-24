import { W, H, MAT } from './constants.js';

export function createWorld() {
  const cells = new Uint8Array(W * H);
  const life = new Uint8Array(W * H); // fire ttl
  const stamp = new Uint16Array(W * H);
  return { cells, life, stamp, frame: 0 };
}

export function idx(x, y) {
  return y * W + x;
}

export function inBounds(x, y) {
  return x >= 0 && x < W && y >= 0 && y < H;
}

function set(cells, x, y, m) {
  if (inBounds(x, y)) cells[idx(x, y)] = m;
}

function rect(cells, x0, y0, w, h, m) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) set(cells, x, y, m);
  }
}

/** Handcrafted demo: frozen sand pile, waterfall, wood + kindling */
export function loadLevel(cells) {
  cells.fill(MAT.EMPTY);

  // Floor and walls
  rect(cells, 0, H - 4, W, 4, MAT.STONE);
  rect(cells, 0, 0, 3, H, MAT.STONE);
  rect(cells, W - 3, 0, 3, H, MAT.STONE);

  // Platform under frozen sand arch
  rect(cells, 40, 100, 50, 3, MAT.STONE);
  rect(cells, 40, 70, 8, 33, MAT.STONE);
  rect(cells, 82, 70, 8, 33, MAT.STONE);
  // Hanging frozen sand pile (mostly outside default bubble)
  for (let y = 73; y < 98; y++) {
    for (let x = 48; x < 82; x++) {
      if ((x + y) % 3 !== 0) set(cells, x, y, MAT.SAND);
    }
  }

  // Frozen waterfall column
  rect(cells, 200, 20, 6, 8, MAT.STONE);
  for (let y = 28; y < 120; y++) {
    for (let x = 201; x < 205; x++) set(cells, x, y, MAT.WATER);
  }
  rect(cells, 190, 115, 30, 3, MAT.STONE);

  // Wood stack + nearby stone
  rect(cells, 120, H - 20, 35, 16, MAT.WOOD);
  rect(cells, 118, H - 24, 4, 4, MAT.FIRE);

  // Small sand pool on the right (frozen until bubble reaches)
  for (let y = H - 12; y < H - 4; y++) {
    for (let x = 250; x < 290; x++) set(cells, x, y, MAT.SAND);
  }
}
