"""
Dhamrai Life — Chunk Partitioner & World Manifest Generator
============================================================
Partitions geographic features (roads, embankments, buildings, terrain)
across the 16 canonical Phase 1 chunks (256m x 256m each, 4x4 grid).
Outputs:
  data/world/chunks/dhamrai_chunk_x{cx}_z{cz}.glb
  data/world/chunks/dhamrai_chunk_x{cx}_z{cz}.json
  data/world/world_manifest.json
"""

import os
import math
import json
import xml.etree.ElementTree as ET
from typing import Dict, List, Tuple, Any
from shapely.geometry import LineString, box, Polygon, MultiLineString

from coordinate_transform import CoordinateTransformer
from slice_mesh_generator import (
    GeometryBuffer,
    SliceMeshGenerator,
    export_glb,
)
from directed_nav_graph import HIGHWAY_PROFILES

RAW_XML_PATH = "data/sources/raw_osm_sample_b_phase1_slice.xml"
CHUNKS_DIR = "data/world/chunks"
WORLD_MANIFEST_PATH = "data/world/world_manifest.json"

CHUNK_SIZE = 256.0
AXIS_INDICES = [-2, -1, 0, 1]  # 4x4 grid: X, Z in [-512, 512]


def get_chunk_id(cx: int, cz: int) -> str:
    return f"dhamrai_chunk_x{cx}_z{cz}"


def get_chunk_bounds(cx: int, cz: int) -> Dict[str, float]:
    return {
        "minX": round(cx * CHUNK_SIZE, 3),
        "minZ": round(cz * CHUNK_SIZE, 3),
        "maxX": round((cx + 1) * CHUNK_SIZE, 3),
        "maxZ": round((cz + 1) * CHUNK_SIZE, 3),
    }


def get_chunk_neighbors(cx: int, cz: int) -> List[str]:
    neighbors = []
    for dx in (-1, 0, 1):
        for dz in (-1, 0, 1):
            if dx == 0 and dz == 0:
                continue
            nx, nz = cx + dx, cz + dz
            if nx in AXIS_INDICES and nz in AXIS_INDICES:
                neighbors.append(get_chunk_id(nx, nz))
    return neighbors


