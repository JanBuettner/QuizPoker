import {
  GamePhase,
  BettingAction,
  Player,
  VisiblePlayer,
  VisibleGameState,
  RoomConfig,
  Question,
  DEFAULT_CONFIG,
} from '../shared/types.js';
import { getShuffledQuestions } from './QuestionBank.js';

export class GameRoom {
  code: string;
  players: Map<string, Player> = new Map();
  phase: GamePhase = GamePhase.LOBBY;
  pot = 0;
  lastPot = 0;
  roundNumber = 0;
  config: RoomConfig;
  currentQuestion: Question | null = null;
  currentTurnIndex = 0;
  currentBetLevel = 0;
  minRaise: number;
  dealerIndex = 0;
  winnerId: string | null = null;
  adminId: string | null = null;
  adminConnected = false;
  private questions: Question[] = [];
  private questionIndex = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private timerEnd = 0;
  private onStateChange: () => void;
  private playerRoundBets: Map<string, number> = new Map();
  private lastRaiserId: string | null = null;
  private actedThisRound: Set<string> = new Set();
  private botCounter = 0;
  private actionLog: string[] = [];
  private static BOT_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Erik', 'Fiona', 'Gustav', 'Hanna'];

  constructor(code: string, config: Partial<RoomConfig> = {}, onStateChange: () => void) {
    this.code = code;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.minRaise = this.config.bigBlind;
    this.onStateChange = onStateChange;
  }

  addPlayer(id: string, name: string, isHost: boolean, avatar: string | null = null): Player {
    const player: Player = {
      id,
      name,
      chips: this.config.startingChips,
      currentEstimate: null,
      hasSubmittedEstimate: false,
      hasFolded: false,
      isEliminated: false,
      isConnected: true,
      currentBet: 0,
      totalBetThisHand: 0,
      isHost,
      isBot: false,
      avatar,
    };
    this.players.set(id, player);
    return player;
  }

  addBot(): Player | null {
    if (this.phase !== GamePhase.LOBBY) return null;
    if (this.players.size >= 8) return null;

    const name = GameRoom.BOT_NAMES[this.botCounter % GameRoom.BOT_NAMES.length];
    this.botCounter++;
    const id = `bot_${this.botCounter}_${Date.now()}`;

    const player: Player = {
      id,
      name: `${name} (Bot)`,
      chips: this.config.startingChips,
      currentEstimate: null,
      hasSubmittedEstimate: false,
      hasFolded: false,
      isEliminated: false,
      isConnected: true,
      currentBet: 0,
      totalBetThisHand: 0,
      isHost: false,
      isBot: true,
      avatar: null,
    };
    this.players.set(id, player);
    return player;
  }

  removeBot(botId: string): boolean {
    if (this.phase !== GamePhase.LOBBY) return false;
    const player = this.players.get(botId);
    if (!player?.isBot) return false;
    this.players.delete(botId);
    return true;
  }

  removePlayer(id: string): void {
    this.players.delete(id);
  }

  setAdmin(id: string): void {
    this.adminId = id;
    this.adminConnected = true;
  }

  disconnectAdmin(): void {
    this.adminConnected = false;
  }

  reconnectAdmin(newId: string): void {
    this.adminId = newId;
    this.adminConnected = true;
  }

  isAdmin(id: string): boolean {
    return this.adminId === id;
  }

