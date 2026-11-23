import { describe, it, expect } from 'vitest';
import { getVehicleProfile, listVehicleProfileIds } from '../src/vehicle-profiles.js';

describe('Vehicle handling profiles (M34)', () => {
  it('includes rickshaw, cng, easy_bike, tempo, van_light', () => {
    const ids = listVehicleProfileIds();
    expect(ids).toContain('rickshaw');
    expect(ids).toContain('cng');
    expect(ids).toContain('easy_bike');
    expect(ids).toContain('tempo');
    expect(ids).toContain('van_light');
    expect(getVehicleProfile('cng').massKg).toBeGreaterThan(getVehicleProfile('rickshaw').massKg);
  });
});
