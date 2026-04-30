import Phaser from 'phaser';
import { STORY_DAYS } from '../data/storyDays';
import { PALETTE } from '../design/constants';
import { fadeIn, flash, fadeOutTo, spawnDust, hoverBtn } from '../design/effects';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    fadeIn(this);
    this.time.delayedCall(80, () => flash(this));

    // Background
    this.add.rectangle(cx, height / 2, width, height, PALETTE.bg.boot);

    // Subtle grid
    const grid = this.add.graphics().setDepth(0);
    grid.lineStyle(1, 0x150d2e, 0.4);
    for (let y = 0; y < height; y += 32) grid.lineBetween(0, y, width, y);
    for (let x = 0; x < width; x += 32) grid.lineBetween(x, 0, x, height);

    // Ambient dust
    spawnDust(this, width, height, 20);

    // Decorative horizontal separator lines
    const deco = this.add.graphics().setDepth(1);
    deco.lineStyle(1, 0x4422aa, 0.25);
    deco.lineBetween(cx - 160, height * 0.38, cx + 160, height * 0.38);
    deco.lineBetween(cx - 160, height * 0.57, cx + 160, height * 0.57);

    // Title — scale+fade entrance
    const title = this.add
      .text(cx, height * 0.27, 'Entre Fiéis e Traidores', {
        fontSize: '24px',
        color: PALETTE.text.title,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(0.7)
      .setDepth(5);

    this.tweens.add({
      targets: title,
      alpha: 1,
      scale: 1,
      duration: 550,
      delay: 120,
      ease: 'Back.easeOut',
    });

    // Subtitle
    const subtitle = this.add
      .text(cx, height * 0.35, '— mansão dos segredos —', {
        fontSize: '10px',
        color: '#554466',
        fontStyle: 'italic',
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(5);

    this.tweens.add({ targets: subtitle, alpha: 0.8, duration: 500, delay: 450 });

    // Story intro
    const intro = this.add
      .text(cx, height * 0.46, STORY_DAYS[0].intro, {
        fontSize: '11px',
        color: PALETTE.text.secondary,
        wordWrap: { width: width * 0.68 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(5);

    this.tweens.add({ targets: intro, alpha: 1, duration: 500, delay: 650 });

    // Controls panel
    const ctrlBg = this.add
      .rectangle(cx, height * 0.67, width * 0.52, 50, 0x0d0a1e)
      .setStrokeStyle(1, 0x332255)
      .setAlpha(0)
      .setDepth(4);

    const ctrl1 = this.add
      .text(cx, height * 0.64, 'Mover: WASD / Setas', {
        fontSize: '10px',
        color: PALETTE.text.dim,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(5);

    const ctrl2 = this.add
      .text(cx, height * 0.70, 'Interagir: E    |    Pistas: C', {
        fontSize: '10px',
        color: PALETTE.text.dim,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(5);

    this.tweens.add({ targets: ctrlBg, alpha: 0.7, duration: 400, delay: 850 });
    this.tweens.add({ targets: [ctrl1, ctrl2], alpha: 1, duration: 400, delay: 850 });

    // Start button
    const startBtn = this.add
      .text(cx, height * 0.84, '[ COMEÇAR ]', {
        fontSize: '15px',
        color: PALETTE.text.golden,
        stroke: '#000000',
        strokeThickness: 2,
        backgroundColor: '#0d0a1e',
        padding: { x: 14, y: 7 },
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(5)
      .setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: startBtn,
      alpha: 1,
      duration: 400,
      delay: 1050,
      onComplete: () => {
        // Gentle pulse after entrance
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
}
