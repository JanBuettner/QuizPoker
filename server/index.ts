import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { loadQuestions } from './QuestionBank.js';
import { setupSocketHandlers } from './socketHandlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173',
  },
});

// Serve static files in production
const clientDist = join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('/{*path}', (_req, res) => {
  res.sendFile(join(clientDist, 'index.html'));
});

// Load questions
loadQuestions();

// Setup socket handlers
setupSocketHandlers(io as any);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`QuizPoker server running on http://localhost:${PORT}`);
});

function gracefulShutdown() {
  console.log('Shutting down gracefully...');
  // Close all rooms
  io.emit('roomClosed', { reason: 'Server wird neu gestartet' });
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  // Force close after 5s
  setTimeout(() => process.exit(1), 5000);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
