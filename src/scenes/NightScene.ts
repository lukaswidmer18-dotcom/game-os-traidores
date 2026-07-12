import Phaser from 'phaser';
import { ensurePortraits, portraitKey } from '../assets/portraits';
import { generateCrimeClue } from '../data/clues';
import { NPCData } from '../data/npcs';
import { STORY_DAYS } from '../data/storyDays';
import { getRun, RunState } from '../systems/RunState';
import { FONT, PALETTE } from '../design/constants';
import { fadeIn, fadeOutTo, drawTwinStars, fogRise, hoverBtn } from '../design/effects';

const MAX_DAYS = 3;

export class NightScene extends Phaser.Scene {
  private run!: RunState;
  private eliminatedId = '';
  private eliminatedName = '';
  private wasTraitor = false;
  private votesSummary = '';

  constructor() {
    super({ key: 'NightScene' });
  }

  init(data: {
    eliminatedId?: string;
    eliminatedName: string;
    wasTraitor: boolean;
    votesSummary?: string;
  }): void {
    this.eliminatedId = data.eliminatedId ?? '';
    this.eliminatedName = data.eliminatedName;
    this.wasTraitor = data.wasTraitor;
    this.votesSummary = data.votesSummary ?? '';
  }

  create(): void {
    this.run = getRun();

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
      .text(cx, height * 0.14, 'Resultado do Conselho', {
        fontFamily: FONT.family,
        fontSize: '20px',
        color: PALETTE.text.title,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setResolution(FONT.resolution)
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({ targets: resultTitle, alpha: 1, duration: 500, delay: 100 });

    // Vote breakdown
    if (this.votesSummary) {
      const votesText = this.add
        .text(cx, height * 0.21, `Votos — ${this.votesSummary}`, {
          fontFamily: FONT.family,
          fontSize: '12px',
          color: '#a8aed6',
          wordWrap: { width: width * 0.8 },
          align: 'center',
        })
        .setResolution(FONT.resolution)
        .setOrigin(0.5)
        .setAlpha(0);
      this.tweens.add({ targets: votesText, alpha: 1, duration: 500, delay: 250 });
    }

    // Council result message
    const councilColor = this.wasTraitor ? PALETTE.text.success : '#ff8888';
    const councilMsg = this.wasTraitor
      ? `${this.eliminatedName} era um Traidor! Bom trabalho.`
      : `${this.eliminatedName} era inocente... O grupo errou.`;

    const councilText = this.add
      .text(cx, height * 0.27, councilMsg, {
        fontFamily: FONT.family,
        fontSize: '16px',
        color: councilColor,
        wordWrap: { width: width * 0.72 },
        align: 'center',
      })
      .setResolution(FONT.resolution)
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({ targets: councilText, alpha: 1, duration: 500, delay: 350 });

    // Retrato fúnebre do eliminado
    if (this.eliminatedId) {
      ensurePortraits(this);
      const frame = this.add
        .rectangle(cx, height * 0.35, 46, 57, 0x0d0a1e)
        .setStrokeStyle(1, this.wasTraitor ? 0x8a6d2f : 0x662222)
        .setAlpha(0);
      const portrait = this.add
        .image(cx, height * 0.35, portraitKey(this.eliminatedId))
        .setScale(1.7)
        .setTint(this.wasTraitor ? 0xffffff : 0xaa7777)
        .setAlpha(0);
      this.tweens.add({ targets: [frame, portrait], alpha: 0.9, duration: 500, delay: 450 });
    }

    // Divider
    const divider = this.add.graphics().setAlpha(0).setDepth(1);
    divider.lineStyle(1, 0x333355, 0.7);
    divider.lineBetween(cx - 150, height * 0.41, cx + 150, height * 0.41);
    this.tweens.add({ targets: divider, alpha: 1, duration: 400, delay: 600 });

    // Night passage label
    const nightResult = this.resolveNight();

    const nightLabel = this.add
      .text(cx, height * 0.47, '— A noite cai —', {
        fontFamily: FONT.family,
        fontSize: '15px',
        color: '#6a6a92',
        fontStyle: 'italic',
      })
      .setResolution(FONT.resolution)
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({ targets: nightLabel, alpha: 1, duration: 500, delay: 700 });

    // Night elimination message
    const nightMsg = this.add
      .text(cx, height * 0.57, nightResult.message, {
        fontFamily: FONT.family,
        fontSize: '14px',
        color: '#ff8888',
        wordWrap: { width: width * 0.72 },
        align: 'center',
      })
      .setResolution(FONT.resolution)
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({ targets: nightMsg, alpha: 1, duration: 500, delay: 950 });

    // Check defeat: player eliminated
    if (nightResult.playerEliminated) {
      this.time.delayedCall(3200, () => {
        fadeOutTo(this, 'GameOverScene', {
          outcome: 'defeat',
          message:
            'Voce fez perguntas demais as pessoas erradas. Os Traidores eliminaram voce durante a noite.',
        });
      });
      return;
    }

    this.run.aliveNPCs = nightResult.newAlive;

    // Check final day
    const nextDay = this.run.day + 1;
    if (nextDay > MAX_DAYS) {
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
        fontFamily: FONT.family,
        fontSize: '16px',
        color: '#9999ff',
        fontStyle: 'bold',
      })
      .setResolution(FONT.resolution)
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({ targets: nextTitle, alpha: 1, duration: 400, delay: 1300 });

    const continueBtn = this.add
      .text(cx, height * 0.87, '[ PRÓXIMO DIA → ]', {
        fontFamily: FONT.family,
        fontSize: '16px',
        color: PALETTE.text.golden,
        stroke: '#000000',
        strokeThickness: 2,
        backgroundColor: '#0d0a1e',
        padding: { x: 14, y: 8 },
      })
      .setResolution(FONT.resolution)
      .setOrigin(0.5)
      .setAlpha(0)
      .setInteractive({ useHandCursor: true });

    this.tweens.add({ targets: continueBtn, alpha: 1, duration: 400, delay: 1600 });
    hoverBtn(this, continueBtn, PALETTE.text.golden);

    continueBtn.on('pointerdown', () => {
      this.run.day = nextDay;
      fadeOutTo(this, 'GameScene');
    });
  }

  private resolveNight(): {
    message: string;
    playerEliminated: boolean;
    newAlive: NPCData[];
  } {
    const aliveNPCs = this.run.aliveNPCs;
    const faithful = aliveNPCs.filter((n) => n.role === 'faithful');
    const traitors = aliveNPCs.filter((n) => n.role === 'traitor');

    this.run.lastNightVictim = null;

    if (traitors.length === 0 || faithful.length === 0) {
      return { message: 'A noite passou em silêncio.', playerEliminated: false, newAlive: [...aliveNPCs] };
    }

    // Jogador exposto demais? Os Traidores podem vir atrás dele.
    // Cada aliado Fiel vivo vigia o corredor e reduz o perigo.
    const faithfulAllies = faithful.filter((n) => this.run.allies.has(n.id)).length;
    const threat = Math.max(0, this.run.playerThreat - faithfulAllies * 10);
    if (Math.random() < Math.min(0.55, threat / 120)) {
      return {
        message: 'Passos param diante da sua porta. A maçaneta gira...',
        playerEliminated: true,
        newAlive: [...aliveNPCs],
      };
    }

    let target = faithful[0];
    let highestSusp = -1;
    for (const f of faithful) {
      const s = this.run.trustSystem.getSuspicion(f.id);
      if (s > highestSusp) {
        highestSusp = s;
        target = f;
      }
    }

    const newAlive = aliveNPCs.filter((n) => n.id !== target.id);
    const escapedWarning =
      threat >= 18
        ? ' Durante a madrugada, alguém parou diante da sua porta — e seguiu adiante.'
        : '';
    const msg =
      `${target.name} foi eliminado(a) pelos Traidores durante a noite.` +
      ` Algo ficou para trás na cena...${escapedWarning}`;

    // Cena do crime: os Traidores deixam um rastro no cômodo da vítima
    this.run.lastNightVictim = target;
    this.run.allies.delete(target.id);
    this.run.logEvent(`${target.name} foi eliminado(a) pelos Traidores durante a noite.`);
    const crimeClue = generateCrimeClue(target, traitors, this.run.day);
    if (crimeClue) {
      this.run.clueSystem.addClue(crimeClue);
    }

    // Sobreviveu à noite: parte da atenção dos Traidores se dissipa
    this.run.reducePlayerThreat(10);

    return { message: msg, playerEliminated: false, newAlive };
  }
}
