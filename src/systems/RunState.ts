import { NPC_DATA, NPCData } from '../data/npcs';
import { generateClues } from '../data/clues';
import { ClueSystem } from './ClueSystem';
import { TrustSystem } from './TrustSystem';

/** Ações por dia (pergunta ou pista = 1). Esgotar força o Conselho. */
export const ACTIONS_PER_DAY = 6;

export type PlayerRole = 'investigator' | 'traitor';

/**
 * Estado de uma partida (run). Criado uma vez ao iniciar o jogo e
 * compartilhado por todas as cenas, para que confiança, suspeita,
 * pistas e papéis persistam entre os dias.
 */
export class RunState {
  readonly trustSystem: TrustSystem;
  readonly clueSystem: ClueSystem;
  readonly playerRole: PlayerRole;
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

  /** Itens-chave coletados (chaves, objetos de missão). Persistem entre os dias. */
  readonly items = new Set<string>();

  /** Portas condicionadas já abertas (trancadas ou secretas). Persistem entre os dias. */
  readonly openedDoors = new Set<string>();

  /** Diário de acontecimentos (eventos espontâneos, mortes) por dia. */
  readonly eventLog: Array<{ day: number; text: string }> = [];

  logEvent(text: string): void {
    this.eventLog.push({ day: this.day, text });
  }

  /** Elenco completo da partida (inclui eliminados), com papéis sorteados. */
  readonly roster: NPCData[];

  constructor(playerRole: PlayerRole = 'investigator') {
    this.playerRole = playerRole;
    this.aliveNPCs = assignRandomRoles(NPC_DATA, playerRole);
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

  isPlayerTraitor(): boolean {
    return this.playerRole === 'traitor';
  }

  getAliveTraitorNPCs(npcs: NPCData[] = this.aliveNPCs): NPCData[] {
    return npcs.filter((n) => n.role === 'traitor');
  }

  getAliveFaithfulNPCs(npcs: NPCData[] = this.aliveNPCs): NPCData[] {
    return npcs.filter((n) => n.role === 'faithful');
  }

  getTraitorSideCount(npcs: NPCData[] = this.aliveNPCs): number {
    return this.getAliveTraitorNPCs(npcs).length + (this.isPlayerTraitor() ? 1 : 0);
  }

  hasTraitorDominance(npcs: NPCData[] = this.aliveNPCs): boolean {
    const faithful = this.getAliveFaithfulNPCs(npcs).length;
    return faithful > 0 && this.getTraitorSideCount(npcs) >= faithful;
  }
}

/** Sorteia Traidores entre os NPCs; se o jogador for Traidor, ele conta como um dos dois. */
function assignRandomRoles(npcs: NPCData[], playerRole: PlayerRole): NPCData[] {
  const shuffled = [...npcs].sort(() => Math.random() - 0.5);
  const npcTraitorCount = playerRole === 'traitor' ? 1 : 2;
  const traitorIds = new Set(shuffled.slice(0, npcTraitorCount).map((n) => n.id));

  return npcs.map((npc) => ({
    ...npc,
    role: traitorIds.has(npc.id) ? ('traitor' as const) : ('faithful' as const),
  }));
}

let currentRun: RunState | null = null;

/** Inicia uma partida nova (papéis re-sorteados, estado zerado). */
export function startNewRun(playerRole: PlayerRole = 'investigator'): RunState {
  currentRun = new RunState(playerRole);
  return currentRun;
}

/** Partida atual. Cria uma se nenhuma existir (ex.: hot reload no meio do jogo). */
export function getRun(): RunState {
  if (!currentRun) {
    currentRun = new RunState();
  }
  return currentRun;
}
