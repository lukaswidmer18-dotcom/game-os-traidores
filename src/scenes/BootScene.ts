import Phaser from 'phaser';
import { ensureRuntimeTextures } from '../assets/runtimeTextures';
import { ensurePortraits, portraitKey } from '../assets/portraits';
import { base, preloadTileArt, SHEET_KEYS } from '../assets/tileArt';
import { ensureCharacterArt } from '../assets/characterArt';
import { NPC_DATA } from '../data/npcs';
import { PlayerRole, startNewRun } from '../systems/RunState';
import { FONT, PALETTE } from '../design/constants';
import { fadeIn, flash, fadeOutTo, spawnDust, burst, candleFlicker } from '../design/effects';

const GOLD_LIGHT = 0xf0d483;
const GOLD_DARK = 0xbc7a2f;

export class BootScene extends Phaser.Scene {
  private selectedPlayerRole: PlayerRole = 'investigator';

  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    preloadTileArt(this);
  }

  create(): void {
    ensureCharacterArt(this);
    const { width, height } = this.scale;
    const cx = width / 2;

    ensureRuntimeTextures(this);
    ensurePortraits(this);
    fadeIn(this);

    // Fundo em degradê vertical — noite fechada no topo, brasa no horizonte
    const bg = this.add.graphics().setDepth(-2);
    bg.fillGradientStyle(0x0b0618, 0x0b0618, 0x1c1030, 0x241332, 1);
    bg.fillRect(0, 0, width, height);

    // Grade sutil
    const grid = this.add.graphics().setDepth(0);
    grid.lineStyle(1, 0x150d2e, 0.35);
    for (let y = 0; y < height; y += 32) grid.lineBetween(0, y, width, y);
    for (let x = 0; x < width; x += 32) grid.lineBetween(x, 0, x, height);

    this.drawMansionFacade(cx, height, width);

    candleFlicker(this, 28, 28);
    candleFlicker(this, width - 28, 28);
    spawnDust(this, width, height, 24);

    this.time.delayedCall(60, () => {
      flash(this);
      burst(this, cx, height * 0.17, 18, 0xddbbff);
    });

    this.buildTitleBlock(cx, height);
    this.buildSuspectGallery(cx, height * 0.44);
    this.buildControlsPanel(cx, width, height);
    this.buildRoleSelector(cx, height);
    this.buildStartButton(cx, height);
    this.spawnGuestParade(width, height);
  }

  /** Título com hierarquia: sobrelinha, linha de apoio e nome em dourado. */
  private buildTitleBlock(cx: number, height: number): void {
    const overline = this.add
      .text(cx, height * 0.075, 'UM MISTÉRIO NA MANSÃO VELHART', {
        fontFamily: FONT.family,
        fontSize: '10px',
        color: '#9a86b8',
      })
      .setResolution(FONT.resolution)
      .setLetterSpacing(5)
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(5);

    const lead = this.add
      .text(cx, height * 0.125, 'Entre Fiéis e', {
        fontFamily: FONT.family,
        fontSize: '20px',
        color: '#cfc6e8',
        fontStyle: 'italic',
      })
      .setResolution(FONT.resolution)
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(5);

    const title = this.add
      .text(cx, height * 0.19, 'TRAIDORES', {
        fontFamily: FONT.family,
        fontSize: '46px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#0b0618',
        strokeThickness: 7,
      })
      .setResolution(FONT.resolution)
      .setLetterSpacing(4)
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(0.7)
      .setDepth(5);
    // Degradê dourado no nome — o acento da marca, usado uma vez só
    title.setTint(GOLD_LIGHT, GOLD_LIGHT, GOLD_DARK, GOLD_DARK);
    title.setShadow(0, 5, '#000000', 10, true, true);

    // Linha divisória em fade dourado
    const divider = this.add.graphics().setAlpha(0).setDepth(5);
    divider.fillGradientStyle(GOLD_DARK, GOLD_DARK, GOLD_DARK, GOLD_DARK, 0, 0.75, 0, 0.75);
    divider.fillRect(cx - 150, height * 0.245, 150, 2);
    divider.fillGradientStyle(GOLD_DARK, GOLD_DARK, GOLD_DARK, GOLD_DARK, 0.75, 0, 0.75, 0);
    divider.fillRect(cx, height * 0.245, 150, 2);

    const intro = this.add
      .text(
        cx,
        height * 0.305,
        'Oito hóspedes. Dois são Traidores — e mudam a cada partida.\nExplore, interrogue e vote antes que a noite decida por você.',
        {
          fontFamily: FONT.family,
          fontSize: '13px',
          color: PALETTE.text.secondary,
          lineSpacing: 7,
          align: 'center',
        },
      )
      .setResolution(FONT.resolution)
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(5);

    this.tweens.add({ targets: overline, alpha: 0.85, duration: 500, delay: 150 });
    this.tweens.add({ targets: lead, alpha: 1, duration: 500, delay: 300 });
    this.tweens.add({
      targets: title,
      alpha: 1,
      scale: 1,
      duration: 650,
      delay: 140,
      ease: 'Back.easeOut',
    });
    this.tweens.add({ targets: divider, alpha: 1, duration: 600, delay: 650 });
    this.tweens.add({ targets: intro, alpha: 1, duration: 500, delay: 750 });
  }

  /** Fileira de retratos dos 8 hóspedes — molduras com sombra e hover. */
  private buildSuspectGallery(cx: number, y: number): void {
    const gap = 86;
    const startX = cx - ((NPC_DATA.length - 1) * gap) / 2;

    NPC_DATA.forEach((npc, i) => {
      const x = startX + i * gap;

      const shadow = this.add
        .rectangle(x + 3, y + 4, 56, 68, 0x000000, 0.45)
        .setAlpha(0)
        .setDepth(4);

      const frame = this.add
        .rectangle(x, y, 56, 68, 0x0d0a1e)
        .setStrokeStyle(1, 0x5a4a2f)
        .setAlpha(0)
        .setDepth(5)
        .setInteractive({ useHandCursor: true });

      const portrait = this.add
        .image(x, y, portraitKey(npc.id))
        .setScale(2.1)
        .setAlpha(0)
        .setDepth(5);

      const name = this.add
        .text(x, y + 44, npc.name, {
          fontFamily: FONT.family,
          fontSize: '11px',
          color: '#b8b0d8',
        })
        .setResolution(FONT.resolution)
        .setOrigin(0.5, 0)
        .setAlpha(0)
        .setDepth(5);

      this.tweens.add({
        targets: [shadow, frame, portrait, name],
        alpha: 1,
        duration: 350,
        delay: 800 + i * 80,
      });

      // Balanço sutil, dessincronizado
      this.tweens.add({
        targets: [shadow, frame, portrait],
        y: '+=3',
        duration: 1600 + i * 130,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: i * 200,
      });

      // Hover: moldura acende em dourado e o retrato se aproxima
      frame.on('pointerover', () => {
        frame.setStrokeStyle(2, 0xd4a848);
        name.setColor('#f0d483');
        this.tweens.add({ targets: portrait, scale: 2.35, duration: 150, ease: 'Quad.easeOut' });
      });
      frame.on('pointerout', () => {
        frame.setStrokeStyle(1, 0x5a4a2f);
        name.setColor('#b8b0d8');
        this.tweens.add({ targets: portrait, scale: 2.1, duration: 150, ease: 'Quad.easeOut' });
      });
    });
  }

  /** Painel de controles: vidro escuro com rótulo em caixa alta. */
  private buildControlsPanel(cx: number, width: number, height: number): void {
    // Abaixo da galeria de retratos (nomes + flutuação de +3px terminam ~0.56h)
    const panelY = height * 0.655;
    const panelW = width * 0.62;

    const panel = this.add
      .rectangle(cx, panelY, panelW, 58, 0x0d0a1e, 0.68)
      .setStrokeStyle(1, 0x3a2a5e)
      .setAlpha(0)
      .setDepth(4);

    // Máscara atrás do rótulo para ele "sentar" sobre a borda do painel
    const labelMask = this.add
      .rectangle(cx, panelY - 32, 92, 12, 0x0d0a1e)
      .setAlpha(0)
      .setDepth(5);

    const label = this.add
      .text(cx, panelY - 32, 'CONTROLES', {
        fontFamily: FONT.family,
        fontSize: '9px',
        color: '#a8853f',
      })
      .setResolution(FONT.resolution)
      .setLetterSpacing(4)
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(6);

    const ctrl1 = this.add
      .text(cx, panelY - 10, 'Andar: Setas ou WASD     Interagir: E     Livro: J     Pistas: C', {
        fontFamily: FONT.family,
        fontSize: '13px',
        color: PALETTE.text.secondary,
      })
      .setResolution(FONT.resolution)
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(5);

    const ctrl2 = this.add
      .text(cx, panelY + 14, 'Fechar painéis: ESC     Conselho: TAB', {
        fontFamily: FONT.family,
        fontSize: '13px',
        color: PALETTE.text.secondary,
      })
      .setResolution(FONT.resolution)
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(5);

    this.tweens.add({ targets: panel, alpha: 0.85, duration: 400, delay: 1000 });
    this.tweens.add({ targets: labelMask, alpha: 1, duration: 400, delay: 1000 });
    this.tweens.add({ targets: [label, ctrl1, ctrl2], alpha: 1, duration: 400, delay: 1000 });
  }

  /** Escolha de papel: jogar como investigador Fiel ou como um Traidor secreto. */
  private buildRoleSelector(cx: number, height: number): void {
    const y = height * 0.79;
    const options: Array<{ role: PlayerRole; title: string; detail: string; x: number }> = [
      {
        role: 'investigator',
        title: 'INVESTIGADOR',
        detail: 'Descubra os Traidores',
        x: cx - 128,
      },
      {
        role: 'traitor',
        title: 'TRAIDOR',
        detail: 'Engane a mansao',
        x: cx + 128,
      },
    ];

    const boxes: Array<{
      role: PlayerRole;
      bg: Phaser.GameObjects.Rectangle;
      title: Phaser.GameObjects.Text;
      detail: Phaser.GameObjects.Text;
    }> = [];

    const refresh = () => {
      for (const box of boxes) {
        const selected = box.role === this.selectedPlayerRole;
        box.bg.setFillStyle(selected ? 0x2b1632 : 0x100d20, selected ? 0.98 : 0.9);
        box.bg.setStrokeStyle(selected ? 2 : 1, selected ? 0xd4a848 : 0x4a385f);
        box.title.setColor(selected ? '#f0d483' : '#d8d4f0');
        box.detail.setColor(selected ? '#e0cfa0' : '#8f89aa');
      }
    };

    const label = this.add
      .text(cx, y - 42, 'ESCOLHA SEU LADO', {
        fontFamily: FONT.family,
        fontSize: '10px',
        color: '#a8853f',
      })
      .setResolution(FONT.resolution)
      .setLetterSpacing(4)
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(6);

    options.forEach((option, i) => {
      const bg = this.add
        .rectangle(option.x, y, 226, 56, 0x100d20, 0.9)
        .setStrokeStyle(1, 0x4a385f)
        .setAlpha(0)
        .setDepth(5)
        .setInteractive({ useHandCursor: true });

      const title = this.add
        .text(option.x, y - 12, option.title, {
          fontFamily: FONT.family,
          fontSize: '14px',
          fontStyle: 'bold',
          color: '#d8d4f0',
        })
        .setResolution(FONT.resolution)
        .setLetterSpacing(2)
        .setOrigin(0.5)
        .setAlpha(0)
        .setDepth(6);

      const detail = this.add
        .text(option.x, y + 12, option.detail, {
          fontFamily: FONT.family,
          fontSize: '11px',
          color: '#8f89aa',
        })
        .setResolution(FONT.resolution)
        .setOrigin(0.5)
        .setAlpha(0)
        .setDepth(6);

      boxes.push({ role: option.role, bg, title, detail });

      const select = () => {
        this.selectedPlayerRole = option.role;
        refresh();
      };
      bg.on('pointerdown', select);
      title.setInteractive({ useHandCursor: true }).on('pointerdown', select);
      detail.setInteractive({ useHandCursor: true }).on('pointerdown', select);

      bg.on('pointerover', () => {
        if (this.selectedPlayerRole !== option.role) bg.setStrokeStyle(1, 0x8a6d2f);
      });
      bg.on('pointerout', refresh);

      this.tweens.add({ targets: [bg, title, detail], alpha: 1, duration: 350, delay: 1120 + i * 90 });
    });

    this.tweens.add({ targets: label, alpha: 1, duration: 350, delay: 1080 });
    this.input.keyboard!.on('keydown-I', () => {
      this.selectedPlayerRole = 'investigator';
      refresh();
    });
    this.input.keyboard!.on('keydown-T', () => {
      this.selectedPlayerRole = 'traitor';
      refresh();
    });
    refresh();
  }
  /** Botão COMEÇAR: gradiente, brilho pulsante e seta direcional. */
  private buildStartButton(cx: number, height: number): void {
    const y = height * 0.905;
    const btnW = 216;
    const btnH = 46;

    const glow = this.add
      .ellipse(cx, y + 4, btnW + 40, btnH + 26, GOLD_DARK, 0.1)
      .setAlpha(0)
      .setDepth(4);

    const bgGraphics = this.add.graphics().setAlpha(0).setDepth(5);
    bgGraphics.fillGradientStyle(0x2a1c3e, 0x2a1c3e, 0x160e26, 0x160e26, 1);
    bgGraphics.fillRoundedRect(cx - btnW / 2, y - btnH / 2, btnW, btnH, 10);
    bgGraphics.lineStyle(1, 0x8a6d2f, 0.9);
    bgGraphics.strokeRoundedRect(cx - btnW / 2, y - btnH / 2, btnW, btnH, 10);

    const labelText = this.add
      .text(cx - 10, y, 'COMEÇAR', {
        fontFamily: FONT.family,
        fontSize: '19px',
        fontStyle: 'bold',
        color: '#f0d483',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setResolution(FONT.resolution)
      .setLetterSpacing(3)
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(6);

    const arrow = this.add
      .text(cx + labelText.width / 2 + 6, y, '→', {
        fontFamily: FONT.family,
        fontSize: '19px',
        fontStyle: 'bold',
        color: '#d4a848',
      })
      .setResolution(FONT.resolution)
      .setOrigin(0, 0.5)
      .setAlpha(0)
      .setDepth(6);

    const hitArea = this.add
      .rectangle(cx, y, btnW, btnH, 0x000000, 0.001)
      .setDepth(7)
      .setInteractive({ useHandCursor: true });

    this.tweens.add({ targets: [bgGraphics, labelText, arrow], alpha: 1, duration: 400, delay: 1260 });
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.5, to: 1 },
      scaleX: 1.06,
      scaleY: 1.1,
      duration: 950,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 1200,
    });

    const parts = [bgGraphics, labelText, arrow];
    hitArea.on('pointerover', () => {
      this.tweens.add({ targets: parts, scaleX: 1.04, scaleY: 1.04, duration: 140 });
      this.tweens.add({ targets: arrow, x: cx + labelText.width / 2 + 11, duration: 140 });
    });
    hitArea.on('pointerout', () => {
      this.tweens.add({ targets: parts, scaleX: 1, scaleY: 1, duration: 140 });
      this.tweens.add({ targets: arrow, x: cx + labelText.width / 2 + 6, duration: 140 });
    });

    const onStart = () => {
      startNewRun(this.selectedPlayerRole);
      fadeOutTo(this, 'GameScene');
    };
    hitArea.on('pointerdown', () => {
      this.tweens.add({ targets: parts, scaleX: 0.97, scaleY: 0.97, duration: 70, yoyo: true });
      onStart();
    });
    this.input.keyboard!.once('keydown-SPACE', onStart);
    this.input.keyboard!.once('keydown-ENTER', onStart);
  }

  /** Hóspedes atravessam o pátio diante da mansão — a casa está viva. */
  private spawnGuestParade(width: number, height: number): void {
    const walkers = ['helena', 'otto', 'rosa', 'tulio', 'bento'];
    const y = height - 26;

    walkers.forEach((id, i) => {
      const fromLeft = i % 2 === 0;
      const sprite = this.add
        .sprite(fromLeft ? -20 - i * 130 : width + 20 + i * 130, y, `npc-${id}-2`)
        .setScale(1.6)
        .setAlpha(0.88)
        .setDepth(3)
        .setFlipX(!fromLeft);

      // Passada alternada
      this.time.addEvent({
        delay: 170,
        loop: true,
        callback: () => {
          const next = sprite.texture.key.endsWith('-2') ? 3 : 2;
          sprite.setTexture(`npc-${id}-${next}`);
        },
      });

      const cross = () => {
        const target = sprite.flipX ? -30 : width + 30;
        this.tweens.add({
          targets: sprite,
          x: target,
          duration: (Math.abs(target - sprite.x) / 34) * 1000,
          onComplete: () => {
            sprite.setFlipX(!sprite.flipX);
            cross();
          },
        });
      };
      cross();
    });
  }

  /**
   * Fachada da mansão como faixa de fundo no rodapé. Fica abaixo dos
   * painéis de papel/botão (que ocupam 0.72h..0.94h) — só a silhueta e as
   * janelas acesas aparecem, sem disputar espaço com a interface.
   */
  private drawMansionFacade(cx: number, height: number, width: number): void {
    const g = this.add.graphics().setDepth(1).setAlpha(0.85);
    const baseY = height;
    const silY = height * 0.88;
    const darkColor = 0x0a0716;

    g.fillStyle(darkColor, 1);
    g.fillRect(cx - 160, silY, 320, baseY - silY);
    g.fillRect(cx - 250, silY + 24, 95, baseY - silY - 24);
    g.fillRect(cx + 155, silY + 24, 95, baseY - silY - 24);
    g.fillRect(cx - 32, silY - 48, 64, 48);
    g.fillRect(cx - 226, silY - 22, 34, 22);
    g.fillRect(cx + 192, silY - 22, 34, 22);
    g.fillTriangle(cx, silY - 78, cx - 36, silY - 48, cx + 36, silY - 48);
    g.fillTriangle(cx - 209, silY - 42, cx - 226, silY - 22, cx - 192, silY - 22);
    g.fillTriangle(cx + 209, silY - 42, cx + 192, silY - 22, cx + 226, silY - 22);

    // Janelas de tile iluminadas sobre a silhueta (as centrais ficam atrás
    // do botão COMEÇAR, que tem fundo opaco — só as laterais aparecem)
    const windows = [
      { x: cx - 110, y: silY + 26 },
      { x: cx - 45, y: silY + 26 },
      { x: cx + 45, y: silY + 26 },
      { x: cx + 110, y: silY + 26 },
      { x: cx - 210, y: silY + 48 },
      { x: cx + 210, y: silY + 48 },
    ];

    windows.forEach((w) => {
      this.add.image(w.x, w.y, SHEET_KEYS.base, base(45, 3)).setScale(1.8).setDepth(2);
      const glow = this.add
        .circle(w.x, w.y, 26, PALETTE.atmosphere.windowLight, 0.08)
        .setDepth(1);
      this.tweens.add({
        targets: glow,
        alpha: 0.17,
        scale: 1.2,
        duration: 900 + Math.random() * 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 1200,
      });
    });

    // Névoa subindo da base
    const fogG = this.add.graphics().setDepth(2);
    fogG.fillGradientStyle(0x1a1030, 0x1a1030, 0x1a1030, 0x1a1030, 0, 0, 0.55, 0.55);
    fogG.fillRect(0, height * 0.9, width, height * 0.1);
  }
}
