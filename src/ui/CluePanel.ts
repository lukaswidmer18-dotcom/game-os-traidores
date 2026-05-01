import Phaser from 'phaser';
import { Clue } from '../data/clues';

export class CluePanel {
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Rectangle;
  private title: Phaser.GameObjects.Text;
  private entries: Phaser.GameObjects.Text[] = [];
  private closeHint: Phaser.GameObjects.Text;
  private panelVisible: boolean = false;

  constructor(scene: Phaser.Scene, width: number, height: number) {
    const panelW = 260;
    const panelH = height - 32;

    this.bg = scene.add
      .rectangle(0, 0, panelW, panelH, 0x0d0d22, 230)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x6666aa);

    this.title = scene.add.text(12, 10, 'PISTAS COLETADAS', {
      fontSize: '11px',
      color: '#ffdd88',
      fontStyle: 'bold',
    });

    this.closeHint = scene.add.text(panelW - 12, panelH - 10, '[C] fechar', {
      fontSize: '9px',
      color: '#666688',
    }).setOrigin(1, 1);

    this.container = scene.add
      .container(width - panelW - 8, 16, [this.bg, this.title, this.closeHint])
      .setDepth(11)
      .setScrollFactor(0)
      .setVisible(false);
  }

  toggle(clues: Clue[]): void {
    this.panelVisible = !this.panelVisible;
    if (this.panelVisible) this.refresh(clues);
    this.container.setVisible(this.panelVisible);
  }

  private refresh(clues: Clue[]): void {
    for (const e of this.entries) e.destroy();
    this.entries = [];

    if (clues.length === 0) {
      const none = (this.container.scene as Phaser.Scene).add.text(12, 32, 'Nenhuma pista ainda.', {
        fontSize: '9px',
        color: '#666688',
      });
      this.container.add(none);
      this.entries.push(none);
      return;
    }

    clues.forEach((clue, i) => {
      const t = (this.container.scene as Phaser.Scene).add.text(
        12,
        32 + i * 38,
        `• ${clue.description}`,
        {
          fontSize: '9px',
          color: '#aaddff',
          wordWrap: { width: 230 },
        },
      );
      this.container.add(t);
      this.entries.push(t);
    });
  }

  isVisible(): boolean {
    return this.panelVisible;
  }
}
