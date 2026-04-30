export type Role = 'faithful' | 'traitor';

export interface NPCData {
  id: string;
  name: string;
  role: Role;
  personality: string;
  trustLevel: number;   // 0-100: confiança no jogador
  suspicionLevel: number; // 0-100: suspeita pública sobre o NPC
  color: number;        // cor do placeholder pixelado
  startRoom: string;
  alive: boolean;
}

export const NPC_DATA: NPCData[] = [
  {
    id: 'helena',
    name: 'Helena',
    role: 'faithful',
    personality: 'Observadora e cautelosa. Suspeita de todos, mas raramente se expõe.',
    trustLevel: 40,
    suspicionLevel: 20,
    color: 0xe8a0c0,
    startRoom: 'library',
    alive: true,
  },
  {
    id: 'bento',
    name: 'Bento',
    role: 'traitor',
    personality: 'Carismático e manipulador. Sempre tem uma explicação para tudo.',
    trustLevel: 60,
    suspicionLevel: 10,
    color: 0x7090e8,
    startRoom: 'hall',
    alive: true,
  },
  {
    id: 'marina',
    name: 'Marina',
    role: 'faithful',
    personality: 'Ansiosa e hiperativa. Fala demais e às vezes se contradiz.',
    trustLevel: 55,
    suspicionLevel: 35,
    color: 0xa0d888,
    startRoom: 'kitchen',
    alive: true,
  },
  {
    id: 'davi',
    name: 'Davi',
    role: 'faithful',
    personality: 'Calmo e analítico. Prefere ouvir antes de falar.',
    trustLevel: 50,
    suspicionLevel: 25,
    color: 0xf0c060,
    startRoom: 'garden',
    alive: true,
  },
  {
    id: 'cassia',
    name: 'Cássia',
    role: 'traitor',
    personality: 'Fria e estratégica. Planta dúvidas sutilmente.',
    trustLevel: 45,
    suspicionLevel: 15,
    color: 0xd080d0,
    startRoom: 'corridor',
    alive: true,
  },
  {
    id: 'otto',
    name: 'Otto',
    role: 'faithful',
    personality: 'Leal e direto. Defende os outros sem calcular os riscos.',
    trustLevel: 65,
    suspicionLevel: 40,
    color: 0xe87050,
    startRoom: 'hall',
    alive: true,
  },
];
