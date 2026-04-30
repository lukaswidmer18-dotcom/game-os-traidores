import Phaser from 'phaser';

const SPEED = 120;
const PLAYER_SIZE = 14;
const PLAYER_COLOR = 0xffffff;

export class Player {
  readonly sprite: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.add.rectangle(x, y, PLAYER_SIZE, PLAYER_SIZE, PLAYER_COLOR);
    scene.physics.add.existing(this.sprite);

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
  }

  freeze(): void {
    this.body.setVelocity(0, 0);
  }
}
