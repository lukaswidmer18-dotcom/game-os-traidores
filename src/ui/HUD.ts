import Phaser from 'phaser';

export class HUD {
  private dayText: Phaser.GameObjects.Text;
  private clueCountText: Phaser.GameObjects.Text;
  private interactHint: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, width: number) {
    const style = { fontSize: '10px', color: '#ccccff', stroke: '#000000', strokeThickness: 2 };

    this.dayText = scene.add.text(8, 8, 'Dia 1', style).setScrollFactor(0).setDepth(10);
    this.clueCountText = scene.add.text(8, 22, 'Pistas: 0', style).setScrollFactor(0).setDepth(10);
    scene.add
      .text(width / 2, 8, '[C] Pistas  [E] Interagir', {
        fontSize: '9px',
        color: '#888899',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(10);
    this.interactHint = scene.add
      .text(width / 2, 22, '', { fontSize: '9px', color: '#ffdd88', stroke: '#000000', strokeThickness: 2 })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(10);
  }

  setDay(day: number): void {
    this.dayText.setText(`Dia ${day}`);
  }

  setClueCount(count: number): void {
    this.clueCountText.setText(`Pistas: ${count}`);
  }

  setInteractHint(text: string): void {
    this.interactHint.setText(text);
  }
}
