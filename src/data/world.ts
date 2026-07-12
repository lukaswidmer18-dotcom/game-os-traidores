import { PALETTE } from '../design/constants';
import { NPCData } from './npcs';

export const WORLD_WIDTH = 1280;
export const WORLD_HEIGHT = 960;
export const WALL_THICKNESS = 10;
// Folga generosa: corpo do jogador tem ~26px; porta estreita trava passagem
export const DOOR_SIZE = 48;

export type RoomSide = 'left' | 'right' | 'top' | 'bottom';

export interface Doorway {
  side: RoomSide;
  offset: number;
  size?: number;
}

export interface Room {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  glowColor: number;
  doorways: Doorway[];
}

/**
 * Planta contígua da Mansão Velhart (grade de 16px, span 224..1216 × 96..832).
 * Paredes compartilhadas: cada porta é declarada nos DOIS cômodos que ela
 * liga, no mesmo ponto global — o vão precisa coincidir dos dois lados.
 *
 *   Biblioteca | Foyer    | Escritório
 *   Corredor   | Salão    | Cozinha    | Adega
 *   Estufa     | Conselho | Jardim
 */
export const ROOMS: Room[] = [
  {
    id: 'foyer',
    label: 'Foyer',
    x: 512,
    y: 96,
    w: 288,
    h: 256,
    glowColor: 0x8a7a4a,
    doorways: [
      { side: 'bottom', offset: 144 }, // → Salão
      { side: 'left', offset: 128 }, // → Biblioteca
      { side: 'right', offset: 128 }, // → Escritório
    ],
  },
  {
    id: 'library',
    label: 'Biblioteca',
    x: 224,
    y: 96,
    w: 288,
    h: 256,
    glowColor: PALETTE.room.library,
    doorways: [
      { side: 'right', offset: 128 }, // → Foyer
      { side: 'bottom', offset: 144 }, // → Corredor
    ],
  },
  {
    id: 'office',
    label: 'Escritório',
    x: 800,
    y: 96,
    w: 256,
    h: 256,
    glowColor: 0x6a8a9a,
    doorways: [{ side: 'left', offset: 128 }], // → Foyer
  },
  {
    id: 'hall',
    label: 'Salão Principal',
    x: 512,
    y: 352,
    w: 288,
    h: 256,
    glowColor: PALETTE.room.hall,
    doorways: [
      { side: 'top', offset: 144 }, // → Foyer
      { side: 'left', offset: 128 }, // → Corredor
      { side: 'right', offset: 128 }, // → Cozinha
      { side: 'bottom', offset: 144 }, // → Conselho
    ],
  },
  {
    id: 'corridor',
    label: 'Corredor dos Quartos',
    x: 224,
    y: 352,
    w: 288,
    h: 256,
    glowColor: PALETTE.room.corridor,
    doorways: [
      { side: 'top', offset: 144 }, // → Biblioteca
      { side: 'right', offset: 128 }, // → Salão
      { side: 'bottom', offset: 144 }, // → Estufa
    ],
  },
  {
    id: 'kitchen',
    label: 'Cozinha',
    x: 800,
    y: 352,
    w: 256,
    h: 256,
    glowColor: PALETTE.room.kitchen,
    doorways: [
      { side: 'left', offset: 128 }, // → Salão
      { side: 'right', offset: 128 }, // → Adega
      { side: 'bottom', offset: 128 }, // → Jardim
    ],
  },
  {
    id: 'cellar',
    label: 'Adega',
    x: 1056,
    y: 352,
    w: 160,
    h: 256,
    glowColor: 0x7a5a3a,
    doorways: [{ side: 'left', offset: 128 }], // → Cozinha
  },
  {
    id: 'greenhouse',
    label: 'Estufa',
    x: 224,
    y: 608,
    w: 288,
    h: 224,
    glowColor: 0x4a8a5a,
    doorways: [{ side: 'top', offset: 144 }], // → Corredor
  },
  {
    id: 'council',
    label: 'Mesa do Conselho',
    x: 512,
    y: 608,
    w: 288,
    h: 224,
    glowColor: PALETTE.room.council,
    doorways: [
      { side: 'top', offset: 144 }, // → Salão
      { side: 'right', offset: 112 }, // → Jardim
    ],
  },
  {
    id: 'garden',
    label: 'Jardim',
    x: 800,
    y: 608,
    w: 256,
    h: 224,
    glowColor: PALETTE.room.garden,
    doorways: [
      { side: 'left', offset: 112 }, // → Conselho
      { side: 'top', offset: 128 }, // → Cozinha
    ],
  },
];

const NPC_SPAWNS: Record<string, { x: number; y: number }> = {
  helena: { x: 340, y: 220 },
  bento: { x: 600, y: 440 },
  marina: { x: 880, y: 460 },
  davi: { x: 900, y: 720 },
  cassia: { x: 320, y: 480 },
  otto: { x: 720, y: 500 },
  rosa: { x: 960, y: 420 },
  tulio: { x: 420, y: 500 },
};

const ROOM_CENTERS = new Map(
  ROOMS.map((room) => [room.id, { x: room.x + room.w / 2, y: room.y + room.h / 2 }]),
);

export const CLUE_POSITIONS: Record<string, { x: number; y: number }> = {
  clue_glove: { x: 300, y: 180 }, // Biblioteca
  clue_note: { x: 850, y: 560 }, // Cozinha
  clue_footprint: { x: 980, y: 780 }, // Jardim
  clue_diary: { x: 260, y: 560 }, // Corredor
  clue_map: { x: 560, y: 380 }, // Salão
  clue_candle: { x: 640, y: 780 }, // Conselho
};

export function getNPCSpawnPosition(npc: Pick<NPCData, 'id' | 'startRoom'>): {
  x: number;
  y: number;
} {
  const explicit = NPC_SPAWNS[npc.id];
  if (explicit) {
    return explicit;
  }

  return ROOM_CENTERS.get(npc.startRoom) ?? { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };
}

/** Posição inicial do jogador: entrada da mansão, no Foyer. */
export const PLAYER_SPAWN = { x: 656, y: 180 };