  getAdminState(): VisibleGameState {
    const players: VisiblePlayer[] = [...this.players.values()].map(p => ({
      id: p.id,
      name: p.name,
      chips: p.chips,
      hasSubmittedEstimate: p.hasSubmittedEstimate,
      hasFolded: p.hasFolded,
      isEliminated: p.isEliminated,
      isConnected: p.isConnected,
      currentBet: p.currentBet,
      isHost: p.isHost,
      isBot: p.isBot,
      avatar: p.avatar,
      estimate: p.currentEstimate,
    }));

    const currentTurn = this.getCurrentTurnPlayer();

    const showLastPot = this.phase === GamePhase.SHOWDOWN || this.phase === GamePhase.ROUND_END;

    return {
      roomCode: this.code,
      phase: this.phase,
      players,
      pot: showLastPot ? this.lastPot : this.pot,
      currentQuestion: this.currentQuestion?.question ?? null,
      hint: this.currentQuestion?.hint ?? null,
      hint2: this.currentQuestion?.hint2 ?? null,
      actualAnswer: this.currentQuestion?.answer ?? null,
      roundNumber: this.roundNumber,
      totalRounds: this.config.maxRounds,
      currentTurnPlayerId: currentTurn?.id ?? null,
      currentBetLevel: this.currentBetLevel,
      minRaise: this.minRaise,
      yourEstimate: null,
      timeRemaining: this.timerEnd > 0 ? Math.max(0, Math.ceil((this.timerEnd - Date.now()) / 1000)) : 0,
      config: this.config,
      winnerId: this.winnerId,
      dealerIndex: this.dealerIndex,
      isAdmin: true,
      bettingActive: this.timerEnd > 0 || this.actedThisRound.size > 0,
      actionLog: [...this.actionLog],
    };
  }

  disconnectPlayer(id: string): void {
    const player = this.players.get(id);
    if (player) {
      player.isConnected = false;
    }
  }

  reconnectPlayer(id: string): void {
    const player = this.players.get(id);
    if (player) player.isConnected = true;
  }

  private activePlayers(): Player[] {
    return [...this.players.values()].filter(p => !p.isEliminated && !p.hasFolded);
  }

  private nonEliminatedPlayers(): Player[] {
    return [...this.players.values()].filter(p => !p.isEliminated);
  }

  private turnOrder(): Player[] {
    const nePlayers = this.nonEliminatedPlayers();
    if (nePlayers.length === 0) return [];
    const startIdx = (this.dealerIndex + 1) % nePlayers.length;
    return [...nePlayers.slice(startIdx), ...nePlayers.slice(0, startIdx)];
  }

  private bettingOrder(): Player[] {
    return this.turnOrder().filter(p => !p.hasFolded);
  }

  startGame(): boolean {
    if (this.phase !== GamePhase.LOBBY) return false;
    if (this.players.size < 2) return false;

    this.questions = getShuffledQuestions(this.config.difficultyScaling);
    this.questionIndex = 0;
    this.roundNumber = 0;
    this.dealerIndex = 0;

    this.startNewRound();
    return true;
  }

  private startNewRound(): void {
    this.roundNumber++;

    // Auto-increase blinds every N rounds
    if (this.config.blindIncreaseEvery > 0 && this.roundNumber > 1 && (this.roundNumber - 1) % this.config.blindIncreaseEvery === 0) {
      this.config.smallBlind *= 2;
      this.config.bigBlind *= 2;
    }

    this.pot = 0;
    this.winnerId = null;
    this.currentBetLevel = 0;
    this.minRaise = this.config.bigBlind;
    this.playerRoundBets.clear();

    if (this.questionIndex >= this.questions.length) {
      this.questions = getShuffledQuestions(this.config.difficultyScaling);
      this.questionIndex = 0;
    }
    this.currentQuestion = this.questions[this.questionIndex++];

    // Eliminate broke players from previous round
    for (const player of this.players.values()) {
      if (player.chips <= 0 && !player.isEliminated) {
        player.isEliminated = true;
      }
    }

    // Reset player state for new round
    for (const player of this.players.values()) {
      player.currentEstimate = null;
      player.hasSubmittedEstimate = false;
      player.hasFolded = player.isEliminated;
      player.currentBet = 0;
      player.totalBetThisHand = 0;
    }

    this.phase = GamePhase.ESTIMATING;
    this.startTimer(this.config.estimateTimeSec, () => this.onEstimateTimeout());
    this.onStateChange();
  }

