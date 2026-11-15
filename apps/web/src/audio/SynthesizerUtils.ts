/**
 * Dhamrai Life — Web Audio Synthesizer Utilities
 * ===============================================
 * Mathematical helpers and procedural buffer generators for Web Audio API synthesis.
 * All waveforms and noise buffers are 100% procedurally generated with zero external assets.
 */

/**
 * Clamps a numeric value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Generates a pink noise AudioBuffer using Paul Kellet's filtered noise method.
 * Pink noise has a 1/f spectral density (-3 dB/octave), giving it an organic,
 * warm acoustic quality ideal for wheel friction, road rumble, and wind beds.
 */
export function createPinkNoiseBuffer(ctx: AudioContext, durationSeconds = 2.0): AudioBuffer {
  const sampleRate = ctx.sampleRate || 44100;
  const frameCount = Math.floor(sampleRate * durationSeconds);
  const buffer = ctx.createBuffer(1, frameCount, sampleRate);
  const data = buffer.getChannelData(0);

  let b0 = 0.0;
  let b1 = 0.0;
  let b2 = 0.0;
  let b3 = 0.0;
  let b4 = 0.0;
  let b5 = 0.0;
  let b6 = 0.0;

  for (let i = 0; i < frameCount; i++) {
    const white = Math.random() * 2.0 - 1.0;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    b6 = white * 0.115926;
    data[i] = pink * 0.11; // Normalize gain
  }

  return buffer;
}

/**
 * Generates a white noise AudioBuffer for crisp transients, hiss, and mechanical clicks.
 */
export function createWhiteNoiseBuffer(ctx: AudioContext, durationSeconds = 1.0): AudioBuffer {
  const sampleRate = ctx.sampleRate || 44100;
  const frameCount = Math.floor(sampleRate * durationSeconds);
  const buffer = ctx.createBuffer(1, frameCount, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < frameCount; i++) {
    data[i] = Math.random() * 2.0 - 1.0;
  }

  return buffer;
}
