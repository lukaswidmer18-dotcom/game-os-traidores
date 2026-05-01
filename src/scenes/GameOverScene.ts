import Phaser from 'phaser';
import { PALETTE, SPECTACLE } from '../design/constants';
import { fadeIn, flash, fadeOutTo, burst, slamIn, hoverBtn, spawnDust, victoryRain, defeatDrizzle } from '../design/effects';

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

    spawnDust(this, width, height, 16);

    const isVictory = data.outcome === 'victory';
    const titleColor = isVictory ? PALETTE.text.success : PALETTE.text.danger;
    const titleText = isVictory ? 'VITÓRIA' : 'DERROTA';
    const particleColor = isVictory ? PALETTE.particle.victory : PALETTE.particle.defeat;

    // Background color tint for outcome
    const tintColor = isVictory ? 0x002200 : 0x220000;
    this.add
      .rectangle(cx, height / 2, width, height, tintColor, 0.18)
      .setDepth(0);

    // Title slams in from above
    const titleY = height * 0.28;
    const title = this.add
      .text(cx, -80, titleText, {
        fontSize: '42px',
        color: titleColor,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(10);

    slamIn(this, title, titleY, 200);

    // Burst wave when title lands
    this.time.delayedCall(650, () => {
      burst(this, cx, titleY, SPECTACLE.victoryCount, particleColor);
      if (isVictory) {
        burst(this, cx - 140, titleY + 20, 12, particleColor);
        burst(this, cx + 140, titleY + 20, 12, particleColor);
        burst(this, cx, titleY + 40, 10, PALETTE.particle.gold);
        // Launch victory rain
        this.time.delayedCall(200, () => victoryRain(this, width));
      } else {
        burst(this, cx - 80, titleY + 10, 8, particleColor);
        burst(this, cx + 80, titleY + 10, 8, particleColor);
        // Launch defeat drizzle
        this.time.delayedCall(100, () => defeatDrizzle(this, width));
      }
    });

    // Decorative separator with outcome color
    const sepColor = isVictory ? 0x226633 : 0x661122;
    const sep = this.add.graphics().setAlpha(0).setDepth(2);
    sep.lineStyle(1, sepColor, 0.6);
    sep.lineBetween(cx - 180, height * 0.42, cx + 180, height * 0.42);
    this.tweens.add({ targets: sep, alpha: 1, duration: 400, delay: 700 });

    // Message text
    const msg = this.add
      .text(cx, height * 0.51, data.message, {
        fontSize: '13px',
        color: '#ccccdd',
        wordWrap: { width: width * 0.72 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(5);

    this.tweens.add({ targets: msg, alpha: 1, duration: 500, delay: 750 });

    // Outcome flavor line
    const flavorColor = isVictory ? PALETTE.text.success : '#ff6666';
    const flavorText = isVictory
      ? '✦ A mansão está salva ✦'
      : '✦ Os traidores venceram ✦';
    const flavor = this.add
      .text(cx, height * 0.62, flavorText, {
        fontSize: '11px',
        color: flavorColor,
        fontStyle: 'italic',
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(5);

    this.tweens.add({ targets: flavor, alpha: 0.8, duration: 500, delay: 950 });

    // Restart button with pulse
    const restartBtn = this.add
      .text(cx, height * 0.74, '[ JOGAR NOVAMENTE ]', {
        fontSize: '15px',
        color: PALETTE.text.golden,
        stroke: '#000000',
        strokeThickness: 2,
        backgroundColor: '#0d0a1e',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(5)
      .setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: restartBtn,
      alpha: 1,
      duration: 400,
      delay: 1100,
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
