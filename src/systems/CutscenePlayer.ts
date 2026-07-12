import Phaser from 'phaser';
import { FONT } from '../design/constants';

export interface CutsceneStep {
  /** Move a câmera até o ponto (coordenadas de mundo). */
  panTo?: { x: number; y: number; duration: number };
  /** Ajusta o zoom da câmera principal. */
  zoomTo?: { zoom: number; duration: number };
  /** Legenda exibida na barra inferior durante o passo. */
  caption?: string;
  /** Pausa após o movimento, em ms. */
  hold?: number;
}

const BAR_H = 52;
const BAR_TWEEN = 350;

/**
 * Reproduz sequências cinematográficas na câmera principal: letterbox,
 * pan/zoom encadeados e legendas. ESPAÇO pula a cena inteira.
 * A câmera de UI desenha as barras/legendas; a principal, o mundo.
 */
export class CutscenePlayer {
  private topBar: Phaser.GameObjects.Rectangle | null = null;
  private bottomBar: Phaser.GameObjects.Rectangle | null = null;
  private caption: Phaser.GameObjects.Text | null = null;
  private skipHint: Phaser.GameObjects.Text | null = null;
  private skipKey: Phaser.Input.Keyboard.Key | null = null;
  private finished = false;
  private onDone: (() => void) | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    /** Registra objetos de tela na câmera de UI (câmera dupla). */
    private readonly claimUI: (objs: Phaser.GameObjects.GameObject[]) => void,
  ) {}

  get active(): boolean {
    return this.topBar !== null;
  }

  play(steps: CutsceneStep[], onDone: () => void): void {
    if (this.active) return;

    this.finished = false;
    this.onDone = onDone;
    const { width, height } = this.scene.scale;

    this.topBar = this.scene.add
      .rectangle(width / 2, -BAR_H / 2, width, BAR_H, 0x000000, 0.94)
      .setScrollFactor(0)
      .setDepth(30);
    this.bottomBar = this.scene.add
      .rectangle(width / 2, height + BAR_H / 2, width, BAR_H, 0x000000, 0.94)
      .setScrollFactor(0)
      .setDepth(30);
    this.caption = this.scene.add
      .text(width / 2, height - BAR_H / 2, '', {
        fontFamily: FONT.family,
        fontSize: '14px',
        color: '#e8ddb8',
        fontStyle: 'italic',
        align: 'center',
        wordWrap: { width: width * 0.8 },
      })
      .setResolution(FONT.resolution)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(31);
    this.skipHint = this.scene.add
      .text(width - 14, BAR_H / 2, 'ESPAÇO pular', {
        fontFamily: FONT.family,
        fontSize: '10px',
        color: '#87849f',
      })
      .setResolution(FONT.resolution)
      .setLetterSpacing(1)
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(31);

    this.claimUI([this.topBar, this.bottomBar, this.caption, this.skipHint]);

    this.scene.tweens.add({ targets: this.topBar, y: BAR_H / 2, duration: BAR_TWEEN });
    this.scene.tweens.add({
      targets: this.bottomBar,
      y: height - BAR_H / 2,
      duration: BAR_TWEEN,
    });

    this.skipKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.skipKey.on('down', () => this.finish());

    this.runStep(steps, 0);
  }

  private runStep(steps: CutsceneStep[], index: number): void {
    if (this.finished) return;
    if (index >= steps.length) {
      this.finish();
      return;
    }

    const step = steps[index];
    const cam = this.scene.cameras.main;
    const next = () => {
      const hold = step.hold ?? 400;
      this.scene.time.delayedCall(hold, () => this.runStep(steps, index + 1));
    };

    if (step.caption !== undefined) {
      this.caption?.setText(step.caption);
    }

    const moveDur = step.panTo?.duration ?? 0;
    const zoomDur = step.zoomTo?.duration ?? 0;
    if (step.panTo) {
      cam.pan(step.panTo.x, step.panTo.y, moveDur, 'Sine.easeInOut');
    }
    if (step.zoomTo) {
      cam.zoomTo(step.zoomTo.zoom, zoomDur, 'Sine.easeInOut');
    }

    const wait = Math.max(moveDur, zoomDur);
    if (wait > 0) {
      this.scene.time.delayedCall(wait, next);
    } else {
      next();
    }
  }

  /** Encerra (fim natural ou skip): restaura câmera e derruba as barras. */
  private finish(): void {
    if (this.finished) return;
    this.finished = true;

    const { height } = this.scene.scale;
    this.skipKey?.destroy();
    this.skipKey = null;

    const parts = [this.topBar, this.bottomBar, this.caption, this.skipHint].filter(
      (p): p is NonNullable<typeof p> => p !== null,
    );
    this.caption?.setText('');
    this.scene.tweens.add({ targets: this.topBar, y: -BAR_H / 2, duration: BAR_TWEEN });
    this.scene.tweens.add({
      targets: this.bottomBar,
      y: height + BAR_H / 2,
      duration: BAR_TWEEN,
      onComplete: () => {
        parts.forEach((p) => p.destroy());
      },
    });
    this.topBar = null;
    this.bottomBar = null;
    this.caption = null;
    this.skipHint = null;

    const done = this.onDone;
    this.onDone = null;
    done?.();
  }
}
