import { useState, useEffect, useRef } from 'react';
import { GamePhase } from '@shared/types';
import type { VisibleGameState } from '@shared/types';
import { sounds } from '../hooks/useSound';
import PlayerSeat from '../components/PlayerSeat';
import PlayerList from '../components/PlayerList';
import EstimateInput from '../components/EstimateInput';
import BettingControls from '../components/BettingControls';
import Showdown from '../components/Showdown';
import Timer from '../components/Timer';
import ActionFeed from '../components/ActionFeed';
import PokerTable from '../components/PokerTable';

// Predefined seat positions for different player counts
// Each position is [left%, top%] relative to the wrapper
// Bottom center = closest to screen ("me" seat), then clockwise
const SEAT_POSITIONS: Record<number, [number, number][]> = {
  2: [[50, 95], [50, 5]],
  3: [[50, 95], [5, 35], [95, 35]],
  4: [[50, 95], [3, 50], [50, 5], [97, 50]],
  5: [[50, 95], [3, 65], [20, 10], [80, 10], [97, 65]],
  6: [[50, 95], [3, 68], [3, 30], [50, 5], [97, 30], [97, 68]],
  7: [[50, 95], [3, 68], [3, 30], [25, 5], [75, 5], [97, 30], [97, 68]],
  8: [[50, 95], [3, 72], [3, 45], [15, 10], [50, 5], [85, 10], [97, 45], [97, 72]],
};

// Reorder players so "me" is at index 0 (bottom center seat)
function reorderPlayers<T extends { id: string }>(players: T[], myId: string): T[] {
  const myIndex = players.findIndex(p => p.id === myId);
  if (myIndex <= 0) return players;
  return [...players.slice(myIndex), ...players.slice(0, myIndex)];
}

const PHASE_LABELS: Record<GamePhase, string> = {
  [GamePhase.LOBBY]: 'Lobby',
  [GamePhase.ESTIMATING]: 'Schätzung',
  [GamePhase.PREFLOP]: 'Preflop',
  [GamePhase.FLOP]: 'Flop',
  [GamePhase.TURN]: 'Turn',
  [GamePhase.RIVER]: 'River',
  [GamePhase.SHOWDOWN]: 'Showdown',
  [GamePhase.ROUND_END]: 'Ergebnis',
  [GamePhase.GAME_OVER]: 'Spiel vorbei',
};

interface GameRoomProps {
  gameState: VisibleGameState;
  playerId: string;
  onStartGame: () => void;
  onSubmitEstimate: (estimate: number) => void;
  onBet: (action: string, amount?: number) => void;
  onNextRound: () => void;
  onAddBot: () => void;
  onRemoveBot: (botId: string) => void;
  onLeave: () => void;
  error: string | null;
  emotes: Map<string, string>;
  onSendEmote: (emote: string) => void;
}

// Helper to compute dealer/SB/BB ids
function computePositions(players: VisibleGameState['players'], dealerIndex: number) {
  const nonEliminated = players.filter(p => !p.isEliminated);
  let dealerId: string | null = null;
  let sbId: string | null = null;
  let bbId: string | null = null;

  if (nonEliminated.length >= 2) {
    const di = dealerIndex % nonEliminated.length;
    dealerId = nonEliminated[di]?.id ?? null;
    if (nonEliminated.length === 2) {
      sbId = nonEliminated[di]?.id ?? null;
      bbId = nonEliminated[(di + 1) % nonEliminated.length]?.id ?? null;
    } else {
      sbId = nonEliminated[(di + 1) % nonEliminated.length]?.id ?? null;
      bbId = nonEliminated[(di + 2) % nonEliminated.length]?.id ?? null;
    }
  }
  return { dealerId, sbId, bbId };
}

