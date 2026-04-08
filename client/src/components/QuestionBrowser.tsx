import { useState, useMemo } from 'react';
import type { Question } from '@shared/types';

interface QuestionBrowserProps {
  questions: Question[];
  onClose: () => void;
}

export default function QuestionBrowser({ questions, onClose }: QuestionBrowserProps) {
  const [filter, setFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState<Set<number>>(new Set());

  const categories = useMemo(() => {
    const cats = new Map<string, number>();
    for (const q of questions) {
      cats.set(q.category, (cats.get(q.category) || 0) + 1);
    }
    return [...cats.entries()].sort((a, b) => b[1] - a[1]);
  }, [questions]);

  const filtered = useMemo(() => {
    return questions.filter(q => {
      if (selectedCategory && q.category !== selectedCategory) return false;
      if (filter && !q.question.toLowerCase().includes(filter.toLowerCase())) return false;
      return true;
    });
  }, [questions, selectedCategory, filter]);

  const toggleAnswer = (id: number) => {
    setShowAnswer(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="glass rounded-2xl w-full max-w-4xl my-8 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Fragenkatalog</h2>
            <p className="text-white/30 text-xs">{questions.length} Fragen in {categories.length} Kategorien</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white text-xl transition-colors">✕</button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-white/5 flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Suchen..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="py-2 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/20 focus:outline-none focus:border-gold/40 w-48"
          />
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all
                ${!selectedCategory ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-white/5 text-white/40 border border-white/5 hover:text-white/60'}`}
            >
              Alle ({questions.length})
            </button>
            {categories.map(([cat, count]) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all
                  ${selectedCategory === cat ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-white/5 text-white/40 border border-white/5 hover:text-white/60'}`}
              >
                {cat} ({count})
              </button>
            ))}
          </div>
        </div>

        {/* Questions list */}
        <div className="max-h-[60vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-white/20">Keine Fragen gefunden</div>
          ) : (
            <div className="divide-y divide-white/[0.03]">
              {filtered.map(q => (
                <div
                  key={q.id}
                  className="px-6 py-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
                  onClick={() => toggleAnswer(q.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white/15 text-xs font-mono">#{q.id}</span>
                        <span className="text-[9px] bg-white/5 text-white/30 rounded-full px-2 py-0.5 font-bold">{q.category}</span>
                      </div>
                      <p className="text-white text-sm font-medium">{q.question}</p>
                    </div>
                    <span className="text-white/15 text-xs shrink-0 mt-1">
                      {showAnswer.has(q.id) ? '▲' : '▼'}
                    </span>
                  </div>
                  {showAnswer.has(q.id) && (
                    <div className="mt-3 grid grid-cols-3 gap-3 animate-fade-in">
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                        <div className="text-emerald-400/40 text-[9px] font-bold tracking-wider">ANTWORT</div>
                        <div className="text-emerald-400 font-bold font-mono">{q.answer.toLocaleString('de-DE')}</div>
                      </div>
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2">
                        <div className="text-purple-400/40 text-[9px] font-bold tracking-wider">HINWEIS 1</div>
                        <div className="text-purple-300 text-xs">{q.hint}</div>
                      </div>
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2">
                        <div className="text-purple-400/40 text-[9px] font-bold tracking-wider">HINWEIS 2</div>
                        <div className="text-purple-300 text-xs">{q.hint2}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
