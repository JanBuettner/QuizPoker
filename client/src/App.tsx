import { useState, useEffect } from 'react';
import { useGameState } from './hooks/useGameState';
import { initDiscord, isDiscordEmbed, type DiscordUser } from './discord';
import Home from './pages/Home';
import GameRoom from './pages/GameRoom';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  const game = useGameState();
  const [discordUser, setDiscordUser] = useState<DiscordUser | null>(null);
  const [discordLoading, setDiscordLoading] = useState(isDiscordEmbed);

  // Initialize Discord SDK if running inside Discord
  useEffect(() => {
    if (!isDiscordEmbed) return;

    initDiscord().then(user => {
      setDiscordUser(user);
      setDiscordLoading(false);
    }).catch(() => {
      setDiscordLoading(false);
    });
  }, []);

  if (discordLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="text-5xl mb-4">🃏</div>
          <h1 className="text-3xl font-black mb-2">
            <span className="text-gold">Quiz</span>Poker
          </h1>
          <p className="text-white/30">Verbinde mit Discord...</p>
        </div>
      </div>
    );
  }

  if (!game.roomCode || !game.gameState) {
    return <Home
      onCreateRoom={game.createRoom}
      onCreateRoomAsAdmin={game.createRoomAsAdmin}
      onJoinRoom={game.joinRoom}
      error={game.error}
      discordUser={discordUser}
    />;
  }

  if (game.isAdmin) {
    return <AdminDashboard
      gameState={game.gameState}
      onStartGame={game.startGame}
      onNextRound={game.nextRound}
      onAdvancePhase={game.advancePhase}
      onSetBlinds={game.setBlinds}
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
    onAddBot={game.addBot}
    onRemoveBot={game.removeBot}
    onLeave={game.leaveRoom}
    error={game.error}
  />;
}
