import { Clue, CLUES } from '../data/clues';
import { TrustSystem } from './TrustSystem';

export class ClueSystem {
  private clues: Clue[] = CLUES.map((c) => ({ ...c }));
  private collected: Clue[] = [];

  getCluesForRoom(room: string, day: number): Clue[] {
    return this.clues.filter(
      (c) => c.room === room && !c.collected && c.dayAvailable <= day,
    );
  }

  collectClue(clueId: string, trustSystem: TrustSystem): Clue | null {
    const clue = this.clues.find((c) => c.id === clueId && !c.collected);
    if (!clue) return null;

    clue.collected = true;
    this.collected.push(clue);

    // Aumenta suspeita sobre o NPC ligado à pista
    if (clue.contradictsNPC) {
      trustSystem.increaseSuspicion(clue.contradictsNPC, 20);
    }
    if (clue.revealsRole) {
      trustSystem.increaseSuspicion(clue.revealsRole, 30);
    }

    return clue;
  }

  getCollected(): Clue[] {
    return [...this.collected];
  }

  hasCollected(clueId: string): boolean {
    return this.collected.some((c) => c.id === clueId);
  }
}
