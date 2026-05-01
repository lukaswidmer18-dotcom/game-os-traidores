import Phaser from 'phaser';
import { DAY_EVENTS } from '../data/dayEvents';
import { NPC_DATA, NPCData } from '../data/npcs';
import { DialogueSystem } from '../systems/DialogueSystem';
import { ClueSystem } from '../systems/ClueSystem';
import { DaySystem } from '../systems/DaySystem';
import {
  InterrogationSystem,
  QuestionId,
  type InterrogationOutcome,
} from '../systems/InterrogationSystem';
import { TrustSystem } from '../systems/TrustSystem';
import { DialogueBox } from '../ui/DialogueBox';
import { CluePanel } from '../ui/CluePanel';
import { PALETTE } from '../design/constants';
import { burst, candleFlicker, fadeIn, fadeOutTo, hoverBtn, spawnDust } from '../design/effects';

const W = 800;
const H = 560;
const DAY_COPY = {
  1: {
    title: 'Dia 1 - A Chegada',
    intro:
      'Voce chega a Mansao Velhart. Seis pessoas, um segredo. Dois deles sao Traidores. Observe os acontecimentos, faca perguntas e monte seu caso antes do Conselho.',
  },
  2: {
    title: 'Dia 2 - Primeira Eliminacao',
    intro:
      'Alguem foi eliminado esta noite. A tensao aumenta. Cruze versoes, pressione respostas e use cada pista com cuidado.',
  },
  3: {
    title: 'Dia 3 - A Decisao Final',
    intro:
      'Este e o ultimo Conselho. Reabra os acontecimentos, confronte respostas e vote com precisao.',
  },
} as const;
const QUESTION_ORDER: Array<{ id: QuestionId; label: string }> = [
  { id: 'alibi', label: 'Onde voce estava?' },
  { id: 'pressure', label: 'Pressionar contradicao' },
  { id: 'rumor', label: 'Pedir um nome' },
  { id: 'evidence', label: 'Confrontar com pista' },
];

export class SocialGameScene extends Phaser.Scene {
  private dialogueSystem!: DialogueSystem;
  private interrogationSystem!: InterrogationSystem;
  private clueSystem!: ClueSystem;
  private trustSystem!: TrustSystem;
  private daySystem!: DaySystem;

  private dialogueBox!: DialogueBox;
  private cluePanel!: CluePanel;

  private currentDay = 1;
  private aliveNPCs: NPCData[] = [];
  private selectedNPC: NPCData | null = null;

  private cluesText!: Phaser.GameObjects.Text;
  private actionText!: Phaser.GameObjects.Text;
  private focusName!: Phaser.GameObjects.Text;
  private focusMeta!: Phaser.GameObjects.Text;
  private focusBody!: Phaser.GameObjects.Text;
  private progressHint!: Phaser.GameObjects.Text;
  private topHint!: Phaser.GameObjects.Text;

  private npcButtons = new Map<string, Phaser.GameObjects.Text>();
  private eventButtons = new Map<string, Phaser.GameObjects.Text>();
  private questionButtons = new Map<QuestionId, Phaser.GameObjects.Text>();

  private interactKey!: Phaser.Input.Keyboard.Key;

