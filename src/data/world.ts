import { PALETTE } from '../design/constants';
import { NPCData } from './npcs';

export const WORLD_WIDTH = 800;
export const WORLD_HEIGHT = 560;
export const WALL_THICKNESS = 4;
// Folga generosa: corpo do jogador tem ~23px; porta estreita trava passagem
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
 * Layout com folga mínima de 30px entre cômodos: as áreas externas são
 * corredores transitáveis e nenhuma parede corta o interior de outro
 * cômodo (bug antigo: jardim e salão sobrepostos criavam becos).
 */
export const ROOMS: Room[] = [
  {
    id: 'hall',
    label: 'Salao Principal',
    x: 220,
    y: 180,
    w: 220,
    h: 160,
    glowColor: PALETTE.room.hall,
    doorways: [
      { side: 'left', offset: 32 },
      { side: 'right', offset: 34 },
      { side: 'right', offset: 120 },
      { side: 'top', offset: 150 },
      { side: 'bottom', offset: 110 },
    ],
  },
  {
    id: 'library',
    label: 'Biblioteca',
    x: 480,
    y: 80,
    w: 180,
    h: 130,
    glowColor: PALETTE.room.library,
    doorways: [{ side: 'left', offset: 65 }],
  },
  {
    id: 'kitchen',
    label: 'Cozinha',
    x: 480,
    y: 280,
    w: 180,
    h: 120,
    glowColor: PALETTE.room.kitchen,
    doorways: [
      { side: 'left', offset: 55 },
      { side: 'bottom', offset: 90 },
    ],
  },
  {
    id: 'garden',
    label: 'Jardim',
    x: 40,
    y: 70,
    w: 140,
    h: 120,
    glowColor: PALETTE.room.garden,
    doorways: [{ side: 'right', offset: 60 }],
  },
  {
    id: 'corridor',
    label: 'Corredor dos Quartos',
    x: 220,
    y: 400,
    w: 220,
    h: 80,
    glowColor: PALETTE.room.corridor,
    doorways: [
      { side: 'top', offset: 110 },
      { side: 'right', offset: 44 },
    ],
  },
  {
    id: 'council',
    label: 'Mesa do Conselho',
    x: 480,
    y: 430,
    w: 180,
    h: 100,
    glowColor: PALETTE.room.council,
    doorways: [
      { side: 'top', offset: 90 },
      { side: 'left', offset: 50 },
    ],
  },
];

const NPC_SPAWNS: Record<string, { x: number; y: number }> = {
  helena: { x: 520, y: 145 },
  bento: { x: 280, y: 260 },
  marina: { x: 545, y: 335 },
  davi: { x: 110, y: 130 },
  cassia: { x: 270, y: 440 },
  otto: { x: 360, y: 245 },
  rosa: { x: 600, y: 320 },
  tulio: { x: 380, y: 445 },
};

const ROOM_CENTERS = new Map(
  ROOMS.map((room) => [room.id, { x: room.x + room.w / 2, y: room.y + room.h / 2 }]),
);

export const CLUE_POSITIONS: Record<string, { x: number; y: number }> = {
  clue_glove: { x: 540, y: 118 },
  clue_note: { x: 510, y: 350 },
  clue_footprint: { x: 90, y: 160 },
  clue_diary: { x: 250, y: 442 },
  clue_map: { x: 245, y: 210 },
  clue_candle: { x: 575, y: 470 },
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
