import { W, H, MAT } from './constants.js';
import { idx, inBounds } from './world.js';

export function bubbleActive(x, y, px, py, r2) {
  const dx = x - px;
  const dy = y - py;
  return dx * dx + dy * dy <= r2;
}

function isEmpty(cells, x, y) {
  return inBounds(x, y) && cells[idx(x, y)] === MAT.EMPTY;
}

function isPassable(cells, x, y) {
  if (!inBounds(x, y)) return false;
  const m = cells[idx(x, y)];
  return m === MAT.EMPTY || m === MAT.WATER || m === MAT.FIRE;
}

function canMoveTo(x, y, px, py, r2) {
  return inBounds(x, y) && bubbleActive(x, y, px, py, r2);
}

function mark(stamp, x, y, frame) {
  stamp[idx(x, y)] = frame;
}

function wasUpdated(stamp, x, y, frame) {
  return stamp[idx(x, y)] === frame;
}

function swap(cells, life, stamp, x1, y1, x2, y2, frame) {
  const i1 = idx(x1, y1);
  const i2 = idx(x2, y2);
  const t = cells[i1];
  cells[i1] = cells[i2];
  cells[i2] = t;
  const lt = life[i1];
  life[i1] = life[i2];
  life[i2] = lt;
  mark(stamp, x1, y1, frame);
  mark(stamp, x2, y2, frame);
}

function tryFall(cells, life, stamp, x, y, px, py, r2, frame, dir) {
  const down = y + 1;
  if (!canMoveTo(x, down, px, py, r2)) return false;
  if (isEmpty(cells, x, down)) {
    swap(cells, life, stamp, x, y, x, down, frame);
    return true;
  }
  const dx = dir > 0 ? 1 : -1;
  const nx = x + dx;
  if (canMoveTo(nx, down, px, py, r2) && isEmpty(cells, nx, down)) {
    swap(cells, life, stamp, x, y, nx, down, frame);
    return true;
  }
  const nx2 = x - dx;
  if (canMoveTo(nx2, down, px, py, r2) && isEmpty(cells, nx2, down)) {
    swap(cells, life, stamp, x, y, nx2, down, frame);
    return true;
  }
  return false;
}

function updateSand(cells, life, stamp, x, y, px, py, r2, frame, dir) {
  if (tryFall(cells, life, stamp, x, y, px, py, r2, frame, dir)) return;
}

function updateWater(cells, life, stamp, x, y, px, py, r2, frame, dir) {
  if (tryFall(cells, life, stamp, x, y, px, py, r2, frame, dir)) return;
  const dx = dir > 0 ? 1 : -1;
  const nx = x + dx;
  if (canMoveTo(nx, y, px, py, r2) && isEmpty(cells, nx, y)) {
    swap(cells, life, stamp, x, y, nx, y, frame);
    return;
  }
  const nx2 = x - dx;
  if (canMoveTo(nx2, y, px, py, r2) && isEmpty(cells, nx2, y)) {
    swap(cells, life, stamp, x, y, nx2, y, frame);
  }
}

function ignite(cells, life, stamp, x, y, frame) {
  if (cells[idx(x, y)] === MAT.WOOD) {
    cells[idx(x, y)] = MAT.FIRE;
    life[idx(x, y)] = 40 + ((x * 7 + y * 13) & 31);
    mark(stamp, x, y, frame);
  }
}

function updateFire(cells, life, stamp, x, y, px, py, r2, frame) {
  const i = idx(x, y);
  let t = life[i];
  if (t === 0) t = 30 + ((x * 3 + y * 5) & 25);
  t--;
  life[i] = t;

  const neighbors = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ];
  for (const [dx, dy] of neighbors) {
    const nx = x + dx;
    const ny = y + dy;
    if (!inBounds(nx, ny)) continue;
    ignite(cells, life, stamp, nx, ny, frame);
  }

  if (t <= 0) {
    cells[i] = MAT.EMPTY;
    life[i] = 0;
    mark(stamp, x, y, frame);
    return;
  }

  // Drift upward sometimes
  const up = y - 1;
  if (canMoveTo(x, up, px, py, r2) && isPassable(cells, x, up) && cells[idx(x, up)] === MAT.EMPTY) {
    if (((x + y + frame) & 3) === 0) {
      swap(cells, life, stamp, x, y, x, up, frame);
    }
  }
}

export function stepSimulation(world, px, py, radius) {
  const { cells, life, stamp } = world;
  world.frame = (world.frame + 1) & 0xffff;
  const frame = world.frame;
  const r2 = radius * radius;
  const dir = frame & 1 ? 1 : -1;

  for (let y = H - 1; y >= 0; y--) {
    const xStart = dir > 0 ? 0 : W - 1;
    const xEnd = dir > 0 ? W : -1;
    for (let x = xStart; x !== xEnd; x += dir) {
      if (!bubbleActive(x, y, px, py, r2)) continue;
      if (wasUpdated(stamp, x, y, frame)) continue;

      const m = cells[idx(x, y)];
      if (m === MAT.SAND) updateSand(cells, life, stamp, x, y, px, py, r2, frame, dir);
      else if (m === MAT.WATER) updateWater(cells, life, stamp, x, y, px, py, r2, frame, dir);
      else if (m === MAT.FIRE) updateFire(cells, life, stamp, x, y, px, py, r2, frame);
    }
  }
}

export function paintBrush(cells, life, cx, cy, mat, r = 2) {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r + 0.5) continue;
      const x = cx + dx;
      const y = cy + dy;
      if (!inBounds(x, y)) continue;
      const i = idx(x, y);
      if (mat === MAT.EMPTY) {
        cells[i] = MAT.EMPTY;
        life[i] = 0;
      } else if (mat !== MAT.FIRE || cells[i] !== MAT.STONE) {
        cells[i] = mat;
        if (mat === MAT.FIRE) life[i] = 35;
        else if (mat !== MAT.FIRE) life[i] = 0;
      }
    }
  }
}

/** Simple player vs solids */
export function resolvePlayer(cells, px, py, vx, vy) {
  let nx = px + vx;
  let ny = py + vy;
  const r = 1.2;

  function blocked(x, y) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (!inBounds(ix, iy)) return true;
    const m = cells[idx(ix, iy)];
    return m === MAT.STONE || m === MAT.WOOD || m === MAT.SAND;
  }

  if (blocked(nx + r, py) || blocked(nx - r, py)) nx = px;
  if (blocked(px, ny + r) || blocked(px, ny - r)) ny = py;
  if (blocked(nx + r, ny) || blocked(nx - r, ny)) {
    nx = px;
    ny = py;
  }

  nx = Math.max(3.5, Math.min(W - 4.5, nx));
  ny = Math.max(3.5, Math.min(H - 5.5, ny));
  return { x: nx, y: ny };
}
