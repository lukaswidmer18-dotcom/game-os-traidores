export interface DialogueLine {
  npcId: string;
  day: number;
  lines: string[];
  clueHint?: string; // id da pista que esta fala pode sugerir
}

export const DIALOGUES: DialogueLine[] = [
  // Dia 1
  {
    npcId: 'helena',
    day: 1,
    lines: [
      'Você é novo aqui? Fique com cuidado.',
      'Não confio em todo mundo nessa mansão.',
      'Algo estranho aconteceu ontem à noite na biblioteca.',
    ],
    clueHint: 'clue_glove',
  },
  {
    npcId: 'bento',
    day: 1,
    lines: [
      'Bem-vindo! Que alegria ter você aqui.',
      'Pode me chamar de Bento. Estou à disposição.',
      'Se precisar de ajuda, é só falar.',
    ],
  },
  {
    npcId: 'marina',
    day: 1,
    lines: [
      'Eu estava na cozinha essa noite toda, juro!',
      'Será que tem comida na despensa? Tenho que verificar.',
      'Ah, achei um bilhete estranho antes. Onde coloquei...',
    ],
    clueHint: 'clue_note',
  },
  {
    npcId: 'davi',
    day: 1,
    lines: [
      'Olá. Prefiro observar antes de concluir.',
      'Cuidado com quem parece simpático demais.',
      'O jardim tem rastros que não combinam com ninguém que conheço.',
    ],
    clueHint: 'clue_footprint',
  },
  {
    npcId: 'cassia',
    day: 1,
    lines: [
      'Boa tarde. Espero que esteja se adaptando.',
      'Esta mansão tem muitos segredos.',
      'Não se preocupe com rumores. Foque nos fatos.',
    ],
  },
  {
    npcId: 'otto',
    day: 1,
    lines: [
      'Ei! Se precisar de alguém honesto para conversar, aqui estou.',
      'Não vou mentir pra você.',
      'Desconfio de quem sorri o tempo todo sem motivo.',
    ],
  },

  // Dia 2
  {
    npcId: 'helena',
    day: 2,
    lines: [
      'Você viu quem saiu do corredor ontem à noite?',
      'Encontrei algo suspeito. Mas preciso de mais provas.',
      'Cuidado com Cássia. Ela não é o que parece.',
    ],
    clueHint: 'clue_diary',
  },
  {
    npcId: 'bento',
    day: 2,
    lines: [
      'Uma noite difícil... Fico triste com o que aconteceu.',
      'Espero que façamos a escolha certa hoje.',
      'Não fui ao jardim. Alguém confirmou isso?',
    ],
  },
  {
    npcId: 'marina',
    day: 2,
    lines: [
      'Não dormi nada! Ouvi passos no corredor.',
      'Acho que foi Cássia. Ela estava acordada tarde.',
      'Precisamos nos unir agora.',
    ],
  },
  {
    npcId: 'davi',
    day: 2,
    lines: [
      'Os rastros no jardim levam até a saída dos fundos.',
      'Alguém saiu desta mansão à noite.',
      'Não acredito que foi acidente.',
    ],
    clueHint: 'clue_footprint',
  },
  {
    npcId: 'cassia',
    day: 2,
    lines: [
      'Todos estão nervosos. É compreensível.',
      'Não deixe o medo guiar seus votos.',
      'Concentre-se em fatos, não em boatos.',
    ],
  },
  {
    npcId: 'otto',
    day: 2,
    lines: [
      'Vou defender quem acredito ser inocente até o fim.',
      'Se errar, que seja com integridade.',
      'Meu voto vai para quem esconde mais.',
    ],
  },

  // Dia 3
  {
    npcId: 'helena',
    day: 3,
    lines: [
      'Este é o último dia. Temos que acertar.',
      'Reúna todas as pistas antes de votar.',
      'Eu acredito que sei quem são. Você?',
    ],
  },
  {
    npcId: 'bento',
    day: 3,
    lines: [
      'Chegamos longe juntos. Vamos fazer certo.',
      'Meu voto será em quem menos cooperou.',
      'Confie em mim. Sempre fui honesto com você.',
    ],
  },
  {
    npcId: 'marina',
    day: 3,
    lines: [
      'Estou com medo. E se votarmos errado?',
      'Bento sempre tinha resposta para tudo...',
      'Vamos lá. Não podemos falhar agora.',
    ],
  },
  {
    npcId: 'davi',
    day: 3,
    lines: [
      'As evidências são claras se você as analisou.',
      'Não deixe carisma superar fatos.',
      'Vote com a razão, não com o coração.',
    ],
  },
  {
    npcId: 'cassia',
    day: 3,
    lines: [
      'Não há motivo para desconfiar de mim.',
      'Olhe para quem tem mais pistas apontadas.',
      'Façamos o que é certo pelo grupo.',
    ],
  },
  {
    npcId: 'otto',
    day: 3,
    lines: [
      'Chegou a hora da verdade.',
      'Não tenho medo de votar com convicção.',
      'Se errarmos, os Traidores vencem. Não podemos errar.',
    ],
  },
];
