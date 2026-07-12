import Phaser from 'phaser';
import { FONT } from '../design/constants';

const BAR_H = 30;

/**
 * Barra de status no topo: vidro escuro com borda inferior dourada.
 * Estatísticas à esquerda, atalhos ao centro, ações restantes à direita.
 */
export class HUD {
  private dayText: Phaser.GameObjects.Text;
  private clueCountText: Phaser.GameObjects.Text;
  private interactHint: Phaser.GameObjects.Text;
  private threatText: Phaser.GameObjects.Text;
  private actionsText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, width: number) {
    // Painel de vidro com degradê sutil e fio dourado embaixo
    const bar = scene.add.graphics().setScrollFactor(0).setDepth(9);
    bar.fillGradientStyle(0x14102a, 0x14102a, 0x0c0918, 0x0c0918, 0.92);
    bar.fillRect(0, 0, width, BAR_H);
    bar.fillGradientStyle(0x8a6d2f, 0x8a6d2f, 0x8a6d2f, 0x8a6d2f, 0.7, 0.15, 0.7, 0.15);
    bar.fillRect(0, BAR_H - 1, width, 1);

    const stat = (x: number, color: string): Phaser.GameObjects.Text =>
      scene.add
        .text(x, 9, '', {
          fontFamily: FONT.family,
          fontSize: '12px',
          color,
          fontStyle: 'bold',
        })
        .setResolution(FONT.resolution)
        .setLetterSpacing(1)
        .setScrollFactor(0)
        .setDepth(10);

    this.dayText = stat(12, '#f0d483');
    this.clueCountText = stat(86, '#c8c6e8');
    this.threatText = stat(width - 132, '#9ab89a').setOrigin(1, 0);

    this.actionsText = stat(width - 12, '#d8c890').setOrigin(1, 0);

    scene.add
      .text(width / 2, 9, 'E INTERAGIR   ·   C PISTAS   ·   J LIVRO', {
        fontFamily: FONT.family,
        fontSize: '10px',
        color: '#87849f',
      })
      .setResolution(FONT.resolution)
      .setLetterSpacing(1)
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(10);

    this.interactHint = scene.add
      .text(width / 2, BAR_H + 8, '', {
        fontFamily: FONT.family,
        fontSize: '13px',
        color: '#ffdd88',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setResolution(FONT.resolution)
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(10);
  }

  setDay(day: number): void {
    this.dayText.setText(`DIA ${day}`);
  }

  setClueCount(count: number): void {
    this.clueCountText.setText(`PISTAS ${count}`);
  }

  setInteractHint(text: string): void {
    this.interactHint.setText(text);
  }

  setThreat(label: string, prefix = 'RISCO', inverted = false): void {
    if (!label) {
      this.threatText.setText('');
      return;
    }
    const level = label.toUpperCase();
    this.threatText.setText(`${prefix} ${level}`);
    const danger = inverted ? level === 'BAIXO' : level === 'ALTO';
    const warning = level === 'MEDIO';
    this.threatText.setColor(danger ? '#ff9977' : warning ? '#ddba77' : '#9ab89a');
  }

  setActions(used: number, max: number): void {
    const left = max - used;
    this.actionsText.setText(`AÇÕES ${left}/${max}`);
    this.actionsText.setColor(left <= 1 ? '#ff9977' : left <= 2 ? '#ddba77' : '#d8c890');
  }
}