  private postBlinds(): void {
    const nePlayers = this.nonEliminatedPlayers().filter(p => !p.hasFolded);
    if (nePlayers.length < 2) return;

    // Heads-up rules: dealer posts SB, other posts BB
    let sbIndex: number;
    let bbIndex: number;
    if (nePlayers.length === 2) {
      sbIndex = this.dealerIndex % nePlayers.length;
      bbIndex = (this.dealerIndex + 1) % nePlayers.length;
    } else {
      sbIndex = (this.dealerIndex + 1) % nePlayers.length;
      bbIndex = (this.dealerIndex + 2) % nePlayers.length;
    }

    const sbPlayer = nePlayers[sbIndex];
    const bbPlayer = nePlayers[bbIndex];

    const sbAmount = Math.min(this.config.smallBlind, sbPlayer.chips);
    sbPlayer.chips -= sbAmount;
    sbPlayer.currentBet = sbAmount;
    sbPlayer.totalBetThisHand += sbAmount;
    this.pot += sbAmount;
    this.playerRoundBets.set(sbPlayer.id, sbAmount);

    const bbAmount = Math.min(this.config.bigBlind, bbPlayer.chips);
    bbPlayer.chips -= bbAmount;
    bbPlayer.currentBet = bbAmount;
    bbPlayer.totalBetThisHand += bbAmount;
    this.pot += bbAmount;
    this.playerRoundBets.set(bbPlayer.id, bbAmount);

    this.currentBetLevel = bbAmount;
  }

  submitEstimate(playerId: string, estimate: number): boolean {
    if (this.phase !== GamePhase.ESTIMATING) return false;
    const player = this.players.get(playerId);
    if (!player || player.isEliminated) return false;
    if (player.hasSubmittedEstimate) return false;

    player.currentEstimate = estimate;
    player.hasSubmittedEstimate = true;

    const waiting = this.nonEliminatedPlayers().filter(p => !p.hasSubmittedEstimate);
    if (waiting.length === 0) {
      this.clearTimer();
      // All estimates in: go to PREFLOP (admin will advance, or auto-advance for non-admin)
      if (this.adminId) {
        // Wait for admin to advance
        this.onStateChange();
      } else {
        this.startPreflop();
      }
    } else {
      this.onStateChange();
    }

    return true;
  }

  private onEstimateTimeout(): void {
    for (const player of this.nonEliminatedPlayers()) {
      if (!player.hasSubmittedEstimate) {
        player.hasFolded = true;
      }
    }
    this.startPreflop();
  }

  // --- Texas Hold'em Phase Methods ---

  private startPreflop(): void {
    this.phase = GamePhase.PREFLOP;
    this.actedThisRound.clear();
    this.lastRaiserId = null;
    this.playerRoundBets.clear();

    // Reset bets and post blinds
    for (const player of this.nonEliminatedPlayers()) {
      player.currentBet = 0;
    }
    this.currentBetLevel = 0;
    this.minRaise = this.config.bigBlind;

    this.postBlinds();

    // First to act is after BB
    const active = this.bettingOrder();
    if (active.length <= 1) {
      this.resolveRound();
      return;
    }

    // Find first player to act (after BB)
    const nePlayers = this.nonEliminatedPlayers().filter(p => !p.hasFolded);
    const bbPlayerIndex = nePlayers.length === 2
      ? (this.dealerIndex + 1) % nePlayers.length
      : (this.dealerIndex + 2) % nePlayers.length;
    const firstToAct = (bbPlayerIndex + 1) % nePlayers.length;

    // Map to nonEliminatedPlayers index
    const allNe = this.nonEliminatedPlayers();
    const firstPlayer = nePlayers[firstToAct];
    if (firstPlayer) {
      this.currentTurnIndex = allNe.findIndex(p => p.id === firstPlayer.id);
    }

    this.onStateChange();
    this.startBetTimer();
  }

  private startFlop(): void {
    this.phase = GamePhase.FLOP;
    this.resetBettingRound();
    this.onStateChange();

    if (this.activePlayers().length <= 1) {
      this.resolveRound();
      return;
    }

    this.startBetTimer();
  }

  private startTurn(): void {
    this.phase = GamePhase.TURN;
    this.resetBettingRound();
    this.onStateChange();

    if (this.activePlayers().length <= 1) {
      this.resolveRound();
      return;
    }

    this.startBetTimer();
  }

  private startRiver(): void {
    this.phase = GamePhase.RIVER;
    this.resetBettingRound();
    this.onStateChange();

    if (this.activePlayers().length <= 1) {
      this.resolveRound();
      return;
    }

    this.startBetTimer();
  }

