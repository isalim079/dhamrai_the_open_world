"""
Dhamrai Life — Directed Runtime Navigation Graph Builder
=========================================================
Builds Phase 1 DirectedNavGraph from raw OSM Sample B slice.
Enforces oneway directives (with municipal contraflow exceptions),
access hierarchies (pedal rickshaw classification), turn restrictions,
and authors Rathkhola fairground plaza access connectors.

Outputs: data/world/directed_nav_graph.json
"""

import os
import math
import heapq
import json
import xml.etree.ElementTree as ET
from typing import Dict, Any, List, Tuple, Optional

from coordinate_transform import CoordinateTransformer

RAW_XML_PATH = "data/sources/raw_osm_sample_b_phase1_slice.xml"
OUTPUT_JSON_PATH = "data/world/directed_nav_graph.json"

# Phase 1 slice half-extent (1024m x 1024m centered on Rathkhola)
HALF_SLICE_M = 512.0

# Road widths and speed limits by highway classification
HIGHWAY_PROFILES: Dict[str, Dict[str, Any]] = {
    "trunk": {"width": 12.0, "speed_kph": 50, "surface": "asphalt", "default_rickshaw": True},
    "primary": {"width": 10.0, "speed_kph": 45, "surface": "asphalt", "default_rickshaw": True},
    "secondary": {"width": 6.5, "speed_kph": 35, "surface": "asphalt", "default_rickshaw": True},
    "tertiary": {"width": 5.5, "speed_kph": 30, "surface": "asphalt", "default_rickshaw": True},
    "residential": {"width": 4.0, "speed_kph": 20, "surface": "paved", "default_rickshaw": True},
    "unclassified": {"width": 4.0, "speed_kph": 20, "surface": "paved", "default_rickshaw": True},
    "living_street": {"width": 3.5, "speed_kph": 15, "surface": "brick", "default_rickshaw": True},
    "service": {"width": 3.0, "speed_kph": 15, "surface": "paved", "default_rickshaw": True},
    "track": {"width": 3.0, "speed_kph": 15, "surface": "unpaved", "default_rickshaw": True},
    "pedestrian": {"width": 3.0, "speed_kph": 10, "surface": "paved", "default_rickshaw": False},
    "footway": {"width": 1.8, "speed_kph": 5, "surface": "paved", "default_rickshaw": False},
    "path": {"width": 1.5, "speed_kph": 5, "surface": "ground", "default_rickshaw": False},
    "steps": {"width": 1.5, "speed_kph": 3, "surface": "concrete", "default_rickshaw": False},
    "plaza_connector": {"width": 4.0, "speed_kph": 15, "surface": "brick", "default_rickshaw": True},
}


def parse_oneway(tags: Dict[str, str], width_m: float) -> Tuple[bool, bool]:
    """
    Returns (forward_allowed, backward_allowed) based on oneway tags and contraflow rules.
    """
    oneway_val = tags.get("oneway", "no").strip().lower()
    rickshaw_contraflow = tags.get("oneway:rickshaw") == "no" or tags.get("oneway:bicycle") == "no"

    if oneway_val in ("yes", "1", "true"):
        # Normal one-way forward; if contraflow is tagged and width >= 4.0m, permit contraflow
        if rickshaw_contraflow and width_m >= 4.0:
            return True, True
        return True, False
    elif oneway_val in ("-1", "reverse"):
        if rickshaw_contraflow and width_m >= 4.0:
            return True, True
        return False, True
    else:
        # Default bidirectional
        return True, True


def parse_rickshaw_access(tags: Dict[str, str], highway_class: str) -> bool:
    """
    Evaluates hierarchical access tags for cycle rickshaw (non-motorized vehicle).
    """
    # Explicit rickshaw tag overrides everything
    if "rickshaw" in tags:
        return tags["rickshaw"].lower() in ("yes", "permissive", "designated")
    if "bicycle" in tags and tags["bicycle"].lower() in ("yes", "permissive", "designated"):
        return True

    # Check vehicle tag
    vehicle_tag = tags.get("vehicle", "").lower()
    if vehicle_tag in ("no", "private"):
        return False
    if vehicle_tag in ("yes", "permissive"):
        return True

    # Check motor_vehicle tag: if motor_vehicle=no, rickshaws (non-motorized) are permitted!
    motor_vehicle = tags.get("motor_vehicle", "").lower()
    if motor_vehicle in ("no",) and vehicle_tag != "no":
        return True

    # Check general access tag
    access_tag = tags.get("access", "").lower()
    if access_tag in ("no", "private"):
        return False

    # Default based on highway class profile
    profile = HIGHWAY_PROFILES.get(highway_class, {"default_rickshaw": True})
    return bool(profile["default_rickshaw"])


