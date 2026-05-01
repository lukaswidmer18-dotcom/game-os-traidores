import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { SocialGameScene } from '../scenes/SocialGameScene';
import { CouncilScene } from '../scenes/CouncilScene';
import { NightScene } from '../scenes/NightScene';
import { GameOverScene } from '../scenes/GameOverScene';

export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 560,
  backgroundColor: '#06060f',
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scene: [BootScene, SocialGameScene, CouncilScene, NightScene, GameOverScene],
};
