import { NPCData } from './npcs';
import { ROOMS } from './world';

export interface SpontaneousEvent {
  text: string;
  /** Ajustes de suspeita pública causados pelo boato/avistamento. */
  suspicionDeltas: Array<{ npcId: string; delta: number }>;
}

/**
 * Eventos ambientais que pontuam o dia: avistamentos, boatos e
 * presságios. Traidores avistados geram mais burburinho (suspeita) —
 * informação difusa, não prova.
 */
export function generateSpontaneousEvent(aliveNPCs: NPCData[]): SpontaneousEvent {
  const roll = Math.random();

  if (roll < 0.3 && aliveNPCs.length > 0) {
    return sightingEvent(aliveNPCs);
  }
  if (roll < 0.55 && aliveNPCs.length >= 2) {
    return gossipEvent(aliveNPCs);
  }
  if (roll < 0.75 && aliveNPCs.length >= 2) {
    return whisperEvent(aliveNPCs);
  }
  return omenEvent();
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function pickTwo(npcs: NPCData[]): [NPCData, NPCData] {
  const first = pick(npcs);
  const rest = npcs.filter((n) => n.id !== first.id);
  return [first, pick(rest)];
}

/** Salas secretas/trancadas não aparecem em boatos — ninguém circula por elas. */
const HIDDEN_ROOM_IDS = new Set(['basement', 'crypt']);

function sightingEvent(npcs: NPCData[]): SpontaneousEvent {
  const npc = pick(npcs);
  const room = pick(ROOMS.filter((r) => !HIDDEN_ROOM_IDS.has(r.id)));
  const suspicious = npc.role === 'traitor';

  const texts = suspicious
    ? [
        `${npc.name} foi visto(a) saindo às pressas de ${room.label}.`,
        `${npc.name} guardou algo no bolso ao notar que era observado(a).`,
        `${npc.name} evitou olhar nos olhos ao cruzar o corredor.`,
      ]
    : [
        `${npc.name} passou um longo tempo sozinho(a) em ${room.label}.`,
        `${npc.name} parecia distraído(a) olhando pela janela.`,
        `${npc.name} cantarolava baixinho enquanto caminhava por ${room.label}.`,
      ];

  return {
    text: texts[Math.floor(Math.random() * texts.length)],
    suspicionDeltas: [{ npcId: npc.id, delta: suspicious ? 4 : 1 }],
  };
}

function gossipEvent(npcs: NPCData[]): SpontaneousEvent {
  const [talker, target] = pickTwo(npcs);
  return {
    text: `Você ouve ${talker.name} comentar que não confia em ${target.name}.`,
    suspicionDeltas: [{ npcId: target.id, delta: 3 }],
  };
}

function whisperEvent(npcs: NPCData[]): SpontaneousEvent {
  const [a, b] = pickTwo(npcs);
  const bothTraitors = a.role === 'traitor' && b.role === 'traitor';
  return {
    text: `${a.name} e ${b.name} conversavam em voz baixa — e se calaram quando você se aproximou.`,
    suspicionDeltas: [
      { npcId: a.id, delta: bothTraitors ? 4 : 2 },
      { npcId: b.id, delta: bothTraitors ? 4 : 2 },
    ],
  };
}

function omenEvent(): SpontaneousEvent {
  const texts = [
    'As velas do corredor tremulam, embora não haja vento.',
    'Um retrato antigo caiu da parede do Salão Principal.',
    'O relógio de pé parou exatamente à meia-noite... de novo.',
    'Você sente um olhar nas suas costas. Ao virar, não há ninguém.',
    'Um corvo pousa na janela e observa o interior por um longo minuto.',
  ];
  return { text: pick(texts), suspicionDeltas: [] };
}
