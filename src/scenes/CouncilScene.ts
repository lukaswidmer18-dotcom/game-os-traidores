import Phaser from 'phaser';
import { ensurePortraits, portraitKey } from '../assets/portraits';
import { VoteSystem } from '../systems/VoteSystem';
import { getRun, RunState } from '../systems/RunState';
import { FONT, PALETTE, SPECTACLE } from '../design/constants';
import { fadeIn, fadeOutTo, burst, spawnDust, candleFlicker } from '../design/effects';

export class CouncilScene extends Phaser.Scene {
  private run!: RunState;
  private voteSystem!: VoteSystem;

  constructor() {
    super({ key: 'CouncilScene' });
  }

  create(): void {
    this.run = getRun();
    this.voteSystem = new VoteSystem();
    ensurePortraits(this);

    const { width, height } = this.scale;
    const cx = width / 2;

    fadeIn(this);

    // Dark council atmosphere
    this.add.rectangle(cx, height / 2, width, height, PALETTE.bg.council);

    // Stronger red-tinted vignette for maximum tension
    const vig = this.add.graphics().setDepth(-2);
    vig.fillStyle(0x330000, 0.22);
    vig.fillRect(0, 0, 80, height);
    vig.fillRect(width - 80, 0, 80, height);
    vig.fillRect(0, 0, width, 50);
    vig.fillRect(0, height - 50, width, 50);

    // Candle flickers in all four corners + two mid-sides for maximum atmosphere
    candleFlicker(this, 35, 35);
    candleFlicker(this, width - 35, 35);
    candleFlicker(this, 35, height - 35);
    candleFlicker(this, width - 35, height - 35);
    candleFlicker(this, cx, 30);

    // Subtle dust
    spawnDust(this, width, height, 10);

    // Council table — oval silhouette with pulsing heartbeat
    this.add.ellipse(cx, height * 0.55, 360, 100, 0x110008, 0.7).setDepth(-1);
    this.add.graphics()
      .lineStyle(1, 0x661122, 0.5)
      .strokeEllipse(cx, height * 0.55, 360, 100)
      .setDepth(-1);

    // Heartbeat glow on the table — rhythmic danger pulse
    const tableGlow = this.add
      .ellipse(cx, height * 0.55, 370, 110, PALETTE.room.council, 0.04)
      .setDepth(-1);
    this.tweens.add({
      targets: tableGlow,
      alpha: 0.11,
      scaleX: 1.06,
      scaleY: 1.08,
      duration: 750,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Ambient floor glow under the table
    const floorGlow = this.add
      .ellipse(cx, height * 0.62, 280, 60, 0x880000, 0.05)
      .setDepth(-3);
    this.tweens.add({
      targets: floorGlow,
      alpha: 0.1,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Title — fade in from above
    const titleObj = this.add
      .text(cx, 28, `Mesa do Conselho — Dia ${this.run.day}`, {
        fontFamily: FONT.family,
        fontSize: '22px',
        color: PALETTE.text.title,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setResolution(FONT.resolution)
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({ targets: titleObj, alpha: 1, duration: 400, ease: 'Quad.easeOut' });

    const sub = this.add
      .text(cx, 58, 'Em quem você vota?', {
        fontFamily: FONT.family,
        fontSize: '14px',
        color: PALETTE.text.secondary,
      })
      .setResolution(FONT.resolution)
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({ targets: sub, alpha: 1, duration: 400, delay: 150 });

    // Clue summary
    const clues = this.run.clueSystem.getCollected();
    if (clues.length > 0) {
      const clueText = clues.map((c) => `• ${c.description.slice(0, 60)}…`).join('\n');
      const clueObj = this.add
        .text(cx, 84, 'Suas pistas:\n' + clueText, {
          fontFamily: FONT.family,
          fontSize: '11px',
          color: '#9aabbc',
          lineSpacing: 4,
          wordWrap: { width: width * 0.82 },
          align: 'center',
        })
        .setResolution(FONT.resolution)
        .setOrigin(0.5, 0)
        .setAlpha(0);

      this.tweens.add({ targets: clueObj, alpha: 1, duration: 400, delay: 250 });
    }

    // Vote buttons
    const btnY = 216;
    const aliveNPCs = this.run.aliveNPCs;
    const cols = Math.min(3, aliveNPCs.length);
    const btnW = 150;
    const btnH = 62;
    const gapX = 170;
    const startX = cx - ((cols - 1) * gapX) / 2;

    aliveNPCs.forEach((npc, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * gapX;
      const y = btnY + row * 82;

      const suspicion = this.run.trustSystem.getSuspicion(npc.id);
      const suspBar = suspicion > 50 ? '★★★' : suspicion > 25 ? '★★☆' : '★☆☆';
      const suspColor = suspicion > 50 ? '#ff6666' : suspicion > 25 ? '#ffaa55' : '#cc8888';

      // Button background
      const btn = this.add
        .rectangle(x, y, btnW, btnH, 0x14102a)
        .setStrokeStyle(1, 0x553366)
        .setInteractive({ useHandCursor: true })
        .setAlpha(0);

      this.tweens.add({ targets: btn, alpha: 1, duration: 300, delay: 300 + i * 60 });

      const portraitFrame = this.add
        .rectangle(x - 52, y, 42, 53, 0x0d0a1e)
        .setStrokeStyle(1, 0x8a6d2f)
        .setAlpha(0);
      const portrait = this.add
        .image(x - 52, y, portraitKey(npc.id))
        .setScale(1.6)
        .setAlpha(0);

      const nameText = this.add
        .text(x + 8, y - 12, npc.name, {
          fontFamily: FONT.family,
          fontSize: '14px',
          color: PALETTE.text.primary,
          fontStyle: 'bold',
        })
        .setResolution(FONT.resolution)
        .setOrigin(0.5)
        .setAlpha(0);

      const suspText = this.add
        .text(x + 8, y + 10, `Suspeita: ${suspBar}`, {
          fontFamily: FONT.family,
          fontSize: '11px',
          color: suspColor,
        })
        .setResolution(FONT.resolution)
        .setOrigin(0.5)
        .setAlpha(0);

      const parts = [portraitFrame, portrait, nameText, suspText];
      this.tweens.add({ targets: parts, alpha: 1, duration: 300, delay: 300 + i * 60 });

      btn.on('pointerover', () => {
        btn.setFillStyle(0x2a1840);
        btn.setStrokeStyle(2, 0xcc55ee);
        this.tweens.add({ targets: [btn, ...parts], scaleX: 1.05, scaleY: 1.05, duration: 80 });
      });
      btn.on('pointerout', () => {
        btn.setFillStyle(0x14102a);
        btn.setStrokeStyle(1, 0x553366);
        this.tweens.add({ targets: [btn, ...parts], scaleX: 1, scaleY: 1, duration: 80 });
      });
      btn.on('pointerdown', () => {
        this.tweens.add({ targets: [btn, ...parts], scaleX: 0.95, scaleY: 0.95, duration: 60 });
        this.cameras.main.shake(SPECTACLE.shakeDuration, SPECTACLE.shakeIntensity * 1.5);
        burst(this, x, y, SPECTACLE.burstCount, PALETTE.particle.vote);
        // Second burst for drama
        this.time.delayedCall(80, () => burst(this, x, y, 8, 0xff6666));
        this.time.delayedCall(180, () => this.castVote(npc.id));
      });
    });

    const footerText = this.add
      .text(cx, height - 18, 'Clique em um nome para votar', {
        fontFamily: FONT.family,
        fontSize: '12px',
        color: PALETTE.text.secondary,
      })
      .setResolution(FONT.resolution)
      .setOrigin(0.5, 1)
      .setAlpha(0);

    this.tweens.add({ targets: footerText, alpha: 1, duration: 400, delay: 500 });
  }

  private castVote(targetId: string): void {
    const aliveNPCs = this.run.aliveNPCs;
    const result = this.voteSystem.computeVotes(
      targetId,
      aliveNPCs,
      this.run.trustSystem,
      this.run.allies,
    );

    const eliminated = aliveNPCs.find((n) => n.id === result.eliminatedId)!;
    const newAlive = aliveNPCs.filter((n) => n.id !== result.eliminatedId);
    this.run.aliveNPCs = newAlive;
    this.run.allies.delete(eliminated.id);
    this.run.logEvent(
      `${eliminated.name} foi eliminado(a) pelo Conselho — era ${
        eliminated.role === 'traitor' ? 'Traidor' : 'Fiel'
      }.`,
    );

    const votesSummary = [...result.voteCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, count]) => {
        const npc = aliveNPCs.find((n) => n.id === id);
        return `${npc?.name ?? id}: ${count}`;
      })
      .join('   ');

    const remainingTraitors = newAlive.filter((n) => n.role === 'traitor').length;
    const remainingFaithful = newAlive.filter((n) => n.role === 'faithful').length;

    if (remainingTraitors === 0) {
      fadeOutTo(this, 'GameOverScene', {
        outcome: 'victory',
        message: `${eliminated.name} era um Traidor! Todos os Traidores foram descobertos. Vitória!`,
      });
      return;
    }

    if (remainingTraitors >= remainingFaithful) {
      fadeOutTo(this, 'GameOverScene', {
        outcome: 'defeat',
        message: `${eliminated.name} era um(a) ${eliminated.role === 'traitor' ? 'Traidor' : 'Fiel'}. Os Traidores dominam. Derrota!`,
      });
      return;
    }

    fadeOutTo(this, 'NightScene', {
      eliminatedId: eliminated.id,
      eliminatedName: eliminated.name,
      wasTraitor: result.wasTraitor,
      votesSummary,
    });
  }
}
