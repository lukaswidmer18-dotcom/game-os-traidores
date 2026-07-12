import { Clue } from '../data/clues';
import { NPCData } from '../data/npcs';
import { DialogueSystem } from './DialogueSystem';

export type QuestionId = 'alibi' | 'pressure' | 'rumor' | 'evidence' | 'alliance';

export interface AllianceOutcome {
  text: string;
  accepted: boolean;
  trustDelta: number;
  /** Traidor que aceita fingindo passa a te vigiar. */
  threatDelta: number;
}

/** Confiança mínima para um Fiel aceitar a aliança. */
export const ALLIANCE_TRUST_THRESHOLD = 60;

export interface InterrogationOutcome {
  text: string;
  trustDelta: number;
  suspicionDelta: number;
  suspicionTargetId?: string;
  suspicionTargetDelta?: number;
  revealClueId?: string;
  /** Quanto o jogador se expõe aos Traidores com esta abordagem (0 se o NPC é Fiel). */
  threatDelta?: number;
}

export class InterrogationSystem {
  constructor(private readonly dialogueSystem: DialogueSystem) {}

  ask(
    questionId: Exclude<QuestionId, 'alliance'>,
    npc: NPCData,
    day: number,
    aliveNPCs: NPCData[],
    collectedClues: Clue[],
    lastVictimName?: string,
  ): InterrogationOutcome {
    const dialogue = this.dialogueSystem.getDialogue(npc.id, day);
    const rawLines = dialogue?.lines ?? ['...'];
    const lines = rawLines.map((line) =>
      this.dialogueSystem.resolveTokens(line, npc.id, day, aliveNPCs),
    );
    const clueHint = dialogue?.clueHint;
    const relevantClue = collectedClues.find(
      (clue) => clue.contradictsNPC === npc.id || clue.revealsRole === npc.id,
    );

    switch (questionId) {
      case 'alibi':
        if (npc.role === 'traitor') {
          return {
            text: `${this.victimReaction(npc, lastVictimName)}${lines[0]} "Ja respondi isso antes. O problema nao esta em mim."`,
            trustDelta: -2,
            suspicionDelta: 6,
            threatDelta: 4,
          };
        }
        return {
          text: `${this.victimReaction(npc, lastVictimName)}${lines[0]} ${this.personalityTag(npc.personality)}`,
          trustDelta: 4,
          suspicionDelta: 0,
        };

      case 'pressure':
        if (npc.role === 'traitor') {
          return {
            text: `"Voce esta exagerando." ${lines[1] ?? lines[0]} A resposta sai rapida demais para soar natural.`,
            trustDelta: -10,
            suspicionDelta: 15,
            threatDelta: 10,
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
            threatDelta: 3,
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
              threatDelta: 16,
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
            threatDelta: npc.role === 'traitor' ? 6 : 0,
          };
        }

        return {
          text: `"Sem prova, isso e so pressao." ${npc.name} cruza os bracos e encerra o assunto.`,
          trustDelta: -5,
          suspicionDelta: 2,
          threatDelta: npc.role === 'traitor' ? 4 : 0,
        };
    }
  }

  /**
   * Proposta de aliança. Fiel aceita se confia em você; Traidor SEMPRE
   * aceita — fingindo — e passa a te observar (ameaça sobe em silêncio).
   */
  proposeAlliance(npc: NPCData, trust: number): AllianceOutcome {
    if (npc.role === 'traitor') {
      return {
        text:
          `"Claro. Juntos descobriremos quem está por trás disso." ` +
          `${npc.name} aperta sua mão um segundo a mais que o natural.`,
        accepted: true,
        trustDelta: 5,
        threatDelta: 8,
      };
    }

    if (trust >= ALLIANCE_TRUST_THRESHOLD) {
      return {
        text:
          `"Está bem. Confio em você — vamos nos proteger." ` +
          `${npc.name} promete vigiar o corredor à noite e votar ao seu lado.`,
        accepted: true,
        trustDelta: 8,
        threatDelta: 0,
      };
    }

    return {
      text:
        `"Aliança? Ainda não sei se posso confiar em você." ` +
        `${npc.name} recua um passo. Conquiste mais confiança antes de propor de novo.`,
      accepted: false,
      trustDelta: -2,
      threatDelta: 0,
    };
  }

  /**
   * Reação à morte da noite anterior. Fiel lamenta; Traidor finge pesar
   * e tenta redirecionar — pista sutil de comportamento.
   */
  private victimReaction(npc: NPCData, victimName?: string): string {
    if (!victimName) return '';
    if (npc.role === 'traitor') {
      return `"O que houve com ${victimName} foi terrível... mas note quem não parece surpreso." `;
    }
    return `"Ainda não acredito que perdemos ${victimName} esta noite." `;
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
