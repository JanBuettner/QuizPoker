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
  emote?: string;
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
  emote,
}: PlayerSeatProps) {
  const isActive = !player.hasFolded && !player.isEliminated;
  const avatarColor = getAvatarColor(player.name);
  const initial = player.name.charAt(0).toUpperCase();

  return (
    <div className={`player-seat relative flex flex-col items-center gap-0.5 ${player.isEliminated ? 'opacity-20' : ''}`}>
      {/* Emote reaction */}
      {emote && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-3xl animate-emote-pop pointer-events-none z-20">
          {emote}
        </div>
      )}

      {/* Main seat container */}
      <div
        className={`
          player-seat-box relative rounded-xl min-w-[100px] max-w-[120px] text-center transition-all duration-300 overflow-visible
          ${isTurn
            ? 'player-seat-active border-2 border-gold shadow-[0_0_24px_rgba(245,158,11,0.5),0_0_48px_rgba(245,158,11,0.2)]'
            : 'border border-white/10'}
          ${isMe ? 'ring-2 ring-gold/50 ring-offset-1 ring-offset-black/50' : ''}
          ${!isActive && !player.isEliminated ? 'opacity-40' : ''}
        `}
      >
        {/* Seat background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/95 via-black/90 to-gray-950/95 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />

        {/* Badges row */}
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 flex gap-1 z-10">
          {isDealer && (
            <span className="dealer-button w-6 h-6 rounded-full bg-gradient-to-b from-yellow-300 to-yellow-500 text-black text-[10px] font-black flex items-center justify-center shadow-lg border-2 border-yellow-200">
              D
            </span>
          )}
          {isSB && !isDealer && (
            <span className="w-6 h-6 rounded-full bg-gradient-to-b from-gray-300 to-gray-500 text-black text-[9px] font-black flex items-center justify-center shadow-lg border border-gray-200">
              SB
            </span>
          )}
          {isBB && (
            <span className="w-6 h-6 rounded-full bg-gradient-to-b from-blue-400 to-blue-600 text-white text-[9px] font-black flex items-center justify-center shadow-lg border border-blue-300">
              BB
            </span>
          )}
        </div>

        {/* Content area */}
        <div className="relative z-[1] px-2 pt-2 pb-1.5">
          {/* Avatar */}
          {player.avatar ? (
            <img
              src={player.avatar}
              alt={player.name}
              className={`w-11 h-11 rounded-full mx-auto shadow-lg object-cover border-[3px] ${
                isMe ? 'border-gold/70' : isTurn ? 'border-gold/50' : 'border-white/20'
              }`}
            />
          ) : (
            <div
              className={`w-11 h-11 rounded-full bg-gradient-to-b ${avatarColor} mx-auto flex items-center justify-center shadow-lg border-[3px] ${
                isMe ? 'border-gold/70' : isTurn ? 'border-gold/50' : 'border-white/20'
              }`}
            >
              {player.isBot ? (
                <span className="text-2xl">&#x1F916;</span>
              ) : (
                <span className="text-white font-black text-xl drop-shadow-md">{initial}</span>
              )}
            </div>
          )}

          {/* Divider line */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mt-2 mb-1.5" />

          {/* Name */}
          <div className={`text-sm font-bold truncate ${isMe ? 'text-gold' : 'text-white/90'}`}>
            {player.name}
            {isMe && <span className="text-gold/40 text-xs"> (Du)</span>}
          </div>

          {/* Chips */}
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <div className="w-3 h-3 rounded-full bg-gradient-to-b from-gold-light to-gold border border-gold-dark shadow-sm" />
            <span className="text-gold/80 text-xs font-mono font-black">{player.chips.toLocaleString('de-DE')}</span>
          </div>
        </div>

        {/* Status overlays */}
        {player.hasFolded && !player.isEliminated && (
          <div className="absolute inset-0 rounded-2xl bg-black/70 flex items-center justify-center z-[2]">
            <span className="text-red-400/80 text-xs font-black tracking-widest">FOLD</span>
          </div>
        )}
        {player.isEliminated && (
          <div className="absolute inset-0 rounded-2xl bg-black/70 flex items-center justify-center z-[2]">
            <span className="text-white/30 text-xs font-black tracking-widest">RAUS</span>
          </div>
        )}

        {/* Estimate submitted indicator */}
        {player.hasSubmittedEstimate && phase === GamePhase.ESTIMATING && !player.hasFolded && (
          <div className="relative z-[1] text-emerald-400/70 text-sm font-bold pb-1">&#10003;</div>
        )}

        {/* Connected indicator */}
        <div className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full z-[2] ${player.isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-red-400/50'}`} />
      </div>

      {/* Estimate card (visible in showdown) */}
      {showEstimate && player.estimate !== null && (
        <div className="poker-card mt-1 animate-fade-in-scale text-center !p-2 !max-w-[120px]">
          <div className="text-[8px] text-gray-400 font-bold">TIPP</div>
          <div className="text-sm font-black text-gray-800 font-mono">{player.estimate.toLocaleString('de-DE')}</div>
        </div>
      )}
    </div>
  );
}
