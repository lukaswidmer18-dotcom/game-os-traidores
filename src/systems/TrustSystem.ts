export class TrustSystem {
  private trustMap: Map<string, number> = new Map();
  private suspicionMap: Map<string, number> = new Map();

  initialize(npcs: Array<{ id: string; trustLevel: number; suspicionLevel: number }>): void {
    for (const npc of npcs) {
      this.trustMap.set(npc.id, npc.trustLevel);
      this.suspicionMap.set(npc.id, npc.suspicionLevel);
    }
  }

  getTrust(npcId: string): number {
    return this.trustMap.get(npcId) ?? 50;
  }

  getSuspicion(npcId: string): number {
    return this.suspicionMap.get(npcId) ?? 50;
  }

  increaseTrust(npcId: string, amount: number): void {
    const current = this.getTrust(npcId);
    this.trustMap.set(npcId, Math.min(100, current + amount));
  }

  decreaseTrust(npcId: string, amount: number): void {
    const current = this.getTrust(npcId);
    this.trustMap.set(npcId, Math.max(0, current - amount));
  }

  increaseSuspicion(npcId: string, amount: number): void {
    const current = this.getSuspicion(npcId);
    this.suspicionMap.set(npcId, Math.min(100, current + amount));
  }

  // NPCs votam com base em suspeita: maior suspeita = mais votos recebidos
  computeNPCVotes(aliveIds: string[], excludeId: string): Map<string, number> {
    const votes = new Map<string, number>();
    const targets = aliveIds.filter((id) => id !== excludeId);

    for (const voterId of aliveIds) {
      if (voterId === excludeId) continue;
      // Escolhe o alvo com maior suspeita entre os disponíveis
      let bestTarget = targets[0];
      let highestSuspicion = -1;

      for (const targetId of targets) {
        if (targetId === voterId) continue;
        const s = this.getSuspicion(targetId);
        if (s > highestSuspicion) {
          highestSuspicion = s;
          bestTarget = targetId;
        }
      }

      if (bestTarget) {
        votes.set(bestTarget, (votes.get(bestTarget) ?? 0) + 1);
      }
    }

    return votes;
  }
}
