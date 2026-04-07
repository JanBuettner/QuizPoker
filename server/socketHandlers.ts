import { Server, Socket } from 'socket.io';
import { GameRoom } from './GameRoom.js';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  BettingAction,
} from '../shared/types.js';
import { getAllQuestions } from './QuestionBank.js';
import crypto from 'crypto';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

const rooms = new Map<string, GameRoom>();
const playerRooms = new Map<string, string>(); // socketId -> roomCode
const adminRooms = new Map<string, string>(); // socketId -> roomCode
const rejoinTokens = new Map<string, { roomCode: string; playerId: string; isAdmin?: boolean }>();

function generateRoomCode(): string {
  let code: string;
  do {
    code = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 6);
  } while (rooms.has(code));
  return code;
}

function generateToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

function broadcastState(room: GameRoom, io: TypedServer): void {
  for (const [playerId] of room.players) {
    if (playerId.startsWith('bot_')) continue; // bots don't have sockets
    const state = room.getVisibleState(playerId);
    io.to(playerId).emit('gameState', state);
  }
  // Also send to admin
  if (room.adminId && room.adminConnected) {
    const adminState = room.getAdminState();
    io.to(room.adminId).emit('gameState', adminState);
  }
  // Let bots act with a short delay - debounce to prevent double ticks
  const botKey = `bot_${room.code}`;
  if ((broadcastState as any)[botKey]) clearTimeout((broadcastState as any)[botKey]);
  (broadcastState as any)[botKey] = setTimeout(() => {
    delete (broadcastState as any)[botKey];
    room.tickBots();
  }, 800 + Math.random() * 1200);
}

function getRoomForSocket(socketId: string): { room: GameRoom; roomCode: string; isAdmin: boolean } | null {
  const playerRoom = playerRooms.get(socketId);
  if (playerRoom) {
    const room = rooms.get(playerRoom);
    if (room) return { room, roomCode: playerRoom, isAdmin: false };
  }
  const adminRoom = adminRooms.get(socketId);
  if (adminRoom) {
    const room = rooms.get(adminRoom);
    if (room) return { room, roomCode: adminRoom, isAdmin: true };
  }
  return null;
}

function cleanupRejoinTokens(roomCode: string): void {
  for (const [token, info] of rejoinTokens) {
    if (info.roomCode === roomCode) rejoinTokens.delete(token);
  }
}

function destroyRoom(room: GameRoom, roomCode: string, io: TypedServer): void {
  // Notify all connected players before destroying
  for (const [playerId, player] of room.players) {
    if (!playerId.startsWith('bot_') && player.isConnected) {
      io.to(playerId).emit('roomClosed', { reason: 'Raum wurde geschlossen' });
    }
  }
  if (room.adminId && room.adminConnected) {
    io.to(room.adminId).emit('roomClosed', { reason: 'Raum wurde geschlossen' });
  }
  room.destroy();
  rooms.delete(roomCode);
  cleanupRejoinTokens(roomCode);
  console.log(`Room ${roomCode} destroyed (empty)`);
}

