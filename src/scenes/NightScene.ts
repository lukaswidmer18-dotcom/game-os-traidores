import Phaser from 'phaser';
import { ensurePortraits, portraitKey } from '../assets/portraits';
import { generateCrimeClue } from '../data/clues';
import { NPCData } from '../data/npcs';
import { STORY_DAYS } from '../data/storyDays';
import { getRun, RunState } from '../systems/RunState';
import { audio } from '../systems/AudioSystem';
import { FONT, PALETTE } from '../design/constants';
import { fadeIn, fadeOutTo, drawTwinStars, fogRise, hoverBtn } from '../design/effects';

const MAX_DAYS = STORY_DAYS.length;

/** Ação noturna do jogador Fiel. */
type NightAction = 'lock' | 'watch' | 'sleep';

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
    audio.startAmbient('night');

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

    // A noite agora é interativa: o jogador escolhe uma ação antes do desfecho
    this.time.delayedCall(900, () => {
      if (this.run.isPlayerTraitor()) {
        this.showVictimChoice();
      } else {
        this.showNightActions();
      }
    });
  }

  // --- Ação noturna do Fiel ---

  private showNightActions(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    const prompt = this.addFading(
      cx,
      height * 0.47,
      'A noite cai. O que você faz?',
      { fontSize: '15px', color: '#c8c8ea', fontStyle: 'italic' },
      0,
    );

    const options: Array<{ action: NightAction; label: string; hint: string }> = [
      {
        action: 'lock',
        label: '[ TRANCAR A PORTA ]',
        hint: 'Seguro, mas você não verá nada',
      },
      {
        action: 'watch',
        label: '[ VIGIAR OS CORREDORES ]',
        hint: 'Pode flagrar o assassino — ou ser visto',
      },
      {
        action: 'sleep',
        label: '[ DORMIR ]',
        hint: 'Descansar e confiar na sorte',
      },
    ];

    const buttons: Phaser.GameObjects.Text[] = [prompt];
    options.forEach((option, i) => {
      const x = cx + (i - 1) * width * 0.28;
      const btn = this.add
        .text(x, height * 0.56, option.label, {
          fontFamily: FONT.family,
          fontSize: '13px',
          color: PALETTE.text.golden,
          stroke: '#000000',
          strokeThickness: 2,
          backgroundColor: '#0d0a1e',
          padding: { x: 10, y: 7 },
        })
        .setResolution(FONT.resolution)
        .setOrigin(0.5)
        .setAlpha(0)
        .setInteractive({ useHandCursor: true });
      this.tweens.add({ targets: btn, alpha: 1, duration: 350, delay: 150 + i * 120 });
      hoverBtn(this, btn, PALETTE.text.golden);

      const hint = this.addFading(x, height * 0.62, option.hint, { fontSize: '10px', color: '#8a8ab2' }, 200 + i * 120);
      buttons.push(btn, hint);

      btn.on('pointerdown', () => {
        for (const el of buttons) el.destroy();
        this.finishNight(this.resolveNight(option.action));
      });
    });
  }

  // --- Escolha da vítima (jogador Traidor) ---

  private showVictimChoice(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const faithful = this.run.getAliveFaithfulNPCs();

    if (faithful.length === 0) {
      this.finishNight(this.resolveTraitorNight(this.run.aliveNPCs, [], this.run.getAliveTraitorNPCs()));
      return;
    }

    const prompt = this.addFading(
      cx,
      height * 0.47,
      'A mansão dorme. Escolha quem não verá o amanhecer:',
      { fontSize: '15px', color: '#d8a8b8', fontStyle: 'italic' },
      0,
    );

    const elements: Phaser.GameObjects.Text[] = [prompt];
    const perRow = Math.min(faithful.length, 3);
    faithful.forEach((npc, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const x = cx + (col - (perRow - 1) / 2) * width * 0.24;
      const y = height * (0.56 + row * 0.075);
      const suspicion = this.run.trustSystem.getSuspicion(npc.id);

      const btn = this.add
        .text(x, y, `[ ${npc.name.toUpperCase()} ]  susp. ${suspicion}`, {
          fontFamily: FONT.family,
          fontSize: '12px',
          color: '#e8b0b0',
          stroke: '#000000',
          strokeThickness: 2,
          backgroundColor: '#160a14',
          padding: { x: 10, y: 6 },
        })
        .setResolution(FONT.resolution)
        .setOrigin(0.5)
        .setAlpha(0)
        .setInteractive({ useHandCursor: true });
      this.tweens.add({ targets: btn, alpha: 1, duration: 300, delay: 120 + i * 90 });
      hoverBtn(this, btn, '#ff9a9a');
      elements.push(btn);

      btn.on('pointerdown', () => {
        for (const el of elements) el.destroy();
        this.finishNight(
          this.resolveTraitorNight(this.run.aliveNPCs, [npc], this.run.getAliveTraitorNPCs()),
        );
      });
    });
  }

  /** Texto com fade-in — atalho para os blocos noturnos. */
  private addFading(
    x: number,
    y: number,
    text: string,
    style: Partial<Phaser.Types.GameObjects.Text.TextStyle>,
    delay: number,
  ): Phaser.GameObjects.Text {
    const el = this.add
      .text(x, y, text, {
        fontFamily: FONT.family,
        wordWrap: { width: this.scale.width * 0.8 },
        align: 'center',
        ...style,
      })
      .setResolution(FONT.resolution)
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({ targets: el, alpha: 1, duration: 400, delay });
    return el;
  }

  // --- Desfecho da noite (comum aos dois papéis) ---

  private finishNight(nightResult: {
    message: string;
    playerEliminated: boolean;
    newAlive: NPCData[];
  }): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    audio.stinger('death');
    this.addFading(cx, height * 0.47, '— A noite cai —', { fontSize: '15px', color: '#6a6a92', fontStyle: 'italic' }, 100);
    this.addFading(cx, height * 0.57, nightResult.message, { fontSize: '14px', color: '#ff8888' }, 350);

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

    const remainingFaithful = this.run.getAliveFaithfulNPCs().length;
    if (remainingFaithful === 0 || this.run.hasTraitorDominance()) {
      this.time.delayedCall(3200, () => {
        fadeOutTo(this, 'GameOverScene', {
          outcome: this.run.isPlayerTraitor() ? 'victory' : 'defeat',
          message: this.run.isPlayerTraitor()
            ? 'A noite terminou com os Fiéis sem força para reagir. Sua facção venceu.'
            : 'A noite terminou com os Traidores no controle da mansão. Derrota!',
        });
      });
      return;
    }

    const nextDay = this.run.day + 1;
    if (nextDay > MAX_DAYS) {
      if (this.run.isPlayerTraitor()) {
        this.time.delayedCall(3200, () => {
          fadeOutTo(this, 'GameOverScene', {
            outcome: 'victory',
            message: 'O tempo acabou e nenhum Fiel conseguiu expor você. Os Traidores venceram.',
          });
        });
      } else {
        const traitors = this.run.getAliveTraitorNPCs().length;
        this.time.delayedCall(3200, () => {
          fadeOutTo(this, 'GameOverScene', {
            outcome: traitors > 0 ? 'defeat' : 'victory',
            message: traitors > 0
              ? 'O tempo acabou. Os Traidores venceram.'
              : 'Todos os Traidores foram eliminados. Vitória!',
          });
        });
      }
      return;
    }

    const nextStory = STORY_DAYS[nextDay - 1];
    this.addFading(cx, height * 0.76, nextStory.title, { fontSize: '16px', color: '#9999ff', fontStyle: 'bold' }, 1100);

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

    this.tweens.add({ targets: continueBtn, alpha: 1, duration: 400, delay: 1400 });
    hoverBtn(this, continueBtn, PALETTE.text.golden);

    continueBtn.on('pointerdown', () => {
      this.run.day = nextDay;
      fadeOutTo(this, 'GameScene');
    });
  }

  private resolveNight(action: NightAction): {
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
    // Porta trancada e aliados Fiéis vigiando reduzem o perigo;
    // ficar de vigia no corredor expõe mais.
    const actionThreatDelta = action === 'lock' ? -25 : action === 'watch' ? 8 : -5;
    const faithfulAllies = faithful.filter((n) => this.run.allies.has(n.id)).length;
    const threat = Math.max(0, this.run.playerThreat + actionThreatDelta - faithfulAllies * 10);
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
    let msg =
      `${target.name} foi eliminado(a) pelos Traidores durante a noite.` +
      ` Algo ficou para trás na cena...${escapedWarning}`;

    // Vigiar os corredores: chance de flagrar o assassino em movimento
    if (action === 'watch') {
      const culprit = traitors[Math.floor(Math.random() * traitors.length)];
      if (Math.random() < 0.55) {
        this.run.trustSystem.increaseSuspicion(culprit.id, 14);
        this.run.addPlayerThreat(10);
        this.run.logEvent(
          `Da fresta da porta, você viu ${culprit.name} deslizar pela escuridão na direção do quarto de ${target.name}.`,
        );
        msg =
          `Da fresta da porta, você viu ${culprit.name} deslizar pela escuridão. ` +
          `Ao amanhecer, ${target.name} não desceu para o café. Você sabe quem foi — mas será que acreditariam em você?`;
      } else {
        msg = `A vigília foi longa e fria. Nada. Ao amanhecer, ${target.name} não desceu para o café...`;
      }
    }

    if (action === 'lock') {
      msg += ' Sua porta trancada rangeu uma vez na madrugada — e depois, silêncio.';
    }

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
  private resolveTraitorNight(
    aliveNPCs: NPCData[],
    faithful: NPCData[],
    traitorPartners: NPCData[],
  ): {
    message: string;
    playerEliminated: boolean;
    newAlive: NPCData[];
  } {
    if (faithful.length === 0) {
      return { message: 'A noite passou em silêncio. Ninguém mais podia impedir você.', playerEliminated: false, newAlive: [...aliveNPCs] };
    }

    let target = faithful[0];
    let highestSusp = -1;
    for (const candidate of faithful) {
      const suspicion = this.run.trustSystem.getSuspicion(candidate.id);
      if (suspicion > highestSusp) {
        highestSusp = suspicion;
        target = candidate;
      }
    }

    const newAlive = aliveNPCs.filter((n) => n.id !== target.id);
    const partner = traitorPartners[0];
    const message = partner
      ? `Voce e ${partner.name} conduzem ${target.name} para longe dos outros. Ao amanhecer, restara apenas medo.`
      : `Voce conduz ${target.name} para longe dos outros. Ao amanhecer, restara apenas medo.`;

    this.run.lastNightVictim = target;
    this.run.allies.delete(target.id);
    this.run.logEvent(`${target.name} foi eliminado(a) pelos Traidores durante a noite.`);

    if (traitorPartners.length > 0) {
      const crimeClue = generateCrimeClue(target, traitorPartners, this.run.day);
      if (crimeClue) {
        this.run.clueSystem.addClue(crimeClue);
      }
    }

    this.run.reducePlayerThreat(8);
    return { message, playerEliminated: false, newAlive };
  }
}
