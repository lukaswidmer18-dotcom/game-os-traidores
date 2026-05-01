import Phaser from 'phaser';
import { ensureRuntimeTextures } from '../assets/runtimeTextures';
import { PALETTE } from '../design/constants';
import { fadeIn, flash, fadeOutTo, spawnDust, hoverBtn, burst, candleFlicker } from '../design/effects';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    ensureRuntimeTextures(this);
    fadeIn(this);

    // Background
    this.add.rectangle(cx, height / 2, width, height, PALETTE.bg.boot);

    // Subtle grid
    const grid = this.add.graphics().setDepth(0);
    grid.lineStyle(1, 0x150d2e, 0.4);
    for (let y = 0; y < height; y += 32) grid.lineBetween(0, y, width, y);
    for (let x = 0; x < width; x += 32) grid.lineBetween(x, 0, x, height);

    // Mansion silhouette — gothic architecture at the bottom
    this.drawMansionSilhouette(cx, height, width);

    // Candle flickers in corners for atmosphere
    candleFlicker(this, 28, 28);
    candleFlicker(this, width - 28, 28);
    candleFlicker(this, 28, height - 28);
    candleFlicker(this, width - 28, height - 28);

    // Ambient dust
    spawnDust(this, width, height, 24);

    // Decorative horizontal separator lines
    const deco = this.add.graphics().setDepth(1);
    deco.lineStyle(1, 0x4422aa, 0.25);
    deco.lineBetween(cx - 160, height * 0.38, cx + 160, height * 0.38);
    deco.lineBetween(cx - 160, height * 0.57, cx + 160, height * 0.57);

    // Entry flash + burst from title area
    this.time.delayedCall(60, () => {
      flash(this);
      burst(this, cx, height * 0.27, 18, 0xddbbff);
    });

    // Title — scale+fade entrance, bigger for impact
    const title = this.add
      .text(cx, height * 0.27, 'Entre Fiéis e Traidores', {
        fontSize: '28px',
        color: PALETTE.text.title,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(0.6)
      .setDepth(5);

    this.tweens.add({
      targets: title,
      alpha: 1,
      scale: 1,
      duration: 600,
      delay: 140,
      ease: 'Back.easeOut',
    });

    // Subtitle
    const subtitle = this.add
      .text(cx, height * 0.36, '— mansão dos segredos —', {
        fontSize: '11px',
        color: '#554466',
        fontStyle: 'italic',
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(5);

    this.tweens.add({ targets: subtitle, alpha: 0.8, duration: 500, delay: 500 });

    // Story intro
    const intro = this.add
      .text(cx, height * 0.46, 'Voce chega a Mansao Velhart. Cada acontecimento importa. Observe, pergunte e leve sua leitura ao Conselho.', {
        fontSize: '11px',
        color: PALETTE.text.secondary,
        wordWrap: { width: width * 0.68 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(5);

    this.tweens.add({ targets: intro, alpha: 1, duration: 500, delay: 700 });

    // Controls panel
    const ctrlBg = this.add
      .rectangle(cx, height * 0.67, width * 0.52, 50, 0x0d0a1e)
      .setStrokeStyle(1, 0x332255)
      .setAlpha(0)
      .setDepth(4);

    const ctrl1 = this.add
      .text(cx, height * 0.64, 'Escolher: clique nos suspeitos e acontecimentos', {
        fontSize: '10px',
        color: PALETTE.text.dim,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(5);

    const ctrl2 = this.add
      .text(cx, height * 0.70, 'Avancar dialogo: E    |    Pistas: C', {
        fontSize: '10px',
        color: PALETTE.text.dim,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(5);

    this.tweens.add({ targets: ctrlBg, alpha: 0.7, duration: 400, delay: 900 });
    this.tweens.add({ targets: [ctrl1, ctrl2], alpha: 1, duration: 400, delay: 900 });

    // Start button
    const startBtn = this.add
      .text(cx, height * 0.84, '[ COMEÇAR ]', {
        fontSize: '16px',
        color: PALETTE.text.golden,
        stroke: '#000000',
        strokeThickness: 2,
        backgroundColor: '#0d0a1e',
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(5)
      .setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: startBtn,
      alpha: 1,
      duration: 400,
      delay: 1100,
      onComplete: () => {
        this.tweens.add({
          targets: startBtn,
          alpha: { from: 0.65, to: 1 },
          duration: 950,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      },
    });

    hoverBtn(this, startBtn, PALETTE.text.golden);

    const onStart = () => fadeOutTo(this, 'GameScene', { day: 1 });
    startBtn.on('pointerdown', () => {
      this.tweens.killTweensOf(startBtn);
      onStart();
    });
    this.input.keyboard!.once('keydown-SPACE', onStart);
    this.input.keyboard!.once('keydown-ENTER', onStart);
  }

  private drawMansionSilhouette(cx: number, height: number, width: number): void {
    const g = this.add.graphics().setDepth(1).setAlpha(0.55);
    const baseY = height;
    const silY = height * 0.78;
    const darkColor = 0x080511;

    g.fillStyle(darkColor, 1);

    // Main building body
    g.fillRect(cx - 140, silY, 280, baseY - silY);

    // Left wing
    g.fillRect(cx - 220, silY + 20, 85, baseY - silY - 20);

    // Right wing
    g.fillRect(cx + 135, silY + 20, 85, baseY - silY - 20);

    // Central tower
    g.fillRect(cx - 28, silY - 40, 56, 40);

    // Left turret
    g.fillRect(cx - 200, silY - 20, 30, 20);

    // Right turret
    g.fillRect(cx + 170, silY - 20, 30, 20);

    // Rooftop peaks (triangles)
    g.fillTriangle(cx, silY - 65, cx - 32, silY - 40, cx + 32, silY - 40);
    g.fillTriangle(cx - 185, silY - 38, cx - 200, silY - 20, cx - 170, silY - 20);
    g.fillTriangle(cx + 185, silY - 38, cx + 170, silY - 20, cx + 200, silY - 20);

    // Lit windows — warm candlelight glow
    const windows = [
      { x: cx - 100, y: silY + 18 },
      { x: cx - 40, y: silY + 18 },
      { x: cx + 40, y: silY + 18 },
      { x: cx + 100, y: silY + 18 },
      { x: cx - 80, y: silY + 55 },
      { x: cx + 80, y: silY + 55 },
    ];

    windows.forEach((w) => {
      // Window rectangle
      const wg = this.add.graphics().setDepth(2);
      wg.fillStyle(PALETTE.atmosphere.windowLight, 0.25);
      wg.fillRect(w.x - 7, w.y, 14, 18);

      // Glow behind window
      const glow = this.add
        .circle(w.x, w.y + 9, 20, PALETTE.atmosphere.windowLight, 0.06)
        .setDepth(1);
      this.tweens.add({
        targets: glow,
        alpha: 0.13,
        scale: 1.2,
        duration: 900 + Math.random() * 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 1200,
      });
    });

    // Fog rising from the silhouette base
    const fogG = this.add.graphics().setDepth(2);
    fogG.fillStyle(0x1a1030, 0.35);
    fogG.fillRect(0, height * 0.91, width, height * 0.09);
  }
}
