import Phaser from 'phaser';
import { SIZES } from '../design/constants';

const SPEED = 120;
type Facing = 'down' | 'up' | 'left' | 'right';

export class Player {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private glow: Phaser.GameObjects.Arc;
  private aura: Phaser.GameObjects.Arc;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private facing: Facing = 'down';
  private walkFrame = 0;
  private walkElapsed = 0;

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
    this.sprite = scene.physics.add
      .sprite(x, y, 'player-down-0')
      .setDepth(5)
      .setScale(1.45);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(12, 16);
    this.sprite.setCollideWorldBounds(true);

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

  update(delta: number): void {
    let vx =
      this.cursors.left.isDown || this.wasd.left.isDown
        ? -SPEED
        : this.cursors.right.isDown || this.wasd.right.isDown
          ? SPEED
          : 0;

    let vy =
      this.cursors.up.isDown || this.wasd.up.isDown
        ? -SPEED
        : this.cursors.down.isDown || this.wasd.down.isDown
          ? SPEED
          : 0;

    if (vx !== 0 && vy !== 0) {
      vx *= Math.SQRT1_2;
      vy *= Math.SQRT1_2;
    }

    this.updateFacing(vx, vy);
    this.body.setVelocity(vx, vy);
    this.updateTexture(delta, vx !== 0 || vy !== 0);

    // Keep visual effects centered on the sprite
    this.glow.setPosition(this.sprite.x, this.sprite.y);
    this.aura.setPosition(this.sprite.x, this.sprite.y);
  }

  freeze(): void {
    this.body.setVelocity(0, 0);
    this.walkFrame = 0;
    this.walkElapsed = 0;
    this.sprite.setTexture(`player-${this.facing}-0`);
  }

  private updateFacing(vx: number, vy: number): void {
    if (Math.abs(vx) > Math.abs(vy)) {
      if (vx < 0) this.facing = 'left';
      if (vx > 0) this.facing = 'right';
      return;
    }

    if (vy < 0) this.facing = 'up';
    if (vy > 0) this.facing = 'down';
  }

  private updateTexture(delta: number, moving: boolean): void {
    if (!moving) {
      this.walkFrame = 0;
      this.walkElapsed = 0;
      this.sprite.setTexture(`player-${this.facing}-0`);
      return;
    }

    this.walkElapsed += delta;
    if (this.walkElapsed >= 170) {
      this.walkElapsed = 0;
      this.walkFrame = this.walkFrame === 0 ? 1 : 0;
    }

    this.sprite.setTexture(`player-${this.facing}-${this.walkFrame}`);
  }
}
