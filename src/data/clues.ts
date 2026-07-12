import { NPCData } from './npcs';

export interface Clue {
  id: string;
  room: string;
  description: string;
  contradictsNPC?: string; // id do NPC que esta pista contradiz
  revealsRole?: string;    // id do NPC que esta pista revela
  dayAvailable: number;    // a partir de qual dia a pista aparece
  collected: boolean;
}

/**
 * Gera as pistas da partida a partir dos papéis sorteados.
 * Dias 1-2 trazem contradições (suspeita moderada); dia 3 traz
 * revelações fortes — a certeza cresce com o tempo, o jogo não se
 * resolve no primeiro dia.
 */
/**
 * Pista deixada na cena do crime da eliminação noturna: aponta para um
 * dos Traidores vivos e aparece no cômodo da vítima no dia seguinte.
 */
export function generateCrimeClue(
  victim: NPCData,
  aliveTraitors: NPCData[],
  nightOfDay: number,
): Clue | null {
  if (aliveTraitors.length === 0) return null;

  const culprit = aliveTraitors[Math.floor(Math.random() * aliveTraitors.length)];
  const templates = [
    `Perto de onde ${victim.name} foi visto(a) pela última vez, um botão arrancado — do mesmo casaco que ${culprit.name} usa.`,
    `Marcas de arrasto no chão. Presa na fresta do assoalho, uma mecha de cabelo igual ao de ${culprit.name}.`,
    `Um lenço caído com um perfume inconfundível. ${culprit.name} usa o mesmo.`,
    `Pegadas apressadas saem do cômodo. O passo é do tamanho do de ${culprit.name}.`,
  ];

  return {
    id: `clue_night_${nightOfDay}`,
    room: victim.startRoom,
    description: templates[Math.floor(Math.random() * templates.length)],
    contradictsNPC: culprit.id,
    dayAvailable: nightOfDay + 1,
    collected: false,
  };
}

export function generateClues(npcs: NPCData[]): Clue[] {
  const traitors = npcs.filter((n) => n.role === 'traitor');
  const faithful = npcs.filter((n) => n.role === 'faithful');

  if (traitors.length < 2 || faithful.length === 0) {
    throw new Error(
      `generateClues requer 2 traidores e ao menos 1 fiel (recebeu ${traitors.length} traidores, ${faithful.length} fiéis)`,
    );
  }

  const [t1, t2] = traitors;
  const victim = faithful[Math.floor(Math.random() * faithful.length)];

  return [
    {
      id: 'clue_glove',
      room: 'library',
      description: `Uma luva negra esquecida atrás da estante. Tem uma inicial bordada: "${t1.name[0]}.".`,
      contradictsNPC: t1.id,
      dayAvailable: 1,
      collected: false,
    },
    {
      id: 'clue_note',
      room: 'kitchen',
      description: `Um bilhete amassado: "Noite 1 — eliminar ${victim.name}. Sabe demais." A letra é apressada, difícil de reconhecer.`,
      contradictsNPC: t2.id,
      dayAvailable: 1,
      collected: false,
    },
    {
      id: 'clue_footprint',
      room: 'garden',
      description: `Rastros de botas levam até a saída secreta. O tamanho bate com as botas de ${t1.name}.`,
      contradictsNPC: t1.id,
      dayAvailable: 2,
      collected: false,
    },
    {
      id: 'clue_diary',
      room: 'corridor',
      description: `Página rasgada de um diário: "${t2.name} me pediu para ficar quieto. Por quê?"`,
      contradictsNPC: t2.id,
      dayAvailable: 2,
      collected: false,
    },
    {
      id: 'clue_map',
      room: 'hall',
      description: `Um mapa da mansão com dois cômodos marcados em vermelho. A letra é de ${t1.name}.`,
      revealsRole: t1.id,
      dayAvailable: 3,
      collected: false,
    },
    {
      id: 'clue_candle',
      room: 'council',
      description: `Uma vela apagada com cera ainda morna. No castiçal, um fio de cabelo — da mesma cor que o de ${t2.name}.`,
      revealsRole: t2.id,
      dayAvailable: 3,
      collected: false,
    },
  ];
}
