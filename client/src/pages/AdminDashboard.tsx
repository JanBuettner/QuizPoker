import { useState } from 'react';
import { GamePhase } from '@shared/types';
import type { VisibleGameState, Question } from '@shared/types';
import PlayerSeat from '../components/PlayerSeat';
import PlayerList from '../components/PlayerList';
import Showdown from '../components/Showdown';
import ActionFeed from '../components/ActionFeed';
import QuestionBrowser from '../components/QuestionBrowser';

// Predefined seat positions for different player counts
// Each position is [left%, top%] relative to the wrapper
const SEAT_POSITIONS: Record<number, [number, number][]> = {
  2: [[50, 100], [50, 0]],
  3: [[50, 100], [5, 30], [95, 30]],
  4: [[50, 100], [5, 50], [50, 0], [95, 50]],
  5: [[50, 100], [3, 65], [20, 5], [80, 5], [97, 65]],
  6: [[50, 100], [3, 70], [3, 25], [50, 0], [97, 25], [97, 70]],
  7: [[50, 100], [3, 70], [3, 25], [25, 0], [75, 0], [97, 25], [97, 70]],
  8: [[50, 100], [3, 75], [3, 45], [15, 5], [50, 0], [85, 5], [97, 45], [97, 75]],
};

interface AdminDashboardProps {
  gameState: VisibleGameState;
  onStartGame: () => void;
  onNextRound: () => void;
  onAdvancePhase: () => void;
  onSetBlinds: (smallBlind: number, bigBlind: number) => void;
  onUpdateConfig: (data: Record<string, any>) => void;
  onAddBot: () => void;
  onRemoveBot: (botId: string) => void;
  onLeave: () => void;
  error: string | null;
  questions: Question[];
  onLoadQuestions: () => void;
  emotes: Map<string, string>;
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

// Labels when betting is NOT active (reveal/pause state)
const ADVANCE_REVEAL: Partial<Record<GamePhase, string>> = {
  [GamePhase.ESTIMATING]: 'Weiter → Preflop',
  [GamePhase.PREFLOP]: 'Preflop beenden → Flop',
  [GamePhase.FLOP]: 'Wetten starten',
  [GamePhase.TURN]: 'Wetten starten',
  [GamePhase.RIVER]: 'Wetten starten',
  [GamePhase.SHOWDOWN]: 'Weiter → Ergebnis',
  [GamePhase.ROUND_END]: 'Nächste Runde',
};

// Labels when betting IS active
const ADVANCE_BETTING: Partial<Record<GamePhase, string>> = {
  [GamePhase.PREFLOP]: 'Preflop beenden → Flop',
  [GamePhase.FLOP]: 'Flop beenden → Turn',
  [GamePhase.TURN]: 'Turn beenden → River',
  [GamePhase.RIVER]: 'River beenden → Showdown',
};

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

export default function AdminDashboard({ gameState, onStartGame, onNextRound, onAdvancePhase, onSetBlinds, onUpdateConfig, onAddBot, onRemoveBot, onLeave, error, questions, onLoadQuestions, emotes }: AdminDashboardProps) {
  const [showQuestions, setShowQuestions] = useState(false);
  const [showPlayers, setShowPlayers] = useState(false);
  const [copiedHeader, setCopiedHeader] = useState(false);
  const [copiedLobby, setCopiedLobby] = useState(false);
  const { phase, players, pot, roomCode, roundNumber, totalRounds, currentQuestion, hint, hint2, actualAnswer, winnerId, currentTurnPlayerId } = gameState;

  const showBadges = phase !== GamePhase.LOBBY;
  const { dealerId, sbId, bbId } = showBadges ? computePositions(players, gameState.dealerIndex) : { dealerId: null, sbId: null, bbId: null };
  const isBettingPhase = phase === GamePhase.PREFLOP || phase === GamePhase.FLOP || phase === GamePhase.TURN || phase === GamePhase.RIVER;
  const isShowdown = phase === GamePhase.SHOWDOWN || phase === GamePhase.ROUND_END;
  const showTable = phase !== GamePhase.LOBBY && phase !== GamePhase.GAME_OVER;

  // Build community cards (whitelist matching game flow)
  const communityCards: { label: string; content: string; type: 'hint' | 'answer' }[] = [];
  // Hint 1 visible from FLOP onwards
  const hint1Phases = phase === GamePhase.FLOP || phase === GamePhase.TURN ||
    phase === GamePhase.RIVER || isShowdown || phase === GamePhase.GAME_OVER;
  if (hint && hint1Phases) {
    communityCards.push({ label: 'HINWEIS 1', content: hint, type: 'hint' });
  }
  // Hint 2 visible from TURN onwards
  const hint2Phases = phase === GamePhase.TURN || phase === GamePhase.RIVER ||
    isShowdown || phase === GamePhase.GAME_OVER;
  if (hint2 && hint2Phases) {
    communityCards.push({ label: 'HINWEIS 2', content: hint2, type: 'hint' });
  }
  // Answer visible from RIVER onwards
  const answerPhases = phase === GamePhase.RIVER || isShowdown || phase === GamePhase.GAME_OVER;
  if (actualAnswer !== null && answerPhases) {
    communityCards.push({ label: 'ANTWORT', content: actualAnswer.toLocaleString('de-DE'), type: 'answer' });
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
            <span className="bg-gold/15 text-gold text-[9px] font-black px-2 py-0.5 rounded border border-gold/20 tracking-[0.1em]">ADMIN</span>
            {phase !== GamePhase.LOBBY && (
              <>
                <div className="w-px h-4 bg-white/10 hidden sm:block" />
                <span className="hidden sm:flex items-center gap-1.5 text-xs">
                  <span className="text-white/40 font-semibold">{PHASE_LABELS[phase]}</span>
                </span>
                <div className="w-px h-4 bg-white/10 hidden sm:block" />
                <span className="text-white/20 text-xs font-mono hidden sm:inline">Runde {roundNumber}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { onLoadQuestions(); setShowQuestions(true); }}
              className="text-white/30 hover:text-gold text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-gold/10 border border-white/5 hover:border-gold/20 transition-all"
            >
              Fragen
            </button>
            <div
              className="glass-gold rounded-lg px-2.5 py-1 cursor-pointer hover:bg-gold/15 transition-all"
              onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/room/${roomCode}`); setCopiedHeader(true); setTimeout(() => setCopiedHeader(false), 2000); }}
            >
              {copiedHeader ? <span className="text-emerald-400 text-xs font-bold">Kopiert!</span> : <span className="font-mono font-bold text-gold tracking-wider text-xs">{roomCode}</span>}
            </div>
            <button onClick={() => setShowPlayers(!showPlayers)} className="lg:hidden text-white/40 hover:text-white text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/5">
              {players.length}P
            </button>
            <button onClick={onLeave} className="text-white/15 hover:text-red-400 text-xs transition-colors">X</button>
          </div>
        </div>
      </header>

      {/* Mobile player overlay */}
      {showPlayers && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setShowPlayers(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-72 glass border-l border-white/5 p-4 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white/40 text-[10px] font-bold tracking-[0.2em]">SPIELER</h3>
              <button onClick={() => setShowPlayers(false)} className="text-white/30 hover:text-white text-sm">X</button>
            </div>
            <PlayerList players={players} currentPlayerId="" currentTurnId={currentTurnPlayerId} phase={phase} dealerIndex={gameState.dealerIndex} />
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-center text-red-300 text-sm">{error}</div>
      )}

      {showQuestions && <QuestionBrowser questions={questions} onClose={() => setShowQuestions(false)} />}

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-4 overflow-hidden">

        {/* Admin advance button - smart labels based on betting state */}
        {(() => {
          const label = gameState.bettingActive
            ? ADVANCE_BETTING[phase]
            : ADVANCE_REVEAL[phase];
          if (!label) return null;
          return (
            <div className="w-full max-w-xl mb-3">
              <button
                onClick={phase === GamePhase.ROUND_END ? onNextRound : onAdvancePhase}
                className={`w-full py-3 text-base ${gameState.bettingActive ? 'btn-gold opacity-70 hover:opacity-100' : 'btn-gold animate-border-glow'}`}
              >
                {label}
              </button>
            </div>
          );
        })()}

        {/* Blinds control */}
        {phase !== GamePhase.LOBBY && phase !== GamePhase.GAME_OVER && (
          <div className="w-full max-w-xl mb-2">
            <div className="glass rounded-xl px-4 py-2 flex items-center gap-3 text-xs">
              <span className="text-white/20 font-bold tracking-wider">BLINDS</span>
              <span className="text-gold font-mono font-bold">{gameState.config.smallBlind}/{gameState.config.bigBlind}</span>
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  onClick={() => onSetBlinds(gameState.config.smallBlind * 2, gameState.config.bigBlind * 2)}
                  className="px-2.5 py-1 bg-white/5 hover:bg-gold/10 text-white/40 hover:text-gold rounded-lg border border-white/5 hover:border-gold/20 transition-all font-bold"
                >
                  ×2
                </button>
                <button
                  onClick={() => onSetBlinds(Math.max(5, Math.round(gameState.config.smallBlind / 2)), Math.max(10, Math.round(gameState.config.bigBlind / 2)))}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/60 rounded-lg border border-white/5 transition-all font-bold"
                >
                  ÷2
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin info bar: answer + hints (always visible) */}
        {currentQuestion && phase !== GamePhase.LOBBY && (
          <div className="w-full max-w-xl mb-3">
            <div className="glass rounded-xl p-3 flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400/40 font-bold tracking-wider">ANTWORT</span>
                <span className="text-emerald-400 font-black font-mono">{actualAnswer?.toLocaleString('de-DE')}</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-purple-400/40 font-bold tracking-wider shrink-0">H1</span>
                <span className="text-purple-300/60 truncate">{hint}</span>
              </div>
              {hint2 && (
                <>
                  <div className="w-px h-4 bg-white/10" />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-purple-400/40 font-bold tracking-wider shrink-0">H2</span>
                    <span className="text-purple-300/60 truncate">{hint2}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Player estimates overlay (admin sees all) */}
        {phase !== GamePhase.LOBBY && phase !== GamePhase.GAME_OVER && players.some(p => p.estimate !== null || p.hasSubmittedEstimate) && (
          <div className="w-full max-w-xl mb-3">
            <div className="glass rounded-xl p-3">
              <div className="text-white/20 text-[9px] font-bold tracking-[0.15em] mb-2">SCHÄTZUNGEN DER SPIELER</div>
              <div className="flex flex-wrap gap-2">
                {players.filter(p => !p.isEliminated).map(p => (
                  <div key={p.id} className={`rounded-lg px-3 py-1.5 text-xs flex items-center gap-2
                    ${p.id === winnerId && isShowdown ? 'bg-gold/15 border border-gold/20' : 'bg-white/[0.03] border border-white/5'}`}
                  >
                    <span className="text-white/50">{p.name}</span>
                    {p.estimate !== null ? (
                      <span className="text-gold font-mono font-bold">{p.estimate.toLocaleString('de-DE')}</span>
                    ) : p.hasSubmittedEstimate ? (
                      <span className="text-emerald-400/50">&#10003;</span>
                    ) : p.hasFolded ? (
                      <span className="text-red-400/40">fold</span>
                    ) : (
                      <span className="text-white/10">--</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* === LOBBY === */}
        {phase === GamePhase.LOBBY && (
          <div className="text-center animate-fade-in w-full max-w-lg">
            <div className="glass rounded-3xl p-10">
              <div className="text-5xl mb-4">&#x1F0CF;</div>
              <h2 className="text-2xl font-black text-white mb-2">Warte auf Spieler...</h2>
              <p className="text-white/30 text-sm mb-4">Teile diesen Link mit deinen Freunden:</p>
              <div
                className="glass-gold rounded-xl p-4 cursor-pointer hover:bg-gold/15 transition-all group mb-6"
                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/room/${roomCode}`); setCopiedLobby(true); setTimeout(() => setCopiedLobby(false), 2000); }}
              >
                <div className="font-mono text-gold text-sm group-hover:text-gold-light transition-colors break-all">
                  {window.location.origin}/room/{roomCode}
                </div>
                <div className="text-gold/30 text-[10px] mt-1 font-semibold tracking-wider">
                  {copiedLobby ? 'Kopiert!' : 'KLICK ZUM KOPIEREN'}
                </div>
              </div>

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