  private spokenTo = new Set<string>();
  private askedQuestions = new Set<string>();
  private resolvedEvents = new Set<string>();
  private actionsTaken = 0;
  private councilUnlocked = false;
  private councilButton: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { day?: number; aliveNPCs?: NPCData[] }): void {
    this.currentDay = data.day ?? 1;
    this.aliveNPCs = data.aliveNPCs
      ? data.aliveNPCs.map((npc) => ({ ...npc }))
      : NPC_DATA.map((npc) => ({ ...npc }));
  }

  create(): void {
    fadeIn(this);
    this.buildBackdrop();

    this.dialogueSystem = new DialogueSystem();
    this.interrogationSystem = new InterrogationSystem(this.dialogueSystem);
    this.clueSystem = new ClueSystem();
    this.trustSystem = new TrustSystem();
    this.daySystem = new DaySystem();

    for (let i = 1; i < this.currentDay; i++) {
      this.daySystem.advanceDay();
    }

    this.trustSystem.initialize(this.aliveNPCs);

    this.buildLayout();
    this.buildNpcList();
    this.buildEventList();
    this.buildQuestionButtons();

    this.dialogueBox = new DialogueBox(this, W, H);
    this.cluePanel = new CluePanel(this, W, H);

    this.setupInput();
    this.refreshFocus();
    this.refreshNpcButtons();
    this.refreshEventButtons();
    this.refreshQuestionButtons();
    this.refreshStatus();
    this.showDayIntro();
  }

  private buildBackdrop(): void {
    this.add.rectangle(W / 2, H / 2, W, H, PALETTE.bg.mansion);
    this.add.rectangle(W / 2, 52, W, 56, 0x0d0a1e, 0.96).setStrokeStyle(1, 0x372b59);
    this.add.rectangle(132, 270, 216, 380, 0x120f22, 0.95).setStrokeStyle(1, 0x443266);
    this.add.rectangle(W / 2, 270, 280, 380, 0x151127, 0.95).setStrokeStyle(1, 0x4f3d73);
    this.add.rectangle(668, 270, 216, 380, 0x120f22, 0.95).setStrokeStyle(1, 0x443266);
    this.add.rectangle(W / 2, 510, 752, 78, 0x0d0a1e, 0.95).setStrokeStyle(1, 0x372b59);

    spawnDust(this, W, H, 18);
    candleFlicker(this, 38, 40);
    candleFlicker(this, W - 38, 40);
    candleFlicker(this, 38, H - 40);
    candleFlicker(this, W - 38, H - 40);
  }

  private buildLayout(): void {
    const story = DAY_COPY[this.currentDay as keyof typeof DAY_COPY];

    this.add
      .text(W / 2, 16, story.title, {
        fontSize: '20px',
        color: PALETTE.text.title,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0);

    this.cluesText = this.add.text(20, 20, '', {
      fontSize: '10px',
      color: '#cfd4ff',
      stroke: '#000000',
      strokeThickness: 2,
    });

    this.actionText = this.add
      .text(W - 20, 20, '', {
        fontSize: '10px',
        color: '#cfd4ff',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(1, 0);

    this.topHint = this.add
      .text(W / 2, 40, '[Clique] escolher  [C] pistas  [E] avancar dialogo', {
        fontSize: '9px',
        color: '#8a88a8',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5, 0);

    this.add.text(32, 82, 'SUSPEITOS', {
      fontSize: '12px',
      color: PALETTE.text.golden,
      fontStyle: 'bold',
    });

    this.add.text(282, 82, 'CENA ATUAL', {
      fontSize: '12px',
      color: PALETTE.text.golden,
      fontStyle: 'bold',
    });

    this.add.text(576, 82, 'ACONTECIMENTOS', {
      fontSize: '12px',
      color: PALETTE.text.golden,
      fontStyle: 'bold',
    });

    this.focusName = this.add
      .text(W / 2, 130, '', {
        fontSize: '18px',
        color: '#f4f1ff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0);

    this.focusMeta = this.add
      .text(W / 2, 160, '', {
        fontSize: '10px',
        color: '#c0b7e8',
        align: 'center',
      })
      .setOrigin(0.5, 0);

    this.focusBody = this.add
      .text(W / 2, 206, '', {
        fontSize: '11px',
        color: '#dde0f7',
        align: 'center',
        wordWrap: { width: 230 },
      })
      .setOrigin(0.5, 0);

    this.progressHint = this.add
      .text(W / 2, 430, '', {
        fontSize: '10px',
        color: PALETTE.text.golden,
        align: 'center',
        wordWrap: { width: 230 },
      })
      .setOrigin(0.5, 0);

    this.add.text(30, 477, 'PERGUNTAS', {
      fontSize: '12px',
      color: PALETTE.text.golden,
      fontStyle: 'bold',
    });
  }

  private buildNpcList(): void {
    this.npcButtons.forEach((button) => button.destroy());
    this.npcButtons.clear();

    this.aliveNPCs.forEach((npc, index) => {
      const button = this.add
        .text(32, 118 + index * 56, '', {
          fontSize: '10px',
          color: '#e8e5ff',
          backgroundColor: '#1a1630',
          padding: { x: 8, y: 6 },
          wordWrap: { width: 170 },
        })
        .setInteractive({ useHandCursor: true });

      hoverBtn(this, button, '#e8e5ff');
      button.on('pointerdown', () => this.selectNPC(npc.id));
      this.npcButtons.set(npc.id, button);
    });
  }

  private buildEventList(): void {
    this.eventButtons.forEach((button) => button.destroy());
    this.eventButtons.clear();

    this.getCurrentEvents().forEach((event, index) => {
      const button = this.add
        .text(576, 118 + index * 92, '', {
          fontSize: '10px',
          color: '#d8dcff',
          backgroundColor: '#1a1630',
          padding: { x: 8, y: 8 },
          wordWrap: { width: 180 },
        })
        .setInteractive({ useHandCursor: true });

      hoverBtn(this, button, '#d8dcff');
      button.on('pointerdown', () => this.resolveEvent(event.id));
      this.eventButtons.set(event.id, button);
    });
  }

  private buildQuestionButtons(): void {
    QUESTION_ORDER.forEach((question, index) => {
      const row = Math.floor(index / 2);
      const col = index % 2;
      const button = this.add
        .text(34 + col * 246, 500 + row * 28, question.label, {
          fontSize: '10px',
          color: '#f0edff',
          backgroundColor: '#20183b',
          padding: { x: 10, y: 6 },
        })
        .setInteractive({ useHandCursor: true });

      hoverBtn(this, button, '#f0edff');
      button.on('pointerdown', () => this.askQuestion(question.id));
      this.questionButtons.set(question.id, button);
    });
  }

  private setupInput(): void {
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    this.input.keyboard!.on('keydown-C', () => {
      if (this.dialogueBox.isVisible()) {
        return;
      }
      this.cluePanel.toggle(this.clueSystem.getCollected());
      this.refreshQuestionButtons();
      this.refreshStatus();
    });
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.interactKey) && this.dialogueBox.isVisible()) {
      this.dialogueBox.hide();
      this.refreshQuestionButtons();
      this.refreshStatus();
    }
  }

  private showDayIntro(): void {
    const story = DAY_COPY[this.currentDay as keyof typeof DAY_COPY];
    this.dialogueBox.show('Narrador', story.intro);
    this.refreshFocus(story.intro);
  }

  private selectNPC(npcId: string): void {
    if (this.dialogueBox.isVisible() || this.cluePanel.isVisible()) {
      return;
    }

    const npc = this.aliveNPCs.find((candidate) => candidate.id === npcId);
    if (!npc) {
      return;
    }

    this.selectedNPC = npc;
    this.refreshFocus();
    this.refreshNpcButtons();
    this.refreshQuestionButtons();
  }

  private askQuestion(questionId: QuestionId): void {
    if (!this.selectedNPC || this.dialogueBox.isVisible() || this.cluePanel.isVisible()) {
      return;
    }

    const usageKey = this.getQuestionUsageKey(this.selectedNPC.id, questionId);
    if (this.askedQuestions.has(usageKey)) {
      this.dialogueBox.show('Narrador', 'Essa pergunta ja foi feita a essa pessoa hoje.');
      return;
    }

    const outcome = this.interrogationSystem.ask(
      questionId,
      this.selectedNPC,
      this.currentDay,
      this.aliveNPCs,
      this.clueSystem.getCollected(),
    );

    this.applyOutcome(this.selectedNPC, outcome);
    this.askedQuestions.add(usageKey);
    this.spokenTo.add(this.selectedNPC.id);
    this.actionsTaken++;

    let response = outcome.text;
    if (outcome.revealClueId && !this.clueSystem.hasCollected(outcome.revealClueId)) {
      const clue = this.clueSystem.collectClue(outcome.revealClueId, this.trustSystem);
      if (clue) {
        response += `\n\nNova pista: ${clue.description}`;
      }
    }

    this.refreshNpcButtons();
    this.refreshQuestionButtons();
    this.refreshStatus();
    this.refreshFocus(response);
    this.checkCouncilUnlock();
    this.dialogueBox.show(this.selectedNPC.name, response);
  }

  private resolveEvent(eventId: string): void {
    if (this.dialogueBox.isVisible() || this.cluePanel.isVisible()) {
      return;
    }

    if (this.resolvedEvents.has(eventId)) {
      this.dialogueBox.show('Narrador', 'Esse acontecimento ja foi investigado.');
      return;
    }

    const event = this.getCurrentEvents().find((entry) => entry.id === eventId);
    if (!event) {
      return;
    }

    const clue = this.clueSystem.hasCollected(event.clueId)
      ? null
      : this.clueSystem.collectClue(event.clueId, this.trustSystem);

    this.resolvedEvents.add(eventId);
    this.actionsTaken++;

    const eventButton = this.eventButtons.get(eventId);
    if (eventButton) {
      burst(this, eventButton.x + 70, eventButton.y + 18, 10, PALETTE.particle.cluePickup);
    }

    const body = clue
      ? `${event.summary}\n\nPista obtida: ${clue.description}`
      : `${event.summary}\n\nVoce ja conhecia essa pista, mas a leitura da cena reforca sua suspeita.`;

    this.refreshEventButtons();
    this.refreshStatus();
    this.refreshFocus(body);
    this.checkCouncilUnlock();
    this.dialogueBox.show(event.title, body);
  }

  private applyOutcome(npc: NPCData, outcome: InterrogationOutcome): void {
    if (outcome.trustDelta > 0) {
      this.trustSystem.increaseTrust(npc.id, outcome.trustDelta);
    } else if (outcome.trustDelta < 0) {
      this.trustSystem.decreaseTrust(npc.id, Math.abs(outcome.trustDelta));
    }

    if (outcome.suspicionDelta > 0) {
      this.trustSystem.increaseSuspicion(npc.id, outcome.suspicionDelta);
    }

    if (outcome.suspicionTargetId && outcome.suspicionTargetDelta) {
      this.trustSystem.increaseSuspicion(outcome.suspicionTargetId, outcome.suspicionTargetDelta);
    }
  }

  private refreshFocus(overrideBody?: string): void {
    if (!this.selectedNPC) {
      const story = DAY_COPY[this.currentDay as keyof typeof DAY_COPY];
      this.focusName.setText('Mesa de leitura');
      this.focusMeta.setText('Escolha um suspeito ou investigue um acontecimento do dia.');
      this.focusBody.setText(overrideBody ?? story.intro);
      this.progressHint.setText(
        'Converse com pelo menos duas pessoas e siga os acontecimentos para liberar o conselho.',
      );
      return;
    }

    const npc = this.selectedNPC;
    const trust = this.trustSystem.getTrust(npc.id);
    const suspicion = this.trustSystem.getSuspicion(npc.id);
    this.focusName.setText(npc.name);
    this.focusMeta.setText(`Confianca ${trust}  |  Suspeita ${suspicion}\n${npc.personality}`);
    this.focusBody.setText(
      overrideBody ??
        'Selecione uma pergunta abaixo. Cada abordagem muda a leitura do grupo sobre essa pessoa.',
    );
    this.progressHint.setText(this.describeCouncilProgress());
  }

  private refreshNpcButtons(): void {
    for (const npc of this.aliveNPCs) {
      const button = this.npcButtons.get(npc.id);
      if (!button) {
        continue;
      }

      const trust = this.trustSystem.getTrust(npc.id);
      const suspicion = this.trustSystem.getSuspicion(npc.id);
      const selected = this.selectedNPC?.id === npc.id;
      button.setText(`${selected ? '> ' : ''}${npc.name}\nConf ${trust}  Sus ${suspicion}`);
      button.setBackgroundColor(selected ? '#34265a' : '#1a1630');
      button.setAlpha(this.dialogueBox?.isVisible() ? 0.65 : 1);
    }
  }

  private refreshEventButtons(): void {
    for (const event of this.getCurrentEvents()) {
      const button = this.eventButtons.get(event.id);
      if (!button) {
        continue;
      }

      const done = this.resolvedEvents.has(event.id);
      button.setText(`${done ? '[ok] ' : ''}${event.title}\n${event.summary}`);
      button.setBackgroundColor(done ? '#173223' : '#1a1630');
      button.setAlpha(done ? 0.55 : 1);
    }
  }

  private refreshQuestionButtons(): void {
    for (const question of QUESTION_ORDER) {
      const button = this.questionButtons.get(question.id);
      if (!button) {
        continue;
      }

      const disabled =
        !this.selectedNPC ||
        this.dialogueBox.isVisible() ||
        this.cluePanel.isVisible() ||
        this.askedQuestions.has(this.getQuestionUsageKey(this.selectedNPC.id, question.id));

      button.setAlpha(disabled ? 0.35 : 1);
      button.setBackgroundColor(disabled ? '#171426' : '#20183b');
    }
  }

  private refreshStatus(): void {
    this.cluesText.setText(`Pistas: ${this.clueSystem.getCollected().length}`);
    this.actionText.setText(`Acoes: ${this.actionsTaken}`);
    this.topHint.setText(
      this.cluePanel.isVisible()
        ? '[C] fechar pistas'
        : '[Clique] escolher  [C] pistas  [E] avancar dialogo',
    );
    this.progressHint.setText(this.describeCouncilProgress());
  }

  private describeCouncilProgress(): string {
    const clues = this.clueSystem.getCollected().length;
    const talks = this.spokenTo.size;
    if (this.councilUnlocked) {
      return 'Voce reuniu material suficiente. O conselho pode comecar.';
    }
    return `Progresso do conselho: ${talks}/2 interrogatorios marcantes e ${clues}/1 pistas fortes.`;
  }

  private checkCouncilUnlock(): void {
    if (this.councilUnlocked) {
      return;
    }

    if (this.spokenTo.size >= 2 && this.clueSystem.getCollected().length >= 1 && this.actionsTaken >= 3) {
      this.councilUnlocked = true;
      this.showCouncilButton();
      this.refreshStatus();
    }
  }

  private showCouncilButton(): void {
    if (this.councilButton) {
      return;
    }

    this.councilButton = this.add
      .text(W - 210, 506, '[ IR PARA O CONSELHO -> ]', {
        fontSize: '12px',
        color: PALETTE.text.golden,
        backgroundColor: '#24163c',
        stroke: '#000000',
        strokeThickness: 2,
        padding: { x: 12, y: 8 },
      })
      .setInteractive({ useHandCursor: true });

    hoverBtn(this, this.councilButton, PALETTE.text.golden);
    this.councilButton.on('pointerdown', () => {
      if (this.dialogueBox.isVisible()) {
        return;
      }
      fadeOutTo(this, 'CouncilScene', {
        day: this.currentDay,
        aliveNPCs: this.aliveNPCs,
        clues: this.clueSystem.getCollected(),
        trustSystem: this.trustSystem,
      });
    });
  }

  private getCurrentEvents() {
    return DAY_EVENTS.filter((event) => event.day === this.currentDay);
  }

  private getQuestionUsageKey(npcId: string, questionId: QuestionId): string {
    return `${this.currentDay}:${npcId}:${questionId}`;
  }
}
