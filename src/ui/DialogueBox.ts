import Phaser from 'phaser';

const BOX_H = 92;
const SLIDE_DIST = 22;
const SLIDE_DUR = 180;

export class DialogueBox {
  private bg: Phaser.GameObjects.Rectangle;
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
    const pad = 12;

    this.bg = scene.add
      .rectangle(0, 0, width - 16, BOX_H, 0x0e0b20, 235)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x7766aa);

    // Separator line under speaker name
    this.separator = scene.add.graphics();
    this.separator.lineStyle(1, 0x554488, 0.6);
    this.separator.lineBetween(pad, 22, width - 32, 22);

    this.speakerText = scene.add.text(pad, 6, '', {
      fontSize: '11px',
      color: '#ffdd88',
      fontStyle: 'bold',
    });

    this.bodyText = scene.add.text(pad, 28, '', {
      fontSize: '10px',
      color: '#ddddf5',
      wordWrap: { width: width - 50 },
    });

    this.hint = scene.add
      .text(width - 28, BOX_H - 10, '[E] continuar', {
        fontSize: '9px',
        color: '#666688',
      })
      .setOrigin(1, 1);

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
