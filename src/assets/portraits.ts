import Phaser from 'phaser';
import { NPC_DATA } from '../data/npcs';

/**
 * Retratos pixel art procedurais (24x30) dos personagens.
 * Cada NPC tem penteado, expressão e acessórios próprios; a roupa
 * usa a cor-assinatura do NPC. Renderizados uma vez como texturas.
 */

const PORTRAIT_W = 24;
const PORTRAIT_H = 30;

type HairStyle = 'updo' | 'slick' | 'messy' | 'combed' | 'bob' | 'crop';
type EyeStyle = 'narrow' | 'wide' | 'neutral' | 'sharp';
type MouthStyle = 'smile' | 'grin' | 'neutral' | 'smirk' | 'bite';

interface PortraitConfig {
  skin: number;
  hair: number;
  cloth: number;
  hairStyle: HairStyle;
  eyes: EyeStyle;
  mouth: MouthStyle;
  glasses?: boolean;
  beard?: boolean;
}

const PORTRAIT_CONFIGS: Record<string, PortraitConfig> = {
  helena: {
    skin: 0xe8b89a,
    hair: 0x4a3550,
    cloth: 0xe8a0c0,
    hairStyle: 'updo',
    eyes: 'narrow',
    mouth: 'neutral',
  },
  bento: {
    skin: 0xd9a077,
    hair: 0x1e1a24,
    cloth: 0x7090e8,
    hairStyle: 'slick',
    eyes: 'neutral',
    mouth: 'grin',
  },
  marina: {
    skin: 0xf0c4a8,
    hair: 0x7a4a2e,
    cloth: 0xa0d888,
    hairStyle: 'messy',
    eyes: 'wide',
    mouth: 'bite',
  },
  davi: {
    skin: 0xc98d5f,
    hair: 0x2c2620,
    cloth: 0xf0c060,
    hairStyle: 'combed',
    eyes: 'neutral',
    mouth: 'neutral',
    glasses: true,
  },
  cassia: {
    skin: 0xe6b0a0,
    hair: 0x241a2e,
    cloth: 0xd080d0,
    hairStyle: 'bob',
    eyes: 'sharp',
    mouth: 'smirk',
  },
  otto: {
    skin: 0xd9986e,
    hair: 0x8a4a26,
    cloth: 0xe87050,
    hairStyle: 'crop',
    eyes: 'neutral',
    mouth: 'smile',
    beard: true,
  },
  rosa: {
    skin: 0xc98d6a,
    hair: 0x3a3a44,
    cloth: 0x88d8c0,
    hairStyle: 'updo',
    eyes: 'wide',
    mouth: 'smile',
  },
  tulio: {
    skin: 0xe0b090,
    hair: 0x8a8a96,
    cloth: 0xb8b8d8,
    hairStyle: 'slick',
    eyes: 'sharp',
    mouth: 'neutral',
  },
};

export function portraitKey(npcId: string): string {
  return `portrait-${npcId}`;
}

export function ensurePortraits(scene: Phaser.Scene): void {
  for (const npc of NPC_DATA) {
    const key = portraitKey(npc.id);
    if (scene.textures.exists(key)) continue;

    const config = PORTRAIT_CONFIGS[npc.id];
    if (!config) continue;

    const graphics = scene.add.graphics({ x: 0, y: 0 });
    graphics.setVisible(false);
    drawPortrait(graphics, config);
    graphics.generateTexture(key, PORTRAIT_W, PORTRAIT_H);
    graphics.destroy();
  }
}

function shade(color: number, amount: number): number {
  const c = Phaser.Display.Color.ValueToColor(color);
  return amount >= 0 ? c.brighten(amount).color : c.darken(-amount).color;
}

function drawPortrait(g: Phaser.GameObjects.Graphics, cfg: PortraitConfig): void {
  const skinShade = shade(cfg.skin, -20);
  const hairShine = shade(cfg.hair, 25);
  const clothTrim = shade(cfg.cloth, -30);
  const outline = 0x120c1c;

  // Torso / ombros
  g.fillStyle(clothTrim, 1);
  g.fillRect(2, 21, 20, 9);
  g.fillStyle(cfg.cloth, 1);
  g.fillRect(4, 21, 16, 9);
  // Gola em V com pele
  g.fillStyle(cfg.skin, 1);
  g.fillRect(10, 21, 4, 2);
  g.fillStyle(outline, 1);
  g.fillRect(9, 21, 1, 3);
  g.fillRect(14, 21, 1, 3);

  // Pescoço
  g.fillStyle(skinShade, 1);
  g.fillRect(9, 16, 6, 2);
  g.fillStyle(cfg.skin, 1);
  g.fillRect(9, 18, 6, 3);

  // Cabeça
  g.fillStyle(cfg.skin, 1);
  g.fillRect(7, 4, 10, 1);
  g.fillRect(6, 5, 12, 11);
  g.fillRect(7, 16, 10, 1);
  g.fillStyle(skinShade, 1);
  g.fillRect(7, 16, 10, 1);

  // Orelhas
  g.fillStyle(cfg.skin, 1);
  g.fillRect(5, 10, 1, 3);
  g.fillRect(18, 10, 1, 3);

  drawHair(g, cfg, hairShine);
  drawEyes(g, cfg.eyes);

  if (cfg.glasses) {
    g.fillStyle(outline, 1);
    g.fillRect(7, 9, 5, 1);
    g.fillRect(7, 12, 5, 1);
    g.fillRect(7, 9, 1, 4);
    g.fillRect(11, 9, 1, 4);
    g.fillRect(12, 9, 5, 1);
    g.fillRect(12, 12, 5, 1);
    g.fillRect(16, 9, 1, 4);
    g.fillRect(12, 10, 1, 2);
  }

  // Nariz
  g.fillStyle(skinShade, 1);
  g.fillRect(11, 12, 1, 2);

  if (cfg.beard) {
    g.fillStyle(cfg.hair, 1);
    g.fillRect(7, 13, 10, 4);
    g.fillRect(8, 17, 8, 2);
    g.fillStyle(shade(cfg.hair, -15), 1);
    g.fillRect(8, 18, 8, 1);
  }

  drawMouth(g, cfg.mouth, cfg.beard ?? false, skinShade);
}

