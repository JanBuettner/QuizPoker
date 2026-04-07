import { useState, useEffect, useRef } from 'react';
import { GamePhase } from '@shared/types';
import type { VisibleGameState } from '@shared/types';
import { sounds } from '../hooks/useSound';
import PlayerList from '../components/PlayerList';
import QuestionCard from '../components/QuestionCard';
import EstimateInput from '../components/EstimateInput';
import BettingControls from '../components/BettingControls';
import Showdown from '../components/Showdown';
import Timer from '../components/Timer';
import ActionFeed from '../components/ActionFeed';

const PHASE_LABELS: Record<GamePhase, string> = {
  [GamePhase.LOBBY]: 'Lobby',
  [GamePhase.ESTIMATING]: 'Schaetzung',
  [GamePhase.HINT_1]: 'Hinweis 1',
  [GamePhase.BETTING_1]: 'Setzrunde 1',
  [GamePhase.HINT_2]: 'Hinweis 2',
  [GamePhase.BETTING_2]: 'Setzrunde 2',
  [GamePhase.REVEAL]: 'Aufloesung',
  [GamePhase.BETTING_3]: 'Setzrunde 3',
  [GamePhase.SHOWDOWN]: 'Showdown',
  [GamePhase.ROUND_END]: 'Ergebnis',
  [GamePhase.GAME_OVER]: 'Spiel vorbei',
};

const PHASE_ICONS: Record<GamePhase, string> = {
  [GamePhase.LOBBY]: '⏳',
  [GamePhase.ESTIMATING]: '🤔',
  [GamePhase.HINT_1]: '💡',
  [GamePhase.BETTING_1]: '💰',
  [GamePhase.HINT_2]: '💡',
  [GamePhase.BETTING_2]: '💰',
  [GamePhase.REVEAL]: '🔍',
  [GamePhase.BETTING_3]: '💰',
  [GamePhase.SHOWDOWN]: '🎯',
  [GamePhase.ROUND_END]: '🏆',
  [GamePhase.GAME_OVER]: '👑',
};

interface GameRoomProps {
  gameState: VisibleGameState;
  playerId: string;
  onStartGame: () => void;
  onSubmitEstimate: (estimate: number) => void;
  onBet: (action: string, amount?: number) => void;
  onNextRound: () => void;
  onLeave: () => void;
  error: string | null;
}

