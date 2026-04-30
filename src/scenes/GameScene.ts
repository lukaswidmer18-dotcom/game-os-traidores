import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { NPC } from '../entities/NPC';
import { NPC_DATA, NPCData } from '../data/npcs';
import { DialogueSystem } from '../systems/DialogueSystem';
import { ClueSystem } from '../systems/ClueSystem';
import { TrustSystem } from '../systems/TrustSystem';
import { DaySystem } from '../systems/DaySystem';
import { HUD } from '../ui/HUD';
import { DialogueBox } from '../ui/DialogueBox';
import { CluePanel } from '../ui/CluePanel';
import { PALETTE, SIZES, SPECTACLE } from '../design/constants';
import { fadeIn, fadeOutTo, burst, spawnDust, hoverBtn, mansionGrid } from '../design/effects';

// --- Layout constants ---
const W = 800;
const H = 560;

interface Room {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const ROOMS: Room[] = [
  { id: 'hall',      label: 'Salão Principal',       x: 200, y: 180, w: 220, h: 160 },
  { id: 'library',   label: 'Biblioteca',            x: 490, y: 80,  w: 180, h: 130 },
  { id: 'kitchen',   label: 'Cozinha',               x: 490, y: 280, w: 180, h: 120 },
  { id: 'garden',    label: 'Jardim',                x: 80,  y: 80,  w: 140, h: 120 },
  { id: 'corridor',  label: 'Corredor dos Quartos',  x: 200, y: 400, w: 220, h: 80  },
  { id: 'council',   label: 'Mesa do Conselho',      x: 490, y: 420, w: 180, h: 100 },
];

// NPC starting positions (center of each room)
const NPC_POSITIONS: Record<string, { x: number; y: number }> = {
  helena:  { x: 510, y: 145 },
  bento:   { x: 250, y: 250 },
  marina:  { x: 540, y: 335 },
  davi:    { x: 140, y: 135 },
  cassia:  { x: 270, y: 435 },
  otto:    { x: 300, y: 220 },
};

// Clue pickup positions
const CLUE_POSITIONS: Record<string, { x: number; y: number }> = {
  clue_glove:     { x: 550, y: 120 },
  clue_note:      { x: 510, y: 315 },
  clue_footprint: { x: 130, y: 155 },
  clue_diary:     { x: 240, y: 420 },
  clue_map:       { x: 220, y: 200 },
  clue_candle:    { x: 540, y: 455 },
};

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private npcs: NPC[] = [];
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private clueMarkers: Map<string, Phaser.GameObjects.Rectangle> = new Map();

  private dialogueSystem!: DialogueSystem;
  private clueSystem!: ClueSystem;
  private trustSystem!: TrustSystem;
  private daySystem!: DaySystem;

  private hud!: HUD;
  private dialogueBox!: DialogueBox;
  private cluePanel!: CluePanel;

  private currentDay: number = 1;
  private aliveNPCs: NPCData[] = [];

