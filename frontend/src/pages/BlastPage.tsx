import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/api';

const BlastGame = lazy(() =>
  import('../components/BlastGame/BlastGame').then((module) => ({
    default: module.BlastGame,
  })),
);

interface Profile {
  grade: number;
}

export function BlastPage() {
  const navigate = useNavigate();
  const [grade, setGrade] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Profile>('/api/profile')
      .then((p) => {
        setGrade(p.grade);
      })
      .catch((err) => {
        console.error('Failed to fetch profile', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4 flex items-center shrink-0">
        <button
          onClick={() => navigate('/app')}
          className="text-dark/50 hover:text-dark font-bold text-lg transition-colors"
        >
          ← Zurück
        </button>
        <span className="flex-1 text-center font-extrabold text-primary text-xl tracking-tight">🚀 LUMI BLAST</span>
        <div className="w-20" />
      </header>

      {/* Game Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        {loading ? (
          <div className="text-xl animate-pulse text-dark/50 font-bold">Lade Mission...</div>
        ) : (
          <Suspense fallback={<div className="text-xl animate-pulse text-dark/50 font-bold">Starte Phaser-Antrieb...</div>}>
            <BlastGame grade={grade || 2} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
