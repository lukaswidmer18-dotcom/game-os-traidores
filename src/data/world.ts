import { PALETTE } from '../design/constants';
import { NPCData } from './npcs';

export const WORLD_WIDTH = 800;
export const WORLD_HEIGHT = 560;
export const WALL_THICKNESS = 4;
export const DOOR_SIZE = 34;

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
  floorTexture: 'room-floor' | 'garden-floor' | 'council-floor';
  doorways: Doorway[];
}

export const ROOMS: Room[] = [
  {
    id: 'hall',
    label: 'Salao Principal',
    x: 200,
    y: 180,
    w: 220,
    h: 160,
    glowColor: PALETTE.room.hall,
    floorTexture: 'room-floor',
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
    x: 490,
    y: 80,
    w: 180,
    h: 130,
    glowColor: PALETTE.room.library,
    floorTexture: 'room-floor',
    doorways: [{ side: 'left', offset: 65 }],
  },
  {
    id: 'kitchen',
    label: 'Cozinha',
    x: 490,
    y: 280,
    w: 180,
    h: 120,
    glowColor: PALETTE.room.kitchen,
    floorTexture: 'room-floor',
    doorways: [
      { side: 'left', offset: 55 },
      { side: 'bottom', offset: 90 },
    ],
  },
  {
    id: 'garden',
    label: 'Jardim',
    x: 80,
    y: 80,
    w: 140,
    h: 120,
    glowColor: PALETTE.room.garden,
    floorTexture: 'garden-floor',
    doorways: [{ side: 'right', offset: 96 }],
  },
  {
    id: 'corridor',
    label: 'Corredor dos Quartos',
    x: 200,
    y: 400,
    w: 220,
    h: 80,
    glowColor: PALETTE.room.corridor,
    floorTexture: 'room-floor',
    doorways: [
      { side: 'top', offset: 110 },
      { side: 'right', offset: 44 },
    ],
  },
  {
    id: 'council',
    label: 'Mesa do Conselho',
    x: 490,
    y: 420,
    w: 180,
    h: 100,
    glowColor: PALETTE.room.council,
    floorTexture: 'council-floor',
    doorways: [
      { side: 'top', offset: 90 },
      { side: 'left', offset: 44 },
    ],
  },
];

const NPC_SPAWNS: Record<string, { x: number; y: number }> = {
  helena: { x: 530, y: 145 },
  bento: { x: 260, y: 260 },
  marina: { x: 555, y: 335 },
  davi: { x: 135, y: 145 },
  cassia: { x: 270, y: 440 },
  otto: { x: 340, y: 245 },
};

const ROOM_CENTERS = new Map(
  ROOMS.map((room) => [room.id, { x: room.x + room.w / 2, y: room.y + room.h / 2 }]),
);

export const CLUE_POSITIONS: Record<string, { x: number; y: number }> = {
  clue_glove: { x: 550, y: 118 },
  clue_note: { x: 520, y: 350 },
  clue_footprint: { x: 125, y: 172 },
  clue_diary: { x: 250, y: 442 },
  clue_map: { x: 222, y: 210 },
  clue_candle: { x: 585, y: 460 },
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