export function setupSocketHandlers(io: TypedServer): void {
  const rateLimits = new Map<string, number[]>(); // socketId -> timestamps

  function checkRateLimit(socketId: string, maxPerSecond: number = 10): boolean {
    const now = Date.now();
    const timestamps = rateLimits.get(socketId) || [];
    const recent = timestamps.filter(t => now - t < 1000);
    if (recent.length >= maxPerSecond) return false;
    recent.push(now);
    rateLimits.set(socketId, recent);
    return true;
  }

  io.on('connection', (socket: TypedSocket) => {
    console.log(`Connected: ${socket.id}`);

    socket.on('createRoom', ({ playerName, asAdmin }) => {
      const code = generateRoomCode();
      const room = new GameRoom(code, {}, () => broadcastState(room, io));
      rooms.set(code, room);

      const token = generateToken();

      if (asAdmin) {
        room.setAdmin(socket.id);
        adminRooms.set(socket.id, code);
        socket.join(socket.id);
        rejoinTokens.set(token, { roomCode: code, playerId: socket.id, isAdmin: true });
        socket.emit('joined', { roomCode: code, playerId: socket.id, token });
        broadcastState(room, io);
      } else {
        const name = (playerName || '').trim().slice(0, 20);
        if (!name) {
          socket.emit('error', { message: 'Name erforderlich' });
          rooms.delete(code);
          return;
        }
        room.addPlayer(socket.id, name, true);
        playerRooms.set(socket.id, code);
        socket.join(socket.id);
        rejoinTokens.set(token, { roomCode: code, playerId: socket.id });
        socket.emit('joined', { roomCode: code, playerId: socket.id, token });
        broadcastState(room, io);
      }
    });

    socket.on('joinRoom', ({ roomCode, playerName }) => {
      const code = roomCode.toUpperCase();
      const room = rooms.get(code);

      if (!room) {
        socket.emit('error', { message: 'Raum nicht gefunden' });
        return;
      }

      if (room.phase !== 'LOBBY') {
        socket.emit('error', { message: 'Spiel läuft bereits' });
        return;
      }

      if (room.players.size >= 8) {
        socket.emit('error', { message: 'Raum ist voll (max. 8 Spieler)' });
        return;
      }

      const name = (playerName || '').trim().slice(0, 20);
      if (!name) {
        socket.emit('error', { message: 'Name erforderlich' });
        return;
      }

      room.addPlayer(socket.id, name, false);
      playerRooms.set(socket.id, code);
      socket.join(socket.id);

      const token = generateToken();
      rejoinTokens.set(token, { roomCode: code, playerId: socket.id });

      socket.emit('joined', { roomCode: code, playerId: socket.id, token });
      broadcastState(room, io);
    });

    socket.on('rejoin', ({ roomCode, token }) => {
      const info = rejoinTokens.get(token);
      if (!info || info.roomCode !== roomCode) {
        socket.emit('error', { message: 'Ungültiger Token' });
        return;
      }

      const room = rooms.get(roomCode);
      if (!room) {
        socket.emit('error', { message: 'Raum nicht mehr vorhanden' });
        return;
      }

      if (info.isAdmin) {
        room.reconnectAdmin(socket.id);
        adminRooms.set(socket.id, roomCode);
        socket.join(socket.id);
        info.playerId = socket.id;
        socket.emit('joined', { roomCode, playerId: socket.id, token });
        broadcastState(room, io);
        return;
      }

      const oldId = info.playerId;
      const player = room.players.get(oldId);
      if (!player) {
        socket.emit('error', { message: 'Spieler nicht gefunden' });
        return;
      }

      room.players.delete(oldId);
      player.id = socket.id;
      player.isConnected = true;
      room.players.set(socket.id, player);
      playerRooms.set(socket.id, roomCode);
      socket.join(socket.id);
      info.playerId = socket.id;

      socket.emit('joined', { roomCode, playerId: socket.id, token });
      broadcastState(room, io);
    });

    socket.on('addBot', () => {
      const info = getRoomForSocket(socket.id);
      if (!info) return;
      const { room, isAdmin } = info;

      if (!isAdmin && !room.players.get(socket.id)?.isHost) {
        socket.emit('error', { message: 'Nur Admin/Host kann Bots hinzufuegen' });
        return;
      }

      const bot = room.addBot();
      if (!bot) {
        socket.emit('error', { message: 'Maximale Spielerzahl erreicht oder Spiel laeuft' });
        return;
      }
      broadcastState(room, io);
    });

    socket.on('removeBot', ({ botId }) => {
      const info = getRoomForSocket(socket.id);
      if (!info) return;
      const { room, isAdmin } = info;

      if (!isAdmin && !room.players.get(socket.id)?.isHost) {
        socket.emit('error', { message: 'Nur Admin/Host kann Bots entfernen' });
        return;
      }

      if (room.removeBot(botId)) {
        broadcastState(room, io);
      }
    });

    socket.on('startGame', () => {
      const info = getRoomForSocket(socket.id);
      if (!info) return;
      const { room, isAdmin } = info;

      // Admin or host can start
      if (isAdmin || room.players.get(socket.id)?.isHost) {
        if (!room.startGame()) {
          socket.emit('error', { message: 'Mindestens 2 Spieler benötigt' });
        }
      } else {
        socket.emit('error', { message: 'Nur Admin/Host kann das Spiel starten' });
      }
    });

    socket.on('advancePhase', () => {
      const info = getRoomForSocket(socket.id);
      if (!info) return;
      if (!info.isAdmin) {
        socket.emit('error', { message: 'Nur der Admin kann Phasen steuern' });
        return;
      }
      info.room.advancePhase();
    });

    socket.on('getQuestions', () => {
      // Only admin can view all questions
      const info = getRoomForSocket(socket.id);
      if (!info?.isAdmin) {
        socket.emit('error', { message: 'Nur der Admin kann Fragen einsehen' });
        return;
      }
      socket.emit('questionList', { questions: getAllQuestions() });
    });

    socket.on('submitEstimate', ({ estimate }) => {
      if (!checkRateLimit(socket.id)) {
        socket.emit('error', { message: 'Zu viele Anfragen' });
        return;
      }

      if (typeof estimate !== 'number' || !isFinite(estimate)) {
        socket.emit('error', { message: 'Ungueltige Schaetzung' });
        return;
      }

      const roomCode = playerRooms.get(socket.id);
      if (!roomCode) return;
      const room = rooms.get(roomCode);
      if (!room) return;

      if (!room.submitEstimate(socket.id, estimate)) {
        socket.emit('error', { message: 'Schätzung konnte nicht abgegeben werden' });
      }
    });

    socket.on('bet', ({ action, amount }) => {
      if (!checkRateLimit(socket.id)) {
        socket.emit('error', { message: 'Zu viele Anfragen' });
        return;
      }

      if (amount !== undefined && (typeof amount !== 'number' || !isFinite(amount) || amount <= 0)) {
        socket.emit('error', { message: 'Ungueltiger Einsatz' });
        return;
      }

      const roomCode = playerRooms.get(socket.id);
      if (!roomCode) return;
      const room = rooms.get(roomCode);
      if (!room) return;

      if (!room.bet(socket.id, action, amount)) {
        socket.emit('error', { message: 'Ungültige Aktion' });
      }
    });

    socket.on('nextRound', () => {
      const info = getRoomForSocket(socket.id);
      if (!info) return;
      const { room, isAdmin } = info;

      // Only admin or host can trigger next round
      if (isAdmin || room.players.get(socket.id)?.isHost) {
        room.triggerNextRound();
      } else {
        socket.emit('error', { message: 'Nur Admin/Host kann die naechste Runde starten' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Disconnected: ${socket.id}`);
      rateLimits.delete(socket.id);

      // Check if admin
      const adminRoom = adminRooms.get(socket.id);
      if (adminRoom) {
        const room = rooms.get(adminRoom);
        if (room) {
          room.disconnectAdmin();
          adminRooms.delete(socket.id);

          // Destroy room only if no players connected either
          const connected = [...room.players.values()].filter(p => p.isConnected);
          if (connected.length === 0) {
            destroyRoom(room, adminRoom, io);
          }
        }
        return;
      }

      // Regular player
      const roomCode = playerRooms.get(socket.id);
      if (!roomCode) return;

      const room = rooms.get(roomCode);
      if (!room) return;

      room.disconnectPlayer(socket.id);
      playerRooms.delete(socket.id);

      const connected = [...room.players.values()].filter(p => p.isConnected);
      if (connected.length === 0 && !room.adminConnected) {
        destroyRoom(room, roomCode, io);
      } else {
        broadcastState(room, io);
      }
    });
  });

  // Clean up inactive rooms every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms) {
      const connected = [...room.players.values()].filter(p => p.isConnected);
      const hasAdmin = room.adminConnected;
      if (connected.length === 0 && !hasAdmin) {
        destroyRoom(room, code, io);
      }
    }
  }, 5 * 60 * 1000);
}
