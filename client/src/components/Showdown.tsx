import type { VisibleGameState } from '@shared/types';
import { GamePhase } from '@shared/types';

interface ShowdownProps {
  gameState: VisibleGameState;
  playerId: string;
  onNextRound: () => void;
  isHost: boolean;
}

export default function Showdown({ gameState, playerId, onNextRound, isHost }: ShowdownProps) {
  const { players, actualAnswer, winnerId, currentQuestion } = gameState;
  const activePlayers = players.filter(p => !p.isEliminated);
  const winner = players.find(p => p.id === winnerId);

  const sorted = [...activePlayers]
    .filter(p => p.estimate !== null)
    .sort((a, b) => {
      if (actualAnswer === null) return 0;
      return Math.abs(a.estimate! - actualAnswer) - Math.abs(b.estimate! - actualAnswer);
    });

  const foldedPlayers = activePlayers.filter(p => p.hasFolded && p.estimate === null);

  return (
    <div className="w-full max-w-xl space-y-5">
      {/* Question */}
      <div className="glass rounded-2xl p-6 text-center animate-fade-in">
        <p className="text-white text-lg font-medium">{currentQuestion}</p>
        {gameState.hint && (
          <p className="text-purple-400/40 text-sm mt-2">Hinweis: {gameState.hint}</p>
        )}
      </div>

      {/* Answer reveal - scale-up with delay */}
      {actualAnswer !== null && (
        <div
          className="glass-gold rounded-2xl p-7 text-center animate-fade-in-scale"
          style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}
        >
          <span className="text-gold/40 text-[10px] font-bold tracking-[0.3em]">RICHTIGE ANTWORT</span>
          <div className="text-gold font-black text-5xl mt-2 font-mono">{actualAnswer.toLocaleString('de-DE')}</div>
        </div>
      )}

      {/* Ranking - staggered at 300ms each */}
      <div className="space-y-2">
        {sorted.map((player, i) => {
          const diff = actualAnswer !== null && player.estimate !== null
            ? Math.abs(player.estimate - actualAnswer) : null;
          const isWinner = player.id === winnerId;
          const isMe = player.id === playerId;

          return (
            <div
              key={player.id}
              className={`
                flex items-center justify-between rounded-xl px-5 py-3.5 animate-slide-in transition-all
                ${isWinner ? 'glass-gold animate-border-glow' : 'glass'}
              `}
              style={{
                animationDelay: `${800 + i * 300}ms`,
                animationFillMode: 'backwards',
              }}
            >
              <div className="flex items-center gap-3">
                <span className={`text-lg font-black ${i === 0 ? 'text-gold' : 'text-white/15'}`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
                <span className={`font-semibold ${isMe ? 'text-gold' : 'text-white'}`}>
                  {player.name}{isMe && ' (Du)'}
                </span>
              </div>
              <div className="flex items-center gap-5 font-mono text-sm">
                <span className="text-white font-bold">{player.estimate?.toLocaleString('de-DE') ?? '—'}</span>
                {diff !== null && (
                  <span className={`${isWinner ? 'text-gold' : 'text-white/25'}`}>
                    {diff === 0 ? 'Exakt!' : `\u00B1${diff.toLocaleString('de-DE')}`}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {foldedPlayers.map(player => (
          <div key={player.id} className="flex items-center justify-between rounded-xl px-5 py-3 bg-white/[0.02] opacity-30">
            <span className="text-white/40">{player.name}</span>
            <span className="text-red-400/60 text-xs font-bold">Gefoldet</span>
          </div>
        ))}
      </div>

      {/* Winner announcement - appears last with glow */}
      {winner && (
        <div
          className="text-center animate-fade-in-scale"
          style={{
            animationDelay: `${800 + sorted.length * 300 + 300}ms`,
            animationFillMode: 'backwards',
          }}
        >
          <div className="inline-flex items-center gap-2 glass-gold rounded-xl px-6 py-3 animate-pulse-gold">
            <span className="text-2xl">🏆</span>
            <span className="text-emerald-400 text-lg font-semibold">
              {winner.id === playerId ? 'Du hast' : `${winner.name} hat`} gewonnen!
            </span>
          </div>
        </div>
      )}

      {/* Next round */}
      {gameState.phase === GamePhase.ROUND_END && (
        <div className="text-center pt-2">
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
