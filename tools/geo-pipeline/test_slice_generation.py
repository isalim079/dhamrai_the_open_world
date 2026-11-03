"""
Dhamrai Life — Unit Tests for Milestone 5 Slice Generation
==========================================================
Tests:
  1. DirectedNavGraph construction, oneway & contraflow, plaza connectors
  2. Road camber (1.5%) and embankment berms (35° slope)
  3. 2.5D building extrusion and Civic Protection Rule
  4. glTF 2.0 Binary container serialization & parsing
  5. 16-chunk spatial partitioning and world manifest
  6. End-to-end Dijkstra traversability to Hardinge Gate
"""

import os
import math
import json
import unittest
from typing import Dict, Any

from directed_nav_graph import DirectedNavGraphBuilder, parse_oneway, parse_rickshaw_access
from slice_mesh_generator import (
    GeometryBuffer,
    SliceMeshGenerator,
    export_glb,
    triangulate_2d_polygon,
)
from qa_slice_validation import SliceQAValidator, parse_glb_mesh_data

CHUNKS_DIR = "data/world/chunks"
WORLD_MANIFEST_PATH = "data/world/world_manifest.json"


class TestSliceGeneration(unittest.TestCase):
    def setUp(self):
        self.mesh_gen = SliceMeshGenerator()

    def test_directed_nav_graph_construction(self):
        builder = DirectedNavGraphBuilder()
        graph = builder.build()

        self.assertGreater(len(graph["nodes"]), 400)
        self.assertGreater(len(graph["edges"]), 800)
        self.assertGreater(graph["totalRoadLengthMeters"], 9000.0)
        self.assertGreater(graph["plazaConnectorsCount"], 0)

        # Check pickup node
        self.assertIn("node_rathkhola_market_pickup", graph["nodes"])
        pickup_node = graph["nodes"]["node_rathkhola_market_pickup"]
        self.assertEqual(pickup_node["position"]["x"], 15.0)
        self.assertEqual(pickup_node["position"]["y"], 0.0)
        self.assertEqual(pickup_node["position"]["z"], -10.0)
        self.assertGreater(len(pickup_node["connectedEdgeIds"]), 0)

    def test_oneway_and_contraflow_semantics(self):
        # 1. Standard oneway forward
        fwd, bwd = parse_oneway({"oneway": "yes"}, width_m=3.5)
        self.assertTrue(fwd)
        self.assertFalse(bwd)

        # 2. Oneway with rickshaw contraflow on wide road (>= 4.0m)
        fwd, bwd = parse_oneway({"oneway": "yes", "oneway:rickshaw": "no"}, width_m=4.5)
        self.assertTrue(fwd)
        self.assertTrue(bwd)

        # 3. Oneway with rickshaw contraflow on narrow road (< 4.0m) - unsafe for contraflow
        fwd, bwd = parse_oneway({"oneway": "yes", "oneway:rickshaw": "no"}, width_m=3.0)
        self.assertTrue(fwd)
        self.assertFalse(bwd)

        # 4. Standard bidirectional
        fwd, bwd = parse_oneway({"oneway": "no"}, width_m=4.0)
        self.assertTrue(fwd)
        self.assertTrue(bwd)

    def test_rickshaw_access_hierarchy(self):
        # Trunk/Primary/Residential default allow rickshaws
        self.assertTrue(parse_rickshaw_access({}, "residential"))
        self.assertTrue(parse_rickshaw_access({}, "primary"))

        # Footway/Steps bar rickshaws
        self.assertFalse(parse_rickshaw_access({}, "footway"))
        self.assertFalse(parse_rickshaw_access({}, "steps"))

        # motor_vehicle=no still permits pedal rickshaw
        self.assertTrue(parse_rickshaw_access({"motor_vehicle": "no"}, "pedestrian"))

        # vehicle=no bars rickshaw
        self.assertFalse(parse_rickshaw_access({"vehicle": "no"}, "residential"))

        # Explicit rickshaw=yes overrides vehicle=no
        self.assertTrue(parse_rickshaw_access({"vehicle": "no", "rickshaw": "yes"}, "pedestrian"))

    def test_road_camber_and_embankment_berms(self):
        road_buf = GeometryBuffer("roads", material_idx=0)
        emb_buf = GeometryBuffer("embankments", material_idx=1)

        waypoints = [
            {"x": 0.0, "y": 0.0, "z": 0.0},
            {"x": 0.0, "y": 0.0, "z": 10.0},
        ]
        width_m = 6.0  # half_w = 3.0m

        self.mesh_gen.build_road_mesh(waypoints, width_m, road_buf, emb_buf)

        # Road surface has 2 quads (4 triangles): left lane quad + right lane quad
        self.assertEqual(road_buf.triangle_count, 4)

        # Embankments have 2 quads (4 triangles): left berm + right berm
        self.assertEqual(emb_buf.triangle_count, 4)

        # Verify camber drop at road shoulder: half_w * 0.015 = 3.0 * 0.015 = 0.045m
        expected_camber_drop = -0.045
        min_road_b, max_road_b = road_buf.get_bounds()
        self.assertAlmostEqual(min_road_b[1], expected_camber_drop, places=3)
        self.assertAlmostEqual(max_road_b[1], 0.0, places=3)

        # Verify embankment vertical drop: camber_drop - 1.2m = -1.245m
        min_emb_b, _ = emb_buf.get_bounds()
        self.assertAlmostEqual(min_emb_b[1], expected_camber_drop - 1.2, places=3)

        # Verify horizontal berm run = 1.2 / tan(35°) = ~1.7137m
        expected_berm_x = 3.0 + 1.2 / math.tan(math.radians(35.0))
        _, max_emb_b = emb_buf.get_bounds()
        self.assertAlmostEqual(max_emb_b[0], expected_berm_x, places=3)

    def test_civic_protection_rule(self):
        building_buf = GeometryBuffer("buildings", material_idx=2)

        # 1. Massive 1,000m² building with NO civic tags -> MUST NOT be civic!
        huge_coords = [(0, 0), (50, 0), (50, 20), (0, 20)]
        res_huge = self.mesh_gen.extrude_building(101, huge_coords, {}, building_buf)
        self.assertTrue(res_huge["valid"])
        self.assertFalse(res_huge["isCivic"])
        self.assertEqual(res_huge["typology"], "commercial_market")

        # 2. Medium building (100m²) with NO civic tags -> residential_brick
        med_coords = [(0, 0), (10, 0), (10, 10), (0, 10)]
        res_med = self.mesh_gen.extrude_building(102, med_coords, {}, building_buf)
        self.assertTrue(res_med["valid"])
        self.assertFalse(res_med["isCivic"])
        self.assertEqual(res_med["typology"], "residential_brick")

        # 3. Small building (30m²) with NO civic tags -> residential_tin
        small_coords = [(0, 0), (6, 0), (6, 5), (0, 5)]
        res_small = self.mesh_gen.extrude_building(103, small_coords, {}, building_buf)
        self.assertTrue(res_small["valid"])
        self.assertFalse(res_small["isCivic"])
        self.assertEqual(res_small["typology"], "residential_tin")

        # 4. Small building (40m²) with explicit amenity=school -> MUST be civic!
        res_school = self.mesh_gen.extrude_building(104, small_coords, {"amenity": "school"}, building_buf)
        self.assertTrue(res_school["valid"])
        self.assertTrue(res_school["isCivic"])
        self.assertEqual(res_school["typology"], "civic_educational")

    def test_polygon_ear_clipping_triangulation(self):
        # L-shaped polygon (non-convex)
        l_shape = [(0, 0), (10, 0), (10, 4), (4, 4), (4, 10), (0, 10)]
        tris = triangulate_2d_polygon(l_shape)
        # An n-gon has exactly (n - 2) triangles: 6 - 2 = 4 triangles
        self.assertEqual(len(tris), 4)

    def test_glb_container_export_and_unpacking(self):
        buf = GeometryBuffer("test_mesh", material_idx=0)
        v0 = buf.add_vertex(0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0)
        v1 = buf.add_vertex(5.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0)
        v2 = buf.add_vertex(0.0, 0.0, 5.0, 0.0, 1.0, 0.0, 0.0, 1.0)
        buf.add_triangle(v0, v1, v2)

        glb_bytes = export_glb([buf])
        self.assertGreater(len(glb_bytes), 12 + 8)
        self.assertEqual(glb_bytes[:4], b"glTF")

        # Test writing and reading back
        temp_path = "data/world/test_temp.glb"
        try:
            with open(temp_path, "wb") as f:
                f.write(glb_bytes)
            prims = parse_glb_mesh_data(temp_path)
            self.assertEqual(len(prims), 1)
            self.assertEqual(prims[0]["triangle_count"], 1)
            self.assertEqual(prims[0]["vertex_count"], 3)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def test_16_chunk_artifacts_and_world_manifest(self):
        self.assertTrue(os.path.exists(WORLD_MANIFEST_PATH))
        with open(WORLD_MANIFEST_PATH, "r", encoding="utf-8") as f:
            world_manifest = json.load(f)

        self.assertEqual(world_manifest["totalChunks"], 16)
        self.assertEqual(len(world_manifest["chunks"]), 16)
        self.assertEqual(world_manifest["crs"], "ESRI:102954")

        # Verify all 16 GLBs and JSON manifests exist and meet budgets
        for c in world_manifest["chunks"]:
            glb_path = os.path.join(CHUNKS_DIR, c["glbAsset"])
            json_path = os.path.join(CHUNKS_DIR, f"{c['chunkId']}.json")
            self.assertTrue(os.path.exists(glb_path), f"Missing {glb_path}")
            self.assertTrue(os.path.exists(json_path), f"Missing {json_path}")
            self.assertLessEqual(c["fileSizeBytes"], 2.5 * 1024 * 1024)
            self.assertLessEqual(c["triangleCount"], 40000)

    def test_dijkstra_traversability_to_hardinge(self):
        validator = SliceQAValidator()
        result = validator.check_qa_routing_03()
        self.assertTrue(result["passed"])
        self.assertGreater(result["distanceMeters"], 500.0)
        self.assertLess(result["distanceMeters"], 700.0)

    def test_full_qa_suite_passes(self):
        validator = SliceQAValidator()
        qa_result = validator.run_all()
        self.assertTrue(qa_result["allPassed"])


if __name__ == "__main__":
    unittest.main()