  private resetBettingRound(): void {
    this.actedThisRound.clear();
    this.lastRaiserId = null;
    this.currentBetLevel = 0;
    this.minRaise = this.config.bigBlind;
    this.playerRoundBets.clear();

    for (const player of this.nonEliminatedPlayers()) {
      player.currentBet = 0;
    }

    const order = this.bettingOrder();
    if (order.length > 0) {
      this.currentTurnIndex = this.nonEliminatedPlayers().findIndex(p => p.id === order[0].id);
    }
  }

  private startBetTimer(): void {
    this.startTimer(this.config.betTimeSec, () => this.onBetTimeout());
  }

  private onBetTimeout(): void {
    const current = this.getCurrentTurnPlayer();
    if (current) {
      this.executeBet(current.id, BettingAction.FOLD);
    }
  }

  getCurrentTurnPlayer(): Player | null {
    const active = this.bettingOrder();
    if (active.length === 0) return null;
    const nePlayers = this.nonEliminatedPlayers();
    if (nePlayers.length === 0) return null;
    const idx = this.currentTurnIndex % nePlayers.length;
    const player = nePlayers[idx];
    // Skip folded, eliminated, AND all-in players (chips === 0)
    if (!player || player.hasFolded || player.isEliminated || player.chips === 0) {
      return this.findNextActivePlayer();
    }
    return player;
  }

  private findNextActivePlayer(): Player | null {
    const nePlayers = this.nonEliminatedPlayers();
    if (nePlayers.length === 0) return null;
    for (let i = 0; i < nePlayers.length; i++) {
      const idx = (this.currentTurnIndex + i) % nePlayers.length;
      const p = nePlayers[idx];
      // Must not be folded AND must have chips to act
      if (!p.hasFolded && p.chips > 0) {
        this.currentTurnIndex = idx;
        return p;
      }
    }
    return null;
  }

  bet(playerId: string, action: BettingAction, amount?: number): boolean {
    if (
      this.phase !== GamePhase.PREFLOP &&
      this.phase !== GamePhase.FLOP &&
      this.phase !== GamePhase.TURN &&
      this.phase !== GamePhase.RIVER
    ) return false;

    const current = this.getCurrentTurnPlayer();
    if (!current || current.id !== playerId) return false;

    return this.executeBet(playerId, action, amount);
  }

  private logAction(msg: string): void {
    this.actionLog.push(msg);
    if (this.actionLog.length > 5) {
      this.actionLog = this.actionLog.slice(-5);
    }
  }

  executeBet(playerId: string, action: BettingAction, amount?: number): boolean {
    const player = this.players.get(playerId)!;

    switch (action) {
      case BettingAction.FOLD:
        this.clearTimer();
        player.hasFolded = true;
        this.logAction(`${player.name} foldet`);
        break;

      case BettingAction.CHECK:
        if (player.currentBet < this.currentBetLevel) {
          return false;
        }
        this.clearTimer();
        this.logAction(`${player.name} checkt`);
        break;

      case BettingAction.CALL: {
        this.clearTimer();
        const toCall = this.currentBetLevel - player.currentBet;
        const actualCall = Math.min(toCall, player.chips);
        player.chips -= actualCall;
        player.currentBet += actualCall;
        player.totalBetThisHand += actualCall;
        this.pot += actualCall;
        const prev = this.playerRoundBets.get(player.id) || 0;
        this.playerRoundBets.set(player.id, prev + actualCall);
        this.logAction(`${player.name} callt ${actualCall}`);
        break;
      }

      case BettingAction.RAISE: {
        const raiseAmount = amount ?? this.config.bigBlind;
        if (raiseAmount < this.minRaise) return false;

        const totalBet = this.currentBetLevel + raiseAmount;
        const needed = totalBet - player.currentBet;

        if (player.chips < needed) return false;

        this.clearTimer();
        player.chips -= needed;
        player.currentBet += needed;
        player.totalBetThisHand += needed;
        this.pot += needed;
        this.currentBetLevel = player.currentBet;
        this.minRaise = raiseAmount;
        this.lastRaiserId = player.id;
        this.actedThisRound.clear();
        const prev = this.playerRoundBets.get(player.id) || 0;
        this.playerRoundBets.set(player.id, prev + needed);
        this.logAction(`${player.name} raist auf ${player.currentBet}`);
        break;
      }

      case BettingAction.ALL_IN: {
        this.clearTimer();
        const allIn = player.chips;
        player.chips = 0;
        player.currentBet += allIn;
        player.totalBetThisHand += allIn;
        this.pot += allIn;
        if (player.currentBet > this.currentBetLevel) {
          const raiseBy = player.currentBet - this.currentBetLevel;
          this.currentBetLevel = player.currentBet;
          this.minRaise = Math.max(this.minRaise, raiseBy);
          this.lastRaiserId = player.id;
          this.actedThisRound.clear();
        }
        const prevA = this.playerRoundBets.get(player.id) || 0;
        this.playerRoundBets.set(player.id, prevA + allIn);
        this.logAction(`${player.name} geht All-In! (${allIn})`);
        break;
      }
    }

    this.actedThisRound.add(playerId);
    this.advanceTurn();
    return true;
  }

