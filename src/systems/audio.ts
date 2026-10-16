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

/** What the player is walking on. Stone (the kitchen, the porch) has no synthesised steps of its own. */
export type StepSurface = Surface | 'stone';
import { CLIP_SLOTS, clipFiles, type ClipSlot } from './clips';
import { loudness, onsetTimes, peakTime } from './clipAnalysis';

type V3 = [number, number, number];
export type ClockVoice = 'tick' | 'loud' | 'footsteps' | 'silent';

/**
 * `strike`: start a recording part-way through, so its loudest moment (a heel strike) sounds this many seconds
 * after the call; anything before that point (a scuff) is skipped, with a short fade-in.
 * `highpass`: thin the sound out below this frequency (Hz).
 */
type PlayOpts = { gain?: number; rate?: number; at?: V3; delay?: number; reverb?: number; offset?: number; duration?: number; strike?: number; highpass?: number };

/** Every recorded one-shot is levelled when decoded so its loudest 50 ms sits here; CLIP_LEVEL then sets its place in the mix. */
const CLIP_REF = 10 ** (-18 / 20);
/**
 * When a footfall's heel strike should sound, in seconds after the movement system's footfall. Close to the
 * synthesised wood and carpet steps (strike 4-9 ms in); 20 ms keeps a sliver of each recording's lead-in before the strike.
 */
const STEP_STRIKE = 0.02;

/**
 * Levels for recorded clips. Prepared clips are peak-normalised to -3 dBFS, so each needs its own
 * level to sit where the synthesised sound it replaces sat (measured against the synth; see the Phase 6B report).
 */
// Measured 2026-10-16 in the browser against the engine's own synth buffers at their in-game gains (loudest 50 ms,
// after levelling to CLIP_REF). Matching values: step 0.21, carpet 0.17, door 0.82, book 0.48 (the whisper it
// replaced), creak 0.72, drip 1.28, tick 0.75, hall clock 0.62, fire 0.94 (RMS, loop).
// Set below the match on purpose: door-close (match 2.56) and unlock 0.75 (match 1.34), because the synth
// versions are dominated by a low thud classroom speakers cannot reproduce; drip 1.1, as the recording is very peaky.
// Phase 6C, measured at the master in the game (loudest ~45 ms): door-close lowered 1.44 → 0.9 so a closing door
// (-24 dBFS at 2 m) no longer outranks the lesson sounds (-23 to -38); the lesson tick-tock raised 0.75 → 1.2
// (-37 → -33 dBFS, now level with the drip, 14 dB over the ducked ambience); the stone stand-in 1.15 → 0.95
// (it measured 2.6 dB over the wood step). Footsteps above land at about your own steps' level, 4 dB over the hall's ambience.
const CLIP_LEVEL = { step: 0.21, carpet: 0.17, door: 0.8, doorClose: 0.9, book: 0.52, unlock: 0.75, creak: 0.72, drip: 1.1, tick: 1.2, above: 0.3, hallClock: 0.62, fire: 0.9, stoneStandIn: 0.95 };

/** Small random variation in level (±1.5 dB) and pitch (±pct), so a repeated recording never sounds identical. */
const vary = (pct = 0.04) => ({ gain: 10 ** ((Math.random() * 3 - 1.5) / 20), rate: 1 + (Math.random() * 2 - 1) * pct });

