export interface BlastQuestion {
  id: number
  question: string
  correctAnswer: number
  options: number[]
  difficulty: 'easy' | 'medium' | 'hard'
  topic: string
  explanation: string
  xpReward: number
}

export interface BlastGameResult {
  score: number
  totalQuestions: number
  correctAnswers: number
  wrongAnswers: number
  bestCombo: number
  livesRemaining: number
}

export interface BlastGameInit {
  parent: HTMLDivElement
  questions: BlastQuestion[]
  onGameOver: (result: BlastGameResult) => void
}

export interface BlastSceneData {
  questions: BlastQuestion[]
  onGameOver: (result: BlastGameResult) => void
}
