import { DialogueLine, DIALOGUES } from '../data/dialogues';

export class DialogueSystem {
  private lineIndex: Map<string, number> = new Map();

  getDialogue(npcId: string, day: number): DialogueLine | null {
    return (
      DIALOGUES.find((d) => d.npcId === npcId && d.day === day) ?? null
    );
  }

  getNextLine(npcId: string, day: number): string {
    const dialogue = this.getDialogue(npcId, day);
    if (!dialogue) return '...';

    const key = `${npcId}-${day}`;
    const idx = this.lineIndex.get(key) ?? 0;
    const line = dialogue.lines[idx % dialogue.lines.length];
    this.lineIndex.set(key, idx + 1);
    return line;
  }

  getClueHint(npcId: string, day: number): string | undefined {
    return this.getDialogue(npcId, day)?.clueHint;
  }

  resetIndex(npcId: string, day: number): void {
    this.lineIndex.delete(`${npcId}-${day}`);
  }
}
