/**
 * Procedural sound design with the Web Audio API.
 * Every built-in sound (wind, clocks, creaks, footsteps, fire, mechanisms) is
 * synthesised here. Recorded clips are optional extras (see systems/clips.ts):
 * when a clip is present it adds an event or replaces its synthesised version.
 *
 * Browsers block audio until the user interacts; call `audio.unlock()` from a click.
 */
import type { Zone } from '../world/layout';
import { renderFootstep, type Surface } from './footstepSynth';
import { clipFiles, type ClipSlot } from './clips';

type V3 = [number, number, number];
export type ClockVoice = 'tick' | 'loud' | 'footsteps' | 'silent';

function rand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfx!: GainNode;
  private amb!: GainNode;
  private reverb!: ConvolverNode;
  private reverbSend!: GainNode;
  private windGain!: GainNode;
  private windFilter!: BiquadFilterNode;
  private roomGain!: GainNode;
  private buffers: Record<string, AudioBuffer> = {};
  private hallClock!: PannerNode;
  private mantelClock!: PannerNode;
  private fire!: PannerNode;
  private fireGain!: GainNode;
  private schedTimer: number | null = null;
  private nextHallTick = 0;
  private nextMantelTick = 0;
  private nextCrackle = 0;
  private tickIndex = 0;
  private mantelIndex = 0;
  mantelVoice: ClockVoice = 'tick';
  /** Set by the house's strange events: the hall clock holds its breath. */
  hallClockStopped = false;
  footstepsOn = true;
  private stepIndex = 0;
  private volume = 0.7;
  private muted = false;
  private zone: Zone = 'exterior';
  private clips: Partial<Record<ClipSlot, AudioBuffer[]>> = {};
  private lastClip: Partial<Record<ClipSlot, number>> = {};
  private windSynth!: AudioNode;
  private musicGain!: GainNode;
  private musicOn = true;
  private lessonDuck = false;

  get ready() {
    return !!this.ctx;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    this.master = ctx.createGain();
    this.master.connect(comp).connect(ctx.destination);
    this.sfx = ctx.createGain();
    this.sfx.connect(this.master);
    this.amb = ctx.createGain();
    this.amb.connect(this.master);
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.makeImpulse(2.6, 3.2);
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.35;
    this.reverbSend.connect(this.reverb).connect(this.master);
    this.buildBuffers();
    this.startAmbience();
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0;
    this.musicGain.connect(this.amb);
    this.applyVolume();
    void this.loadClips();
    this.schedTimer = window.setInterval(() => this.schedule(), 80);
  }

  setVolume(v: number, muted: boolean) {
    this.volume = v;
    this.muted = muted;
    this.applyVolume();
  }
  private applyVolume() {
    if (!this.ctx) return;
    const target = this.muted ? 0 : this.volume * this.volume;
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
  }

  suspend(paused: boolean) {
    if (!this.ctx) return;
    if (paused) void this.ctx.suspend();
    else void this.ctx.resume();
  }

  setListener(pos: V3, fwd: V3) {
    const ctx = this.ctx;
    if (!ctx) return;
    const l = ctx.listener;
    const t = ctx.currentTime;
    if (l.positionX) {
      l.positionX.setTargetAtTime(pos[0], t, 0.03);
      l.positionY.setTargetAtTime(pos[1], t, 0.03);
      l.positionZ.setTargetAtTime(pos[2], t, 0.03);
      l.forwardX.setTargetAtTime(fwd[0], t, 0.03);
      l.forwardY.setTargetAtTime(fwd[1], t, 0.03);
      l.forwardZ.setTargetAtTime(fwd[2], t, 0.03);
      l.upX.value = 0;
      l.upY.value = 1;
      l.upZ.value = 0;
    } else {
      (l as unknown as { setPosition: (...a: number[]) => void }).setPosition(...pos);
    }
  }

  setZone(zone: Zone) {
    if (!this.ctx || zone === this.zone) return;
    this.zone = zone;
    const t = this.ctx.currentTime;
    const outside = zone === 'exterior';
    this.windGain.gain.setTargetAtTime(outside ? 0.5 : zone === 'mirrors' ? 0.1 : 0.07, t, 0.8);
    this.windFilter.frequency.setTargetAtTime(outside ? 900 : 320, t, 0.8);
    this.roomGain.gain.setTargetAtTime(outside ? 0 : 0.06, t, 1);
    this.reverbSend.gain.setTargetAtTime(outside ? 0.08 : zone === 'mirrors' ? 0.45 : 0.32, t, 0.5);
  }

  // ------------------------------------------------------------ recorded clips

  private async loadClips() {
    const ctx = this.ctx!;
    for (const [slot, urls] of Object.entries(clipFiles()) as [ClipSlot, string[]][]) {
      const decoded: AudioBuffer[] = [];
      for (const url of urls) {
        try {
          decoded.push(await ctx.decodeAudioData(await (await fetch(url)).arrayBuffer()));
        } catch (e) {
          console.warn(`[sound] could not load ${url}`, e);
        }
      }
      if (decoded.length) this.clips[slot] = decoded;
    }
    if (this.clips.wind) {
      // Recorded wind takes over from the synthesised wind, through the same muffling.
      this.windSynth.disconnect();
      this.loop(this.clips.wind[0], this.windFilter);
    }
    if (this.clips.music) {
      this.loop(this.clips.music[0], this.musicGain);
      this.applyMusic();
    }
  }

  /** Is there a recorded clip for this slot? */
  hasClip(slot: ClipSlot) {
    return !!this.clips[slot]?.length;
  }

  /** A random variant, never the same one twice running. */
  private pickClip(slot: ClipSlot) {
    const list = this.clips[slot];
    if (!list?.length) return null;
    let k = Math.floor(Math.random() * list.length);
    if (list.length > 1 && k === this.lastClip[slot]) k = (k + 1) % list.length;
    this.lastClip[slot] = k;
    return list[k];
  }

  /** Play a recorded clip. Returns false if no file was supplied for the slot. */
  playClip(slot: ClipSlot, opts: { gain?: number; rate?: number; at?: V3; delay?: number; reverb?: number } = {}) {
    const b = this.pickClip(slot);
    if (!b) return false;
    this.playBuffer(b, opts);
    return true;
  }

  setMusicOn(on: boolean) {
    this.musicOn = on;
    this.applyMusic();
  }
  /** Lessons keep the music, but well under the teacher's voice. */
  setLessonActive(on: boolean) {
    this.lessonDuck = on;
    this.applyMusic();
  }
  private applyMusic() {
    if (!this.ctx || !this.musicGain) return;
    const level = !this.musicOn || !this.clips.music ? 0 : this.lessonDuck ? 0.05 : 0.14;
    this.musicGain.gain.setTargetAtTime(level, this.ctx.currentTime, 1.5);
  }

  /** Duck or restore the ambience (e.g. "as quiet as an empty theatre"). */
  hush(on: boolean) {
    if (!this.ctx) return;
    this.amb.gain.setTargetAtTime(on ? 0.15 : 1, this.ctx.currentTime, on ? 0.6 : 1.2);
  }

  // ------------------------------------------------------------ buffers

  private makeImpulse(seconds: number, decay: number) {
    const ctx = this.ctx!;
    const n = Math.floor(ctx.sampleRate * seconds);
    const b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      const r = rand(7 + ch);
      for (let i = 0; i < n; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / n, decay) * (i < 400 ? i / 400 : 1);
    }
    return b;
  }

  private buf(seconds: number, fn: (t: number, i: number, sr: number) => number) {
    const ctx = this.ctx!;
    const sr = ctx.sampleRate;
    const n = Math.floor(sr * seconds);
    const b = ctx.createBuffer(1, n, sr);
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = fn(i / sr, i, sr);
    return b;
  }

  /** Stick-slip friction: a train of tiny resonant impulses at a varying rate. Sounds like old wood. */
  private makeCreak(seconds: number, seed: number, baseRate: number, pitch: number) {
    const ctx = this.ctx!;
    const sr = ctx.sampleRate;
    const n = Math.floor(sr * seconds);
    const b = ctx.createBuffer(1, n, sr);
    const d = b.getChannelData(0);
    const r = rand(seed);
    let t = 0.02;
    while (t < seconds - 0.05) {
      const p = t / seconds;
      const env = Math.sin(Math.PI * p) ** 0.7;
      const rate = baseRate * (0.6 + 0.9 * Math.sin(p * 5.1 + seed) ** 2) * (0.85 + r() * 0.3);
      const f = pitch * (0.85 + r() * 0.3) * (1 + 0.3 * Math.sin(p * 3));
      const start = Math.floor(t * sr);
      const amp = env * (0.5 + r() * 0.5);
      for (let k = 0; k < sr * 0.012 && start + k < n; k++) {
        const tt = k / sr;
        d[start + k] += amp * Math.sin(2 * Math.PI * f * tt) * Math.exp(-tt * 380) + amp * 0.3 * Math.sin(2 * Math.PI * f * 2.7 * tt) * Math.exp(-tt * 700);
      }
      t += 1 / rate;
    }
    let peak = 0;
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]));
    for (let i = 0; i < n; i++) d[i] /= peak || 1;
    return b;
  }

  private buildBuffers() {
    const r = rand(3);
    this.buffers.noise = this.buf(3, () => r() * 2 - 1);
    // Brown noise for room tone and wind
    let last = 0;
    this.buffers.brown = this.buf(4, () => {
      last = (last + 0.02 * (r() * 2 - 1)) / 1.02;
      return last * 3.5;
    });
    const tick = (f: number, seed: number) => {
      const rr = rand(seed);
      return this.buf(0.09, (t) => {
        const click = t < 0.004 ? (rr() * 2 - 1) * (1 - t / 0.004) : 0;
        return click * 0.6 + Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 90) * 0.5 + Math.sin(2 * Math.PI * f * 1.51 * t) * Math.exp(-t * 140) * 0.25;
      });
    };
    this.buffers.tick = tick(2300, 1);
    this.buffers.tock = tick(1850, 2);
    this.buffers.mantelTick = tick(3100, 3);
    this.buffers.mantelTock = tick(2700, 4);
    // Footsteps: eight recorded-style variants per surface, rendered by footstepSynth.ts
    for (const surface of ['wood', 'carpet', 'gravel'] as Surface[]) {
      for (let k = 0; k < 8; k++) {
        const data = renderFootstep(this.ctx!.sampleRate, surface, k);
        const b = this.ctx!.createBuffer(1, data.length, this.ctx!.sampleRate);
        b.getChannelData(0).set(data);
        this.buffers[`step-${surface}-${k}`] = b;
      }
    }
    for (let k = 0; k < 4; k++) this.buffers[`step${k}`] = this.buffers[`step-wood-${k}`];
    this.buffers.creakShort = this.makeCreak(0.7, 5, 90, 820);
    this.buffers.creakFloor = this.makeCreak(0.45, 9, 120, 640);
    this.buffers.creakDoor = this.makeCreak(1.9, 13, 55, 520);
    this.buffers.latch = this.buf(0.25, (t) => {
      const a = t < 0.003 ? r() * 2 - 1 : 0;
      const b = t > 0.07 && t < 0.075 ? r() * 2 - 1 : 0;
      return (a + b * 0.8) * 0.9 + Math.sin(2 * Math.PI * 1700 * t) * Math.exp(-t * 60) * 0.2;
    });
    this.buffers.thud = this.buf(0.5, (t) => Math.sin(2 * Math.PI * 55 * t) * Math.exp(-t * 14) + (r() * 2 - 1) * Math.exp(-t * 40) * 0.2);
    this.buffers.rattle = this.buf(0.5, (t) => {
      const hits = [0, 0.11, 0.2];
      let v = 0;
      for (const h of hits) if (t >= h) v += Math.sin(2 * Math.PI * 1300 * (t - h)) * Math.exp(-(t - h) * 70) + (t - h < 0.004 ? r() * 2 - 1 : 0);
      return v * 0.5;
    });
    this.buffers.mechanism = this.buf(1.6, (t) => {
      let v = 0;
      for (const h of [0, 0.18, 0.3, 0.52]) {
        if (t >= h) {
          const tt = t - h;
          v += (tt < 0.003 ? r() * 2 - 1 : 0) * 0.8 + Math.sin(2 * Math.PI * 2100 * tt) * Math.exp(-tt * 50) * 0.3;
        }
      }
      if (t > 0.6) {
        const tt = t - 0.6;
        v += (Math.sin(2 * Math.PI * 1480 * tt) * 0.5 + Math.sin(2 * Math.PI * 2380 * tt) * 0.3 + Math.sin(2 * Math.PI * 3720 * tt) * 0.2) * Math.exp(-tt * 3.5) * 0.4;
      }
      return v * 0.7;
    });
    this.buffers.shimmer = this.buf(3.2, (t) => {
      const env = Math.min(1, t / 0.4) * Math.exp(-t * 1.1);
      const fs = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      let v = 0;
      fs.forEach((f, i) => (v += Math.sin(2 * Math.PI * f * t + i) * (1 / (i + 1.5))));
      return v * env * 0.25;
    });
    this.buffers.mist = this.buf(1.4, (t) => {
      const env = Math.sin(Math.PI * Math.min(1, t / 1.4)) ** 2;
      return (r() * 2 - 1) * env * 0.4;
    });
    this.buffers.pop = this.buf(0.05, (t) => (r() * 2 - 1) * Math.exp(-t * 160));
    // Moth wings: papery noise bursts fluttering at 20 to 40 Hz, many wings at once,
    // swelling as the swarm comes closer, then gone.
    let hp = 0;
    let prev = 0;
    this.buffers.flutter = this.buf(2.8, (t) => {
      const n = r() * 2 - 1;
      hp = 0.82 * (hp + n - prev);
      prev = n;
      let am = 0;
      for (let k = 0; k < 6; k++) am += Math.max(0, Math.sin(2 * Math.PI * (19 + k * 3.7) * t + k * 1.9 + Math.sin(t * (3 + k)) * 2)) ** 3;
      const env = Math.min(1, t / 1.1) ** 2 * Math.max(0, 1 - Math.max(0, t - 1.7) / 1.1);
      return hp * (am / 3) * env * 0.5;
    });
    // A draught: wind swelling through a gap under a door
    let gl = 0;
    this.buffers.gust = this.buf(4, (t) => {
      gl = (gl + 0.06 * (r() * 2 - 1)) / 1.06;
      const env = Math.sin(Math.PI * Math.min(1, t / 4)) ** 1.5;
      return gl * 5 * env * (0.8 + 0.2 * Math.sin(t * 9));
    });
    // Thunder: brown-ish noise with a slow swell and a long rolling decay
    let tl = 0;
    this.buffers.thunder = this.buf(4.5, (t) => {
      tl = (tl + 0.03 * (r() * 2 - 1)) / 1.03;
      const env = Math.min(1, t / 0.25) * Math.exp(-t * 0.9) * (0.7 + 0.3 * Math.sin(t * 7 + Math.sin(t * 3) * 2));
      return tl * 6 * env;
    });
  }

  // ------------------------------------------------------------ ambience

  private loop(buffer: AudioBuffer, dest: AudioNode, rate = 1) {
    const s = this.ctx!.createBufferSource();
    s.buffer = buffer;
    s.loop = true;
    s.playbackRate.value = rate;
    s.connect(dest);
    s.start();
    return s;
  }

  private panner(pos: V3, refDistance = 1.5, rolloff = 1.4) {
    const p = this.ctx!.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'inverse';
    p.refDistance = refDistance;
    p.rolloffFactor = rolloff;
    p.maxDistance = 60;
    p.positionX.value = pos[0];
    p.positionY.value = pos[1];
    p.positionZ.value = pos[2];
    return p;
  }

  private startAmbience() {
    const ctx = this.ctx!;
    // Wind: brown noise through a moving band-pass
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.value = 900;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 400;
    band.Q.value = 0.7;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain).connect(band.frequency);
    lfo.start();
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.5;
    const gust = ctx.createOscillator();
    gust.frequency.value = 0.045;
    const gustGain = ctx.createGain();
    gustGain.gain.value = 0.18;
    gust.connect(gustGain).connect(this.windGain.gain);
    gust.start();
    this.loop(this.buffers.brown, band);
    this.windSynth = band;
    band.connect(this.windFilter);
    this.windFilter.connect(this.windGain).connect(this.amb);
    // Room tone
    this.roomGain = ctx.createGain();
    this.roomGain.gain.value = 0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 140;
    this.loop(this.buffers.brown, lp, 0.7);
    lp.connect(this.roomGain).connect(this.amb);
    // Positional sources
    this.hallClock = this.panner([2.55, 1.9, -9.7], 1.2, 1.1);
    this.hallClock.connect(this.amb);
    this.hallClock.connect(this.reverbSend);
    this.mantelClock = this.panner([4.0, 1.1, -25.75], 0.9, 1.3);
    this.mantelClock.connect(this.sfx);
    this.mantelClock.connect(this.reverbSend);
    this.fire = this.panner([5.6, 0.4, -4.6], 1.2, 1.5);
    this.fireGain = ctx.createGain();
    this.fireGain.gain.value = 0.12;
    const fireLp = ctx.createBiquadFilter();
    fireLp.type = 'lowpass';
    fireLp.frequency.value = 500;
    this.loop(this.buffers.brown, fireLp, 1.3);
    fireLp.connect(this.fireGain).connect(this.fire);
    this.fire.connect(this.amb);
    this.nextHallTick = ctx.currentTime + 0.2;
    this.nextMantelTick = ctx.currentTime + 0.3;
  }

  /** Look-ahead scheduler for clocks and fire crackle. */
  private schedule() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const horizon = ctx.currentTime + 0.25;
    while (this.nextHallTick < horizon) {
      if (!this.hallClockStopped) this.playAt(this.tickIndex % 2 ? this.buffers.tock : this.buffers.tick, this.hallClock, this.nextHallTick, 0.5);
      this.tickIndex++;
      this.nextHallTick += 1.0;
    }
    while (this.nextMantelTick < horizon) {
      const v = this.mantelVoice;
      if (v === 'footsteps') {
        const step = this.buffers[`step${this.mantelIndex % 4}`];
        this.playAt(step, this.mantelClock, this.nextMantelTick, 1.3, 0.85);
        this.nextMantelTick += 1.15;
      } else {
        const b = this.mantelIndex % 2 ? this.buffers.mantelTock : this.buffers.mantelTick;
        if (v !== 'silent') this.playAt(b, this.mantelClock, this.nextMantelTick, v === 'loud' ? 1.0 : 0.3);
        this.nextMantelTick += 0.5;
      }
      this.mantelIndex++;
    }
    while (this.nextCrackle < horizon) {
      if (this.zone === 'hall') this.playAt(this.buffers.pop, this.fire, this.nextCrackle, 0.15 + Math.random() * 0.4, 0.7 + Math.random() * 0.8);
      this.nextCrackle += 0.05 + Math.random() * 0.5;
    }
  }

  private playAt(buffer: AudioBuffer, dest: AudioNode, when: number, gain = 1, rate = 1) {
    const ctx = this.ctx!;
    const s = ctx.createBufferSource();
    s.buffer = buffer;
    s.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = gain;
    s.connect(g).connect(dest);
    s.start(when);
  }

  // ------------------------------------------------------------ one-shots

  private play(name: string, opts: { gain?: number; rate?: number; at?: V3; delay?: number; reverb?: number } = {}) {
    if (this.buffers[name]) this.playBuffer(this.buffers[name], opts);
  }

  private playBuffer(buffer: AudioBuffer, opts: { gain?: number; rate?: number; at?: V3; delay?: number; reverb?: number } = {}) {
    const ctx = this.ctx;
    if (!ctx) return;
    const s = ctx.createBufferSource();
    s.buffer = buffer;
    s.playbackRate.value = opts.rate ?? 1;
    const g = ctx.createGain();
    g.gain.value = opts.gain ?? 1;
    s.connect(g);
    if (opts.at) {
      const p = this.panner(opts.at, 1.5, 1);
      g.connect(p).connect(this.sfx);
      p.connect(this.reverbSend);
    } else {
      g.connect(this.sfx);
      const send = ctx.createGain();
      send.gain.value = opts.reverb ?? 0.4;
      g.connect(send).connect(this.reverbSend);
    }
    s.start(ctx.currentTime + (opts.delay ?? 0));
  }

  /**
   * One footfall. Never repeats the same variant twice in a row; alternate feet are
   * very slightly different in pitch, and level varies a little with walking speed.
   */
  footstep(speed = 1, surface: Surface = 'wood') {
    if (!this.footstepsOn) return;
    let k = Math.floor(Math.random() * 8);
    if (k === this.stepIndex) k = (k + 3) % 8;
    this.stepIndex = k;
    const foot = this.stepIndex % 2 ? 0.985 : 1.015;
    const base = surface === 'gravel' ? 0.13 : surface === 'carpet' ? 0.1 : 0.15;
    const recorded = surface === 'wood' ? 'step-wood' : surface === 'carpet' ? 'step-carpet' : null;
    if (recorded && this.hasClip(recorded)) {
      this.playClip(recorded, { gain: base * 2 * (0.85 + Math.random() * 0.25), rate: foot * (0.97 + Math.random() * 0.06), reverb: 0.4 });
      return;
    }
    this.play(`step-${surface}-${k}`, {
      gain: base * (0.85 + Math.random() * 0.25) * Math.min(1.2, 0.75 + speed * 0.25),
      rate: foot * (0.97 + Math.random() * 0.06),
      reverb: surface === 'gravel' ? 0.08 : 0.4,
    });
    if (Math.random() < 0.08) this.play('creakFloor', { gain: 0.12, rate: 0.8 + Math.random() * 0.4, delay: 0.05 });
  }
  doorOpen(at: V3, heavy = true) {
    this.play('latch', { at, gain: 0.7 });
    if (!this.playClip('door-creak', { at, gain: heavy ? 0.8 : 0.55, rate: heavy ? 0.95 : 1.08, delay: 0.12 }))
      this.play('creakDoor', { at, gain: heavy ? 0.45 : 0.3, rate: heavy ? 0.85 : 1.1, delay: 0.12 });
  }
  doorClose(at: V3) {
    this.play('creakShort', { at, gain: 0.25, rate: 0.9 });
    this.play('thud', { at, gain: 0.6, delay: 0.55 });
    this.play('latch', { at, gain: 0.5, delay: 0.58 });
  }
  locked(at: V3) {
    this.play('rattle', { at, gain: 0.6 });
  }
  mechanism(at?: V3) {
    this.play('mechanism', { at, gain: 0.8 });
  }
  shimmer(gain = 0.5) {
    this.play('shimmer', { gain, reverb: 0.8 });
  }
  mist() {
    this.play('mist', { gain: 0.35, rate: 0.7, reverb: 0.6 });
  }
  creak(at?: V3) {
    this.play('creakShort', { at, gain: 0.3, rate: 0.8 + Math.random() * 0.3 });
  }
  keyPickup() {
    this.play('latch', { gain: 0.35, rate: 1.6 });
    this.play('rattle', { gain: 0.25, rate: 1.8, delay: 0.08 });
  }
  /** A key turning in an old lock: scrape, then the bolt thrown. */
  unlockDoor(at: V3) {
    this.play('creakShort', { at, gain: 0.18, rate: 2.2 });
    this.play('latch', { at, gain: 0.6, rate: 0.8, delay: 0.35 });
    this.play('thud', { at, gain: 0.35, rate: 1.6, delay: 0.42 });
  }
  /** Distant thunder, heard through the walls. */
  thunder(at: V3, strength = 1) {
    this.play('thunder', { at, gain: 0.55 * strength, rate: 0.9 + Math.random() * 0.2 });
  }
  /** The whole house settling: a long low groan of timbers. */
  houseGroan() {
    this.play('creakDoor', { gain: 0.3, rate: 0.45, reverb: 1.0 });
  }
  /** A door closing quietly somewhere else in the house. */
  distantDoor(at: V3) {
    this.play('creakShort', { at, gain: 0.12, rate: 0.75 });
    this.play('thud', { at, gain: 0.22, delay: 0.5 });
    this.play('latch', { at, gain: 0.18, delay: 0.53 });
  }
  /** A board creaking under weight that is not yours. */
  distantCreak(at: V3) {
    this.play('creakFloor', { at, gain: 0.3, rate: 0.7 + Math.random() * 0.2 });
  }
  /** The swarm of moths bursting out of the painting toward the room. */
  mothSwarm() {
    this.play('flutter', { gain: 0.42, reverb: 0.25 });
    this.play('flutter', { gain: 0.25, rate: 1.18, delay: 0.25, reverb: 0.25 });
  }
  /** A draught finds its way through the house: candles bow, the curtains stir. */
  gust() {
    this.play('gust', { gain: 0.5, rate: 0.9 + Math.random() * 0.2, reverb: 0.5 });
  }
  /** Footsteps somewhere in an empty hall: used after the model simile is revealed. */
  distantSteps() {
    for (let i = 0; i < 5; i++) this.play(`step${i % 4}`, { gain: 0.35 - i * 0.03, rate: 0.85, delay: i * 1.1, reverb: 1.2 });
  }

  dispose() {
    if (this.schedTimer) clearInterval(this.schedTimer);
    void this.ctx?.close();
    this.ctx = null;
  }
}

export const audio = new AudioEngine();
