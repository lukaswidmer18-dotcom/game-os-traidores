import { Clue } from '../data/clues';
import { NPCData } from '../data/npcs';
import { DialogueSystem } from './DialogueSystem';

export type QuestionId = 'alibi' | 'pressure' | 'rumor' | 'evidence';

export interface InterrogationOutcome {
  text: string;
  trustDelta: number;
  suspicionDelta: number;
  suspicionTargetId?: string;
  suspicionTargetDelta?: number;
  revealClueId?: string;
}

export class InterrogationSystem {
  constructor(private readonly dialogueSystem: DialogueSystem) {}

  ask(
    questionId: QuestionId,
    npc: NPCData,
    day: number,
    aliveNPCs: NPCData[],
    collectedClues: Clue[],
  ): InterrogationOutcome {
    const dialogue = this.dialogueSystem.getDialogue(npc.id, day);
    const lines = dialogue?.lines ?? ['...'];
    const clueHint = dialogue?.clueHint;
    const relevantClue = collectedClues.find(
      (clue) => clue.contradictsNPC === npc.id || clue.revealsRole === npc.id,
    );

    switch (questionId) {
      case 'alibi':
        if (npc.role === 'traitor') {
          return {
            text: `${lines[0]} "Ja respondi isso antes. O problema nao esta em mim."`,
            trustDelta: -2,
            suspicionDelta: 6,
          };
        }
        return {
          text: `${lines[0]} ${this.personalityTag(npc.personality)}`,
          trustDelta: 4,
          suspicionDelta: 0,
        };

      case 'pressure':
        if (npc.role === 'traitor') {
          return {
            text: `"Voce esta exagerando." ${lines[1] ?? lines[0]} A resposta sai rapida demais para soar natural.`,
            trustDelta: -10,
            suspicionDelta: 15,
          };
        }
        return {
          text: `"Nao gosto do tom, mas vou responder." ${lines[1] ?? lines[0]}`,
          trustDelta: -6,
          suspicionDelta: 4,
        };

      case 'rumor': {
        const target = this.pickRumorTarget(npc, aliveNPCs);
        if (!target) {
          return {
            text: 'Nao ha mais ninguem nesta sala para comentar.',
            trustDelta: 0,
            suspicionDelta: 0,
          };
        }

        if (npc.role === 'traitor') {
          return {
            text:
              `"Se quer um nome, observe ${target.name}. ` +
              'A pessoa certa sempre fala pouco e escuta demais."',
            trustDelta: 1,
            suspicionDelta: 3,
            suspicionTargetId: target.id,
            suspicionTargetDelta: 8,
          };
        }

        return {
          text:
            `"Nao confio totalmente em ${target.name}. ` +
            'Tem algo fora do lugar no jeito dessa pessoa reagir."',
          trustDelta: 2,
          suspicionDelta: 0,
          suspicionTargetId: target.id,
          suspicionTargetDelta: 6,
        };
      }

      case 'evidence':
        if (relevantClue) {
          if (npc.role === 'traitor') {
            return {
              text:
                `"Isso nao prova nada." Ao ouvir sua referencia a pista, ${npc.name} perde a postura por um segundo.`,
              trustDelta: -12,
              suspicionDelta: 18,
            };
          }
          return {
            text:
              `"Essa pista me coloca em situacao ruim, mas nao conta a historia toda." ${npc.name} parece ofendido(a), nao acuado(a).`,
            trustDelta: -8,
            suspicionDelta: 6,
          };
        }

        if (clueHint) {
          return {
            text:
              `${lines[2] ?? lines[0]} Ao insistir, ${npc.name} deixa escapar um detalhe que aponta para outro acontecimento.`,
            trustDelta: -4,
            suspicionDelta: 6,
            revealClueId: clueHint,
          };
        }

        return {
          text: `"Sem prova, isso e so pressao." ${npc.name} cruza os bracos e encerra o assunto.`,
          trustDelta: -5,
          suspicionDelta: 2,
        };
    }
  }

  private personalityTag(personality: string): string {
    const cleaned = personality.split('.').shift()?.trim() ?? personality;
    return `A postura combina com o perfil de ${cleaned.toLowerCase()}.`;
  }

  private pickRumorTarget(npc: NPCData, aliveNPCs: NPCData[]): NPCData | null {
    const others = aliveNPCs.filter((candidate) => candidate.id !== npc.id);
    if (others.length === 0) {
      return null;
    }

    if (npc.role === 'traitor') {
      return others.find((candidate) => candidate.role === 'faithful') ?? others[0];
    }

    return others.find((candidate) => candidate.role === 'traitor') ?? others[0];
  }
}
