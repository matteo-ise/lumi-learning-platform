/**
 * DEVELOPER NOTE - SPRINT 6:
 * This file contains the task bundles for the "Lumi Blast" math game.
 * Tasks are organized by grade (1-4) to ensure age-appropriate difficulty.
 * 
 * TODO for the next dev:
 * 1. Expand each grade with at least 20-30 varied tasks (addition, subtraction, 
 *    multiplication, division depending on grade level).
 * 2. Ensure 'options' always contains exactly one correct 'answer'.
 * 3. You can add a 'type' field if you want to track progress in specific areas (e.g., 'geometry', 'arithmetic').
 */

export interface MathTask {
  id: number;
  question: string;
  answer: number;
  options: number[];
}

export const MATH_TASKS: Record<number, MathTask[]> = {
  1: [
    { id: 101, question: "1 + 1", answer: 2, options: [1, 2, 3, 4] },
    { id: 102, question: "5 - 2", answer: 3, options: [2, 3, 4, 5] },
    { id: 103, question: "3 + 4", answer: 7, options: [6, 7, 8, 9] },
    { id: 104, question: "10 - 5", answer: 5, options: [4, 5, 6, 7] },
  ],
  2: [
    { id: 201, question: "12 + 8", answer: 20, options: [18, 19, 20, 21] },
    { id: 202, question: "25 - 7", answer: 18, options: [16, 17, 18, 19] },
    { id: 203, question: "3 * 4", answer: 12, options: [10, 11, 12, 13] },
    { id: 204, question: "16 / 2", answer: 8, options: [6, 7, 8, 9] },
  ],
  3: [
    { id: 301, question: "45 + 37", answer: 82, options: [72, 82, 92, 102] },
    { id: 302, question: "100 - 45", answer: 55, options: [45, 55, 65, 75] },
    { id: 303, question: "7 * 8", answer: 56, options: [48, 54, 56, 64] },
    { id: 304, question: "81 / 9", answer: 9, options: [7, 8, 9, 10] },
  ],
  4: [
    { id: 401, question: "125 + 250", answer: 375, options: [350, 375, 400, 425] },
    { id: 402, question: "1000 - 350", answer: 650, options: [550, 650, 750, 850] },
    { id: 403, question: "12 * 11", answer: 132, options: [122, 132, 142, 152] },
    { id: 404, question: "144 / 12", answer: 12, options: [10, 11, 12, 13] },
  ]
};
