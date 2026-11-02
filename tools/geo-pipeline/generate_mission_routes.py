"""
Dhamrai Life — Mission Routes & Road Graph Fixture Generator
============================================================
Parses Phase 1 OpenStreetMap road network and computes traversable graph routes,
exact road distances, and 3D polylines for Phase 1 missions.
Outputs machine-readable fixture to data/world/mission_routes.json.
"""

import os
import hashlib
import math
import heapq
import json
import xml.etree.ElementTree as ET
from typing import Dict, Any, List, Tuple

from coordinate_transform import CoordinateTransformer

transformer = CoordinateTransformer()

RAW_XML_PATH = "data/sources/raw_osm_sample_b_phase1_slice.xml"
OUTPUT_JSON_PATH = "data/world/mission_routes.json"

POI_TARGETS = {
    "rathkhola_origin": {
        "name": "Dhamrai Rathkhola Stand",
        "lon": 90.217400,
        "lat": 23.914800,
        "elev": 12.0
    },
    "rathkhola_pickup": {
        "name": "Rathkhola Market Corner",
        "lon": 90.2175475,
        "lat": 23.9148901,
        "elev": 12.0
    },
    "hardinge_gate": {
        "name": "Dhamrai Hardinge High School Gate",
        "lon": 90.216685,
        "lat": 23.916800,
        "elev": 13.0
    },
    "thana_junction": {
        "name": "Thana Junction Checkpoint",
        "lon": 90.216800,
        "lat": 23.914200,
        "elev": 12.0
    },
    "police_station": {
        "name": "Dhamrai Police Station",
        "lon": 90.216275,
        "lat": 23.914777,
        "elev": 12.0
    },
    "metal_workshop": {
        "name": "Kayetpara Metal Craft Workshop",
        "lon": 90.214500,
        "lat": 23.915500,
        "elev": 12.0
    },
    "yashomadhab_temple": {
        "name": "Sri Sri Yashomadhab Mandir",
        "lon": 90.214000,
        "lat": 23.915800,
        "elev": 12.5
    }
}

def load_graph(xml_path: str):
    root = ET.parse(xml_path).getroot()
    nodes = {n.get("id"): (float(n.get("lon")), float(n.get("lat"))) for n in root.findall("node")}
    
    highways = []
    for w in root.findall("way"):
        tags = {tag.get("k"): tag.get("v") for tag in w.findall("tag")}
        if "highway" in tags:
            nds = [nd.get("ref") for nd in w.findall("nd")]
            highways.append({"id": w.get("id"), "tags": tags, "nodes": nds})

    adj = {}
    for hw in highways:
        tags = hw["tags"]
        nds = hw["nodes"]
        for i in range(len(nds) - 1):
            u, v = nds[i], nds[i+1]
            if u in nodes and v in nodes:
                gx1, gy1, gz1 = transformer.wgs84_to_game(*nodes[u])
                gx2, gy2, gz2 = transformer.wgs84_to_game(*nodes[v])
                d = math.hypot(gx2 - gx1, gz2 - gz1)
                wname = tags.get("name") or tags.get("name:en") or tags.get("name:bn") or f"way/{hw['id']}"
                adj.setdefault(u, []).append((v, d, hw["id"], wname))
                adj.setdefault(v, []).append((u, d, hw["id"], wname))

    return nodes, adj

def find_nearest_graph_node(lon: float, lat: float, nodes: Dict[str, Tuple[float, float]], adj: Dict[str, Any]) -> Tuple[str, float]:
    gx, gy, gz = transformer.wgs84_to_game(lon, lat)
    best_n = None
    best_d = float("inf")
    for nid in adj:
        nlon, nlat = nodes[nid]
        ngx, _, ngz = transformer.wgs84_to_game(nlon, nlat)
        d = math.hypot(ngx - gx, ngz - gz)
        if d < best_d:
            best_d = d
            best_n = nid
    return best_n, best_d

