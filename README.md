# Entre Fiéis e Traidores

Jogo 2D single-player de dedução social. Você chega à Mansão Velhart com **8 hóspedes — 2 são Traidores, sorteados a cada partida**. Explore, interrogue, forme alianças, colete pistas e vote no Conselho para eliminar os Traidores antes que eles dominem a mansão (ou eliminem você).

## Stack

- [Phaser 3](https://phaser.io/) — engine do jogo
- TypeScript
- Vite

## Como rodar

```bash
npm install
npm run dev      # servidor local (http://localhost:5173)
npm run build    # checagem de tipos (tsc) + build de produção em dist/
npm run preview  # serve o build de produção
```

Sem variáveis de ambiente — o jogo roda 100% no navegador, sem backend.

## Como jogar

- **Setas / WASD** — andar pela mansão (exploração top-down); os NPCs circulam pelos cômodos e param quando você se aproxima
- **E** perto de um NPC — abre o interrogatório; pergunte com clique ou teclas **1-5** (álibi, pressão, pedir um nome, confrontar com pista, **propor aliança**)
- **E** perto de um marcador dourado — examina a pista
- **J** — Livro do Investigador (Pistas / Pessoas / Diário) | **C** — abre direto nas Pistas | **ESC** — fecha painéis
- **6 ações por dia** (pergunta ou pista = 1 ação); esgotar as ações encerra o dia e força o Conselho
- **Alianças**: Fiéis que confiam em você aceitam — seguem seu voto e vigiam sua porta à noite. Um Traidor **sempre aceita, fingindo** — e passa a te observar
- **Eventos espontâneos** pontuam o dia: avistamentos, boatos e presságios entram no Diário e mexem na suspeita do grupo
- Após 2 interrogatórios + 1 pista + 3 ações, o Conselho libera (**TAB** ou botão): vote em quem eliminar
- A cada noite os Traidores eliminam alguém e deixam uma **cena do crime** com pista nova no cômodo da vítima — e podem vir atrás de você se você se expor demais
- 3 dias para acertar os dois Traidores

## Mecânicas centrais

| Sistema | Comportamento |
|---|---|
| Papéis | 8 hóspedes, 2 Traidores sorteados por partida ([RunState.ts](src/systems/RunState.ts)) |
| Alianças | Fiel aliado vota com você e reduz risco noturno; Traidor "aliado" é espião ([InterrogationSystem.ts](src/systems/InterrogationSystem.ts)) |
| Eventos | Avistamentos/boatos/presságios aleatórios durante o dia ([spontaneousEvents.ts](src/data/spontaneousEvents.ts)) |
| Livro | Diário com pistas, leitura das pessoas e acontecimentos ([Journal.ts](src/ui/Journal.ts)) |
| Pistas | Geradas dinamicamente apontando para os Traidores da partida; revelações fortes só no dia 3 ([clues.ts](src/data/clues.ts)) |
| Persistência | Confiança, suspeita e pistas persistem entre os dias na mesma partida |
| Votação | Fiéis votam ponderado por suspeita; quem confia em você tende a seguir seu voto; Traidores nunca votam no parceiro ([VoteSystem.ts](src/systems/VoteSystem.ts)) |
| Risco noturno | Pressionar Traidores aumenta sua exposição — eles podem vir atrás de você à noite |
| Diálogos | Acusações usam o token `{suspeito}`: Fiéis apontam Traidores reais, Traidores desinformam apontando Fiéis |
| Arte | Tilesets **Kenney** (CC0) em `public/assets/`: mapa com pisos, paredes, portas e mobília reais ([tileArt.ts](src/assets/tileArt.ts)) e personagens compostos por camadas corpo+roupa+cabelo ([characterArt.ts](src/assets/characterArt.ts)); retratos da UI seguem procedurais ([portraits.ts](src/assets/portraits.ts)) |

## Estrutura

```
src/
  scenes/    BootScene, ExplorationScene (andar/investigar), CouncilScene
             (votação), NightScene (eliminação noturna), GameOverScene
  systems/   RunState (estado da partida), TrustSystem, ClueSystem,
             DialogueSystem, InterrogationSystem, VoteSystem
  data/      NPCs, diálogos, pistas (gerador), acontecimentos, dias, mapa (world)
  assets/    arte do jogo: mapeamento dos tilesets Kenney (tileArt),
             composição de personagens (characterArt) e retratos (portraits)
public/
  assets/    spritesheets Kenney CC0 (créditos em public/assets/README.md)
  entities/  Player (andar/colisão) e NPC (sprites no mapa)
  ui/        HUD, DialogueBox, CluePanel, InterrogationPanel
  design/    paleta e efeitos visuais
```

## Testes

Lógica de jogo (sorteio de papéis, geração de pistas, votação, tokens de diálogo) é pura e desacoplada do Phaser. Não há test runner configurado ainda; a validação atual é o `tsc` no build. Sugestão futura: adicionar Vitest para os módulos de `src/systems/`.
