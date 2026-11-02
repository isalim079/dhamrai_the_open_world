"""
Dhamrai Life — Coordinate Reference System & Mission Validation Test Suite
==========================================================================
Tests:
1. BUTM2010 (ESRI:102954) definition parameters and regression guards (EPSG:9358 guard).
2. World origin alignment to (0, 0, 0) in Three.js right-handed coordinate convention.
3. Standardized 3D WorldPosition coordinates for all Phase 1 mission anchors.
4. Millimeter round-trip transformation consistency (WGS84 <-> Game Coordinates).
5. CRS reference point consistency across Bangladesh landmarks (mathematical consistency test).
6. Geodesic vs projected scale factor distortion (< 0.05% in Dhamrai).
7. Phase 1 4-corner bounding envelope containment test.
8. Traversable mission route continuity, waypoint ordering, and geometry validation.
"""

import unittest
import math
import json
import os
import pyproj
from coordinate_transform import (
    CoordinateTransformer,
    BUTM2010_WKT,
    ORIGIN_LON,
    ORIGIN_LAT,
    ORIGIN_ELEVATION,
    ORIGIN_PROJECTED_EASTING,
    ORIGIN_PROJECTED_NORTHING,
)

class TestCoordinateTransform(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.transformer = CoordinateTransformer()

    def test_crs_definition_validity(self):
        """Verify BUTM2010 WKT matches ESRI:102954 parameters."""
        crs = pyproj.CRS.from_wkt(BUTM2010_WKT)
        self.assertEqual(crs.name, "BUTM2010")
        self.assertTrue(crs.is_projected)
        
        params = {p.name: p.value for p in crs.coordinate_operation.params}
        self.assertAlmostEqual(params["Latitude of natural origin"], 0.0)
        self.assertAlmostEqual(params["Longitude of natural origin"], 90.0)
        self.assertAlmostEqual(params["Scale factor at natural origin"], 0.9996)
        self.assertAlmostEqual(params["False easting"], 500000.0)
        self.assertAlmostEqual(params["False northing"], 0.0)

    def test_crs_regression_epsg_9358(self):
        """Verify that EPSG:9358 is NOT BUTM 2010 (KSA-GRF17 guard)."""
        crs_wrong = pyproj.CRS.from_epsg(9358)
        self.assertIn("KSA-GRF17", crs_wrong.name)
        self.assertNotIn("BUTM", crs_wrong.name)

    def test_origin_is_zero(self):
        """World origin must project to exactly (0, 0, 0) in game coordinates."""
        gx, gy, gz = self.transformer.wgs84_to_game(ORIGIN_LON, ORIGIN_LAT, ORIGIN_ELEVATION)
        self.assertAlmostEqual(gx, 0.0, places=3)
        self.assertAlmostEqual(gy, 0.0, places=3)
        self.assertAlmostEqual(gz, 0.0, places=3)

    def test_origin_constants_full_precision(self):
        """Verify that authoritative origin constants match pyproj 3.6.1 projection to floating-point exactness."""
        calc_e, calc_n = self.transformer.wgs84_to_butm(ORIGIN_LON, ORIGIN_LAT)
        self.assertEqual(calc_e, ORIGIN_PROJECTED_EASTING)
        self.assertEqual(calc_n, ORIGIN_PROJECTED_NORTHING)
        self.assertEqual(self.transformer.origin_easting, ORIGIN_PROJECTED_EASTING)
        self.assertEqual(self.transformer.origin_northing, ORIGIN_PROJECTED_NORTHING)

    def test_phase1_mission_coordinates_threejs_axes(self):
        """
        Verify exact 3D coordinates for Phase 1 missions:
          X = Easting offset
          Y = Elevation offset (Elevation - 12.0m)
          Z = -Northing offset (South-positive, North-negative in Three.js right-handed system)
        """
        # Hardinge High School (North of origin: northing delta is +221.3m -> Z must be -221.3)
        h_x, h_y, h_z = self.transformer.wgs84_to_game(90.216685, 23.916800, 13.0)
        self.assertAlmostEqual(h_x, -73.1, delta=0.5, msg="Hardinge High School X offset mismatch")
        self.assertAlmostEqual(h_y, 1.0, delta=0.1, msg="Hardinge High School Y elevation mismatch")
        self.assertAlmostEqual(h_z, -221.3, delta=0.5, msg="Hardinge High School Z (North-negative) mismatch")

        # Thana Junction Checkpoint (South of origin: northing delta is -66.5m -> Z must be +66.5)
        t_x, t_y, t_z = self.transformer.wgs84_to_game(90.216800, 23.914200, 12.0)
        self.assertAlmostEqual(t_x, -61.0, delta=0.5, msg="Thana Junction X offset mismatch")
        self.assertAlmostEqual(t_y, 0.0, delta=0.1, msg="Thana Junction Y elevation mismatch")
        self.assertAlmostEqual(t_z, 66.5, delta=0.5, msg="Thana Junction Z (South-positive) mismatch")

        # Metal Craft Workshop (North of origin: northing delta is +77.0m -> Z must be -77.0)
        m_x, m_y, m_z = self.transformer.wgs84_to_game(90.214500, 23.915500, 12.0)
        self.assertAlmostEqual(m_x, -295.3, delta=0.5, msg="Metal Craft Workshop X offset mismatch")
        self.assertAlmostEqual(m_y, 0.0, delta=0.1, msg="Metal Craft Workshop Y elevation mismatch")
        self.assertAlmostEqual(m_z, -77.0, delta=0.5, msg="Metal Craft Workshop Z (North-negative) mismatch")

        # Yashomadhab Mandir (North of origin: northing delta is +110.2m -> Z must be -110.2)
        y_x, y_y, y_z = self.transformer.wgs84_to_game(90.214000, 23.915800, 12.5)
        self.assertAlmostEqual(y_x, -346.2, delta=0.5, msg="Yashomadhab Mandir X offset mismatch")
        self.assertAlmostEqual(y_y, 0.5, delta=0.1, msg="Yashomadhab Mandir Y elevation mismatch")
        self.assertAlmostEqual(y_z, -110.2, delta=0.5, msg="Yashomadhab Mandir Z (North-negative) mismatch")

    def test_round_trip_accuracy(self):
        """Verify round-trip WGS84 -> Game -> WGS84 preserves millimeter accuracy."""
        test_points = [
            ("Rathkhola", 90.217400, 23.914800, 12.0),
            ("Kayetpara Temple", 90.214000, 23.915800, 12.5),
            ("Hardinge High School", 90.216685, 23.916800, 13.0),
            ("Balia Zamindar Bari", 90.082573, 24.008351, 14.0),
            ("Shaitta Banyan Tree", 90.124577, 24.004958, 13.5),
            ("Jahangirnagar Univ Main Gate", 90.265000, 23.881000, 15.0),
        ]
        for name, lon, lat, elev in test_points:
            with self.subTest(name=name):
                gx, gy, gz = self.transformer.wgs84_to_game(lon, lat, elev)
                r_lon, r_lat, r_elev = self.transformer.game_to_wgs84(gx, gy, gz)
                self.assertAlmostEqual(lon, r_lon, places=6, msg=f"Longitude mismatch for {name}")
                self.assertAlmostEqual(lat, r_lat, places=6, msg=f"Latitude mismatch for {name}")
                self.assertAlmostEqual(elev, r_elev, places=2, msg=f"Elevation mismatch for {name}")

    def test_crs_reference_consistency_points(self):
        """
        Verify mathematical projection consistency across documented regional reference points.
        
        NOTE ON GEODETIC STATUS:
        This test evaluates mathematical consistency against the ESRI:102954 projection definition.
        It does NOT constitute independent empirical geodetic validation because no independent Survey of Bangladesh benchmark coordinates are included in this evidence bundle.
        ESRI:102954 remains 'Provisionally Adopted' pending formal geodetic benchmark requisition.
        """
        reference_points = [
            ("Tejgaon reference coordinate (not certified CORS)", 90.394667, 23.767333, 540214.06, 2628523.27),
            ("Jahangirnagar Univ Shahid Minar", 90.268000, 23.882500, 527283.33, 2641243.59),
            ("National Shahid Minar (Dhaka)", 90.398056, 23.727500, 540571.72, 2624114.24),
            ("Balia reference coordinate (not a surveyed trig node)", 90.082573, 24.008351, 508398.05, 2655153.57)
        ]
        for name, lon, lat, exp_e, exp_n in reference_points:
            with self.subTest(name=name):
                e, n = self.transformer.wgs84_to_butm(lon, lat)
                self.assertAlmostEqual(e, exp_e, delta=0.5, msg=f"Easting mismatch for {name}")
                self.assertAlmostEqual(n, exp_n, delta=0.5, msg=f"Northing mismatch for {name}")

    def test_scale_factor_distortion(self):
        """
        Verify that BUTM2010 scale factor in Dhamrai produces
        distance distortion less than 0.05% relative to geodesic length.
        """
        geod = pyproj.Geod(ellps="WGS84")
        lon1, lat1 = 90.210000, 23.914800
        lon2, lat2 = 90.220000, 23.914800
        
        _, _, geodesic_dist = geod.inv(lon1, lat1, lon2, lat2)
        
        gx1, _, gz1 = self.transformer.wgs84_to_game(lon1, lat1)
        gx2, _, gz2 = self.transformer.wgs84_to_game(lon2, lat2)
        projected_dist = math.hypot(gx2 - gx1, gz2 - gz1)
        
        ratio = abs(projected_dist - geodesic_dist) / geodesic_dist
        self.assertLess(ratio, 0.0005, f"Distortion {ratio*100:.4f}% exceeded 0.05% threshold")

    def test_phase1_bounding_envelope_4_corners(self):
        """
        Verify that the geographic query envelope [min_lon, min_lat, max_lon, max_lat]
        strictly contains all four inverse-transformed corners of the projected 1024m x 1024m world slice.
        
        Demonstrates why a naive 2-point SW/NE bounding box is invalid:
        - Meridian convergence (~0.088 deg) causes SE corner latitude (23.9101683) to be LOWER than SW (23.9101825).
        - NW corner latitude (23.9194316) is HIGHER than NE (23.9194174).
        """
        min_lon, min_lat, max_lon, max_lat = self.transformer.get_slice_bounding_envelope(512.0, 512.0)
        
        # Test exact expected envelope values (to 6 decimal places)
        self.assertEqual(min_lon, 90.212361)
        self.assertAlmostEqual(min_lat, 23.910168, delta=0.000005)
        self.assertEqual(max_lon, 90.222439)
        self.assertAlmostEqual(max_lat, 23.919432, delta=0.000005)

        corners = {
            "SW": (-512.0, +512.0),
            "NW": (-512.0, -512.0),
            "SE": (+512.0, +512.0),
            "NE": (+512.0, -512.0)
        }
        for name, (gx, gz) in corners.items():
            c_lon, c_lat = self.transformer.butm_to_wgs84(self.transformer.origin_easting + gx, self.transformer.origin_northing - gz)
            self.assertGreaterEqual(c_lon, min_lon, f"{name} lon below min_lon")
            self.assertLessEqual(c_lon, max_lon, f"{name} lon above max_lon")
            self.assertGreaterEqual(c_lat, min_lat, f"{name} lat below min_lat")
            self.assertLessEqual(c_lat, max_lat, f"{name} lat above max_lat")

        # Verify specifically that SE defines min_lat and NW defines max_lat
        _, sw_lat, _ = self.transformer.game_to_wgs84(-512.0, 0.0, +512.0)
        _, se_lat, _ = self.transformer.game_to_wgs84(+512.0, 0.0, +512.0)
        _, nw_lat, _ = self.transformer.game_to_wgs84(-512.0, 0.0, -512.0)
        _, ne_lat, _ = self.transformer.game_to_wgs84(+512.0, 0.0, -512.0)

        self.assertLess(se_lat, sw_lat, "SE corner must have lower latitude than SW corner due to meridian convergence")
        self.assertGreater(nw_lat, ne_lat, "NW corner must have higher latitude than NE corner due to meridian convergence")

    def test_mission_routes_continuity_and_ordering(self):
        """
        Verify machine-readable mission fixture data/world/mission_routes.json:
        1. All mission polylines exist, have >= 2 waypoints, and strictly incrementing sequence numbers.
        2. Route continuity: adjacent waypoints have distance matching leg_distance_m (no discontinuous jumps).
        3. Mission 2 Police Station offset: Checkpoint is 83.3m ESE from station, NOT 'directly outside'.
        4. Mission 3 Geometry: Yashomadhab Temple is NOT on the direct workshop-to-Rathkhola delivery route.
        5. Mission 3 distances apply to snapped road nodes; courtyard traversal is unknown.
        """
        fixture_path = "data/world/mission_routes.json"
        self.assertTrue(os.path.exists(fixture_path), f"Missing {fixture_path}")
        
        with open(fixture_path, encoding="utf-8") as f:
            data = json.load(f)
            
        missions = data["missions"]
        self.assertIn("mission_1_first_fare", missions)
        self.assertIn("mission_2_police_checkpoint", missions)
        self.assertIn("mission_3_artisan_order_direct", missions)
        self.assertIn("mission_3_artisan_order_temple_detour", missions)

        # Check Mission 1 route semantics: labeled as origin-to-school road graph fixture with passenger pickup pending
        m1 = missions["mission_1_first_fare"]
        self.assertEqual(m1["route_type"], "origin_to_school_road_graph_fixture_only")
        self.assertEqual(m1["passenger_pickup_status"], "pending_plaza_access_geometry")

        # The documented market pickup is north of the origin (negative Z).
        pickup = data["control_locations"]["rathkhola_pickup"]["world_position"]
        self.assertAlmostEqual(pickup["x"], 15.0, delta=0.05)
        self.assertAlmostEqual(pickup["z"], -10.0, delta=0.05)
        # Check Mission 2 context
        m2_context = missions["mission_2_police_checkpoint"]["location_context"]
        self.assertAlmostEqual(m2_context["euclidean_distance_to_station_m"], 83.28, delta=1.0)
        self.assertAlmostEqual(m2_context["road_network_distance_to_station_m"], 149.44, delta=2.0)

        # Check Mission 3 Direct vs Detour
        m3_direct = missions["mission_3_artisan_order_direct"]
        m3_detour = missions["mission_3_artisan_order_temple_detour"]
        self.assertFalse(m3_direct["passes_temple_road_node"], "Mission 3 direct route must miss nearest temple road vertex")
        self.assertTrue(m3_detour["passes_temple_road_node"], "Mission 3 detour must visit nearest temple road vertex")
        self.assertGreater(m3_detour["calculated_road_distance_m"], m3_direct["calculated_road_distance_m"])
        self.assertAlmostEqual(m3_direct["calculated_road_distance_m"], 534.16, delta=2.0)
        self.assertAlmostEqual(m3_detour["calculated_road_distance_m"], 615.50, delta=2.0)

        evidence = data["mission_3_distance_evidence"]
        self.assertAlmostEqual(evidence["horizontal_straight_line_workshop_to_temple_m"], math.hypot(50.9, 33.2), places=8)
        self.assertAlmostEqual(evidence["workshop_to_temple_graph_m"], 42.38, places=2)
        self.assertAlmostEqual(evidence["temple_to_rathkhola_graph_m"], 573.12, places=2)
        self.assertIsNone(m3_direct["traverses_temple_courtyard"])
        self.assertIsNone(m3_detour["traverses_temple_courtyard"])
        # Validate each saved graph edge against raw OSM topology, and independently
        # rerun Dijkstra from its endpoints. This detects forged/shortcut polylines.
        from generate_mission_routes import load_graph, dijkstra_shortest_path
        import hashlib
        source = data["metadata"]["source_snapshot"]
        with open(source, "rb") as raw:
            self.assertEqual(hashlib.sha256(raw.read()).hexdigest(), data["metadata"]["source_sha256"])
        nodes, adj = load_graph(source)
        routes = [(m["route_polyline"], m["calculated_road_distance_m"], m is m3_detour) for m in missions.values()]
        routes += [(evidence["workshop_to_temple_polyline"], evidence["workshop_to_temple_graph_m"], False),
                   (evidence["temple_to_rathkhola_polyline"], evidence["temple_to_rathkhola_graph_m"], False)]
        for polyline, reported, is_detour in routes:
            actual = 0.0
            for a, b in zip(polyline, polyline[1:]):
                matching = [edge for edge in adj[a["osm_node_id"]] if edge[0] == b["osm_node_id"] and edge[2] == b["way_id"]]
                self.assertTrue(matching, "Polyline edge not in source OSM graph")
                actual += matching[0][1]
            self.assertAlmostEqual(actual, reported, delta=0.011)
            if not is_detour:
                _, shortest = dijkstra_shortest_path(polyline[0]["osm_node_id"], polyline[-1]["osm_node_id"], adj)
                self.assertAlmostEqual(shortest, reported, delta=0.011)
            self.assertTrue(all(abs(p["position"]["x"]) <= 512 and abs(p["position"]["z"]) <= 512 for p in polyline))
        # Check polyline continuity and sequence ordering across all routes
        for m_key, m_info in missions.items():
            polyline = m_info["route_polyline"]
            self.assertGreaterEqual(len(polyline), 2, f"{m_key} polyline too short")
            for idx in range(len(polyline)):
                self.assertEqual(polyline[idx]["seq"], idx, f"{m_key} waypoint sequence out of order at index {idx}")
                if idx > 0:
                    p1 = polyline[idx - 1]["position"]
                    p2 = polyline[idx]["position"]
                    computed_leg = math.hypot(p2["x"] - p1["x"], p2["z"] - p1["z"])
                    self.assertAlmostEqual(
                        computed_leg,
                        polyline[idx]["leg_distance_m"],
                        delta=0.1,
                        msg=f"{m_key} leg distance mismatch at index {idx}"
                    )
                    self.assertLess(computed_leg, 150.0, f"{m_key} has discontinuous jump of {computed_leg:.1f}m at index {idx}")

if __name__ == "__main__":
    unittest.main()
