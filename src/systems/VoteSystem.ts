import { NPCData } from '../data/npcs';
import { TrustSystem } from './TrustSystem';

export interface VoteResult {
  eliminatedId: string;
  wasTraitor: boolean;
  voteCounts: Map<string, number>;
}

/**
 * Conselho:
 * - Jogador vota (1 voto).
 * - Aliados Fiéis seguem o voto do jogador; os demais Fiéis seguem com
 *   probabilidade proporcional à confiança, senão votam ponderado pela
 *   suspeita pública.
 * - Traidores votam taticamente: nunca no parceiro, sempre no Fiel
 *   mais suspeito — mesmo que sejam "aliados" do jogador.
 * - Empate: elimina o de maior suspeita entre os empatados.
 */
export class VoteSystem {
  computeVotes(
    playerVote: string,
    aliveNPCs: NPCData[],
    trustSystem: TrustSystem,
    allies: ReadonlySet<string> = new Set(),
  ): VoteResult {
    const votes = new Map<string, number>();
    const addVote = (id: string) => votes.set(id, (votes.get(id) ?? 0) + 1);

    addVote(playerVote);

    for (const voter of aliveNPCs) {
      const target =
        voter.role === 'traitor'
          ? this.traitorTarget(voter, aliveNPCs, trustSystem)
          : this.faithfulTarget(voter, aliveNPCs, trustSystem, playerVote, allies);

      if (target) addVote(target);
    }

    const eliminatedId = this.resolveMostVoted(votes, trustSystem);
    const eliminated = aliveNPCs.find((n) => n.id === eliminatedId);

    return {
      eliminatedId,
      wasTraitor: eliminated?.role === 'traitor',
      voteCounts: votes,
    };
  }

  private traitorTarget(
    voter: NPCData,
    aliveNPCs: NPCData[],
    trustSystem: TrustSystem,
  ): string | null {
    const faithfulTargets = aliveNPCs.filter(
      (n) => n.id !== voter.id && n.role === 'faithful',
    );
    if (faithfulTargets.length === 0) return null;

    let best = faithfulTargets[0];
    for (const candidate of faithfulTargets) {
      if (trustSystem.getSuspicion(candidate.id) > trustSystem.getSuspicion(best.id)) {
        best = candidate;
      }
    }
    return best.id;
  }

  private faithfulTarget(
    voter: NPCData,
    aliveNPCs: NPCData[],
    trustSystem: TrustSystem,
    playerVote: string,
    allies: ReadonlySet<string>,
  ): string | null {
    const candidates = aliveNPCs.filter((n) => n.id !== voter.id);
    if (candidates.length === 0) return null;

    const canFollowPlayer = playerVote !== voter.id &&
      candidates.some((n) => n.id === playerVote);

    // Aliado fiel: lealdade total ao voto do jogador
    if (canFollowPlayer && allies.has(voter.id)) {
      return playerVote;
    }

    // Confiança no jogador → chance de seguir o voto dele
    const trust = trustSystem.getTrust(voter.id);
    if (canFollowPlayer && Math.random() < trust / 140) {
      return playerVote;
    }

    // Voto próprio: sorteio ponderado pela suspeita pública
    const weights = candidates.map((n) =>
      Math.max(5, trustSystem.getSuspicion(n.id)),
    );
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let roll = Math.random() * totalWeight;

    for (let i = 0; i < candidates.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return candidates[i].id;
    }
    return candidates[candidates.length - 1].id;
  }

  private resolveMostVoted(
    votes: Map<string, number>,
    trustSystem: TrustSystem,
  ): string {
    let eliminatedId = '';
    let maxVotes = -1;

    for (const [id, count] of votes.entries()) {
      const isTie = count === maxVotes;
      const winsTie =
        isTie && trustSystem.getSuspicion(id) > trustSystem.getSuspicion(eliminatedId);
      if (count > maxVotes || winsTie) {
        maxVotes = count;
        eliminatedId = id;
      }
    }

    return eliminatedId;
  }
}
