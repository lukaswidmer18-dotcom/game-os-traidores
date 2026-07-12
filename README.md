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

- **Setas / WASD** — andar pela mansão (exploração top-down com câmera que segue você em zoom 2x); os NPCs têm rotinas próprias: **circulam entre os cômodos pelas portas**, conversam entre si (balões "…") e param quando você se aproxima
- A mansão tem **14 ambientes contíguos**: Foyer, Biblioteca, Escritório, Salão Principal, Corredor dos Quartos, Cozinha, Adega, Estufa, Mesa do Conselho, Jardim, **Capela, Quarto do Anfitrião** e duas áreas ocultas — o **Porão** (trancado; a chave está escondida em algum lugar da mansão) e a **Cripta** (atrás de uma passagem secreta no Conselho). As salas ocultas guardam as pistas mais fortes
- Pegar **itens-chave** e abrir portas **não gasta ação** — explorar é sempre grátis
- **Cutscenes** abrem cada dia (panorâmica da mansão no dia 1; descoberta do corpo nos seguintes) — **ESPAÇO** pula
- **E** perto de um NPC — abre o interrogatório; pergunte com clique ou teclas **1-5** (álibi, pressão, pedir um nome, confrontar com pista, **propor aliança**)
- **E** perto de um marcador dourado — examina a pista; **E** em portas trancadas/estantes suspeitas — interage
- **J** — Livro do Investigador (Pistas / Pessoas / Diário) | **C** — abre direto nas Pistas | **ESC** — fecha painéis | **M** — liga/desliga o som
- **6 ações por dia** (pergunta ou pista = 1 ação); esgotar as ações encerra o dia e força o Conselho
- **Alianças**: Fiéis que confiam em você aceitam — seguem seu voto e vigiam sua porta à noite. Um Traidor **sempre aceita, fingindo** — e passa a te observar
- **Eventos espontâneos** pontuam o dia: avistamentos, boatos, presságios e **conversas flagradas entre NPCs** entram no Diário e mexem na suspeita do grupo
- Após 2 interrogatórios + 1 pista + 3 ações, o Conselho libera (**TAB** ou botão): vote em quem eliminar
- **A noite é interativa**: como Fiel, escolha entre **trancar a porta** (seguro), **vigiar os corredores** (pode flagrar o assassino em ação — ou ser notado) ou **dormir**; como Traidor, **você escolhe a vítima da noite**
- A cada noite os Traidores eliminam alguém e deixam uma **cena do crime** com pista nova no cômodo da vítima — e podem vir atrás de você se você se expor demais
- **5 dias** para acertar os dois Traidores
- **Áudio procedural** (WebAudio, sem assets): drones ambientes por cena, passos, rangido de portas, chimes de coleta e stingers de tensão

## Mecânicas centrais

| Sistema | Comportamento |
|---|---|
| Papéis | 8 hóspedes, 2 Traidores sorteados por partida ([RunState.ts](src/systems/RunState.ts)) |
| Alianças | Fiel aliado vota com você e reduz risco noturno; Traidor "aliado" é espião ([InterrogationSystem.ts](src/systems/InterrogationSystem.ts)) |
| Eventos | Avistamentos/boatos/presságios aleatórios durante o dia ([spontaneousEvents.ts](src/data/spontaneousEvents.ts)) |
| Rotinas de NPC | NPCs viajam entre salas pelo grafo de portas e conversam quando dividem um cômodo ([world.ts](src/data/world.ts), [NPC.ts](src/entities/NPC.ts)) |
| Salas ocultas | Porão trancado por chave e Cripta atrás de passagem secreta; estado persiste entre os dias ([world.ts](src/data/world.ts)) |
| Noite interativa | Fiel escolhe trancar/vigiar/dormir (vigiar pode flagrar o assassino); Traidor escolhe a vítima ([NightScene.ts](src/scenes/NightScene.ts)) |
| Áudio | Sistema procedural WebAudio: drones, passos, rangidos, chimes e stingers, sem nenhum asset ([AudioSystem.ts](src/systems/AudioSystem.ts)) |
| Livro | Diário com pistas, leitura das pessoas e acontecimentos ([Journal.ts](src/ui/Journal.ts)) |
| Pistas | Geradas dinamicamente apontando para os Traidores da partida; revelações fortes nos dias 2-3, escondidas nas salas ocultas ([clues.ts](src/data/clues.ts)) |
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
             DialogueSystem, InterrogationSystem, VoteSystem, CutscenePlayer,
             AudioSystem (som procedural WebAudio)
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
