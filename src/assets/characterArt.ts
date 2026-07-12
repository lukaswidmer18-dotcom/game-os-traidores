import Phaser from 'phaser';
import { NPC_DATA } from '../data/npcs';
import { SHEET_KEYS } from './tileArt';

/**
 * Personagens compostos em camadas (corpo + roupa + cabelo/barba) a partir
 * do spritesheet Kenney Roguelike Characters (CC0). Cada camada é um tile
 * 16x16; a composição é desenhada em canvas e vira textura estática.
 *
 * Animação de andar: o sheet é estático, então os frames de passo são
 * gerados aqui — as pernas (4 linhas inferiores do tile do corpo, divididas
 * ao meio) deslocam 1px em direções opostas, alternando a cada frame.
 *
 * Coordenadas em [coluna, linha] do sheet (stride de 17px: 16 + 1 de margem).
 */
type Layer = readonly [col: number, row: number];

const CHARACTER_LAYERS: Record<string, readonly Layer[]> = {
  player: [
    [0, 0],
    [14, 9],
    [21, 0],
  ],
  helena: [
    [1, 0],
    [14, 0],
    [20, 0],
  ],
  bento: [
    [0, 1],
    [10, 6],
    [19, 2],
  ],
  marina: [
    [1, 0],
    [10, 0],
    [24, 0],
  ],
  davi: [
    [0, 2],
    [9, 9],
    [21, 0],
  ],
  cassia: [
    [1, 1],
    [15, 3],
    [23, 0],
  ],
  otto: [
    [0, 0],
    [16, 9],
    [19, 8],
    [21, 8],
  ],
  rosa: [
    [1, 1],
    [8, 3],
    [20, 4],
  ],
  tulio: [
    [0, 0],
    [13, 3],
    [24, 4],
  ],
};

const TILE = 16;
const STRIDE = 17;
// Canvas 2px mais alto: espaço para o passo (perna desce 1px) sem cortar
const CANVAS_H = 18;
const BODY_TOP = 1;
const LEG_ROW = 12; // linhas 12-15 do tile = pernas
const LEG_H = TILE - LEG_ROW;

type Pose = 'idle' | 'bob' | 'walkA' | 'walkB';
const PLAYER_DIRECTIONS = ['down', 'up', 'left', 'right'] as const;

/**
 * Gera as texturas usadas por Player e NPC:
 *  - player-{dir}-0 (parado), -1 e -2 (passos alternados)
 *  - npc-{id}-0 (parado), -1 (respirando), -2 e -3 (passos alternados)
 * Requer o spritesheet 'rl-chars' já carregado (preloadTileArt).
 */
export function ensureCharacterArt(scene: Phaser.Scene): void {
  if (scene.textures.exists('player-down-0')) {
    return;
  }

  const source = scene.textures.get(SHEET_KEYS.chars).getSourceImage() as HTMLImageElement;

  for (const direction of PLAYER_DIRECTIONS) {
    const flip = direction === 'left';
    const layers = CHARACTER_LAYERS.player;
    composeTexture(scene, source, `player-${direction}-0`, layers, flip, 'idle');
    composeTexture(scene, source, `player-${direction}-1`, layers, flip, 'walkA');
    composeTexture(scene, source, `player-${direction}-2`, layers, flip, 'walkB');
  }

  for (const npc of NPC_DATA) {
    const layers = CHARACTER_LAYERS[npc.id] ?? CHARACTER_LAYERS.player;
    composeTexture(scene, source, `npc-${npc.id}-0`, layers, false, 'idle');
    composeTexture(scene, source, `npc-${npc.id}-1`, layers, false, 'bob');
    composeTexture(scene, source, `npc-${npc.id}-2`, layers, false, 'walkA');
    composeTexture(scene, source, `npc-${npc.id}-3`, layers, false, 'walkB');
  }
}

function composeTexture(
  scene: Phaser.Scene,
  source: HTMLImageElement,
  key: string,
  layers: readonly Layer[],
  flip: boolean,
  pose: Pose,
): void {
  if (scene.textures.exists(key)) {
    return;
  }

  const canvas = scene.textures.createCanvas(key, TILE, CANVAS_H);
  if (!canvas) {
    return;
  }

  const ctx = canvas.context;
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  if (flip) {
    ctx.translate(TILE, 0);
    ctx.scale(-1, 1);
  }

  const bodyY = pose === 'bob' ? BODY_TOP + 1 : BODY_TOP;
  const [body, ...clothing] = layers;
  drawBody(ctx, source, body, bodyY, pose);
  for (const [col, row] of clothing) {
    ctx.drawImage(source, col * STRIDE, row * STRIDE, TILE, TILE, 0, bodyY, TILE, TILE);
  }

  ctx.restore();
  canvas.refresh();
}

/** Só o tile do corpo tem pernas; nos passos elas se separam 1px. */
function drawBody(
  ctx: CanvasRenderingContext2D,
  source: HTMLImageElement,
  [col, row]: Layer,
  bodyY: number,
  pose: Pose,
): void {
  const sx = col * STRIDE;
  const sy = row * STRIDE;

  if (pose !== 'walkA' && pose !== 'walkB') {
    ctx.drawImage(source, sx, sy, TILE, TILE, 0, bodyY, TILE, TILE);
    return;
  }

  // Tronco e cabeça (linhas 0-11) inteiros
  ctx.drawImage(source, sx, sy, TILE, LEG_ROW, 0, bodyY, TILE, LEG_ROW);

  const half = TILE / 2;
  const leftLegDy = pose === 'walkA' ? -1 : 1;
  drawLeg(ctx, source, sx, sy, 0, half, bodyY, leftLegDy);
  drawLeg(ctx, source, sx, sy, half, half, bodyY, -leftLegDy);
}

/**
 * Perna recolhida (dy -1) sobrepõe 1px do tronco; perna estendida (dy +1)
 * é desenhada duas vezes para esticar sem abrir buraco entre tronco e pé.
 */
function drawLeg(
  ctx: CanvasRenderingContext2D,
  source: HTMLImageElement,
  sx: number,
  sy: number,
  offsetX: number,
  width: number,
  bodyY: number,
  dy: number,
): void {
  const legSy = sy + LEG_ROW;
  const baseY = bodyY + LEG_ROW;
  if (dy < 0) {
    ctx.drawImage(source, sx + offsetX, legSy, width, LEG_H, offsetX, baseY - 1, width, LEG_H);
    return;
  }
  ctx.drawImage(source, sx + offsetX, legSy, width, LEG_H, offsetX, baseY, width, LEG_H);
  ctx.drawImage(source, sx + offsetX, legSy, width, LEG_H, offsetX, baseY + 1, width, LEG_H);
}
