import Phaser from 'phaser';
import { ensureRuntimeTextures, TEXTURE_KEYS } from '../assets/runtimeTextures';
import { CLUE_POSITIONS, ROOMS, WALL_THICKNESS, WORLD_HEIGHT, WORLD_WIDTH, getNPCSpawnPosition } from '../data/world';
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
import { fadeIn, fadeOutTo, burst, spawnDust, hoverBtn, mansionGrid, roomGlow, candleFlicker } from '../design/effects';

/*
// --- Layout constants ---
const ROOMS_LEGACY = [
  { id: 'hall',      label: 'Salão Principal',       x: 200, y: 180, w: 220, h: 160 },
  { id: 'library',   label: 'Biblioteca',            x: 490, y: 80,  w: 180, h: 130 },
  { id: 'kitchen',   label: 'Cozinha',               x: 490, y: 280, w: 180, h: 120 },
  { id: 'garden',    label: 'Jardim',                x: 80,  y: 80,  w: 140, h: 120 },
  { id: 'corridor',  label: 'Corredor dos Quartos',  x: 200, y: 400, w: 220, h: 80  },
  { id: 'council',   label: 'Mesa do Conselho',      x: 490, y: 420, w: 180, h: 100 },
];

// Per-room ambient glow color
const ROOM_GLOW_LEGACY: Record<string, number> = {
  hall:      PALETTE.room.hall,
  library:   PALETTE.room.library,
  kitchen:   PALETTE.room.kitchen,
  garden:    PALETTE.room.garden,
  corridor:  PALETTE.room.corridor,
  council:   PALETTE.room.council,
};

// NPC starting positions (center of each room)
const NPC_POSITIONS_LEGACY: Record<string, { x: number; y: number }> = {
  helena:  { x: 510, y: 145 },
  bento:   { x: 250, y: 250 },
  marina:  { x: 540, y: 335 },
  davi:    { x: 140, y: 135 },
  cassia:  { x: 270, y: 435 },
  otto:    { x: 300, y: 220 },
};

// Clue pickup positions
const CLUE_POSITIONS_LEGACY: Record<string, { x: number; y: number }> = {
  clue_glove:     { x: 550, y: 120 },
  clue_note:      { x: 510, y: 315 },
  clue_footprint: { x: 130, y: 155 },
  clue_diary:     { x: 240, y: 420 },
  clue_map:       { x: 220, y: 200 },
  clue_candle:    { x: 540, y: 455 },
};
*/

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private npcs: NPC[] = [];
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private clueMarkers: Map<string, Phaser.GameObjects.Image> = new Map();

  private dialogueSystem!: DialogueSystem;
  private clueSystem!: ClueSystem;
  private trustSystem!: TrustSystem;
  private daySystem!: DaySystem;

  private hud!: HUD;
  private dialogueBox!: DialogueBox;
  private cluePanel!: CluePanel;

  private currentDay = 1;
  private aliveNPCs: NPCData[] = [];

  private interactKey!: Phaser.Input.Keyboard.Key;
  private clueKey!: Phaser.Input.Keyboard.Key;
  private activeNPC: NPC | null = null;
  private nearClue: string | null = null;
  private inputCooldown = 0;
  private councilTriggered = false;

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
    ensureRuntimeTextures(this);
    fadeIn(this);
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

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
    this.add
      .tileSprite(
        WORLD_WIDTH / 2,
        WORLD_HEIGHT / 2,
        WORLD_WIDTH,
        WORLD_HEIGHT,
        TEXTURE_KEYS.floor,
      )
      .setTint(PALETTE.bg.mansion)
      .setDepth(-11);

    mansionGrid(this, WORLD_WIDTH, WORLD_HEIGHT);
    spawnDust(this, WORLD_WIDTH, WORLD_HEIGHT, 12);

    this.walls = this.physics.add.staticGroup();

    for (const room of ROOMS) {
      const cx = room.x + room.w / 2;
      const cy = room.y + room.h / 2;

      this.add
        .tileSprite(cx, cy, room.w, room.h, room.floorTexture)
        .setDepth(-9)
        .setAlpha(room.id === 'garden' ? 0.95 : 1);
      this.add
        .rectangle(cx, cy, room.w - 10, room.h - 10, 0x1e1a2e, room.id === 'garden' ? 0.2 : 0.3)
        .setDepth(-8);

      roomGlow(this, cx, cy, room.glowColor, Math.min(room.w, room.h) * 0.42);

      if (room.id === 'library' || room.id === 'council') {
        candleFlicker(this, cx - room.w * 0.38, cy);
        candleFlicker(this, cx + room.w * 0.38, cy);
      }

      this.addRoomWalls(room);
      this.addDoorGlow(room);

      this.add
        .text(cx, room.y + 10, room.label, {
          fontSize: '9px',
          color: PALETTE.text.hint,
        })
        .setOrigin(0.5, 0)
        .setDepth(-7);
    }
  }

  private addRoomWalls(room: (typeof ROOMS)[number]): void {
    const leftDoors = room.doorways.filter((door) => door.side === 'left');
    const rightDoors = room.doorways.filter((door) => door.side === 'right');
    const topDoors = room.doorways.filter((door) => door.side === 'top');
    const bottomDoors = room.doorways.filter((door) => door.side === 'bottom');

    this.addVerticalWall(room.x, room.y, room.h, leftDoors);
    this.addVerticalWall(room.x + room.w, room.y, room.h, rightDoors);
    this.addHorizontalWall(room.x, room.y, room.w, topDoors);
    this.addHorizontalWall(room.x, room.y + room.h, room.w, bottomDoors);
  }

  private addVerticalWall(
    x: number,
    top: number,
    height: number,
    doorways: Array<{ offset: number; size?: number }>,
  ): void {
    const sorted = [...doorways].sort((a, b) => a.offset - b.offset);
    let start = top;

    for (const doorway of sorted) {
      const size = doorway.size ?? 34;
      const doorTop = Phaser.Math.Clamp(top + doorway.offset - size / 2, top, top + height);
      const doorBottom = Phaser.Math.Clamp(top + doorway.offset + size / 2, top, top + height);
      if (doorTop > start) {
        this.addWall(x, (start + doorTop) / 2, WALL_THICKNESS, doorTop - start);
      }
      start = doorBottom;
    }

    if (start < top + height) {
      this.addWall(x, (start + top + height) / 2, WALL_THICKNESS, top + height - start);
    }
  }

  private addHorizontalWall(
    left: number,
    y: number,
    width: number,
    doorways: Array<{ offset: number; size?: number }>,
  ): void {
    const sorted = [...doorways].sort((a, b) => a.offset - b.offset);
    let start = left;

    for (const doorway of sorted) {
      const size = doorway.size ?? 34;
      const doorLeft = Phaser.Math.Clamp(left + doorway.offset - size / 2, left, left + width);
      const doorRight = Phaser.Math.Clamp(left + doorway.offset + size / 2, left, left + width);
      if (doorLeft > start) {
        this.addWall((start + doorLeft) / 2, y, doorLeft - start, WALL_THICKNESS);
      }
      start = doorRight;
    }

    if (start < left + width) {
      this.addWall((start + left + width) / 2, y, left + width - start, WALL_THICKNESS);
    }
  }

  private addDoorGlow(room: (typeof ROOMS)[number]): void {
    for (const doorway of room.doorways) {
      const size = doorway.size ?? 34;
      if (doorway.side === 'left' || doorway.side === 'right') {
        const x = doorway.side === 'left' ? room.x : room.x + room.w;
        const y = room.y + doorway.offset;
        this.add.rectangle(x, y, 8, size - 6, room.glowColor, 0.18).setDepth(-7);
      } else {
        const x = room.x + doorway.offset;
        const y = doorway.side === 'top' ? room.y : room.y + room.h;
        this.add.rectangle(x, y, size - 6, 8, room.glowColor, 0.18).setDepth(-7);
      }
    }
  }

  private addWall(x: number, y: number, w: number, h: number): void {
    const wall = this.add
      .tileSprite(x, y, Math.max(w, 4), Math.max(h, 4), TEXTURE_KEYS.wall)
      .setDepth(-8);
    this.physics.add.existing(wall, true);
    this.walls.add(wall);
  }

  // --- Spawning ---

  private spawnPlayer(): void {
    this.player = new Player(this, 310, 260);
    this.physics.add.collider(this.player.sprite, this.walls);
  }

  private spawnNPCs(): void {
    this.npcs = [];
    for (const npcData of this.aliveNPCs) {
      const pos = getNPCSpawnPosition(npcData);
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
        .image(pos.x, pos.y, TEXTURE_KEYS.clue)
        .setDepth(2)
        .setScale(0.9);

      // Bob up and down
      this.tweens.add({
        targets: marker,
        y: pos.y - 5,
        duration: 650,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Glow pulse
      this.tweens.add({
        targets: marker,
        alpha: { from: 0.6, to: 1 },
        duration: 450,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: 225,
      });

      // Golden glow ring behind marker
      const glowRing = this.add
        .circle(pos.x, pos.y, SIZES.clueMarker + 8, 0xffee44, 0.08)
        .setDepth(1);
      this.tweens.add({
        targets: glowRing,
        alpha: 0.22,
        scale: 1.3,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      marker.setData('clueId', id);
      marker.setData('glowRing', glowRing);
      this.clueMarkers.set(id, marker);
    }
  }

  private setupUI(): void {
    this.hud = new HUD(this, WORLD_WIDTH);
    this.dialogueBox = new DialogueBox(this, WORLD_WIDTH, WORLD_HEIGHT);
    this.cluePanel = new CluePanel(this, WORLD_WIDTH, WORLD_HEIGHT);
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
      this.player.update(delta);
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
          const glowRing = marker.getData('glowRing') as Phaser.GameObjects.Arc | undefined;
          if (glowRing) {
            this.tweens.killTweensOf(glowRing);
            glowRing.destroy();
          }
          burst(this, marker.x, marker.y, SPECTACLE.burstCount, PALETTE.particle.cluePickup);
          this.cameras.main.shake(80, 0.005);
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
