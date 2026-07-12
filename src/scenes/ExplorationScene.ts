import Phaser from 'phaser';
import { ensureRuntimeTextures, TEXTURE_KEYS } from '../assets/runtimeTextures';
import { ensurePortraits } from '../assets/portraits';
import { ensureCharacterArt } from '../assets/characterArt';
import {
  base,
  indoor,
  EXTERIOR_FRAME,
  ROOM_FLOOR_FRAMES,
  SHEET_KEYS,
  WALL_FRAME,
} from '../assets/tileArt';
import {
  CLUE_POSITIONS,
  DOOR_SIZE,
  GATED_DOORS,
  GatedDoor,
  KEY_ITEMS,
  PLAYER_SPAWN,
  ROOMS,
  RoomEdge,
  SECRET_LEVERS,
  SecretLever,
  WALL_THICKNESS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  buildRoomGraph,
  getGatedDoorCenter,
  getNPCSpawnPosition,
} from '../data/world';
import { STORY_DAYS } from '../data/storyDays';
import { generateSpontaneousEvent } from '../data/spontaneousEvents';
import { Player } from '../entities/Player';
import { NPC } from '../entities/NPC';
import { NPCData } from '../data/npcs';
import { DialogueSystem } from '../systems/DialogueSystem';
import { InterrogationSystem, QuestionId, InterrogationOutcome } from '../systems/InterrogationSystem';
import { CutscenePlayer, CutsceneStep } from '../systems/CutscenePlayer';
import { ACTIONS_PER_DAY, getRun, RunState } from '../systems/RunState';
import { audio } from '../systems/AudioSystem';
import { HUD } from '../ui/HUD';
import { DialogueBox } from '../ui/DialogueBox';
import { Journal } from '../ui/Journal';
import { InterrogationPanel } from '../ui/InterrogationPanel';
import { FONT, PALETTE, SIZES, SPECTACLE } from '../design/constants';
import { fadeIn, fadeOutTo, burst, spawnDust, hoverBtn, roomGlow, candleFlicker } from '../design/effects';

export class ExplorationScene extends Phaser.Scene {
  private run!: RunState;
  private player!: Player;
  private npcs: NPC[] = [];
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private clueMarkers = new Map<string, Phaser.GameObjects.Image>();
  private keyMarkers = new Map<string, Phaser.GameObjects.Image>();
  private doorBlockers = new Map<string, Phaser.GameObjects.GameObject[]>();

  private dialogueSystem!: DialogueSystem;
  private interrogationSystem!: InterrogationSystem;

  private hud!: HUD;
  private dialogueBox!: DialogueBox;
  private journal!: Journal;
  private interrogationPanel!: InterrogationPanel;

  private interactKey!: Phaser.Input.Keyboard.Key;
  private clueKey!: Phaser.Input.Keyboard.Key;
  private journalKey!: Phaser.Input.Keyboard.Key;
  private escKey!: Phaser.Input.Keyboard.Key;

  private activeNPC: NPC | null = null;
  private nearClue: string | null = null;
  private nearKey: string | null = null;
  private nearDoor: GatedDoor | null = null;
  private nearLever: SecretLever | null = null;
  private inputCooldown = 0;

  private spokenTo = new Set<string>();
  private askedQuestions = new Set<string>();
  private actionsTaken = 0;
  private councilUnlocked = false;
  private councilButton: Phaser.GameObjects.Text | null = null;
  private eventsFired = 0;
  private eventTimer: Phaser.Time.TimerEvent | null = null;
  private roomGraph = buildRoomGraph();
  private routineTimer: Phaser.Time.TimerEvent | null = null;
  private chatTimer: Phaser.Time.TimerEvent | null = null;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private cutscene!: CutscenePlayer;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.run = getRun();
    this.resetDayState();

    ensureRuntimeTextures(this);
    ensureCharacterArt(this);
    ensurePortraits(this);
    fadeIn(this);
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.dialogueSystem = new DialogueSystem();
    this.interrogationSystem = new InterrogationSystem(this.dialogueSystem);

    this.buildMap();
    this.setupGatedDoors();
    this.spawnPlayer();
    this.spawnNPCs();
    this.spawnClueMarkers();
    this.spawnKeyItems();

    // Tudo criado até aqui é mundo; o que vem depois é UI de tela.
    const worldObjects = [...this.children.list];

    this.setupUI();
    this.setupInput();
    this.addVignette();
    this.setupCameras(worldObjects);

