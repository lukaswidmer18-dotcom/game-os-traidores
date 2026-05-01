import Phaser from 'phaser';
import { NPC_DATA } from '../data/npcs';

type Direction = 'down' | 'up' | 'left' | 'right';

export const TEXTURE_KEYS = {
  floor: 'room-floor',
  gardenFloor: 'garden-floor',
  councilFloor: 'council-floor',
  wall: 'wall-tile',
  clue: 'clue-marker',
} as const;

const PLAYER_DIRECTIONS: Direction[] = ['down', 'up', 'left', 'right'];

export function ensureRuntimeTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEXTURE_KEYS.floor)) {
    return;
  }

  createBaseTextures(scene);
  createPlayerTextures(scene);
  createNPCTextures(scene);
}

function createBaseTextures(scene: Phaser.Scene): void {
  createTexture(scene, TEXTURE_KEYS.floor, 32, 32, (g) => {
    g.fillStyle(0x181426, 1);
    g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x201a31, 1);
    g.fillRect(0, 0, 32, 2);
    g.fillRect(0, 30, 32, 2);
    g.fillStyle(0x140f22, 1);
    g.fillRect(6, 6, 20, 20);
    g.lineStyle(1, 0x2b2440, 0.5);
    g.strokeRect(5.5, 5.5, 21, 21);
  });

  createTexture(scene, TEXTURE_KEYS.gardenFloor, 32, 32, (g) => {
    g.fillStyle(0x102019, 1);
    g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x173124, 1);
    g.fillRect(3, 5, 10, 8);
    g.fillRect(18, 18, 8, 8);
    g.fillStyle(0x29583e, 1);
    g.fillRect(12, 10, 3, 3);
    g.fillRect(8, 20, 4, 4);
    g.fillRect(24, 8, 3, 3);
  });

  createTexture(scene, TEXTURE_KEYS.councilFloor, 32, 32, (g) => {
    g.fillStyle(0x140810, 1);
    g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x1f0d16, 1);
    g.fillRect(4, 4, 24, 24);
    g.lineStyle(1, 0x5d1a2d, 0.6);
    g.strokeRect(4.5, 4.5, 23, 23);
    g.fillStyle(0x25070d, 1);
    g.fillRect(14, 0, 4, 32);
    g.fillRect(0, 14, 32, 4);
  });

  createTexture(scene, TEXTURE_KEYS.wall, 16, 16, (g) => {
    g.fillStyle(0x251e3a, 1);
    g.fillRect(0, 0, 16, 16);
    g.lineStyle(1, 0x3a3058, 0.8);
    g.strokeRect(0.5, 0.5, 15, 15);
    g.lineStyle(1, 0x140f22, 0.7);
    g.lineBetween(0, 8, 16, 8);
  });

  createTexture(scene, TEXTURE_KEYS.clue, 18, 18, (g) => {
    g.fillStyle(0x2d2200, 1);
    g.fillRect(3, 3, 12, 12);
    g.fillStyle(0xffee44, 1);
    g.fillRect(4, 4, 10, 10);
    g.fillStyle(0xfff6aa, 1);
    g.fillRect(6, 6, 6, 6);
  });
}

function createPlayerTextures(scene: Phaser.Scene): void {
  for (const direction of PLAYER_DIRECTIONS) {
    createTexture(scene, `player-${direction}-0`, 18, 24, (g) => {
      drawPlayer(g, direction, false);
    });

    createTexture(scene, `player-${direction}-1`, 18, 24, (g) => {
      drawPlayer(g, direction, true);
    });
  }
}

function createNPCTextures(scene: Phaser.Scene): void {
  for (const npc of NPC_DATA) {
    createTexture(scene, `npc-${npc.id}-0`, 18, 22, (g) => {
      drawNPC(g, npc.color, false);
    });

    createTexture(scene, `npc-${npc.id}-1`, 18, 22, (g) => {
      drawNPC(g, npc.color, true);
    });
  }
}

function createTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (graphics: Phaser.GameObjects.Graphics) => void,
): void {
  if (scene.textures.exists(key)) {
    return;
  }

  const graphics = scene.add.graphics({ x: 0, y: 0 });
  graphics.setVisible(false);
  draw(graphics);
  graphics.generateTexture(key, width, height);
  graphics.destroy();
}

function drawPlayer(
  graphics: Phaser.GameObjects.Graphics,
  direction: Direction,
  walking: boolean,
): void {
  const trim = walking ? 1 : 0;

  graphics.fillStyle(0x0d0a16, 1);
  graphics.fillRect(7, 2, 4, 2);
  graphics.fillStyle(0xf0f0ff, 1);
  graphics.fillRect(6, 4, 6, 4);

  graphics.fillStyle(0x3a4ea1, 1);
  graphics.fillRect(5, 8, 8, 7);
  graphics.fillStyle(0x6079db, 1);
  graphics.fillRect(6, 8, 6, 4);

  if (direction === 'up') {
    graphics.fillStyle(0x273774, 1);
    graphics.fillRect(5, 8, 8, 3);
  } else if (direction === 'left') {
    graphics.fillStyle(0x273774, 1);
    graphics.fillRect(4, 9, 3, 5);
  } else if (direction === 'right') {
    graphics.fillStyle(0x273774, 1);
    graphics.fillRect(11, 9, 3, 5);
  } else {
    graphics.fillStyle(0x9fb3ff, 1);
    graphics.fillRect(7, 12, 4, 2);
  }

  graphics.fillStyle(0x1f2f66, 1);
  graphics.fillRect(6, 15, 3, 5);
  graphics.fillRect(9, 15, 3, 5);

  if (direction === 'left') {
    graphics.fillStyle(0xf0f0ff, 1);
    graphics.fillRect(5, 5, 1, 1);
  } else if (direction === 'right') {
    graphics.fillStyle(0xf0f0ff, 1);
    graphics.fillRect(11, 5, 1, 1);
  } else if (direction === 'down') {
    graphics.fillStyle(0x212121, 1);
    graphics.fillRect(7, 6, 1, 1);
    graphics.fillRect(10, 6, 1, 1);
  }

  graphics.fillStyle(0x09090f, 1);
  graphics.fillRect(6, 20, 3, 2 - trim);
  graphics.fillRect(9, 20 + trim, 3, 2 - trim);
}

function drawNPC(
  graphics: Phaser.GameObjects.Graphics,
  baseColor: number,
  blink: boolean,
): void {
  const headColor = Phaser.Display.Color.ValueToColor(baseColor).brighten(35).color;
  const trimColor = Phaser.Display.Color.ValueToColor(baseColor).darken(25).color;

  graphics.fillStyle(0x100b17, 1);
  graphics.fillRect(7, 1, 4, 2);
  graphics.fillStyle(headColor, 1);
  graphics.fillRect(6, 3, 6, 5);
  graphics.fillStyle(baseColor, 1);
  graphics.fillRect(5, 8, 8, 8);
  graphics.fillStyle(trimColor, 1);
  graphics.fillRect(6, 9, 6, 6);
  graphics.fillStyle(0x08080d, 1);
  graphics.fillRect(6, 16, 3, 3);
  graphics.fillRect(9, 16, 3, 3);

  if (blink) {
    graphics.fillStyle(0x2b2236, 1);
    graphics.fillRect(7, 5, 4, 1);
  } else {
    graphics.fillStyle(0x111111, 1);
    graphics.fillRect(7, 5, 1, 1);
    graphics.fillRect(10, 5, 1, 1);
  }
}
