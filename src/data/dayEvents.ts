export interface DayEvent {
  id: string;
  day: number;
  title: string;
  summary: string;
  clueId: string;
}

export const DAY_EVENTS: DayEvent[] = [
  {
    id: 'library_glove',
    day: 1,
    title: 'Estante mexida',
    summary:
      'Voce revisita a biblioteca e encontra marcas recentes no po da estante. Alguem mexeu nos livros depois da meia-noite.',
    clueId: 'clue_glove',
  },
  {
    id: 'kitchen_note',
    day: 1,
    title: 'Bilhete na cozinha',
    summary:
      'A cozinha ainda esta quente. Entre panelas e panos, um bilhete dobrado chama sua atencao.',
    clueId: 'clue_note',
  },
  {
    id: 'garden_tracks',
    day: 2,
    title: 'Rastros no jardim',
    summary:
      'A chuva da madrugada deixou o jardim exposto. As pegadas apontam para uma saida que quase ninguem menciona.',
    clueId: 'clue_footprint',
  },
  {
    id: 'corridor_diary',
    day: 2,
    title: 'Pagina rasgada',
    summary:
      'No corredor dos quartos, uma folha presa sob o tapete revela uma conversa que alguem tentou esconder.',
    clueId: 'clue_diary',
  },
  {
    id: 'hall_map',
    day: 3,
    title: 'Mapa marcado',
    summary:
      'No salao principal, um mapa da mansao foi deixado aberto como se alguem tivesse saido com pressa.',
    clueId: 'clue_map',
  },
  {
    id: 'council_candle',
    day: 3,
    title: 'Vela ainda morna',
    summary:
      'Na mesa do conselho, a cera fresca denuncia uma reuniao secreta muito antes da votacao.',
    clueId: 'clue_candle',
  },
];
