import Phaser from 'phaser';
import { NPCData } from '../data/npcs';
import { Clue } from '../data/clues';
import { VoteSystem } from '../systems/VoteSystem';
import { TrustSystem } from '../systems/TrustSystem';
import { PALETTE, SPECTACLE } from '../design/constants';
import { fadeIn, fadeOutTo, burst, spawnDust, candleFlicker } from '../design/effects';

export class CouncilScene extends Phaser.Scene {
  private day: number = 1;
  private aliveNPCs: NPCData[] = [];
  private clues: Clue[] = [];
  private trustSystem!: TrustSystem;
  private voteSystem!: VoteSystem;

  constructor() {
    super({ key: 'CouncilScene' });
  }

  init(data: {
    day: number;
    aliveNPCs: NPCData[];
    clues: Clue[];
    trustSystem: TrustSystem;
  }): void {
    this.day = data.day;
    this.aliveNPCs = data.aliveNPCs.map((n) => ({ ...n }));
    this.clues = data.clues;
    this.trustSystem = data.trustSystem;
    this.voteSystem = new VoteSystem();
  }

  create(): void {
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
      .text(cx, 28, `Mesa do Conselho — Dia ${this.day}`, {
        fontSize: '18px',
        color: PALETTE.text.title,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({ targets: titleObj, alpha: 1, duration: 400, ease: 'Quad.easeOut' });

    const sub = this.add
      .text(cx, 56, 'Em quem você vota?', {
        fontSize: '12px',
        color: PALETTE.text.secondary,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({ targets: sub, alpha: 1, duration: 400, delay: 150 });

    // Clue summary
    if (this.clues.length > 0) {
      const clueText = this.clues.map((c) => `• ${c.description.slice(0, 60)}…`).join('\n');
      const clueObj = this.add
        .text(cx, 82, 'Suas pistas:\n' + clueText, {
          fontSize: '9px',
          color: '#8899aa',
          wordWrap: { width: width * 0.8 },
          align: 'center',
        })
        .setOrigin(0.5, 0)
        .setAlpha(0);

      this.tweens.add({ targets: clueObj, alpha: 1, duration: 400, delay: 250 });
    }

    // Vote buttons
    const btnY = 210;
    const cols = Math.min(3, this.aliveNPCs.length);
    const btnW = 140;
    const btnH = 52;
    const gapX = 162;
    const startX = cx - ((cols - 1) * gapX) / 2;

    this.aliveNPCs.forEach((npc, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * gapX;
      const y = btnY + row * 76;

      const suspicion = this.trustSystem.getSuspicion(npc.id);
      const suspBar = suspicion > 50 ? '★★★' : suspicion > 25 ? '★★☆' : '★☆☆';
      const suspColor = suspicion > 50 ? '#ff6666' : suspicion > 25 ? '#ffaa55' : '#cc8888';

      // Button background
      const btn = this.add
        .rectangle(x, y, btnW, btnH, 0x14102a)
        .setStrokeStyle(1, 0x553366)
        .setInteractive({ useHandCursor: true })
        .setAlpha(0);

      this.tweens.add({ targets: btn, alpha: 1, duration: 300, delay: 300 + i * 60 });

      const nameText = this.add
        .text(x, y - 12, npc.name, {
          fontSize: '12px',
          color: PALETTE.text.primary,
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setAlpha(0);

      const suspText = this.add
        .text(x, y + 8, `Suspeita: ${suspBar}`, {
          fontSize: '9px',
          color: suspColor,
        })
        .setOrigin(0.5)
        .setAlpha(0);

      this.tweens.add({ targets: [nameText, suspText], alpha: 1, duration: 300, delay: 300 + i * 60 });

      btn.on('pointerover', () => {
        btn.setFillStyle(0x2a1840);
        btn.setStrokeStyle(2, 0xcc55ee);
        this.tweens.add({ targets: [btn, nameText, suspText], scaleX: 1.05, scaleY: 1.05, duration: 80 });
      });
      btn.on('pointerout', () => {
        btn.setFillStyle(0x14102a);
        btn.setStrokeStyle(1, 0x553366);
        this.tweens.add({ targets: [btn, nameText, suspText], scaleX: 1, scaleY: 1, duration: 80 });
      });
      btn.on('pointerdown', () => {
        this.tweens.add({ targets: [btn, nameText, suspText], scaleX: 0.95, scaleY: 0.95, duration: 60 });
        this.cameras.main.shake(SPECTACLE.shakeDuration, SPECTACLE.shakeIntensity * 1.5);
        burst(this, x, y, SPECTACLE.burstCount, PALETTE.particle.vote);
        // Second burst for drama
        this.time.delayedCall(80, () => burst(this, x, y, 8, 0xff6666));
        this.time.delayedCall(180, () => this.castVote(npc.id));
      });
    });

    const footerText = this.add
      .text(cx, height - 18, 'Clique em um nome para votar', {
        fontSize: '9px',
        color: PALETTE.text.hint,
      })
      .setOrigin(0.5, 1)
      .setAlpha(0);

    this.tweens.add({ targets: footerText, alpha: 1, duration: 400, delay: 500 });
  }

  private castVote(targetId: string): void {
    const result = this.voteSystem.computeVotes(targetId, this.aliveNPCs, this.trustSystem);

    const newAlive = this.aliveNPCs.filter((n) => n.id !== result.eliminatedId);

    const remainingTraitors = newAlive.filter((n) => n.role === 'traitor').length;
    const remainingFaithful = newAlive.filter((n) => n.role === 'faithful').length;

    const eliminated = this.aliveNPCs.find((n) => n.id === result.eliminatedId)!;

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

    const wasTraitor = result.wasTraitor;
    fadeOutTo(this, 'NightScene', {
      day: this.day,
      aliveNPCs: newAlive,
      clues: this.clues,
      trustSystem: this.trustSystem,
      eliminatedName: eliminated.name,
      wasTraitor,
    });
  }
}
