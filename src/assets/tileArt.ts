import Phaser from 'phaser';

/**
 * Tilesets Kenney (CC0) carregados de public/assets.
 * Grade: tiles 16x16 com 1px de espaçamento entre eles.
 */
export const SHEET_KEYS = {
  base: 'rl-base',
  indoor: 'rl-indoor',
  chars: 'rl-chars',
} as const;

const BASE_COLS = 57;
const INDOOR_COLS = 27;

export const TILE_SIZE = 16;

/** Índice de frame do sheet base (roguelike-rpg, 57 colunas). */
export function base(col: number, row: number): number {
  return row * BASE_COLS + col;
}

/** Índice de frame do sheet de interiores (roguelike-indoors, 27 colunas). */
export function indoor(col: number, row: number): number {
  return row * INDOOR_COLS + col;
}

/** Chamar no preload() de uma cena que roda antes da exploração. */
export function preloadTileArt(scene: Phaser.Scene): void {
  const frameConfig = { frameWidth: TILE_SIZE, frameHeight: TILE_SIZE, spacing: 1 };
  scene.load.spritesheet(SHEET_KEYS.base, 'assets/roguelike-base.png', frameConfig);
  scene.load.spritesheet(SHEET_KEYS.indoor, 'assets/roguelike-indoor.png', frameConfig);
  scene.load.spritesheet(SHEET_KEYS.chars, 'assets/roguelike-chars.png', frameConfig);
}

/** Piso de cada cômodo (frames do sheet base). */
export const ROOM_FLOOR_FRAMES: Record<string, number> = {
  hall: base(25, 25), // tábuas de madeira
  library: base(25, 25),
  kitchen: base(45, 26), // xadrez claro
  garden: base(21, 25), // grama
  corridor: base(25, 27), // tábuas claras
  council: base(45, 29), // tábuas escuras avermelhadas
};

export const WALL_FRAME = base(35, 15); // painel de madeira escura
export const EXTERIOR_FRAME = base(30, 15); // pedra cinza (escurecida por tint)
