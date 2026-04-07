import { useState, useEffect } from 'react';

interface HomeProps {
  onCreateRoom: (name: string) => void;
  onCreateRoomAsAdmin: () => void;
  onJoinRoom: (code: string, name: string) => void;
  error: string | null;
}

export default function Home({ onCreateRoom, onCreateRoomAsAdmin, onJoinRoom, error }: HomeProps) {
  const [name, setName] = useState('');
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
      {/* Background decorative elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-64 h-64 bg-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-block mb-4">
            <div className="text-6xl mb-2">🃏</div>
          </div>
          <h1 className="text-6xl font-black tracking-tight mb-3">
            <span className="bg-gradient-to-r from-gold-light via-gold to-gold-dark bg-clip-text text-transparent">Quiz</span>
            <span className="text-white">Poker</span>
          </h1>
          <p className="text-emerald-400/60 text-lg font-medium tracking-wide">
            Schaetze &middot; Setze &middot; Bluffe
          </p>
        </div>

        {error && (
          <div className="glass mb-4 rounded-xl p-3 text-center text-red-300 border-red-500/30 animate-fade-in-scale text-sm">
            {error}
          </div>
        )}

        <div className="glass rounded-3xl p-8 shadow-2xl shadow-black/40 animate-fade-in">
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
                  bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-emerald-500/30
                  hover:shadow-lg hover:shadow-emerald-500/5"
              >
                Raum beitreten
              </button>
              <div className="pt-3 border-t border-white/5">
                <button
                  onClick={onCreateRoomAsAdmin}
                  className="w-full py-3 px-6 rounded-xl text-sm font-medium transition-all
                    text-white/40 hover:text-gold border border-white/5 hover:border-gold/20
                    hover:bg-gold/5"
                >
                  Als Admin erstellen (Zuschauer)
                </button>
              </div>
            </div>
          )}

          {mode === 'create' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Neuer Raum</h2>
                <p className="text-white/30 text-sm">Erstelle einen Raum und lade Freunde ein</p>
              </div>
              <div>
                <label className="text-white/40 text-xs font-medium tracking-wider mb-1.5 block">DEIN NAME</label>
                <input
                  type="text"
                  placeholder="z.B. Max"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  maxLength={20}
                  className="w-full py-3.5 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20
                    text-lg transition-all"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setMode('menu')}
                  className="py-3 px-5 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white/60 hover:text-white border border-white/5"
                >
                  Zurueck
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
                <h2 className="text-2xl font-bold text-white mb-1">Raum beitreten</h2>
                <p className="text-white/30 text-sm">Gib den Code ein, den du erhalten hast</p>
              </div>
              <div>
                <label className="text-white/40 text-xs font-medium tracking-wider mb-1.5 block">DEIN NAME</label>
                <input
                  type="text"
                  placeholder="z.B. Max"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={20}
                  className="w-full py-3.5 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20
                    text-lg transition-all"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-white/40 text-xs font-medium tracking-wider mb-1.5 block">RAUM-CODE</label>
                <input
                  type="text"
                  placeholder="ABC123"
                  value={roomCode}
                  onChange={e => setRoomCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  maxLength={6}
                  className="w-full py-4 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20
                    uppercase tracking-[0.3em] text-center text-2xl font-mono font-bold transition-all"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setMode('menu')}
                  className="py-3 px-5 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white/60 hover:text-white border border-white/5"
                >
                  Zurueck
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

        <p className="text-center text-white/15 mt-8 text-xs tracking-wide">
          Teile den Raum-Link mit Freunden auf Discord
        </p>
      </div>
    </div>
  );
}
