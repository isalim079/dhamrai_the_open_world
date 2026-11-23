/**
 * Milestone 27–31 — Curated fictional plot layer (property / construction / business).
 * Ownership & buildings persist via worldFlags (CSV), not a V3 schema.
 * Fiction only — not a real cadastral / title claim.
 */

import { PHASE_1_ANCHORS, type WorldPosition } from '@dhamrai/shared-contracts';

export const PLOT_INSPECT_RADIUS_M = 10;
export const PLOT_INTERACT_RADIUS_M = 6;
export const RENTAL_COOLDOWN_MS = 120_000; // 2 min gameplay “day” slice

export type PlotZoning = 'commercial' | 'workshop' | 'transport';
export type BuildingTemplateId = 'none' | 'tea_kiosk' | 'repair_garage' | 'rickshaw_shed';

export interface PlotDefinition {
  id: string;
  nameBn: string;
  nameEn: string;
  blurbBn: string;
  blurbEn: string;
  position: WorldPosition;
  priceMinorUnits: number;
  zoning: PlotZoning;
  /** Allowed building templates on this plot */
  allowedBuildings: readonly BuildingTemplateId[];
  /** Base rental income per claim when a building is placed */
  rentalIncomeMinorUnits: number;
  sourceNote: string;
}

export const PLOT_DEFINITIONS: readonly PlotDefinition[] = [
  {
    id: 'plot_rathkhola_corner',
    nameBn: 'রথখোলা কোণ প্লট',
    nameEn: 'Rathkhola Corner Plot',
    blurbBn: 'স্ট্যান্ডের কাছে ছোট বাণিজ্যিক প্লট — চায়ের কিয়স্ক বসানো যায়।',
    blurbEn: 'Small commercial plot by the stand — can host a tea kiosk.',
    position: { x: 6.0, y: 0.0, z: -4.5 },
    priceMinorUnits: 12000, // ৳120
    zoning: 'commercial',
    allowedBuildings: ['tea_kiosk'],
    rentalIncomeMinorUnits: 800, // ৳8
    sourceNote: 'Fictional plot layer for gameplay; not a real title record.',
  },
  {
    id: 'plot_mistri_yard',
    nameBn: 'মিস্ত্রি উঠোন প্লট',
    nameEn: 'Mistri Yard Plot',
    blurbBn: 'মেরামত গ্যারেজের জন্য উপযোগী ওয়ার্কশপ জোন।',
    blurbEn: 'Workshop zoning suited for a repair garage.',
    position: { x: -8.0, y: 0.0, z: 3.5 },
    priceMinorUnits: 18000, // ৳180
    zoning: 'workshop',
    allowedBuildings: ['repair_garage'],
    rentalIncomeMinorUnits: 1200, // ৳12
    sourceNote: 'Fictional workshop lot near mistri NPC spawn.',
  },
  {
    id: 'plot_stand_shed',
    nameBn: 'স্ট্যান্ড শেড প্লট',
    nameEn: 'Stand Shed Plot',
    blurbBn: 'রিকশা শেড — পরিবহন ব্যবসার হালকা স্লট।',
    blurbEn: 'Rickshaw shed slot — light transport business.',
    position: { x: -2.5, y: 0.0, z: 5.0 },
    priceMinorUnits: 15000, // ৳150
    zoning: 'transport',
    allowedBuildings: ['rickshaw_shed'],
    rentalIncomeMinorUnits: 1000, // ৳10
    sourceNote: 'Fictional transport shed plot at Rathkhola stand.',
  },
  {
    id: 'plot_market_edge',
    nameBn: 'বাজার প্রান্ত প্লট',
    nameEn: 'Market Edge Plot',
    blurbBn: 'বাজার পিকআপের কাছে বাণিজ্যিক কোণ।',
    blurbEn: 'Commercial corner near market pickup.',
    position: {
      x: PHASE_1_ANCHORS.RATHKHOLA_MARKET_PICKUP.x + 4,
      y: 0,
      z: PHASE_1_ANCHORS.RATHKHOLA_MARKET_PICKUP.z + 3,
    },
    priceMinorUnits: 10000, // ৳100
    zoning: 'commercial',
    allowedBuildings: ['tea_kiosk'],
    rentalIncomeMinorUnits: 700,
    sourceNote: 'Fictional commercial edge lot.',
  },
] as const;

export const BUILDING_TEMPLATES: Record<
  Exclude<BuildingTemplateId, 'none'>,
  { nameBn: string; nameEn: string; buildCostMinorUnits: number }
> = {
  tea_kiosk: {
    nameBn: 'চা কিয়স্ক',
    nameEn: 'Tea Kiosk',
    buildCostMinorUnits: 4000, // ৳40
  },
  repair_garage: {
    nameBn: 'মেরামত গ্যারেজ',
    nameEn: 'Repair Garage',
    buildCostMinorUnits: 7000, // ৳70
  },
  rickshaw_shed: {
    nameBn: 'রিকশা শেড',
    nameEn: 'Rickshaw Shed',
    buildCostMinorUnits: 5000, // ৳50
  },
};

export function parseCsvIds(csv: string | undefined | null): string[] {
  if (!csv || typeof csv !== 'string' || !csv.trim()) return [];
  return csv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function serializeCsvIds(ids: readonly string[]): string {
  return [...new Set(ids)].sort().join(',');
}

/** buildings CSV: plotId:templateId,plotId:templateId */
export function parsePlotBuildings(csv: string | undefined | null): Record<string, BuildingTemplateId> {
  const out: Record<string, BuildingTemplateId> = {};
  for (const part of parseCsvIds(csv)) {
    const [plotId, template] = part.split(':');
    if (plotId && template) {
      out[plotId] = template as BuildingTemplateId;
    }
  }
  return out;
}

export function serializePlotBuildings(map: Record<string, BuildingTemplateId>): string {
  return Object.keys(map)
    .sort()
    .map((id) => `${id}:${map[id]}`)
    .join(',');
}

export function distanceToPlotM(pos: WorldPosition, plot: PlotDefinition): number {
  return Math.hypot(pos.x - plot.position.x, pos.z - plot.position.z);
}

export function findNearestPlot(
  pos: WorldPosition,
  radiusM: number = PLOT_INSPECT_RADIUS_M
): PlotDefinition | null {
  let best: PlotDefinition | null = null;
  let bestDist = Infinity;
  for (const plot of PLOT_DEFINITIONS) {
    const d = distanceToPlotM(pos, plot);
    if (d <= radiusM && d < bestDist) {
      best = plot;
      bestDist = d;
    }
  }
  return best;
}

export function getPlotById(id: string): PlotDefinition | undefined {
  return PLOT_DEFINITIONS.find((p) => p.id === id);
}