  private advanceTurn(): void {
    if (this.activePlayers().length <= 1) {
      this.resolveRound();
      return;
    }

    // Auto-mark all-in players as acted (they can't do anything more)
    for (const p of this.activePlayers()) {
      if (p.chips === 0) this.actedThisRound.add(p.id);
    }

    const allMatched = this.activePlayers().every(
      p => p.currentBet === this.currentBetLevel || p.chips === 0
    );
    const allActed = this.activePlayers().every(p => this.actedThisRound.has(p.id));

    if (allMatched && allActed) {
      this.endBettingRound();
      return;
    }

    const nePlayers = this.nonEliminatedPlayers();
    for (let i = 1; i <= nePlayers.length; i++) {
      const idx = (this.currentTurnIndex + i) % nePlayers.length;
      const p = nePlayers[idx];
      if (!p.hasFolded && p.chips > 0 && (!this.actedThisRound.has(p.id) || p.currentBet < this.currentBetLevel)) {
        this.currentTurnIndex = idx;
        this.startBetTimer();
        this.onStateChange();
        return;
      }
    }

    this.endBettingRound();
  }

  private endBettingRound(): void {
    this.clearTimer();

    if (this.phase === GamePhase.PREFLOP) {
      // PREFLOP -> FLOP (reveal hint1, then betting)
      if (this.adminId) {
        // Set phase to FLOP so admin sees hint1; admin clicks "Weiter" to start betting
        this.phase = GamePhase.FLOP;
        this.resetBettingRound();
        this.onStateChange();
      } else {
        // Auto-advance: 3s delay to show hint1 before betting starts
        this.phase = GamePhase.FLOP;
        this.resetBettingRound();
        this.onStateChange();
        this.startTimer(3, () => {
          if (this.activePlayers().length <= 1) {
            this.resolveRound();
            return;
          }
          this.startBetTimer();
          this.onStateChange();
        });
      }
    } else if (this.phase === GamePhase.FLOP) {
      // FLOP -> TURN (reveal hint2, then betting)
      if (this.adminId) {
        this.phase = GamePhase.TURN;
        this.resetBettingRound();
        this.onStateChange();
      } else {
        this.phase = GamePhase.TURN;
        this.resetBettingRound();
        this.onStateChange();
        this.startTimer(3, () => {
          if (this.activePlayers().length <= 1) {
            this.resolveRound();
            return;
          }
          this.startBetTimer();
          this.onStateChange();
        });
      }
    } else if (this.phase === GamePhase.TURN) {
      // TURN -> RIVER (reveal answer, then betting)
      if (this.adminId) {
        this.phase = GamePhase.RIVER;
        this.resetBettingRound();
        this.onStateChange();
      } else {
        this.phase = GamePhase.RIVER;
        this.resetBettingRound();
        this.onStateChange();
        this.startTimer(3, () => {
          if (this.activePlayers().length <= 1) {
            this.resolveRound();
            return;
          }
          this.startBetTimer();
          this.onStateChange();
        });
      }
    } else if (this.phase === GamePhase.RIVER) {
      // RIVER -> resolve
      this.resolveRound();
    }
  }

