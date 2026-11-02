"""Count actual polygon/grid intersections; never infer counts from area.

Input: one WGS84 Polygon/MultiPolygon GeoJSON geometry, Feature, or single-feature
FeatureCollection from a preserved, licensed boundary source. No guessed fallback.
Grid: local (x,z) origin (0,0) at Rathkhola; boundaries at integer multiples of
256m. Cells are identified by their lower (x,z) indices. Boundary-only touching
counts as intersects; partial means intersects but not fully covered.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
from shapely.geometry import shape, box
from shapely.ops import transform
from coordinate_transform import CoordinateTransformer


def count_cells(polygon, cell_size=256):
    if not polygon.is_valid or polygon.is_empty or polygon.geom_type not in ('Polygon', 'MultiPolygon'):
        raise ValueError('A nonempty valid Polygon/MultiPolygon is required')
    xmin, zmin, xmax, zmax = polygon.bounds
    # Include any cells whose closed boxes touch the polygon extremities.
    ix0, iz0 = math.ceil(xmin / cell_size) - 1, math.ceil(zmin / cell_size) - 1
    ix1, iz1 = math.floor(xmax / cell_size), math.floor(zmax / cell_size)
    intersecting, outside, partial, full = [], [], [], []
    for ix in range(ix0, ix1 + 1):
        for iz in range(iz0, iz1 + 1):
            cell = box(ix * cell_size, iz * cell_size, (ix+1) * cell_size, (iz+1) * cell_size)
            key = [ix, iz]
            if not polygon.intersects(cell):
                outside.append(key)
            else:
                intersecting.append(key)
                (full if polygon.covers(cell) else partial).append(key)
    return {
        'candidate_index_bounds_inclusive': [ix0, iz0, ix1, iz1],
        'candidate_cells': len(intersecting) + len(outside),
        'intersecting_cells': len(intersecting), 'outside_cells_within_candidate_grid': len(outside),
        'partial_boundary_cells': len(partial), 'fully_covered_cells': len(full),
        'total_candidate_grid_coverage_m2': (len(intersecting) + len(outside)) * cell_size**2,
        'intersecting_cell_coverage_m2': len(intersecting) * cell_size**2,
        'projected_polygon_area_m2': polygon.area,
        'cell_ids': {'intersecting': intersecting, 'outside': outside, 'partial': partial, 'full': full}
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--polygon', default='data/sources/dhamrai_upazila.geojson')
    parser.add_argument('--output', default='data/sources/chunk_grid_audit.json')
    args = parser.parse_args()
    source = Path(args.polygon)
    result = {
        'status': 'unavailable', 'source_file': str(source), 'crs': 'ESRI:102954 (provisional)',
        'grid_origin_world_xz_m': [0, 0], 'cell_size_m': 256,
        'grid_rule': 'Closed cells at integer multiples of 256m; count boundary-only touches as intersects. Outside cells counted only within candidate rectangle, not the infinite grid.',
        'area_equivalent_estimate': {'reported_area_km2_unverified': 306.84, 'fractional_cells': 306.84 / .065536,
                                     'historical_4685': 'Approximate area-equivalent estimate only; not an intersection count.'},
        'intersecting_cells': None, 'outside_cells_within_candidate_grid': None,
        'partial_boundary_cells': None, 'total_candidate_grid_coverage_m2': None,
        'intersecting_cell_coverage_m2': None
    }
    if not source.exists():
        result['reason'] = 'Actual Upazila polygon is absent. OSM relation 4730829 full acquisition failed: curl exit 6 (DNS); web fetches also unavailable. No substitute geometry used.'
    else:
        raw = source.read_bytes()
        data = json.loads(raw)
        if data['type'] == 'FeatureCollection':
            if len(data['features']) != 1:
                raise ValueError('Provide exactly one Upazila feature')
            data = data['features'][0]
        if data['type'] == 'Feature':
            data = data['geometry']
        c = CoordinateTransformer()
        def project(lon, lat, height=None):
            e, n = c.wgs84_to_butm(lon, lat)
            return e - c.origin_easting, c.origin_northing - n
        polygon = transform(project, shape(data))
        result.update(count_cells(polygon))
        result.update(status='calculated', source_sha256=hashlib.sha256(raw).hexdigest())
    Path(args.output).write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({k: v for k, v in result.items() if k != 'cell_ids'}, indent=2))
    return 0 if result['status'] == 'calculated' else 2


if __name__ == '__main__':
    raise SystemExit(main())
