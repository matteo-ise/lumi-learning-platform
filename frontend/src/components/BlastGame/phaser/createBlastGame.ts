import Phaser from 'phaser'
import { PlayScene } from './scenes/PlayScene'
import type { BlastGameInit } from './types'

export function createBlastGame({ parent, questions, onGameOver }: BlastGameInit): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#020617',
    width: 1280,
    height: 800,
    render: {
      antialias: true,
      pixelArt: false,
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 1280,
      height: 800,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0, x: 0 },
        debug: false,
      },
    },
    scene: [],
    callbacks: {
      postBoot: (game) => {
        game.scene.add('PlayScene', PlayScene, true, { questions, onGameOver })
      },
    },
  })
}
