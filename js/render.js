import { W, H, MAT, COLORS, VOID_COLOR } from './constants.js';
import { idx } from './world.js';
import { bubbleActive } from './sim.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const image = ctx.createImageData(W, H);
  const buf = image.data;
  return { ctx, image, buf };
}

function desaturate(r, g, b, amount) {
  const gray = (r + g + b) / 3;
  const t = 1 - amount;
  return [
    Math.round(r * t + gray * amount),
    Math.round(g * t + gray * amount),
    Math.round(b * t + gray * amount),
  ];
}

export function drawWorld(renderer, cells, px, py, radius) {
  const { buf } = renderer;
  const r2 = radius * radius;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const m = cells[idx(x, y)];
      const o = (y * W + x) * 4;
      let r;
      let g;
      let b;
      if (m === MAT.EMPTY) {
        [r, g, b] = VOID_COLOR;
      } else {
        const c = m * 4;
        r = COLORS[c];
        g = COLORS[c + 1];
        b = COLORS[c + 2];
      }
      if (!bubbleActive(x, y, px, py, r2)) {
        [r, g, b] = desaturate(r, g, b, 0.55);
      }
      buf[o] = r;
      buf[o + 1] = g;
      buf[o + 2] = b;
      buf[o + 3] = 255;
    }
  }
}

export function present(renderer, px, py, radius) {
  const { ctx, image } = renderer;
  ctx.putImageData(image, 0, 0);

  // Bubble outline
  ctx.strokeStyle = 'rgba(180, 220, 255, 0.85)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(px, py, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(120, 180, 255, 0.25)';
  ctx.beginPath();
  ctx.arc(px, py, radius - 0.5, 0, Math.PI * 2);
  ctx.stroke();

  // Player
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(px, py, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#223';
  ctx.lineWidth = 0.5;
  ctx.stroke();
}
