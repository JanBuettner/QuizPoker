import { useState } from 'react';
import { GamePhase } from '@shared/types';
import type { VisibleGameState, Question } from '@shared/types';
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
  const { phase, players, pot, roomCode, roundNumber, totalRounds, currentQuestion, hint, hint2, actualAnswer, winnerId, timeRemaining, currentTurnPlayerId, config } = gameState;

  const sortedByChips = [...players].sort((a, b) => b.chips - a.chips);
  const sortedByCloseness = actualAnswer !== null
    ? [...players].filter(p => p.estimate !== null).sort((a, b) => Math.abs(a.estimate! - actualAnswer) - Math.abs(b.estimate! - actualAnswer))
    : [];

  const activePlayers = players.filter(p => !p.isEliminated && !p.hasFolded);
  const submittedCount = players.filter(p => p.hasSubmittedEstimate).length;
  const totalActive = players.filter(p => !p.isEliminated).length;
  const [copiedHeader, setCopiedHeader] = useState(false);
  const [copiedLobby, setCopiedLobby] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="glass border-b border-white/5 px-6 py-3 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-5">
            <h1 className="text-xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-gold-light to-gold bg-clip-text text-transparent">Quiz</span>
              <span className="text-white">Poker</span>
            </h1>
            <span className="bg-gold/15 text-gold text-[10px] font-black px-2.5 py-1 rounded-md border border-gold/20 tracking-[0.15em]">
              ADMIN
            </span>
            {phase !== GamePhase.LOBBY && (
              <>
                <div className="w-px h-5 bg-white/10" />
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{PHASE_ICONS[phase]}</span>
                  <span className="text-white font-semibold text-sm">{PHASE_LABELS[phase]}</span>
                </div>
                <div className="w-px h-5 bg-white/10" />
                <span className="text-white/30 text-sm font-mono">
                  Runde {roundNumber}/{totalRounds}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div
              className="glass-gold rounded-lg px-4 py-1.5 cursor-pointer hover:bg-gold/15 transition-all"
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
                <>
                  <span className="text-gold/50 text-[10px] tracking-wider font-semibold mr-2">RAUM</span>
                  <span className="font-mono font-black text-gold tracking-[0.2em]">{roomCode}</span>
                </>
              )}
            </div>
            <button
              onClick={() => { onLoadQuestions(); setShowQuestions(true); }}
              className="text-white/30 hover:text-gold text-xs transition-colors bg-white/5 hover:bg-gold/10 px-3 py-1 rounded-lg border border-white/5 hover:border-gold/20"
            >
              Fragen
            </button>
            <button onClick={onLeave} className="text-white/20 hover:text-red-400 text-xs transition-colors">
              Verlassen
            </button>
          </div>
        </div>
      </header>

      {/* Question Browser Modal */}
      {showQuestions && (
        <QuestionBrowser questions={questions} onClose={() => setShowQuestions(false)} />
      )}

      {error && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-2 text-center text-red-300 text-sm">
          {error}
        </div>
      )}

      <main className="flex-1 max-w-[1600px] mx-auto w-full p-5 grid grid-cols-12 gap-5">
        {/* Left column: Main game area */}
        <div className="col-span-8 space-y-5">

          {/* Question + Answer + Hints card */}
          {currentQuestion && (
            <div className="glass rounded-2xl overflow-hidden animate-fade-in">
              {/* Question */}
              <div className="p-6 border-b border-white/5">
                <div className="text-gold/40 text-[10px] font-bold tracking-[0.2em] mb-3">FRAGE</div>
                <p className="text-white text-xl font-semibold leading-relaxed">{currentQuestion}</p>
              </div>
              {/* Answer + Hints row */}
              <div className="grid grid-cols-3 divide-x divide-white/5">
                <div className="p-5">
                  <div className="text-emerald-400/40 text-[10px] font-bold tracking-[0.2em] mb-2">RICHTIGE ANTWORT</div>
                  <div className="text-emerald-400 font-black text-3xl font-mono">
                    {actualAnswer?.toLocaleString('de-DE') ?? '—'}
                  </div>
                </div>
                <div className="p-5">
                  <div className="text-purple-400/40 text-[10px] font-bold tracking-[0.2em] mb-2">HINWEIS 1</div>
                  <div className="text-purple-300 text-sm leading-relaxed">
                    {hint || '—'}
                  </div>
                </div>
                <div className="p-5">
                  <div className="text-purple-400/40 text-[10px] font-bold tracking-[0.2em] mb-2">HINWEIS 2</div>
                  <div className="text-purple-300 text-sm leading-relaxed">
                    {hint2 || '—'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pot display */}
          {phase !== GamePhase.LOBBY && (
            <div className="flex items-center gap-4 animate-fade-in">
              <div className="glass-gold rounded-xl px-6 py-3 flex items-center gap-3">
                <span className="text-gold/50 text-[10px] font-bold tracking-[0.2em]">POT</span>
                <span className="text-gold font-black text-2xl font-mono">{pot.toLocaleString('de-DE')}</span>
              </div>
              <div className="glass rounded-xl px-5 py-3 flex items-center gap-3">
                <span className="text-white/30 text-[10px] font-bold tracking-[0.2em]">AKTIV</span>
                <span className="text-white font-bold">{activePlayers.length}/{totalActive}</span>
              </div>
              {phase === GamePhase.ESTIMATING && (
                <div className="glass rounded-xl px-5 py-3 flex items-center gap-3">
                  <span className="text-white/30 text-[10px] font-bold tracking-[0.2em]">GETIPPT</span>
                  <span className="text-emerald-400 font-bold">{submittedCount}/{totalActive}</span>
                </div>
              )}
              {timeRemaining > 0 && (
                <div className={`glass rounded-xl px-5 py-3 flex items-center gap-3 ${timeRemaining <= 10 ? 'border-red-500/30' : ''}`}>
                  <span className={`font-mono font-bold text-lg ${timeRemaining <= 10 ? 'text-red-400' : 'text-white/50'}`}>
                    {timeRemaining}s
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Action Feed */}
          {(phase === GamePhase.BETTING_1 || phase === GamePhase.BETTING_2 || phase === GamePhase.BETTING_3) && (
            <ActionFeed actionLog={gameState.actionLog} />
          )}

          {/* Player table */}
          <div className="glass rounded-2xl overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-white/30 tracking-[0.2em]">SPIELER</h3>
              <span className="text-white/20 text-xs">{players.length} Spieler</span>
            </div>

            {players.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-4xl mb-3">🎭</div>
                <p className="text-white/20">Noch keine Spieler beigetreten</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-white/20 text-[10px] font-bold tracking-[0.15em] border-b border-white/5">
                      <th className="py-3 px-6 text-left">SPIELER</th>
                      <th className="py-3 px-4 text-right">CHIPS</th>
                      <th className="py-3 px-4 text-right">SCHAETZUNG</th>
                      {actualAnswer !== null && <th className="py-3 px-4 text-right">ABSTAND</th>}
                      <th className="py-3 px-4 text-right">EINSATZ</th>
                      <th className="py-3 px-4 text-center">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedByChips.map((player, i) => {
                      const isTurn = player.id === currentTurnPlayerId;
                      const isWinner = player.id === winnerId;
                      const diff = actualAnswer !== null && player.estimate !== null
                        ? Math.abs(player.estimate - actualAnswer) : null;

                      return (
                        <tr
                          key={player.id}
                          className={`
                            border-b border-white/[0.03] transition-all duration-300
                            ${isTurn ? 'bg-gold/[0.06]' : 'hover:bg-white/[0.02]'}
                            ${isWinner && (phase === GamePhase.SHOWDOWN || phase === GamePhase.ROUND_END) ? 'bg-gold/[0.08]' : ''}
                            ${player.isEliminated ? 'opacity-25' : ''}
                          `}
                        >
                          <td className="py-3.5 px-6">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full transition-colors ${player.isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-white/10'}`} />
                              <span className={`font-semibold ${isWinner ? 'text-gold' : 'text-white'}`}>
                                {player.name}
                              </span>
                              {player.isBot && (
                                <span className="text-[9px] bg-chip-blue/20 text-chip-blue rounded px-1.5 py-0.5 font-bold tracking-wider">BOT</span>
                              )}
                              {isTurn && (
                                <span className="text-[9px] bg-gold/20 text-gold rounded-full px-2 py-0.5 font-bold animate-pulse">
                                  AM ZUG
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span className="font-mono font-bold text-gold/80">{player.chips.toLocaleString('de-DE')}</span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono">
                            {player.estimate !== null ? (
                              <span className="text-white font-semibold">{player.estimate.toLocaleString('de-DE')}</span>
                            ) : player.hasSubmittedEstimate ? (
                              <span className="text-emerald-400/60">✓</span>
                            ) : (
                              <span className="text-white/10">—</span>
                            )}
                          </td>
                          {actualAnswer !== null && (
                            <td className="py-3.5 px-4 text-right font-mono">
                              {diff !== null ? (
                                <span className={`${diff === 0 ? 'text-emerald-400 font-bold' : diff < actualAnswer * 0.1 ? 'text-emerald-400/60' : 'text-white/30'}`}>
                                  {diff === 0 ? 'Exakt!' : diff.toLocaleString('de-DE')}
                                </span>
                              ) : (
                                <span className="text-white/10">—</span>
                              )}
                            </td>
                          )}
                          <td className="py-3.5 px-4 text-right font-mono text-white/30">
                            {player.currentBet > 0 ? player.currentBet.toLocaleString('de-DE') : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {player.isEliminated ? (
                              <span className="text-[9px] bg-white/5 text-white/30 rounded-full px-2.5 py-1 font-bold">RAUS</span>
                            ) : player.hasFolded ? (
                              <span className="text-[9px] bg-red-500/10 text-red-400/80 rounded-full px-2.5 py-1 font-bold">FOLD</span>
                            ) : player.hasSubmittedEstimate && phase === GamePhase.ESTIMATING ? (
                              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 rounded-full px-2.5 py-1 font-bold">BEREIT</span>
                            ) : (
                              <span className="text-[9px] bg-white/5 text-white/40 rounded-full px-2.5 py-1 font-bold">AKTIV</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Ranking after showdown */}
          {sortedByCloseness.length > 0 && (phase === GamePhase.SHOWDOWN || phase === GamePhase.ROUND_END || phase === GamePhase.GAME_OVER) && (
            <div className="glass-gold rounded-2xl overflow-hidden animate-fade-in">
              <div className="px-6 py-4 border-b border-gold/10">
                <h3 className="text-[10px] font-bold text-gold/50 tracking-[0.2em]">RANKING</h3>
              </div>
              <div className="p-4 space-y-2">
                {sortedByCloseness.map((p, i) => {
                  const diff = Math.abs(p.estimate! - actualAnswer!);
                  const isWinner = p.id === winnerId;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between rounded-xl px-5 py-3 transition-all
                        ${isWinner ? 'bg-gold/15 border border-gold/20' : 'bg-black/20'}`}
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      <div className="flex items-center gap-4">
                        <span className={`text-lg font-black ${i === 0 ? 'text-gold' : i === 1 ? 'text-white/50' : i === 2 ? 'text-orange-700/60' : 'text-white/20'}`}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                        </span>
                        <span className={`font-semibold ${isWinner ? 'text-gold' : 'text-white'}`}>{p.name}</span>
                      </div>
                      <div className="flex items-center gap-6 font-mono text-sm">
                        <span className="text-white font-bold">{p.estimate!.toLocaleString('de-DE')}</span>
                        <span className={`${isWinner ? 'text-gold' : 'text-white/30'}`}>
                          {diff === 0 ? 'Exakt!' : `±${diff.toLocaleString('de-DE')}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Controls + Info */}
        <div className="col-span-4 space-y-5">

          {/* Main action button */}
          {ADVANCE_LABELS[phase] && (
            <div className="animate-fade-in-scale">
              <button
                onClick={phase === GamePhase.ROUND_END ? onNextRound : onAdvancePhase}
                className="btn-gold w-full py-4 text-base animate-border-glow"
              >
                {ADVANCE_LABELS[phase]}
              </button>
            </div>
          )}

          {/* Lobby controls */}
          {phase === GamePhase.LOBBY && (
            <div className="glass rounded-2xl p-5 space-y-4 animate-fade-in">
              <div className="text-center">
                <div className="text-4xl mb-2">🎮</div>
                <p className="text-white/30 text-sm">Warte auf Spieler...</p>
              </div>

              <div
                className="glass-gold rounded-xl p-3 text-center cursor-pointer hover:bg-gold/15 transition-all group"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/room/${roomCode}`);
                  setCopiedLobby(true);
                  setTimeout(() => setCopiedLobby(false), 2000);
                }}
              >
                <div className="text-gold/40 text-[9px] font-bold tracking-wider mb-1">
                  {copiedLobby ? 'Kopiert!' : 'EINLADUNGSLINK (KLICK ZUM KOPIEREN)'}
                </div>
                <div className="font-mono text-gold text-xs group-hover:text-gold-light transition-colors break-all">
                  {window.location.origin}/room/{roomCode}
                </div>
              </div>

              {/* Bot controls */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/30 text-[10px] font-bold tracking-[0.15em]">BOTS</span>
                  <button
                    onClick={onAddBot}
                    disabled={players.length >= 8}
                    className="px-3 py-1.5 bg-chip-blue/20 hover:bg-chip-blue/30 text-chip-blue text-xs font-bold
                      rounded-lg transition-all disabled:opacity-30 border border-chip-blue/20 hover:border-chip-blue/30"
                  >
                    + Bot hinzufuegen
                  </button>
                </div>
                {players.filter(p => p.isBot).map(bot => (
                  <div key={bot.id} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-4 py-2.5 border border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="text-chip-blue text-sm">🤖</span>
                      <span className="text-white text-sm font-medium">{bot.name}</span>
                    </div>
                    <button
                      onClick={() => onRemoveBot(bot.id)}
                      className="text-red-400/40 hover:text-red-400 text-xs transition-colors font-medium"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={onStartGame}
                disabled={players.length < 2}
                className="btn-gold w-full py-4 text-lg"
              >
                Spiel starten ({players.length} Spieler)
              </button>
            </div>
          )}

          {/* Game Over */}
          {phase === GamePhase.GAME_OVER && (
            <div className="glass-gold rounded-2xl p-6 text-center animate-fade-in-scale">
              <div className="text-5xl mb-3">👑</div>
              <h2 className="text-gold font-black text-2xl mb-2">Spiel vorbei!</h2>
              {winnerId && (
                <p className="text-white text-lg font-semibold mb-1">
                  {players.find(p => p.id === winnerId)?.name} gewinnt!
                </p>
              )}
              <button onClick={onLeave} className="btn-gold w-full py-3 mt-4">
                Zurueck zur Lobby
              </button>
            </div>
          )}

          {/* Game info */}
          {phase !== GamePhase.LOBBY && (
            <div className="glass rounded-2xl p-5 animate-fade-in">
              <h3 className="text-[10px] font-bold text-white/20 tracking-[0.2em] mb-4">SPIELINFO</h3>
              <div className="space-y-3">
                {[
                  ['Phase', `${PHASE_ICONS[phase]} ${PHASE_LABELS[phase]}`],
                  ['Runde', `${roundNumber} / ${totalRounds}`],
                  ['Pot', pot > 0 ? pot.toLocaleString('de-DE') : '—'],
                  ['Blinds', `${config.smallBlind} / ${config.bigBlind}`],
                  ['Aktiv', `${activePlayers.length} Spieler`],
                  ...(currentTurnPlayerId ? [['Am Zug', players.find(p => p.id === currentTurnPlayerId)?.name || '—']] : []),
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-white/20 text-xs">{label}</span>
                    <span className={`text-sm font-semibold ${label === 'Pot' ? 'text-gold font-mono' : 'text-white/70'}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chip ranking */}
          {phase !== GamePhase.LOBBY && (
            <div className="glass rounded-2xl overflow-hidden animate-fade-in">
              <div className="px-5 py-3 border-b border-white/5">
                <h3 className="text-[10px] font-bold text-white/20 tracking-[0.2em]">CHIP-RANKING</h3>
              </div>
              <div className="p-3 space-y-1">
                {sortedByChips.map((p, i) => {
                  const maxChips = sortedByChips[0]?.chips || 1;
                  const barWidth = Math.max(5, (p.chips / maxChips) * 100);
                  return (
                    <div key={p.id} className="relative rounded-lg overflow-hidden">
                      {/* Bar background */}
                      <div
                        className={`absolute inset-y-0 left-0 rounded-lg transition-all duration-500 ${i === 0 ? 'bg-gold/10' : 'bg-white/[0.03]'}`}
                        style={{ width: `${barWidth}%` }}
                      />
                      <div className="relative flex items-center justify-between px-4 py-2">
                        <div className="flex items-center gap-2.5">
                          <span className={`text-xs font-black ${i === 0 ? 'text-gold' : 'text-white/15'}`}>
                            {i + 1}
                          </span>
                          <span className={`text-sm font-medium ${p.isEliminated ? 'text-white/20 line-through' : i === 0 ? 'text-gold' : 'text-white/60'}`}>
                            {p.name}
                          </span>
                        </div>
                        <span className={`font-mono text-xs font-bold ${i === 0 ? 'text-gold' : 'text-white/30'}`}>
                          {p.chips.toLocaleString('de-DE')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
