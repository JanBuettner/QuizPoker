import { useState } from 'react';
import { GamePhase } from '@shared/types';
import type { VisibleGameState, Question } from '@shared/types';
import PlayerSeat from '../components/PlayerSeat';
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

const ADVANCE_LABELS: Partial<Record<GamePhase, string>> = {
  [GamePhase.ESTIMATING]: 'Weiter -> Hinweis 1',
  [GamePhase.HINT_1]: 'Weiter -> Setzrunde 1',
  [GamePhase.BETTING_1]: 'Weiter -> Hinweis 2',
  [GamePhase.HINT_2]: 'Weiter -> Setzrunde 2',
  [GamePhase.BETTING_2]: 'Weiter -> Antwort zeigen',
  [GamePhase.REVEAL]: 'Weiter -> Setzrunde 3',
  [GamePhase.BETTING_3]: 'Weiter -> Showdown',
  [GamePhase.SHOWDOWN]: 'Weiter -> Ergebnis',
  [GamePhase.ROUND_END]: 'Naechste Runde starten',
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

export default function AdminDashboard({ gameState, onStartGame, onNextRound, onAdvancePhase, onAddBot, onRemoveBot, onLeave, error, questions, onLoadQuestions }: AdminDashboardProps) {
  const [showQuestions, setShowQuestions] = useState(false);
  const [showPlayers, setShowPlayers] = useState(false);
  const [copiedHeader, setCopiedHeader] = useState(false);
  const [copiedLobby, setCopiedLobby] = useState(false);
  const { phase, players, pot, roomCode, roundNumber, totalRounds, currentQuestion, hint, hint2, actualAnswer, winnerId, currentTurnPlayerId } = gameState;

  const showBadges = phase !== GamePhase.LOBBY;
  const { dealerId, sbId, bbId } = showBadges ? computePositions(players, gameState.dealerIndex) : { dealerId: null, sbId: null, bbId: null };
  const isBettingPhase = phase === GamePhase.BETTING_1 || phase === GamePhase.BETTING_2 || phase === GamePhase.BETTING_3;
  const isShowdown = phase === GamePhase.SHOWDOWN || phase === GamePhase.ROUND_END;
  const showTable = phase !== GamePhase.LOBBY && phase !== GamePhase.GAME_OVER;

  // Build community cards
  const communityCards: { label: string; content: string; type: 'hint' | 'answer' }[] = [];
  if (hint && phase !== GamePhase.ESTIMATING) {
    communityCards.push({ label: 'HINWEIS 1', content: hint, type: 'hint' });
  }
  if (hint2 && (phase === GamePhase.HINT_2 || phase === GamePhase.BETTING_2 || phase === GamePhase.REVEAL || phase === GamePhase.BETTING_3 || isShowdown)) {
    communityCards.push({ label: 'HINWEIS 2', content: hint2, type: 'hint' });
  }
  if (actualAnswer !== null && (phase === GamePhase.BETTING_3 || phase === GamePhase.REVEAL || isShowdown)) {
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
                <span className="text-white/20 text-xs font-mono hidden sm:inline">R{roundNumber}/{totalRounds}</span>
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

        {/* Admin advance button - floating at top */}
        {ADVANCE_LABELS[phase] && (
          <div className="w-full max-w-xl mb-3">
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
              <div className="text-white/20 text-[9px] font-bold tracking-[0.15em] mb-2">SCHAETZUNGEN DER SPIELER</div>
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
            <div className="relative w-full max-w-4xl mx-auto aspect-[16/9] min-h-[320px]">
              {/* Table felt */}
              <div className="poker-table-felt absolute inset-6 sm:inset-8 rounded-[50%] bg-gradient-to-b from-emerald-800 via-emerald-800 to-emerald-900 border-[8px] border-amber-900/80 shadow-[inset_0_0_60px_rgba(0,0,0,0.5),0_0_30px_rgba(0,0,0,0.3)]">
                <div className="absolute -inset-3 rounded-[50%] border-4 border-amber-800/30 pointer-events-none" />
                <div className="absolute -inset-1 rounded-[50%] border border-amber-700/15 pointer-events-none" />

                {/* Center content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 gap-2">

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

                  {/* Community cards */}
                  {communityCards.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap justify-center mt-1">
                      {communityCards.map((card, i) => (
                        <div
                          key={card.label}
                          className={`poker-card animate-card-deal ${card.type === 'answer' ? 'poker-card-gold' : ''}`}
                          style={{ animationDelay: `${i * 150}ms` }}
                        >
                          <div className={`text-[8px] font-bold tracking-wider mb-0.5 ${card.type === 'answer' ? 'text-amber-600' : 'text-purple-500/60'}`}>
                            {card.label}
                          </div>
                          <div className={`text-[11px] font-semibold leading-tight ${card.type === 'answer' ? 'text-amber-800 font-black text-sm' : 'text-gray-700'}`}>
                            {card.content}
                          </div>
                        </div>
                      ))}
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

              {/* Player seats around the oval */}
              {players.map((player, i) => {
                const angle = (i / players.length) * 2 * Math.PI - Math.PI / 2;
                const rx = 47;
                const ry = 45;
                const x = 50 + rx * Math.cos(angle);
                const y = 50 + ry * Math.sin(angle);
                return (
                  <div
                    key={player.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                    style={{ left: `${x}%`, top: `${y}%` }}
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
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* === SHOWDOWN with poker table === */}
        {isShowdown && (
          <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-4">
            {/* Mini poker table with estimates */}
            <div className="relative w-full max-w-4xl mx-auto aspect-[16/7] min-h-[220px] hidden sm:block">
              <div className="poker-table-felt absolute inset-6 rounded-[50%] bg-gradient-to-b from-emerald-800 to-emerald-900 border-[8px] border-amber-900/80 shadow-[inset_0_0_60px_rgba(0,0,0,0.5),0_0_30px_rgba(0,0,0,0.3)]">
                <div className="absolute -inset-3 rounded-[50%] border-4 border-amber-800/30 pointer-events-none" />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {actualAnswer !== null && (
                    <div className="poker-card-gold animate-fade-in-scale !max-w-[140px] text-center">
                      <div className="text-[9px] font-bold tracking-wider text-amber-600 mb-0.5">ANTWORT</div>
                      <div className="text-xl font-black text-amber-800 font-mono">{actualAnswer.toLocaleString('de-DE')}</div>
                    </div>
                  )}
                </div>
              </div>
              {players.map((player, i) => {
                const angle = (i / players.length) * 2 * Math.PI - Math.PI / 2;
                const rx = 47;
                const ry = 44;
                const x = 50 + rx * Math.cos(angle);
                const y = 50 + ry * Math.sin(angle);
                return (
                  <div
                    key={player.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                    style={{ left: `${x}%`, top: `${y}%` }}
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
                    />
                  </div>
                );
              })}
            </div>

            <Showdown gameState={gameState} playerId="" onNextRound={onNextRound} isHost={true} />
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
              <button onClick={onLeave} className="btn-gold py-3 px-10 text-lg">Zurueck</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
