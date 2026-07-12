import Phaser from 'phaser';
import { portraitKey } from '../assets/portraits';
import { RunState } from '../systems/RunState';
import { FONT } from '../design/constants';

const BOOK_W = 700;
const BOOK_H = 490;

export type JournalTab = 'clues' | 'people' | 'diary';

const TABS: Array<{ id: JournalTab; label: string }> = [
  { id: 'clues', label: '[1] Pistas' },
  { id: 'people', label: '[2] Pessoas' },
  { id: 'diary', label: '[3] Diário' },
];

/**
 * Livro do Investigador: pistas coletadas, leitura das pessoas
 * (aliança, confiança em você, suspeita do grupo) e diário de
 * acontecimentos. Reconstruído a cada abertura (ver InterrogationPanel).
 */
export class Journal {
  private container: Phaser.GameObjects.Container | null = null;
  private backdrop: Phaser.GameObjects.Rectangle | null = null;
  private contentGroup: Phaser.GameObjects.Container | null = null;
  private tabButtons = new Map<JournalTab, Phaser.GameObjects.Text>();
  private activeTab: JournalTab = 'clues';

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly width: number,
    private readonly height: number,
    private readonly run: RunState,
    /** Cena com câmera dupla registra os objetos recém-criados como UI. */
    private readonly onBuilt?: (objs: Phaser.GameObjects.GameObject[]) => void,
  ) {}

  open(tab: JournalTab = 'clues'): void {
    this.close();
    this.activeTab = tab;
    this.build();
  }

  close(): void {
    if (!this.container && !this.backdrop) return;
    this.unbindHotkeys();
    this.container?.destroy(true);
    this.container = null;
    this.contentGroup = null;
    this.backdrop?.destroy();
    this.backdrop = null;
    this.tabButtons.clear();
  }

  isVisible(): boolean {
    return this.container !== null;
  }

  private build(): void {
    const cx = this.width / 2;
    const cy = this.height / 2;

    this.backdrop = this.scene.add
      .rectangle(cx, cy, this.width, this.height, 0x000000, 0.72)
      .setDepth(24)
      .setInteractive();

    const book = this.scene.add
      .rectangle(0, 0, BOOK_W, BOOK_H, 0x171226, 0.98)
      .setStrokeStyle(2, 0x8a6d2f);

    // Lombada central — sensação de livro aberto
    const spine = this.scene.add.rectangle(0, 0, 2, BOOK_H - 24, 0x2c2244, 0.8);

    const title = this.scene.add
      .text(-BOOK_W / 2 + 20, -BOOK_H / 2 + 14, 'LIVRO DO INVESTIGADOR', {
        fontFamily: FONT.family,
        fontSize: '16px',
        color: '#e8d9a8',
        fontStyle: 'bold',
      })
      .setResolution(FONT.resolution);

    const closeHint = this.scene.add
      .text(BOOK_W / 2 - 14, -BOOK_H / 2 + 16, '[J] fechar', {
        fontFamily: FONT.family,
        fontSize: '11px',
        color: '#9a98b8',
      })
      .setResolution(FONT.resolution)
      .setOrigin(1, 0);

    const children: Phaser.GameObjects.GameObject[] = [book, spine, title, closeHint];

    TABS.forEach((tab, i) => {
      const button = this.scene.add
        .text(-BOOK_W / 2 + 20 + i * 130, -BOOK_H / 2 + 44, tab.label, {
          fontFamily: FONT.family,
          fontSize: '12px',
          color: '#d8d4f0',
          backgroundColor: '#241c40',
          padding: { x: 10, y: 5 },
        })
        .setResolution(FONT.resolution)
        .setInteractive({ useHandCursor: true });

      button.on('pointerdown', () => this.switchTab(tab.id));
      this.tabButtons.set(tab.id, button);
      children.push(button);
    });

    this.container = this.scene.add.container(cx, cy, children).setDepth(25);
    if (this.backdrop) {
      this.onBuilt?.([this.backdrop, this.container]);
    }
    this.bindHotkeys();
    this.renderTab();
  }

  private bindHotkeys(): void {
    this.scene.input.keyboard!.on('keydown-ONE', () => this.switchTab('clues'));
    this.scene.input.keyboard!.on('keydown-TWO', () => this.switchTab('people'));
    this.scene.input.keyboard!.on('keydown-THREE', () => this.switchTab('diary'));
  }

  private unbindHotkeys(): void {
    this.scene.input.keyboard!.off('keydown-ONE');
    this.scene.input.keyboard!.off('keydown-TWO');
    this.scene.input.keyboard!.off('keydown-THREE');
  }

  private switchTab(tab: JournalTab): void {
    if (!this.isVisible()) return;
    this.activeTab = tab;
    this.renderTab();
  }

  private renderTab(): void {
    if (!this.container) return;

    for (const [id, button] of this.tabButtons.entries()) {
      button.setBackgroundColor(id === this.activeTab ? '#3f2f6a' : '#241c40');
      button.setColor(id === this.activeTab ? '#ffe9b0' : '#d8d4f0');
    }

    this.contentGroup?.destroy(true);
    this.contentGroup = this.scene.add.container(0, 0);
    this.container.add(this.contentGroup);

    switch (this.activeTab) {
      case 'clues':
        this.renderClues();
        break;
      case 'people':
        this.renderPeople();
        break;
      case 'diary':
        this.renderDiary();
        break;
    }
  }

  private renderClues(): void {
    const clues = this.run.clueSystem.getCollected();
    const startY = -BOOK_H / 2 + 86;

    if (clues.length === 0) {
      this.addText(-BOOK_W / 2 + 24, startY, 'Nenhuma pista anotada ainda.', '#8886a6', 12);
      return;
    }

    let y = startY;
    for (const clue of clues) {
      const t = this.addText(-BOOK_W / 2 + 24, y, `• ${clue.description}`, '#c8dcf8', 12, BOOK_W - 60);
      y += t.height + 10;
      if (y > BOOK_H / 2 - 40) break;
    }
  }

  private renderPeople(): void {
    const cellW = 168;
    const cellH = 172;
    const cols = 4;
    const startX = -BOOK_W / 2 + 24 + 60;
    const startY = -BOOK_H / 2 + 96 + 40;

    this.run.roster.forEach((npc, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * cellW;
      const y = startY + row * cellH;
      const alive = this.run.isAlive(npc.id);
      const ally = this.run.allies.has(npc.id);

      const frame = this.scene.add
        .rectangle(x, y - 24, 46, 57, 0x0d0a1e)
        .setStrokeStyle(1, ally ? 0xd8b860 : alive ? 0x5a4a78 : 0x3a3040);
      const portrait = this.scene.add
        .image(x, y - 24, portraitKey(npc.id))
        .setScale(1.7);
      if (!alive) portrait.setTint(0x555560);

      const name = this.addText(
        x,
        y + 12,
        `${alive ? '' : '✝ '}${npc.name}${ally ? ' ✦' : ''}`,
        alive ? (ally ? '#ffe9b0' : '#e8e4ff') : '#77707e',
        13,
      ).setOrigin(0.5, 0);
      name.setFontStyle('bold');

      const reading = alive
        ? this.describePerson(npc.id)
        : 'Eliminado(a).';
      this.addText(x, y + 32, reading, alive ? '#a89ec8' : '#5f5868', 10, cellW - 20)
        .setOrigin(0.5, 0)
        .setAlign('center');

      this.contentGroup!.add([frame, portrait]);
    });

    // Sobre você
    const allies = this.run.roster.filter(
      (n) => this.run.allies.has(n.id) && this.run.isAlive(n.id),
    ).length;
    const threat =
      this.run.playerThreat >= 40 ? 'ALTO' : this.run.playerThreat >= 18 ? 'médio' : 'baixo';
    this.addText(
      0,
      BOOK_H / 2 - 34,
      `Sobre você — aliados: ${allies}   |   risco noturno: ${threat}`,
      '#e8d9a8',
      12,
    ).setOrigin(0.5, 0);
  }

  private renderDiary(): void {
    const startY = -BOOK_H / 2 + 86;
    const entries = this.run.eventLog.slice(-12);

    if (entries.length === 0) {
      this.addText(-BOOK_W / 2 + 24, startY, 'Nada digno de nota até agora.', '#8886a6', 12);
      return;
    }

    let y = startY;
    for (const entry of entries) {
      const t = this.addText(
        -BOOK_W / 2 + 24,
        y,
        `Dia ${entry.day} — ${entry.text}`,
        '#d0c8e8',
        12,
        BOOK_W - 60,
      );
      y += t.height + 8;
      if (y > BOOK_H / 2 - 30) break;
    }
  }

  private describePerson(npcId: string): string {
    const trust = this.run.trustSystem.getTrust(npcId);
    const suspicion = this.run.trustSystem.getSuspicion(npcId);
    const trustLabel =
      trust >= 70 ? 'confia em você' : trust >= 40 ? 'neutro com você' : 'desconfia de você';
    const suspLabel =
      suspicion >= 60 ? 'muito suspeito' : suspicion >= 35 ? 'observado' : 'considerado confiável';
    return `${trustLabel}\n${suspLabel} pelo grupo`;
  }

  private addText(
    x: number,
    y: number,
    text: string,
    color: string,
    size: number,
    wrapWidth?: number,
  ): Phaser.GameObjects.Text {
    const t = this.scene.add
      .text(x, y, text, {
        fontFamily: FONT.family,
        fontSize: `${size}px`,
        color,
        lineSpacing: 4,
        ...(wrapWidth ? { wordWrap: { width: wrapWidth } } : {}),
      })
      .setResolution(FONT.resolution);
    this.contentGroup!.add(t);
    return t;
  }
}
