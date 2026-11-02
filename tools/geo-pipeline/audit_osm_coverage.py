"""
Dhamrai Life — Reproducible OpenStreetMap Empirical Coverage Audit Tool
========================================================================
Version: 2.1.0
Author: Lead Technical Architect & Senior Game Development Engineer

Extracts, geometric-clips, and audits OSM feature density across four defined bounding boxes.
Outputs verified metric summaries and SHA-256 snapshot hashes to data/sources/osm_audit_summary.json.

Key Methodology Enhancements:
1. Strict Line Clipping: Uses Shapely to clip highway ways to the exact sample bounding box.
   This resolves the rural 35.210 km anomaly where unclipped regional ways (R503 etc.)
   crossing into the box were previously counted in full across their entire multi-kilometer extents.
2. 4-Corner Geographic Envelope: For the Phase 1 playable slice, calculates min/max bounds across
   all four inverse-transformed corners of the projected 1024m x 1024m square.
3. Offline Snapshot Determinism: Saves raw XML payloads to data/sources/raw_osm_{area_key}.xml
   and computes SHA-256 checksums to guarantee reproducibility even if upstream OSM data changes.
"""

import sys
import os
import argparse
import urllib.request
import xml.etree.ElementTree as ET
import json
import math
import hashlib
from typing import Dict, Any, List, Tuple

import shapely.geometry as sg
import shapely
import pyproj
import certifi
from coordinate_transform import CoordinateTransformer

transformer = CoordinateTransformer()

AREAS = {
    "sample_a_pourashava_core": {
        "name": "Dhamrai Pourashava Core (Town Center)",
        "bbox": [90.210000, 23.910000, 90.225000, 23.925000], # [min_lon, min_lat, max_lon, max_lat]
        "description": "Historical urban core of Dhamrai Municipality encompassing Rathkhola, Hardinge School, and Upazila Parishad approach."
    },
    "sample_b_phase1_slice": {
        "name": "Phase 1 Playable Slice (16 Chunks / 1024m x 1024m)",
        # Computed from all 4 inverse-transformed projected corners:
        # SW: (90.2123619, 23.9101825), NW: (90.2123770, 23.9194316)
        # SE: (90.2224226, 23.9101683), NE: (90.2224384, 23.9194174)
        "bbox": [90.212362, 23.910168, 90.222438, 23.919432],
        "description": "Verified bounding envelope for the Phase 1 16-chunk vertical slice centered on Rathkhola."
    },
    "sample_c_rural_union": {
        "name": "Rural Union Sector (Balia / Chauhat)",
        "bbox": [90.150000, 23.930000, 90.160000, 23.940000],
        "description": "Representative rural agricultural zone with dispersed homesteads (bari) and unpaved tracks."
    },
    "sample_d_jahangirnagar_univ": {
        "name": "Jahangirnagar University Campus (Savar)",
        "bbox": [90.260000, 23.875000, 90.275000, 23.890000],
        "description": "Academic campus area along the N5 highway in Savar Upazila."
    }
}

RAW_DIR = "data/sources"

def get_api_url(bbox: List[float]) -> str:
    min_lon, min_lat, max_lon, max_lat = bbox
    return f"https://api.openstreetmap.org/api/0.6/map?bbox={min_lon:.6f},{min_lat:.6f},{max_lon:.6f},{max_lat:.6f}"

def fetch_or_load_osm_xml(area_key: str, bbox: List[float], offline: bool = False) -> Tuple[bytes, str]:
    raw_path = os.path.join(RAW_DIR, f"raw_osm_{area_key}.xml")
    if offline and not os.path.exists(raw_path):
        raise FileNotFoundError(f"Offline snapshot missing: {raw_path}")
    if offline and os.path.exists(raw_path):
        with open(raw_path, "rb") as f:
            data = f.read()
        return data, "cached_offline_file"
    
    url = get_api_url(bbox)
    req = urllib.request.Request(url, headers={"User-Agent": "DhamraiLifeReproducibleAudit/2.1"})
    try:
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
        os.makedirs(RAW_DIR, exist_ok=True)
        with open(raw_path, "wb") as f:
            f.write(data)
        return data, url
    except Exception as e:
        if os.path.exists(raw_path):
            print(f"Network fetch failed ({e}), falling back to cached file {raw_path}")
            with open(raw_path, "rb") as f:
                data = f.read()
            return data, f"cached_fallback_after_error: {e}"
        raise