  private resolveRound(): void {
    this.clearTimer();
    this.phase = GamePhase.SHOWDOWN;

    this.lastPot = this.pot;

    // Get all players who contributed to the pot (folded or not)
    const contributors = this.nonEliminatedPlayers().filter(p => p.totalBetThisHand > 0);
    const active = this.activePlayers(); // not folded, not eliminated

    if (contributors.length === 0) {
      // No one bet anything (shouldn't happen) - just clear
      this.pot = 0;
      this.onStateChange();
      if (!this.adminId) this.startTimer(8, () => this.checkGameOver());
      return;
    }

    if (active.length === 0) {
      // Everyone folded - give pot to last folded player (or first contributor)
      this.winnerId = contributors[0].id;
      contributors[0].chips += this.pot;
      this.pot = 0;
      this.onStateChange();
      if (!this.adminId) this.startTimer(8, () => this.checkGameOver());
      return;
    }

    if (active.length === 1) {
      // Only one active player left - they win the whole pot
      this.winnerId = active[0].id;
      active[0].chips += this.pot;
      this.pot = 0;
      this.onStateChange();
      if (!this.adminId) this.startTimer(8, () => this.checkGameOver());
      return;
    }

    // === SIDE POT CALCULATION ===
    // Build side pots based on total contributions per player
    const answer = this.currentQuestion!.answer;

    // Get unique bet levels (sorted ascending)
    const uniqueBets = [...new Set(contributors.map(p => p.totalBetThisHand))].sort((a, b) => a - b);

    type SidePot = { amount: number; eligiblePlayers: Player[] };
    const sidePots: SidePot[] = [];
    let previousLevel = 0;

    for (const level of uniqueBets) {
      const layerSize = level - previousLevel;
      // Everyone who contributed at least this much pays into this layer
      const contributorsAtLevel = contributors.filter(p => p.totalBetThisHand >= level);
      const potAmount = layerSize * contributorsAtLevel.length;
      // Only non-folded players are eligible to win this pot
      const eligible = contributorsAtLevel.filter(p => !p.hasFolded);
      if (potAmount > 0 && eligible.length > 0) {
        sidePots.push({ amount: potAmount, eligiblePlayers: eligible });
      }
      previousLevel = level;
    }

    // Award each side pot to the best estimator among eligible players
    let mainWinner: Player | null = null;
    for (const sidePot of sidePots) {
      const ranked = [...sidePot.eligiblePlayers]
        .filter(p => p.currentEstimate !== null)
        .sort((a, b) => Math.abs(a.currentEstimate! - answer) - Math.abs(b.currentEstimate! - answer));

      if (ranked.length === 0) {
        // Fallback: give to first eligible
        sidePot.eligiblePlayers[0].chips += sidePot.amount;
        continue;
      }

      const bestDiff = Math.abs(ranked[0].currentEstimate! - answer);
      const winners = ranked.filter(p => Math.abs(p.currentEstimate! - answer) === bestDiff);

      // The winner of the largest (main) side pot is shown as the round winner
      if (!mainWinner) mainWinner = winners[0];

      if (winners.length === 1) {
        winners[0].chips += sidePot.amount;
      } else {
        // Split this side pot among tied winners
        const share = Math.floor(sidePot.amount / winners.length);
        const remainder = sidePot.amount - share * winners.length;
        for (let i = 0; i < winners.length; i++) {
          winners[i].chips += share + (i === 0 ? remainder : 0);
        }
      }
    }

    this.winnerId = mainWinner?.id ?? null;
    this.pot = 0;
    this.onStateChange();

    if (!this.adminId) {
      this.startTimer(8, () => this.checkGameOver());
    }
  }

  private checkGameOver(): void {
    // Eliminate broke players
    for (const player of this.players.values()) {
      if (player.chips <= 0 && !player.isEliminated) {
        player.isEliminated = true;
      }
    }

    const alive = this.nonEliminatedPlayers();

    if (alive.length <= 1) {
      this.phase = GamePhase.GAME_OVER;

      let maxChips = -1;
      for (const player of this.players.values()) {
        if (player.chips > maxChips) {
          maxChips = player.chips;
          this.winnerId = player.id;
        }
      }

      this.onStateChange();
    } else {
      this.dealerIndex = (this.dealerIndex % alive.length + 1) % alive.length;
      this.phase = GamePhase.ROUND_END;
      this.onStateChange();
    }
  }

