import { useEffect, useMemo, useRef, useState } from 'react'
import type Phaser from 'phaser'
import { apiFetch } from '../../services/api'
import { getBlastQuestionsForGrade } from './math_tasks'
import { createBlastGame } from './phaser/createBlastGame'
import type { BlastGameResult } from './phaser/types'

interface BlastGameProps {
  grade: number
}

type ShellState = 'start' | 'playing' | 'end'

export function BlastGame({ grade }: BlastGameProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const [shellState, setShellState] = useState<ShellState>('start')
  const [sessionSeed, setSessionSeed] = useState(0)
  const [finalResult, setFinalResult] = useState<BlastGameResult | null>(null)

  const questions = useMemo(() => {
    return getBlastQuestionsForGrade(grade)
  }, [grade, sessionSeed])

  useEffect(() => {
    setShellState('start')
    setFinalResult(null)
    setSessionSeed(0)
  }, [grade])

  useEffect(() => {
    if (shellState !== 'playing' || !mountRef.current) return

    const game = createBlastGame({
      parent: mountRef.current,
      questions,
      onGameOver: (result) => {
        setFinalResult(result)
        setShellState('end')

        apiFetch('/api/blast/results', {
          method: 'POST',
          body: JSON.stringify({
            score: result.score,
            total_questions: result.totalQuestions,
          }),
        }).catch(console.error)
      },
    })

    gameRef.current = game

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [questions, shellState])

  const startGame = () => {
    setFinalResult(null)
    setShellState('playing')
  }

  const restartGame = () => {
    setSessionSeed((prev) => prev + 1)
    setFinalResult(null)
    setShellState('playing')
  }

  return (
    <div className="w-full max-w-6xl">
      <div className="relative overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-slate-950 shadow-[0_30px_120px_rgba(15,23,42,0.55)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_35%),radial-gradient(circle_at_bottom,_rgba(168,85,247,0.16),_transparent_28%)]" />

        <div
          ref={mountRef}
          className={`aspect-[16/10] w-full bg-[linear-gradient(180deg,#020617_0%,#0f172a_45%,#111827_100%)] ${
            shellState === 'playing' ? 'block' : 'hidden'
          }`}
        />

        {shellState !== 'playing' && (
          <div className="relative flex aspect-[16/10] w-full items-center justify-center px-6 py-10">
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute left-[10%] top-[14%] h-3 w-3 rounded-full bg-cyan-200 shadow-[0_0_18px_6px_rgba(103,232,249,0.45)]" />
              <div className="absolute right-[16%] top-[20%] h-2 w-2 rounded-full bg-violet-200 shadow-[0_0_16px_5px_rgba(196,181,253,0.35)]" />
              <div className="absolute bottom-[18%] left-[20%] h-4 w-4 rounded-full bg-amber-200 shadow-[0_0_20px_7px_rgba(253,230,138,0.25)]" />
              <div className="absolute inset-x-0 bottom-0 h-32 bg-[radial-gradient(circle_at_center,_rgba(14,165,233,0.20),_transparent_55%)]" />
            </div>

            {shellState === 'start' && (
              <div className="relative z-10 max-w-2xl text-center text-white">
                <p className="mb-3 text-sm font-black uppercase tracking-[0.4em] text-cyan-300">
                  Space Arcade Math Mission
                </p>
                <h2 className="mb-4 text-4xl font-black tracking-tight sm:text-6xl">
                  LUMI BLAST
                </h2>
                <p className="mx-auto mb-8 max-w-xl text-base text-slate-300 sm:text-lg">
                  Steuere deine Rakete durchs All und schieße den richtigen Antwort-Kometen ab. Du
                  startest mit 3 Leben und spielst mit Aufgaben passend zu Klasse {grade}.
                </p>

                <div className="mb-8 grid gap-3 text-left text-sm text-slate-200 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="mb-1 font-black text-cyan-300">4 Ziele</p>
                    <p>Pro Runde erscheinen vier Asteroiden mit möglichen Antworten.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="mb-1 font-black text-cyan-300">3 Leben</p>
                    <p>Jeder falsche Treffer kostet ein Leben. Bei 0 ist Game Over.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="mb-1 font-black text-cyan-300">Arcade Flow</p>
                    <p>Richtige Treffer geben Punkte, lösen Explosionen aus und starten sofort die nächste Runde.</p>
                  </div>
                </div>

                <button
                  onClick={startGame}
                  className="rounded-full bg-cyan-400 px-8 py-4 text-lg font-black text-slate-950 transition hover:scale-[1.02] hover:bg-cyan-300"
                >
                  Mission starten
                </button>
              </div>
            )}

            {shellState === 'end' && finalResult && (
              <div className="relative z-10 max-w-xl text-center text-white">
                <p className="mb-3 text-sm font-black uppercase tracking-[0.4em] text-amber-300">
                  Mission beendet
                </p>
                <h2 className="mb-4 text-4xl font-black tracking-tight sm:text-5xl">
                  Endscore: {finalResult.score}
                </h2>
                <p className="mb-6 text-slate-300">
                  Du hast {finalResult.correctAnswers} von {finalResult.totalQuestions} Aufgaben
                  getroffen. Beste Combo: x{finalResult.bestCombo}. Verbleibende Leben:{' '}
                  {finalResult.livesRemaining}.
                </p>

                <div className="mb-8 grid gap-3 text-sm text-slate-200 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="mb-1 font-black text-cyan-300">Treffer</p>
                    <p>{finalResult.correctAnswers}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="mb-1 font-black text-cyan-300">Fehler</p>
                    <p>{finalResult.wrongAnswers}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="mb-1 font-black text-cyan-300">Leben</p>
                    <p>{finalResult.livesRemaining}</p>
                  </div>
                </div>

                <div className="flex flex-col justify-center gap-3 sm:flex-row">
                  <button
                    onClick={restartGame}
                    className="rounded-full bg-cyan-400 px-8 py-4 text-lg font-black text-slate-950 transition hover:scale-[1.02] hover:bg-cyan-300"
                  >
                    Nochmal spielen
                  </button>
                  <button
                    onClick={() => window.history.back()}
                    className="rounded-full border border-white/15 bg-white/5 px-8 py-4 text-lg font-black text-white transition hover:bg-white/10"
                  >
                    Zurück
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