def calculate_sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def audit_area(area_key: str, config: Dict[str, Any], offline: bool = False) -> Dict[str, Any]:
    bbox = config["bbox"]
    min_lon, min_lat, max_lon, max_lat = bbox
    print(f"Auditing: {config['name']} {bbox}...")
    
    xml_data, source_origin = fetch_or_load_osm_xml(area_key, bbox, offline)
    sha256_hash = calculate_sha256(xml_data)
    root = ET.fromstring(xml_data)
    
    nodes_dict = {}
    nodes_tags = {}
    for n in root.findall("node"):
        nid = n.get("id")
        lat = float(n.get("lat"))
        lon = float(n.get("lon"))
        nodes_dict[nid] = (lon, lat)
        tags = {t.get("k"): t.get("v") for t in n.findall("tag")}
        if tags:
            nodes_tags[nid] = tags

    ways = root.findall("way")
    relations = root.findall("relation")

    highways = []
    buildings = []
    waterways = []
    pois = []

    # Node POIs
    for nid, tags in nodes_tags.items():
        if any(k in tags for k in ["amenity", "shop", "tourism", "historic", "office", "healthcare"]):
            pois.append({
                "osm_type": "node",
                "id": nid,
                "name": tags.get("name") or tags.get("name:en") or tags.get("name:bn"),
                "category": tags.get("amenity") or tags.get("shop") or tags.get("tourism") or tags.get("historic") or tags.get("office")
            })

    unclipped_road_length_m = 0.0
    clipped_road_length_m = 0.0
    highway_classes = {}
    roads_with_name = 0
    roads_with_surface = 0
    roads_with_width = 0
    roads_with_lanes = 0
    roads_with_oneway = 0

    buildings_with_levels = 0
    buildings_with_height = 0
    buildings_with_name = 0

    box_wgs84 = sg.box(min_lon, min_lat, max_lon, max_lat)

    for w in ways:
        wid = w.get("id")
        tags = {t.get("k"): t.get("v") for t in w.findall("tag")}
        nds = [nd.get("ref") for nd in w.findall("nd")]

        if "highway" in tags:
            hw_class = tags["highway"]
            coords = [nodes_dict[ref] for ref in nds if ref in nodes_dict]
            
            w_unclipped_len = 0.0
            w_clipped_len = 0.0
            
            if len(coords) >= 2:
                # 1. Unclipped length (summing all nodes returned by OSM way)
                for i in range(len(coords) - 1):
                    e1, n1 = transformer.wgs84_to_butm(coords[i][0], coords[i][1])
                    e2, n2 = transformer.wgs84_to_butm(coords[i+1][0], coords[i+1][1])
                    w_unclipped_len += math.hypot(e2 - e1, n2 - n1)
                
                # 2. Clipped length (strictly intersecting segment with bbox)
                line = sg.LineString(coords)
                clipped = line.intersection(box_wgs84)
                if not clipped.is_empty:
                    if clipped.geom_type == "LineString":
                        lines = [clipped]
                    elif clipped.geom_type == "MultiLineString":
                        lines = list(clipped.geoms)
                    elif clipped.geom_type == "GeometryCollection":
                        lines = [g for g in clipped.geoms if g.geom_type == "LineString"]
                    else:
                        lines = []
                    for l in lines:
                        l_coords = list(l.coords)
                        for i in range(len(l_coords) - 1):
                            e1, n1 = transformer.wgs84_to_butm(l_coords[i][0], l_coords[i][1])
                            e2, n2 = transformer.wgs84_to_butm(l_coords[i+1][0], l_coords[i+1][1])
                            w_clipped_len += math.hypot(e2 - e1, n2 - n1)

            unclipped_road_length_m += w_unclipped_len
            clipped_road_length_m += w_clipped_len

            highway_classes[hw_class] = highway_classes.get(hw_class, 0) + 1
            if "name" in tags or "name:en" in tags or "name:bn" in tags:
                roads_with_name += 1
            if "surface" in tags:
                roads_with_surface += 1
            if "width" in tags:
                roads_with_width += 1
            if "lanes" in tags:
                roads_with_lanes += 1
            if "oneway" in tags and tags["oneway"] != "no":
                roads_with_oneway += 1
            highways.append({
                "id": wid,
                "class": hw_class,
                "unclipped_length_m": round(w_unclipped_len, 2),
                "clipped_length_m": round(w_clipped_len, 2),
                "tags": tags
            })

        if "building" in tags:
            b_name = tags.get("name") or tags.get("name:en") or tags.get("name:bn")
            if b_name:
                buildings_with_name += 1
            if "building:levels" in tags:
                buildings_with_levels += 1
            if "height" in tags:
                buildings_with_height += 1
            buildings.append({"id": wid, "type": tags.get("building"), "name": b_name})

        if "waterway" in tags or tags.get("natural") in ["water", "pond"]:
            waterways.append({"id": wid, "type": tags.get("waterway") or tags.get("natural"), "name": tags.get("name")})

        if any(k in tags for k in ["amenity", "shop", "tourism", "historic", "office", "healthcare"]):
            pois.append({
                "osm_type": "way",
                "id": wid,
                "name": tags.get("name") or tags.get("name:en") or tags.get("name:bn"),
                "category": tags.get("amenity") or tags.get("shop") or tags.get("tourism") or tags.get("historic")
            })

    total_roads = len(highways)
    total_buildings = len(buildings)

    return {
        "area_key": area_key,
        "name": config["name"],
        "bbox": bbox,
        "snapshot_sha256": sha256_hash,
        "source_origin": source_origin,
        "counts": {
            "total_nodes": len(nodes_dict),
            "total_ways": len(ways),
            "total_relations": len(relations),
            "highway_ways_count": total_roads,
            "clipped_road_length_km": round(clipped_road_length_m / 1000.0, 3),
            "unclipped_road_length_km": round(unclipped_road_length_m / 1000.0, 3),
            "building_footprints_count": total_buildings,
            "waterway_features_count": len(waterways),
            "poi_features_count": len(pois)
        },
        "road_clipping_explanation": {
            "clipped_length_km": round(clipped_road_length_m / 1000.0, 3),
            "unclipped_length_km": round(unclipped_road_length_m / 1000.0, 3),
            "note": "Clipped length reflects actual road segments within the sample bounding box. Unclipped length includes full external extents of highways that traverse the sample boundary."
        },
        "road_attributes": {
            "highway_classes": highway_classes,
            "with_name_count": roads_with_name,
            "with_name_pct": round(roads_with_name / total_roads * 100, 2) if total_roads else 0.0,
            "with_surface_count": roads_with_surface,
            "with_surface_pct": round(roads_with_surface / total_roads * 100, 2) if total_roads else 0.0,
            "with_width_count": roads_with_width,
            "with_width_pct": round(roads_with_width / total_roads * 100, 2) if total_roads else 0.0,
            "with_lanes_count": roads_with_lanes,
            "with_lanes_pct": round(roads_with_lanes / total_roads * 100, 2) if total_roads else 0.0,
            "with_oneway_count": roads_with_oneway,
            "with_oneway_pct": round(roads_with_oneway / total_roads * 100, 2) if total_roads else 0.0
        },
        "building_attributes": {
            "named_buildings_count": buildings_with_name,
            "named_buildings_pct": round(buildings_with_name / total_buildings * 100, 2) if total_buildings else 0.0,
            "with_levels_count": buildings_with_levels,
            "with_levels_pct": round(buildings_with_levels / total_buildings * 100, 2) if total_buildings else 0.0,
            "with_height_count": buildings_with_height,
            "with_height_pct": round(buildings_with_height / total_buildings * 100, 2) if total_buildings else 0.0
        },
        "sample_pois": [p for p in pois if p.get("name")][:15]
    }

