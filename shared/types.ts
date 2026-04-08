export enum GamePhase {
  LOBBY = 'LOBBY',
  ESTIMATING = 'ESTIMATING',
  PREFLOP = 'PREFLOP',
  FLOP = 'FLOP',
  TURN = 'TURN',
  RIVER = 'RIVER',
  SHOWDOWN = 'SHOWDOWN',
  ROUND_END = 'ROUND_END',
  GAME_OVER = 'GAME_OVER',
}

export enum BettingAction {
  CALL = 'CALL',
  RAISE = 'RAISE',
  FOLD = 'FOLD',
  CHECK = 'CHECK',
  ALL_IN = 'ALL_IN',
}

export interface Player {
  id: string;
  name: string;
  chips: number;
  currentEstimate: number | null;
  hasSubmittedEstimate: boolean;
  hasFolded: boolean;
  isEliminated: boolean;
  isConnected: boolean;
  currentBet: number;
  totalBetThisHand: number;
  isHost: boolean;
  isBot: boolean;
  avatar: string | null;
}

export interface VisiblePlayer {
  id: string;
  name: string;
  chips: number;
  hasSubmittedEstimate: boolean;
  hasFolded: boolean;
  isEliminated: boolean;
  isConnected: boolean;
  currentBet: number;
  isHost: boolean;
  isBot: boolean;
  avatar: string | null;
  estimate: number | null;
}

export interface Question {
  id: number;
  question: string;
  answer: number;
  hint: string;
  hint2: string;
  category: string;
  difficulty: number;
}

export interface RoomConfig {
  maxRounds: number;
  startingChips: number;
  estimateTimeSec: number;
  betTimeSec: number;
  smallBlind: number;
  bigBlind: number;
  blindIncreaseEvery: number; // rounds between blind doubles (0 = manual only)
  difficultyScaling: boolean; // true = easy→hard, false = random
}

export interface VisibleGameState {
  roomCode: string;
  phase: GamePhase;
  players: VisiblePlayer[];
  pot: number;
  currentQuestion: string | null;
  hint: string | null;
  hint2: string | null;
  actualAnswer: number | null; // only during showdown
  roundNumber: number;
  totalRounds: number;
  currentTurnPlayerId: string | null;
  currentBetLevel: number;
  minRaise: number;
  yourEstimate: number | null;
  timeRemaining: number;
  config: RoomConfig;
  winnerId: string | null;
  bettingActive: boolean;
  dealerIndex: number;
  isAdmin?: boolean;
  actionLog: string[]; // last 5 actions like "Max raist auf 200", "Lisa foldet"
}

// Socket events
export interface ClientToServerEvents {
  createRoom: (data: { playerName: string; asAdmin?: boolean; avatar?: string }) => void;
  joinRoom: (data: { roomCode: string; playerName: string; avatar?: string }) => void;
  addBot: () => void;
  removeBot: (data: { botId: string }) => void;
  startGame: () => void;
  advancePhase: () => void;
  setBlinds: (data: { smallBlind: number; bigBlind: number }) => void;
  updateConfig: (data: Partial<RoomConfig>) => void;
  submitEstimate: (data: { estimate: number }) => void;
  bet: (data: { action: BettingAction; amount?: number }) => void;
  nextRound: () => void;
  rejoin: (data: { roomCode: string; token: string }) => void;
  getQuestions: () => void;
  sendEmote: (data: { emote: string }) => void;
}

export interface ServerToClientEvents {
  gameState: (state: VisibleGameState) => void;
  joined: (data: { roomCode: string; playerId: string; token: string }) => void;
  error: (data: { message: string }) => void;
  questionList: (data: { questions: Question[] }) => void;
  roomClosed: (data?: { reason?: string }) => void;
  emote: (data: { playerId: string; emote: string }) => void;
}

export const DEFAULT_CONFIG: RoomConfig = {
  maxRounds: 10,
  startingChips: 1000,
  estimateTimeSec: 45,
  betTimeSec: 30,
  smallBlind: 10,
  bigBlind: 20,
  blindIncreaseEvery: 5,
  difficultyScaling: true,
};
