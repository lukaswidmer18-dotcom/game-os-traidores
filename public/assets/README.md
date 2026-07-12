# Assets

Pixel art dos tilesets **Kenney** (kenney.nl), licença **CC0 1.0** (domínio
público — uso livre, inclusive comercial, sem atribuição obrigatória).

| Arquivo | Pack de origem | Uso no jogo |
|---|---|---|
| `roguelike-base.png` | [Roguelike/RPG pack](https://kenney.nl/assets/roguelike-rpg-pack) | Pisos, paredes, portas, estantes, lareira, jardim |
| `roguelike-indoor.png` | [Roguelike Indoors](https://kenney.nl/assets/roguelike-indoors) | Mobília: mesas, cadeiras, tapete, piano, cozinha |
| `roguelike-chars.png` | [Roguelike Characters](https://kenney.nl/assets/roguelike-characters) | Jogador e NPCs (compostos por camadas em runtime) |

Grade dos sheets: tiles 16×16 com 1px de espaçamento (stride 17px).
Mapeamento de frames em `src/assets/tileArt.ts`; composição de personagens
em `src/assets/characterArt.ts`. Retratos da UI seguem procedurais
(`src/assets/portraits.ts`).
