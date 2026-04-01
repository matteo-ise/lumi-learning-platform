import type { BlastQuestion } from './phaser/types'

interface MathTaskSeed {
  id: number
  question: string
  correctAnswer: number
  options: number[]
  difficulty: BlastQuestion['difficulty']
  topic: string
  explanation: string
  xpReward: number
}

const TASK_SEEDS: Record<number, MathTaskSeed[]> = {
  1: [
    { id: 101, question: 'Was ist 1 + 1?', correctAnswer: 2, options: [1, 2, 3, 4], difficulty: 'easy', topic: 'Addition', explanation: '1 plus 1 ergibt 2.', xpReward: 10 },
    { id: 102, question: 'Was ist 5 - 2?', correctAnswer: 3, options: [2, 3, 4, 5], difficulty: 'easy', topic: 'Subtraktion', explanation: 'Wenn du von 5 zwei wegnimmst, bleiben 3.', xpReward: 10 },
    { id: 103, question: 'Was ist 3 + 4?', correctAnswer: 7, options: [6, 7, 8, 9], difficulty: 'easy', topic: 'Addition', explanation: '3 plus 4 ist 7.', xpReward: 10 },
    { id: 104, question: 'Was ist 10 - 5?', correctAnswer: 5, options: [4, 5, 6, 7], difficulty: 'easy', topic: 'Subtraktion', explanation: '10 minus 5 ergibt 5.', xpReward: 10 },
    { id: 105, question: 'Was ist 6 + 2?', correctAnswer: 8, options: [7, 8, 9, 10], difficulty: 'easy', topic: 'Addition', explanation: '6 plus 2 ist 8.', xpReward: 10 },
    { id: 106, question: 'Was ist 9 - 4?', correctAnswer: 5, options: [4, 5, 6, 7], difficulty: 'easy', topic: 'Subtraktion', explanation: 'Von 9 bleiben nach 4 weniger noch 5 übrig.', xpReward: 10 },
  ],
  2: [
    { id: 201, question: 'Was ist 12 + 8?', correctAnswer: 20, options: [18, 19, 20, 21], difficulty: 'easy', topic: 'Addition', explanation: '12 plus 8 ergibt genau 20.', xpReward: 12 },
    { id: 202, question: 'Was ist 25 - 7?', correctAnswer: 18, options: [16, 17, 18, 19], difficulty: 'easy', topic: 'Subtraktion', explanation: '25 minus 7 ist 18.', xpReward: 12 },
    { id: 203, question: 'Was ist 3 x 4?', correctAnswer: 12, options: [10, 11, 12, 13], difficulty: 'medium', topic: 'Multiplikation', explanation: 'Drei Vierergruppen ergeben 12.', xpReward: 15 },
    { id: 204, question: 'Was ist 16 : 2?', correctAnswer: 8, options: [6, 7, 8, 9], difficulty: 'medium', topic: 'Division', explanation: '16 geteilt durch 2 ist 8.', xpReward: 15 },
    { id: 205, question: 'Was ist 5 x 10?', correctAnswer: 50, options: [45, 50, 55, 60], difficulty: 'medium', topic: 'Multiplikation', explanation: 'Fünf Zehner sind 50.', xpReward: 15 },
    { id: 206, question: 'Was ist 27 + 6?', correctAnswer: 33, options: [31, 32, 33, 34], difficulty: 'medium', topic: 'Addition', explanation: '27 plus 6 ergibt 33.', xpReward: 12 },
  ],
  3: [
    { id: 301, question: 'Was ist 45 + 37?', correctAnswer: 82, options: [72, 82, 92, 102], difficulty: 'medium', topic: 'Addition', explanation: '45 plus 37 ergibt 82.', xpReward: 18 },
    { id: 302, question: 'Was ist 100 - 45?', correctAnswer: 55, options: [45, 55, 65, 75], difficulty: 'medium', topic: 'Subtraktion', explanation: '100 minus 45 ist 55.', xpReward: 18 },
    { id: 303, question: 'Was ist 7 x 8?', correctAnswer: 56, options: [48, 54, 56, 64], difficulty: 'medium', topic: 'Multiplikation', explanation: 'Sieben Achtergruppen sind 56.', xpReward: 20 },
    { id: 304, question: 'Was ist 81 : 9?', correctAnswer: 9, options: [7, 8, 9, 10], difficulty: 'medium', topic: 'Division', explanation: '81 geteilt durch 9 ergibt 9.', xpReward: 20 },
    { id: 305, question: 'Was ist 63 - 18?', correctAnswer: 45, options: [35, 45, 55, 65], difficulty: 'medium', topic: 'Subtraktion', explanation: '63 minus 18 ist 45.', xpReward: 18 },
    { id: 306, question: 'Was ist 9 x 6?', correctAnswer: 54, options: [45, 48, 54, 63], difficulty: 'medium', topic: 'Multiplikation', explanation: 'Neun Sechsergruppen sind 54.', xpReward: 20 },
  ],
  4: [
    { id: 401, question: 'Was ist 125 + 250?', correctAnswer: 375, options: [350, 375, 400, 425], difficulty: 'hard', topic: 'Addition', explanation: '125 plus 250 ergibt 375.', xpReward: 24 },
    { id: 402, question: 'Was ist 1000 - 350?', correctAnswer: 650, options: [550, 650, 750, 850], difficulty: 'hard', topic: 'Subtraktion', explanation: '1000 minus 350 ist 650.', xpReward: 24 },
    { id: 403, question: 'Was ist 12 x 11?', correctAnswer: 132, options: [122, 132, 142, 152], difficulty: 'hard', topic: 'Multiplikation', explanation: '12 mal 11 ergibt 132.', xpReward: 28 },
    { id: 404, question: 'Was ist 144 : 12?', correctAnswer: 12, options: [10, 11, 12, 13], difficulty: 'hard', topic: 'Division', explanation: '144 geteilt durch 12 ergibt 12.', xpReward: 28 },
    { id: 405, question: 'Was ist 250 + 175?', correctAnswer: 425, options: [400, 425, 450, 475], difficulty: 'hard', topic: 'Addition', explanation: '250 plus 175 ist 425.', xpReward: 24 },
    { id: 406, question: 'Was ist 96 : 8?', correctAnswer: 12, options: [10, 11, 12, 13], difficulty: 'hard', topic: 'Division', explanation: '96 geteilt durch 8 ist 12.', xpReward: 28 },
  ],
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5)
}

export function getBlastQuestionsForGrade(grade: number): BlastQuestion[] {
  const seeds = TASK_SEEDS[grade] || TASK_SEEDS[2]

  return shuffle(seeds).map((task) => ({
    id: task.id,
    question: task.question,
    correctAnswer: task.correctAnswer,
    options: shuffle(task.options),
    difficulty: task.difficulty,
    topic: task.topic,
    explanation: task.explanation,
    xpReward: task.xpReward,
  }))
}
