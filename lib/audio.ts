/**
 * Synthesized audio cues using Web Audio API.
 * No external files — all sounds generated programmatically.
 * All functions are no-ops on SSR or when Web Audio is unavailable.
 */

let muted = false;
export function isMuted(): boolean { return muted; }
export function setMuted(v: boolean): void { muted = v; }

let sharedCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (muted) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!sharedCtx || sharedCtx.state === 'closed') sharedCtx = new AudioCtx();
    if (sharedCtx.state === 'suspended') sharedCtx.resume().catch(() => {});
    return sharedCtx;
  } catch {
    return null;
  }
}

/** Radar chirp — short rising sweep (new threat spawned) */
export function playRadarChirp() {
  const ac = ctx(); if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain); gain.connect(ac.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(900, ac.currentTime + 0.12);
  gain.gain.setValueAtTime(0.25, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.18);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.18);
}

/** Alert tone — two-tone ascending (ALERT/SCRAMBLE state change) */
export function playAlertTone() {
  const ac = ctx(); if (!ac) return;
  [0, 0.22].forEach((offset, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = 'square';
    osc.frequency.value = i === 0 ? 880 : 1100;
    gain.gain.setValueAtTime(0.12, ac.currentTime + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + offset + 0.18);
    osc.start(ac.currentTime + offset);
    osc.stop(ac.currentTime + offset + 0.18);
  });
}

/** Breach klaxon — harsh descending burst (base hit) */
export function playBreachKlaxon() {
  const ac = ctx(); if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain); gain.connect(ac.destination);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(600, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, ac.currentTime + 0.4);
  gain.gain.setValueAtTime(0.3, ac.currentTime);
  gain.gain.setValueAtTime(0.3, ac.currentTime + 0.35);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.45);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.45);
}

/** Success chime — rising triad (correct engagement) */
export function playSuccessChime() {
  const ac = ctx(); if (!ac) return;
  [523.25, 659.25, 783.99].forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = ac.currentTime + i * 0.1;
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.start(t);
    osc.stop(t + 0.35);
  });
}

/** Error buzz — dissonant tone (incorrect engagement) */
export function playErrorBuzz() {
  const ac = ctx(); if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain); gain.connect(ac.destination);
  osc.type = 'sawtooth';
  osc.frequency.value = 180;
  gain.gain.setValueAtTime(0.22, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.3);
}

/** Tactical Radio Squelch — military comms PTT burst */
export function playRadioSquelch() {
  const ac = ctx(); if (!ac) return;
  try {
    const bufferSize = ac.sampleRate * 0.08;
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const noise = ac.createBufferSource();
    noise.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    filter.Q.value = 2.5;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.15, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.08);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    noise.start(ac.currentTime);
  } catch {}
}

/** Lock acquired tone — rapid staccato pulse */
export function playLockAcquired() {
  const ac = ctx(); if (!ac) return;
  [0, 0.06, 0.12].forEach(offset => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = 'sine';
    osc.frequency.value = 1760; // A6 note
    gain.gain.setValueAtTime(0.18, ac.currentTime + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + offset + 0.04);
    osc.start(ac.currentTime + offset);
    osc.stop(ac.currentTime + offset + 0.04);
  });
}

/** Effector deployment soundscape */
export function playEffectorLaunch(cm: string) {
  const ac = ctx(); if (!ac) return;
  playRadioSquelch();

  if (cm === 'interceptor') {
    // Kinetic rocket motor ignition & whoosh
    const bufferSize = ac.sampleRate * 0.35;
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ac.createBufferSource();
    noise.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, ac.currentTime);
    filter.frequency.exponentialRampToValueAtTime(2200, ac.currentTime + 0.2);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.28, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.35);
    noise.connect(filter); filter.connect(gain); gain.connect(ac.destination);
    noise.start(ac.currentTime);
  } else if (cm === 'laser-dew') {
    // 10kW DEW high-frequency thermal ionization sweep
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2800, ac.currentTime + 0.25);
    gain.gain.setValueAtTime(0.2, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.3);
  } else if (cm === 'ew') {
    // High-power microwave EMP thump
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ac.currentTime + 0.3);
    gain.gain.setValueAtTime(0.35, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.35);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.35);
  } else {
    // RF Jammer / GNSS spoof warble
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(750, ac.currentTime);
    osc.frequency.linearRampToValueAtTime(1100, ac.currentTime + 0.15);
    gain.gain.setValueAtTime(0.16, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.25);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.25);
  }
}