def main():
    parser = argparse.ArgumentParser(description="Audit OSM coverage with geometry clipping.")
    parser.add_argument("--offline", action="store_true", help="Use local cached XML snapshots instead of live network requests.")
    args = parser.parse_args()

    results = {
        "audit_metadata": {
            "tool": "audit_osm_coverage.py",
            "version": "2.1.0",
            "date": "2026-11-02",
            "source": "OpenStreetMap Foundation API v0.6",
            "license": "ODbL 1.0 (http://osm.org/copyright)",
            "metric_scope": "Road lengths clipped to historical geographic query rectangles; counts and tag denominators cover returned API objects including external way members. These are not exact projected-square or field-completeness metrics.",
            "execution_mode": "offline_cache" if args.offline else "live_network_snapshot",
            "reproducibility_notice": "Live OSM API responses may change over time as contributors edit data. Cached raw XML snapshots preserve deterministic 2026-11-02 audit state.",
            "dependencies": {
                "python": sys.version.split()[0],
                "pyproj": pyproj.__version__,
                "proj": pyproj.proj_version_str,
                "shapely": shapely.__version__,
                "geos": shapely.geos_version_string,
                "certifi": certifi.__version__
            }
        },
        "areas": {}
    }

    for key, cfg in AREAS.items():
        results["areas"][key] = audit_area(key, cfg, offline=args.offline)

    out_path = "data/sources/osm_audit_summary.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    with open(out_path, "rb") as f:
        summary_sha256 = hashlib.sha256(f.read()).hexdigest()
        
    print(f"\nAudit complete! Wrote machine-readable results to {out_path}")
    print(f"Summary file SHA-256: {summary_sha256}")

if __name__ == "__main__":
    main()
