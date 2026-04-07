let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// ---------------------------------------------------------------------------
// Utility: create a noise buffer (white noise shaped by an amplitude envelope)
// ---------------------------------------------------------------------------
function createNoiseBuffer(
  ctx: AudioContext,
  duration: number,
  shapeExponent = 3,
): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    // Random noise with exponential decay envelope
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, shapeExponent);
  }
  return buffer;
}

// ---------------------------------------------------------------------------
// Chip clack – layered noise burst + low thud
// ---------------------------------------------------------------------------
function chipSound(volume = 0.12) {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  // --- Noise burst (the bright "click" of ceramic/clay hitting felt) ---
  const noiseBuffer = createNoiseBuffer(ctx, 0.045, 4);
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 3200;
  bp.Q.value = 1.8;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(volume, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

  noise.connect(bp);
  bp.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(now);

  // --- Low thud (the body / weight of the chip) ---
  const thud = ctx.createOscillator();
  thud.type = 'sine';
  thud.frequency.setValueAtTime(180, now);
  thud.frequency.exponentialRampToValueAtTime(60, now + 0.06);

  const thudGain = ctx.createGain();
  thudGain.gain.setValueAtTime(volume * 0.5, now);
  thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

  thud.connect(thudGain);
  thudGain.connect(ctx.destination);
  thud.start(now);
  thud.stop(now + 0.08);
}

// ---------------------------------------------------------------------------
// Chip stack – several chips cascading (pot win / big raise)
// ---------------------------------------------------------------------------
function chipStack() {
  for (let i = 0; i < 5; i++) {
    setTimeout(() => chipSound(0.09 + Math.random() * 0.05), i * 55 + Math.random() * 20);
  }
}

// ---------------------------------------------------------------------------
// Card flip – short swoosh of a card turning over
// ---------------------------------------------------------------------------
function cardFlip() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const noiseBuffer = createNoiseBuffer(ctx, 0.06, 5);
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  // High-pass gives it a papery, airy quality
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 2500;
  hp.Q.value = 0.7;

  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(5000, now);
  bp.frequency.exponentialRampToValueAtTime(2000, now + 0.06);
  bp.Q.value = 1.2;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

  noise.connect(hp);
  hp.connect(bp);
  bp.connect(gain);
  gain.connect(ctx.destination);
  noise.start(now);
}

// ---------------------------------------------------------------------------
// Card deal – sliding / snapping a card across felt
// ---------------------------------------------------------------------------
function cardDeal() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Short noise with frequency sweep downward (the slide)
  const noiseBuffer = createNoiseBuffer(ctx, 0.08, 3);
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(4000, now);
  bp.frequency.exponentialRampToValueAtTime(1200, now + 0.07);
  bp.Q.value = 1.5;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  noise.connect(bp);
  bp.connect(gain);
  gain.connect(ctx.destination);
  noise.start(now);

  // Tiny thump at end (card landing on felt)
  const thump = ctx.createOscillator();
  thump.type = 'sine';
  thump.frequency.value = 120;
  const thumpGain = ctx.createGain();
  thumpGain.gain.setValueAtTime(0, now);
  thumpGain.gain.setValueAtTime(0.05, now + 0.04);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  thump.connect(thumpGain);
  thumpGain.connect(ctx.destination);
  thump.start(now);
  thump.stop(now + 0.1);
}

// ---------------------------------------------------------------------------
// Your-turn notification – warm two-tone bell ding
// ---------------------------------------------------------------------------
function yourTurnDing() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  function bell(freq: number, startTime: number, dur: number, vol: number) {
    // Fundamental
    const osc = ctx!.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    // Slight overtone for shimmer
    const osc2 = ctx!.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2.02; // slight detuning

    const gain = ctx!.createGain();
    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

    const gain2 = ctx!.createGain();
    gain2.gain.setValueAtTime(vol * 0.15, startTime);
    gain2.gain.exponentialRampToValueAtTime(0.001, startTime + dur * 0.6);

    osc.connect(gain);
    osc2.connect(gain2);
    gain.connect(ctx!.destination);
    gain2.connect(ctx!.destination);

    osc.start(startTime);
    osc.stop(startTime + dur);
    osc2.start(startTime);
    osc2.stop(startTime + dur);
  }

  bell(830, now, 0.2, 0.1);
  bell(1050, now + 0.14, 0.25, 0.12);
}

// ---------------------------------------------------------------------------
// Timer warning – soft tick / click
// ---------------------------------------------------------------------------
function timerTick() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Very short click using an oscillator
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(900, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.06);
}

// ---------------------------------------------------------------------------
// Victory chord – satisfying major chord swell after chip cascade
// ---------------------------------------------------------------------------
function victoryChord() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  // C major triad with gentle attack
  const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    // Gentle overtone
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2.005;

    const gain = ctx.createGain();
    const startTime = now + i * 0.06;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.07, startTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0, startTime);
    gain2.gain.linearRampToValueAtTime(0.02, startTime + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

    osc.connect(gain);
    osc2.connect(gain2);
    gain.connect(ctx.destination);
    gain2.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.55);
    osc2.start(startTime);
    osc2.stop(startTime + 0.35);
  });
}

// ---------------------------------------------------------------------------
// All-in – dramatic chip push: fast cascade + low rumble
// ---------------------------------------------------------------------------
function allInPush() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Fast chip cascade (8 chips, tighter timing)
  for (let i = 0; i < 8; i++) {
    setTimeout(() => chipSound(0.07 + Math.random() * 0.06), i * 35 + Math.random() * 15);
  }

  // Low rumble underneath (dramatic weight)
  const rumbleLength = Math.floor(ctx.sampleRate * 0.3);
  const rumbleBuffer = ctx.createBuffer(1, rumbleLength, ctx.sampleRate);
  const rumbleData = rumbleBuffer.getChannelData(0);
  for (let i = 0; i < rumbleLength; i++) {
    const env = Math.sin((i / rumbleLength) * Math.PI); // bell envelope
    rumbleData[i] = (Math.random() * 2 - 1) * env;
  }
  const rumble = ctx.createBufferSource();
  rumble.buffer = rumbleBuffer;

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 200;
  lp.Q.value = 1;

  const rumbleGain = ctx.createGain();
  rumbleGain.gain.value = 0.06;

  rumble.connect(lp);
  lp.connect(rumbleGain);
  rumbleGain.connect(ctx.destination);
  rumble.start(now);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export const sounds = {
  yourTurn: () => yourTurnDing(),
  chipPlace: () => chipSound(),
  chipStack: () => chipStack(),
  fold: () => cardFlip(),
  cardDeal: () => cardDeal(),
  win: () => {
    chipStack();
    setTimeout(() => victoryChord(), 280);
  },
  timerWarning: () => timerTick(),
  reveal: () => cardFlip(),
  allIn: () => allInPush(),
};
