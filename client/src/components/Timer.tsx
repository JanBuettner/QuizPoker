import { useState, useEffect } from 'react';

interface TimerProps {
  seconds: number;  // server-provided remaining seconds
  maxSeconds: number;  // total seconds for this phase
}

export default function Timer({ seconds, maxSeconds }: TimerProps) {
  const [localSeconds, setLocalSeconds] = useState(seconds);

  // Sync with server
  useEffect(() => {
    setLocalSeconds(seconds);
  }, [seconds]);

  // Local countdown
  useEffect(() => {
    if (localSeconds <= 0) return;
    const interval = setInterval(() => {
      setLocalSeconds(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [localSeconds > 0]); // restart interval when it becomes > 0

  if (localSeconds <= 0 && seconds <= 0) return null;

  const progress = maxSeconds > 0 ? localSeconds / maxSeconds : 0;
  const isLow = localSeconds <= 10;
  const isCritical = localSeconds <= 5;

  return (
    <div className="mt-4 w-full max-w-md mx-auto">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-linear
              ${isCritical ? 'bg-red-500' : isLow ? 'bg-yellow-500' : 'bg-emerald-500/60'}`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className={`text-sm font-mono font-bold min-w-[40px] text-right
          ${isCritical ? 'text-red-400 animate-pulse' : isLow ? 'text-yellow-400' : 'text-white/30'}`}>
          {localSeconds}s
        </span>
      </div>
    </div>
  );
}
