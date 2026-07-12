import Phaser from 'phaser';
import { GAME_CONFIG } from './config/gameConfig';
import { armAudioUnlock, audio } from './systems/AudioSystem';

const game = new Phaser.Game(GAME_CONFIG);
armAudioUnlock();

// Exposto para ferramentas de teste/automação (Playwright) inspecionarem cenas.
(window as unknown as { __game: Phaser.Game }).__game = game;
(window as unknown as { __audio: typeof audio }).__audio = audio;
