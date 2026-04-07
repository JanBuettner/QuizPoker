import { useState, useEffect, useMemo } from 'react';
import type { VisibleGameState, VisiblePlayer } from '@shared/types';
import { GamePhase } from '@shared/types';

interface ShowdownProps {
  gameState: VisibleGameState;
  playerId: string;
  onNextRound: () => void;
  isHost: boolean;
}

export default function Showdown({ gameState, playerId, onNextRound, isHost }: ShowdownProps) {
  const { players, actualAnswer, winnerId, currentQuestion, pot } = gameState;
  const activePlayers = players.filter(p => !p.isEliminated);
  const winner = players.find(p => p.id === winnerId);

  // Sort from WORST (furthest) to BEST (closest) for dramatic reveal
  const sorted = useMemo(() => {
    return [...activePlayers]
      .filter(p => p.estimate !== null)
      .sort((a, b) => {
        if (actualAnswer === null) return 0;
        return Math.abs(b.estimate! - actualAnswer) - Math.abs(a.estimate! - actualAnswer);
      });
  }, [activePlayers, actualAnswer]);

  const foldedPlayers = activePlayers.filter(p => p.hasFolded && p.estimate === null);

  const [revealStep, setRevealStep] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Step 0: question is already visible
    // Step 1: "Showdown!" announcement
    timers.push(setTimeout(() => setRevealStep(1), 1000));
    // Step 2: reveal correct answer
    timers.push(setTimeout(() => setRevealStep(2), 2500));
    // Steps 3..3+N-1: reveal each player one by one
    sorted.forEach((_, i) => {
      timers.push(setTimeout(() => setRevealStep(3 + i), 3500 + i * 700));
    });
    // Final step: winner announcement
    timers.push(setTimeout(() => setRevealStep(3 + sorted.length), 3500 + sorted.length * 700 + 500));

    return () => timers.forEach(clearTimeout);
  }, [sorted.length]);

  const getDiff = (player: VisiblePlayer) => {
    if (actualAnswer === null || player.estimate === null) return null;
    return Math.abs(player.estimate - actualAnswer);
  };

  const formatNum = (n: number) => n.toLocaleString('de-DE');

  const finalStep = 3 + sorted.length;

  return (
    <div className="w-full max-w-xl space-y-5">

      {/* Step 0: Show the question briefly */}
      <div className="glass rounded-2xl p-6 text-center animate-fade-in">
        <p className="text-white text-lg font-medium">{currentQuestion}</p>
        {gameState.hint && (
          <p className="text-purple-400/40 text-sm mt-2">Hinweis: {gameState.hint}</p>
        )}
      </div>

      {/* Step 1: "Showdown!" announcement */}
      {revealStep >= 1 && (
        <div className={`text-center py-4 ${revealStep >= 2 ? 'showdown-fade-out' : 'showdown-fade-in'}`}>
          <span className="text-5xl font-black tracking-widest text-gold showdown-text-glow">
            SHOWDOWN!
          </span>
        </div>
      )}

      {/* Step 2: Reveal correct answer with card flip */}
      {revealStep >= 2 && actualAnswer !== null && (
        <div className="showdown-answer-card card-flip">
          <div className="showdown-answer-inner">
            <span className="text-gold/40 text-[10px] font-bold tracking-[0.3em] uppercase">
              Richtige Antwort
            </span>
            <div className="text-gold font-black text-5xl mt-2 font-mono">
              {formatNum(actualAnswer)}
            </div>
          </div>
        </div>
      )}

      {/* Step 3+: Reveal each player's estimate one by one (worst to best) */}
      {revealStep >= 3 && (
        <div className="space-y-3">
          {sorted.map((player, i) => {
            if (revealStep < 3 + i) return null;

            const diff = getDiff(player);
            const isWinner = player.id === winnerId;
            const isMe = player.id === playerId;
            const rank = sorted.length - i; // worst=N, best=1

            return (
              <div
                key={player.id}
                className={`showdown-player-card card-flip ${isWinner && revealStep >= finalStep ? 'showdown-winner-card' : ''}`}
                style={{ animationDelay: '0ms' }}
              >
                {/* Card top: player name + rank */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-bold uppercase tracking-wider ${isMe ? 'text-gold' : 'text-white/60'}`}>
                    {player.name}{isMe ? ' (Du)' : ''}
                  </span>
                  <span className={`text-xs font-bold ${rank === 1 ? 'text-gold' : 'text-white/20'}`}>
                    #{rank === 1 ? '1' : rank}
                  </span>
                </div>

                {/* Card center: large estimate number */}
                <div className={`text-center py-3 ${isWinner ? 'text-gold' : 'text-white'}`}>
                  <span className="font-mono font-black text-3xl">
                    {player.estimate !== null ? formatNum(player.estimate) : '--'}
                  </span>
                </div>

                {/* Card bottom: distance from answer */}
                <div className="text-center border-t border-white/10 pt-2">
                  {diff !== null && (
                    <span className={`text-sm font-mono font-bold ${
                      diff === 0 ? 'text-emerald-400' : isWinner ? 'text-gold' : 'text-white/30'
                    }`}>
                      {diff === 0 ? 'EXAKT!' : `Abstand: ${formatNum(diff)}`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Folded players */}
          {foldedPlayers.map(player => (
            <div key={player.id} className="showdown-player-card opacity-30">
              <div className="flex items-center justify-between">
                <span className="text-white/40 text-sm">{player.name}</span>
                <span className="text-red-400/60 text-xs font-bold uppercase">Gefoldet</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Final step: Winner announcement with spotlight */}
      {revealStep >= finalStep && winner && (
        <div className="showdown-winner-announce card-flip">
          <div className="showdown-spotlight" />
          <div className="relative z-10 text-center py-6">
            <div className="text-4xl mb-2">&#127942;</div>
            <div className="text-gold font-black text-2xl mb-1">
              {winner.id === playerId ? 'Du hast' : `${winner.name} hat`} den Pot gewonnen!
            </div>
            <div className="text-gold/80 font-mono text-xl font-bold">
              +{formatNum(pot)} Chips
            </div>
          </div>
        </div>
      )}

      {/* Next round button */}
      {gameState.phase === GamePhase.ROUND_END && revealStep >= finalStep && (
        <div className="text-center pt-2 animate-fade-in" style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}>
          {isHost ? (
            <button onClick={onNextRound} className="btn-gold py-3 px-10 text-lg">
              Naechste Runde
            </button>
          ) : (
            <p className="text-white/20 text-sm">Warte auf naechste Runde...</p>
          )}
        </div>
      )}
    </div>
  );
}
