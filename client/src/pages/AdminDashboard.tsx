import { useState } from 'react';
import { GamePhase } from '@shared/types';
import type { VisibleGameState, Question } from '@shared/types';
import PlayerList from '../components/PlayerList';
import QuestionCard from '../components/QuestionCard';
import Showdown from '../components/Showdown';
import ActionFeed from '../components/ActionFeed';
import QuestionBrowser from '../components/QuestionBrowser';

interface AdminDashboardProps {
  gameState: VisibleGameState;
  onStartGame: () => void;
  onNextRound: () => void;
  onAdvancePhase: () => void;
  onAddBot: () => void;
  onRemoveBot: (botId: string) => void;
  onLeave: () => void;
  error: string | null;
  questions: Question[];
  onLoadQuestions: () => void;
}

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

const ADVANCE_LABELS: Partial<Record<GamePhase, string>> = {
  [GamePhase.ESTIMATING]: 'Weiter → Hinweis 1',
  [GamePhase.HINT_1]: 'Weiter → Setzrunde 1',
  [GamePhase.BETTING_1]: 'Weiter → Hinweis 2',
  [GamePhase.HINT_2]: 'Weiter → Setzrunde 2',
  [GamePhase.BETTING_2]: 'Weiter → Antwort zeigen',
  [GamePhase.REVEAL]: 'Weiter → Setzrunde 3',
  [GamePhase.BETTING_3]: 'Weiter → Showdown',
  [GamePhase.SHOWDOWN]: 'Weiter → Ergebnis',
  [GamePhase.ROUND_END]: 'Naechste Runde starten',
};

