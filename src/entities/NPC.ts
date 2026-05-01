import Phaser from 'phaser';
import { NPCData } from '../data/npcs';
import { SIZES } from '../design/constants';

const INTERACT_RADIUS = 40;

export class NPC {
  readonly sprite: Phaser.GameObjects.Rectangle;
  readonly label: Phaser.GameObjects.Text;
  readonly data: NPCData;

  private proximityRing: Phaser.GameObjects.Arc;
  private ringActive = false;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, x: number, y: number, data: NPCData) {
    this.data = data;
    this.scene = scene;

    this.sprite = scene.add.rectangle(x, y, SIZES.npc, SIZES.npc, data.color).setDepth(4);
    scene.physics.add.existing(this.sprite, true);

    this.label = scene.add
      .text(x, y - SIZES.npc - 4, data.name, {
        fontSize: '9px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5, 1)
      .setDepth(5);

    // Proximity indicator ring — starts invisible
    this.proximityRing = scene.add
      .circle(x, y, SIZES.npcRing, 0x000000, 0)
      .setStrokeStyle(1.5, 0xffdd88)
      .setAlpha(0)
      .setDepth(3);
  }

  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }

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
    const dx = this.x - px;
    const dy = this.y - py;
    return Math.sqrt(dx * dx + dy * dy) <= INTERACT_RADIUS;
  }

  setVisible(visible: boolean): void {
    this.sprite.setVisible(visible);
    this.label.setVisible(visible);
    this.proximityRing.setVisible(visible);
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.proximityRing);
    this.sprite.destroy();
    this.label.destroy();
    this.proximityRing.destroy();
  }
}
