import { GamePhase } from '@shared/types';
import type { VisiblePlayer } from '@shared/types';

interface PlayerListProps {
  players: VisiblePlayer[];
  currentPlayerId: string;
  currentTurnId: string | null;
  phase: GamePhase;
  dealerIndex: number;
}

export default function PlayerList({ players, currentPlayerId, currentTurnId, phase, dealerIndex }: PlayerListProps) {
  const nonEliminated = players.filter(p => !p.isEliminated);
  const showBadges = phase !== GamePhase.LOBBY;

  // Compute dealer/SB/BB positions
  let dealerId: string | null = null;
  let sbId: string | null = null;
  let bbId: string | null = null;

  if (showBadges && nonEliminated.length >= 2) {
    const di = dealerIndex % nonEliminated.length;
    dealerId = nonEliminated[di]?.id ?? null;

    if (nonEliminated.length === 2) {
      // Heads-up: dealer is SB, other is BB
      sbId = nonEliminated[di]?.id ?? null;
      bbId = nonEliminated[(di + 1) % nonEliminated.length]?.id ?? null;
    } else {
      sbId = nonEliminated[(di + 1) % nonEliminated.length]?.id ?? null;
      bbId = nonEliminated[(di + 2) % nonEliminated.length]?.id ?? null;
    }
  }

  return (
    <aside className="w-60 shrink-0">
      <div className="glass rounded-2xl p-4 sticky top-20">
        <h3 className="text-[10px] font-bold text-white/20 tracking-[0.2em] mb-3">SPIELER</h3>
        <div className="space-y-1.5">
          {players.map((player, i) => {
            const isMe = player.id === currentPlayerId;
            const isTurn = player.id === currentTurnId;
            const isActive = !player.hasFolded && !player.isEliminated;

            return (
              <div
                key={player.id}
                className={`
                  rounded-xl px-3 py-2.5 transition-all duration-300 animate-slide-in
                  ${isTurn ? 'glass-gold animate-pulse-gold' : 'bg-white/[0.03] border border-transparent'}
                  ${!isActive ? 'opacity-30' : ''}
                `}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors
                      ${player.isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-white/10'}`} />
                    <span className={`truncate text-sm font-medium ${isMe ? 'text-gold' : 'text-white/80'}`}>
                      {player.name}
                      {isMe && ' (Du)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {showBadges && player.id === dealerId && (
                      <span className="text-[8px] bg-gold/20 text-gold font-black px-1.5 py-0.5 rounded">D</span>
                    )}
                    {showBadges && player.id === sbId && player.id !== dealerId && (
                      <span className="text-[8px] bg-white/10 text-white/40 font-bold px-1.5 py-0.5 rounded">SB</span>
                    )}
                    {showBadges && player.id === bbId && (
                      <span className="text-[8px] bg-white/10 text-white/40 font-bold px-1.5 py-0.5 rounded">BB</span>
                    )}
                    {player.isBot && <span className="text-[8px] text-chip-blue/60 font-bold">BOT</span>}
                    {player.isHost && <span className="text-[8px] text-gold/40 font-bold">HOST</span>}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-gold/70 text-xs font-mono font-bold">{player.chips.toLocaleString('de-DE')}</span>
                  {player.hasFolded && <span className="text-red-400/60 text-[9px] font-bold">FOLD</span>}
                  {player.isEliminated && <span className="text-white/20 text-[9px] font-bold">RAUS</span>}
                  {player.hasSubmittedEstimate && phase === GamePhase.ESTIMATING && !player.hasFolded && (
                    <span className="text-emerald-400/60 text-[9px] font-bold">&#10003;</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
