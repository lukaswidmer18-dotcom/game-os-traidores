import Phaser from 'phaser';
import { portraitKey } from '../assets/portraits';
import { NPCData } from '../data/npcs';
import { QuestionId } from '../systems/InterrogationSystem';
import { FONT } from '../design/constants';

const PANEL_W = 600;
const PANEL_H = 460;

const QUESTIONS: Array<{ id: QuestionId; label: string; hotkey: string }> = [
  { id: 'alibi', label: '[1] Onde voce estava?', hotkey: 'ONE' },
  { id: 'pressure', label: '[2] Pressionar contradicao', hotkey: 'TWO' },
  { id: 'rumor', label: '[3] Pedir um nome', hotkey: 'THREE' },
  { id: 'evidence', label: '[4] Confrontar com pista', hotkey: 'FOUR' },
  { id: 'alliance', label: '[5] Propor alianca', hotkey: 'FIVE' },
];

export interface InterrogationCallbacks {
  /** Aplica os efeitos da pergunta e retorna o texto de resposta do NPC. */
  ask(npc: NPCData, questionId: QuestionId): string;
  isAsked(npcId: string, questionId: QuestionId): boolean;
  /** Leitura qualitativa do NPC (confiança/suspeita em texto). */
  reading(npcId: string): string;
  onClose(): void;
}

/**
 * Overlay de interrogatório. Construído do zero a cada open() e destruído
 * no close() — alternar visibilidade de containers com filhos interativos
 * deixava o hit-test do Phaser em estado inconsistente.
 */
