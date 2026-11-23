import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { WeatherSystem, MAX_RAIN_PARTICLES } from '../src/engine/atmosphere/WeatherSystem.js';

describe('WeatherSystem', () => {
  let scene: THREE.Scene;
  let weather: WeatherSystem;

  beforeEach(() => {
    scene = new THREE.Scene();
    weather = new WeatherSystem(scene, 200);
    weather.setWeather('clear');
  });

  afterEach(() => {
    weather.dispose();
  });

  it('toggles clear ↔ rain idempotently and reports rainFactor', () => {
    expect(weather.state).toBe('clear');
    expect(weather.rainFactor).toBe(0);
    expect(weather.toggleWeather()).toBe('rain');
    expect(weather.rainFactor).toBe(1);
    expect(weather.toggleWeather()).toBe('clear');
  });

  it('caps particle count at MAX_RAIN_PARTICLES', () => {
    const big = new WeatherSystem(scene, 99999);
    expect(big.particleCount).toBe(MAX_RAIN_PARTICLES);
    big.dispose();
  });

  it('dispose is safe to call twice', () => {
    weather.setWeather('rain');
    weather.update(0.016, { x: 0, y: 0.5, z: 0 });
    weather.dispose();
    expect(weather.isDisposed).toBe(true);
    weather.dispose();
    expect(scene.getObjectByName('WeatherSystem')).toBeUndefined();
  });
});
