import Phaser from 'phaser';
import { FONT } from '../design/constants';

const BOX_H = 106;
const SLIDE_DIST = 22;
const SLIDE_DUR = 180;

export class DialogueBox {
  private bg: Phaser.GameObjects.Graphics;
  private speakerText: Phaser.GameObjects.Text;
  private bodyText: Phaser.GameObjects.Text;
  private hint: Phaser.GameObjects.Text;
  private separator: Phaser.GameObjects.Graphics;
  private container: Phaser.GameObjects.Container;
  private visible: boolean = false;
  private containerBaseY: number;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, width: number, height: number) {
    this.scene = scene;
    const boxY = height - BOX_H - 8;
    this.containerBaseY = boxY;
    const pad = 14;
    const boxW = width - 16;

    // Painel com degradê vertical e cantos arredondados
    this.bg = scene.add.graphics();
    this.bg.fillGradientStyle(0x1c1534, 0x1c1534, 0x0c0918, 0x0c0918, 0.97);
    this.bg.fillRoundedRect(0, 0, boxW, BOX_H, 8);
    this.bg.lineStyle(1, 0x7766aa, 0.9);
    this.bg.strokeRoundedRect(0, 0, boxW, BOX_H, 8);

    // Divisória dourada em fade sob o nome de quem fala
    this.separator = scene.add.graphics();
    this.separator.fillGradientStyle(0xd4a848, 0xd4a848, 0xd4a848, 0xd4a848, 0.8, 0, 0.8, 0);
    this.separator.fillRect(pad, 28, boxW * 0.6, 1);

    this.speakerText = scene.add
      .text(pad, 7, '', {
        fontFamily: FONT.family,
        fontSize: '14px',
        color: '#f0d483',
        fontStyle: 'bold',
      })
      .setResolution(FONT.resolution)
      .setLetterSpacing(1);

    this.bodyText = scene.add
      .text(pad, 36, '', {
        fontFamily: FONT.family,
        fontSize: '13px',
        color: '#e6e8fa',
        lineSpacing: 5,
        wordWrap: { width: width - 60 },
      })
      .setResolution(FONT.resolution);

    this.hint = scene.add
      .text(width - 30, BOX_H - 8, '[E] continuar', {
        fontFamily: FONT.family,
        fontSize: '11px',
        color: '#a89ec6',
      })
      .setResolution(FONT.resolution)
      .setOrigin(1, 1);

    // Pulso sutil no aviso de continuar
    scene.tweens.add({
      targets: this.hint,
      alpha: { from: 1, to: 0.45 },
      duration: 850,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.container = scene.add
      .container(8, boxY, [this.bg, this.separator, this.speakerText, this.bodyText, this.hint])
      .setDepth(10)
      .setScrollFactor(0)
      .setVisible(false);
  }

  show(speaker: string, text: string): void {
    this.speakerText.setText(speaker);
    this.bodyText.setText(text);

    // Slide up from below
    this.container.y = this.containerBaseY + SLIDE_DIST;
    this.container.setAlpha(0);
    this.container.setVisible(true);
    this.visible = true;

    this.scene.tweens.add({
      targets: this.container,
      y: this.containerBaseY,
      alpha: 1,
      duration: SLIDE_DUR,
      ease: 'Quad.easeOut',
    });
  }

  hide(): void {
    this.scene.tweens.add({
      targets: this.container,
      y: this.containerBaseY + SLIDE_DIST,
      alpha: 0,
      duration: SLIDE_DUR - 40,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.container.setVisible(false);
        this.container.y = this.containerBaseY;
      },
    });
    this.visible = false;
  }

  isVisible(): boolean {
    return this.visible;
  }
}