  private interactKey!: Phaser.Input.Keyboard.Key;
  private clueKey!: Phaser.Input.Keyboard.Key;
  private activeNPC: NPC | null = null;
  private nearClue: string | null = null;
  private inputCooldown: number = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { day?: number; aliveNPCs?: NPCData[] }): void {
    this.currentDay = data.day ?? 1;
    this.aliveNPCs = data.aliveNPCs
      ? data.aliveNPCs.map((n) => ({ ...n }))
      : NPC_DATA.map((n) => ({ ...n }));
  }

  create(): void {
    fadeIn(this);

    this.dialogueSystem = new DialogueSystem();
    this.clueSystem = new ClueSystem();
    this.trustSystem = new TrustSystem();
    this.daySystem = new DaySystem();
    for (let i = 1; i < this.currentDay; i++) this.daySystem.advanceDay();

    this.trustSystem.initialize(this.aliveNPCs);

    this.buildMap();
    this.spawnPlayer();
    this.spawnNPCs();
    this.spawnClueMarkers();
    this.setupUI();
    this.setupInput();
    this.showDayIntro();
  }

  // --- Map building ---

  private buildMap(): void {
    // Base floor with richer dark color
    this.add.rectangle(W / 2, H / 2, W, H, PALETTE.bg.mansion).setDepth(-10);

    // Grid texture overlay
    mansionGrid(this, W, H);

    // Sparse ambient dust
    spawnDust(this, W, H, 10);

    this.walls = this.physics.add.staticGroup();

    for (const room of ROOMS) {
      const cx = room.x + room.w / 2;
      const cy = room.y + room.h / 2;

      // Room floor with slight inner glow
      this.add.rectangle(cx, cy, room.w, room.h, PALETTE.bg.mansionRoom).setDepth(-9);
      // Inner floor highlight (subtle)
      this.add.rectangle(cx, cy, room.w - 8, room.h - 8, 0x1e1a2e, 0.4).setDepth(-8);

      // Walls (4 sides)
      this.addWall(room.x, cy, 4, room.h);
      this.addWall(room.x + room.w, cy, 4, room.h);
      this.addWall(cx, room.y, room.w, 4);
      this.addWall(cx, room.y + room.h, room.w, 4);

      this.add
        .text(cx, room.y + 9, room.label, {
          fontSize: '8px',
          color: PALETTE.text.hint,
        })
        .setOrigin(0.5, 0)
        .setDepth(-7);
    }
  }

  private addWall(x: number, y: number, w: number, h: number): void {
    const rect = this.add.rectangle(x, y, w, h, PALETTE.bg.wall).setDepth(-9);
    this.physics.add.existing(rect, true);
    this.walls.add(rect);
  }

  // --- Spawning ---

  private spawnPlayer(): void {
    this.player = new Player(this, 310, 260);
    this.physics.add.collider(this.player.sprite, this.walls);
  }

  private spawnNPCs(): void {
    this.npcs = [];
    for (const npcData of this.aliveNPCs) {
      const pos = NPC_POSITIONS[npcData.id];
      if (!pos) continue;
      const npc = new NPC(this, pos.x, pos.y, npcData);
      this.npcs.push(npc);
    }
  }

  private spawnClueMarkers(): void {
    for (const [id, pos] of Object.entries(CLUE_POSITIONS)) {
      const allClues = this.clueSystem['clues'] as import('../data/clues').Clue[];
      const clue = allClues.find((c) => c.id === id);
      if (!clue || clue.dayAvailable > this.currentDay || clue.collected) continue;

      const marker = this.add
        .rectangle(pos.x, pos.y, SIZES.clueMarker, SIZES.clueMarker, 0xffee44)
        .setDepth(2);

      // Bob up and down
      this.tweens.add({
        targets: marker,
        y: pos.y - 4,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Gentle glow pulse
      this.tweens.add({
        targets: marker,
        alpha: { from: 0.7, to: 1 },
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: 250,
      });

      marker.setData('clueId', id);
      this.clueMarkers.set(id, marker);
    }
  }

  private setupUI(): void {
    this.hud = new HUD(this, W);
    this.dialogueBox = new DialogueBox(this, W, H);
    this.cluePanel = new CluePanel(this, W, H);
    this.hud.setDay(this.currentDay);
    this.hud.setClueCount(this.clueSystem.getCollected().length);
  }

  private setupInput(): void {
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.clueKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.C);
  }

  // --- Day intro ---

  private showDayIntro(): void {
    const story = this.daySystem.getCurrentStory();
    this.dialogueBox.show('Narrador', story.intro);
    this.player.freeze();
  }

  // --- Update loop ---

  update(_time: number, delta: number): void {
    if (this.inputCooldown > 0) {
      this.inputCooldown -= delta;
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      if (this.dialogueBox.isVisible()) {
        this.dialogueBox.hide();
        return;
      }
      if (this.cluePanel.isVisible()) return;
      this.tryInteract();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.clueKey)) {
      if (this.dialogueBox.isVisible()) return;
      this.cluePanel.toggle(this.clueSystem.getCollected());
      return;
    }

    if (!this.dialogueBox.isVisible() && !this.cluePanel.isVisible()) {
      this.player.update();
      this.checkProximity();
    } else {
      this.player.freeze();
    }
  }

  private checkProximity(): void {
    let nearNPC: NPC | null = null;
    let nearestDist = Infinity;

    for (const npc of this.npcs) {
      const dx = npc.x - this.player.x;
      const dy = npc.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 40 && dist < nearestDist) {
        nearestDist = dist;
        nearNPC = npc;
      }
    }

    this.activeNPC = nearNPC;

    // Update proximity rings
    for (const npc of this.npcs) {
      npc.setProximityVisible(npc === nearNPC);
    }

    let nearClueId: string | null = null;
    for (const [id, marker] of this.clueMarkers.entries()) {
      if (!marker.visible) continue;
      const dx = marker.x - this.player.x;
      const dy = marker.y - this.player.y;
      if (Math.sqrt(dx * dx + dy * dy) < 28) {
        nearClueId = id;
        break;
      }
    }
    this.nearClue = nearClueId;

    if (nearNPC) {
      this.hud.setInteractHint(`[E] falar com ${nearNPC.data.name}`);
    } else if (nearClueId) {
      this.hud.setInteractHint('[E] coletar pista');
    } else {
      this.hud.setInteractHint('');
    }
  }

  private tryInteract(): void {
    if (this.nearClue) {
      const clue = this.clueSystem.collectClue(this.nearClue, this.trustSystem);
      if (clue) {
        const marker = this.clueMarkers.get(this.nearClue);
        if (marker) {
          this.tweens.killTweensOf(marker);
          // Burst then hide
          burst(this, marker.x, marker.y, SPECTACLE.burstCount, PALETTE.particle.cluePickup);
          this.cameras.main.shake(80, 0.004);
          marker.setVisible(false);
        }
        this.hud.setClueCount(this.clueSystem.getCollected().length);
        this.dialogueBox.show('Pista encontrada', clue.description);
        this.nearClue = null;
        this.inputCooldown = 200;
        return;
      }
    }

    if (this.activeNPC) {
      const line = this.dialogueSystem.getNextLine(this.activeNPC.data.id, this.currentDay);
      this.dialogueBox.show(this.activeNPC.data.name, line);
      this.trustSystem.increaseTrust(this.activeNPC.data.id, 5);
      this.inputCooldown = 200;
      this.checkGoToCouncil();
    }
  }

  private councilTriggered = false;

  private checkGoToCouncil(): void {
    if (this.councilTriggered) return;

    const interacted = this.npcs.filter(
      (n) => this.trustSystem.getTrust(n.data.id) > n.data.trustLevel,
    ).length;

    if (interacted >= 2) {
      this.time.delayedCall(300, () => {
        if (!this.dialogueBox.isVisible()) {
          this.showCouncilPrompt();
        }
      });
    }
  }

  private showCouncilPrompt(): void {
    if (this.councilTriggered) return;
    this.councilTriggered = true;

    const { width, height } = this.scale;
    const btn = this.add
      .text(width / 2, height - 20, '[ IR PARA O CONSELHO → ]', {
        fontSize: '11px',
        color: PALETTE.text.golden,
        stroke: '#000000',
        strokeThickness: 2,
        backgroundColor: '#111133',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(12)
      .setInteractive({ useHandCursor: true });

    hoverBtn(this, btn, PALETTE.text.golden);

    const goToCouncil = () =>
      fadeOutTo(this, 'CouncilScene', {
        day: this.currentDay,
        aliveNPCs: this.aliveNPCs,
        clues: this.clueSystem.getCollected(),
        trustSystem: this.trustSystem,
      });

    btn.on('pointerdown', goToCouncil);
    this.input.keyboard!.once('keydown-TAB', goToCouncil);
  }
}
