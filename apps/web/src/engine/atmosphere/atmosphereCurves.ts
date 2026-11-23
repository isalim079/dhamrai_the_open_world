/**
 * Pure atmosphere sampling curves for Milestone 12.
 * t ∈ [0, 1): 0 = midnight, 0.25 ≈ dawn, 0.5 = noon, 0.75 ≈ dusk.
 */

export type DayPhase = 'night' | 'dawn' | 'day' | 'dusk';

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface AtmosphereSample {
  phase: DayPhase;
  /** Night-likeness 0 (full day) … 1 (deep night) — drives lamps/headlight/audio. */
  nightFactor: number;
  sunElevation: number;
  sunAzimuth: number;
  sunIntensity: number;
  sunColor: Rgb;
  ambientIntensity: number;
  ambientColor: Rgb;
  hemiSkyColor: Rgb;
  hemiGroundColor: Rgb;
  hemiIntensity: number;
  skyColor: Rgb;
  fogColor: Rgb;
  fogDensity: number;
  exposure: number;
}

function wrap01(t: number): number {
  const x = t % 1;
  return x < 0 ? x + 1 : x;
}

function lerp(a: number, b: number, u: number): number {
  return a + (b - a) * u;
}

function lerpRgb(a: Rgb, b: Rgb, u: number): Rgb {
  return { r: lerp(a.r, b.r, u), g: lerp(a.g, b.g, u), b: lerp(a.b, b.b, u) };
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function getDayPhase(t: number): DayPhase {
  const x = wrap01(t);
  if (x < 0.2 || x >= 0.85) return 'night';
  if (x < 0.3) return 'dawn';
  if (x < 0.7) return 'day';
  return 'dusk';
}

/** Night factor: 1 at midnight, 0 at noon. */
export function getNightFactor(t: number): number {
  const x = wrap01(t);
  // Peak night around 0 and 1; zero across midday band
  if (x >= 0.3 && x <= 0.7) return 0;
  if (x < 0.3) return 1 - smoothstep(0.2, 0.3, x);
  return smoothstep(0.7, 0.85, x);
}

/**
 * Sun direction on a unit sphere. Elevation: -π/2 (nadir) … +π/2 (zenith).
 * Azimuth 0 = +X, increases toward +Z (engine right-handed).
 */
export function getSunSpherical(t: number): { elevation: number; azimuth: number } {
  const x = wrap01(t);
  // Map day so noon (0.5) is high sun in the south-ish sky
  const angle = (x - 0.25) * Math.PI * 2; // dawn at 0 elevation rising
  const elevation = Math.sin(angle) * (Math.PI / 2) * 0.92;
  const azimuth = Math.PI * 0.65 + Math.cos(angle) * 0.35;
  return { elevation, azimuth };
}

export function sunDirectionFromSpherical(elevation: number, azimuth: number): {
  x: number;
  y: number;
  z: number;
} {
  const cosE = Math.cos(elevation);
  return {
    x: cosE * Math.cos(azimuth),
    y: Math.sin(elevation),
    z: cosE * Math.sin(azimuth),
  };
}

const SKY_NOON: Rgb = { r: 0.49, g: 0.72, b: 0.85 };
const SKY_DAWN: Rgb = { r: 0.95, g: 0.55, b: 0.35 };
const SKY_DUSK: Rgb = { r: 0.9, g: 0.4, b: 0.25 };
const SKY_NIGHT: Rgb = { r: 0.04, g: 0.05, b: 0.1 };

const SUN_DAY: Rgb = { r: 1.0, g: 0.98, b: 0.92 };
const SUN_DUSK: Rgb = { r: 1.0, g: 0.55, b: 0.25 };
const SUN_NIGHT: Rgb = { r: 0.2, g: 0.25, b: 0.4 };

export function sampleAtmosphere(t: number, rainFactor = 0): AtmosphereSample {
  const x = wrap01(t);
  const phase = getDayPhase(x);
  const nightFactor = getNightFactor(x);
  const { elevation, azimuth } = getSunSpherical(x);

  const dayFactor = 1 - nightFactor;
  let sky: Rgb;
  if (phase === 'dawn') {
    const u = smoothstep(0.2, 0.3, x);
    sky = lerpRgb(SKY_NIGHT, lerpRgb(SKY_DAWN, SKY_NOON, u), Math.max(u, 0.15));
  } else if (phase === 'dusk') {
    const u = smoothstep(0.7, 0.85, x);
    sky = lerpRgb(SKY_NOON, lerpRgb(SKY_DUSK, SKY_NIGHT, u), u);
  } else if (phase === 'night') {
    sky = SKY_NIGHT;
  } else {
    sky = SKY_NOON;
  }

  const sunColor =
    nightFactor > 0.7
      ? SUN_NIGHT
      : nightFactor > 0.15
        ? lerpRgb(SUN_DAY, SUN_DUSK, nightFactor)
        : SUN_DAY;

  const sunIntensity = Math.max(0, elevation) * 1.7 * dayFactor + 0.02;
  const ambientIntensity = lerp(0.12, 0.45, dayFactor);
  const hemiIntensity = lerp(0.15, 0.65, dayFactor);
  const exposure = lerp(0.58, 1.05, dayFactor);

  let fogDensity = lerp(0.0018, 0.00105, dayFactor);
  fogDensity = lerp(fogDensity, fogDensity * 1.55, Math.max(0, Math.min(1, rainFactor)));

  const fogColor = lerpRgb(sky, { r: 0.35, g: 0.4, b: 0.42 }, rainFactor * 0.45);

  return {
    phase,
    nightFactor,
    sunElevation: elevation,
    sunAzimuth: azimuth,
    sunIntensity,
    sunColor,
    ambientIntensity,
    ambientColor: lerpRgb({ r: 0.15, g: 0.18, b: 0.28 }, { r: 1, g: 0.96, b: 0.9 }, dayFactor),
    hemiSkyColor: sky,
    hemiGroundColor: { r: 0.25, g: 0.22, b: 0.16 },
    hemiIntensity,
    skyColor: lerpRgb(sky, { r: 0.4, g: 0.45, b: 0.48 }, rainFactor * 0.35),
    fogColor,
    fogDensity,
    exposure: exposure * lerp(1, 0.92, rainFactor),
  };
}

export function formatGameClock(t: number): string {
  const x = wrap01(t);
  const totalMinutes = Math.floor(x * 24 * 60);
  const hh = Math.floor(totalMinutes / 60) % 24;
  const mm = totalMinutes % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function rgbToHex(c: Rgb): number {
  return (
    (Math.max(0, Math.min(255, Math.round(c.r * 255))) << 16) |
    (Math.max(0, Math.min(255, Math.round(c.g * 255))) << 8) |
    Math.max(0, Math.min(255, Math.round(c.b * 255)))
  );
}
