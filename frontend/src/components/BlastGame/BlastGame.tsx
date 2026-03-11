/**
 * DEVELOPER NOTE - SPRINT 6:
 * This is the core container for the "Lumi Blast" math game. 
 * The basic game loop (Start -> Playing -> End) is already implemented.
 * 
 * TODO for the next dev:
 * 1. GAMEPLAY & ANIMATIONS: 
 *    - Add a countdown timer for each question to increase "Blast" excitement.
 *    - Implement "Combo" multipliers for fast consecutive correct answers.
 *    - Add Framer Motion or CSS animations for the 🚀 (e.g., it should "launch" on correct answers).
 *    - Add sound effects for correct/wrong answers.
 * 
 * 2. FEEDBACK:
 *    - Show immediate visual feedback (Green/Red) after an answer is selected.
 *    - Add a small delay after an answer before showing the next question.
 * 
 * 3. BACKEND INTEGRATION:
 *    - Use apiFetch to POST the final score to `/api/blast/results` (you might need to create this endpoint in main.py).
 *    - The 'grade' prop is automatically passed from the user profile.
 */

import { useState, useEffect } from 'react';
import { MATH_TASKS } from './math_tasks';
import type { MathTask } from './math_tasks';

interface BlastGameProps {
  grade: number;
}

export function BlastGame({ grade }: BlastGameProps) {
  const [tasks, setTasks] = useState<MathTask[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'end'>('start');

  useEffect(() => {
    // Initialize tasks based on grade
    const gradeTasks = MATH_TASKS[grade] || MATH_TASKS[2]; // fallback to grade 2
    setTasks([...gradeTasks].sort(() => Math.random() - 0.5));
  }, [grade]);

  const handleStart = () => {
    setGameState('playing');
    setCurrentIndex(0);
    setScore(0);
  };

  const handleAnswer = (selected: number) => {
    let nextScore = score;
    if (selected === tasks[currentIndex].answer) {
      nextScore = score + 1;
      setScore(nextScore);
    }

    if (currentIndex + 1 < tasks.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setGameState('end');
      // Save score to backend
      apiFetch('/api/blast/results', {
        method: 'POST',
        body: JSON.stringify({ score: nextScore, total_questions: tasks.length }),
      }).catch(console.error);
    }
  };

  if (gameState === 'start') {
    return (
      <div className="bg-white rounded-3xl p-8 shadow-xl max-w-lg w-full text-center border-4 border-primary/20">
        <div className="text-6xl mb-6 animate-bounce">🚀</div>
        <h2 className="text-3xl font-extrabold text-dark mb-4">Bereit für den Blast?</h2>
        <p className="text-lg text-dark/60 mb-8">
          Du bist in Klasse {grade}. Wir haben {tasks.length} Mathe-Aufgaben für dich vorbereitet!
        </p>
        <button
          onClick={handleStart}
          className="w-full py-4 rounded-2xl bg-primary text-white text-xl font-bold hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/30"
        >
          Spiel starten! 🎮
        </button>
      </div>
    );
  }

  if (gameState === 'playing' && tasks.length > 0) {
    const currentTask = tasks[currentIndex];
    return (
      <div className="bg-white rounded-3xl p-8 shadow-xl max-w-lg w-full text-center border-4 border-primary/20">
        <div className="flex justify-between items-center mb-6">
          <span className="bg-gray-100 px-4 py-1 rounded-full text-sm font-bold text-dark/50">
            Aufgabe {currentIndex + 1} von {tasks.length}
          </span>
          <span className="text-primary font-extrabold text-xl">
            Punkte: {score}
          </span>
        </div>
        
        <h2 className="text-5xl font-extrabold text-dark mb-10 py-10 bg-gray-50 rounded-2xl">
          {currentTask.question}
        </h2>

        <div className="grid grid-cols-2 gap-4">
          {currentTask.options.map((opt) => (
            <button
              key={opt}
              onClick={() => handleAnswer(opt)}
              className="py-6 rounded-2xl border-2 border-gray-100 text-2xl font-bold text-dark hover:border-primary hover:bg-primary/5 transition-all"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (gameState === 'end') {
    return (
      <div className="bg-white rounded-3xl p-8 shadow-xl max-w-lg w-full text-center border-4 border-primary/20">
        <div className="text-6xl mb-6">🏆</div>
        <h2 className="text-3xl font-extrabold text-dark mb-2">Super gemacht!</h2>
        <p className="text-xl text-dark/60 mb-8">
          Du hast {score} von {tasks.length} Aufgaben richtig gelöst.
        </p>
        <button
          onClick={handleStart}
          className="w-full py-4 rounded-2xl bg-primary text-white text-xl font-bold hover:bg-primary/90 transition-all mb-3"
        >
          Nochmal spielen 🔄
        </button>
        <button
          onClick={() => window.history.back()}
          className="w-full py-4 rounded-2xl bg-gray-100 text-dark/60 text-xl font-bold hover:bg-gray-200 transition-all"
        >
          Zurück zur Übersicht
        </button>
      </div>
    );
  }

  return null;
}
