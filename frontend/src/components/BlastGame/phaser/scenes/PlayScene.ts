import Phaser from 'phaser'
import type { BlastGameResult, BlastQuestion, BlastSceneData } from '../types'

type AnswerAsteroid = Phaser.Physics.Arcade.Image & {
  answerValue: number
  baseX: number
  floatOffset: number
  label: Phaser.GameObjects.Text
  glow: Phaser.GameObjects.Ellipse
}

const WORLD_WIDTH = 1280
const WORLD_HEIGHT = 800
const PLAYER_Y = WORLD_HEIGHT - 110
const MAX_LIVES = 3
const LASER_SPEED = 880
const ROUND_DELAY_MS = 950
const SCORE_PER_HIT = 100

export class PlayScene extends Phaser.Scene {
  private questions: BlastQuestion[] = []
  private onGameOver: ((result: BlastGameResult) => void) | null = null
  private currentQuestionIndex = 0
  private score = 0
  private lives = MAX_LIVES
  private combo = 0
  private bestCombo = 0
  private wrongAnswers = 0
  private isRoundLocked = false

  private starsFar: Phaser.GameObjects.Arc[] = []
  private starsNear: Phaser.GameObjects.Arc[] = []
  private player!: Phaser.GameObjects.Container
  private playerBody!: Phaser.Physics.Arcade.Body
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private spaceKey!: Phaser.Input.Keyboard.Key
  private asteroidGroup!: Phaser.Physics.Arcade.Group
  private laserGroup!: Phaser.Physics.Arcade.Group
  private answerAsteroids: AnswerAsteroid[] = []
  private currentQuestion!: BlastQuestion

  private questionText!: Phaser.GameObjects.Text
  private scoreText!: Phaser.GameObjects.Text
  private livesText!: Phaser.GameObjects.Text
  private comboText!: Phaser.GameObjects.Text
  private feedbackText!: Phaser.GameObjects.Text
  private roundText!: Phaser.GameObjects.Text

  constructor() {
    super('PlayScene')
  }

  init(data: BlastSceneData) {
    this.questions = data.questions
    this.onGameOver = data.onGameOver
    this.currentQuestionIndex = 0
    this.score = 0
    this.lives = MAX_LIVES
    this.combo = 0
    this.bestCombo = 0
    this.wrongAnswers = 0
    this.isRoundLocked = false
  }

  create() {
    this.createTextures()
    this.createBackground()
    this.createHud()
    this.createPlayer()
    this.createGroups()
    this.createInput()
    this.spawnQuestion()
  }

  update(_: number, delta: number) {
    const dt = delta / 1000
    this.updateStarfield(dt)
    this.updatePlayer()
    this.updateAsteroidFloat(delta)
    this.cleanupLasers()
  }

  private createTextures() {
    if (!this.textures.exists('blast-asteroid')) {
      const g = this.make.graphics()

      g.fillStyle(0x3b2f52, 1)
      g.fillCircle(54, 54, 50)
      g.fillStyle(0x5b4b7f, 1)
      g.fillCircle(38, 42, 14)
      g.fillCircle(72, 38, 10)
      g.fillCircle(72, 72, 9)
      g.lineStyle(6, 0x9d8cff, 0.6)
      g.strokeCircle(54, 54, 44)
      g.generateTexture('blast-asteroid', 108, 108)
      g.destroy()
    }

    if (!this.textures.exists('blast-laser')) {
      const g = this.make.graphics()
      g.fillStyle(0x67e8f9, 1)
      g.fillRoundedRect(0, 0, 10, 36, 4)
      g.generateTexture('blast-laser', 10, 36)
      g.destroy()
    }

    if (!this.textures.exists('blast-particle')) {
      const g = this.make.graphics()
      g.fillStyle(0xfbbf24, 1)
      g.fillCircle(6, 6, 6)
      g.generateTexture('blast-particle', 12, 12)
      g.destroy()
    }
  }

  private createBackground() {
    this.add.rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 0x020617).setOrigin(0)
    this.add.ellipse(280, 220, 420, 300, 0x082f49, 0.22)
    this.add.ellipse(990, 180, 300, 240, 0x581c87, 0.18)
    this.add.ellipse(640, 720, 700, 220, 0x0f766e, 0.1)

