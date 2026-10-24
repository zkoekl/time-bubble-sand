export const W = 320;
export const H = 180;

export const MAT = {
  EMPTY: 0,
  STONE: 1,
  SAND: 2,
  WATER: 3,
  FIRE: 4,
  WOOD: 5,
};

export const MAT_NAMES = ['Пусто', 'Камень', 'Песок', 'Вода', 'Огонь', 'Дерево'];

/** RGBA per material */
export const COLORS = new Uint8ClampedArray([
  0, 0, 0, 255, // empty (drawn as dark void)
  80, 80, 90, 255,
  220, 180, 80, 255,
  60, 120, 220, 255,
  255, 120, 40, 255,
  120, 70, 30, 255,
]);

export const VOID_COLOR = [12, 12, 18, 255];
