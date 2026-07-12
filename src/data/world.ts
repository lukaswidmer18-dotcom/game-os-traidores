import { PALETTE } from '../design/constants';
import { NPCData } from './npcs';

export const WORLD_WIDTH = 1280;
export const WORLD_HEIGHT = 1120;
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
 * Planta contígua da Mansão Velhart (grade de 16px, span 64..1216 × 96..1024).
 * Paredes compartilhadas: cada porta é declarada nos DOIS cômodos que ela
 * liga, no mesmo ponto global — o vão precisa coincidir dos dois lados.
 *
 *   Capela  | Biblioteca | Foyer    | Escritório
 *   Quarto  | Corredor   | Salão    | Cozinha    | Adega
 *           | Estufa     | Conselho | Jardim
 *                        | Cripta   | Porão
 *
 * Porão é trancado (chave na Estufa); Cripta só existe atrás da
 * passagem secreta no Conselho — ver GATED_DOORS.
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
      { side: 'left', offset: 128 }, // → Capela
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
      { side: 'left', offset: 128 }, // → Quarto do Anfitrião
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
      { side: 'bottom', offset: 144 }, // → Cripta (passagem secreta)
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
      { side: 'bottom', offset: 128 }, // → Porão (trancado)
    ],
  },
  {
    id: 'chapel',
    label: 'Capela',
    x: 64,
    y: 96,
    w: 160,
    h: 256,
    glowColor: 0x9a8ac8,
    doorways: [
      { side: 'right', offset: 128 }, // → Biblioteca
      { side: 'bottom', offset: 80 }, // → Quarto do Anfitrião
    ],
  },
  {
    id: 'master',
    label: 'Quarto do Anfitrião',
    x: 64,
    y: 352,
    w: 160,
    h: 256,
    glowColor: 0xa87a5a,
    doorways: [
      { side: 'top', offset: 80 }, // → Capela
      { side: 'right', offset: 128 }, // → Corredor
    ],
  },
  {
    id: 'basement',
    label: 'Porão',
    x: 800,
    y: 832,
    w: 256,
    h: 192,
    glowColor: 0x5a6a8a,
    doorways: [
      { side: 'top', offset: 128 }, // → Jardim (trancado)
      { side: 'left', offset: 96 }, // → Cripta
    ],
  },
  {
    id: 'crypt',
    label: 'Cripta',
    x: 512,
    y: 832,
    w: 288,
    h: 192,
    glowColor: 0x6a4a7a,
    doorways: [
      { side: 'right', offset: 96 }, // → Porão
      { side: 'top', offset: 144 }, // → Conselho (passagem secreta)
    ],
  },
];

/**
 * Portas com acesso condicionado. O vão existe na parede (declarado nos
 * dois cômodos), mas um bloqueio físico cobre a passagem até o jogador
 * abri-la — com chave ('locked') ou descobrindo o mecanismo ('secret').
 * Estado aberto persiste na RunState entre os dias.
 */
export interface GatedDoor {
  id: string;
  /** Cômodo cuja parede contém o vão usado para posicionar o bloqueio. */
  room: string;
  side: RoomSide;
  offset: number;
  kind: 'locked' | 'secret';
  /** Item exigido quando kind === 'locked'. */
  keyId?: string;
  lockedHint: string;
  unlockHint: string;
  openText: string;
}

export const GATED_DOORS: GatedDoor[] = [
  {
    id: 'door_basement',
    room: 'garden',
    side: 'bottom',
    offset: 128,
    kind: 'locked',
    keyId: 'key_basement',
    lockedHint: 'Porta do Porão — trancada. Deve haver uma chave em algum lugar.',
    unlockHint: '[E] destrancar o Porão',
    openText: 'A chave enferrujada gira com esforço. A porta do Porão range e se abre.',
  },
  {
    id: 'door_crypt',
    room: 'council',
    side: 'bottom',
    offset: 144,
    kind: 'secret',
    lockedHint: '',
    unlockHint: '[E] examinar a estante deslocada',
    openText: 'A estante gira sobre um eixo oculto. Uma escadaria desce para a escuridão — a Cripta da mansão.',
  },
];

