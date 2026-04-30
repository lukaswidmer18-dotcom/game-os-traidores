export interface Clue {
  id: string;
  room: string;
  description: string;
  contradictsNPC?: string; // id do NPC que esta pista contradiz
  revealsRole?: string;    // id do NPC que esta pista revela
  dayAvailable: number;    // a partir de qual dia a pista aparece
  collected: boolean;
}

export const CLUES: Clue[] = [
  {
    id: 'clue_glove',
    room: 'library',
    description: 'Uma luva negra esquecida atrás da estante. Tem iniciais bordadas: "B.R.".',
    contradictsNPC: 'bento',
    dayAvailable: 1,
    collected: false,
  },
  {
    id: 'clue_note',
    room: 'kitchen',
    description: 'Um bilhete amassado: "Noite 1 — eliminar Davi. Ele sabe demais."',
    revealsRole: 'cassia',
    dayAvailable: 1,
    collected: false,
  },
  {
    id: 'clue_footprint',
    room: 'garden',
    description: 'Rastros de botas do tamanho de Bento levam até a saída secreta.',
    contradictsNPC: 'bento',
    dayAvailable: 2,
    collected: false,
  },
  {
    id: 'clue_diary',
    room: 'corridor',
    description: 'Página rasgada de um diário: "Cássia me pediu para ficar quieto. Por quê?"',
    contradictsNPC: 'cassia',
    dayAvailable: 2,
    collected: false,
  },
  {
    id: 'clue_map',
    room: 'hall',
    description: 'Um mapa da mansão com dois cômodos marcados em vermelho. Letra de Bento.',
    revealsRole: 'bento',
    dayAvailable: 3,
    collected: false,
  },
  {
    id: 'clue_candle',
    room: 'council',
    description: 'Uma vela apagada com cera ainda morna. Alguém esteve aqui à noite.',
    contradictsNPC: 'cassia',
    dayAvailable: 3,
    collected: false,
  },
];
