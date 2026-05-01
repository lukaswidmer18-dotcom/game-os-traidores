export interface StoryDay {
  day: number;
  title: string;
  intro: string;
  nightEvent: string;
}

export const STORY_DAYS: StoryDay[] = [
  {
    day: 1,
    title: 'Dia 1 — A Chegada',
    intro:
      'Você chega à Mansão Velhart. Seis pessoas, um segredo. Dois deles são Traidores. Explore, converse e colete pistas antes do Conselho.',
    nightEvent:
      'A noite cai. Os Traidores se reúnem nas sombras e escolhem sua primeira vítima.',
  },
  {
    day: 2,
    title: 'Dia 2 — Primeira Eliminação',
    intro:
      'Alguém foi eliminado esta noite. A tensão aumenta. Investigue mais fundo — o tempo está acabando.',
    nightEvent:
      'Mais uma noite perigosa. Os Traidores agem novamente. Você sobreviverá?',
  },
  {
    day: 3,
    title: 'Dia 3 — A Decisão Final',
    intro:
      'Este é o último Conselho. Vote corretamente agora ou os Traidores vencerão para sempre.',
    nightEvent: 'A mansão guarda seus últimos segredos. Tudo termina esta noite.',
  },
];
