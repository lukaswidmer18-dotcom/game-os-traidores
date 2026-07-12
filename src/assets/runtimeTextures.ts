import Phaser from 'phaser';

/**
 * Texturas procedurais restantes. Piso, paredes, mobília e personagens
 * agora vêm dos tilesets Kenney (ver tileArt.ts e characterArt.ts);
 * aqui fica só o que não existe nos packs.
 */
export const TEXTURE_KEYS = {
  clue: 'clue-marker',
} as const;

export function ensureRuntimeTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEXTURE_KEYS.clue)) {
    return;
  }

  const graphics = scene.add.graphics({ x: 0, y: 0 });
  graphics.setVisible(false);
  graphics.fillStyle(0x2d2200, 1);
  graphics.fillRect(3, 3, 12, 12);
  graphics.fillStyle(0xffee44, 1);
  graphics.fillRect(4, 4, 10, 10);
  graphics.fillStyle(0xfff6aa, 1);
  graphics.fillRect(6, 6, 6, 6);
  graphics.generateTexture(TEXTURE_KEYS.clue, 18, 18);
  graphics.destroy();
}
