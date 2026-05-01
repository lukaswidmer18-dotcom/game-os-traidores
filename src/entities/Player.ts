import Phaser from 'phaser';
import { SIZES } from '../design/constants';

const SPEED = 120;
const PLAYER_COLOR = 0xffffff;

export class Player {
  readonly sprite: Phaser.GameObjects.Rectangle;
  private glow: Phaser.GameObjects.Arc;
  private aura: Phaser.GameObjects.Arc;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Soft white glow behind the player
    this.glow = scene.add
      .circle(x, y, SIZES.playerGlow, 0xffffff, 0.06)
      .setDepth(2);
    scene.tweens.add({
      targets: this.glow,
      alpha: 0.14,
      scale: 1.3,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Main sprite — rectangle kept for physics consistency
    this.sprite = scene.add
      .rectangle(x, y, SIZES.player, SIZES.player, PLAYER_COLOR)
      .setDepth(5);
    scene.physics.add.existing(this.sprite);

    // Expanding aura ring — "sonar pulse" to show player position
    this.aura = scene.add
      .circle(x, y, SIZES.player + 4, 0x000000, 0)
      .setStrokeStyle(1.5, 0xaaaaff)
      .setAlpha(0.7)
      .setDepth(4);
    scene.tweens.add({
      targets: this.aura,
      scale: 2.2,
      alpha: 0,
      duration: 1400,
      repeat: -1,
      ease: 'Quad.easeOut',
    });

    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.wasd = {
      up: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }

  update(): void {
    const vx =
      this.cursors.left.isDown || this.wasd.left.isDown
        ? -SPEED
        : this.cursors.right.isDown || this.wasd.right.isDown
          ? SPEED
          : 0;

    const vy =
      this.cursors.up.isDown || this.wasd.up.isDown
        ? -SPEED
        : this.cursors.down.isDown || this.wasd.down.isDown
          ? SPEED
          : 0;

    this.body.setVelocity(vx, vy);

    // Keep visual effects centered on the sprite
    this.glow.setPosition(this.sprite.x, this.sprite.y);
    this.aura.setPosition(this.sprite.x, this.sprite.y);
  }

  freeze(): void {
    this.body.setVelocity(0, 0);
  }
}