def dijkstra_shortest_path(start_node: str, end_node: str, adj: Dict[str, Any]) -> Tuple[List[Tuple[str, str, str, float]], float]:
    dist = {start_node: 0.0}
    prev = {}
    pq = [(0.0, start_node)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist.get(u, float("inf")):
            continue
        if u == end_node:
            break
        for v, weight, wid, wname in adj.get(u, []):
            if dist[u] + weight < dist.get(v, float("inf")):
                dist[v] = dist[u] + weight
                prev[v] = (u, wid, wname, weight)
                heapq.heappush(pq, (dist[v], v))
    if end_node not in prev and start_node != end_node:
        raise ValueError(f"No road path from {start_node} to {end_node}")
    path = []
    curr = end_node
    while curr != start_node:
        p, wid, wname, wlen = prev[curr]
        path.append((curr, wid, wname, wlen))
        curr = p
    path.append((start_node, "", "Start Anchor", 0.0))
    path.reverse()
    return path, dist[end_node]

def build_polyline(path: List[Tuple[str, str, str, float]], nodes: Dict[str, Tuple[float, float]]) -> List[Dict[str, Any]]:
    polyline = []
    accum_dist = 0.0
    for idx, (nid, wid, wname, leg_dist) in enumerate(path):
        accum_dist += leg_dist
        lon, lat = nodes[nid]
        gx, gy, gz = transformer.wgs84_to_game(lon, lat)
        polyline.append({
            "seq": idx,
            "osm_node_id": nid,
            "way_id": wid,
            "road_name": wname,
            "leg_distance_m": round(leg_dist, 2),
            "cumulative_distance_m": round(accum_dist, 2),
            "position": {
                "x": gx,
                "y": gy,
                "z": gz
            },
            "wgs84": {
                "lon": round(lon, 7),
                "lat": round(lat, 7)
            }
        })
    return polyline

def main():
    if not os.path.exists(RAW_XML_PATH):
        raise FileNotFoundError(f"Missing {RAW_XML_PATH}. Run audit_osm_coverage.py first.")

    nodes, adj = load_graph(RAW_XML_PATH)
    print(f"Loaded road network from {RAW_XML_PATH}: {len(adj)} road vertices (not necessarily intersections or a single connected component).")

    # Locate graph nodes for all targets
    nearest_nodes = {}
    for key, info in POI_TARGETS.items():
        nid, d = find_nearest_graph_node(info["lon"], info["lat"], nodes, adj)
        nearest_nodes[key] = (nid, d)
        print(f"  Target '{info['name']}': Node {nid} ({d:.1f}m away)")

    # 1. Mission 1: Rathkhola Stand -> Hardinge High School Gate
    r_node = nearest_nodes["rathkhola_origin"][0]
    h_node = nearest_nodes["hardinge_gate"][0]
    path_m1, dist_m1 = dijkstra_shortest_path(r_node, h_node, adj)
    polyline_m1 = build_polyline(path_m1, nodes)

    # 2. Mission 2: Rathkhola Stand -> Thana Junction Checkpoint
    tj_node = nearest_nodes["thana_junction"][0]
    path_m2, dist_m2 = dijkstra_shortest_path(r_node, tj_node, adj)
    polyline_m2 = build_polyline(path_m2, nodes)

    # Mission 2 Context: Distance from Police Station to Checkpoint
    ps_node = nearest_nodes["police_station"][0]
    _, dist_ps_to_tj_road = dijkstra_shortest_path(ps_node, tj_node, adj)
    ps_gx, ps_gy, ps_gz = transformer.wgs84_to_game(POI_TARGETS["police_station"]["lon"], POI_TARGETS["police_station"]["lat"])
    tj_gx, tj_gy, tj_gz = transformer.wgs84_to_game(POI_TARGETS["thana_junction"]["lon"], POI_TARGETS["thana_junction"]["lat"])
    dist_ps_to_tj_euclidean = math.hypot(tj_gx - ps_gx, tj_gz - ps_gz)

    # 3. Mission 3: Direct route (Kayetpara Workshop -> Rathkhola)
    ws_node = nearest_nodes["metal_workshop"][0]
    path_m3_direct, dist_m3_direct = dijkstra_shortest_path(ws_node, r_node, adj)
    polyline_m3_direct = build_polyline(path_m3_direct, nodes)

    # Check if Temple node is anywhere on the direct route
    yt_node = nearest_nodes["yashomadhab_temple"][0]
    direct_passes_temple = any(step[0] == yt_node for step in path_m3_direct)

    # 4. Mission 3: Cultural Blessing Detour via Yashomadhab Temple
    path_ws_to_temple, dist_ws_to_temple = dijkstra_shortest_path(ws_node, yt_node, adj)
    path_temple_to_rk, dist_temple_to_rk = dijkstra_shortest_path(yt_node, r_node, adj)
    
    # Concatenate path without duplicating temple node
    full_path_detour = path_ws_to_temple + path_temple_to_rk[1:]
    total_detour_dist = dist_ws_to_temple + dist_temple_to_rk
    polyline_m3_detour = build_polyline(full_path_detour, nodes)

    output_data = {
        "metadata": {
            "fixture": "mission_routes.json",
            "version": "3.0.0",
            "crs": "ESRI:102954 (BUTM2010)",
            "vertical_baseline_msl_m": 12.0,
            "source_snapshot": "data/sources/raw_osm_sample_b_phase1_slice.xml",
            "source_sha256": hashlib.sha256(open(RAW_XML_PATH, "rb").read()).hexdigest(),
            "description": "OSM snapshot graph routes between nearest road vertices; not field-verified access routes.",
            "distance_semantics": "Horizontal projected metres between snapped vertices; excludes anchor-to-road offsets. No elevation profile is available.",
            "routing_model": "Undirected highway graph sharing OSM node IDs; ignores access restrictions, turn restrictions and one-way tags. A topology audit, not certified rickshaw navigation.",
            "courtyard_evidence": "No verified temple courtyard polygon or entrance/access connector is preserved; courtyard traversal is unknown for every route.",
            "axis_convention": "+X east, +Y up relative to provisional 12m MSL, +Z south"
        },
        "control_locations": {
            k: {
                "name": v["name"],
                "wgs84": {"lon": v["lon"], "lat": v["lat"], "elevation": v["elev"]},
                "world_position": dict(zip(["x", "y", "z"], transformer.wgs84_to_game(v["lon"], v["lat"], v["elev"]))),
                "nearest_graph_node": nearest_nodes[k][0],
                "snap_offset_m": round(nearest_nodes[k][1], 2)
            } for k, v in POI_TARGETS.items()
        },
        "mission_3_distance_evidence": {
            "documented_world_anchors": {"workshop": [-295.3, 0.0, -77.0], "temple": [-346.2, 0.5, -110.2], "rathkhola": [0.0, 0.0, 0.0]},
            "horizontal_straight_line_workshop_to_temple_m": math.hypot(-346.2 + 295.3, -110.2 + 77.0),
            "delta_workshop_to_temple_xz_m": [-50.9, -33.2],
            "workshop_to_temple_graph_m": round(dist_ws_to_temple, 2),
            "temple_to_rathkhola_graph_m": round(dist_temple_to_rk, 2),
            "direct_workshop_to_rathkhola_graph_m": round(dist_m3_direct, 2),
            "detour_via_temple_graph_m": round(total_detour_dist, 2),
            "workshop_to_temple_polyline": build_polyline(path_ws_to_temple, nodes),
            "temple_to_rathkhola_polyline": build_polyline(path_temple_to_rk, nodes),
            "anchor_access_status": "Unverified. snap_offset_m is straight-line offset, not a surveyed or mapped access path.",
            "traverses_temple_courtyard": {"workshop_to_temple": None, "temple_to_rathkhola": None, "direct_delivery": None, "detour": None}
        },
        "missions": {
            "mission_1_first_fare": {
                "id": "mission_1",
                "title_bn": "দিনের প্রথম যাত্রী",
                "title_en": "First Fare",
                "start_anchor": "rathkhola_origin",
                "destination_anchor": "hardinge_gate",
                "pickup_anchor": "rathkhola_pickup",
                "route_type": "origin_to_school_road_graph_fixture_only",
                "passenger_pickup_status": "pending_plaza_access_geometry",
                "route_semantics_note": "This 552.67m road graph fixture connects nearest road vertices between Rathkhola Stand and Hardinge High School Gate. It does NOT include the intermediate passenger pickup at Rathkhola Market Corner (+14.997, 0.0, -9.998), which lies in the open fairground plaza off the tagged OSM street network. The complete passenger mission is labeled as an origin-to-school route only with the passenger pickup leg pending plaza access geometry modeling.",
                "pickup_snap_offset_m": round(nearest_nodes["rathkhola_pickup"][1], 2),
                "calculated_road_distance_m": round(dist_m1, 2),
                "waypoint_count": len(polyline_m1),
                "route_polyline": polyline_m1
            },
            "mission_2_police_checkpoint": {
                "id": "mission_2",
                "title_bn": "চেকপোস্ট ও কাগজপত্র",
                "title_en": "Police Checkpoint",
                "start_anchor": "rathkhola_origin",
                "destination_anchor": "thana_junction",
                "calculated_road_distance_m": round(dist_m2, 2),
                "waypoint_count": len(polyline_m2),
                "location_context": {
                    "checkpoint_world_position": dict(zip(["x", "y", "z"], transformer.wgs84_to_game(POI_TARGETS["thana_junction"]["lon"], POI_TARGETS["thana_junction"]["lat"]))),
                    "police_station_world_position": dict(zip(["x", "y", "z"], transformer.wgs84_to_game(POI_TARGETS["police_station"]["lon"], POI_TARGETS["police_station"]["lat"]))),
                    "euclidean_distance_to_station_m": round(dist_ps_to_tj_euclidean, 2),
                    "road_network_distance_to_station_m": round(dist_ps_to_tj_road, 2),
                    "relationship_description": "Checkpoint is situated at Thana Junction on the town thoroughfare, 83.3m ESE (straight-line) and 149.4m (road distance) from Dhamrai Police Station compound."
                },
                "route_polyline": polyline_m2
            },
            "mission_3_artisan_order_direct": {
                "id": "mission_3_direct",
                "title_bn": "কাঁসা-পিতলের ফরমাশ (সরাসরি পথ)",
                "title_en": "Artisan Order (Direct Delivery Route)",
                "pickup_anchor": "metal_workshop",
                "delivery_anchor": "rathkhola_origin",
                "calculated_road_distance_m": round(dist_m3_direct, 2),
                "waypoint_count": len(polyline_m3_direct),
                "passes_temple_road_node": direct_passes_temple,
                "traverses_temple_courtyard": None,
                "temple_position_relative_to_delivery": "Temple is 50.9m west and 33.2m north of the documented workshop anchor; horizontal straight-line distance 60.77m.",
                "route_polyline": polyline_m3_direct
            },
            "mission_3_artisan_order_temple_detour": {
                "id": "mission_3_detour",
                "title_bn": "কাঁসা-পিতলের ফরমাশ (যশোমাধব মন্দির আশীর্বাদসহ)",
                "title_en": "Artisan Order (Temple Blessing Detour)",
                "pickup_anchor": "metal_workshop",
                "detour_anchor": "yashomadhab_temple",
                "delivery_anchor": "rathkhola_origin",
                "workshop_to_temple_road_m": round(dist_ws_to_temple, 2),
                "temple_to_rathkhola_road_m": round(dist_temple_to_rk, 2),
                "calculated_road_distance_m": round(total_detour_dist, 2),
                "waypoint_count": len(polyline_m3_detour),
                "passes_temple_road_node": True,
                "traverses_temple_courtyard": None,
                "detour_narrative": "Optional narrative detour visits the nearest temple road vertex. Courtyard entry and last-metre access remain unverified.",
                "route_polyline": polyline_m3_detour
            }
        }
    }

    os.makedirs(os.path.dirname(OUTPUT_JSON_PATH), exist_ok=True)
    with open(OUTPUT_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

    print(f"\nGenerated mission routes fixture: {OUTPUT_JSON_PATH}")
    print(f"  Mission 1 road distance: {dist_m1:.2f} m ({len(polyline_m1)} waypoints)")
    print(f"  Mission 2 road distance: {dist_m2:.2f} m ({len(polyline_m2)} waypoints)")
    print(f"  Mission 2 -> Police Station offset: {dist_ps_to_tj_euclidean:.2f} m Euclidean, {dist_ps_to_tj_road:.2f} m road")
    print(f"  Mission 3 Direct road distance: {dist_m3_direct:.2f} m (Visits nearest temple road vertex? {direct_passes_temple})")
    print(f"  Mission 3 Detour road distance: {total_detour_dist:.2f} m ({len(polyline_m3_detour)} waypoints)")

if __name__ == "__main__":
    main()
