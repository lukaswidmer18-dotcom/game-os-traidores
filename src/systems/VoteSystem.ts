import { NPCData } from '../data/npcs';
import { TrustSystem } from './TrustSystem';

export interface VoteResult {
  eliminatedId: string;
  wasTraitor: boolean;
  voteCounts: Map<string, number>;
}

export class VoteSystem {
  computeVotes(
    playerVote: string,
    aliveNPCs: NPCData[],
    trustSystem: TrustSystem,
  ): VoteResult {
    const aliveIds = aliveNPCs.map((n) => n.id);

    // Votos dos NPCs (excluem o jogador da votação de forma simplificada)
    const npcVotes = trustSystem.computeNPCVotes(aliveIds, '');

    // Adiciona o voto do jogador
    const total = new Map(npcVotes);
    total.set(playerVote, (total.get(playerVote) ?? 0) + 1);

    // Determina o mais votado
    let eliminatedId = playerVote;
    let maxVotes = 0;
    for (const [id, count] of total.entries()) {
      if (count > maxVotes) {
        maxVotes = count;
        eliminatedId = id;
      }
    }

    const eliminated = aliveNPCs.find((n) => n.id === eliminatedId);
    const wasTraitor = eliminated?.role === 'traitor';

    return { eliminatedId, wasTraitor, voteCounts: total };
  }
}
