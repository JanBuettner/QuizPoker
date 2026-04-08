import { useState, useEffect, useCallback, useRef } from 'react';
import { socket } from '../socket';
import type { VisibleGameState, Question } from '@shared/types';

interface ConnectionState {
  roomCode: string | null;
  playerId: string | null;
  token: string | null;
  error: string | null;
  gameState: VisibleGameState | null;
}

export function useGameState() {
  const [state, setState] = useState<ConnectionState>({
    roomCode: null,
    playerId: null,
    token: null,
    error: null,
    gameState: null,
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [emotes, setEmotes] = useState<Map<string, string>>(new Map());
  const roomCodeRef = useRef<string | null>(null);

  useEffect(() => {
    roomCodeRef.current = state.roomCode;
  }, [state.roomCode]);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    socket.on('joined', ({ roomCode, playerId, token }) => {
      setState(prev => ({ ...prev, roomCode, playerId, token, error: null }));
      localStorage.setItem('qp_token', token);
      localStorage.setItem('qp_room', roomCode);
    });

    socket.on('gameState', (gameState) => {
      setState(prev => ({ ...prev, gameState, error: null }));
    });

    socket.on('error', ({ message }) => {
      setState(prev => ({ ...prev, error: message }));
      setTimeout(() => setState(prev => ({ ...prev, error: null })), 4000);
    });

    socket.on('questionList', ({ questions }) => {
      setQuestions(questions);
    });

    socket.on('emote', ({ playerId, emote }) => {
      setEmotes(prev => {
        const next = new Map(prev);
        next.set(playerId, emote);
        return next;
      });
      setTimeout(() => {
        setEmotes(prev => {
          const next = new Map(prev);
          if (next.get(playerId) === emote) next.delete(playerId);
          return next;
        });
      }, 3000);
    });

    socket.on('roomClosed', () => {
      setState({ roomCode: null, playerId: null, token: null, error: 'Raum wurde geschlossen', gameState: null });
      localStorage.removeItem('qp_token');
      localStorage.removeItem('qp_room');
    });

    // Try to rejoin on reconnect
    socket.on('connect', () => {
      const token = localStorage.getItem('qp_token');
      const room = localStorage.getItem('qp_room');
      if (token && room && !roomCodeRef.current) {
        socket.emit('rejoin', { roomCode: room, token });
      }
    });

    return () => {
      socket.off('joined');
      socket.off('gameState');
      socket.off('error');
      socket.off('questionList');
      socket.off('emote');
      socket.off('roomClosed');
      socket.off('connect');
    };
  }, []);

  const createRoom = useCallback((playerName: string, avatar?: string) => {
    socket.emit('createRoom', { playerName, avatar });
  }, []);

  const createRoomAsAdmin = useCallback(() => {
    socket.emit('createRoom', { playerName: 'Admin', asAdmin: true });
  }, []);

  const joinRoom = useCallback((roomCode: string, playerName: string, avatar?: string) => {
    socket.emit('joinRoom', { roomCode, playerName, avatar });
  }, []);

  const addBot = useCallback(() => {
    socket.emit('addBot');
  }, []);

  const removeBot = useCallback((botId: string) => {
    socket.emit('removeBot', { botId });
  }, []);

  const startGame = useCallback(() => {
    socket.emit('startGame');
  }, []);

  const advancePhase = useCallback(() => {
    socket.emit('advancePhase');
  }, []);

  const updateConfig = useCallback((data: Record<string, any>) => {
    socket.emit('updateConfig', data);
  }, []);

  const setBlinds = useCallback((smallBlind: number, bigBlind: number) => {
    socket.emit('setBlinds', { smallBlind, bigBlind });
  }, []);

  const submitEstimate = useCallback((estimate: number) => {
    socket.emit('submitEstimate', { estimate });
  }, []);

  const bet = useCallback((action: string, amount?: number) => {
    socket.emit('bet', { action: action as any, amount });
  }, []);

  const nextRound = useCallback(() => {
    socket.emit('nextRound');
  }, []);

  const sendEmote = useCallback((emote: string) => {
    socket.emit('sendEmote', { emote });
  }, []);

  const loadQuestions = useCallback(() => {
    socket.emit('getQuestions');
  }, []);

  const leaveRoom = useCallback(() => {
    localStorage.removeItem('qp_token');
    localStorage.removeItem('qp_room');
    setState({ roomCode: null, playerId: null, token: null, error: null, gameState: null });
    socket.disconnect();
    socket.connect();
  }, []);

  const isAdmin = state.gameState?.isAdmin || false;

  return {
    ...state,
    isAdmin,
    createRoom,
    createRoomAsAdmin,
    joinRoom,
    addBot,
    removeBot,
    startGame,
    advancePhase,
    setBlinds,
    updateConfig,
    submitEstimate,
    bet,
    nextRound,
    leaveRoom,
    emotes,
    sendEmote,
    questions,
    loadQuestions,
  };
}
