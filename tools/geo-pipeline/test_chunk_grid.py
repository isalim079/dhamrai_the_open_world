"""Synthetic tests of grid counting semantics; not Upazila validation."""
import unittest
from shapely.geometry import box, Polygon
from audit_chunk_grid import count_cells


class TestChunkGrid(unittest.TestCase):
    def test_small_polygon_is_one_partial_cell(self):
        r = count_cells(box(1, 1, 255, 255))
        self.assertEqual((r['intersecting_cells'], r['partial_boundary_cells'], r['fully_covered_cells']), (1, 1, 0))
        self.assertEqual(r['total_candidate_grid_coverage_m2'], 65536)

    def test_boundary_only_touches_are_counted_explicitly(self):
        r = count_cells(box(0, 0, 256, 256))
        self.assertEqual((r['intersecting_cells'], r['fully_covered_cells'], r['partial_boundary_cells']), (9, 1, 8))
        self.assertEqual(r['intersecting_cell_coverage_m2'], 9 * 65536)

    def test_hole_produces_outside_cell(self):
        polygon = Polygon(box(1, 1, 767, 767).exterior.coords, [box(255, 255, 513, 513).exterior.coords])
        r = count_cells(polygon)
        self.assertEqual(r['candidate_cells'], 9)
        self.assertEqual(r['outside_cells_within_candidate_grid'], 1)
        self.assertEqual(r['intersecting_cells'], 8)
        self.assertEqual(r['partial_boundary_cells'], 8)
        self.assertEqual(r['total_candidate_grid_coverage_m2'], 9 * 65536)


if __name__ == '__main__':
    unittest.main()