/** Alavanca/mecanismo que revela uma porta secreta ao ser examinado. */
export interface SecretLever {
  doorId: string;
  x: number;
  y: number;
}

/** Estante deslocada encostada na parede sul do Conselho. */
export const SECRET_LEVERS: SecretLever[] = [{ doorId: 'door_crypt', x: 600, y: 806 }];

/** Itens-chave espalhados pela mansão. Coletar não gasta ação do dia. */
export interface KeyItem {
  id: string;
  name: string;
  x: number;
  y: number;
  description: string;
}

export const KEY_ITEMS: KeyItem[] = [
  {
    id: 'key_basement',
    name: 'Chave enferrujada',
    x: 448,
    y: 664,
    description:
      'Uma chave pesada e enferrujada, escondida sob um vaso na Estufa. Parece antiga — de uma porta que ninguém abre há anos.',
  },
];

/** Centro global do vão de um doorway qualquer de um cômodo. */
function getDoorwayCenter(room: Room, doorway: Doorway): { x: number; y: number } {
  if (doorway.side === 'left') return { x: room.x, y: room.y + doorway.offset };
  if (doorway.side === 'right') return { x: room.x + room.w, y: room.y + doorway.offset };
  if (doorway.side === 'top') return { x: room.x + doorway.offset, y: room.y };
  return { x: room.x + doorway.offset, y: room.y + room.h };
}

/** Centro global do vão de uma porta condicionada (para bloqueio e interação). */
export function getGatedDoorCenter(door: GatedDoor): { x: number; y: number } {
  const room = ROOMS.find((r) => r.id === door.room);
  if (!room) return { x: 0, y: 0 };
  return getDoorwayCenter(room, { side: door.side, offset: door.offset });
}

export interface RoomEdge {
  to: string;
  /** Ponto de passagem: centro do vão da porta que liga as duas salas. */
  via: { x: number; y: number };
}

/**
 * Grafo de adjacência entre salas, ligadas pelos vãos declarados dos dois
 * lados. Portas condicionadas (trancadas/secretas) ficam FORA do grafo:
 * NPCs circulam apenas pelas áreas públicas da mansão.
 */
export function buildRoomGraph(): Map<string, RoomEdge[]> {
  const gatedCenters = GATED_DOORS.map((door) => getGatedDoorCenter(door));
  const isGated = (p: { x: number; y: number }) =>
    gatedCenters.some((c) => Math.abs(c.x - p.x) < 2 && Math.abs(c.y - p.y) < 2);

  const byPoint = new Map<string, Array<{ roomId: string; via: { x: number; y: number } }>>();
  for (const room of ROOMS) {
    for (const doorway of room.doorways) {
      const via = getDoorwayCenter(room, doorway);
      if (isGated(via)) continue;
      const key = `${via.x},${via.y}`;
      const list = byPoint.get(key) ?? [];
      byPoint.set(key, [...list, { roomId: room.id, via }]);
    }
  }

  const graph = new Map<string, RoomEdge[]>();
  for (const entries of byPoint.values()) {
    if (entries.length !== 2) continue; // vão sem par (borda externa) não vira aresta
    const [a, b] = entries;
    graph.set(a.roomId, [...(graph.get(a.roomId) ?? []), { to: b.roomId, via: a.via }]);
    graph.set(b.roomId, [...(graph.get(b.roomId) ?? []), { to: a.roomId, via: b.via }]);
  }
  return graph;
}

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
  clue_sermon: { x: 120, y: 170 }, // Capela
  clue_ledger: { x: 120, y: 430 }, // Quarto do Anfitrião
  clue_ritual: { x: 920, y: 950 }, // Porão
  clue_crypt: { x: 610, y: 940 }, // Cripta
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