export default function GameRoom({
  gameState,
  playerId,
  onStartGame,
  onSubmitEstimate,
  onBet,
  onNextRound,
  onAddBot,
  onRemoveBot,
  onLeave,
  error,
  emotes,
  onSendEmote,
}: GameRoomProps) {
  const { phase, players, pot, roomCode, roundNumber, totalRounds } = gameState;
  const me = players.find(p => p.id === playerId);
  const isHost = me?.isHost || false;
  const isMyTurn = gameState.currentTurnPlayerId === playerId;
  const [showPlayers, setShowPlayers] = useState(false);
  const [copiedHeader, setCopiedHeader] = useState(false);
  const [copiedLobby, setCopiedLobby] = useState(false);

  const showBadges = phase !== GamePhase.LOBBY;
  const { dealerId, sbId, bbId } = showBadges ? computePositions(players, gameState.dealerIndex) : { dealerId: null, sbId: null, bbId: null };
  const isBettingPhase = phase === GamePhase.PREFLOP || phase === GamePhase.FLOP || phase === GamePhase.TURN || phase === GamePhase.RIVER;
  const isShowdown = phase === GamePhase.SHOWDOWN || phase === GamePhase.ROUND_END;
  const showTable = phase !== GamePhase.LOBBY && phase !== GamePhase.GAME_OVER;

  // Sound feedback
  const prevPhaseRef = useRef(phase);
  const prevTurnRef = useRef(gameState.currentTurnPlayerId);
  const prevTimeRef = useRef(gameState.timeRemaining);
  const prevActionLogLenRef = useRef(gameState.actionLog.length);

  useEffect(() => {
    if (gameState.currentTurnPlayerId === playerId && prevTurnRef.current !== playerId
        && isBettingPhase) {
      sounds.yourTurn();
    }
    prevTurnRef.current = gameState.currentTurnPlayerId;

    if (phase !== prevPhaseRef.current) {
      if (phase === GamePhase.FLOP || phase === GamePhase.TURN || phase === GamePhase.RIVER) {
        sounds.cardDeal();
      }
      if (phase === GamePhase.SHOWDOWN) {
        sounds.reveal();
        if (gameState.winnerId === playerId) {
          setTimeout(() => sounds.win(), 400);
        }
      }
      prevPhaseRef.current = phase;
    }

    const time = gameState.timeRemaining;
    if (time !== prevTimeRef.current && [10, 5, 3, 2, 1].includes(time)) {
      sounds.timerWarning();
    }
    prevTimeRef.current = time;

    // Action log sounds
    const actionLog = gameState.actionLog;
    if (actionLog.length > prevActionLogLenRef.current) {
      const latest = actionLog[actionLog.length - 1];
      if (latest.includes('foldet')) {
        sounds.fold();
      } else if (latest.includes('All-In')) {
        sounds.allIn();
      } else {
        sounds.chipPlace();
      }
    }
    prevActionLogLenRef.current = actionLog.length;
  }, [gameState, playerId, phase, isBettingPhase]);

  // Build community cards (hints/answer displayed as cards in center)
  const communityCards: { label: string; content: string; type: 'hint' | 'answer' }[] = [];
  // Hint 1 visible from FLOP onwards
  const hint1Phases = phase === GamePhase.FLOP || phase === GamePhase.TURN ||
    phase === GamePhase.RIVER || isShowdown || phase === GamePhase.GAME_OVER;
  if (gameState.hint && hint1Phases) {
    communityCards.push({ label: 'HINWEIS 1', content: gameState.hint, type: 'hint' });
  }
  // Hint 2 visible from TURN onwards
  const hint2Phases = phase === GamePhase.TURN || phase === GamePhase.RIVER ||
    isShowdown || phase === GamePhase.GAME_OVER;
  if (gameState.hint2 && hint2Phases) {
    communityCards.push({ label: 'HINWEIS 2', content: gameState.hint2, type: 'hint' });
  }
  // Answer visible from RIVER onwards
  const answerPhases = phase === GamePhase.RIVER || isShowdown || phase === GamePhase.GAME_OVER;
  if (gameState.actualAnswer !== null && answerPhases) {
    communityCards.push({ label: 'ANTWORT', content: gameState.actualAnswer.toLocaleString('de-DE'), type: 'answer' });
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="glass border-b border-white/5 px-5 py-2.5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-black tracking-tight">
              <span className="bg-gradient-to-r from-gold-light to-gold bg-clip-text text-transparent">Quiz</span>
              <span className="text-white">Poker</span>
            </h1>
            {phase !== GamePhase.LOBBY && (
              <>
                <div className="w-px h-4 bg-white/10 hidden sm:block" />
                <span className="hidden sm:flex items-center gap-1.5 text-xs">
                  <span className="text-white/40 font-semibold">{PHASE_LABELS[phase]}</span>
                </span>
                <div className="w-px h-4 bg-white/10 hidden sm:block" />
                <span className="text-white/20 text-xs font-mono hidden sm:inline">
                  Runde {roundNumber}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {me && phase !== GamePhase.LOBBY && (
              <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2.5 py-1 border border-white/5">
                <div className="w-3 h-3 rounded-full bg-gradient-to-b from-gold-light to-gold border border-gold-dark" />
                <span className="font-mono font-black text-gold text-sm">{me.chips.toLocaleString('de-DE')}</span>
              </div>
            )}
            <div
              className="glass-gold rounded-lg px-2.5 py-1 cursor-pointer hover:bg-gold/15 transition-all"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/room/${roomCode}`);
                setCopiedHeader(true);
                setTimeout(() => setCopiedHeader(false), 2000);
              }}
              title="Klicken zum Kopieren"
            >
              {copiedHeader ? (
                <span className="text-emerald-400 text-xs font-bold">Kopiert!</span>
              ) : (
                <span className="font-mono font-bold text-gold tracking-wider text-xs">{roomCode}</span>
              )}
            </div>
            {/* Mobile player toggle */}
            <button
              onClick={() => setShowPlayers(!showPlayers)}
              className="lg:hidden text-white/40 hover:text-white text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/5"
            >
              {players.length}P
            </button>
            <button onClick={onLeave} className="text-white/15 hover:text-red-400 text-xs transition-colors">
              X
            </button>
          </div>
        </div>
      </header>

      {/* Mobile player overlay - fallback list view */}
      {showPlayers && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setShowPlayers(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-72 glass border-l border-white/5 p-4 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white/40 text-[10px] font-bold tracking-[0.2em]">SPIELER</h3>
              <button onClick={() => setShowPlayers(false)} className="text-white/30 hover:text-white text-sm">X</button>
            </div>
            <PlayerList players={players} currentPlayerId={playerId} currentTurnId={gameState.currentTurnPlayerId} phase={phase} dealerIndex={gameState.dealerIndex} />
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-center text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-4 overflow-hidden">

        {/* === LOBBY === */}
        {phase === GamePhase.LOBBY && (
          <div className="text-center animate-fade-in w-full max-w-lg">
            <div className="glass rounded-3xl p-10">
              <div className="text-5xl mb-4">&#x1F0CF;</div>
              <h2 className="text-2xl font-black text-white mb-2">Warte auf Spieler...</h2>
              <p className="text-white/30 text-sm mb-4">
                Teile diesen Link mit deinen Freunden:
              </p>
              <div
                className="glass-gold rounded-xl p-4 cursor-pointer hover:bg-gold/15 transition-all group mb-6"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/room/${roomCode}`);
                  setCopiedLobby(true);
                  setTimeout(() => setCopiedLobby(false), 2000);
                }}
              >
                <div className="font-mono text-gold text-sm group-hover:text-gold-light transition-colors break-all">
                  {window.location.origin}/room/{roomCode}
                </div>
                <div className="text-gold/30 text-[10px] mt-1 font-semibold tracking-wider">
                  {copiedLobby ? 'Kopiert!' : 'KLICK ZUM KOPIEREN'}
                </div>
              </div>
              {isHost && (
                <div className="glass rounded-xl p-4 mb-6 text-left">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white/30 text-[10px] font-bold tracking-[0.15em]">BOTS</span>
                    <button onClick={onAddBot} disabled={players.length >= 8}
                      className="px-3 py-1.5 bg-chip-blue/20 hover:bg-chip-blue/30 text-chip-blue text-xs font-bold rounded-lg transition-all disabled:opacity-30 border border-chip-blue/20">
                      + Bot
                    </button>
                  </div>
                  {players.filter(p => p.isBot).map(bot => (
                    <div key={bot.id} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-4 py-2 mb-1.5 border border-white/5">
                      <span className="text-white text-sm">&#x1F916; {bot.name}</span>
                      <button onClick={() => onRemoveBot(bot.id)} className="text-red-400/40 hover:text-red-400 text-xs">X</button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-white/20 text-sm mb-6">
                {players.length} Spieler im Raum (min. 2)
              </p>
              {isHost && (
                <button
                  onClick={onStartGame}
                  disabled={players.length < 2}
                  className="btn-gold py-4 px-10 text-lg"
                >
                  Spiel starten
                </button>
              )}
              {!isHost && (
                <p className="text-white/20 text-sm">Warte auf den Host...</p>
              )}
            </div>
          </div>
        )}

        {/* === POKER TABLE === */}
        {showTable && !isShowdown && (() => {
          const ordered = reorderPlayers(players, playerId);
          const positions = SEAT_POSITIONS[ordered.length] || SEAT_POSITIONS[8];
          return (
          <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-3">

            {/* Question above table - only when not in estimating (moved to table center during estimating) */}
            {gameState.currentQuestion && phase !== GamePhase.ESTIMATING && (
              <div className="glass rounded-xl text-center py-2.5 px-5 border border-amber-900/20 max-w-xl mb-6">
                <p className="text-white text-sm leading-relaxed font-semibold">{gameState.currentQuestion}</p>
              </div>
            )}

            {/* Wrapper for table + seats */}
            <div className="relative w-full max-w-4xl mx-auto" style={{ minHeight: '500px' }}>

              {/* Table in the center */}
              <div className="absolute left-[12%] right-[12%] top-[18%] bottom-[18%]">
                <PokerTable>
                  {/* Question in table center during ESTIMATING */}
                  {gameState.currentQuestion && phase === GamePhase.ESTIMATING && (
                    <p className="text-white/90 text-sm sm:text-base text-center leading-snug font-semibold drop-shadow max-w-[90%]">{gameState.currentQuestion}</p>
                  )}

                  {/* Pot */}
                  {pot > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-b from-red-400 to-red-600 border-2 border-red-300 shadow-md" />
                      <span className="text-amber-100 font-black text-xl sm:text-2xl font-mono drop-shadow-lg">{pot.toLocaleString('de-DE')}</span>
                    </div>
                  )}

                  {/* Community cards (hints + answer) */}
                  {communityCards.length > 0 && (
                    <div className="flex items-stretch gap-2">
                      {communityCards.map((card, i) => (
                        <div key={card.label}
                          className={`rounded-lg px-3 py-2 text-center max-w-[150px] animate-card-deal ${card.type === 'answer' ? 'bg-amber-100 border border-amber-400' : 'bg-white/90 border border-white/40'}`}
                          style={{ animationDelay: `${i * 200}ms`, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                          <div className={`text-[7px] font-bold tracking-wider ${card.type === 'answer' ? 'text-amber-600' : 'text-emerald-700/60'}`}>{card.label}</div>
                          <div className={`text-[10px] font-semibold leading-tight mt-0.5 ${card.type === 'answer' ? 'text-amber-800 font-black text-xs' : 'text-gray-700'}`}>
                            {card.content.length > 55 ? card.content.slice(0, 55) + '...' : card.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Status */}
                  {phase === GamePhase.ESTIMATING && me?.hasSubmittedEstimate && (
                    <div className="text-white/30 text-xs">Warte auf andere...</div>
                  )}
                  {isBettingPhase && !isMyTurn && !me?.hasFolded && (
                    <div className="text-white/30 text-xs">
                      Warte auf <span className="text-white/60 font-semibold">{players.find(p => p.id === gameState.currentTurnPlayerId)?.name || '...'}</span>
                    </div>
                  )}
                  {me?.hasFolded && isBettingPhase && (
                    <div className="text-red-300/50 text-xs font-semibold">Gefoldet</div>
                  )}
                </PokerTable>
              </div>

              {/* Bet chips on the felt - between seat and center */}
              {ordered.map((player, i) => {
                if (player.currentBet <= 0 || player.hasFolded) return null;
                const [seatLeft, seatTop] = positions[i % positions.length];
                // Position 60% of the way from seat toward center (50, 50)
                const chipLeft = seatLeft + (50 - seatLeft) * 0.55;
                const chipTop = seatTop + (50 - seatTop) * 0.55;
                return (
                  <div key={`chip-${player.id}`}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 z-[5] flex items-center gap-1 pointer-events-none"
                    style={{ left: `${chipLeft}%`, top: `${chipTop}%` }}>
                    {/* Chip stack visual */}
                    <div className="relative">
                      <div className="w-6 h-6 rounded-full border-2 border-red-300 shadow-lg"
                        style={{ background: 'radial-gradient(circle at 35% 35%, #ef4444, #b91c1c)', boxShadow: '0 2px 6px rgba(0,0,0,0.5)' }}>
                        <div className="absolute inset-[3px] rounded-full border border-dashed border-white/30" />
                      </div>
                      {player.currentBet >= 50 && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full border-2 border-blue-300 -z-10"
                          style={{ background: 'radial-gradient(circle at 35% 35%, #3b82f6, #1d4ed8)' }} />
                      )}
                    </div>
                    <span className="text-white font-mono font-bold text-xs drop-shadow-lg">{player.currentBet}</span>
                  </div>
                );
              })}

              {/* Player seats at fixed positions around the table */}
              {ordered.map((player, i) => {
                const [left, top] = positions[i % positions.length];
                return (
                  <div
                    key={player.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                    style={{ left: `${left}%`, top: `${top}%` }}
                  >
                    <PlayerSeat
                      player={player}
                      isMe={player.id === playerId}
                      isTurn={player.id === gameState.currentTurnPlayerId}
                      isDealer={player.id === dealerId}
                      isSB={player.id === sbId}
                      isBB={player.id === bbId}
                      phase={phase}
                      showEstimate={false}
                      emote={emotes.get(player.id)}
                    />
                  </div>
                );
              })}
            </div>

            {/* Timer below table */}
            {(phase === GamePhase.ESTIMATING || isBettingPhase) && (
              <div className="w-full max-w-md">
                <Timer seconds={gameState.timeRemaining} maxSeconds={phase === GamePhase.ESTIMATING ? gameState.config.estimateTimeSec : gameState.config.betTimeSec} />
              </div>
            )}

            {/* Estimate input below table */}
            {phase === GamePhase.ESTIMATING && me && !me.hasSubmittedEstimate && !me.hasFolded && (
              <div className="w-full max-w-md">
                <EstimateInput onSubmit={onSubmitEstimate} />
              </div>
            )}

            {/* Hints below the table as elegant text boxes */}
            {communityCards.filter(c => c.type === 'hint').length > 0 && (
              <div className="w-full max-w-2xl px-2 space-y-2">
                {communityCards.filter(c => c.type === 'hint').map((card, i) => (
                  <div key={card.label} className="glass rounded-xl p-4 text-center animate-fade-in border border-amber-800/20"
                    style={{ animationDelay: `${i * 200}ms` }}>
                    <div className="text-amber-500/40 text-[9px] font-bold tracking-[0.2em] mb-1">{card.label}</div>
                    <p className="text-amber-200/80 text-sm font-medium leading-relaxed">{card.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Your estimate display */}
            {gameState.yourEstimate !== null && isBettingPhase && (
              <div className="glass rounded-xl p-3 text-center animate-fade-in max-w-sm border border-amber-800/20">
                <div className="text-white/30 text-[10px] font-bold tracking-[0.2em] mb-1">DEINE SCHÄTZUNG</div>
                <div className="text-gold font-black text-2xl font-mono">{gameState.yourEstimate.toLocaleString('de-DE')}</div>
              </div>
            )}

            {/* Estimate submitted waiting */}
            {phase === GamePhase.ESTIMATING && me?.hasSubmittedEstimate && !gameState.yourEstimate && (
              <div className="text-white/20 text-xs">Warte auf andere Spieler...</div>
            )}
          </div>
          );
        })()}

        {/* === BETTING CONTROLS - Fixed bottom bar === */}
        {isBettingPhase && isMyTurn && me && !me.hasFolded && (
          <div className="w-full max-w-xl mt-2">
            <BettingControls
              currentBetLevel={gameState.currentBetLevel}
              myCurrentBet={me.currentBet}
              myChips={me.chips}
              minRaise={gameState.minRaise}
              onBet={onBet}
            />
          </div>
        )}

        {/* === EMOTE BAR === */}
        {phase !== GamePhase.LOBBY && phase !== GamePhase.GAME_OVER && me && !me.isEliminated && (
          <div className="flex items-center gap-1.5 mt-2">
            {['\uD83D\uDC4D', '\uD83D\uDD25', '\uD83D\uDE02', '\uD83D\uDE31', '\uD83D\uDE2D', '\uD83E\uDD21'].map(emote => (
              <button
                key={emote}
                onClick={() => onSendEmote(emote)}
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/25 text-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
              >
                {emote}
              </button>
            ))}
          </div>
        )}

        {/* === SHOWDOWN === */}
        {isShowdown && (
          <div className="w-full max-w-2xl mx-auto">
            <Showdown
              key={`showdown-${gameState.roundNumber}`}
              gameState={gameState}
              playerId={playerId}
              onNextRound={onNextRound}
              isHost={isHost}
            />
          </div>
        )}

        {/* === GAME OVER === */}
        {phase === GamePhase.GAME_OVER && (
          <div className="text-center animate-fade-in-scale w-full max-w-lg">
            <div className="glass-gold rounded-3xl p-10">
              <div className="text-6xl mb-4">&#x1F451;</div>
              <h2 className="text-3xl font-black text-gold mb-4">Spiel vorbei!</h2>
              {gameState.winnerId && (
                <div className="mb-6">
                  <p className="text-white/40 text-sm mb-1">Gewinner</p>
                  <p className="text-gold text-2xl font-black">
                    {players.find(p => p.id === gameState.winnerId)?.name}
                  </p>
                  <p className="text-gold/50 font-mono font-bold">
                    {players.find(p => p.id === gameState.winnerId)?.chips.toLocaleString('de-DE')} Chips
                  </p>
                </div>
              )}
              <div className="space-y-1.5 mb-6">
                {[...players].sort((a, b) => b.chips - a.chips).map((p, i) => (
                  <div key={p.id} className={`flex justify-between rounded-xl px-5 py-2.5 ${i === 0 ? 'bg-gold/15' : 'bg-black/20'}`}>
                    <span className={`font-semibold ${i === 0 ? 'text-gold' : 'text-white/60'}`}>
                      {i === 0 ? '#1' : i === 1 ? '#2' : i === 2 ? '#3' : `#${i + 1}`} {p.name}
                    </span>
                    <span className="text-gold font-mono font-bold">{p.chips.toLocaleString('de-DE')}</span>
                  </div>
                ))}
              </div>
              <button onClick={onLeave} className="btn-gold py-3 px-10 text-lg">
                Zurück
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
