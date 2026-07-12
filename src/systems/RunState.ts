import { NPC_DATA, NPCData } from '../data/npcs';
import { generateClues } from '../data/clues';
import { ClueSystem } from './ClueSystem';
import { TrustSystem } from './TrustSystem';

/** Ações por dia (pergunta ou pista = 1). Esgotar força o Conselho. */
export const ACTIONS_PER_DAY = 6;

/**
 * Estado de uma partida (run). Criado uma vez ao iniciar o jogo e
 * compartilhado por todas as cenas, para que confiança, suspeita,
 * pistas e papéis persistam entre os dias.
 */
export class RunState {
  readonly trustSystem: TrustSystem;
  readonly clueSystem: ClueSystem;
  aliveNPCs: NPCData[];
  day = 1;

  /** Quanto os Traidores percebem o jogador como ameaça (0-100). */
  playerThreat = 0;

  /** Vítima da última eliminação noturna (cena do crime + diálogos reativos). */
  lastNightVictim: NPCData | null = null;

  /**
   * Aliados do jogador. Fiéis aliados seguem seu voto e vigiam sua porta
   * à noite; um Traidor "aliado" está fingindo — e te observa de perto.
   */
  readonly allies = new Set<string>();

  /** Diário de acontecimentos (eventos espontâneos, mortes) por dia. */
  readonly eventLog: Array<{ day: number; text: string }> = [];

  logEvent(text: string): void {
    this.eventLog.push({ day: this.day, text });
  }

  /** Elenco completo da partida (inclui eliminados), com papéis sorteados. */
  readonly roster: NPCData[];

  constructor() {
    this.aliveNPCs = assignRandomRoles(NPC_DATA);
    this.roster = this.aliveNPCs.map((n) => ({ ...n }));
    this.trustSystem = new TrustSystem();
    this.trustSystem.initialize(this.aliveNPCs);
    this.clueSystem = new ClueSystem(generateClues(this.aliveNPCs));
  }

  isAlive(npcId: string): boolean {
    return this.aliveNPCs.some((n) => n.id === npcId);
  }

  addPlayerThreat(amount: number): void {
    this.playerThreat = Math.min(100, this.playerThreat + amount);
  }

  reducePlayerThreat(amount: number): void {
    this.playerThreat = Math.max(0, this.playerThreat - amount);
  }
}

/** Sorteia 2 Traidores entre os NPCs; os demais são Fiéis. */
function assignRandomRoles(npcs: NPCData[]): NPCData[] {
  const shuffled = [...npcs].sort(() => Math.random() - 0.5);
  const traitorIds = new Set(shuffled.slice(0, 2).map((n) => n.id));

  return npcs.map((npc) => ({
    ...npc,
    role: traitorIds.has(npc.id) ? ('traitor' as const) : ('faithful' as const),
  }));
}

let currentRun: RunState | null = null;

/** Inicia uma partida nova (papéis re-sorteados, estado zerado). */
export function startNewRun(): RunState {
  currentRun = new RunState();
  return currentRun;
}

/** Partida atual. Cria uma se nenhuma existir (ex.: hot reload no meio do jogo). */
export function getRun(): RunState {
  if (!currentRun) {
    currentRun = new RunState();
  }
  return currentRun;
}
