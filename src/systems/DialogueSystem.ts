import { DialogueLine, DIALOGUES, SUSPECT_TOKEN } from '../data/dialogues';
import { NPCData } from '../data/npcs';

export class DialogueSystem {
  private lineIndex: Map<string, number> = new Map();

  getDialogue(npcId: string, day: number): DialogueLine | null {
    return (
      DIALOGUES.find((d) => d.npcId === npcId && d.day === day) ?? null
    );
  }

  getNextLine(npcId: string, day: number, aliveNPCs: NPCData[]): string {
    const dialogue = this.getDialogue(npcId, day);
    if (!dialogue) return '...';

    const key = `${npcId}-${day}`;
    const idx = this.lineIndex.get(key) ?? 0;
    const line = dialogue.lines[idx % dialogue.lines.length];
    this.lineIndex.set(key, idx + 1);
    return this.resolveTokens(line, npcId, day, aliveNPCs);
  }

  /**
   * Substitui {suspeito}: Fiel aponta um Traidor real (dica honesta);
   * Traidor aponta um Fiel (desinformação). Escolha estável por
   * falante+dia para a acusação não mudar entre repetições da fala.
   */
  resolveTokens(line: string, speakerId: string, day: number, aliveNPCs: NPCData[]): string {
    if (!line.includes(SUSPECT_TOKEN)) return line;

    const speaker = aliveNPCs.find((n) => n.id === speakerId);
    const targetRole = speaker?.role === 'traitor' ? 'faithful' : 'traitor';
    const candidates = aliveNPCs.filter(
      (n) => n.id !== speakerId && n.role === targetRole,
    );

    if (candidates.length === 0) {
      return line.replace(SUSPECT_TOKEN, 'alguém desta casa');
    }

    const stableIndex = (speakerId.length + day) % candidates.length;
    return line.replace(SUSPECT_TOKEN, candidates[stableIndex].name);
  }

  getClueHint(npcId: string, day: number): string | undefined {
    return this.getDialogue(npcId, day)?.clueHint;
  }

  resetIndex(npcId: string, day: number): void {
    this.lineIndex.delete(`${npcId}-${day}`);
  }
}