export default function AdminDashboard({ gameState, onStartGame, onNextRound, onAdvancePhase, onAddBot, onRemoveBot, onLeave, error, questions, onLoadQuestions }: AdminDashboardProps) {
  const [showQuestions, setShowQuestions] = useState(false);
  const [showPlayers, setShowPlayers] = useState(false);
  const [copiedHeader, setCopiedHeader] = useState(false);
  const [copiedLobby, setCopiedLobby] = useState(false);
  const { phase, players, pot, roomCode, roundNumber, totalRounds, currentQuestion, hint, hint2, actualAnswer, winnerId, currentTurnPlayerId } = gameState;

  const playersWithEstimates = players.filter(p => p.estimate !== null && !p.isEliminated);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header - same as GameRoom but with ADMIN badge + controls */}
      <header className="glass border-b border-white/5 px-5 py-3 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-gold-light to-gold bg-clip-text text-transparent">Quiz</span>
              <span className="text-white">Poker</span>
            </h1>
            <span className="bg-gold/15 text-gold text-[9px] font-black px-2 py-0.5 rounded border border-gold/20 tracking-[0.1em]">ADMIN</span>
            {phase !== GamePhase.LOBBY && (
              <>
                <div className="w-px h-5 bg-white/10 hidden sm:block" />
                <span className="hidden sm:flex items-center gap-1.5 text-sm">
                  <span>{PHASE_ICONS[phase]}</span>
                  <span className="text-white/60 font-semibold">{PHASE_LABELS[phase]}</span>
                </span>
                <div className="w-px h-5 bg-white/10 hidden sm:block" />
                <span className="text-white/25 text-sm font-mono hidden sm:inline">{roundNumber}/{totalRounds}</span>
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
              className="glass-gold rounded-lg px-3 py-1.5 cursor-pointer hover:bg-gold/15 transition-all"
              onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/room/${roomCode}`); setCopiedHeader(true); setTimeout(() => setCopiedHeader(false), 2000); }}
            >
              {copiedHeader ? <span className="text-emerald-400 text-sm font-bold">Kopiert!</span> : <span className="font-mono font-bold text-gold tracking-wider text-sm">{roomCode}</span>}
            </div>
            <button onClick={() => setShowPlayers(!showPlayers)} className="lg:hidden text-white/40 hover:text-white text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/5">
              {players.length} Spieler
            </button>
            <button onClick={onLeave} className="text-white/15 hover:text-red-400 text-xs transition-colors">✕</button>
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
            <PlayerList players={players} currentPlayerId="" currentTurnId={currentTurnPlayerId} phase={phase} dealerIndex={gameState.dealerIndex} />
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-center text-red-300 text-sm">{error}</div>
      )}

      {showQuestions && <QuestionBrowser questions={questions} onClose={() => setShowQuestions(false)} />}

      {/* Main - same layout as GameRoom */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-5 flex gap-5">
        <div className="flex-1 flex flex-col items-center justify-center gap-5">

          {/* Admin advance button - floating at top */}
          {ADVANCE_LABELS[phase] && (
            <div className="w-full max-w-xl">
              <button
                onClick={phase === GamePhase.ROUND_END ? onNextRound : onAdvancePhase}
                className="btn-gold w-full py-3 text-base animate-border-glow"
              >
                {ADVANCE_LABELS[phase]}
              </button>
            </div>
          )}

          {/* Admin info bar: answer + hints (always visible) */}
          {currentQuestion && phase !== GamePhase.LOBBY && (
            <div className="w-full max-w-xl">
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

          {/* Player estimates overlay (admin sees all estimates in real-time) */}
          {phase !== GamePhase.LOBBY && phase !== GamePhase.GAME_OVER && players.some(p => p.estimate !== null || p.hasSubmittedEstimate) && (
            <div className="w-full max-w-xl">
              <div className="glass rounded-xl p-3">
                <div className="text-white/20 text-[9px] font-bold tracking-[0.15em] mb-2">SCHAETZUNGEN DER SPIELER</div>
                <div className="flex flex-wrap gap-2">
                  {players.filter(p => !p.isEliminated).map(p => (
                    <div key={p.id} className={`rounded-lg px-3 py-1.5 text-xs flex items-center gap-2
                      ${p.id === winnerId && (phase === GamePhase.SHOWDOWN || phase === GamePhase.ROUND_END) ? 'bg-gold/15 border border-gold/20' : 'bg-white/[0.03] border border-white/5'}`}
                    >
                      <span className="text-white/50">{p.name}</span>
                      {p.estimate !== null ? (
                        <span className="text-gold font-mono font-bold">{p.estimate.toLocaleString('de-DE')}</span>
                      ) : p.hasSubmittedEstimate ? (
                        <span className="text-emerald-400/50">✓</span>
                      ) : p.hasFolded ? (
                        <span className="text-red-400/40">fold</span>
                      ) : (
                        <span className="text-white/10">—</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* === Game phases - same as GameRoom but without betting controls === */}

          {/* Lobby */}
          {phase === GamePhase.LOBBY && (
            <div className="text-center animate-fade-in w-full max-w-lg">
              <div className="glass rounded-3xl p-10">
                <div className="text-5xl mb-4">🃏</div>
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

                {/* Bot controls */}
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
                      <span className="text-white text-sm">🤖 {bot.name}</span>
                      <button onClick={() => onRemoveBot(bot.id)} className="text-red-400/40 hover:text-red-400 text-xs">✕</button>
                    </div>
                  ))}
                </div>

                <p className="text-white/20 text-sm mb-4">{players.length} Spieler im Raum (min. 2)</p>
                <button onClick={onStartGame} disabled={players.length < 2} className="btn-gold py-4 px-10 text-lg">
                  Spiel starten
                </button>
              </div>
            </div>
          )}

          {/* Estimating */}
          {phase === GamePhase.ESTIMATING && currentQuestion && (
            <div className="w-full max-w-xl">
              <QuestionCard question={currentQuestion} />
              <div className="glass rounded-2xl p-5 mt-5 text-center animate-fade-in">
                <p className="text-white/20 text-sm">Spieler geben ihre Schaetzungen ab...</p>
                <p className="text-white/10 text-xs mt-1">{players.filter(p => p.hasSubmittedEstimate).length}/{players.filter(p => !p.isEliminated).length} haben getippt</p>
              </div>
            </div>
          )}

          {/* Hint 1 */}
          {phase === GamePhase.HINT_1 && (
            <div className="w-full max-w-xl text-center">
              <QuestionCard question={currentQuestion!} />
              <div className="glass rounded-2xl p-8 mt-6 animate-fade-in-scale shimmer-bg">
                <span className="text-purple-400/50 text-[10px] font-bold tracking-[0.3em]">HINWEIS 1</span>
                <p className="text-purple-300 text-xl mt-3 font-semibold">{hint}</p>
              </div>
              <div className="mt-5">
                <div className="glass-gold rounded-xl px-6 py-3 inline-block">
                  <span className="text-gold/40 text-[10px] font-bold tracking-[0.2em] mr-3">POT</span>
                  <span className="text-gold font-black text-2xl font-mono">{pot.toLocaleString('de-DE')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Betting 1, 2, 3 */}
          {(phase === GamePhase.BETTING_1 || phase === GamePhase.BETTING_2 || phase === GamePhase.BETTING_3) && (
            <div className="w-full max-w-xl">
              <QuestionCard question={currentQuestion!} />

              {hint && (
                <div className="glass rounded-xl p-4 mt-4 text-center border-purple-500/20 shimmer-bg">
                  <span className="text-purple-400/50 text-[10px] font-bold tracking-[0.2em]">HINWEIS 1</span>
                  <p className="text-purple-300 mt-1 font-medium">{hint}</p>
                </div>
              )}

              {hint2 && (phase === GamePhase.BETTING_2 || phase === GamePhase.BETTING_3) && (
                <div className="glass rounded-xl p-4 mt-3 text-center border-purple-500/20 shimmer-bg">
                  <span className="text-purple-400/50 text-[10px] font-bold tracking-[0.2em]">HINWEIS 2</span>
                  <p className="text-purple-300 mt-1 font-medium">{hint2}</p>
                </div>
              )}

              {actualAnswer !== null && phase === GamePhase.BETTING_3 && (
                <div className="glass-gold rounded-xl p-4 mt-3 text-center animate-fade-in-scale">
                  <span className="text-gold/50 text-[10px] font-bold tracking-[0.2em]">RICHTIGE ANTWORT</span>
                  <div className="text-gold font-black text-3xl font-mono mt-1">{actualAnswer.toLocaleString('de-DE')}</div>
                </div>
              )}

              {/* Pot */}
              <div className="flex justify-center my-5">
                <div className="glass-gold rounded-xl px-8 py-4 text-center">
                  <span className="text-gold/40 text-[10px] font-bold tracking-[0.2em]">POT</span>
                  <div className="text-gold font-black text-4xl font-mono mt-1">{pot.toLocaleString('de-DE')}</div>
                </div>
              </div>

              <ActionFeed actionLog={gameState.actionLog} />

              {/* Admin sees who's turn it is */}
              {currentTurnPlayerId && (
                <div className="text-center mt-3 text-white/20 text-sm">
                  Am Zug: <span className="text-gold font-semibold">{players.find(p => p.id === currentTurnPlayerId)?.name}</span>
                </div>
              )}
            </div>
          )}

          {/* Hint 2 */}
          {phase === GamePhase.HINT_2 && (
            <div className="w-full max-w-xl text-center">
              <QuestionCard question={currentQuestion!} />
              <div className="glass rounded-2xl p-8 mt-6 animate-fade-in shimmer-bg">
                <span className="text-purple-400/50 text-[10px] font-bold tracking-[0.3em]">HINWEIS 1</span>
                <p className="text-purple-300 text-xl mt-3 font-semibold">{hint}</p>
              </div>
              <div className="glass rounded-2xl p-8 mt-4 animate-fade-in-scale shimmer-bg">
                <span className="text-purple-400/50 text-[10px] font-bold tracking-[0.3em]">HINWEIS 2</span>
                <p className="text-purple-300 text-xl mt-3 font-semibold">{hint2}</p>
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
              <QuestionCard question={currentQuestion!} />
              {hint && (
                <div className="glass rounded-xl p-4 mt-4 text-center border-purple-500/20">
                  <span className="text-purple-400/50 text-[10px] font-bold tracking-[0.2em]">HINWEIS 1</span>
                  <p className="text-purple-300 mt-1 font-medium">{hint}</p>
                </div>
              )}
              {hint2 && (
                <div className="glass rounded-xl p-4 mt-3 text-center border-purple-500/20">
                  <span className="text-purple-400/50 text-[10px] font-bold tracking-[0.2em]">HINWEIS 2</span>
                  <p className="text-purple-300 mt-1 font-medium">{hint2}</p>
                </div>
              )}
              {actualAnswer !== null && (
                <div className="glass-gold rounded-2xl p-8 mt-6 animate-fade-in-scale">
                  <span className="text-gold/40 text-[10px] font-bold tracking-[0.3em]">RICHTIGE ANTWORT</span>
                  <div className="text-gold font-black text-5xl mt-3 font-mono">{actualAnswer.toLocaleString('de-DE')}</div>
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
            <Showdown gameState={gameState} playerId="" onNextRound={onNextRound} isHost={true} />
          )}

          {/* Game Over */}
          {phase === GamePhase.GAME_OVER && (
            <div className="text-center animate-fade-in-scale w-full max-w-lg">
              <div className="glass-gold rounded-3xl p-10">
                <div className="text-6xl mb-4">👑</div>
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
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`} {p.name}
                      </span>
                      <span className="text-gold font-mono font-bold">{p.chips.toLocaleString('de-DE')}</span>
                    </div>
                  ))}
                </div>
                <button onClick={onLeave} className="btn-gold py-3 px-10 text-lg">Zurueck</button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - same as GameRoom */}
        <div className="hidden lg:block">
          <PlayerList players={players} currentPlayerId="" currentTurnId={currentTurnPlayerId} phase={phase} dealerIndex={gameState.dealerIndex} />
        </div>
      </main>
    </div>
  );
}
