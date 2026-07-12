/**
 * Áudio procedural via WebAudio — nenhum asset externo.
 * Drones ambientes por cena, passos, rangidos, chimes e stingers.
 *
 * Singleton compartilhado entre cenas (import { audio }). O contexto só
 * nasce após o primeiro gesto do usuário (política de autoplay); qualquer
 * chamada antes disso é silenciosamente ignorada.
 */

type AmbientKind = 'day' | 'night' | 'council';
type StingerKind = 'discovery' | 'death' | 'victory' | 'defeat';

interface AmbientVoice {
  nodes: OscillatorNode[];
  noise: AudioBufferSourceNode | null;
  gain: GainNode;
}

class AudioSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambient: AmbientVoice | null = null;
  private ambientKind: AmbientKind | null = null;
  private muted = false;
  private lastStep = 0;

  /** Cria/acorda o contexto. Chamar em resposta a gesto (clique/tecla). */
  ensureStarted(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  get ready(): boolean {
    return !!this.ctx && this.ctx.state === 'running' && !!this.master;
  }

  toggleMuted(): boolean {
    this.muted = !this.muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.5, this.ctx.currentTime, 0.06);
    }
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  // --- Ambiente ---

  /** Drone contínuo da cena. Troca com crossfade curto; repetir o mesmo tipo é no-op. */
  startAmbient(kind: AmbientKind): void {
    if (!this.ready || this.ambientKind === kind) return;
    this.stopAmbient();
    this.ambientKind = kind;

    const ctx = this.ctx!;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.master!);

    const spec: Record<AmbientKind, { freqs: number[]; type: OscillatorType; level: number; noiseLevel: number }> = {
      day: { freqs: [55, 55.7, 110.3], type: 'sine', level: 0.05, noiseLevel: 0.012 },
      night: { freqs: [41.2, 41.6, 82.8], type: 'sine', level: 0.065, noiseLevel: 0.02 },
      council: { freqs: [49, 49.5, 73.9, 98.5], type: 'triangle', level: 0.055, noiseLevel: 0.008 },
    };
    const { freqs, type, level, noiseLevel } = spec[kind];

    const nodes = freqs.map((freq) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start();
      return osc;
    });

    // Respiração lenta do drone
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = level * 0.35;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();
    nodes.push(lfo);

    // Vento: ruído filtrado bem baixo
    const noise = this.makeNoiseSource(8);
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = kind === 'night' ? 240 : 320;
    noiseFilter.Q.value = 0.6;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = noiseLevel;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(gain);
    noise.start();

    gain.gain.setTargetAtTime(level, ctx.currentTime, 1.2);
    this.ambient = { nodes, noise, gain };
  }

  stopAmbient(): void {
    if (!this.ambient || !this.ctx) return;
    const { nodes, noise, gain } = this.ambient;
    const stopAt = this.ctx.currentTime + 0.8;
    gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
    for (const node of nodes) node.stop(stopAt);
    noise?.stop(stopAt);
    this.ambient = null;
    this.ambientKind = null;
  }

  // --- Efeitos pontuais ---

  /** Passo curto de ruído filtrado. Auto-limitado a 1 a cada 240ms. */
  footstep(): void {
    if (!this.ready) return;
    const now = performance.now();
    if (now - this.lastStep < 240) return;
    this.lastStep = now;

    const ctx = this.ctx!;
    const src = this.makeNoiseSource(0.09);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 380 + Math.random() * 320;
    filter.Q.value = 1.4;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.11, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master!);
    src.start();
  }

  /** Chime de coleta: arpejo curto e brilhante. */
  chime(high = false): void {
    if (!this.ready) return;
    const base = high ? 660 : 520;
    [0, 0.09, 0.18].forEach((delay, i) => {
      this.tone({
        freq: base * [1, 1.335, 1.5][i],
        type: 'sine',
        start: delay,
        attack: 0.01,
        decay: 0.5,
        level: 0.16,
      });
    });
  }

  /** Rangido de porta pesada: serra grave descendo + baque final. */
  creak(): void {
    if (!this.ready) return;
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(52, ctx.currentTime + 0.7);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.75);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master!);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);

    this.tone({ freq: 60, type: 'sine', start: 0.72, attack: 0.005, decay: 0.35, level: 0.22 });
  }

  /** Stinger dramático conforme o momento. */
  stinger(kind: StingerKind): void {
    if (!this.ready) return;
    if (kind === 'discovery') {
      this.tone({ freq: 220, type: 'triangle', start: 0, attack: 0.02, decay: 0.9, level: 0.14 });
      this.tone({ freq: 233.1, type: 'triangle', start: 0.05, attack: 0.02, decay: 0.9, level: 0.12 });
      return;
    }
    if (kind === 'death') {
      this.tone({ freq: 98, type: 'sawtooth', start: 0, attack: 0.01, decay: 1.4, level: 0.12, toFreq: 65 });
      this.tone({ freq: 103.9, type: 'sawtooth', start: 0.02, attack: 0.01, decay: 1.4, level: 0.1, toFreq: 69 });
      return;
    }
    if (kind === 'victory') {
      [261.6, 329.6, 392, 523.3].forEach((freq, i) => {
        this.tone({ freq, type: 'triangle', start: i * 0.14, attack: 0.01, decay: 0.8, level: 0.15 });
      });
      return;
    }
    // defeat: queda cromática lenta
    [196, 185, 174.6].forEach((freq, i) => {
      this.tone({ freq, type: 'sawtooth', start: i * 0.3, attack: 0.02, decay: 0.9, level: 0.11 });
    });
  }

  /** Blip discreto para toasts/eventos. */
  blip(): void {
    if (!this.ready) return;
    this.tone({ freq: 740, type: 'sine', start: 0, attack: 0.005, decay: 0.12, level: 0.06 });
  }

  // --- Internos ---

  private tone(opts: {
    freq: number;
    type: OscillatorType;
    start: number;
    attack: number;
    decay: number;
    level: number;
    toFreq?: number;
  }): void {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + opts.start;
    const osc = ctx.createOscillator();
    osc.type = opts.type;
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.toFreq) {
      osc.frequency.exponentialRampToValueAtTime(opts.toFreq, t0 + opts.decay);
    }
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(opts.level, t0 + opts.attack);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + opts.attack + opts.decay);
    osc.connect(gain);
    gain.connect(this.master!);
    osc.start(t0);
    osc.stop(t0 + opts.attack + opts.decay + 0.05);
  }

  private makeNoiseSource(seconds: number): AudioBufferSourceNode {
    const ctx = this.ctx!;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = seconds > 1;
    return src;
  }
}

export const audio = new AudioSystem();

/** Liga o despertar do áudio ao primeiro gesto na página. */
export function armAudioUnlock(): void {
  const unlock = () => {
    audio.ensureStarted();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}