  triggerNextRound(): void {
    if (this.phase === GamePhase.ROUND_END) {
      this.startNewRound();
    }
  }

  advancePhase(): void {
    this.clearTimer();
    switch (this.phase) {
      case GamePhase.ESTIMATING:
        for (const player of this.nonEliminatedPlayers()) {
          if (!player.hasSubmittedEstimate) {
            player.hasFolded = true;
          }
        }
        this.startPreflop();
        break;
      case GamePhase.PREFLOP:
        // End preflop betting → show flop (hint1 revealed, wait for next advance)
        this.endBettingRound();
        break;
      case GamePhase.FLOP:
        // Two states: just revealed (no betting yet) or betting active
        // If no one has acted yet, start betting. Otherwise end betting round.
        if (this.actedThisRound.size === 0) {
          // Start betting for FLOP
          if (this.activePlayers().length <= 1) { this.resolveRound(); return; }
          this.startBetTimer();
          this.onStateChange();
        } else {
          this.endBettingRound();
        }
        break;
      case GamePhase.TURN:
        if (this.actedThisRound.size === 0) {
          if (this.activePlayers().length <= 1) { this.resolveRound(); return; }
          this.startBetTimer();
          this.onStateChange();
        } else {
          this.endBettingRound();
        }
        break;
      case GamePhase.RIVER:
        if (this.actedThisRound.size === 0) {
          if (this.activePlayers().length <= 1) { this.resolveRound(); return; }
          this.startBetTimer();
          this.onStateChange();
        } else {
          this.resolveRound();
        }
        break;
      case GamePhase.SHOWDOWN:
        this.checkGameOver();
        break;
      case GamePhase.ROUND_END:
        this.startNewRound();
        break;
    }
  }

  getVisibleState(forPlayerId: string): VisibleGameState {
    const players: VisiblePlayer[] = [...this.players.values()].map(p => ({
      id: p.id,
      name: p.name,
      chips: p.chips,
      hasSubmittedEstimate: p.hasSubmittedEstimate,
      hasFolded: p.hasFolded,
      isEliminated: p.isEliminated,
      isConnected: p.isConnected,
      currentBet: p.currentBet,
      isHost: p.isHost,
      isBot: p.isBot,
      avatar: p.avatar,
      estimate:
        this.phase === GamePhase.SHOWDOWN || this.phase === GamePhase.ROUND_END || this.phase === GamePhase.GAME_OVER
          ? p.currentEstimate
          : null,
    }));

    const currentPlayer = this.players.get(forPlayerId);
    const currentTurn = this.getCurrentTurnPlayer();

    // hint (hint1) visible from FLOP onwards
    const hintVisible =
      this.phase === GamePhase.FLOP ||
      this.phase === GamePhase.TURN ||
      this.phase === GamePhase.RIVER ||
      this.phase === GamePhase.SHOWDOWN ||
      this.phase === GamePhase.ROUND_END ||
      this.phase === GamePhase.GAME_OVER;

    // hint2 visible from TURN onwards
    const hint2Visible =
      this.phase === GamePhase.TURN ||
      this.phase === GamePhase.RIVER ||
      this.phase === GamePhase.SHOWDOWN ||
      this.phase === GamePhase.ROUND_END ||
      this.phase === GamePhase.GAME_OVER;

    // actualAnswer visible from RIVER onwards
    const answerVisible =
      this.phase === GamePhase.RIVER ||
      this.phase === GamePhase.SHOWDOWN ||
      this.phase === GamePhase.ROUND_END ||
      this.phase === GamePhase.GAME_OVER;

    const showLastPot = this.phase === GamePhase.SHOWDOWN || this.phase === GamePhase.ROUND_END;

    return {
      roomCode: this.code,
      phase: this.phase,
      players,
      pot: showLastPot ? this.lastPot : this.pot,
      currentQuestion: this.currentQuestion?.question ?? null,
      hint: hintVisible ? (this.currentQuestion?.hint ?? null) : null,
      hint2: hint2Visible ? (this.currentQuestion?.hint2 ?? null) : null,
      actualAnswer: answerVisible ? (this.currentQuestion?.answer ?? null) : null,
      roundNumber: this.roundNumber,
      totalRounds: this.config.maxRounds,
      currentTurnPlayerId: currentTurn?.id ?? null,
      currentBetLevel: this.currentBetLevel,
      minRaise: this.minRaise,
      yourEstimate: currentPlayer?.currentEstimate ?? null,
      timeRemaining: this.timerEnd > 0 ? Math.max(0, Math.ceil((this.timerEnd - Date.now()) / 1000)) : 0,
      config: this.config,
      winnerId: this.winnerId,
      dealerIndex: this.dealerIndex,
      bettingActive: this.timerEnd > 0 || this.actedThisRound.size > 0,
      actionLog: [...this.actionLog],
    };
  }

