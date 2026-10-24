import { useCallback, useEffect, useRef, useState } from 'react';

export const FOCUS_SOUNDS = ['white','rain','ocean','wind','forest'];
export const FOCUS_SOUND_LABELS = {
  white: ['Tiếng ồn trắng','White noise'],
  rain: ['Mưa nhẹ','Gentle rain'],
  ocean: ['Sóng biển','Ocean'],
  wind: ['Gió nhẹ','Soft wind'],
  forest: ['Rừng xanh','Forest'],
};

function createFocusSound(context, sound, volume) {
  const buffer = context.createBuffer(1, Math.round(context.sampleRate * 4), context.sampleRate);
  const data = buffer.getChannelData(0);
  let brown = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    brown = (brown + 0.02 * white) / 1.02;
    data[i] = sound === 'white' || sound === 'rain' ? white * 0.42 : brown * 3.2;
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const filter = context.createBiquadFilter();
  if (sound === 'white') { filter.type = 'lowpass'; filter.frequency.value = 10500; }
  if (sound === 'rain') { filter.type = 'highpass'; filter.frequency.value = 480; }
  if (sound === 'ocean') { filter.type = 'lowpass'; filter.frequency.value = 420; }
  if (sound === 'wind') { filter.type = 'bandpass'; filter.frequency.value = 520; filter.Q.value = 0.5; }
  if (sound === 'forest') { filter.type = 'lowpass'; filter.frequency.value = 1800; }
  const gain = context.createGain();
  gain.gain.value = Math.max(0, Math.min(1, volume / 100)) * .18;
  source.connect(filter).connect(gain).connect(context.destination);
  const nodes = [source];
  if (sound === 'wind' || sound === 'ocean') {
    const oscillator = context.createOscillator();
    const modulation = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = sound === 'wind' ? .16 : .09;
    modulation.gain.value = sound === 'wind' ? 140 : 250;
    oscillator.connect(modulation).connect(filter.frequency);
    oscillator.start();
    nodes.push(oscillator);
  }
  if (sound === 'forest') {
    const bird = context.createOscillator();
    const birdGain = context.createGain();
    const lfo = context.createOscillator();
    const lfoDepth = context.createGain();
    bird.type = 'sine';
    bird.frequency.value = 1120;
    birdGain.gain.value = .0025;
    lfo.frequency.value = 2.4;
    lfoDepth.gain.value = 230;
    lfo.connect(lfoDepth).connect(bird.frequency);
    bird.connect(birdGain).connect(context.destination);
    bird.start(); lfo.start();
    nodes.push(bird,lfo);
  }
  source.start();
  return { context, gain, nodes };
}

export default function useFocusSoundscape(userId) {
  const [sound, setSound] = useState('white');
  const [volume, setVolume] = useState(30);
  const [playing, setPlaying] = useState(false);
  const engineRef = useRef(null);
  const stop = useCallback(async () => {
    const engine = engineRef.current;
    engineRef.current = null;
    if (engine) {
      engine.nodes.forEach(node => { try { node.stop(); } catch { /* stopped */ } });
      await engine.context.close().catch(() => {});
    }
    setPlaying(false);
  }, []);
  const start = useCallback(async (selection = sound) => {
    // Do not await anything before creating AudioContext: Safari requires a user gesture.
    const previous = engineRef.current;
    engineRef.current = null;
    if (previous) {
      previous.nodes.forEach(node => { try { node.stop(); } catch {} });
      previous.context.close().catch(() => {});
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('Trình duyệt không hỗ trợ phát âm thanh.');
    const context = new AudioContextClass();
    try {
      const engine = createFocusSound(context, selection, volume);
      engineRef.current = engine;
      await context.resume();
      setSound(selection);
      setPlaying(true);
    } catch (error) {
      await context.close().catch(() => {});
      throw error;
    }
  }, [sound, stop, volume]);
  const changeVolume = value => {
    const next = Math.min(100, Math.max(0, Number(value)));
    setVolume(next);
    const gain = engineRef.current?.gain;
    if (gain) gain.gain.setTargetAtTime(next / 100 * .18, gain.context.currentTime, .05);
  };
  useEffect(() => () => {
    const engine = engineRef.current;
    engineRef.current = null;
    if (engine) {
      engine.nodes.forEach(node => { try { node.stop(); } catch {} });
      engine.context.close().catch(() => {});
    }
  }, []);
  useEffect(() => { stop().catch(() => {}); }, [userId]); // prevent playing across logins
  return { sound, volume, playing, start, stop, changeVolume };
}
