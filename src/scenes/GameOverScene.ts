import Phaser from 'phaser';
import { PALETTE, SPECTACLE } from '../design/constants';
import { fadeIn, flash, fadeOutTo, burst, slamIn, hoverBtn, spawnDust } from '../design/effects';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(_data: { outcome: 'victory' | 'defeat'; message: string }): void {
    this.registry.set('gameOverData', _data);
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const data = this.registry.get('gameOverData') as {
      outcome: 'victory' | 'defeat';
      message: string;
    };

    fadeIn(this);
    this.time.delayedCall(100, () => flash(this));

    this.add.rectangle(cx, height / 2, width, height, PALETTE.bg.gameover);

    // Dust for atmosphere
    spawnDust(this, width, height, 14);

    const isVictory = data.outcome === 'victory';
    const titleColor = isVictory ? PALETTE.text.success : PALETTE.text.danger;
    const titleText = isVictory ? 'VITÓRIA' : 'DERROTA';
    const particleColor = isVictory ? PALETTE.particle.victory : PALETTE.particle.defeat;

    // Title slams in from above
    const titleY = height * 0.30;
    const title = this.add
      .text(cx, -80, titleText, {
        fontSize: '34px',
        color: titleColor,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(10);

    slamIn(this, title, titleY, 200);

    // Burst when title lands
    this.time.delayedCall(650, () => {
      burst(this, cx, titleY, SPECTACLE.victoryCount, particleColor);
      if (isVictory) {
        // Extra side bursts for victory
        burst(this, cx - 120, titleY + 20, 10, particleColor);
        burst(this, cx + 120, titleY + 20, 10, particleColor);
      }
    });

    // Decorative separator
    const sep = this.add.graphics().setAlpha(0).setDepth(2);
    sep.lineStyle(1, isVictory ? 0x226633 : 0x661122, 0.5);
    sep.lineBetween(cx - 160, height * 0.43, cx + 160, height * 0.43);
    this.tweens.add({ targets: sep, alpha: 1, duration: 400, delay: 700 });

    // Message text
    const msg = this.add
      .text(cx, height * 0.52, data.message, {
        fontSize: '12px',
        color: '#ccccdd',
        wordWrap: { width: width * 0.72 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(5);

    this.tweens.add({ targets: msg, alpha: 1, duration: 500, delay: 750 });

    // Restart button with pulse
    const restartBtn = this.add
      .text(cx, height * 0.72, '[ JOGAR NOVAMENTE ]', {
        fontSize: '14px',
        color: PALETTE.text.golden,
        stroke: '#000000',
        strokeThickness: 2,
        backgroundColor: '#0d0a1e',
        padding: { x: 12, y: 7 },
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(5)
      .setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: restartBtn,
      alpha: 1,
      duration: 400,
      delay: 1000,
      onComplete: () => {
        this.tweens.add({
          targets: restartBtn,
          alpha: { from: 0.65, to: 1 },
          duration: 950,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      },
    });

    hoverBtn(this, restartBtn, PALETTE.text.golden);

    const onRestart = () => {
      this.tweens.killTweensOf(restartBtn);
      fadeOutTo(this, 'BootScene');
    };

    restartBtn.on('pointerdown', onRestart);
    this.input.keyboard!.once('keydown-SPACE', onRestart);
    this.input.keyboard!.once('keydown-ENTER', onRestart);
  }
}
