const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.value = volume;
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

export const sounds = {
  yourTurn: () => { playTone(880, 0.15); setTimeout(() => playTone(1100, 0.2), 150); },
  chipPlace: () => playTone(600, 0.08, 'square', 0.08),
  fold: () => playTone(300, 0.15, 'triangle', 0.1),
  win: () => { playTone(523, 0.15); setTimeout(() => playTone(659, 0.15), 150); setTimeout(() => playTone(784, 0.3), 300); },
  timerWarning: () => playTone(440, 0.1, 'square', 0.1),
  reveal: () => playTone(700, 0.12, 'sine', 0.1),
};
