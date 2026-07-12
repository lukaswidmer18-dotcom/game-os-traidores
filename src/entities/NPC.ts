import Phaser from 'phaser';
import { NPCData } from '../data/npcs';
import { SIZES } from '../design/constants';

const INTERACT_RADIUS = 40;
const WANDER_SPEED = 34; // px/s — passo calmo de quem conversa pela casa
const WANDER_MARGIN = 22; // distância mínima das paredes

export interface WanderBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class NPC {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly label: Phaser.GameObjects.Text;
  readonly data: NPCData;

  private glow: Phaser.GameObjects.Arc;
  private shadow: Phaser.GameObjects.Ellipse;
  private proximityRing: Phaser.GameObjects.Arc;
  private ringActive = false;
  private scene: Phaser.Scene;
  private baseX: number;
  private baseY: number;
  private idleEvent: Phaser.Time.TimerEvent;
  private wanderBounds: WanderBounds | null = null;
  private wanderTimer: Phaser.Time.TimerEvent | null = null;
  private wanderTween: Phaser.Tweens.Tween | null = null;
  private walkEvent: Phaser.Time.TimerEvent | null = null;
  private walkStep = 0;

  /** Sala onde o NPC está (atualizada ao viajar entre cômodos). */
  roomId = '';

  /** Trechos restantes de uma viagem entre salas (retomada se interrompida). */
  private travelQueue: Array<{ x: number; y: number }> = [];
  private travelDone: (() => void) | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, data: NPCData) {
    this.data = data;
    this.scene = scene;
    this.baseX = x;
    this.baseY = y;

    // Ambient glow aura underneath
    this.glow = scene.add
      .circle(x, y, SIZES.npc + 8, data.color, 0.12)
      .setDepth(3);
    scene.tweens.add({
      targets: this.glow,
      alpha: 0.26,
      duration: 1400 + Math.random() * 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: Math.random() * 700,
    });

    // Sombra no chão — mesma linguagem visual do jogador
    this.shadow = scene.add.ellipse(x, y + 12, 20, 7, 0x000000, 0.3).setDepth(4);

    this.sprite = scene.add
      .sprite(x, y, `npc-${data.id}-0`)
      .setScale(1.6)
      .setDepth(5);

    // Respiração parado (frames 0/1); pausa enquanto anda (frames 2/3)
    this.idleEvent = scene.time.addEvent({
      delay: 420 + Math.random() * 260,
      loop: true,
      callback: () => {
        if (this.walkEvent) return;
        const nextFrame = this.sprite.texture.key.endsWith('-0') ? 1 : 0;
        this.sprite.setTexture(`npc-${this.data.id}-${nextFrame}`);
      },
    });

    // Name label above
    this.label = scene.add
      .text(x, y - SIZES.npc - 10, data.name, {
        fontFamily: 'Verdana, "Segoe UI", sans-serif',
        fontSize: '11px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setResolution(2)
      .setOrigin(0.5, 1)
      .setDepth(5);

    // Proximity indicator ring
    this.proximityRing = scene.add
      .circle(x, y, SIZES.npcRing, 0x000000, 0)
      .setStrokeStyle(1.5, 0xffdd88)
      .setAlpha(0)
      .setDepth(3);
  }

  get x(): number { return this.baseX; }
  get y(): number { return this.baseY; }

  /** NPC passeia por pontos aleatórios dentro do cômodo. */
  startWander(bounds: WanderBounds): void {
    this.wanderBounds = bounds;
    this.scheduleNextWander();
  }

  /** NPC está no meio de uma viagem entre salas? */
  get traveling(): boolean {
    return this.travelQueue.length > 0;
  }

  /**
   * Caminha por uma sequência de pontos (vãos de porta) até outra sala.
   * Ao chegar, passa a passear dentro de newBounds. Se o jogador
   * interromper no meio, a viagem continua de onde parou.
   */
  travelAlong(path: Array<{ x: number; y: number }>, newBounds: WanderBounds, onArrive?: () => void): void {
    this.wanderTimer?.destroy();
    this.wanderTimer = null;
    this.wanderTween?.stop();
    this.wanderTween = null;

    this.wanderBounds = newBounds;
    this.travelQueue = [...path];
    this.travelDone = onArrive ?? null;
    this.advanceTravel();
  }

  private advanceTravel(): void {
    const next = this.travelQueue[0];
    if (!next) {
      this.stopWalkAnim();
      this.syncParts();
      const done = this.travelDone;
      this.travelDone = null;
      done?.();
      this.scheduleNextWander();
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, next.x, next.y);
    this.sprite.setFlipX(next.x < this.sprite.x);
    this.startWalkAnim();

    this.wanderTween = this.scene.tweens.add({
      targets: this.sprite,
      x: next.x,
      y: next.y,
      duration: Math.max(80, (dist / WANDER_SPEED) * 1000),
      ease: 'Linear',
      onUpdate: () => this.syncParts(),
      onComplete: () => {
        this.travelQueue = this.travelQueue.slice(1);
        this.advanceTravel();
      },
    });
  }

  private scheduleNextWander(): void {
    this.wanderTimer = this.scene.time.delayedCall(
      1200 + Math.random() * 3000,
      () => this.moveToRandomPoint(),
    );
  }

  private moveToRandomPoint(): void {
    if (!this.wanderBounds) return;

    const b = this.wanderBounds;
    const tx = b.x + WANDER_MARGIN + Math.random() * (b.w - WANDER_MARGIN * 2);
    const ty = b.y + WANDER_MARGIN + Math.random() * (b.h - WANDER_MARGIN * 2);
    const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, tx, ty);

    this.sprite.setFlipX(tx < this.sprite.x);
    this.startWalkAnim();

    this.wanderTween = this.scene.tweens.add({
      targets: this.sprite,
      x: tx,
      y: ty,
      duration: (dist / WANDER_SPEED) * 1000,
      ease: 'Sine.easeInOut',
      onUpdate: () => this.syncParts(),
      onComplete: () => {
        this.stopWalkAnim();
        this.syncParts();
        this.scheduleNextWander();
      },
    });
  }

  private startWalkAnim(): void {
    this.stopWalkAnim();
    this.walkEvent = this.scene.time.addEvent({
      delay: 160,
      loop: true,
      callback: () => {
        this.walkStep = this.walkStep === 0 ? 1 : 0;
        this.sprite.setTexture(`npc-${this.data.id}-${2 + this.walkStep}`);
      },
    });
    this.sprite.setTexture(`npc-${this.data.id}-2`);
  }

  private stopWalkAnim(): void {
    if (!this.walkEvent) return;
    this.walkEvent.destroy();
    this.walkEvent = null;
    this.sprite.setTexture(`npc-${this.data.id}-0`);
  }

  /** Glow, nome e anel acompanham o corpo; posição de interação idem. */
  private syncParts(): void {
    this.baseX = this.sprite.x;
    this.baseY = this.sprite.y;
    this.glow.setPosition(this.sprite.x, this.sprite.y);
    this.shadow.setPosition(this.sprite.x, this.sprite.y + 12);
    this.label.setPosition(this.sprite.x, this.sprite.y - SIZES.npc - 10);
    this.proximityRing.setPosition(this.sprite.x, this.sprite.y);
  }

  setProximityVisible(visible: boolean): void {
    if (visible && !this.ringActive) {
      this.ringActive = true;
      this.pauseWander();
      this.proximityRing.setAlpha(0.55);
      this.scene.tweens.add({
        targets: this.proximityRing,
        alpha: 0.2,
        scale: 1.12,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else if (!visible && this.ringActive) {
      this.ringActive = false;
      this.resumeWander();
      this.scene.tweens.killTweensOf(this.proximityRing);
      this.proximityRing.setAlpha(0).setScale(1);
    }
  }

  /** Jogador por perto: o NPC para e dá atenção — sem fugir no meio da conversa. */
  private pauseWander(): void {
    this.wanderTimer?.destroy();
    this.wanderTimer = null;
    if (this.wanderTween) {
      this.wanderTween.stop();
      this.wanderTween = null;
      this.stopWalkAnim();
      this.syncParts();
    }
  }

  private resumeWander(): void {
    if (this.wanderTimer || this.wanderTween?.isPlaying()) return;
    if (this.traveling) {
      this.advanceTravel(); // retoma a viagem interrompida pela conversa
      return;
    }
    if (!this.wanderBounds) return;
    this.scheduleNextWander();
  }

  isNearPlayer(px: number, py: number): boolean {
    const dx = this.baseX - px;
    const dy = this.baseY - py;
    return Math.sqrt(dx * dx + dy * dy) <= INTERACT_RADIUS;
  }

  setVisible(visible: boolean): void {
    this.sprite.setVisible(visible);
    this.glow.setVisible(visible);
    this.shadow.setVisible(visible);
    this.label.setVisible(visible);
    this.proximityRing.setVisible(visible);
  }

  destroy(): void {
    this.idleEvent.destroy();
    this.walkEvent?.destroy();
    this.wanderTimer?.destroy();
    this.wanderTween?.destroy();
    this.scene.tweens.killTweensOf(this.proximityRing);
    this.scene.tweens.killTweensOf(this.sprite);
    this.scene.tweens.killTweensOf(this.glow);
    this.scene.tweens.killTweensOf(this.label);
    this.sprite.destroy();
    this.glow.destroy();
    this.shadow.destroy();
    this.label.destroy();
    this.proximityRing.destroy();
  }
}
