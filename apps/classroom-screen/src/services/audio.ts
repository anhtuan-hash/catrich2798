// Web Audio API Audio Synthesizer for Classroom Signals & Alarms
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playChimeSound(volume = 0.8) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Play a pleasant 3-tone chime (E5, G#5, B5)
    const freqs = [659.25, 830.61, 987.77];
    freqs.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.12);
      
      gain.gain.setValueAtTime(0, now + index * 0.12);
      gain.gain.linearRampToValueAtTime(0.3 * volume, now + index * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.12 + 0.8);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + index * 0.12);
      osc.stop(now + index * 0.12 + 0.85);
    });
  } catch (err) {
    console.warn('Audio play error:', err);
  }
}

export type AlertSoundType = 'alarm' | 'chime' | 'bell' | 'fanfare';

export function playAlertSound(type: AlertSoundType = 'alarm', volume = 0.8) {
  switch (type) {
    case 'chime':
      playChimeSound(volume);
      break;
    case 'bell':
      playAttentionBell(volume);
      break;
    case 'fanfare':
      playWinnerFanfare(volume);
      break;
    case 'alarm':
    default:
      playTimerAlarm(volume);
      break;
  }
}

export function playTimerAlarm(volume = 0.8) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Play 4 quick energetic alarm beeps
    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now + i * 0.18); // A5
      
      gain.gain.setValueAtTime(0.4 * volume, now + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.12);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + i * 0.18);
      osc.stop(now + i * 0.18 + 0.15);
    }
  } catch (err) {
    console.warn('Timer alarm audio error:', err);
  }
}

export function playAttentionBell(volume = 0.8) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Resonant bell chime
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, now); // C6
    
    gain.gain.setValueAtTime(0.6 * volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 2.1);
  } catch (err) {
    console.warn('Bell audio error:', err);
  }
}

export function playWinnerFanfare(volume = 0.8) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Quick fanfare chord: C5 - E5 - G5 - C6
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      const startTime = now + idx * 0.1;
      const duration = idx === notes.length - 1 ? 0.8 : 0.2;
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.4 * volume, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    });
  } catch (err) {
    console.warn('Fanfare error:', err);
  }
}

export function playTickSound(volume = 0.5) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    
    gain.gain.setValueAtTime(0.1 * volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.04);
  } catch (err) {
    // Ignore small tick audio error
  }
}