function drawHair(g: Phaser.GameObjects.Graphics, cfg: PortraitConfig, shine: number): void {
  g.fillStyle(cfg.hair, 1);

  switch (cfg.hairStyle) {
    case 'updo':
      g.fillRect(9, 0, 6, 2); // coque
      g.fillRect(6, 2, 12, 4);
      g.fillRect(5, 6, 2, 4);
      g.fillRect(17, 6, 2, 4);
      g.fillStyle(shine, 1);
      g.fillRect(10, 0, 2, 1);
      break;

    case 'slick':
      g.fillRect(6, 2, 12, 4);
      g.fillStyle(shine, 1);
      g.fillRect(8, 3, 4, 1); // brilho de gel
      g.fillStyle(cfg.hair, 1);
      g.fillRect(14, 2, 1, 5); // risca lateral
      break;

    case 'messy':
      g.fillRect(6, 2, 12, 4);
      g.fillRect(4, 4, 2, 3);
      g.fillRect(18, 3, 2, 3);
      g.fillRect(8, 1, 2, 1);
      g.fillRect(13, 1, 3, 1);
      g.fillRect(5, 7, 1, 3);
      g.fillRect(18, 6, 1, 4);
      break;

    case 'combed':
      g.fillRect(6, 2, 12, 4);
      g.fillRect(5, 6, 1, 3);
      g.fillRect(18, 6, 1, 3);
      g.fillStyle(shine, 1);
      g.fillRect(7, 2, 5, 1); // penteado de lado
      break;

    case 'bob':
      g.fillRect(6, 1, 12, 3);
      g.fillRect(6, 4, 12, 2); // franja
      g.fillRect(4, 3, 2, 11);
      g.fillRect(18, 3, 2, 11);
      g.fillStyle(shine, 1);
      g.fillRect(8, 1, 3, 1);
      break;

    case 'crop':
      g.fillRect(6, 3, 12, 2);
      g.fillRect(5, 5, 1, 4);
      g.fillRect(18, 5, 1, 4);
      break;
  }
}

function drawEyes(g: Phaser.GameObjects.Graphics, style: EyeStyle): void {
  const white = 0xf4f0ea;
  const pupil = 0x1a1420;
  const brow = 0x241a28;

  switch (style) {
    case 'narrow':
      g.fillStyle(brow, 1);
      g.fillRect(8, 9, 3, 1);
      g.fillRect(13, 9, 3, 1);
      g.fillStyle(white, 1);
      g.fillRect(8, 11, 3, 1);
      g.fillRect(13, 11, 3, 1);
      g.fillStyle(pupil, 1);
      g.fillRect(9, 11, 1, 1);
      g.fillRect(14, 11, 1, 1);
      break;

    case 'wide':
      g.fillStyle(white, 1);
      g.fillRect(8, 9, 3, 3);
      g.fillRect(13, 9, 3, 3);
      g.fillStyle(pupil, 1);
      g.fillRect(9, 10, 1, 2);
      g.fillRect(14, 10, 1, 2);
      break;

    case 'sharp':
      g.fillStyle(brow, 1);
      g.fillRect(8, 8, 3, 1);
      g.fillRect(13, 8, 3, 1);
      g.fillRect(10, 9, 1, 1);
      g.fillRect(13, 9, 1, 1);
      g.fillStyle(white, 1);
      g.fillRect(8, 10, 3, 2);
      g.fillRect(13, 10, 3, 2);
      g.fillStyle(pupil, 1);
      g.fillRect(10, 10, 1, 2);
      g.fillRect(13, 10, 1, 2);
      break;

    case 'neutral':
    default:
      g.fillStyle(white, 1);
      g.fillRect(8, 10, 3, 2);
      g.fillRect(13, 10, 3, 2);
      g.fillStyle(pupil, 1);
      g.fillRect(9, 10, 1, 2);
      g.fillRect(14, 10, 1, 2);
      break;
  }
}

function drawMouth(
  g: Phaser.GameObjects.Graphics,
  style: MouthStyle,
  hasBeard: boolean,
  skinShade: number,
): void {
  const dark = 0x241318;
  const teeth = 0xf4f0ea;
  const y = 15;

  switch (style) {
    case 'grin':
      g.fillStyle(dark, 1);
      g.fillRect(9, y - 1, 6, 3);
      g.fillStyle(teeth, 1);
      g.fillRect(10, y, 4, 1);
      break;

    case 'smile':
      g.fillStyle(dark, 1);
      g.fillRect(10, y, 4, 1);
      g.fillRect(9, y - 1, 1, 1);
      g.fillRect(14, y - 1, 1, 1);
      break;

    case 'smirk':
      g.fillStyle(dark, 1);
      g.fillRect(11, y, 3, 1);
      g.fillRect(14, y - 1, 1, 1);
      break;

    case 'bite':
      g.fillStyle(dark, 1);
      g.fillRect(10, y, 4, 1);
      g.fillStyle(skinShade, 1);
      g.fillRect(10, y + 1, 4, 1);
      break;

    case 'neutral':
    default:
      g.fillStyle(dark, 1);
      g.fillRect(10, y, hasBeard ? 4 : 3, 1);
      break;
  }
}
