import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { loadQuestions } from './QuestionBank.js';
import { setupSocketHandlers } from './socketHandlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1491207085646413984';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';

const app = express();
app.use(express.json());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173',
  },
});

// Discord OAuth token exchange
app.post('/api/discord/token', async (req, res) => {
  const { code } = req.body;
  if (!code) {
    res.status(400).json({ error: 'Code required' });
    return;
  }

  try {
    const response = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Discord token exchange failed:', text);
      res.status(response.status).json({ error: 'Token exchange failed' });
      return;
    }

    const data = await response.json();
    res.json({ access_token: data.access_token });
  } catch (err) {
    console.error('Discord token exchange error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Serve static files
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
  io.emit('roomClosed', { reason: 'Server wird neu gestartet' });
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
