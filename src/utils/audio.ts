/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class AudioSynthManager {
  private ctx: AudioContext | null = null;
  private ambientOscillators: { osc: OscillatorNode; gain: GainNode }[] = [];
  private isPlayingAmbient = false;

  private initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Play a soft, beautiful ambient chime (bell) for alerts
  playChime() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const destination = this.ctx.destination;

      // Primary tone
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, now); // A4
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.05); // Elegant rise

      // Harmonic tone (bell overtone)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1320, now); // E6 harmonic

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.2, now + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

      gain2.gain.setValueAtTime(0, now);
      gain2.gain.linearRampToValueAtTime(0.06, now + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

      osc1.connect(gain1);
      gain1.connect(destination);

      osc2.connect(gain2);
      gain2.connect(destination);

      osc1.start(now);
      osc2.start(now);

      osc1.stop(now + 2.6);
      osc2.stop(now + 1.6);
    } catch (e) {
      console.error('Failed to play chime audio', e);
    }
  }

  // Play a low, soothing ambient Tibetan singing bowl drone for meditations
  startAmbientDrone() {
    if (this.isPlayingAmbient) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      this.isPlayingAmbient = true;
      const now = this.ctx.currentTime;

      // We'll create a multi-layered drone using low frequencies
      const frequencies = [110, 165, 220, 275]; // Root (A2), Fifth (E3), Octave (A3), Third (C#4)
      
      this.ambientOscillators = frequencies.map((freq, index) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        
        osc.type = index % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        
        // Add subtle pitch modulation (vibrato)
        const lfo = this.ctx!.createOscillator();
        const lfoGain = this.ctx!.createGain();
        lfo.frequency.setValueAtTime(0.2 + index * 0.05, now); // slow wave
        lfoGain.gain.setValueAtTime(0.5 + index * 0.2, now);
        
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start(now);

        // Low volume overall
        gain.gain.setValueAtTime(0, now);
        // Fade in over 3 seconds
        gain.gain.linearRampToValueAtTime(0.05 / frequencies.length, now + 3.0);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now);

        // Keep a reference to stop them later
        return { osc, gain };
      });
    } catch (e) {
      console.error('Failed to start ambient drone', e);
    }
  }

  stopAmbientDrone() {
    if (!this.isPlayingAmbient) return;
    try {
      const now = this.ctx ? this.ctx.currentTime : 0;
      this.ambientOscillators.forEach(({ osc, gain }) => {
        if (this.ctx) {
          // Fade out over 1.5 seconds
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(gain.gain.value, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
          osc.stop(now + 1.6);
        } else {
          osc.stop();
        }
      });
      this.ambientOscillators = [];
      this.isPlayingAmbient = false;
    } catch (e) {
      console.error('Failed to stop ambient drone', e);
    }
  }
}

export const audioSynth = new AudioSynthManager();