              {/* Settings */}
              <div className="glass rounded-xl p-4 mb-6 text-left">
                <div className="text-white/30 text-[10px] font-bold tracking-[0.15em] mb-3">EINSTELLUNGEN</div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/50 text-xs">Start-Chips</span>
                    <div className="flex items-center gap-1.5">
                      {[500, 1000, 2000, 5000].map(v => (
                        <button key={v} onClick={() => onUpdateConfig({ startingChips: v })}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${gameState.config.startingChips === v ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-white/5 text-white/30 border border-white/5 hover:text-white/50'}`}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/50 text-xs">Blinds</span>
                    <div className="flex items-center gap-1.5">
                      {[[5,10],[10,20],[25,50],[50,100]].map(([sb,bb]) => (
                        <button key={sb} onClick={() => onUpdateConfig({ smallBlind: sb, bigBlind: bb })}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${gameState.config.smallBlind === sb ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-white/5 text-white/30 border border-white/5 hover:text-white/50'}`}>
                          {sb}/{bb}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/50 text-xs">Auto-Blinderhöhung</span>
                    <div className="flex items-center gap-1.5">
                      {[{v:0,l:'Aus'},{v:3,l:'3 Runden'},{v:5,l:'5 Runden'},{v:10,l:'10 Runden'}].map(({v,l}) => (
                        <button key={v} onClick={() => onUpdateConfig({ blindIncreaseEvery: v })}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${gameState.config.blindIncreaseEvery === v ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-white/5 text-white/30 border border-white/5 hover:text-white/50'}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/50 text-xs">Schwierigkeit</span>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => onUpdateConfig({ difficultyScaling: true })}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${gameState.config.difficultyScaling ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-white/5 text-white/30 border border-white/5 hover:text-white/50'}`}>
                        Leicht→Schwer
                      </button>
                      <button onClick={() => onUpdateConfig({ difficultyScaling: false })}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${!gameState.config.difficultyScaling ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-white/5 text-white/30 border border-white/5 hover:text-white/50'}`}>
                        Zufällig
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/50 text-xs">Schätzzeit</span>
                    <div className="flex items-center gap-1.5">
                      {[{v:30,l:'30s'},{v:45,l:'45s'},{v:60,l:'60s'},{v:90,l:'90s'}].map(({v,l}) => (
                        <button key={v} onClick={() => onUpdateConfig({ estimateTimeSec: v })}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${gameState.config.estimateTimeSec === v ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-white/5 text-white/30 border border-white/5 hover:text-white/50'}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/50 text-xs">Setzzeit</span>
                    <div className="flex items-center gap-1.5">
                      {[{v:15,l:'15s'},{v:30,l:'30s'},{v:45,l:'45s'},{v:60,l:'60s'}].map(({v,l}) => (
                        <button key={v} onClick={() => onUpdateConfig({ betTimeSec: v })}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${gameState.config.betTimeSec === v ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-white/5 text-white/30 border border-white/5 hover:text-white/50'}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-white/20 text-sm mb-4">{players.length} Spieler im Raum (min. 2)</p>
              <button onClick={onStartGame} disabled={players.length < 2} className="btn-gold py-4 px-10 text-lg">
                Spiel starten
              </button>
            </div>
          </div>
        )}

        {/* === POKER TABLE === */}
        {showTable && !isShowdown && (
          <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-3">

            {/* Question card above table */}
            {currentQuestion && (
              <div className="w-full max-w-xl px-2">
                <div className="poker-card-question text-center animate-fade-in">
                  <div className="text-gold/40 text-[9px] font-bold tracking-[0.3em] mb-2">FRAGE</div>
                  <p className="text-white text-base sm:text-lg leading-relaxed font-semibold">{currentQuestion}</p>
                </div>
              </div>
            )}

            {/* The Poker Table */}
            <div className="relative w-full max-w-4xl mx-auto" style={{ minHeight: '500px' }}>
              {/* Table in the center */}
              <div className="absolute left-[12%] right-[12%] top-[18%] bottom-[18%]">
                <div className="w-full h-full">
                  <div
                    style={{
                      background: 'linear-gradient(160deg, #6b4423, #4a2e14, #3d2510, #5c3a1e)',
                      borderRadius: '50%',
                      padding: '16px',
                      boxShadow: '0 0 40px rgba(0,0,0,0.5), inset 0 2px 4px rgba(139,90,43,0.3), inset 0 -2px 4px rgba(0,0,0,0.4)',
                      border: '3px solid rgba(90,60,25,0.6)',
                      width: '100%',
                      height: '100%',
                    }}
                  >
                    <div
                      style={{
                        background: 'radial-gradient(ellipse at 50% 40%, #2d8a4e, #1a6b35, #14532d)',
                        borderRadius: '50%',
                        width: '100%',
                        height: '100%',
                        boxShadow: 'inset 0 0 40px rgba(0,0,0,0.4), inset 0 0 80px rgba(0,0,0,0.2)',
                        border: '2px solid rgba(0,0,0,0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8% 12%',
                        gap: '6px',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Pot display */}
                      {pot > 0 && (
                        <div className="flex flex-col items-center animate-fade-in">
                          <div className="text-amber-200/40 text-[9px] font-bold tracking-[0.2em]">POT</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="chip-stack">
                              <div className="w-5 h-5 rounded-full bg-gradient-to-b from-red-400 to-red-600 border-2 border-red-300 shadow-md" />
                            </div>
                            <span className="text-gold font-black text-xl sm:text-2xl font-mono">{pot.toLocaleString('de-DE')}</span>
                          </div>
                        </div>
                      )}

                      {/* Answer card on table */}
                      {actualAnswer !== null && answerPhases && (
                        <div className="poker-card-gold animate-card-deal mt-1 px-4 py-2">
                          <div className="text-[8px] font-bold tracking-wider mb-0.5 text-amber-600">ANTWORT</div>
                          <div className="text-amber-800 font-black text-lg font-mono">{actualAnswer.toLocaleString('de-DE')}</div>
                        </div>
                      )}

                      {/* Action feed inside table */}
                      {isBettingPhase && (
                        <div className="max-w-xs">
                          <ActionFeed actionLog={gameState.actionLog} />
                        </div>
                      )}

                      {/* Admin: who's turn */}
                      {isBettingPhase && currentTurnPlayerId && (
                        <div className="text-white/25 text-xs mt-1">
                          Am Zug: <span className="text-gold font-semibold">{players.find(p => p.id === currentTurnPlayerId)?.name}</span>
                        </div>
                      )}

                      {/* Estimating status */}
                      {phase === GamePhase.ESTIMATING && (
                        <div className="text-white/20 text-xs">
                          {players.filter(p => p.hasSubmittedEstimate).length}/{players.filter(p => !p.isEliminated).length} haben getippt
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Player seats at fixed positions around the table */}
              {(() => {
                const positions = SEAT_POSITIONS[players.length] || SEAT_POSITIONS[8];
                return players.map((player, i) => {
                  const [left, top] = positions[i % positions.length];
                  return (
                    <div
                      key={player.id}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                      style={{ left: `${left}%`, top: `${top}%` }}
                    >
                      <PlayerSeat
                        player={player}
                        isMe={false}
                        isTurn={player.id === currentTurnPlayerId}
                        isDealer={player.id === dealerId}
                        isSB={player.id === sbId}
                        isBB={player.id === bbId}
                        phase={phase}
                        showEstimate={false}
                        emote={emotes.get(player.id)}
                      />
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* === SHOWDOWN with poker table === */}
        {isShowdown && (
          <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-4">
            {/* Mini poker table with estimates */}
            <div className="relative w-full max-w-4xl mx-auto hidden sm:block" style={{ minHeight: '440px' }}>
              {/* Table in the center */}
              <div className="absolute left-[12%] right-[12%] top-[18%] bottom-[18%]">
                <div className="w-full h-full">
                  <div
                    style={{
                      background: 'linear-gradient(160deg, #6b4423, #4a2e14, #3d2510, #5c3a1e)',
                      borderRadius: '50%',
                      padding: '12px',
                      boxShadow: '0 0 40px rgba(0,0,0,0.5), inset 0 2px 4px rgba(139,90,43,0.3), inset 0 -2px 4px rgba(0,0,0,0.4)',
                      border: '3px solid rgba(90,60,25,0.6)',
                      width: '100%',
                      height: '100%',
                    }}
                  >
                    <div
                      style={{
                        background: 'radial-gradient(ellipse at 50% 40%, #2d8a4e, #1a6b35, #14532d)',
                        borderRadius: '50%',
                        width: '100%',
                        height: '100%',
                        boxShadow: 'inset 0 0 40px rgba(0,0,0,0.4), inset 0 0 80px rgba(0,0,0,0.2)',
                        border: '2px solid rgba(0,0,0,0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {actualAnswer !== null && (
                        <div className="poker-card-gold animate-fade-in-scale !max-w-[140px] text-center">
                          <div className="text-[9px] font-bold tracking-wider text-amber-600 mb-0.5">ANTWORT</div>
                          <div className="text-xl font-black text-amber-800 font-mono">{actualAnswer.toLocaleString('de-DE')}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* Player seats at fixed positions */}
              {(() => {
                const positions = SEAT_POSITIONS[players.length] || SEAT_POSITIONS[8];
                return players.map((player, i) => {
                  const [left, top] = positions[i % positions.length];
                  return (
                    <div
                      key={player.id}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                      style={{ left: `${left}%`, top: `${top}%` }}
                    >
                      <PlayerSeat
                        player={player}
                        isMe={false}
                        isTurn={false}
                        isDealer={player.id === dealerId}
                        isSB={player.id === sbId}
                        isBB={player.id === bbId}
                        phase={phase}
                        showEstimate={true}
                        emote={emotes.get(player.id)}
                      />
                    </div>
                  );
                });
              })()}
            </div>

            <Showdown key={`showdown-${gameState.roundNumber}`} gameState={gameState} playerId="" onNextRound={onNextRound} isHost={false} />
          </div>
        )}

        {/* === GAME OVER === */}
        {phase === GamePhase.GAME_OVER && (
          <div className="text-center animate-fade-in-scale w-full max-w-lg">
            <div className="glass-gold rounded-3xl p-10">
              <div className="text-6xl mb-4">&#x1F451;</div>
              <h2 className="text-3xl font-black text-gold mb-4">Spiel vorbei!</h2>
              {winnerId && (
                <div className="mb-6">
                  <p className="text-white/40 text-sm mb-1">Gewinner</p>
                  <p className="text-gold text-2xl font-black">{players.find(p => p.id === winnerId)?.name}</p>
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
              <button onClick={onLeave} className="btn-gold py-3 px-10 text-lg">Zurück</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