    this.starsFar = Array.from({ length: 90 }, () =>
      this.add.circle(
        Phaser.Math.Between(0, WORLD_WIDTH),
        Phaser.Math.Between(0, WORLD_HEIGHT),
        Phaser.Math.FloatBetween(0.8, 1.8),
        0xe2e8f0,
        Phaser.Math.FloatBetween(0.3, 0.9),
      ),
    )

    this.starsNear = Array.from({ length: 45 }, () =>
      this.add.circle(
        Phaser.Math.Between(0, WORLD_WIDTH),
        Phaser.Math.Between(0, WORLD_HEIGHT),
        Phaser.Math.FloatBetween(1.5, 3.1),
        0xffffff,
        Phaser.Math.FloatBetween(0.5, 1),
      ),
    )
  }

  private createHud() {
    const panel = this.add.rectangle(640, 68, 1170, 110, 0x020617, 0.58)
    panel.setStrokeStyle(2, 0x38bdf8, 0.2)

    this.scoreText = this.add.text(84, 34, 'Score 0000', {
      color: '#67e8f9',
      fontFamily: 'Nunito, sans-serif',
      fontSize: '28px',
      fontStyle: '900',
    })

    this.livesText = this.add.text(84, 68, '', {
      color: '#fb7185',
      fontFamily: 'Nunito, sans-serif',
      fontSize: '30px',
      fontStyle: '900',
    })

    this.comboText = this.add.text(1040, 34, 'Combo x1', {
      color: '#facc15',
      fontFamily: 'Nunito, sans-serif',
      fontSize: '28px',
      fontStyle: '900',
    })

    this.roundText = this.add.text(1020, 68, '', {
      color: '#cbd5e1',
      fontFamily: 'Nunito, sans-serif',
      fontSize: '22px',
      fontStyle: '700',
    })

    this.questionText = this.add
      .text(640, 155, '', {
        color: '#f8fafc',
        fontFamily: 'Nunito, sans-serif',
        fontSize: '40px',
        fontStyle: '900',
        align: 'center',
        wordWrap: { width: 1000, useAdvancedWrap: true },
      })
      .setOrigin(0.5, 0)

    this.feedbackText = this.add
      .text(640, 214, 'Schieße den richtigen Kometen ab!', {
        color: '#93c5fd',
        fontFamily: 'Nunito, sans-serif',
        fontSize: '24px',
        fontStyle: '800',
      })
      .setOrigin(0.5, 0)
  }

  private createPlayer() {
    const glow = this.add.ellipse(0, 28, 88, 28, 0x22d3ee, 0.28)
    const engineFlame = this.add.text(0, 36, '🔥', {
      fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif',
      fontSize: '24px',
    }).setOrigin(0.5, 0.5)
    const rocket = this.add.text(0, 0, '🚀', {
      fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif',
      fontSize: '62px',
    }).setOrigin(0.5, 0.5)

    this.player = this.add.container(WORLD_WIDTH / 2, PLAYER_Y, [glow, engineFlame, rocket])
    this.physics.add.existing(this.player)
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body
    this.playerBody.setSize(54, 70)
    this.playerBody.setAllowGravity(false)
    this.playerBody.setCollideWorldBounds(true)
    this.playerBody.setOffset(-27, -35)

    this.tweens.add({
      targets: engineFlame,
      scaleY: 1.25,
      alpha: 0.8,
      duration: 140,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  private createGroups() {
    this.asteroidGroup = this.physics.add.group({ allowGravity: false, immovable: true })
    this.laserGroup = this.physics.add.group({ allowGravity: false, maxSize: 6 })
  }

  private createInput() {
    this.cursors = this.input.keyboard?.createCursorKeys() ?? ({} as Phaser.Types.Input.Keyboard.CursorKeys)
    this.spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE) as Phaser.Input.Keyboard.Key

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return
      this.player.x = Phaser.Math.Clamp(pointer.x, 90, WORLD_WIDTH - 90)
    })
  }

  private spawnQuestion() {
    this.clearCurrentAsteroids()

    this.currentQuestion = this.questions[this.currentQuestionIndex]
    this.questionText.setText(this.currentQuestion.question)
    this.feedbackText.setText('Schieße den richtigen Kometen ab!')
    this.feedbackText.setColor('#93c5fd')
    this.roundText.setText(`Runde ${this.currentQuestionIndex + 1}/${this.questions.length}`)
    this.comboText.setText(`Combo x${Math.max(this.combo, 1)}`)
    this.livesText.setText(this.getLivesDisplay())
    this.scoreText.setText(`Score ${this.score.toString().padStart(4, '0')}`)

    const positions = [
      { x: 220, y: 340 },
      { x: 500, y: 300 },
      { x: 780, y: 300 },
      { x: 1060, y: 340 },
    ]

    this.answerAsteroids = this.currentQuestion.options.map((option, index) => {
      const pos = positions[index]
      const asteroid = this.physics.add.image(pos.x, pos.y, 'blast-asteroid') as AnswerAsteroid
      asteroid.setScale(1.08)
      asteroid.setImmovable(true)
      asteroid.setCircle(44, 10, 10)
      asteroid.setTint(index % 2 === 0 ? 0xc4b5fd : 0xa5f3fc)
      asteroid.answerValue = option
      asteroid.baseX = pos.x
      asteroid.floatOffset = Math.random() * Math.PI * 2

      const glow = this.add.ellipse(pos.x, pos.y, 128, 128, 0x38bdf8, 0.09)
      const label = this.add
        .text(pos.x, pos.y, String(option), {
          color: '#f8fafc',
          fontFamily: 'Nunito, sans-serif',
          fontSize: '30px',
          fontStyle: '900',
          align: 'center',
        })
        .setOrigin(0.5)

      asteroid.label = label
      asteroid.glow = glow

      asteroid.setInteractive({ useHandCursor: true })
      asteroid.on('pointerdown', () => {
        if (this.isRoundLocked) return
        this.fireLaserAt(asteroid)
      })

      this.asteroidGroup.add(asteroid)
      return asteroid
    })
  }

  private clearCurrentAsteroids() {
    for (const asteroid of this.answerAsteroids) {
      asteroid.label.destroy()
      asteroid.glow.destroy()
      asteroid.destroy()
    }
    this.answerAsteroids = []
  }

  private updateStarfield(dt: number) {
    for (const star of this.starsFar) {
      star.y += 30 * dt
      if (star.y > WORLD_HEIGHT + 12) {
        star.y = -10
        star.x = Phaser.Math.Between(0, WORLD_WIDTH)
      }
    }

    for (const star of this.starsNear) {
      star.y += 88 * dt
      if (star.y > WORLD_HEIGHT + 14) {
        star.y = -14
        star.x = Phaser.Math.Between(0, WORLD_WIDTH)
      }
    }
  }

  private updatePlayer() {
    if (this.isRoundLocked) return

    const speed = 440
    let velocityX = 0

    if (this.cursors.left?.isDown) velocityX = -speed
    if (this.cursors.right?.isDown) velocityX = speed

    this.playerBody.setVelocityX(velocityX)

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.answerAsteroids.length > 0) {
      const nearest = this.answerAsteroids.reduce((prev, current) => {
        return Math.abs(current.x - this.player.x) < Math.abs(prev.x - this.player.x) ? current : prev
      })
      this.fireLaserAt(nearest)
    }
  }

  private updateAsteroidFloat(delta: number) {
    const time = this.time.now / 900
    for (const asteroid of this.answerAsteroids) {
      asteroid.x = asteroid.baseX + Math.sin(time + asteroid.floatOffset) * 16
      asteroid.y += Math.cos(time * 1.4 + asteroid.floatOffset) * 0.18 * (delta / 16.67)
      asteroid.label.setPosition(asteroid.x, asteroid.y)
      asteroid.glow.setPosition(asteroid.x, asteroid.y)
    }
  }

  private fireLaserAt(target: AnswerAsteroid) {
    if (this.isRoundLocked) return

    this.isRoundLocked = true

    const targetX = target.x
    const targetY = target.y
    const laser = this.physics.add.image(this.player.x, PLAYER_Y - 54, 'blast-laser')
    laser.setDepth(2)
    laser.setRotation(Phaser.Math.Angle.Between(laser.x, laser.y, targetX, targetY) + Math.PI / 2)
    this.laserGroup.add(laser)

    const travelDistance = Phaser.Math.Distance.Between(laser.x, laser.y, targetX, targetY)
    const travelDuration = Math.max(180, (travelDistance / LASER_SPEED) * 1000)

    this.tweens.add({
      targets: laser,
      x: targetX,
      y: targetY,
      duration: travelDuration,
      ease: 'Quad.easeOut',
      onComplete: () => {
        laser.destroy()
        this.resolveAnswer(target)
      },
    })

    this.tweens.add({
      targets: this.player,
      y: PLAYER_Y - 16,
      duration: 80,
      yoyo: true,
      ease: 'Quad.easeOut',
    })
  }

  private cleanupLasers() {
    for (const child of this.laserGroup.getChildren()) {
      const laser = child as Phaser.Physics.Arcade.Image
      if (laser.y < -40 || laser.x < -40 || laser.x > WORLD_WIDTH + 40) {
        laser.destroy()
      }
    }
  }

  private resolveAnswer(asteroid: AnswerAsteroid) {
    const isCorrect = asteroid.answerValue === this.currentQuestion.correctAnswer

    if (isCorrect) {
      this.score += SCORE_PER_HIT
      this.combo += 1
      this.bestCombo = Math.max(this.bestCombo, this.combo)
      this.feedbackText.setText('Direkter Treffer! Richtige Antwort!')
      this.feedbackText.setColor('#4ade80')
      this.animateCorrectHit(asteroid)
    } else {
      this.lives -= 1
      this.wrongAnswers += 1
      this.combo = 0
      this.feedbackText.setText(`Daneben! Richtig wäre ${this.currentQuestion.correctAnswer}.`)
      this.feedbackText.setColor('#f87171')
      this.animateWrongHit(asteroid)
      this.highlightCorrectAsteroid()
      this.cameras.main.shake(220, 0.008)
    }

    this.scoreText.setText(`Score ${this.score.toString().padStart(4, '0')}`)
    this.comboText.setText(`Combo x${Math.max(this.combo, 1)}`)
    this.livesText.setText(this.getLivesDisplay())

    this.time.delayedCall(ROUND_DELAY_MS, () => {
      if (this.lives <= 0) {
        this.finishGame()
        return
      }

      if (this.currentQuestionIndex >= this.questions.length - 1) {
        this.finishGame()
        return
      }

      this.currentQuestionIndex += 1
      this.isRoundLocked = false
      this.spawnQuestion()
    })
  }

  private animateCorrectHit(asteroid: AnswerAsteroid) {
    this.createExplosion(asteroid.x, asteroid.y, 0x4ade80)
    this.cameras.main.shake(120, 0.004)
    this.tweens.add({
      targets: [asteroid, asteroid.label, asteroid.glow],
      scale: 0,
      alpha: 0,
      duration: 280,
      ease: 'Back.easeIn',
    })
  }

  private animateWrongHit(asteroid: AnswerAsteroid) {
    this.createExplosion(asteroid.x, asteroid.y, 0xfb7185)
    asteroid.setTint(0xfb7185)
    asteroid.glow.setFillStyle(0xfb7185, 0.16)
    this.tweens.add({
      targets: asteroid,
      angle: { from: -8, to: 8 },
      yoyo: true,
      repeat: 3,
      duration: 45,
    })
  }

  private highlightCorrectAsteroid() {
    const correct = this.answerAsteroids.find(
      (asteroid) => asteroid.answerValue === this.currentQuestion.correctAnswer,
    )
    if (!correct) return

    correct.setTint(0x4ade80)
    correct.glow.setFillStyle(0x4ade80, 0.18)
    this.tweens.add({
      targets: [correct, correct.label],
      scale: 1.12,
      duration: 180,
      yoyo: true,
      repeat: 1,
    })
  }

  private createExplosion(x: number, y: number, color: number) {
    const particles = this.add.particles(x, y, 'blast-particle', {
      speed: { min: 120, max: 340 },
      scale: { start: 1.25, end: 0 },
      blendMode: 'ADD',
      lifespan: 450,
      tint: color,
      quantity: 18,
    })

    this.time.delayedCall(450, () => particles.destroy())
  }

  private getLivesDisplay() {
    const filledHearts = Array.from({ length: this.lives }, () => '❤️').join(' ')
    const emptyHearts = Array.from({ length: Math.max(0, MAX_LIVES - this.lives) }, () => '🖤').join(' ')

    return [filledHearts, emptyHearts].filter(Boolean).join(' ')
  }

  private finishGame() {
    this.clearCurrentAsteroids()

    const result: BlastGameResult = {
      score: this.score,
      totalQuestions: this.questions.length,
      correctAnswers: this.questions.length - this.wrongAnswers,
      wrongAnswers: this.wrongAnswers,
      bestCombo: this.bestCombo,
      livesRemaining: this.lives,
    }

    this.onGameOver?.(result)
  }
}