class DirectedNavGraphBuilder:
    def __init__(self, xml_path: str = RAW_XML_PATH):
        self.xml_path = xml_path
        self.transformer = CoordinateTransformer()
        self.raw_nodes: Dict[int, Dict[str, Any]] = {}
        self.nodes: Dict[str, Dict[str, Any]] = {}
        self.edges: List[Dict[str, Any]] = []
        self.turn_restrictions: List[Dict[str, Any]] = []
        self.way_node_lists: Dict[int, List[int]] = {}
        self.way_tags: Dict[int, Dict[str, str]] = {}

    def build(self) -> Dict[str, Any]:
        print(f"Loading OSM XML from {self.xml_path}...")
        tree = ET.parse(self.xml_path)
        root = tree.getroot()

        # 1. Parse raw nodes
        for node in root.findall("node"):
            nid = int(node.attrib["id"])
            lat = float(node.attrib["lat"])
            lon = float(node.attrib["lon"])
            gx, gy, gz = self.transformer.wgs84_to_game(lon, lat)
            self.raw_nodes[nid] = {
                "osm_id": nid,
                "lon": lon,
                "lat": lat,
                "x": gx,
                "y": gy,
                "z": gz,
            }

        # 2. Parse ways tagged with highway
        node_use_count: Dict[int, int] = {}
        highway_ways: List[Tuple[int, Dict[str, str], List[int]]] = []

        for way in root.findall("way"):
            tags = {t.attrib["k"]: t.attrib["v"] for t in way.findall("tag")}
            if "highway" not in tags:
                continue

            wid = int(way.attrib["id"])
            node_refs = [int(nd.attrib["ref"]) for nd in way.findall("nd") if int(nd.attrib["ref"]) in self.raw_nodes]
            if len(node_refs) < 2:
                continue

            # Record usage to identify intersections/junctions
            for nid in node_refs:
                node_use_count[nid] = node_use_count.get(nid, 0) + 1

            highway_ways.append((wid, tags, node_refs))
            self.way_node_lists[wid] = node_refs
            self.way_tags[wid] = tags

        # 3. Create graph nodes for all highway vertices
        for wid, tags, node_refs in highway_ways:
            for idx, nid in enumerate(node_refs):
                n_str = f"node_{nid}"
                is_junction = (node_use_count[nid] > 1) or (idx == 0) or (idx == len(node_refs) - 1)
                if n_str not in self.nodes:
                    raw = self.raw_nodes[nid]
                    self.nodes[n_str] = {
                        "id": n_str,
                        "osmNodeId": nid,
                        "position": {"x": raw["x"], "y": raw["y"], "z": raw["z"]},
                        "isJunction": is_junction,
                        "connectedEdgeIds": [],
                    }
                elif is_junction:
                    self.nodes[n_str]["isJunction"] = True

        # 4. Generate directed edges for every consecutive pair in highway ways
        edge_counter = 0
        total_length = 0.0

        for wid, tags, node_refs in highway_ways:
            hclass = tags.get("highway", "residential")
            profile = HIGHWAY_PROFILES.get(hclass, HIGHWAY_PROFILES["residential"])
            width_m = float(tags.get("width", profile["width"]))
            speed_kph = float(tags.get("maxspeed", profile["speed_kph"]))
            surface = tags.get("surface", profile["surface"])
            allows_rickshaw = parse_rickshaw_access(tags, hclass)
            fwd_allowed, bwd_allowed = parse_oneway(tags, width_m)

            for i in range(len(node_refs) - 1):
                u_id = f"node_{node_refs[i]}"
                v_id = f"node_{node_refs[i + 1]}"
                pu = self.raw_nodes[node_refs[i]]
                pv = self.raw_nodes[node_refs[i + 1]]

                dx = pv["x"] - pu["x"]
                dy = pv["y"] - pu["y"]
                dz = pv["z"] - pu["z"]
                dist = round(math.sqrt(dx * dx + dy * dy + dz * dz), 3)
                total_length += dist

                wp_fwd = [{"x": pu["x"], "y": pu["y"], "z": pu["z"]}, {"x": pv["x"], "y": pv["y"], "z": pv["z"]}]
                wp_bwd = [{"x": pv["x"], "y": pv["y"], "z": pv["z"]}, {"x": pu["x"], "y": pu["y"], "z": pu["z"]}]

                # Forward directed edge
                if fwd_allowed:
                    edge_counter += 1
                    edge_id = f"edge_{edge_counter}"
                    edge_obj = {
                        "id": edge_id,
                        "osmWayId": wid,
                        "fromNodeId": u_id,
                        "toNodeId": v_id,
                        "distanceMeters": dist,
                        "highwayClass": hclass,
                        "isOneWay": not bwd_allowed,
                        "allowsRickshaw": allows_rickshaw,
                        "widthMeters": width_m,
                        "speedLimitKph": speed_kph,
                        "surface": surface,
                        "waypoints": wp_fwd,
                    }
                    self.edges.append(edge_obj)
                    self.nodes[u_id]["connectedEdgeIds"].append(edge_id)

                # Backward directed edge
                if bwd_allowed:
                    edge_counter += 1
                    rev_edge_id = f"edge_{edge_counter}"
                    rev_edge_obj = {
                        "id": rev_edge_id,
                        "osmWayId": wid,
                        "fromNodeId": v_id,
                        "toNodeId": u_id,
                        "distanceMeters": dist,
                        "highwayClass": hclass,
                        "isOneWay": not fwd_allowed,
                        "allowsRickshaw": allows_rickshaw,
                        "widthMeters": width_m,
                        "speedLimitKph": speed_kph,
                        "surface": surface,
                        "waypoints": wp_bwd,
                    }
                    self.edges.append(rev_edge_obj)
                    self.nodes[v_id]["connectedEdgeIds"].append(rev_edge_id)

        # 5. Author Rathkhola Plaza Access Connector
        # Market Pickup anchor: (+15.0, 0.0, -10.0)
        plaza_connectors = self._author_rathkhola_plaza_connector()
        edge_counter += len(plaza_connectors)
        for conn in plaza_connectors:
            self.edges.append(conn)
            self.nodes[conn["fromNodeId"]]["connectedEdgeIds"].append(conn["id"])
            total_length += conn["distanceMeters"]

        # 6. Parse turn restrictions
        self._parse_turn_restrictions(root)

        graph_result = {
            "version": "1.0.0",
            "crs": "ESRI:102954",
            "origin": {"x": 0.0, "y": 0.0, "z": 0.0},
            "nodes": self.nodes,
            "edges": self.edges,
            "turnRestrictions": self.turn_restrictions,
            "totalRoadLengthMeters": round(total_length, 2),
            "plazaConnectorsCount": len(plaza_connectors),
        }

        print(f"Generated DirectedNavGraph: {len(self.nodes)} nodes, {len(self.edges)} directed edges, {round(total_length/1000, 3)} km total road length.")
        return graph_result

    def _author_rathkhola_plaza_connector(self) -> List[Dict[str, Any]]:
        """
        Authors dedicated pedestrian/plaza access connectors linking the Rathkhola Market Corner
        pickup location (+15.0, 0.0, -10.0) to the nearest street road network nodes.
        Resolves the Phase 0 deferred mission route connection.
        """
        pickup_node_id = "node_rathkhola_market_pickup"
        pickup_pos = {"x": 15.0, "y": 0.0, "z": -10.0}

        self.nodes[pickup_node_id] = {
            "id": pickup_node_id,
            "position": pickup_pos,
            "isJunction": True,
            "connectedEdgeIds": [],
        }

        # Find nearest street network nodes to Rathkhola pickup
        candidates = []
        for nid, node in self.nodes.items():
            if nid == pickup_node_id:
                continue
            pos = node["position"]
            dx = pos["x"] - pickup_pos["x"]
            dz = pos["z"] - pickup_pos["z"]
            dist = math.hypot(dx, dz)
            if dist < 60.0:  # Within 60m of market corner
                candidates.append((dist, nid, pos))

        candidates.sort(key=lambda c: c[0])
        connectors: List[Dict[str, Any]] = []

        # Connect to the 2 closest street nodes
        for idx, (dist, target_nid, target_pos) in enumerate(candidates[:2]):
            dist_rounded = round(dist, 3)
            fwd_id = f"edge_plaza_conn_fwd_{idx+1}"
            bwd_id = f"edge_plaza_conn_bwd_{idx+1}"

            waypoints_fwd = [pickup_pos, target_pos]
            waypoints_bwd = [target_pos, pickup_pos]

            connectors.append({
                "id": fwd_id,
                "fromNodeId": pickup_node_id,
                "toNodeId": target_nid,
                "distanceMeters": dist_rounded,
                "highwayClass": "plaza_connector",
                "isOneWay": False,
                "allowsRickshaw": True,
                "widthMeters": 4.0,
                "speedLimitKph": 15,
                "surface": "brick",
                "waypoints": waypoints_fwd,
            })

            connectors.append({
                "id": bwd_id,
                "fromNodeId": target_nid,
                "toNodeId": pickup_node_id,
                "distanceMeters": dist_rounded,
                "highwayClass": "plaza_connector",
                "isOneWay": False,
                "allowsRickshaw": True,
                "widthMeters": 4.0,
                "speedLimitKph": 15,
                "surface": "brick",
                "waypoints": waypoints_bwd,
            })

        return connectors

    def _parse_turn_restrictions(self, root: ET.Element) -> None:
        """
        Parses OSM relations with type=restriction.
        """
        r_count = 0
        for relation in root.findall("relation"):
            tags = {t.attrib["k"]: t.attrib["v"] for t in relation.findall("tag")}
            if tags.get("type") != "restriction":
                continue

            r_type = tags.get("restriction", "no_turn")
            from_way_id: Optional[int] = None
            to_way_id: Optional[int] = None
            via_node_id: Optional[int] = None

            for m in relation.findall("member"):
                role = m.attrib.get("role")
                m_type = m.attrib.get("type")
                ref = int(m.attrib.get("ref", 0))
                if m_type == "way" and role == "from":
                    from_way_id = ref
                elif m_type == "way" and role == "to":
                    to_way_id = ref
                elif m_type == "node" and role == "via":
                    via_node_id = ref

            if from_way_id and to_way_id and via_node_id:
                r_count += 1
                self.turn_restrictions.append({
                    "id": f"restriction_{r_count}",
                    "type": r_type,
                    "fromWayId": from_way_id,
                    "toWayId": to_way_id,
                    "viaNodeId": f"node_{via_node_id}",
                })

    def dijkstra(self, start_node_id: str, end_node_id: str, require_rickshaw: bool = True) -> Optional[Dict[str, Any]]:
        """
        Runs Dijkstra shortest-path algorithm on the directed navigation graph.
        Returns path node IDs, edge IDs, and total distance.
        """
        if start_node_id not in self.nodes or end_node_id not in self.nodes:
            return None

        # Adjacency list: fromNodeId -> list of (toNodeId, distance, edgeId)
        adj: Dict[str, List[Tuple[str, float, str]]] = {nid: [] for nid in self.nodes}
        for edge in self.edges:
            if require_rickshaw and not edge["allowsRickshaw"]:
                continue
            adj[edge["fromNodeId"]].append((edge["toNodeId"], edge["distanceMeters"], edge["id"]))

        distances: Dict[str, float] = {nid: float("inf") for nid in self.nodes}
        distances[start_node_id] = 0.0
        previous: Dict[str, Tuple[Optional[str], Optional[str]]] = {nid: (None, None) for nid in self.nodes}

        pq: List[Tuple[float, str]] = [(0.0, start_node_id)]

        while pq:
            curr_dist, u = heapq.heappop(pq)
            if curr_dist > distances[u]:
                continue
            if u == end_node_id:
                break

            for v, dist, edge_id in adj.get(u, []):
                new_dist = curr_dist + dist
                if new_dist < distances[v]:
                    distances[v] = new_dist
                    previous[v] = (u, edge_id)
                    heapq.heappush(pq, (new_dist, v))

        if math.isinf(distances[end_node_id]):
            return None

        # Reconstruct path
        path_nodes: List[str] = []
        path_edges: List[str] = []
        curr: Optional[str] = end_node_id

        while curr is not None:
            path_nodes.append(curr)
            prev_node, edge_id = previous[curr]
            if edge_id:
                path_edges.append(edge_id)
            curr = prev_node

        path_nodes.reverse()
        path_edges.reverse()

        return {
            "startNodeId": start_node_id,
            "endNodeId": end_node_id,
            "totalDistanceMeters": round(distances[end_node_id], 3),
            "nodeCount": len(path_nodes),
            "edgeCount": len(path_edges),
            "pathNodes": path_nodes,
            "pathEdges": path_edges,
        }

    def save(self, output_path: str = OUTPUT_JSON_PATH) -> Dict[str, Any]:
        data = self.build()
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Saved directed navigation graph to {output_path}")
        return data


if __name__ == "__main__":
    builder = DirectedNavGraphBuilder()
    graph = builder.save()

    # Test route from Rathkhola pickup to Hardinge High School Gate
    pickup_node = "node_rathkhola_market_pickup"
    # Find closest node to Hardinge Gate (-73.1, 1.0, -221.3)
    target_pos = (-73.1, -221.3)
    best_node = None
    best_dist = float("inf")
    for nid, node in graph["nodes"].items():
        dx = node["position"]["x"] - target_pos[0]
        dz = node["position"]["z"] - target_pos[1]
        d = math.hypot(dx, dz)
        if d < best_dist:
            best_dist = d
            best_node = nid

    print(f"Testing route from {pickup_node} to Hardinge near {best_node} (snap offset: {round(best_dist, 2)}m)...")
    route = builder.dijkstra(pickup_node, best_node, require_rickshaw=True)
    if route:
        print(f"SUCCESS: Found directed traversable route! Distance: {route['totalDistanceMeters']}m, {route['edgeCount']} edges.")
    else:
        print("FAILED: No route found!")
