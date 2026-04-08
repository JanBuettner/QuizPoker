import { useState } from 'react';

interface EstimateInputProps {
  onSubmit: (estimate: number) => void;
}

export default function EstimateInput({ onSubmit }: EstimateInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    const num = parseFloat(value.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(num)) {
      onSubmit(Math.round(num));
    }
  };

  return (
    <div className="mt-6 animate-slide-up">
      <div className="glass rounded-2xl p-5">
        <label className="text-white/30 text-[10px] font-bold tracking-[0.2em] mb-3 block text-center">DEINE SCHÄTZUNG</label>
        <div className="flex gap-3">
          <input
            type="text"
            inputMode="numeric"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Zahl eingeben..."
            className="flex-1 py-4 px-5 bg-white/5 border border-white/10 rounded-xl text-white text-center text-2xl
              font-mono font-bold placeholder-white/10 transition-all"
            autoFocus
          />
          <button
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="btn-gold py-4 px-7 text-base"
          >
            Abgeben
          </button>
        </div>
      </div>
    </div>
  );
}
