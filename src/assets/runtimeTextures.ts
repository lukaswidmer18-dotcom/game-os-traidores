import Phaser from 'phaser';

/**
 * Texturas procedurais restantes. Piso, paredes, mobília e personagens
 * agora vêm dos tilesets Kenney (ver tileArt.ts e characterArt.ts);
 * aqui fica só o que não existe nos packs.
 */
export const TEXTURE_KEYS = {
  clue: 'clue-marker',
  key: 'key-marker',
} as const;

export function ensureRuntimeTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists(TEXTURE_KEYS.clue)) {
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

  if (!scene.textures.exists(TEXTURE_KEYS.key)) {
    // Chave pixelada dourada: argola à esquerda, haste e dentes à direita
    const graphics = scene.add.graphics({ x: 0, y: 0 });
    graphics.setVisible(false);
    graphics.fillStyle(0x7a5a1a, 1);
    graphics.fillRect(2, 5, 7, 7); // argola (contorno)
    graphics.fillStyle(0xd8a838, 1);
    graphics.fillRect(3, 6, 5, 5); // argola (miolo)
    graphics.fillStyle(0x1a1408, 1);
    graphics.fillRect(4, 7, 3, 3); // furo da argola
    graphics.fillStyle(0xd8a838, 1);
    graphics.fillRect(9, 8, 7, 2); // haste
    graphics.fillRect(13, 10, 2, 3); // dente 1
    graphics.fillRect(15, 10, 1, 2); // dente 2
    graphics.generateTexture(TEXTURE_KEYS.key, 18, 18);
    graphics.destroy();
  }
}