export class InterrogationPanel {
  private container: Phaser.GameObjects.Container | null = null;
  private backdrop: Phaser.GameObjects.Rectangle | null = null;
  private metaText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private questionButtons = new Map<QuestionId, Phaser.GameObjects.Text>();
  private currentNPC: NPCData | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly width: number,
    private readonly height: number,
    private readonly callbacks: InterrogationCallbacks,
    /** Cena com câmera dupla registra os objetos recém-criados como UI. */
    private readonly onBuilt?: (objs: Phaser.GameObjects.GameObject[]) => void,
  ) {}

  open(npc: NPCData): void {
    this.close(true);
    this.currentNPC = npc;
    this.build(npc);
    this.bindHotkeys();
  }

  close(silent = false): void {
    if (!this.container && !this.backdrop) return;

    this.unbindHotkeys();
    this.container?.destroy(true);
    this.container = null;
    this.backdrop?.destroy();
    this.backdrop = null;
    this.questionButtons.clear();
    this.currentNPC = null;

    if (!silent) this.callbacks.onClose();
  }

  /** Perguntas também por teclado (1-4) — clique e atalho equivalentes. */
  private bindHotkeys(): void {
    for (const question of QUESTIONS) {
      this.scene.input.keyboard!.on(`keydown-${question.hotkey}`, this.hotkeyHandler(question.id));
    }
  }

  private unbindHotkeys(): void {
    for (const question of QUESTIONS) {
      this.scene.input.keyboard!.off(`keydown-${question.hotkey}`);
    }
  }

  private hotkeyHandler(questionId: QuestionId): () => void {
    return () => {
      if (this.isVisible()) this.askQuestion(questionId);
    };
  }

  isVisible(): boolean {
    return this.container !== null;
  }

  private build(npc: NPCData): void {
    const cx = this.width / 2;
    const cy = this.height / 2;

    this.backdrop = this.scene.add
      .rectangle(cx, cy, this.width, this.height, 0x000000, 0.7)
      .setDepth(20)
      .setInteractive();

    const panel = this.scene.add
      .rectangle(0, 0, PANEL_W, PANEL_H, 0x14102a, 0.98)
      .setStrokeStyle(2, 0x8a6d2f);

    const portraitFrame = this.scene.add
      .rectangle(-PANEL_W / 2 + 76, -PANEL_H / 2 + 98, 78, 96, 0x0d0a1e)
      .setStrokeStyle(2, 0x8a6d2f);

    const portrait = this.scene.add
      .image(-PANEL_W / 2 + 76, -PANEL_H / 2 + 98, portraitKey(npc.id))
      .setScale(3);

    const nameText = this.scene.add
      .text(-PANEL_W / 2 + 140, -PANEL_H / 2 + 44, npc.name, {
        fontFamily: FONT.family,
        fontSize: '22px',
        color: '#f4f1ff',
        fontStyle: 'bold',
      })
      .setResolution(FONT.resolution)
      .setOrigin(0, 0);

    this.metaText = this.scene.add
      .text(
        -PANEL_W / 2 + 140,
        -PANEL_H / 2 + 78,
        `${this.callbacks.reading(npc.id)}\n\n${npc.personality}`,
        {
          fontFamily: FONT.family,
          fontSize: '12px',
          color: '#c0b7e8',
          lineSpacing: 5,
          wordWrap: { width: PANEL_W - 170 },
        },
      )
      .setResolution(FONT.resolution)
      .setOrigin(0, 0);

    this.bodyText = this.scene.add
      .text(
        0,
        -PANEL_H / 2 + 175,
        'Escolha uma abordagem. Cada pergunta é uma ação e muda a leitura do grupo.',
        {
          fontFamily: FONT.family,
          fontSize: '13px',
          color: '#e6e8fa',
          align: 'center',
          lineSpacing: 6,
          wordWrap: { width: PANEL_W - 70 },
        },
      )
      .setResolution(FONT.resolution)
      .setOrigin(0.5, 0);

    const closeHint = this.scene.add
      .text(PANEL_W / 2 - 12, -PANEL_H / 2 + 10, '[ESC] fechar', {
        fontFamily: FONT.family,
        fontSize: '11px',
        color: '#9a98b8',
      })
      .setResolution(FONT.resolution)
      .setOrigin(1, 0);

    const children: Phaser.GameObjects.GameObject[] = [
      panel,
      portraitFrame,
      portrait,
      nameText,
      this.metaText,
      this.bodyText,
      closeHint,
    ];

    QUESTIONS.forEach((question, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const button = this.scene.add
        .text(-PANEL_W / 2 + 30 + col * 280, PANEL_H / 2 - 142 + row * 42, question.label, {
          fontFamily: FONT.family,
          fontSize: '13px',
          color: '#f0edff',
          backgroundColor: '#251c46',
          padding: { x: 14, y: 8 },
        })
        .setResolution(FONT.resolution)
        .setInteractive({ useHandCursor: true });

      button.on('pointerover', () => button.setBackgroundColor('#3a2a66'));
      button.on('pointerout', () => this.refreshButtons());
      button.on('pointerdown', () => this.askQuestion(question.id));
      this.questionButtons.set(question.id, button);
      children.push(button);
    });

    this.container = this.scene.add.container(cx, cy, children).setDepth(21);
    if (this.backdrop) {
      this.onBuilt?.([this.backdrop, this.container]);
    }
    this.refreshButtons();
  }

  private askQuestion(questionId: QuestionId): void {
    if (!this.currentNPC) return;
    if (this.callbacks.isAsked(this.currentNPC.id, questionId)) {
      this.bodyText.setText('Essa pergunta ja foi feita a essa pessoa hoje.');
      return;
    }

    const response = this.callbacks.ask(this.currentNPC, questionId);
    this.bodyText.setText(response);
    this.metaText.setText(
      `${this.callbacks.reading(this.currentNPC.id)}\n\n${this.currentNPC.personality}`,
    );
    this.refreshButtons();
  }

  private refreshButtons(): void {
    if (!this.currentNPC) return;
    for (const question of QUESTIONS) {
      const button = this.questionButtons.get(question.id);
      if (!button) continue;
      const asked = this.callbacks.isAsked(this.currentNPC.id, question.id);
      button.setAlpha(asked ? 0.35 : 1);
      button.setBackgroundColor(asked ? '#171426' : '#251c46');
    }
  }
}