    this.cutscene = new CutscenePlayer(this, (objs) => this.claimUI(objs));
    this.startDayCinematic();
  }

  /**
   * Abertura cinematográfica: dia 1 apresenta a mansão; dias seguintes
   * mostram onde o corpo foi encontrado. Banner e narração vêm depois.
   */
  private startDayCinematic(): void {
    const cam = this.cameras.main;
    const beginDay = () => {
      cam.setZoom(2);
      cam.startFollow(this.player.sprite, true, 0.12, 0.12);
      audio.startAmbient('day');
      this.showDayBanner();
      this.showDayIntro();
      this.scheduleSpontaneousEvent();
    };

    if (this.run.day === 1) {
      cam.stopFollow();
      cam.setZoom(1.3);
      cam.centerOn(656, 224);
      const steps: CutsceneStep[] = [
        {
          caption: 'A Mansão Velhart guarda um segredo.',
          panTo: { x: 368, y: 260, duration: 1700 },
          hold: 650,
        },
        {
          caption: 'Oito hóspedes. Dois deles mentem.',
          panTo: { x: 928, y: 480, duration: 1900 },
          hold: 650,
        },
        {
          caption: 'Esta noite, alguém não vai dormir.',
          panTo: { x: 656, y: 720, duration: 1600 },
          hold: 650,
        },
        {
          caption: '',
          panTo: { x: this.player.x, y: this.player.y, duration: 1400 },
          zoomTo: { zoom: 2, duration: 1400 },
          hold: 200,
        },
      ];
      this.cutscene.play(steps, beginDay);
      return;
    }

    const victim = this.run.lastNightVictim;
    const room = victim ? ROOMS.find((r) => r.id === victim.startRoom) : undefined;
    if (victim && room) {
      cam.stopFollow();
      const crimeX = room.x + room.w / 2;
      const crimeY = room.y + room.h * 0.68;
      const steps: CutsceneStep[] = [
        { caption: 'Ao amanhecer, um grito ecoa pela mansão...', hold: 900 },
        {
          caption: `O corpo de ${victim.name} foi encontrado — ${room.label}.`,
          panTo: { x: crimeX, y: crimeY, duration: 1700 },
          hold: 1500,
        },
        {
          caption: '',
          panTo: { x: this.player.x, y: this.player.y, duration: 1300 },
          hold: 150,
        },
      ];
      this.cutscene.play(steps, beginDay);
      return;
    }

    beginDay();
  }

  /**
   * Duas câmeras: a principal segue o jogador com zoom 2x (só mundo);
   * a de UI fica parada em zoom 1 (só interface). Objetos criados depois
   * do create() entram via claimUI/claimWorld.
   */
  private setupCameras(worldObjects: Phaser.GameObjects.GameObject[]): void {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    cam.setZoom(2);
    cam.startFollow(this.player.sprite, true, 0.12, 0.12);

    const worldSet = new Set(worldObjects);
    const uiObjects = this.children.list.filter((obj) => !worldSet.has(obj));
    cam.ignore(uiObjects);

    this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.uiCamera.ignore(worldObjects);
  }

  /** Objeto de interface criado após o create() — só a câmera de UI o desenha. */
  private claimUI(objs: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[]): void {
    this.cameras.main.ignore(objs);
  }

  /** Objeto de mundo criado após o create() — a câmera de UI não o desenha. */
  private claimWorld(objs: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[]): void {
    this.uiCamera?.ignore(objs);
  }

  /** Escurecimento suave das bordas da tela — foco no centro. */
  private addVignette(): void {
    const { width, height } = this.scale;
    const g = this.add.graphics().setDepth(13).setScrollFactor(0);
    const steps = 5;
    for (let i = 0; i < steps; i++) {
      const alpha = 0.1 - i * 0.018;
      const inset = i * 14;
      g.fillStyle(0x000008, alpha);
      g.fillRect(0, inset, width, 14);
      g.fillRect(0, height - inset - 14, width, 14);
      g.fillRect(inset, 0, 14, height);
      g.fillRect(width - inset - 14, 0, 14, height);
    }
  }

  /** Título do dia em destaque, some sozinho. */
  private showDayBanner(): void {
    const story = STORY_DAYS[this.run.day - 1];
    const banner = this.add
      .text(this.scale.width / 2, this.scale.height * 0.32, story.title, {
        fontFamily: FONT.family,
        fontSize: '30px',
        color: '#ddbbff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setResolution(FONT.resolution)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(15)
      .setAlpha(0)
      .setScale(0.8);

    this.claimUI(banner);
    this.tweens.add({
      targets: banner,
      alpha: 1,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: banner,
          alpha: 0,
          y: banner.y - 18,
          delay: 1700,
          duration: 600,
          onComplete: () => banner.destroy(),
        });
      },
    });
  }

  /** Cenas Phaser reutilizam a instância entre restarts; estado do dia precisa zerar. */
  private resetDayState(): void {
    this.npcs = [];
    this.clueMarkers.clear();
    this.keyMarkers.clear();
    this.doorBlockers.clear();
    this.activeNPC = null;
    this.nearClue = null;
    this.nearKey = null;
    this.nearDoor = null;
    this.nearLever = null;
    this.inputCooldown = 0;
    this.spokenTo.clear();
    this.askedQuestions.clear();
    this.actionsTaken = 0;
    this.councilUnlocked = false;
    this.councilButton = null;
    this.eventsFired = 0;
    this.eventTimer?.destroy();
    this.eventTimer = null;
    this.routineTimer?.destroy();
    this.routineTimer = null;
    this.chatTimer?.destroy();
    this.chatTimer = null;
  }

  // --- Eventos espontâneos ---

  private scheduleSpontaneousEvent(): void {
    if (this.eventsFired >= 3) return;

    this.eventTimer = this.time.delayedCall(18000 + Math.random() * 17000, () => {
      this.fireSpontaneousEvent();
      this.scheduleSpontaneousEvent();
    });
  }

  private fireSpontaneousEvent(): void {
    this.eventsFired++;
    const event = generateSpontaneousEvent(this.run.aliveNPCs);

    for (const { npcId, delta } of event.suspicionDeltas) {
      this.run.trustSystem.increaseSuspicion(npcId, delta);
    }
    audio.blip();
    this.run.logEvent(event.text);
    this.showEventToast(event.text);
  }

  /** Banner discreto no topo — o mundo continua vivo sem travar o jogador. */
  private showEventToast(text: string): void {
    const toast = this.add
      .text(this.scale.width / 2, 66, text, {
        fontFamily: FONT.family,
        fontSize: '12px',
        color: '#e8ddb8',
        backgroundColor: '#141024',
        padding: { x: 14, y: 8 },
        wordWrap: { width: 560 },
        align: 'center',
      })
      .setResolution(FONT.resolution)
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(14)
      .setAlpha(0);

    this.claimUI(toast);
    this.tweens.add({
      targets: toast,
      alpha: 0.96,
      y: 74,
      duration: 350,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.time.delayedCall(5200, () => {
          this.tweens.add({
            targets: toast,
            alpha: 0,
            y: 66,
            duration: 400,
            onComplete: () => toast.destroy(),
          });
        });
      },
    });
  }

  // --- Mapa ---

  private buildMap(): void {
    // Exterior: pedra escurecida — a mansão à noite em volta dos cômodos
    this.add
      .tileSprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, SHEET_KEYS.base, EXTERIOR_FRAME)
      .setTint(0x2a2438)
      .setDepth(-11);

    // Degradê noturno sobre o exterior: frio no topo, brasa no rodapé
    const nightGrad = this.add.graphics().setDepth(-10);
    nightGrad.fillGradientStyle(0x05030e, 0x05030e, 0x2a1626, 0x2a1626, 0.5, 0.5, 0.35, 0.35);
    nightGrad.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    spawnDust(this, WORLD_WIDTH, WORLD_HEIGHT, 12);

    this.walls = this.physics.add.staticGroup();

    for (const room of ROOMS) {
      const cx = room.x + room.w / 2;
      const cy = room.y + room.h / 2;

      this.add
        .tileSprite(cx, cy, room.w, room.h, SHEET_KEYS.base, ROOM_FLOOR_FRAMES[room.id])
        .setDepth(-9);
      // Meia-luz sutil: mantém o clima noturno sem apagar a arte
      this.add.rectangle(cx, cy, room.w, room.h, 0x141026, 0.16).setDepth(-8);

      roomGlow(this, cx, cy, room.glowColor, Math.min(room.w, room.h) * 0.42);

      if (room.id === 'library' || room.id === 'council') {
        candleFlicker(this, cx - room.w * 0.38, cy);
        candleFlicker(this, cx + room.w * 0.38, cy);
      }

      this.addRoomWalls(room);
      this.addDoorGlow(room);
      this.decorateRoom(room);

      this.add
        .text(cx, room.y + room.h - 6, room.label.toUpperCase(), {
          fontFamily: FONT.family,
          fontSize: '9px',
          color: PALETTE.text.secondary,
          stroke: '#000000',
          strokeThickness: 3,
        })
        .setResolution(FONT.resolution)
        .setLetterSpacing(2)
        .setOrigin(0.5, 1)
        .setAlpha(0.85)
        .setDepth(-5);
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
      const size = doorway.size ?? DOOR_SIZE;
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
      const size = doorway.size ?? DOOR_SIZE;
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
      const size = doorway.size ?? DOOR_SIZE;
      let x: number;
      let y: number;
      if (doorway.side === 'left' || doorway.side === 'right') {
        x = doorway.side === 'left' ? room.x : room.x + room.w;
        y = room.y + doorway.offset;
      } else {
        x = room.x + doorway.offset;
        y = doorway.side === 'top' ? room.y : room.y + room.h;
      }

      // Porta fechada (trancada/secreta) não ganha brilho — não denuncia o vão
      if (this.findClosedGatedDoorAt(x, y)) continue;

      if (doorway.side === 'left' || doorway.side === 'right') {
        this.add.rectangle(x, y, 8, size - 6, room.glowColor, 0.18).setDepth(-7);
      } else {
        this.add.rectangle(x, y, size - 6, 8, room.glowColor, 0.18).setDepth(-7);
      }
    }
  }

  /** Porta condicionada ainda fechada cujo vão fica neste ponto global. */
  private findClosedGatedDoorAt(x: number, y: number): GatedDoor | null {
    for (const door of GATED_DOORS) {
      if (this.run.openedDoors.has(door.id)) continue;
      const center = getGatedDoorCenter(door);
      if (Math.abs(center.x - x) < 2 && Math.abs(center.y - y) < 2) return door;
    }
    return null;
  }

  /**
   * Bloqueios físicos sobre os vãos de portas trancadas/secretas.
   * Porta trancada aparece como porta de madeira com cadeado; porta
   * secreta se disfarça de parede comum até ser revelada.
   */
  private setupGatedDoors(): void {
    for (const door of GATED_DOORS) {
      if (this.run.openedDoors.has(door.id)) continue;

      const center = getGatedDoorCenter(door);
      const horizontal = door.side === 'top' || door.side === 'bottom';
      const w = horizontal ? DOOR_SIZE : WALL_THICKNESS;
      const h = horizontal ? WALL_THICKNESS : DOOR_SIZE;

      const blocker = this.add
        .tileSprite(center.x, center.y, w, h, SHEET_KEYS.base, WALL_FRAME)
        .setDepth(-7);
      if (door.kind === 'locked') {
        blocker.setTint(0x9a6a3a); // madeira, destoa da parede: convite a examinar
      }
      this.physics.add.existing(blocker, true);
      this.walls.add(blocker);

      const visuals: Phaser.GameObjects.GameObject[] = [blocker];
      if (door.kind === 'locked') {
        const lock = this.add.rectangle(center.x, center.y, 6, 7, 0xd8a838, 0.95).setDepth(-6);
        const hole = this.add.rectangle(center.x, center.y + 1, 2, 3, 0x1a1408, 1).setDepth(-6);
        visuals.push(lock, hole);
      }
      this.doorBlockers.set(door.id, visuals);
    }

    // Estante deslocada: mecanismo visível que revela a porta secreta
    for (const lever of SECRET_LEVERS) {
      this.placeBase(lever.x, lever.y, base(44, 12), -6);
      this.placeBase(lever.x + 16, lever.y, base(46, 12), -6);
    }
  }

  private openGatedDoor(door: GatedDoor): void {
    this.run.openedDoors.add(door.id);
    const visuals = this.doorBlockers.get(door.id) ?? [];
    for (const visual of visuals) {
      if (visual instanceof Phaser.GameObjects.TileSprite) {
        this.walls.remove(visual, true, true);
      } else {
        visual.destroy();
      }
    }
    this.doorBlockers.delete(door.id);

    const center = getGatedDoorCenter(door);
    this.claimWorld(burst(this, center.x, center.y, SPECTACLE.burstCount, 0xd8b868));
    this.cameras.main.shake(180, 0.0035);
    audio.creak();
    audio.stinger('discovery');
    this.run.logEvent(door.openText);
    this.dialogueBox.show('Descoberta', door.openText);
    this.inputCooldown = 220;
  }

  private spawnKeyItems(): void {
    for (const item of KEY_ITEMS) {
      if (this.run.items.has(item.id)) continue;

      const marker = this.add.image(item.x, item.y, TEXTURE_KEYS.key).setDepth(2);
      this.tweens.add({
        targets: marker,
        y: item.y - 4,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      const glowRing = this.add.circle(item.x, item.y, SIZES.clueMarker + 6, 0xd8a838, 0.1).setDepth(1);
      this.tweens.add({
        targets: glowRing,
        alpha: 0.24,
        scale: 1.25,
        duration: 650,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      marker.setData('glowRing', glowRing);
      this.keyMarkers.set(item.id, marker);
    }
  }

  private collectKey(itemId: string): void {
    const item = KEY_ITEMS.find((candidate) => candidate.id === itemId);
    const marker = this.keyMarkers.get(itemId);
    if (!item || !marker) return;

    this.run.items.add(item.id);
    audio.chime(true);
    this.claimWorld(burst(this, marker.x, marker.y, SPECTACLE.burstCount, 0xd8a838));
    (marker.getData('glowRing') as Phaser.GameObjects.Arc | undefined)?.destroy();
    marker.destroy();
    this.keyMarkers.delete(itemId);

    this.run.logEvent(`Você encontrou: ${item.name}.`);
    this.dialogueBox.show(item.name, item.description);
    this.nearKey = null;
    this.inputCooldown = 200;
  }

  /** Um tile do sheet de interiores como decoração (sem colisão). */
  private placeIndoor(x: number, y: number, frame: number, depth = -6): Phaser.GameObjects.Image {
    return this.add.image(x, y, SHEET_KEYS.indoor, frame).setDepth(depth);
  }

  /** Um tile do sheet base como decoração (sem colisão). */
  private placeBase(x: number, y: number, frame: number, depth = -6): Phaser.GameObjects.Image {
    return this.add.image(x, y, SHEET_KEYS.base, frame).setDepth(depth);
  }

  /** Mobília dos tilesets Kenney por cômodo — decoração, sem colisão. */
  private decorateRoom(room: (typeof ROOMS)[number]): void {
    const { x, y, w, h } = room;
    const cx = x + w / 2;
    const cy = y + h / 2;

    switch (room.id) {
      case 'foyer': {
        // Entrada da mansão: porta dupla ao norte com estandartes
        this.placeBase(cx - 9, y + 14, base(30, 6));
        this.placeBase(cx + 9, y + 14, base(31, 6));
        this.placeBase(cx - 40, y + 14, base(49, 1));
        this.placeBase(cx + 40, y + 14, base(51, 1));
        this.placeBase(x + 30, y + 16, base(29, 3)); // espelho oval
        this.placeBase(x + w - 30, y + 14, base(26, 8)); // relógio
        // Tapete de entrada (runner vertical) e candelabros de pé
        for (let row = 0; row < 4; row++) {
          this.placeIndoor(cx - 8, y + 46 + row * 16, indoor(23, row), -7);
          this.placeIndoor(cx + 8, y + 46 + row * 16, indoor(24, row), -7);
        }
        this.placeIndoor(cx - 56, y + 60, indoor(17, 7));
        this.placeIndoor(cx + 56, y + 60, indoor(17, 7));
        this.placeIndoor(x + 22, y + h - 26, indoor(16, 0)); // plantas
        this.placeIndoor(x + w - 22, y + h - 26, indoor(17, 0));
        break;
      }

      case 'office': {
        // Escritório: estantes, escrivaninha com vela e livro, quadro
        for (const [col, sx] of [[44, 26], [46, 42], [45, 58]] as const) {
          this.placeBase(x + sx, y + 18, base(col, 12));
          this.placeBase(x + sx, y + 34, base(col, 13));
        }
        this.placeBase(x + w - 60, y + 12, base(45, 3)); // janela iluminada
        this.placeIndoor(x + w - 28, y + 14, indoor(19, 12)); // quadro
        this.placeIndoor(cx - 8, cy + 6, indoor(1, 0)); // escrivaninha
        this.placeIndoor(cx + 8, cy + 6, indoor(2, 0));
        this.placeIndoor(cx - 26, cy + 6, indoor(0, 2)); // cadeira
        this.placeBase(cx - 8, cy + 4, base(50, 15), -5); // livro aberto
        this.placeIndoor(cx + 8, cy + 2, indoor(16, 6), -5); // vela
        this.placeBase(x + 24, y + h - 28, base(26, 0)); // barril de arquivo
        this.placeIndoor(x + w - 22, y + h - 26, indoor(16, 0)); // planta
        break;
      }

      case 'cellar': {
        // Adega: barris, sacos e prateleira baixa à luz de vela
        this.placeBase(x + 24, y + 20, base(26, 0));
        this.placeBase(x + 44, y + 20, base(27, 0));
        this.placeBase(x + 24, y + 40, base(26, 0));
        this.placeBase(x + w - 28, y + 20, base(44, 13)); // prateleira
        this.placeBase(x + w - 44, y + 20, base(45, 13));
        this.placeBase(x + 30, y + h - 30, base(51, 15)); // sacos
        this.placeBase(x + 48, y + h - 28, base(52, 15));
        this.placeBase(x + w - 30, y + h - 32, base(26, 0)); // mais barris
        this.placeBase(x + w - 48, y + h - 28, base(27, 0));
        this.placeIndoor(cx, cy, indoor(16, 6), -5); // vela solitária
        candleFlicker(this, cx, cy - 4);
        break;
      }

      case 'greenhouse': {
        // Estufa: canteiros em grade, plantas em vaso e cercas-vivas
        for (let i = 0; i < 3; i++) {
          this.placeBase(x + 50 + i * 60, y + 40, base(i % 3, 6));
          this.placeBase(x + 50 + i * 60, y + 90, base((i + 1) % 3, 6));
        }
        this.placeBase(x + 24, y + 20, base(15, 9)); // árvores
        this.placeBase(x + w - 26, y + 20, base(16, 9));
        this.placeBase(x + 60, y + h - 18, base(19, 10)); // cercas-vivas
        this.placeBase(x + 76, y + h - 18, base(20, 10));
        this.placeBase(x + w - 60, y + h - 18, base(21, 10));
        this.placeIndoor(x + 24, y + h - 30, indoor(16, 0)); // vasos
        this.placeIndoor(x + w - 24, y + h - 30, indoor(17, 0));
        this.placeIndoor(cx, y + h - 26, indoor(16, 0));
        break;
      }

      case 'library': {
        // Estantes cheias (2 tiles de altura) ao longo da parede superior
        const shelfCols = [44, 45, 46, 47, 45, 46, 47, 44];
        shelfCols.forEach((col, i) => {
          this.placeBase(x + 26 + i * 16, y + 18, base(col, 12));
          this.placeBase(x + 26 + i * 16, y + 34, base(col, 13));
        });
        this.placeBase(x + w - 52, y + 12, base(46, 3)); // janela com cortina
        this.placeIndoor(x + w - 24, y + 14, indoor(20, 12)); // quadro
        // Mesa de leitura com cadeiras, candelabro e livro aberto
        this.placeIndoor(cx - 8, y + h - 38, indoor(1, 0));
        this.placeIndoor(cx + 8, y + h - 38, indoor(2, 0));
        this.placeIndoor(cx - 26, y + h - 38, indoor(0, 2));
        this.placeIndoor(cx + 26, y + h - 38, indoor(3, 2));
        this.placeBase(cx - 8, y + h - 40, base(50, 15), -5); // livro aberto
        this.placeIndoor(cx + 8, y + h - 42, indoor(16, 6), -5); // vela
        this.placeIndoor(x + 18, y + h - 24, indoor(16, 0)); // planta
        break;
      }

      case 'kitchen': {
        // Bancada com pia, potes e panelas + fogão e armário
        const counterFrames = [indoor(0, 12), indoor(5, 12), indoor(4, 12), indoor(6, 12), indoor(1, 12)];
        counterFrames.forEach((frame, i) => this.placeIndoor(x + 24 + i * 16, y + 18, frame));
        this.placeIndoor(x + 24 + 5 * 16, y + 18, indoor(14, 14)); // fogão
        this.placeBase(x + 130, y + 12, base(45, 3)); // janela iluminada
        this.placeIndoor(x + w - 22, y + 20, indoor(13, 14)); // armário alto
        // Mesa central posta: peru assado e bule
        this.placeIndoor(cx - 8, cy + 8, indoor(1, 0));
        this.placeIndoor(cx + 8, cy + 8, indoor(2, 0));
        this.placeIndoor(cx - 26, cy + 8, indoor(0, 2));
        this.placeIndoor(cx + 26, cy + 8, indoor(3, 2));
        this.placeBase(cx - 8, cy + 6, base(54, 15), -5); // peru
        this.placeBase(cx + 8, cy + 6, base(55, 15), -5); // bule
        // Despensa: barril e sacos de farinha
        this.placeBase(x + 20, y + h - 28, base(26, 0));
        this.placeBase(x + 38, y + h - 26, base(51, 15));
        this.placeBase(x + 52, y + h - 26, base(52, 15));
        break;
      }

      case 'hall': {
        // Tapete central: runner 2x4 (o tile do sheet é um tapete de 2 colunas)
        for (let row = 0; row < 4; row++) {
          for (let col = 0; col < 2; col++) {
            this.placeIndoor(
              cx - 16 + 8 + col * 16,
              cy - 32 + 8 + row * 16,
              indoor(23 + col, row),
              -7,
            );
          }
        }
        // Lareira acesa na parede superior + espelho, janela, relógio e piano
        this.placeBase(cx, y + 16, base(54, 8));
        candleFlicker(this, cx, y + 18);
        this.placeBase(x + 28, y + 16, base(29, 3)); // espelho oval
        this.placeBase(cx - 44, y + 12, base(45, 2)); // janela em arco iluminada
        this.placeBase(x + w - 26, y + 14, base(26, 8)); // relógio de parede
        this.placeIndoor(x + w - 26, y + 34, indoor(24, 8)); // piano (teclas)
        this.placeIndoor(x + w - 26, y + 50, indoor(24, 9)); // piano (corpo)
        // Sofá de 3 lugares ao lado do tapete
        this.placeIndoor(cx - 62, cy, indoor(4, 7));
        this.placeIndoor(cx - 46, cy, indoor(5, 7));
        this.placeIndoor(cx - 30, cy, indoor(7, 7));
        this.placeIndoor(x + 20, y + h - 24, indoor(16, 0)); // plantas
        this.placeIndoor(x + w - 20, y + h - 24, indoor(17, 0));
        break;
      }

      case 'garden': {
        // Canteiros floridos, árvores e cercas-vivas
        this.placeBase(x + 30, y + 34, base(0, 6));
        this.placeBase(x + w - 34, y + 40, base(1, 6));
        this.placeBase(x + 20, y + 18, base(15, 9)); // árvore redonda
        this.placeBase(x + w - 22, y + 18, base(14, 9)); // árvore outonal
        this.placeBase(x + w - 26, y + h - 22, base(16, 9)); // pinheiro
        this.placeBase(x + 66, y + h - 16, base(19, 10)); // cerca-viva
        this.placeBase(x + 82, y + h - 16, base(20, 10));
        // Fonte central (desenho próprio — não há fonte no tileset)
        const g = this.add.graphics().setDepth(-6);
        g.fillStyle(0x3a4a5c, 1);
        g.fillCircle(cx, cy, 14);
        g.fillStyle(0x6c9ac2, 0.95);
        g.fillCircle(cx, cy, 9);
        g.fillStyle(0x9cc6e8, 0.8);
        g.fillCircle(cx - 3, cy - 3, 3);
        this.drawGraveyard(room);
        break;
      }

      case 'corridor': {
        // Portas dos quartos intercaladas com quadros e tochas na parede superior
        for (let d = 0; d < 4; d++) {
          this.placeBase(x + 40 + d * 68, y + 14, base(30, 6));
        }
        this.placeIndoor(x + 74, y + 12, indoor(19, 12), -7);
        this.placeIndoor(x + 210, y + 12, indoor(21, 12), -7);
        this.placeIndoor(x + 108, y + 12, indoor(20, 6), -7); // tochas
        this.placeIndoor(x + 244, y + 12, indoor(21, 6), -7);
        // Camas dos hóspedes encostadas na parede de baixo
        this.placeIndoor(x + 44, y + h - 22, indoor(12, 3));
        this.placeIndoor(x + 112, y + h - 22, indoor(14, 3));
        this.placeIndoor(x + 180, y + h - 22, indoor(13, 3));
        this.placeIndoor(x + 248, y + h - 22, indoor(15, 3));
        this.placeIndoor(x + w - 16, y + h - 60, indoor(16, 0)); // planta no fim
        break;
      }

      case 'council': {
        // Mesa longa de 5 segmentos com cadeiras dos dois lados
        const tableFrames = [indoor(0, 9), indoor(1, 9), indoor(1, 9), indoor(1, 9), indoor(2, 9)];
        tableFrames.forEach((frame, i) => this.placeIndoor(cx - 40 + i * 16, cy + 2, frame));
        for (let c = 0; c < 4; c++) {
          this.placeIndoor(cx - 34 + c * 22, cy - 18, indoor(1, 2), -7);
          this.placeIndoor(cx - 34 + c * 22, cy + 22, indoor(1, 2), -7);
        }
        // Candelabros dourados sobre a mesa
        this.placeIndoor(cx - 28, cy, indoor(16, 7), -5);
        this.placeIndoor(cx + 28, cy, indoor(18, 7), -5);
        this.placeBase(cx, y + 12, base(50, 0)); // estandarte da mansão
        this.placeIndoor(cx - 52, y + 12, indoor(20, 6), -7); // tochas na parede
        this.placeIndoor(cx + 52, y + 12, indoor(21, 6), -7);
        this.placeBase(x + 20, y + 12, base(46, 3)); // janelas com cortina
        this.placeBase(x + w - 20, y + 12, base(46, 3));
        break;
      }

      case 'chapel': {
        // Altar ao norte com estandartes e velas sempre acesas
        this.placeBase(cx, y + 14, base(50, 0)); // estandarte
        this.placeBase(cx - 28, y + 14, base(49, 1));
        this.placeBase(cx + 28, y + 14, base(51, 1));
        this.placeIndoor(cx - 16, y + 40, indoor(16, 7), -5); // candelabros do altar
        this.placeIndoor(cx + 16, y + 40, indoor(18, 7), -5);
        candleFlicker(this, cx - 16, y + 36);
        candleFlicker(this, cx + 16, y + 36);
        // Bancos de oração em duas fileiras
        for (let row = 0; row < 3; row++) {
          this.placeIndoor(cx - 24, y + 90 + row * 34, indoor(4, 7));
          this.placeIndoor(cx + 24, y + 90 + row * 34, indoor(7, 7));
        }
        this.placeBase(cx, y + 64, base(50, 15), -5); // missal aberto
        this.placeIndoor(x + 18, y + h - 24, indoor(16, 0)); // planta
        break;
      }

      case 'master': {
        // Cama de casal do anfitrião + escrivaninha com o livro-razão
        this.placeIndoor(cx - 8, y + 28, indoor(12, 3));
        this.placeIndoor(cx + 8, y + 28, indoor(13, 3));
        this.placeBase(x + 24, y + 14, base(29, 3)); // espelho oval
        this.placeBase(x + w - 26, y + 14, base(26, 8)); // relógio
        this.placeIndoor(cx - 8, cy + 24, indoor(1, 0)); // escrivaninha
        this.placeIndoor(cx + 8, cy + 24, indoor(2, 0));
        this.placeIndoor(cx - 26, cy + 24, indoor(0, 2)); // cadeira
        this.placeBase(cx - 8, cy + 22, base(50, 15), -5); // livro-razão aberto
        this.placeIndoor(cx + 8, cy + 20, indoor(16, 6), -5); // vela
        candleFlicker(this, cx + 8, cy + 16);
        this.placeIndoor(x + 20, y + h - 26, indoor(17, 0)); // planta
        break;
      }

      case 'basement': {
        // Caixotes, barris e teias — depósito esquecido da mansão
        this.placeBase(x + 26, y + 20, base(26, 0));
        this.placeBase(x + 44, y + 20, base(27, 0));
        this.placeBase(x + 26, y + 40, base(27, 0));
        this.placeBase(x + w - 30, y + 22, base(44, 13)); // prateleira empoeirada
        this.placeBase(x + w - 46, y + 22, base(45, 13));
        this.placeBase(x + 30, y + h - 28, base(51, 15)); // sacos
        this.placeBase(x + 48, y + h - 26, base(52, 15));
        this.placeBase(x + w - 32, y + h - 30, base(26, 0));
        this.placeIndoor(cx, cy - 10, indoor(16, 6), -5); // vela solitária
        candleFlicker(this, cx, cy - 14);
        break;
      }

      case 'crypt': {
        // Túmulos da família Velhart em duas fileiras solenes
        const tombFrames = [base(52, 11), base(51, 10), base(53, 9), base(51, 11)];
        tombFrames.forEach((frame, i) => {
          this.placeBase(x + 52 + i * 48, y + 46, frame);
          this.placeBase(x + 52 + i * 48, y + h - 44, tombFrames[(i + 2) % tombFrames.length]);
        });
        // Túmulo central de pedra com o pacto sobre ele
        this.placeBase(cx, cy, base(52, 10));
        this.placeIndoor(cx - 20, cy - 4, indoor(16, 7), -5); // candelabros votivos
        this.placeIndoor(cx + 20, cy - 4, indoor(18, 7), -5);
        candleFlicker(this, cx - 20, cy - 8);
        candleFlicker(this, cx + 20, cy - 8);
        this.placeIndoor(x + 24, y + 14, indoor(20, 6), -7); // tochas apagadas
        this.placeIndoor(x + w - 24, y + 14, indoor(21, 6), -7);
        break;
      }
    }
  }

  /** Cemitério no jardim: um túmulo por hóspede morto, com nome. */
  private drawGraveyard(room: (typeof ROOMS)[number]): void {
    const dead = this.run.roster.filter((npc) => !this.run.isAlive(npc.id));
    if (dead.length === 0) return;

    const graveFrames = [base(52, 11), base(51, 10), base(53, 9), base(51, 11), base(52, 10), base(53, 11)];

    dead.forEach((npc, i) => {
      const gx = room.x + 20 + i * 22;
      const gy = room.y + room.h - 40;
      this.placeBase(gx, gy, graveFrames[i % graveFrames.length]);

      // Nomes alternam acima/abaixo para não se sobrepor
      const labelY = i % 2 === 0 ? gy - 14 : gy + 13;
      this.add
        .text(gx, labelY, npc.name, {
          fontFamily: FONT.family,
          fontSize: '8px',
          color: '#b8b8cc',
          stroke: '#000000',
          strokeThickness: 2,
        })
        .setResolution(FONT.resolution)
        .setOrigin(0.5)
        .setDepth(-5);
    });
  }

  private addWall(x: number, y: number, w: number, h: number): void {
    const thickness = 10;
    const wall = this.add
      .tileSprite(x, y, Math.max(w, thickness), Math.max(h, thickness), SHEET_KEYS.base, WALL_FRAME)
      .setDepth(-7);
    this.physics.add.existing(wall, true);
    this.walls.add(wall);
  }

  // --- Spawns ---

  private spawnPlayer(): void {
    this.player = new Player(this, PLAYER_SPAWN.x, PLAYER_SPAWN.y);
    this.physics.add.collider(this.player.sprite, this.walls);
  }

  private spawnNPCs(): void {
    for (const npcData of this.run.aliveNPCs) {
      const pos = getNPCSpawnPosition(npcData);
      const npc = new NPC(this, pos.x, pos.y, npcData);
      npc.roomId = npcData.startRoom;

      const room = ROOMS.find((r) => r.id === npcData.startRoom);
      if (room) {
        npc.startWander({ x: room.x, y: room.y, w: room.w, h: room.h });
      }

      this.npcs.push(npc);
    }

    this.scheduleNPCRoutines();
    this.scheduleNPCChats();
  }

  // --- Rotinas dos NPCs: a mansão se movimenta ---

  /** De tempos em tempos, um NPC decide trocar de sala andando pelas portas. */
  private scheduleNPCRoutines(): void {
    this.routineTimer = this.time.addEvent({
      delay: 9000,
      loop: true,
      callback: () => {
        const candidates = this.npcs.filter(
          (npc) => !npc.traveling && npc.roomId && !this.isNearPlayerNPC(npc),
        );
        if (candidates.length === 0) return;
        const npc = candidates[Math.floor(Math.random() * candidates.length)];
        if (Math.random() < 0.45) this.sendNPCToNeighborRoom(npc);
      },
    });
  }

  private isNearPlayerNPC(npc: NPC): boolean {
    const dx = npc.x - this.player.x;
    const dy = npc.y - this.player.y;
    return Math.sqrt(dx * dx + dy * dy) < 60;
  }

  private sendNPCToNeighborRoom(npc: NPC): void {
    const edges: RoomEdge[] = this.roomGraph.get(npc.roomId) ?? [];
    if (edges.length === 0) return;

    const edge = edges[Math.floor(Math.random() * edges.length)];
    const dest = ROOMS.find((room) => room.id === edge.to);
    if (!dest) return;

    const margin = 30;
    const target = {
      x: dest.x + margin + Math.random() * (dest.w - margin * 2),
      y: dest.y + margin + Math.random() * (dest.h - margin * 2),
    };

    npc.roomId = dest.id;
    npc.travelAlong(
      [edge.via, target],
      { x: dest.x, y: dest.y, w: dest.w, h: dest.h },
    );
  }

  /** NPCs que dividem uma sala trocam sussurros — e você pode flagrar. */
  private scheduleNPCChats(): void {
    this.chatTimer = this.time.addEvent({
      delay: 21000,
      loop: true,
      callback: () => this.fireNPCChat(),
    });
  }

  private fireNPCChat(): void {
    const byRoom = new Map<string, NPC[]>();
    for (const npc of this.npcs) {
      if (npc.traveling) continue;
      byRoom.set(npc.roomId, [...(byRoom.get(npc.roomId) ?? []), npc]);
    }

    const crowded = [...byRoom.entries()].filter(([, group]) => group.length >= 2);
    if (crowded.length === 0) return;

    const [roomId, group] = crowded[Math.floor(Math.random() * crowded.length)];
    const [a, b] = group.sort(() => Math.random() - 0.5);
    const room = ROOMS.find((r) => r.id === roomId);

    this.showChatBubble(a);
    this.showChatBubble(b);

    // Metade das conversas vira burburinho público — informação difusa
    if (Math.random() < 0.5 && room) {
      const bothTraitors = a.data.role === 'traitor' && b.data.role === 'traitor';
      const delta = bothTraitors ? 4 : 2;
      this.run.trustSystem.increaseSuspicion(a.data.id, delta);
      this.run.trustSystem.increaseSuspicion(b.data.id, delta);
      const text = bothTraitors
        ? `${a.data.name} e ${b.data.name} sussurravam em ${room.label} — e mudaram de assunto quando notaram você.`
        : `${a.data.name} e ${b.data.name} conversavam em voz baixa em ${room.label}.`;
      this.run.logEvent(text);
      this.showEventToast(text);
    }
  }

  /** Balão "…" curto acima do NPC — sinal visual de conversa. */
  private showChatBubble(npc: NPC): void {
    const bubble = this.add
      .text(npc.x, npc.y - 26, '...', {
        fontFamily: FONT.family,
        fontSize: '12px',
        color: '#f0e8d0',
        backgroundColor: '#1a1428',
        padding: { x: 5, y: 2 },
      })
      .setResolution(FONT.resolution)
      .setOrigin(0.5, 1)
      .setDepth(9)
      .setAlpha(0);
    this.claimWorld(bubble);

    this.tweens.add({
      targets: bubble,
      alpha: 0.95,
      y: bubble.y - 4,
      duration: 250,
      onComplete: () => {
        this.time.delayedCall(2400, () => {
          this.tweens.add({ targets: bubble, alpha: 0, duration: 300, onComplete: () => bubble.destroy() });
        });
      },
    });
  }

  private spawnClueMarkers(): void {
    for (const clue of this.run.clueSystem.getAvailable(this.run.day)) {
      const pos = this.getCluePosition(clue.id, clue.room);
      if (!pos) continue;

      const marker = this.add
        .image(pos.x, pos.y, TEXTURE_KEYS.clue)
        .setDepth(2)
        .setScale(0.9);

      this.tweens.add({
        targets: marker,
        y: pos.y - 5,
        duration: 650,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.tweens.add({
        targets: marker,
        alpha: { from: 0.6, to: 1 },
        duration: 450,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: 225,
      });

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

      marker.setData('glowRing', glowRing);
      this.clueMarkers.set(clue.id, marker);
    }

    this.drawCrimeScene();
  }

  /** Posição fixa do mapa ou, para pistas geradas (cena do crime), um ponto no cômodo. */
  private getCluePosition(clueId: string, roomId: string): { x: number; y: number } | null {
    const fixed = CLUE_POSITIONS[clueId];
    if (fixed) return fixed;

    const room = ROOMS.find((r) => r.id === roomId);
    if (!room) return null;

    // Determinístico por id: mesma pista, mesmo lugar, sem sobrepor o centro
    const hash = clueId.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    return {
      x: room.x + 30 + (hash % (room.w - 60)),
      y: room.y + 34 + ((hash * 7) % (room.h - 64)),
    };
  }

  /** Marca visual no cômodo da vítima da noite anterior. */
  private drawCrimeScene(): void {
    const victim = this.run.lastNightVictim;
    if (!victim) return;

    const room = ROOMS.find((r) => r.id === victim.startRoom);
    if (!room) return;

    const x = room.x + room.w / 2;
    const y = room.y + room.h * 0.68;

    this.add.ellipse(x, y, 34, 14, 0x3a0d12, 0.55).setDepth(-6);
    this.add.ellipse(x - 10, y + 5, 12, 6, 0x2a080c, 0.5).setDepth(-6);
    this.add
      .text(x, y - 14, `✝ ${victim.name}`, {
        fontFamily: FONT.family,
        fontSize: '10px',
        color: '#a86a72',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setResolution(FONT.resolution)
      .setOrigin(0.5)
      .setDepth(-6);
  }

  // --- UI ---

  private setupUI(): void {
    const { width, height } = this.scale;
    this.hud = new HUD(this, width);
    this.dialogueBox = new DialogueBox(this, width, height);
    this.journal = new Journal(this, width, height, this.run, (objs) => this.claimUI(objs));
    this.interrogationPanel = new InterrogationPanel(
      this,
      width,
      height,
      {
        ask: (npc, questionId) => this.handleAsk(npc, questionId),
        isAsked: (npcId, questionId) =>
          (questionId === 'alliance' &&
            (this.run.allies.has(npcId) || this.isTraitorPartnerById(npcId))) ||
          this.askedQuestions.has(this.questionKey(npcId, questionId)),
        reading: (npcId) => this.describeReading(npcId),
        onClose: () => this.checkCouncilUnlock(),
      },
      (objs) => this.claimUI(objs),
    );

    this.hud.setDay(this.run.day);
    this.hud.setClueCount(this.run.clueSystem.getCollected().length);
    this.updateThreatHud();
    this.hud.setActions(this.actionsTaken, ACTIONS_PER_DAY);
  }

  private setupInput(): void {
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.clueKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    this.journalKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.J);
    this.escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this.input.keyboard!.on('keydown-M', () => {
      const muted = audio.toggleMuted();
      this.showEventToast(muted ? 'Som desligado (M para religar)' : 'Som ligado');
    });
  }

  private showDayIntro(): void {
    const story = STORY_DAYS[this.run.day - 1];
    const victim = this.run.lastNightVictim;
    const crimeNote = victim
      ? ` O corpo de ${victim.name} foi encontrado — investigue a cena no cômodo onde ele(a) ficava.`
      : '';

    if (this.run.isPlayerTraitor()) {
      const partner = this.run.getAliveTraitorNPCs()[0];
      const partnerNote = partner
        ? ` Seu parceiro nas sombras é ${partner.name}. Proteja-o ou use-o como isca se precisar.`
        : ' Seu antigo parceiro caiu. Agora a mansão inteira precisa acreditar na sua inocência.';
      this.dialogueBox.show(
        'Voz interior',
        story.intro + crimeNote + partnerNote + ' Sabote a investigação e leve os Fiéis a se destruírem no Conselho.',
      );
      return;
    }

    this.dialogueBox.show('Narrador', story.intro + crimeNote);
  }

  // --- Loop ---

  update(_time: number, delta: number): void {
    if (this.cutscene?.active) {
      this.player.freeze();
      return;
    }

    if (this.inputCooldown > 0) {
      this.inputCooldown -= delta;
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      if (this.interrogationPanel.isVisible()) {
        this.interrogationPanel.close();
        this.inputCooldown = 150;
        return;
      }
      if (this.journal.isVisible()) {
        this.journal.close();
        this.inputCooldown = 150;
        return;
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      if (this.dialogueBox.isVisible()) {
        this.dialogueBox.hide();
        return;
      }
      if (this.interrogationPanel.isVisible()) {
        this.interrogationPanel.close();
        this.inputCooldown = 150;
        return;
      }
      if (this.journal.isVisible()) return;
      this.tryInteract();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.journalKey)) {
      if (this.dialogueBox.isVisible() || this.interrogationPanel.isVisible()) return;
      if (this.journal.isVisible()) {
        this.journal.close();
      } else {
        this.journal.open('people');
      }
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.clueKey)) {
      if (this.dialogueBox.isVisible() || this.interrogationPanel.isVisible()) return;
      if (this.journal.isVisible()) {
        this.journal.close();
      } else {
        this.journal.open('clues');
      }
      return;
    }

    const uiOpen =
      this.dialogueBox.isVisible() ||
      this.journal.isVisible() ||
      this.interrogationPanel.isVisible();

    if (uiOpen) {
      this.player.freeze();
      return;
    }

    this.player.update(delta);
    const velocity = this.player.body.velocity;
    if (velocity.x !== 0 || velocity.y !== 0) {
      audio.footstep();
    }
    this.checkProximity();
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

    let nearKeyId: string | null = null;
    for (const [id, marker] of this.keyMarkers.entries()) {
      const dx = marker.x - this.player.x;
      const dy = marker.y - this.player.y;
      if (Math.sqrt(dx * dx + dy * dy) < 28) {
        nearKeyId = id;
        break;
      }
    }
    this.nearKey = nearKeyId;

    this.nearDoor = null;
    for (const door of GATED_DOORS) {
      if (this.run.openedDoors.has(door.id) || door.kind !== 'locked') continue;
      const center = getGatedDoorCenter(door);
      const dx = center.x - this.player.x;
      const dy = center.y - this.player.y;
      if (Math.sqrt(dx * dx + dy * dy) < 44) {
        this.nearDoor = door;
        break;
      }
    }

    this.nearLever = null;
    for (const lever of SECRET_LEVERS) {
      if (this.run.openedDoors.has(lever.doorId)) continue;
      const dx = lever.x - this.player.x;
      const dy = lever.y - this.player.y;
      if (Math.sqrt(dx * dx + dy * dy) < 36) {
        this.nearLever = lever;
        break;
      }
    }

    if (nearNPC) {
      this.hud.setInteractHint(`[E] interrogar ${nearNPC.data.name}`);
    } else if (nearClueId) {
      this.hud.setInteractHint('[E] examinar pista');
    } else if (nearKeyId) {
      this.hud.setInteractHint('[E] pegar item');
    } else if (this.nearDoor) {
      this.hud.setInteractHint(
        this.run.items.has(this.nearDoor.keyId ?? '')
          ? this.nearDoor.unlockHint
          : '[E] porta trancada',
      );
    } else if (this.nearLever) {
      const door = GATED_DOORS.find((d) => d.id === this.nearLever!.doorId);
      this.hud.setInteractHint(door?.unlockHint ?? '[E] examinar');
    } else {
      this.hud.setInteractHint('');
    }
  }

  private tryInteract(): void {
    // Itens e portas não gastam ação do dia — exploração continua livre
    if (!this.activeNPC && !this.nearClue) {
      if (this.nearKey) {
        this.collectKey(this.nearKey);
        return;
      }
      if (this.nearDoor) {
        this.tryUnlockDoor(this.nearDoor);
        return;
      }
      if (this.nearLever) {
        this.examineLever(this.nearLever);
        return;
      }
    }

    if (this.actionsExhausted() && (this.nearClue || this.activeNPC)) {
      this.dialogueBox.show(
        'Narrador',
        'O dia terminou. Todos se dirigem à Mesa do Conselho — vá votar (TAB).',
      );
      return;
    }

    if (this.nearClue) {
      this.collectClue(this.nearClue);
      return;
    }

    if (this.activeNPC) {
      this.interrogationPanel.open(this.activeNPC.data);
      this.inputCooldown = 150;
    }
  }

  private tryUnlockDoor(door: GatedDoor): void {
    if (door.keyId && this.run.items.has(door.keyId)) {
      this.openGatedDoor(door);
      return;
    }
    this.dialogueBox.show('Porta trancada', door.lockedHint);
    this.inputCooldown = 200;
  }

  private examineLever(lever: SecretLever): void {
    const door = GATED_DOORS.find((candidate) => candidate.id === lever.doorId);
    if (!door) return;
    this.openGatedDoor(door);
    this.nearLever = null;
  }

  private actionsExhausted(): boolean {
    return this.actionsTaken >= ACTIONS_PER_DAY;
  }

  private collectClue(clueId: string): void {
    const clue = this.run.clueSystem.collectClue(clueId, this.run.trustSystem);
    if (!clue) return;

    this.removeClueMarker(clueId, true);
    audio.chime();
    this.actionsTaken++;
    this.hud.setClueCount(this.run.clueSystem.getCollected().length);
    this.hud.setActions(this.actionsTaken, ACTIONS_PER_DAY);
    this.dialogueBox.show('Pista encontrada', clue.description);
    this.nearClue = null;
    this.inputCooldown = 200;
    this.checkCouncilUnlock();
  }

  private removeClueMarker(clueId: string, withBurst: boolean): void {
    const marker = this.clueMarkers.get(clueId);
    if (!marker) return;

    this.tweens.killTweensOf(marker);
    const glowRing = marker.getData('glowRing') as Phaser.GameObjects.Arc | undefined;
    if (glowRing) {
      this.tweens.killTweensOf(glowRing);
      glowRing.destroy();
    }
    if (withBurst) {
      this.claimWorld(burst(this, marker.x, marker.y, SPECTACLE.burstCount, PALETTE.particle.cluePickup));
      this.cameras.main.shake(80, 0.005);
    }
    marker.destroy();
    this.clueMarkers.delete(clueId);
  }

  // --- Interrogatório ---

  private handleAsk(npc: NPCData, questionId: QuestionId): string {
    if (this.actionsExhausted()) {
      return 'Não há mais tempo hoje. A Mesa do Conselho aguarda todos.';
    }

    if (questionId === 'alliance') {
      return this.handleAlliance(npc);
    }

    if (this.isTraitorPartner(npc)) {
      return this.handleTraitorPartnerAsk(npc, questionId);
    }

    const outcome = this.interrogationSystem.ask(
      questionId,
      npc,
      this.run.day,
      this.run.aliveNPCs,
      this.run.clueSystem.getCollected(),
      this.run.lastNightVictim?.name,
    );

    this.applyOutcome(npc, outcome);
    this.askedQuestions.add(this.questionKey(npc.id, questionId));
    this.spokenTo.add(npc.id);
    this.actionsTaken++;

    let response = outcome.text;
    if (outcome.revealClueId && !this.run.clueSystem.hasCollected(outcome.revealClueId)) {
      const clue = this.run.clueSystem.collectClue(outcome.revealClueId, this.run.trustSystem);
      if (clue) {
        this.removeClueMarker(outcome.revealClueId, false);
        response += `\n\nNova pista: ${clue.description}`;
      }
    }

    this.hud.setClueCount(this.run.clueSystem.getCollected().length);
    this.updateThreatHud();
    this.hud.setActions(this.actionsTaken, ACTIONS_PER_DAY);
    this.checkCouncilUnlock();

    if (this.actionsExhausted()) {
      response += '\n\nO sol se põe. Não há tempo para mais nada — o Conselho aguarda.';
    }
    return response;
  }

  private handleTraitorPartnerAsk(
    npc: NPCData,
    questionId: Exclude<QuestionId, 'alliance'>,
  ): string {
    const target = this.pickFaithfulSabotageTarget();
    let response: string;

    switch (questionId) {
      case 'alibi':
        this.run.reducePlayerThreat(3);
        response =
          `"Baixo. A historia entre nos precisa bater." ${npc.name} ajusta o tom: ` +
          '"Se perguntarem, voce estava longe da cena. Eu confirmo. Voce confirma o meu caminho."';
        break;
      case 'pressure':
        if (target) this.run.trustSystem.increaseSuspicion(target.id, 7);
        response = target
          ? `"Pressao publica, entendi." ${npc.name} olha para ${target.name}. "No Conselho, eu faco essa pessoa parecer nervosa."`
          : `"Nao ha mais ninguem para empurrar." ${npc.name} mantem a voz baixa.`;
        break;
      case 'rumor':
        if (target) this.run.trustSystem.increaseSuspicion(target.id, 10);
        response = target
          ? `"Vamos espalhar um nome: ${target.name}." ${npc.name} sorri sem mostrar os dentes. "Um sussurro certo vale mais que uma prova."`
          : `"A casa ja esta vazia demais para boatos." ${npc.name} observa a porta.`;
        break;
      case 'evidence': {
        const exposed = this.run.clueSystem
          .getCollected()
          .some((clue) => clue.contradictsNPC === npc.id || clue.revealsRole === npc.id);
        if (target) this.run.trustSystem.increaseSuspicion(target.id, exposed ? 8 : 5);
        response = exposed
          ? `"Essa pista aponta para mim." ${npc.name} prende a respiracao. "Entao vamos sujar a leitura dela e ligar o rastro a ${target?.name ?? 'um Fiel'} antes do Conselho."`
          : `"Sem prova contra mim, melhor fabricar duvida." ${npc.name} aponta discretamente para ${target?.name ?? 'a mesa do Conselho'}.`;
        break;
      }
    }

    this.askedQuestions.add(this.questionKey(npc.id, questionId));
    this.spokenTo.add(npc.id);
    this.actionsTaken++;
    this.hud.setClueCount(this.run.clueSystem.getCollected().length);
    this.updateThreatHud();
    this.hud.setActions(this.actionsTaken, ACTIONS_PER_DAY);
    this.checkCouncilUnlock();

    if (this.actionsExhausted()) {
      response += '\n\nO sol se poe. Nao ha tempo para mais nada -- o Conselho aguarda.';
    }
    return response;
  }
  private handleAlliance(npc: NPCData): string {
    if (this.run.isPlayerTraitor() && npc.role === 'traitor') {
      this.run.allies.add(npc.id);
      this.run.logEvent(`${npc.name} confirmou o pacto secreto com você.`);
      this.spokenTo.add(npc.id);
      this.askedQuestions.add(this.questionKey(npc.id, 'alliance'));
      this.actionsTaken++;
      this.updateThreatHud();
      this.hud.setActions(this.actionsTaken, ACTIONS_PER_DAY);
      this.checkCouncilUnlock();
      return `"Estamos alinhados." ${npc.name} baixa a voz: escolha um Fiel para cair, e eu ajudo a empurrar a suspeita.`;
    }

    const outcome = this.interrogationSystem.proposeAlliance(
      npc,
      this.run.trustSystem.getTrust(npc.id),
    );

    if (outcome.trustDelta > 0) {
      this.run.trustSystem.increaseTrust(npc.id, outcome.trustDelta);
    } else if (outcome.trustDelta < 0) {
      this.run.trustSystem.decreaseTrust(npc.id, Math.abs(outcome.trustDelta));
    }
    if (outcome.threatDelta) {
      this.run.addPlayerThreat(outcome.threatDelta);
    }

    if (outcome.accepted) {
      this.run.allies.add(npc.id);
      this.run.logEvent(`${npc.name} aceitou uma aliança com você.`);
      // Só bloqueia repetição quando aceita; recusa permite tentar amanhã
      this.askedQuestions.add(this.questionKey(npc.id, 'alliance'));
    }

    this.spokenTo.add(npc.id);
    this.actionsTaken++;
    this.updateThreatHud();
    this.hud.setActions(this.actionsTaken, ACTIONS_PER_DAY);
    this.checkCouncilUnlock();

    return outcome.text;
  }

  private applyOutcome(npc: NPCData, outcome: InterrogationOutcome): void {
    if (outcome.trustDelta > 0) {
      this.run.trustSystem.increaseTrust(npc.id, outcome.trustDelta);
    } else if (outcome.trustDelta < 0) {
      this.run.trustSystem.decreaseTrust(npc.id, Math.abs(outcome.trustDelta));
    }

    if (outcome.suspicionDelta > 0) {
      this.run.trustSystem.increaseSuspicion(npc.id, outcome.suspicionDelta);
    }

    if (outcome.suspicionTargetId && outcome.suspicionTargetDelta) {
      this.run.trustSystem.increaseSuspicion(
        outcome.suspicionTargetId,
        outcome.suspicionTargetDelta,
      );
    }

    if (outcome.threatDelta) {
      this.run.addPlayerThreat(outcome.threatDelta);
    }
  }

  private isTraitorPartner(npc: NPCData): boolean {
    return this.run.isPlayerTraitor() && npc.role === 'traitor';
  }

  private isTraitorPartnerById(npcId: string): boolean {
    const npc = this.run.aliveNPCs.find((candidate) => candidate.id === npcId);
    return !!npc && this.isTraitorPartner(npc);
  }

  private pickFaithfulSabotageTarget(): NPCData | null {
    const faithful = this.run.getAliveFaithfulNPCs();
    if (faithful.length === 0) return null;
    return faithful.reduce((best, candidate) =>
      this.run.trustSystem.getSuspicion(candidate.id) > this.run.trustSystem.getSuspicion(best.id)
        ? candidate
        : best,
    );
  }
  private questionKey(npcId: string, questionId: QuestionId): string {
    return `${this.run.day}:${npcId}:${questionId}`;
  }

  private describeReading(npcId: string): string {
    if (this.isTraitorPartnerById(npcId)) {
      return 'parceiro(a) secreto(a)  |  cumplice do seu lado';
    }

    const trust = this.run.trustSystem.getTrust(npcId);
    const suspicion = this.run.trustSystem.getSuspicion(npcId);

    const trustLabel =
      trust >= 70 ? 'confia em voce' : trust >= 40 ? 'neutro com voce' : 'desconfia de voce';
    const suspicionLabel =
      suspicion >= 60
        ? 'o grupo desconfia muito'
        : suspicion >= 35
          ? 'o grupo observa de perto'
          : 'o grupo considera confiavel';

    return `${trustLabel}  |  ${suspicionLabel}`;
  }

  private updateThreatHud(): void {
    this.hud.setThreat(
      this.describeThreat(),
      this.run.isPlayerTraitor() ? 'DISFARCE' : 'RISCO',
      this.run.isPlayerTraitor(),
    );
  }

  private describeThreat(): string {
    const threat = this.run.playerThreat;
    if (this.run.isPlayerTraitor()) {
      if (threat >= 40) return 'baixo';
      if (threat >= 18) return 'medio';
      return 'alto';
    }
    if (threat >= 40) return 'ALTO';
    if (threat >= 18) return 'medio';
    return 'baixo';
  }

  // --- Conselho ---

  private checkCouncilUnlock(): void {
    if (this.councilUnlocked) return;

    const clues = this.run.clueSystem.getCollected().length;
    const earnedUnlock = this.spokenTo.size >= 2 && clues >= 1 && this.actionsTaken >= 3;
    if (earnedUnlock || this.actionsExhausted()) {
      this.councilUnlocked = true;
      this.showCouncilButton();
    }
  }

  private showCouncilButton(): void {
    if (this.councilButton) return;

    this.councilButton = this.add
      .text(this.scale.width / 2, this.scale.height - 14, '[ IR PARA O CONSELHO -> ]  (TAB)', {
        fontFamily: FONT.family,
        fontSize: '14px',
        color: PALETTE.text.golden,
        stroke: '#000000',
        strokeThickness: 2,
        backgroundColor: '#24163c',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(12)
      .setInteractive({ useHandCursor: true });

    this.councilButton.setResolution(FONT.resolution);
    this.claimUI(this.councilButton);
    hoverBtn(this, this.councilButton, PALETTE.text.golden);

    const goToCouncil = () => {
      if (
        this.dialogueBox.isVisible() ||
        this.interrogationPanel.isVisible() ||
        this.journal.isVisible()
      ) {
        return;
      }
      fadeOutTo(this, 'CouncilScene');
    };

    this.councilButton.on('pointerdown', goToCouncil);
    this.input.keyboard!.on('keydown-TAB', goToCouncil);
  }
}
