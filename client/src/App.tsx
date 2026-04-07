import { useGameState } from './hooks/useGameState';
import Home from './pages/Home';
import GameRoom from './pages/GameRoom';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  const game = useGameState();

  if (!game.roomCode || !game.gameState) {
    return <Home
      onCreateRoom={game.createRoom}
      onCreateRoomAsAdmin={game.createRoomAsAdmin}
      onJoinRoom={game.joinRoom}
      error={game.error}
    />;
  }

  if (game.isAdmin) {
    return <AdminDashboard
      gameState={game.gameState}
      onStartGame={game.startGame}
      onNextRound={game.nextRound}
      onAdvancePhase={game.advancePhase}
      onAddBot={game.addBot}
      onRemoveBot={game.removeBot}
      onLeave={game.leaveRoom}
      error={game.error}
      questions={game.questions}
      onLoadQuestions={game.loadQuestions}
    />;
  }

  return <GameRoom
    gameState={game.gameState}
    playerId={game.playerId!}
    onStartGame={game.startGame}
    onSubmitEstimate={game.submitEstimate}
    onBet={game.bet}
    onNextRound={game.nextRound}
    onLeave={game.leaveRoom}
    error={game.error}
  />;
}