/** How much of the Entrance Hall's clock and fire reaches each zone (through its open doorways). */
const HALL_GATE: Partial<Record<Zone, number>> = { hall: 1, corridor: 0.45, exterior: 0.25, study: 0.3, kitchen: 0.3 };

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
  private hallGate!: GainNode;
  private fireGain!: GainNode;
  private schedTimer: number | null = null;
  private nextHallTick = 0;
  private nextMantelTick = 0;
  private nextCrackle = 0;
  private tickIndex = 0;
  private mantelIndex = 0;
  mantelVoice: ClockVoice = 'tick';
  private clockStopped = false;
  /** Set by the house's strange events: the hall clock holds its breath. */
  get hallClockStopped() {
    return this.clockStopped;
  }
  set hallClockStopped(v: boolean) {
    this.clockStopped = v;
    if (this.ctx && this.hallClockClip) this.hallClockClip.gain.setTargetAtTime(v ? 0 : CLIP_LEVEL.hallClock, this.ctx.currentTime, 0.04);
  }
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
    this.hallGate.gain.setTargetAtTime(HALL_GATE[zone] ?? 0, t, 0.6);
  }

  // ------------------------------------------------------------ recorded clips

  /**
   * Decode clips in tiers rather than all at once: `core` slots straight after the first click,
   * `idle` slots one at a time a little later, `demand` slots the first time they are wanted.
   * Until a slot is decoded, its synthesised sound plays instead.
   */
  private loadClips() {
    const urls = clipFiles();
    this.clipUrls = urls;
    const present = Object.keys(urls) as ClipSlot[];
    const core = present.filter((s) => CLIP_SLOTS[s].tier === 'core');
    const idle = present.filter((s) => CLIP_SLOTS[s].tier === 'idle');
    void (async () => {
      for (const s of core) await this.loadSlot(s);
      // Leave the first seconds of play to the renderer, then decode the rest gently.
      await new Promise((r) => setTimeout(r, 4000));
      for (const s of idle) {
        await this.loadSlot(s);
        await new Promise((r) => setTimeout(r, 250));
      }
    })();
  }

  private clipUrls: Partial<Record<ClipSlot, string[]>> = {};
  private loading: Partial<Record<ClipSlot, Promise<boolean>>> = {};
  /** Per recording: level trim to CLIP_REF, and seconds to its loudest moment. */
  private clipInfo = new WeakMap<AudioBuffer, { trim: number; peakAt: number }>();

  /** Fetch and decode one slot's files (once). Resolves true if at least one decoded. */
  loadSlot(slot: ClipSlot): Promise<boolean> {
    const ctx = this.ctx;
    if (!ctx) return Promise.resolve(false);
    return (this.loading[slot] ??= (async () => {
      const decoded: AudioBuffer[] = [];
      for (const url of this.clipUrls[slot] ?? []) {
        try {
          decoded.push(await ctx.decodeAudioData(await (await fetch(url)).arrayBuffer()));
        } catch (e) {
          console.warn(`[sound] could not load ${url}`, e);
        }
      }
      if (!decoded.length) return false;
      for (const b of decoded) {
        const d = b.getChannelData(0);
        const loop = CLIP_SLOTS[slot].use === 'loop';
        this.clipInfo.set(b, { trim: loop ? 1 : Math.min(4, CLIP_REF / Math.max(1e-4, loudness(d, b.sampleRate))), peakAt: peakTime(d, b.sampleRate) });
      }
      this.clips[slot] = decoded;
      this.onClipReady(slot);
      return true;
    })());
  }

  /** Loops switch from their synthesised version to the recording as soon as it is decoded. */
  private onClipReady(slot: ClipSlot) {
    const b = this.clips[slot]![0];
    if (slot === 'wind') {
      // Recorded wind takes over from the synthesised wind, through the same muffling.
      this.windSynth.disconnect();
      this.loop(b, this.windFilter, 1, true);
    }
    if (slot === 'music') {
      this.loop(b, this.musicGain, 1, true);
      this.applyMusic();
    }
    if (slot === 'clock-grandfather') {
      this.hallClockClip = this.ctx!.createGain();
      this.hallClockClip.gain.value = this.hallClockStopped ? 0 : CLIP_LEVEL.hallClock;
      this.hallClockClip.connect(this.hallClock);
      this.loop(b, this.hallClockClip, 1, true);
    }
    if (slot === 'fire') {
      // The recording replaces the noise-and-pops fire; the synth source is silenced, not rebuilt.
      this.fireGain.gain.setTargetAtTime(0, this.ctx!.currentTime, 0.3);
      this.fireClip = this.ctx!.createGain();
      this.fireClip.gain.value = CLIP_LEVEL.fire;
      this.fireClip.connect(this.fire);
      this.loop(b, this.fireClip, 1, true);
    }
  }
  private hallClockClip: GainNode | null = null;
  private fireClip: GainNode | null = null;

  /** Is there a decoded recorded clip for this slot? (Asks a `demand` slot to start loading.) */
  hasClip(slot: ClipSlot) {
    if (!this.clips[slot]?.length && this.clipUrls[slot] && CLIP_SLOTS[slot].tier === 'demand') void this.loadSlot(slot);
    return !!this.clips[slot]?.length;
  }

  /** For tests and the teacher: which slots have files, and which are decoded. */
  clipStatus() {
    return Object.fromEntries((Object.keys(CLIP_SLOTS) as ClipSlot[]).map((s) => [s, { files: this.clipUrls[s]?.length ?? 0, decoded: this.clips[s]?.length ?? 0 }]));
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

  /**
   * Play a recorded clip. Returns false if no file was supplied for the slot.
   * A rare-event (`demand`) clip that is not decoded yet is loaded now and played as soon as it is ready
   * (a fraction of a second), so the first time an event happens it is heard.
   */
  playClip(slot: ClipSlot, opts: PlayOpts = {}) {
    if (!this.hasClip(slot)) {
      if (CLIP_SLOTS[slot].tier !== 'demand' || !this.clipUrls[slot]?.length) return false;
      const asked = performance.now();
      void this.loadSlot(slot).then((ok) => {
        if (ok && performance.now() - asked < 3000) this.playClip(slot, opts);
      });
      return true;
    }
    // At most two of the same recording at once: a third is dropped rather than piling up.
    const live = this.voices[slot] ?? 0;
    if (live >= 2) return true;
    const b = this.pickClip(slot)!;
    const info = this.clipInfo.get(b);
    let { delay = 0, offset } = opts;
    if (opts.strike != null && info) {
      // Line the heel strike up with the footfall: skip what comes before it, or wait if it comes sooner.
      const rate = opts.rate ?? 1;
      offset = Math.max(0, info.peakAt - opts.strike * rate);
      delay += Math.max(0, opts.strike - info.peakAt / rate);
    }
    const src = this.playBuffer(b, { ...opts, gain: (opts.gain ?? 1) * (info?.trim ?? 1), delay, offset });
    if (src) {
      this.voices[slot] = live + 1;
      src.onended = () => (this.voices[slot] = Math.max(0, (this.voices[slot] ?? 1) - 1));
    }
    return true;
  }
  private voices: Partial<Record<ClipSlot, number>> = {};

  setMusicOn(on: boolean) {
    this.musicOn = on;
    this.applyMusic();
  }
  /** Lessons keep the music, but well under the teacher's voice. */
  setLessonActive(on: boolean) {
    this.lessonDuck = on;
    this.applyMusic();
    this.applyAmb();
  }
  private hushed = false;
  /** Ambience (wind, room tone, the hall clock and fire) sits about 6 dB lower while a lesson is open. */
  private applyAmb() {
    if (!this.ctx) return;
    const level = (this.hushed ? 0.15 : 1) * (this.lessonDuck ? 0.5 : 1);
    this.amb.gain.setTargetAtTime(level, this.ctx.currentTime, this.hushed ? 0.6 : 1.2);
  }
  private applyMusic() {
    if (!this.ctx || !this.musicGain) return;
    const level = !this.musicOn || !this.clips.music ? 0 : this.lessonDuck ? 0.05 : 0.14;
    this.musicGain.gain.setTargetAtTime(level, this.ctx.currentTime, 1.5);
  }

  /** Duck or restore the ambience (e.g. "as quiet as an empty theatre"). */
  hush(on: boolean) {
    this.hushed = on;
    this.applyAmb();
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
    // A giant's rumble: very low, slowly wavering, like a stomach or distant furniture dragged
    let rl = 0;
    this.buffers.rumble = this.buf(3, (t) => {
      rl = (rl + 0.012 * (r() * 2 - 1)) / 1.012;
      const env = Math.sin(Math.PI * Math.min(1, t / 3)) ** 1.2;
      return (rl * 9 + Math.sin(2 * Math.PI * (38 + 6 * Math.sin(t * 2.3)) * t) * 0.35) * env * (0.7 + 0.3 * Math.sin(t * 5.7));
    });
    // Cutlery and plates rattling on a table: a scatter of small metallic pings
    this.buffers.clink = this.buf(1.1, (t) => {
      let v = 0;
      for (let k = 0; k < 9; k++) {
        const h = k * 0.11 + (k % 3) * 0.017;
        if (t < h) continue;
        const tt = t - h;
        const f = 2400 + ((k * 977) % 1900);
        v += (Math.sin(2 * Math.PI * f * tt) + 0.5 * Math.sin(2 * Math.PI * f * 2.63 * tt)) * Math.exp(-tt * 38) * (1 - k / 11);
      }
      return v * 0.3;
    });
    // A water drop into a metal bucket: a rising "plink" and a tiny ring
    this.buffers.drip = this.buf(0.5, (t) => {
      const f = 900 + 1400 * Math.min(1, t / 0.03);
      return Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 28) * 0.7 + Math.sin(2 * Math.PI * 2650 * t) * Math.exp(-t * 9) * 0.12;
    });
    // A steady hiss of air, as from a gramophone horn
    let hp2 = 0;
    let pv2 = 0;
    this.buffers.hiss = this.buf(1.8, (t) => {
      const n = r() * 2 - 1;
      hp2 = 0.9 * (hp2 + n - pv2);
      pv2 = n;
      const env = Math.min(1, t / 0.15) * Math.min(1, (1.8 - t) / 0.4);
      return hp2 * env * 0.35 * (0.85 + 0.15 * Math.sin(t * 40));
    });
    // Something heavy into deep water
    let sl = 0;
    this.buffers.splash = this.buf(1.4, (t) => {
      sl = (sl + 0.25 * (r() * 2 - 1)) / 1.25;
      return (sl * 2.2 * Math.exp(-t * 4) + Math.sin(2 * Math.PI * 70 * t) * Math.exp(-t * 9) * 0.5) * Math.min(1, t / 0.01);
    });
    // Knuckles on hollow wood: two raps
    this.buffers.knock = this.buf(0.7, (t) => {
      let v = 0;
      for (const h of [0, 0.32]) {
        if (t < h) continue;
        const tt = t - h;
        v += Math.sin(2 * Math.PI * 180 * tt) * Math.exp(-tt * 38) + Math.sin(2 * Math.PI * 410 * tt) * Math.exp(-tt * 60) * 0.5 + (tt < 0.004 ? (r() * 2 - 1) * 0.6 : 0);
      }
      return v * 0.6;
    });
    // The printing press: a heavy iron thump with a short clank
    this.buffers.thump = this.buf(0.6, (t) => Math.sin(2 * Math.PI * 62 * t) * Math.exp(-t * 16) + Math.sin(2 * Math.PI * 1150 * t) * Math.exp(-t * 45) * 0.25 + (t < 0.006 ? (r() * 2 - 1) * 0.5 : 0));
    // A soft whispered "sss", like type sliding into a tray
    let ws = 0;
    this.buffers.whisperS = this.buf(0.9, (t) => {
      const n = r() * 2 - 1;
      ws = 0.5 * ws + 0.5 * n;
      const env = Math.sin(Math.PI * Math.min(1, t / 0.9)) ** 2;
      return (n - ws) * env * 0.4;
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

  private loop(buffer: AudioBuffer, dest: AudioNode, rate = 1, randomStart = false) {
    const s = this.ctx!.createBufferSource();
    s.buffer = buffer;
    s.loop = true;
    s.playbackRate.value = rate;
    s.connect(dest);
    // Recorded loops start at a random point, so two visits never begin identically.
    s.start(0, randomStart ? Math.random() * buffer.duration : 0);
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
    // The hall's clock and fire pass through one gate that follows the zone (see setZone):
    // full in the hall, faint through open doorways next to it, silent elsewhere in the house.
    this.hallGate = ctx.createGain();
    this.hallGate.gain.value = HALL_GATE[this.zone] ?? 0;
    this.hallGate.connect(this.amb);
    const hallRev = ctx.createGain();
    hallRev.gain.value = 0.6;
    this.hallGate.connect(hallRev).connect(this.reverbSend);
    this.hallClock = this.panner([2.55, 1.9, -9.7], 1.2, 1.1);
    this.hallClock.connect(this.hallGate);
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
    this.fire.connect(this.hallGate);
    this.nextHallTick = ctx.currentTime + 0.2;
    this.nextMantelTick = ctx.currentTime + 0.3;
  }

  /** Look-ahead scheduler for clocks and fire crackle. */
  private schedule() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const horizon = ctx.currentTime + 0.25;
    while (this.nextHallTick < horizon) {
      if (!this.hallClockStopped && !this.hallClockClip) this.playAt(this.tickIndex % 2 ? this.buffers.tock : this.buffers.tick, this.hallClock, this.nextHallTick, 0.5);
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
      if (this.zone === 'hall' && !this.fireClip) this.playAt(this.buffers.pop, this.fire, this.nextCrackle, 0.15 + Math.random() * 0.4, 0.7 + Math.random() * 0.8);
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

  private playBuffer(buffer: AudioBuffer, opts: PlayOpts = {}) {
    const ctx = this.ctx;
    if (!ctx) return;
    const s = ctx.createBufferSource();
    s.buffer = buffer;
    s.playbackRate.value = opts.rate ?? 1;
    const g = ctx.createGain();
    g.gain.value = opts.gain ?? 1;
    if (opts.highpass) {
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = opts.highpass;
      s.connect(hp).connect(g);
    } else s.connect(g);
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
    const when = ctx.currentTime + (opts.delay ?? 0);
    if (opts.offset && !opts.duration) {
      // Starting part-way into a recording: a 5 ms fade-in, so the cut never clicks.
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(opts.gain ?? 1, when + 0.005);
    }
    if (opts.duration) {
      // Fade out a partial play (a few seconds of a loop) instead of cutting it off.
      g.gain.setValueAtTime(opts.gain ?? 1, when + opts.duration - 0.15);
      g.gain.linearRampToValueAtTime(0, when + opts.duration);
      s.start(when, opts.offset ?? 0, opts.duration);
    } else s.start(when, opts.offset ?? 0);
    return s;
  }

  /**
   * One footfall. Never repeats the same variant twice in a row; alternate feet are
   * very slightly different in pitch, and level varies a little with walking speed.
   */
  footstep(speed = 1, surface: StepSurface = 'wood') {
    if (!this.footstepsOn) return;
    let k = Math.floor(Math.random() * 8);
    if (k === this.stepIndex) k = (k + 3) % 8;
    this.stepIndex = k;
    const foot = this.stepIndex % 2 ? 0.985 : 1.015;
    const base = surface === 'gravel' ? 0.13 : surface === 'carpet' ? 0.1 : 0.15;
    const pace = Math.min(1.2, 0.75 + speed * 0.25);
    // Stone flags: a stone recording if there is one. Until then, a stand-in: the wood step pitched up and
    // thinned below 300 Hz (where a board's hollow body sounds), drier. It is not a stone recording.
    const stone = surface === 'stone';
    const slot: ClipSlot | null = surface === 'wood' ? 'step-wood' : surface === 'carpet' ? 'step-carpet' : stone ? (this.hasClip('step-stone') ? 'step-stone' : 'step-wood') : null;
    if (slot && this.hasClip(slot)) {
      const v = vary(0.04);
      const standIn = stone && slot === 'step-wood';
      this.playClip(slot, {
        gain: (surface === 'carpet' ? CLIP_LEVEL.carpet : CLIP_LEVEL.step * (standIn ? CLIP_LEVEL.stoneStandIn : 1)) * v.gain * pace,
        rate: foot * v.rate * (standIn ? 1.12 : 1),
        highpass: standIn ? 300 : undefined,
        reverb: standIn ? 0.25 : 0.4,
        strike: STEP_STRIKE,
      });
      if (surface === 'wood' && Math.random() < 0.05) this.creakUnderfoot();
      return;
    }
    if (stone) surface = 'wood';
    this.play(`step-${surface}-${k}`, {
      gain: base * (0.85 + Math.random() * 0.25) * Math.min(1.2, 0.75 + speed * 0.25),
      rate: foot * (0.97 + Math.random() * 0.06),
      reverb: surface === 'gravel' ? 0.08 : 0.4,
    });
    if (Math.random() < 0.08) this.creakUnderfoot();
  }
  /** Now and then a board gives under a step. */
  private creakUnderfoot() {
    if (!this.playClip('creak-floor', { gain: CLIP_LEVEL.creak * 0.45, rate: 0.85 + Math.random() * 0.3, delay: 0.05, reverb: 0.4 }))
      this.play('creakFloor', { gain: 0.12, rate: 0.8 + Math.random() * 0.4, delay: 0.05 });
  }
  /** A recording replaces the whole synthesised stack (latch + creak), so the two never double up. */
  doorOpen(at: V3, heavy = true) {
    const v = vary(0.03);
    if (this.playClip('door-open', { at, gain: CLIP_LEVEL.door * (heavy ? 1 : 0.8) * v.gain, rate: (heavy ? 0.96 : 1.06) * v.rate })) return;
    this.play('latch', { at, gain: 0.7 });
    if (!this.playClip('door-creak', { at, gain: heavy ? 0.8 : 0.55, rate: heavy ? 0.95 : 1.08, delay: 0.12 }))
      this.play('creakDoor', { at, gain: heavy ? 0.45 : 0.3, rate: heavy ? 0.85 : 1.1, delay: 0.12 });
  }
  doorClose(at: V3) {
    const v = vary(0.03);
    if (this.playClip('door-close', { at, gain: CLIP_LEVEL.doorClose * v.gain, rate: v.rate })) return;
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
  /**
   * A key turning in an old lock: scrape, then the bolt thrown. Returns how long (ms) to wait before
   * the door or lid opens: as the bolt is thrown (the door-open recording starts with the handle, so the two run on naturally).
   */
  unlockDoor(at: V3) {
    const rate = vary(0.02).rate;
    if (this.playClip('unlock', { at, gain: CLIP_LEVEL.unlock, rate })) {
      const bolt = this.clips.unlock!.reduce((t, b) => Math.max(t, this.clipInfo.get(b)?.peakAt ?? 0), 0) / rate;
      return Math.max(1100, Math.round((bolt + 0.05) * 1000));
    }
    this.play('creakShort', { at, gain: 0.18, rate: 2.2 });
    this.play('latch', { at, gain: 0.6, rate: 0.8, delay: 0.35 });
    this.play('thud', { at, gain: 0.35, rate: 1.6, delay: 0.42 });
    return 1100;
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
    if (this.playClip('door-close', { at, gain: CLIP_LEVEL.doorClose * 0.35, rate: 0.92, reverb: 0.8 })) return;
    this.play('creakShort', { at, gain: 0.12, rate: 0.75 });
    this.play('thud', { at, gain: 0.22, delay: 0.5 });
    this.play('latch', { at, gain: 0.18, delay: 0.53 });
  }
  /** A board creaking under weight that is not yours. */
  distantCreak(at: V3) {
    if (this.playClip('creak-floor', { at, gain: CLIP_LEVEL.creak, rate: 0.8 + Math.random() * 0.2 })) return;
    this.play('creakFloor', { at, gain: 0.3, rate: 0.7 + Math.random() * 0.2 });
  }
  /**
   * A book falling open on a desk (the Scholar's Study evidence). With no recording,
   * the study keeps its original soft whispered "sss".
   */
  book(at: V3) {
    if (!this.playClip('book', { at, gain: CLIP_LEVEL.book * vary().gain, rate: vary(0.03).rate })) this.whisperS(at);
  }
  /** Slow steps crossing the floor above (heard through the ceiling). Returns false if there is no recording. */
  footstepsAbove(at: V3) {
    return this.playClip('footsteps-above', { at, gain: CLIP_LEVEL.above });
  }
  /** A page turning (the Lady's letter). Silent until a page recording is supplied. */
  page(at: V3) {
    this.playClip('page', { at, gain: CLIP_LEVEL.book * 0.8, rate: vary(0.05).rate });
  }
  /** The swarm of moths bursting out of the painting toward the room. */
  mothSwarm() {
    this.play('flutter', { gain: 0.42, reverb: 0.25 });
    this.play('flutter', { gain: 0.25, rate: 1.18, delay: 0.25, reverb: 0.25 });
  }
  /** A draught finds its way through the house: candles bow, the curtains stir. */
  gust() {
    // 0.2 (was 0.5): at 0.5 the gust was the loudest sound in the house (-18 dBFS), above every lesson sound.
    this.play('gust', { gain: 0.2, rate: 0.9 + Math.random() * 0.2, reverb: 0.5 });
  }
  /** A deep rumble from the giant's end of the dining room. */
  giantRumble(at: V3, strength = 1) {
    this.play('rumble', { at, gain: 0.7 * strength, rate: 0.85 + Math.random() * 0.15 });
  }
  /** Plates and cutlery rattling on the table. */
  cutleryRattle(at: V3, strength = 1) {
    this.play('clink', { at, gain: 0.35 * strength, rate: 0.9 + Math.random() * 0.2 });
  }
  private musicBoxOut: GainNode | null = null;

  /**
   * The nursery's music box. Each performance is a few bars of an original tune played on
   * bell-like tines (a sine plus an inharmonic overtone, each note ringing down).
   *  cheerful: quick and bright · dance: skipping · lullaby: slows, sags in pitch and stops
   *  plain: evenly spaced notes, no tune · hum: a few quiet notes · two: just two notes, far off
   */
  musicBox(kind: 'cheerful' | 'dance' | 'lullaby' | 'plain' | 'hum' | 'two', at: V3, gain = 1) {
    const ctx = this.ctx;
    if (!ctx) return;
    this.stopMusicBox();
    const out = ctx.createGain();
    out.gain.value = gain;
    const p = this.panner(at, 1.0, 1.1);
    out.connect(p).connect(this.sfx);
    p.connect(this.reverbSend);
    this.musicBoxOut = out;
    const C5 = 523.25;
    const f = (semi: number) => C5 * Math.pow(2, semi / 12);
    const tune = [4, 7, 12, 11, 7, 4, 5, 7, 4, 0, 2, 4, 2, -1, 0];
    let notes: { s: number; t: number; v: number; bend?: number }[] = [];
    if (kind === 'cheerful') notes = [0, 4, 7, 12, 7, 4, 0, 4, 7, 12, 16, 12, 7, 4, 12].map((s, i) => ({ s: s + 7, t: i * 0.14, v: 0.9 }));
    if (kind === 'dance') notes = tune.map((s, i) => ({ s: s + 12, t: Math.floor(i / 2) * 0.42 + (i % 2) * 0.28, v: i % 2 ? 0.6 : 1 }));
    if (kind === 'lullaby') {
      let t = 0;
      notes = tune.slice(0, 12).map((s, i) => {
        const n = { s, t, v: 1 - i * 0.05, bend: -0.25 * (i / 11) ** 2 };
        t += 0.5 + i * 0.09 + (i > 8 ? (i - 8) * 0.35 : 0);
        return n;
      });
    }
    if (kind === 'plain') notes = [0, 2, 4, 5, 7].map((s, i) => ({ s, t: i * 0.5, v: 0.8 }));
    if (kind === 'hum') notes = tune.slice(0, 6).map((s, i) => ({ s, t: i * 0.55, v: 0.45 }));
    if (kind === 'two') notes = [{ s: 7, t: 0, v: 0.6 }, { s: 4, t: 0.62, v: 0.5 }];
    const t0 = ctx.currentTime + 0.05;
    for (const n of notes) {
      const freq = f(n.s) * Math.pow(2, (n.bend ?? 0) / 12);
      const start = t0 + n.t;
      for (const [mult, amp, decay] of [
        [1, 0.32, 1.6],
        [3.9, 0.07, 5],
      ] as const) {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = freq * mult;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(amp * n.v, start + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, start + decay);
        o.connect(g).connect(out);
        o.start(start);
        o.stop(start + decay + 0.05);
      }
    }
  }
  stopMusicBox() {
    const ctx = this.ctx;
    if (!ctx || !this.musicBoxOut) return;
    this.musicBoxOut.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
    const old = this.musicBoxOut;
    window.setTimeout(() => old.disconnect(), 1500);
    this.musicBoxOut = null;
  }
  /** Sounds for the Chamber of Echoes and the later rooms. `n` repeats the sound a few times. */
  drip(at: V3, n = 3) {
    if (this.hasClip('drip')) {
      for (let i = 0; i < n; i++) this.playClip('drip', { at, gain: CLIP_LEVEL.drip * vary().gain, rate: vary(0.05).rate, delay: i * 0.85 });
      return;
    }
    for (let i = 0; i < n; i++) this.play('drip', { at, gain: 0.55, rate: 0.95 + Math.random() * 0.1, delay: i * 0.85 });
  }
  hiss(at: V3) {
    this.play('hiss', { at, gain: 0.5 });
  }
  private clockTicks: number[] | null = null;
  tickTock(at: V3, n = 6) {
    const clock = this.clips['clock-tick']?.[0];
    if (clock) {
      // A few seconds of the recorded clock, the same length as the synthesised tick-tock,
      // starting just before one of its ticks (never part-way through a tick).
      const len = Math.min(clock.duration, n * 0.5);
      this.clockTicks ??= onsetTimes(clock.getChannelData(0), clock.sampleRate);
      const starts = this.clockTicks.filter((t) => t >= 0.03 && t - 0.03 + len <= clock.duration);
      const offset = starts.length ? starts[Math.floor(Math.random() * starts.length)] - 0.03 : 0;
      this.playBuffer(clock, { at, gain: CLIP_LEVEL.tick * (this.clipInfo.get(clock)?.trim ?? 1), offset, duration: len });
      return;
    }
    for (let i = 0; i < n; i++) this.play(i % 2 ? 'tock' : 'tick', { at, gain: 0.7, delay: i * 0.5 });
  }
  creakLong(at: V3) {
    this.play('creakDoor', { at, gain: 0.5, rate: 0.75 });
  }
  knock(at: V3) {
    this.play('knock', { at, gain: 0.8 });
  }
  thudFar(at: V3) {
    this.play('thud', { at, gain: 0.7, rate: 0.85 });
  }
  splash(at: V3) {
    this.play('splash', { at, gain: 0.6 });
  }
  pressThump(at: V3, n = 1, gap = 0.55) {
    for (let i = 0; i < n; i++) this.play('thump', { at, gain: 0.6, rate: 0.95 + Math.random() * 0.1, delay: i * gap });
  }
  whisperS(at: V3) {
    this.play('whisperS', { at, gain: 0.45, rate: 0.9 + Math.random() * 0.2 });
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
