import Phaser from 'phaser';
import { PALETTE, TIMING, SPECTACLE } from './constants';

export function fadeIn(scene: Phaser.Scene): void {
  scene.cameras.main.fadeIn(TIMING.fadeIn, 0, 0, 0);
}

export function flash(scene: Phaser.Scene): void {
  scene.cameras.main.flash(TIMING.flash, 255, 255, 255, false);
}

export function fadeOutTo(
  scene: Phaser.Scene,
  nextKey: string,
  data?: object,
): void {
  scene.cameras.main.fadeOut(TIMING.fadeOut, 0, 0, 0);
  scene.cameras.main.once('camerafadeoutcomplete', () => {
    scene.scene.start(nextKey, data);
  });
}

export function burst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  count: number,
  color: number,
): void {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 50 + Math.random() * 70;
    const r = 2 + Math.random() * 2;
    const p = scene.add.circle(x, y, r, color, 1).setDepth(200);
    scene.tweens.add({
      targets: p,
      x: x + Math.cos(angle) * speed,
      y: y + Math.sin(angle) * speed,
      alpha: 0,
      scale: 0.1,
      duration: TIMING.particleBurst + Math.random() * 150,
      ease: 'Quad.easeOut',
      onComplete: () => p.destroy(),
    });
  }
}

function spawnOneDust(scene: Phaser.Scene, w: number, h: number): void {
  const x = Math.random() * w;
  const y = h * 0.1 + Math.random() * h * 0.8;
  const dx = (Math.random() - 0.5) * 50;
  const dy = -(30 + Math.random() * 40);
  const size = Math.random() < 0.5 ? 1 : 1.5;
  const dur = 5000 + Math.random() * 4000;
  const delay = Math.random() * 4000;

  const p = scene.add.circle(x, y, size, PALETTE.particle.dust, 0).setDepth(3);
  scene.tweens.add({
    targets: p,
    alpha: 0.07 + Math.random() * 0.1,
    x: x + dx,
    y: y + dy,
    duration: dur,
    delay,
    ease: 'Sine.easeIn',
    onComplete: () => {
      scene.tweens.add({
        targets: p,
        alpha: 0,
        duration: 600,
        onComplete: () => {
          p.destroy();
          spawnOneDust(scene, w, h);
        },
      });
    },
  });
}

export function spawnDust(
  scene: Phaser.Scene,
  w: number,
  h: number,
  count = 18,
): void {
  for (let i = 0; i < count; i++) {
    spawnOneDust(scene, w, h);
  }
}

export function candleFlicker(
  scene: Phaser.Scene,
  x: number,
  y: number,
): void {
  const g = scene.add.circle(x, y, 50, PALETTE.atmosphere.candle, 0.05).setDepth(0);
  scene.tweens.add({
    targets: g,
    alpha: 0.09,
    scale: 1.1,
    duration: 650 + Math.random() * 350,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
}

export function hoverBtn(
  scene: Phaser.Scene,
  btn: Phaser.GameObjects.Text,
  normal: string,
): void {
  btn.on('pointerover', () => {
    btn.setColor('#ffffff');
    scene.tweens.add({ targets: btn, scaleX: 1.05, scaleY: 1.05, duration: TIMING.btnHover });
  });
  btn.on('pointerout', () => {
    btn.setColor(normal);
    scene.tweens.add({ targets: btn, scaleX: 1, scaleY: 1, duration: TIMING.btnHover });
  });
  btn.on('pointerdown', () => {
    scene.tweens.add({ targets: btn, scaleX: 0.95, scaleY: 0.95, duration: TIMING.btnPress });
  });
}

export function drawStars(
  scene: Phaser.Scene,
  w: number,
  h: number,
  count = 90,
): void {
  const g = scene.add.graphics().setDepth(-5);
  g.fillStyle(PALETTE.atmosphere.star, 1);
  for (let i = 0; i < count; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h * 0.7;
    const s = Math.random() < 0.75 ? 1 : 1.5;
    g.fillRect(x, y, s, s);
  }
}

export function slamIn(
  scene: Phaser.Scene,
  obj: Phaser.GameObjects.Text,
  targetY: number,
  delay = 0,
): void {
  obj.y = -80;
  scene.tweens.add({
    targets: obj,
    y: targetY,
    duration: 450,
    delay,
    ease: 'Bounce.easeOut',
    onComplete: () => {
      scene.cameras.main.shake(SPECTACLE.shakeDuration, SPECTACLE.shakeIntensity);
    },
  });
}

export function mansionGrid(
  scene: Phaser.Scene,
  w: number,
  h: number,
): void {
  const g = scene.add.graphics().setDepth(-8);
  g.lineStyle(1, 0x1a1530, 0.35);
  for (let y = 0; y < h; y += 28) g.lineBetween(0, y, w, y);
  for (let x = 0; x < w; x += 28) g.lineBetween(x, 0, x, h);
}