  private startTimer(seconds: number, callback: () => void): void {
    this.clearTimer();
    this.timerEnd = Date.now() + seconds * 1000;
    this.timer = setTimeout(callback, seconds * 1000);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.timerEnd = 0;
  }

  // --- Bot AI ---

  tickBots(): void {
    if (this.phase === GamePhase.ESTIMATING) {
      this.botEstimate();
    } else if (
      this.phase === GamePhase.PREFLOP ||
      this.phase === GamePhase.FLOP ||
      this.phase === GamePhase.TURN ||
      this.phase === GamePhase.RIVER
    ) {
      // Don't let bots bet during admin hint-reveal pause
      // (when admin is present and betting hasn't started yet for FLOP/TURN/RIVER)
      if (this.adminId && this.phase !== GamePhase.PREFLOP && this.actedThisRound.size === 0 && this.timerEnd === 0) {
        return;
      }
      this.botBet();
    }
  }

  private botEstimate(): void {
    if (!this.currentQuestion) return;
    const answer = this.currentQuestion.answer;

    for (const player of this.nonEliminatedPlayers()) {
      if (!player.isBot || player.hasSubmittedEstimate) continue;

      const deviation = 0.1 + Math.random() * 0.4;
      const direction = Math.random() > 0.5 ? 1 : -1;
      const estimate = Math.round(answer * (1 + direction * deviation));
      this.submitEstimate(player.id, Math.max(0, estimate));
    }
  }

  private botBet(): void {
    const current = this.getCurrentTurnPlayer();
    if (!current?.isBot) return;

    const toCall = this.currentBetLevel - current.currentBet;
    const answer = this.currentQuestion?.answer || 0;
    const diff = current.currentEstimate !== null ? Math.abs(current.currentEstimate - answer) : Infinity;

    const relativeError = answer > 0 ? diff / answer : 1;
    const confidence = Math.max(0, 1 - relativeError);
    const roll = Math.random();

    // Helper: try action, fall back to simpler action if it fails
    const tryBet = (action: BettingAction, amount?: number): boolean => {
      return this.executeBet(current.id, action, amount);
    };

    if (toCall === 0) {
      if (confidence > 0.7 && roll > 0.6 && current.chips > this.minRaise) {
        const raiseAmt = this.minRaise * (1 + Math.floor(Math.random() * 3));
        if (!tryBet(BettingAction.RAISE, raiseAmt)) {
          tryBet(BettingAction.CHECK); // fallback
        }
      } else {
        tryBet(BettingAction.CHECK);
      }
    } else if (toCall >= current.chips) {
      if (confidence > 0.7 && roll > 0.5) {
        tryBet(BettingAction.ALL_IN);
      } else {
        tryBet(BettingAction.FOLD);
      }
    } else {
      if (confidence > 0.7 && roll > 0.7 && current.chips > toCall + this.minRaise) {
        const raiseAmt = this.minRaise * (1 + Math.floor(Math.random() * 2));
        if (!tryBet(BettingAction.RAISE, raiseAmt)) {
          tryBet(BettingAction.CALL); // fallback
        }
      } else if (confidence > 0.4 && roll > 0.4) {
        tryBet(BettingAction.CALL);
      } else {
        tryBet(BettingAction.FOLD);
      }
    }
  }

  destroy(): void {
    this.clearTimer();
  }
}
