import Phaser from 'phaser';
import { NPCData } from '../data/npcs';
import { Clue } from '../data/clues';
import { TrustSystem } from '../systems/TrustSystem';
import { STORY_DAYS } from '../data/storyDays';
import { PALETTE } from '../design/constants';
import { fadeIn, fadeOutTo, drawTwinStars, fogRise, hoverBtn } from '../design/effects';

export class NightScene extends Phaser.Scene {
  private day: number = 1;
  private aliveNPCs: NPCData[] = [];
  private trustSystem!: TrustSystem;
  private eliminatedName: string = '';
  private wasTraitor: boolean = false;

  constructor() {
    super({ key: 'NightScene' });
  }

  init(data: {
    day: number;
    aliveNPCs: NPCData[];
    clues: Clue[];
    trustSystem: TrustSystem;
    eliminatedName: string;
    wasTraitor: boolean;
  }): void {
    this.day = data.day;
    this.aliveNPCs = data.aliveNPCs.map((n) => ({ ...n }));
    this.trustSystem = data.trustSystem;
    this.eliminatedName = data.eliminatedName;
    this.wasTraitor = data.wasTraitor;
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    fadeIn(this);

    // Deep night background
    this.add.rectangle(cx, height / 2, width, height, PALETTE.bg.night);

    // Twinkling stars — more atmospheric than static
    drawTwinStars(this, width, height, 110);

    // Moon with stronger glow
    const moon = this.add
      .circle(width * 0.85, height * 0.12, 28, PALETTE.atmosphere.moon, 0.92)
      .setDepth(-4);
    const moonGlow1 = this.add
      .circle(width * 0.85, height * 0.12, 48, PALETTE.atmosphere.moon, 0.07)
      .setDepth(-5);
    const moonGlow2 = this.add
      .circle(width * 0.85, height * 0.12, 70, PALETTE.atmosphere.moon, 0.03)
      .setDepth(-6);

    this.tweens.add({
      targets: [moon, moonGlow1, moonGlow2],
      alpha: { from: 0.92, to: 0.65 },
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Fog rising from the ground
    fogRise(this, width, height);

    // Council result title
    const resultTitle = this.add
      .text(cx, height * 0.18, 'Resultado do Conselho', {
        fontSize: '16px',
        color: PALETTE.text.title,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({ targets: resultTitle, alpha: 1, duration: 500, delay: 100 });

    // Council result message
    const councilColor = this.wasTraitor ? PALETTE.text.success : '#ff8888';
    const councilMsg = this.wasTraitor
      ? `${this.eliminatedName} era um Traidor! Bom trabalho.`
      : `${this.eliminatedName} era inocente... O grupo errou.`;

    const councilText = this.add
      .text(cx, height * 0.29, councilMsg, {
        fontSize: '13px',
        color: councilColor,
        wordWrap: { width: width * 0.72 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({ targets: councilText, alpha: 1, duration: 500, delay: 350 });

    // Divider
    const divider = this.add.graphics().setAlpha(0).setDepth(1);
    divider.lineStyle(1, 0x333355, 0.7);
    divider.lineBetween(cx - 150, height * 0.41, cx + 150, height * 0.41);
    this.tweens.add({ targets: divider, alpha: 1, duration: 400, delay: 600 });

    // Night passage label
    const nightResult = this.resolveNight();

    const nightLabel = this.add
      .text(cx, height * 0.47, '— A noite cai —', {
        fontSize: '13px',
        color: '#555577',
        fontStyle: 'italic',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({ targets: nightLabel, alpha: 1, duration: 500, delay: 700 });

    // Night elimination message
    const nightMsg = this.add
      .text(cx, height * 0.57, nightResult.message, {
        fontSize: '12px',
        color: '#ff7777',
        wordWrap: { width: width * 0.72 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({ targets: nightMsg, alpha: 1, duration: 500, delay: 950 });

    // Check defeat: player eliminated
    if (nightResult.playerEliminated) {
      this.time.delayedCall(3200, () => {
        fadeOutTo(this, 'GameOverScene', {
          outcome: 'defeat',
          message: 'Os Traidores eliminaram você durante a noite. Fim de jogo.',
        });
      });
      return;
    }

    // Check final day
    const nextDay = this.day + 1;
    if (nextDay > 3) {
      const traitors = nightResult.newAlive.filter((n) => n.role === 'traitor').length;
      if (traitors > 0) {
        this.time.delayedCall(3200, () => {
          fadeOutTo(this, 'GameOverScene', {
            outcome: 'defeat',
            message: 'O tempo acabou. Os Traidores venceram.',
          });
        });
      } else {
        this.time.delayedCall(3200, () => {
          fadeOutTo(this, 'GameOverScene', {
            outcome: 'victory',
            message: 'Todos os Traidores foram eliminados. Vitória!',
          });
        });
      }
      return;
    }

    // Next day preview
    const nextStory = STORY_DAYS[nextDay - 1];
    const nextTitle = this.add
      .text(cx, height * 0.76, nextStory.title, {
        fontSize: '14px',
        color: '#9999ff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({ targets: nextTitle, alpha: 1, duration: 400, delay: 1300 });

    const continueBtn = this.add
      .text(cx, height * 0.87, '[ PRÓXIMO DIA → ]', {
        fontSize: '14px',
        color: PALETTE.text.golden,
        stroke: '#000000',
        strokeThickness: 2,
        backgroundColor: '#0d0a1e',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setInteractive({ useHandCursor: true });

    this.tweens.add({ targets: continueBtn, alpha: 1, duration: 400, delay: 1600 });
    hoverBtn(this, continueBtn, PALETTE.text.golden);

    continueBtn.on('pointerdown', () => {
      fadeOutTo(this, 'GameScene', {
        day: nextDay,
        aliveNPCs: nightResult.newAlive,
      });
    });
  }

  private resolveNight(): {
    message: string;
    playerEliminated: boolean;
    newAlive: NPCData[];
  } {
    const faithful = this.aliveNPCs.filter((n) => n.role === 'faithful');
    const traitors = this.aliveNPCs.filter((n) => n.role === 'traitor');

    if (traitors.length === 0 || faithful.length === 0) {
      return { message: 'A noite passou em silêncio.', playerEliminated: false, newAlive: [...this.aliveNPCs] };
    }

    let target = faithful[0];
    let highestSusp = -1;
    for (const f of faithful) {
      const s = this.trustSystem.getSuspicion(f.id);
      if (s > highestSusp) {
        highestSusp = s;
        target = f;
      }
    }

    const newAlive = this.aliveNPCs.filter((n) => n.id !== target.id);
    const msg = `${target.name} foi eliminado(a) pelos Traidores durante a noite.`;

    return { message: msg, playerEliminated: false, newAlive };
  }
}
