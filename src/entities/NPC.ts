import Phaser from 'phaser';
import { NPCData } from '../data/npcs';
import { SIZES } from '../design/constants';

const INTERACT_RADIUS = 40;

export class NPC {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly label: Phaser.GameObjects.Text;
  readonly data: NPCData;

  private glow: Phaser.GameObjects.Arc;
  private proximityRing: Phaser.GameObjects.Arc;
  private ringActive = false;
  private scene: Phaser.Scene;
  private baseX: number;
  private baseY: number;
  private idleEvent: Phaser.Time.TimerEvent;

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
      scale: 1.22,
      duration: 1400 + Math.random() * 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: Math.random() * 700,
    });

    // Main body — colored circle
    this.sprite = scene.add
      .sprite(x, y, `npc-${data.id}-0`)
      .setScale(1.35)
      .setDepth(5);

    this.idleEvent = scene.time.addEvent({
      delay: 420 + Math.random() * 260,
      loop: true,
      callback: () => {
        const nextFrame = this.sprite.texture.key.endsWith('-0') ? 1 : 0;
        this.sprite.setTexture(`npc-${this.data.id}-${nextFrame}`);
      },
    });

    // Name label above
    this.label = scene.add
      .text(x, y - SIZES.npc - 8, data.name, {
        fontSize: '9px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5, 1)
      .setDepth(5);

    scene.tweens.add({
      targets: [this.sprite, this.glow, this.label],
      y: { from: y - 2, to: y + 2 },
      duration: SIZES.npc * 90 + Math.random() * 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: Math.random() * 800,
    });

    // Proximity indicator ring — stays at base position
    this.proximityRing = scene.add
      .circle(x, y, SIZES.npcRing, 0x000000, 0)
      .setStrokeStyle(1.5, 0xffdd88)
      .setAlpha(0)
      .setDepth(3);
  }

  get x(): number { return this.baseX; }
  get y(): number { return this.baseY; }

  setProximityVisible(visible: boolean): void {
    if (visible && !this.ringActive) {
      this.ringActive = true;
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
      this.scene.tweens.killTweensOf(this.proximityRing);
      this.proximityRing.setAlpha(0).setScale(1);
    }
  }

  isNearPlayer(px: number, py: number): boolean {
    const dx = this.baseX - px;
    const dy = this.baseY - py;
    return Math.sqrt(dx * dx + dy * dy) <= INTERACT_RADIUS;
  }

  setVisible(visible: boolean): void {
    this.sprite.setVisible(visible);
    this.glow.setVisible(visible);
    this.label.setVisible(visible);
    this.proximityRing.setVisible(visible);
  }

  destroy(): void {
    this.idleEvent.destroy();
    this.scene.tweens.killTweensOf(this.proximityRing);
    this.scene.tweens.killTweensOf(this.sprite);
    this.scene.tweens.killTweensOf(this.glow);
    this.scene.tweens.killTweensOf(this.label);
    this.sprite.destroy();
    this.glow.destroy();
    this.label.destroy();
    this.proximityRing.destroy();
  }
}
