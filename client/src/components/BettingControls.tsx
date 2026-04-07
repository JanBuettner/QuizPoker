import { useState } from 'react';
import { BettingAction } from '@shared/types';

interface BettingControlsProps {
  currentBetLevel: number;
  myCurrentBet: number;
  myChips: number;
  minRaise: number;
  onBet: (action: string, amount?: number) => void;
}

export default function BettingControls({
  currentBetLevel,
  myCurrentBet,
  myChips,
  minRaise,
  onBet,
}: BettingControlsProps) {
  const toCall = currentBetLevel - myCurrentBet;
  const canCheck = toCall === 0;
  const canCall = toCall > 0 && myChips >= toCall;
  const canRaise = myChips > toCall + minRaise;
  const [raiseAmount, setRaiseAmount] = useState(minRaise);
  const [showRaise, setShowRaise] = useState(false);

  const handleRaise = () => {
    onBet(BettingAction.RAISE, raiseAmount);
    setShowRaise(false);
  };

  return (
    <div className="mt-5 animate-slide-up">
      <div className="glass-gold rounded-2xl p-5">
        <div className="text-center mb-4">
          <span className="text-gold text-sm font-bold">Du bist dran!</span>
          {toCall > 0 && (
            <span className="text-white/30 text-sm ml-2">
              (Einsatz: {currentBetLevel.toLocaleString('de-DE')})
            </span>
          )}
        </div>

        {!showRaise ? (
          <div className="flex flex-wrap gap-2.5 justify-center">
            {canCheck && (
              <button
                onClick={() => onBet(BettingAction.CHECK)}
                className="py-3 px-6 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 font-bold rounded-xl
                  transition-all border border-emerald-600/20 hover:border-emerald-500/30 hover:scale-[1.03] active:scale-[0.97]"
              >
                Check
              </button>
            )}
            {canCall && (
              <button
                onClick={() => onBet(BettingAction.CALL)}
                className="py-3 px-6 bg-chip-blue/20 hover:bg-chip-blue/30 text-chip-blue font-bold rounded-xl
                  transition-all border border-chip-blue/20 hover:border-chip-blue/30 hover:scale-[1.03] active:scale-[0.97]"
              >
                Call {toCall.toLocaleString('de-DE')}
              </button>
            )}
            {canRaise && (
              <button
                onClick={() => setShowRaise(true)}
                className="btn-gold py-3 px-6"
              >
                Raise
              </button>
            )}
            <button
              onClick={() => onBet(BettingAction.ALL_IN)}
              disabled={myChips === 0}
              className="py-3 px-6 bg-chip-red/20 hover:bg-chip-red/30 text-chip-red font-bold rounded-xl
                transition-all border border-chip-red/20 hover:border-chip-red/30 hover:scale-[1.03] active:scale-[0.97]
                disabled:opacity-30"
            >
              All-In {myChips.toLocaleString('de-DE')}
            </button>
            <button
              onClick={() => onBet(BettingAction.FOLD)}
              className="py-3 px-6 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/60 font-bold rounded-xl
                transition-all border border-white/5 hover:border-white/10"
            >
              Fold
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={minRaise}
                max={myChips - toCall}
                step={minRaise}
                value={raiseAmount}
                onChange={e => setRaiseAmount(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-gold font-mono font-black min-w-[80px] text-right text-lg">
                {raiseAmount.toLocaleString('de-DE')}
              </span>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowRaise(false)}
                className="py-2.5 px-5 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-white/40 border border-white/5"
              >
                Abbrechen
              </button>
              <button
                onClick={handleRaise}
                className="btn-gold py-2.5 px-6"
              >
                Raise auf {(currentBetLevel + raiseAmount).toLocaleString('de-DE')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