class ChunkPartitioner:
    def __init__(self, xml_path: str = RAW_XML_PATH):
        self.xml_path = xml_path
        self.transformer = CoordinateTransformer()
        self.mesh_gen = SliceMeshGenerator()
        self.nodes: Dict[int, Dict[str, float]] = {}
        self.road_ways: List[Dict[str, Any]] = []
        self.building_ways: List[Dict[str, Any]] = []

    def load_osm_data(self):
        print(f"Loading OSM data from {self.xml_path}...")
        tree = ET.parse(self.xml_path)
        root = tree.getroot()

        for node in root.findall("node"):
            nid = int(node.attrib["id"])
            lon = float(node.attrib["lon"])
            lat = float(node.attrib["lat"])
            gx, gy, gz = self.transformer.wgs84_to_game(lon, lat)
            self.nodes[nid] = {"x": gx, "y": gy, "z": gz, "lon": lon, "lat": lat}

        for way in root.findall("way"):
            tags = {t.attrib["k"]: t.attrib["v"] for t in way.findall("tag")}
            wid = int(way.attrib["id"])
            refs = [int(nd.attrib["ref"]) for nd in way.findall("nd") if int(nd.attrib["ref"]) in self.nodes]

            if "highway" in tags and len(refs) >= 2:
                pts = [(self.nodes[r]["x"], self.nodes[r]["z"]) for r in refs]
                full_pts = [{"x": self.nodes[r]["x"], "y": self.nodes[r]["y"], "z": self.nodes[r]["z"]} for r in refs]
                hclass = tags.get("highway", "residential")
                profile = HIGHWAY_PROFILES.get(hclass, HIGHWAY_PROFILES["residential"])
                width_m = float(tags.get("width", profile["width"]))

                self.road_ways.append({
                    "osmId": wid,
                    "tags": tags,
                    "highwayClass": hclass,
                    "widthMeters": width_m,
                    "line": LineString(pts),
                    "waypoints": full_pts,
                })

            if "building" in tags and len(refs) >= 3:
                pts = [(self.nodes[r]["x"], self.nodes[r]["z"]) for r in refs]
                # Compute centroid
                cx = sum(p[0] for p in pts) / len(pts)
                cz = sum(p[1] for p in pts) / len(pts)
                self.building_ways.append({
                    "osmId": wid,
                    "tags": tags,
                    "coords": pts,
                    "centroid": (cx, cz),
                })

        # Add Rathkhola Market Corner plaza connector road segments
        # Pickup: (+15.0, 0.0, -10.0) -> Stand: (0.0, 0.0, 0.0)
        plaza_pts = [(0.0, 0.0), (15.0, -10.0)]
        self.road_ways.append({
            "osmId": 9999001,
            "tags": {"highway": "plaza_connector", "width": "4.0", "name": "Rathkhola Fairground Connector"},
            "highwayClass": "plaza_connector",
            "widthMeters": 4.0,
            "line": LineString(plaza_pts),
            "waypoints": [{"x": 0.0, "y": 0.0, "z": 0.0}, {"x": 15.0, "y": 0.0, "z": -10.0}],
        })

        print(f"Loaded {len(self.road_ways)} road ways, {len(self.building_ways)} building ways.")

    def partition_and_generate(self) -> Dict[str, Any]:
        os.makedirs(CHUNKS_DIR, exist_ok=True)
        chunk_manifests: List[Dict[str, Any]] = []

        total_buildings = 0
        total_roads = 0
        total_triangles_all = 0
        total_bytes_all = 0

        for cz in AXIS_INDICES:
            for cx in AXIS_INDICES:
                chunk_id = get_chunk_id(cx, cz)
                bounds = get_chunk_bounds(cx, cz)
                c_box = box(bounds["minX"], bounds["minZ"], bounds["maxX"], bounds["maxZ"])

                road_buf = GeometryBuffer("roads", material_idx=0)
                embankment_buf = GeometryBuffer("embankments", material_idx=1)
                terrain_buf = GeometryBuffer("terrain", material_idx=1)
                building_buf = GeometryBuffer("buildings", material_idx=2)

                # 1. Ground terrain tile (2 triangles covering the chunk footprint at ground baseline Y = -1.2m)
                t_y = -1.2
                v0 = terrain_buf.add_vertex(bounds["minX"], t_y, bounds["minZ"], 0.0, 1.0, 0.0, 0.0, 0.0)
                v1 = terrain_buf.add_vertex(bounds["maxX"], t_y, bounds["minZ"], 0.0, 1.0, 0.0, 1.0, 0.0)
                v2 = terrain_buf.add_vertex(bounds["maxX"], t_y, bounds["maxZ"], 0.0, 1.0, 0.0, 1.0, 1.0)
                v3 = terrain_buf.add_vertex(bounds["minX"], t_y, bounds["maxZ"], 0.0, 1.0, 0.0, 0.0, 1.0)
                terrain_buf.add_quad(v0, v1, v2, v3)

                # 2. Road ways intersecting this chunk
                roads_in_chunk = 0
                for road in self.road_ways:
                    if not road["line"].intersects(c_box):
                        continue

                    inter = road["line"].intersection(c_box)
                    if inter.is_empty:
                        continue

                    lines: List[LineString] = []
                    if inter.geom_type == "LineString":
                        lines.append(inter)
                    elif inter.geom_type == "MultiLineString":
                        lines.extend(inter.geoms)
                    elif inter.geom_type == "GeometryCollection":
                        for g in inter.geoms:
                            if g.geom_type == "LineString":
                                lines.append(g)

                    for line in lines:
                        coords = list(line.coords)
                        if len(coords) < 2:
                            continue
                        roads_in_chunk += 1
                        wp = [{"x": c[0], "y": 0.0, "z": c[1]} for c in coords]
                        self.mesh_gen.build_road_mesh(wp, road["widthMeters"], road_buf, embankment_buf)

                # 3. Buildings belonging to this chunk (by centroid)
                buildings_in_chunk = 0
                for b_way in self.building_ways:
                    bx, bz = b_way["centroid"]
                    b_cx = math.floor(bx / CHUNK_SIZE)
                    b_cz = math.floor(bz / CHUNK_SIZE)
                    if b_cx == cx and b_cz == cz:
                        res = self.mesh_gen.extrude_building(
                            b_way["osmId"],
                            b_way["coords"],
                            b_way["tags"],
                            building_buf
                        )
                        if res["valid"]:
                            buildings_in_chunk += 1

                # 4. Export GLB
                glb_bytes = export_glb([road_buf, embankment_buf, terrain_buf, building_buf])
                glb_filename = f"{chunk_id}.glb"
                glb_path = os.path.join(CHUNKS_DIR, glb_filename)
                with open(glb_path, "wb") as f:
                    f.write(glb_bytes)

                chunk_triangles = (
                    road_buf.triangle_count
                    + embankment_buf.triangle_count
                    + terrain_buf.triangle_count
                    + building_buf.triangle_count
                )
                chunk_file_size = len(glb_bytes)

                total_roads += roads_in_chunk
                total_buildings += buildings_in_chunk
                total_triangles_all += chunk_triangles
                total_bytes_all += chunk_file_size

                # 5. Chunk Manifest
                manifest = {
                    "worldDataVersion": "1.0.0",
                    "chunkId": chunk_id,
                    "chunkX": cx,
                    "chunkZ": cz,
                    "boundsMeters": bounds,
                    "neighbors": get_chunk_neighbors(cx, cz),
                    "glbAsset": glb_filename,
                    "roadCount": roads_in_chunk,
                    "buildingCount": buildings_in_chunk,
                    "triangleCount": chunk_triangles,
                    "fileSizeBytes": chunk_file_size,
                }

                manifest_path = os.path.join(CHUNKS_DIR, f"{chunk_id}.json")
                with open(manifest_path, "w", encoding="utf-8") as f:
                    json.dump(manifest, f, indent=2)

                chunk_manifests.append(manifest)
                print(f"Generated {chunk_id}: {roads_in_chunk} roads, {buildings_in_chunk} buildings, {chunk_triangles} tris, {chunk_file_size} bytes.")

        # 6. Generate World Manifest
        world_manifest = {
            "worldDataVersion": "1.0.0",
            "crs": "ESRI:102954",
            "origin": {
                "name": "Dhamrai Rathkhola Stand",
                "wgs84Lon": 90.217400,
                "wgs84Lat": 23.914800,
                "elevationM": 12.0,
                "projectedEasting": 522126.5567081776,
                "projectedNorthing": 2644810.7821246446,
            },
            "sliceBoundingBox": [90.212361, 23.910168, 90.222439, 23.919432],
            "chunkSizeMeters": int(CHUNK_SIZE),
            "activeChunkAxisIndices": AXIS_INDICES,
            "totalChunks": len(chunk_manifests),
            "totalRoads": total_roads,
            "totalBuildings": total_buildings,
            "totalTriangles": total_triangles_all,
            "chunks": chunk_manifests,
        }

        with open(WORLD_MANIFEST_PATH, "w", encoding="utf-8") as f:
            json.dump(world_manifest, f, indent=2)

        print(f"\nSaved World Manifest to {WORLD_MANIFEST_PATH}")
        print(f"Total: {len(chunk_manifests)} chunks, {total_roads} road segments, {total_buildings} buildings, {total_triangles_all} triangles, {round(total_bytes_all/1024, 1)} KB.")

        return world_manifest


if __name__ == "__main__":
    partitioner = ChunkPartitioner()
    partitioner.load_osm_data()
    partitioner.partition_and_generate()
