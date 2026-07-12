import Phaser from 'phaser';
import { GAME_CONFIG } from './config/gameConfig';

const game = new Phaser.Game(GAME_CONFIG);

// Exposto para ferramentas de teste/automação (Playwright) inspecionarem cenas.
(window as unknown as { __game: Phaser.Game }).__game = game;
