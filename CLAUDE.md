# Entre Fiéis e Traidores

Jogo 2D pixel art single-player de dedução social, investigação e narrativa.

## Conceito

O jogador participa de uma competição misteriosa em uma mansão. Alguns NPCs são Fiéis e outros são Traidores. O jogador precisa conversar, investigar, coletar pistas e votar corretamente para eliminar os Traidores antes que eles vençam.

## Stack

- Phaser
- TypeScript
- Vite

## Regras do projeto

- O jogo é single-player.
- Não implementar multiplayer nesta fase.
- Usar pixel art ou placeholders pixelados.
- Priorizar mecânicas jogáveis antes de arte final.
- Manter código modular e simples.
- Evitar dependências desnecessárias.
- Rodar build após alterações importantes.

## Sistemas principais

- Exploração top-down
- NPCs com papéis secretos
- Sistema de diálogo
- Sistema de pistas
- Sistema de confiança
- Sistema de suspeita
- Sistema de votação
- Ciclo de dias
- Eliminação noturna
- Finais diferentes

## Estrutura desejada

- `src/scenes`: cenas do jogo
- `src/entities`: jogador e NPCs
- `src/systems`: sistemas de gameplay
- `src/data`: dados de personagens, diálogos e pistas
- `src/ui`: interface do jogador

## MVP

A primeira versão jogável deve conter:

- Jogador andando pela mansão
- 6 NPCs
- 2 Traidores
- 3 dias de jogo
- Diálogos simples
- Pistas coletáveis
- Mesa do Conselho
- Votação
- Eliminação noturna
- Vitória e derrota