export default function GameRoom({
  gameState,
  playerId,
  onStartGame,
  onSubmitEstimate,
  onBet,
  onNextRound,
  onLeave,
  error,
}: GameRoomProps) {
  const { phase, players, pot, roomCode, roundNumber, totalRounds } = gameState;
  const me = players.find(p => p.id === playerId);
  const isHost = me?.isHost || false;
  const isMyTurn = gameState.currentTurnPlayerId === playerId;
  const [showPlayers, setShowPlayers] = useState(false);
  const [copiedHeader, setCopiedHeader] = useState(false);
  const [copiedLobby, setCopiedLobby] = useState(false);
  const activePlayers = players.filter(p => !p.isEliminated && !p.hasFolded);

  // Sound feedback
  const prevPhaseRef = useRef(phase);
  const prevTurnRef = useRef(gameState.currentTurnPlayerId);
  const prevTimeRef = useRef(gameState.timeRemaining);

  useEffect(() => {
    // your turn sound
    if (gameState.currentTurnPlayerId === playerId && prevTurnRef.current !== playerId
        && (phase === GamePhase.BETTING_1 || phase === GamePhase.BETTING_2 || phase === GamePhase.BETTING_3)) {
      sounds.yourTurn();
    }
    prevTurnRef.current = gameState.currentTurnPlayerId;

    // phase change sounds
    if (phase !== prevPhaseRef.current) {
      if (phase === GamePhase.SHOWDOWN || phase === GamePhase.REVEAL) {
        sounds.reveal();
        if (phase === GamePhase.SHOWDOWN && gameState.winnerId === playerId) {
          setTimeout(() => sounds.win(), 400);
        }
      }
      prevPhaseRef.current = phase;
    }

    // timer warning sounds
    const time = gameState.timeRemaining;
    if (time !== prevTimeRef.current && [10, 5, 3, 2, 1].includes(time)) {
      sounds.timerWarning();
    }
    prevTimeRef.current = time;
  }, [gameState, playerId, phase]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="glass border-b border-white/5 px-5 py-3 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-gold-light to-gold bg-clip-text text-transparent">Quiz</span>
              <span className="text-white">Poker</span>
            </h1>
            {phase !== GamePhase.LOBBY && (
              <>
                <div className="w-px h-5 bg-white/10 hidden sm:block" />
                <span className="hidden sm:flex items-center gap-1.5 text-sm">
                  <span>{PHASE_ICONS[phase]}</span>
                  <span className="text-white/60 font-semibold">{PHASE_LABELS[phase]}</span>
                </span>
                <div className="w-px h-5 bg-white/10 hidden sm:block" />
                <span className="text-white/25 text-sm font-mono hidden sm:inline">
                  {roundNumber}/{totalRounds}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            {me && phase !== GamePhase.LOBBY && (
              <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5 border border-white/5">
                <span className="text-white/30 text-[10px] font-bold tracking-wider">CHIPS</span>
                <span className="font-mono font-black text-gold">{me.chips.toLocaleString('de-DE')}</span>
              </div>
            )}
            <div
              className="glass-gold rounded-lg px-3 py-1.5 cursor-pointer hover:bg-gold/15 transition-all"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/room/${roomCode}`);
                setCopiedHeader(true);
                setTimeout(() => setCopiedHeader(false), 2000);
              }}
              title="Klicken zum Kopieren"
            >
              {copiedHeader ? (
                <span className="text-emerald-400 text-sm font-bold">Kopiert!</span>
              ) : (
                <span className="font-mono font-bold text-gold tracking-wider text-sm">{roomCode}</span>
              )}
            </div>
            {/* Mobile player toggle */}
            <button
              onClick={() => setShowPlayers(!showPlayers)}
              className="lg:hidden text-white/40 hover:text-white text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/5"
            >
              {players.length} Spieler
            </button>
            <button onClick={onLeave} className="text-white/15 hover:text-red-400 text-xs transition-colors">
              ✕
            </button>
          </div>
        </div>
      </header>

      {/* Mobile phase bar */}
      {phase !== GamePhase.LOBBY && (
        <div className="sm:hidden glass border-b border-white/5 px-4 py-2 flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5">
            <span>{PHASE_ICONS[phase]}</span>
            <span className="text-white/60 font-semibold">{PHASE_LABELS[phase]}</span>
          </span>
          <span className="text-white/25 font-mono">R{roundNumber}/{totalRounds}</span>
          {me && <span className="text-gold font-mono font-bold">{me.chips.toLocaleString('de-DE')}</span>}
        </div>
      )}

      {/* Mobile player overlay */}
      {showPlayers && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setShowPlayers(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-72 glass border-l border-white/5 p-4 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white/40 text-[10px] font-bold tracking-[0.2em]">SPIELER</h3>
              <button onClick={() => setShowPlayers(false)} className="text-white/30 hover:text-white text-sm">✕</button>
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
      <main className="flex-1 max-w-6xl mx-auto w-full p-5 flex gap-5">
        {/* Game area */}
        <div className="flex-1 flex flex-col items-center justify-center gap-5">

          {/* Lobby */}
          {phase === GamePhase.LOBBY && (
            <div className="text-center animate-fade-in w-full max-w-lg">
              <div className="glass rounded-3xl p-10">
                <div className="text-5xl mb-4">🃏</div>
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

          {/* Estimating */}
          {phase === GamePhase.ESTIMATING && gameState.currentQuestion && (
            <div className="w-full max-w-xl">
              <QuestionCard question={gameState.currentQuestion} />
              {me && !me.hasSubmittedEstimate && !me.hasFolded && (
                <EstimateInput onSubmit={onSubmitEstimate} />
              )}
              {me?.hasSubmittedEstimate && (
                <div className="glass rounded-2xl p-5 mt-5 text-center animate-fade-in">
                  <div className="text-white/30 text-[10px] font-bold tracking-[0.2em] mb-2">DEINE SCHAETZUNG</div>
                  <div className="text-gold font-black text-3xl font-mono">{gameState.yourEstimate?.toLocaleString('de-DE')}</div>
                  <p className="text-white/20 text-xs mt-2">Warte auf andere Spieler...</p>
                </div>
              )}
              <Timer seconds={gameState.timeRemaining} maxSeconds={gameState.config.estimateTimeSec} />
            </div>
          )}

          {/* Hint 1 */}
          {phase === GamePhase.HINT_1 && (
            <div className="w-full max-w-xl text-center">
              <QuestionCard question={gameState.currentQuestion!} />
              <div className="glass rounded-2xl p-8 mt-6 animate-fade-in-scale shimmer-bg">
                <span className="text-purple-400/50 text-[10px] font-bold tracking-[0.3em]">HINWEIS 1</span>
                <p className="text-purple-300 text-xl mt-3 font-semibold">{gameState.hint}</p>
              </div>
              <div className="mt-5">
                <div className="glass-gold rounded-xl px-6 py-3 inline-block">
                  <span className="text-gold/40 text-[10px] font-bold tracking-[0.2em] mr-3">POT</span>
                  <span className="text-gold font-black text-2xl font-mono">{pot.toLocaleString('de-DE')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Betting */}
          {(phase === GamePhase.BETTING_1 || phase === GamePhase.BETTING_2 || phase === GamePhase.BETTING_3) && (
            <div className="w-full max-w-xl">
              <QuestionCard question={gameState.currentQuestion!} />

              {gameState.hint && (phase === GamePhase.BETTING_1 || phase === GamePhase.BETTING_2 || phase === GamePhase.BETTING_3) && (
                <div className="glass rounded-xl p-4 mt-4 text-center border-purple-500/20 shimmer-bg">
                  <span className="text-purple-400/50 text-[10px] font-bold tracking-[0.2em]">HINWEIS 1</span>
                  <p className="text-purple-300 mt-1 font-medium">{gameState.hint}</p>
                </div>
              )}

              {gameState.hint2 && (phase === GamePhase.BETTING_2 || phase === GamePhase.BETTING_3) && (
                <div className="glass rounded-xl p-4 mt-3 text-center border-purple-500/20 shimmer-bg">
                  <span className="text-purple-400/50 text-[10px] font-bold tracking-[0.2em]">HINWEIS 2</span>
                  <p className="text-purple-300 mt-1 font-medium">{gameState.hint2}</p>
                </div>
              )}

              {gameState.actualAnswer !== null && phase === GamePhase.BETTING_3 && (
                <div className="glass-gold rounded-xl p-4 mt-3 text-center animate-fade-in-scale">
                  <span className="text-gold/50 text-[10px] font-bold tracking-[0.2em]">RICHTIGE ANTWORT</span>
                  <div className="text-gold font-black text-3xl font-mono mt-1">{gameState.actualAnswer.toLocaleString('de-DE')}</div>
                </div>
              )}

              {gameState.yourEstimate !== null && (
                <div className="text-center mt-3 text-white/25 text-sm">
                  Deine Schaetzung: <span className="text-gold font-bold font-mono">{gameState.yourEstimate.toLocaleString('de-DE')}</span>
                </div>
              )}

              {/* Pot */}
              <div className="flex justify-center my-5">
                <div className="glass-gold rounded-xl px-8 py-4 text-center">
                  <span className="text-gold/40 text-[10px] font-bold tracking-[0.2em]">POT</span>
                  <div className="text-gold font-black text-4xl font-mono mt-1">{pot.toLocaleString('de-DE')}</div>
                </div>
              </div>

              {/* Action Feed */}
              <ActionFeed actionLog={gameState.actionLog} />

              {isMyTurn && me && !me.hasFolded && (
                <BettingControls
                  currentBetLevel={gameState.currentBetLevel}
                  myCurrentBet={me.currentBet}
                  myChips={me.chips}
                  minRaise={gameState.minRaise}
                  onBet={onBet}
                />
              )}
              {!isMyTurn && !me?.hasFolded && (
                <div className="text-center mt-5 text-white/20 text-sm">
                  Warte auf <span className="text-white/40 font-semibold">{players.find(p => p.id === gameState.currentTurnPlayerId)?.name || '...'}</span>
                </div>
              )}
              {me?.hasFolded && (
                <div className="text-center mt-5 text-red-400/30 text-sm font-semibold">Du hast gefoldet</div>
              )}
              <Timer seconds={gameState.timeRemaining} maxSeconds={gameState.config.betTimeSec} />
            </div>
          )}

          {/* Hint 2 */}
          {phase === GamePhase.HINT_2 && (
            <div className="w-full max-w-xl text-center">
              <QuestionCard question={gameState.currentQuestion!} />
              <div className="glass rounded-2xl p-8 mt-6 animate-fade-in shimmer-bg">
                <span className="text-purple-400/50 text-[10px] font-bold tracking-[0.3em]">HINWEIS 1</span>
                <p className="text-purple-300 text-xl mt-3 font-semibold">{gameState.hint}</p>
              </div>
              <div className="glass rounded-2xl p-8 mt-4 animate-fade-in-scale shimmer-bg">
                <span className="text-purple-400/50 text-[10px] font-bold tracking-[0.3em]">HINWEIS 2</span>
                <p className="text-purple-300 text-xl mt-3 font-semibold">{gameState.hint2}</p>
              </div>
              <div className="mt-5">
                <div className="glass-gold rounded-xl px-6 py-3 inline-block">
                  <span className="text-gold/40 text-[10px] font-bold tracking-[0.2em] mr-3">POT</span>
                  <span className="text-gold font-black text-2xl font-mono">{pot.toLocaleString('de-DE')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Reveal */}
          {phase === GamePhase.REVEAL && (
            <div className="w-full max-w-xl text-center">
              <QuestionCard question={gameState.currentQuestion!} />
              {gameState.hint && (
                <div className="glass rounded-xl p-4 mt-4 text-center border-purple-500/20">
                  <span className="text-purple-400/50 text-[10px] font-bold tracking-[0.2em]">HINWEIS 1</span>
                  <p className="text-purple-300 mt-1 font-medium">{gameState.hint}</p>
                </div>
              )}
              {gameState.hint2 && (
                <div className="glass rounded-xl p-4 mt-3 text-center border-purple-500/20">
                  <span className="text-purple-400/50 text-[10px] font-bold tracking-[0.2em]">HINWEIS 2</span>
                  <p className="text-purple-300 mt-1 font-medium">{gameState.hint2}</p>
                </div>
              )}
              {gameState.actualAnswer !== null && (
                <div className="glass-gold rounded-2xl p-8 mt-6 animate-fade-in-scale">
                  <span className="text-gold/40 text-[10px] font-bold tracking-[0.3em]">RICHTIGE ANTWORT</span>
                  <div className="text-gold font-black text-5xl mt-3 font-mono">{gameState.actualAnswer.toLocaleString('de-DE')}</div>
                </div>
              )}
              <div className="mt-5">
                <div className="glass-gold rounded-xl px-6 py-3 inline-block">
                  <span className="text-gold/40 text-[10px] font-bold tracking-[0.2em] mr-3">POT</span>
                  <span className="text-gold font-black text-2xl font-mono">{pot.toLocaleString('de-DE')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Showdown */}
          {(phase === GamePhase.SHOWDOWN || phase === GamePhase.ROUND_END) && (
            <Showdown
              gameState={gameState}
              playerId={playerId}
              onNextRound={onNextRound}
              isHost={isHost}
            />
          )}

          {/* Game Over */}
          {phase === GamePhase.GAME_OVER && (
            <div className="text-center animate-fade-in-scale w-full max-w-lg">
              <div className="glass-gold rounded-3xl p-10">
                <div className="text-6xl mb-4">👑</div>
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
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`} {p.name}
                      </span>
                      <span className="text-gold font-mono font-bold">{p.chips.toLocaleString('de-DE')}</span>
                    </div>
                  ))}
                </div>
                <button onClick={onLeave} className="btn-gold py-3 px-10 text-lg">
                  Zurueck
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - hidden on mobile, use overlay instead */}
        <div className="hidden lg:block">
          <PlayerList
            players={players}
            currentPlayerId={playerId}
            currentTurnId={gameState.currentTurnPlayerId}
            phase={phase}
            dealerIndex={gameState.dealerIndex}
          />
        </div>
      </main>
    </div>
  );
}
