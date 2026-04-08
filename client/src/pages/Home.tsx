import { useState, useEffect } from 'react';
import type { DiscordUser } from '../discord';

interface HomeProps {
  onCreateRoom: (name: string) => void;
  onCreateRoomAsAdmin: () => void;
  onJoinRoom: (code: string, name: string) => void;
  error: string | null;
  discordUser?: DiscordUser | null;
}

export default function Home({ onCreateRoom, onCreateRoomAsAdmin, onJoinRoom, error, discordUser }: HomeProps) {
  const [name, setName] = useState(discordUser?.globalName || discordUser?.username || '');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');

  const handleCreate = () => {
    if (name.trim().length < 1) return;
    onCreateRoom(name.trim());
  };

  const handleJoin = () => {
    if (name.trim().length < 1 || roomCode.trim().length < 1) return;
    onJoinRoom(roomCode.trim().toUpperCase(), name.trim());
  };

  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/room\/([A-Za-z0-9]+)/);
    if (match) {
      setRoomCode(match[1].toUpperCase());
      setMode('join');
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Warm ambient light glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-32 w-64 h-64 bg-amber-800/6 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-80 h-80 bg-amber-700/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-10 animate-fade-in">
          {/* Decorative ornament */}
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-amber-700/50" />
            <div className="w-2 h-2 rotate-45 border border-amber-700/60 bg-amber-900/30" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-amber-700/50" />
          </div>

          <h1 className="text-6xl font-black tracking-tight mb-2" style={{ fontFamily: "'Georgia', 'Palatino', serif" }}>
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-600 bg-clip-text text-transparent">Quiz</span>
            <span className="text-amber-50/90">Poker</span>
          </h1>
          <p className="text-amber-700/80 text-sm font-medium tracking-[0.25em] uppercase mb-4">
            by B&uuml;ttner
          </p>

          {/* Decorative divider */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-amber-800/40" />
            <div className="w-1.5 h-1.5 rounded-full bg-amber-700/40" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-amber-800/40" />
          </div>

          <p className="text-amber-600/40 text-sm italic tracking-wide">
            Ein Abend unter Freunden
          </p>
        </div>

        {error && (
          <div className="glass mb-4 rounded-xl p-3 text-center text-red-300 border-red-500/30 animate-fade-in-scale text-sm">
            {error}
          </div>
        )}

        <div className="lounge-card rounded-2xl p-8 shadow-2xl shadow-black/60 animate-fade-in">
          {mode === 'menu' && (
            <div className="space-y-4">
              <button
                onClick={() => setMode('create')}
                className="btn-gold w-full py-4 px-6 text-lg"
              >
                Raum erstellen
              </button>
              <button
                onClick={() => setMode('join')}
                className="w-full py-4 px-6 rounded-xl text-lg font-bold transition-all
                  bg-amber-950/30 hover:bg-amber-900/30 text-amber-100/80 border border-amber-800/25 hover:border-amber-600/40
                  hover:shadow-lg hover:shadow-amber-900/20"
              >
                Raum beitreten
              </button>
              <div className="pt-3 border-t border-amber-900/20">
                <button
                  onClick={onCreateRoomAsAdmin}
                  className="w-full py-3 px-6 rounded-xl text-sm font-medium transition-all
                    text-amber-700/40 hover:text-amber-400 border border-amber-900/15 hover:border-amber-700/30
                    hover:bg-amber-900/15"
                >
                  Als Admin erstellen (Zuschauer)
                </button>
              </div>
            </div>
          )}

          {mode === 'create' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-amber-50 mb-1" style={{ fontFamily: "'Georgia', 'Palatino', serif" }}>Neuer Raum</h2>
                <p className="text-amber-700/50 text-sm">Erstelle einen Raum und lade Freunde ein</p>
              </div>
              <div>
                <label className="text-amber-600/50 text-xs font-medium tracking-wider mb-1.5 block">DEIN NAME</label>
                <input
                  type="text"
                  placeholder="z.B. Max"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  maxLength={20}
                  className="w-full py-3.5 px-4 bg-amber-950/30 border border-amber-800/20 rounded-xl text-amber-50 placeholder-amber-800/40
                    text-lg transition-all"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setMode('menu')}
                  className="py-3 px-5 bg-amber-950/30 hover:bg-amber-900/30 rounded-xl transition-all text-amber-600/60 hover:text-amber-300 border border-amber-900/20"
                >
                  Zur&uuml;ck
                </button>
                <button
                  onClick={handleCreate}
                  disabled={name.trim().length < 1}
                  className="btn-gold flex-1 py-3 px-5"
                >
                  Erstellen
                </button>
              </div>
            </div>
          )}

          {mode === 'join' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-amber-50 mb-1" style={{ fontFamily: "'Georgia', 'Palatino', serif" }}>Raum beitreten</h2>
                <p className="text-amber-700/50 text-sm">Gib den Code ein, den du erhalten hast</p>
              </div>
              <div>
                <label className="text-amber-600/50 text-xs font-medium tracking-wider mb-1.5 block">DEIN NAME</label>
                <input
                  type="text"
                  placeholder="z.B. Max"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={20}
                  className="w-full py-3.5 px-4 bg-amber-950/30 border border-amber-800/20 rounded-xl text-amber-50 placeholder-amber-800/40
                    text-lg transition-all"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-amber-600/50 text-xs font-medium tracking-wider mb-1.5 block">RAUM-CODE</label>
                <input
                  type="text"
                  placeholder="ABC123"
                  value={roomCode}
                  onChange={e => setRoomCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  maxLength={6}
                  className="w-full py-4 px-4 bg-amber-950/30 border border-amber-800/20 rounded-xl text-amber-50 placeholder-amber-800/40
                    uppercase tracking-[0.3em] text-center text-2xl font-mono font-bold transition-all"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setMode('menu')}
                  className="py-3 px-5 bg-amber-950/30 hover:bg-amber-900/30 rounded-xl transition-all text-amber-600/60 hover:text-amber-300 border border-amber-900/20"
                >
                  Zur&uuml;ck
                </button>
                <button
                  onClick={handleJoin}
                  disabled={name.trim().length < 1 || roomCode.trim().length < 1}
                  className="btn-gold flex-1 py-3 px-5"
                >
                  Beitreten
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-amber-800/25 mt-8 text-xs tracking-wide">
          Teile den Raum-Link mit Freunden auf Discord
        </p>
      </div>
    </div>
  );
}
