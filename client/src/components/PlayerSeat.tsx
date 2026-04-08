import { GamePhase } from '@shared/types';
import type { VisiblePlayer } from '@shared/types';

interface PlayerSeatProps {
  player: VisiblePlayer;
  isMe: boolean;
  isTurn: boolean;
  isDealer?: boolean;
  isSB?: boolean;
  isBB?: boolean;
  phase: GamePhase;
  showEstimate?: boolean;
}

const AVATAR_COLORS = [
  'from-red-500 to-red-700',
  'from-blue-500 to-blue-700',
  'from-emerald-500 to-emerald-700',
  'from-purple-500 to-purple-700',
  'from-amber-500 to-amber-700',
  'from-pink-500 to-pink-700',
  'from-cyan-500 to-cyan-700',
  'from-orange-500 to-orange-700',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function PlayerSeat({
  player,
  isMe,
  isTurn,
  isDealer,
  isSB,
  isBB,
  phase,
  showEstimate,
}: PlayerSeatProps) {
  const isActive = !player.hasFolded && !player.isEliminated;
  const avatarColor = getAvatarColor(player.name);
  const initial = player.name.charAt(0).toUpperCase();

  return (
    <div className={`player-seat flex flex-col items-center gap-1 ${player.isEliminated ? 'opacity-20' : ''}`}>
      {/* Bet amount - displayed "in front of" the player toward table center */}
      {player.currentBet > 0 && isActive && (
        <div className="player-bet-chips flex items-center gap-1 mb-0.5 animate-fade-in">
          <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-b from-red-400 to-red-600 border border-red-300 shadow-sm" />
          <span className="text-gold font-mono font-bold text-xs">{player.currentBet.toLocaleString('de-DE')}</span>
        </div>
      )}

      {/* Main seat container */}
      <div
        className={`
          relative rounded-xl px-3 py-2 min-w-[90px] max-w-[120px] text-center transition-all duration-300
          ${isTurn ? 'player-seat-active bg-black/70 border-2 border-gold shadow-[0_0_20px_rgba(245,158,11,0.4)]' : 'bg-black/60 border border-white/10'}
          ${isMe ? 'ring-1 ring-gold/30' : ''}
          ${!isActive && !player.isEliminated ? 'opacity-40' : ''}
        `}
      >
        {/* Badges row */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-1">
          {isDealer && (
            <span className="dealer-button w-5 h-5 rounded-full bg-gradient-to-b from-yellow-300 to-yellow-500 text-black text-[9px] font-black flex items-center justify-center shadow-md border border-yellow-200">
              D
            </span>
          )}
          {isSB && !isDealer && (
            <span className="w-5 h-5 rounded-full bg-gradient-to-b from-gray-300 to-gray-500 text-black text-[8px] font-black flex items-center justify-center shadow-md">
              SB
            </span>
          )}
          {isBB && (
            <span className="w-5 h-5 rounded-full bg-gradient-to-b from-blue-400 to-blue-600 text-white text-[8px] font-black flex items-center justify-center shadow-md">
              BB
            </span>
          )}
        </div>

        {/* Avatar */}
        {player.avatar ? (
          <img src={player.avatar} alt={player.name} className="w-8 h-8 rounded-full mx-auto shadow-md border-2 border-white/20 object-cover" />
        ) : (
          <div className={`w-8 h-8 rounded-full bg-gradient-to-b ${avatarColor} mx-auto flex items-center justify-center text-white font-bold text-sm shadow-md border-2 border-white/20`}>
            {player.isBot ? '🤖' : initial}
          </div>
        )}

        {/* Name */}
        <div className={`text-[11px] font-semibold mt-1 truncate ${isMe ? 'text-gold' : 'text-white/80'}`}>
          {player.name}
          {isMe && <span className="text-gold/50"> (Du)</span>}
        </div>

        {/* Chips */}
        <div className="flex items-center justify-center gap-1 mt-0.5">
          <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-b from-gold-light to-gold border border-gold-dark shadow-sm" />
          <span className="text-gold/80 text-[10px] font-mono font-bold">{player.chips.toLocaleString('de-DE')}</span>
        </div>

        {/* Status overlays */}
        {player.hasFolded && !player.isEliminated && (
          <div className="absolute inset-0 rounded-xl bg-black/60 flex items-center justify-center">
            <span className="text-red-400/80 text-[10px] font-black tracking-wider">FOLD</span>
          </div>
        )}
        {player.isEliminated && (
          <div className="absolute inset-0 rounded-xl bg-black/60 flex items-center justify-center">
            <span className="text-white/30 text-[10px] font-black tracking-wider">RAUS</span>
          </div>
        )}

        {/* Estimate submitted indicator */}
        {player.hasSubmittedEstimate && phase === GamePhase.ESTIMATING && !player.hasFolded && (
          <div className="text-emerald-400/70 text-[9px] font-bold mt-0.5">&#10003;</div>
        )}

        {/* Connected indicator */}
        <div className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${player.isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-red-400/50'}`} />
      </div>

      {/* Estimate card (visible in showdown) */}
      {showEstimate && player.estimate !== null && (
        <div className="poker-card mt-1 animate-fade-in-scale text-center !p-1.5 !max-w-[100px]">
          <div className="text-[8px] text-gray-400 font-bold">TIPP</div>
          <div className="text-sm font-black text-gray-800 font-mono">{player.estimate.toLocaleString('de-DE')}</div>
        </div>
      )}
    </div>
  );
}
