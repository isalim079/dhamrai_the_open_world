"""
Dhamrai Life — 3D Slice Mesh Generator
=======================================
Generates 3D procedural meshes for the Phase 1 urban slice:
1. Road surface geometry with 1.5% camber crown slope.
2. Road embankment berms with 35° sloping descent (-1.2m drop).
3. Procedural 2.5D building extrusion with texture atlas UV mapping.
4. Civic & Institutional Protection Rule enforcement.
5. glTF 2.0 Binary (.glb) serialization.
"""

import math
import struct
import json
from typing import List, Dict, Tuple, Any, Optional
from shapely.geometry import Polygon


class GeometryBuffer:
    """Accumulates vertex attributes and triangle indices for glTF export."""

    def __init__(self, name: str, material_idx: int = 0):
        self.name = name
        self.material_idx = material_idx
        self.positions: List[float] = []  # x, y, z
        self.normals: List[float] = []    # nx, ny, nz
        self.uvs: List[float] = []        # u, v
        self.indices: List[int] = []
        self.vertex_count = 0

    def add_vertex(self, x: float, y: float, z: float, nx: float, ny: float, nz: float, u: float, v: float) -> int:
        idx = self.vertex_count
        self.positions.extend([round(x, 4), round(y, 4), round(z, 4)])
        self.normals.extend([round(nx, 4), round(ny, 4), round(nz, 4)])
        self.uvs.extend([round(u, 4), round(v, 4)])
        self.vertex_count += 1
        return idx

    def add_triangle(self, i1: int, i2: int, i3: int):
        self.indices.extend([i1, i2, i3])

    def add_quad(self, i1: int, i2: int, i3: int, i4: int):
        # Two triangles: (i1, i2, i3) and (i1, i3, i4)
        self.indices.extend([i1, i2, i3, i1, i3, i4])

    @property
    def triangle_count(self) -> int:
        return len(self.indices) // 3

    def get_bounds(self) -> Tuple[List[float], List[float]]:
        if not self.positions:
            return [0.0, 0.0, 0.0], [0.0, 0.0, 0.0]
        xs = self.positions[0::3]
        ys = self.positions[1::3]
        zs = self.positions[2::3]
        return [min(xs), min(ys), min(zs)], [max(xs), max(ys), max(zs)]


def triangulate_2d_polygon(coords: List[Tuple[float, float]]) -> List[Tuple[int, int, int]]:
    """
    Robust 2D ear-clipping triangulation for simple polygons.
    coords: list of (x, z) coordinates.
    Returns: list of vertex index tuples (i1, i2, i3).
    """
    if len(coords) < 3:
        return []
    if coords[0] == coords[-1]:
        coords = coords[:-1]
    n = len(coords)
    if n < 3:
        return []
    if n == 3:
        return [(0, 1, 2)]

    # Compute signed area to establish winding
    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        area += coords[i][0] * coords[j][1] - coords[j][0] * coords[i][1]

    indices = list(range(n))
    if area < 0:
        # Clockwise -> reverse to Counter-Clockwise
        indices.reverse()

    def is_convex(a: int, b: int, c: int) -> bool:
        ax, az = coords[a]
        bx, bz = coords[b]
        cx, cz = coords[c]
        # Cross product (bx - ax)*(cz - bz) - (bz - az)*(cx - bx)
        return (bx - ax) * (cz - bz) - (bz - az) * (cx - bx) > 1e-7

    def point_in_tri(p: int, a: int, b: int, c: int) -> bool:
        px, pz = coords[p]
        ax, az = coords[a]
        bx, bz = coords[b]
        cx, cz = coords[c]

        def sign(p1x, p1z, p2x, p2z, p3x, p3z):
            return (p1x - p3x) * (p2z - p3z) - (p2x - p3x) * (p1z - p3z)

        d1 = sign(px, pz, ax, az, bx, bz)
        d2 = sign(px, pz, bx, bz, cx, cz)
        d3 = sign(px, pz, cx, cz, ax, az)
        has_neg = (d1 < -1e-7) or (d2 < -1e-7) or (d3 < -1e-7)
        has_pos = (d1 > 1e-7) or (d2 > 1e-7) or (d3 > 1e-7)
        return not (has_neg and has_pos)

    triangles: List[Tuple[int, int, int]] = []
    attempts = 0
    while len(indices) > 3 and attempts < len(indices) * 2:
        m = len(indices)
        ear_found = False
        for i in range(m):
            prev_idx = indices[(i - 1) % m]
            curr_idx = indices[i]
            next_idx = indices[(i + 1) % m]

            if not is_convex(prev_idx, curr_idx, next_idx):
                continue

            any_inside = False
            for j in range(m):
                if j in ((i - 1) % m, i, (i + 1) % m):
                    continue
                if point_in_tri(indices[j], prev_idx, curr_idx, next_idx):
                    any_inside = True
                    break

            if not any_inside:
                triangles.append((prev_idx, curr_idx, next_idx))
                indices.pop(i)
                ear_found = True
                break

        if not ear_found:
            # Fallback for degenerate/imperfect shapes
            triangles.append((indices[0], indices[1], indices[2]))
            indices.pop(1)
        attempts += 1

    if len(indices) == 3:
        triangles.append((indices[0], indices[1], indices[2]))

    return triangles


class SliceMeshGenerator:
    """Generates 3D road, embankment, and building meshes for world chunks."""

    # Camber slope: 1.5% crown drainage
    CAMBER_SLOPE = 0.015

    # Embankment slope: 35 degrees descending -1.2m
    BERM_ANGLE_DEG = 35.0
    BERM_VERTICAL_DROP = 1.2
    # Berm run = drop / tan(35°) = 1.2 / 0.7002075 = ~1.7137m
    BERM_HORIZONTAL_RUN = BERM_VERTICAL_DROP / math.tan(math.radians(BERM_ANGLE_DEG))

    def __init__(self):
        pass

    def build_road_mesh(
        self,
        waypoints: List[Dict[str, float]],
        width_m: float,
        road_buf: GeometryBuffer,
        embankment_buf: GeometryBuffer
    ) -> None:
        """
        Builds road surface mesh with 1.5% camber slope and 35° sloping embankment berms.
        """
        if len(waypoints) < 2:
            return

        half_w = width_m / 2.0
        camber_drop = half_w * self.CAMBER_SLOPE  # Drop at road shoulder

        # Calculate cross-section perpendicular vectors at each waypoint
        cross_sections = []
        cumulative_dist = 0.0

        for i, pt in enumerate(waypoints):
            px, py, pz = pt["x"], pt.get("y", 0.0), pt["z"]

            # Compute tangent vector
            if i == 0:
                dx = waypoints[1]["x"] - px
                dz = waypoints[1]["z"] - pz
            elif i == len(waypoints) - 1:
                dx = px - waypoints[i - 1]["x"]
                dz = pz - waypoints[i - 1]["z"]
            else:
                dx = waypoints[i + 1]["x"] - waypoints[i - 1]["x"]
                dz = waypoints[i + 1]["z"] - waypoints[i - 1]["z"]

            length = math.hypot(dx, dz)
            if length < 1e-6:
                tx, tz = 1.0, 0.0
            else:
                tx, tz = dx / length, dz / length

            # Normal perpendicular (to the right in XZ plane)
            nx, nz = -tz, tx

            if i > 0:
                prev = waypoints[i - 1]
                seg_len = math.hypot(px - prev["x"], pz - prev["z"])
                cumulative_dist += seg_len

            # Road vertices:
            # 1. Left shoulder: -half_w * nx, drop camber
            left_x = px - half_w * nx
            left_y = py - camber_drop
            left_z = pz - half_w * nz

            # 2. Crown (center): at road baseline elevation
            crown_x = px
            crown_y = py
            crown_z = pz

            # 3. Right shoulder: +half_w * nx, drop camber
            right_x = px + half_w * nx
            right_y = py - camber_drop
            right_z = pz + half_w * nz

            # Embankment berm base vertices:
            # Left berm base: extends outward by BERM_HORIZONTAL_RUN and down by BERM_VERTICAL_DROP
            left_berm_x = left_x - self.BERM_HORIZONTAL_RUN * nx
            left_berm_y = py - camber_drop - self.BERM_VERTICAL_DROP
            left_berm_z = left_z - self.BERM_HORIZONTAL_RUN * nz

            # Right berm base:
            right_berm_x = right_x + self.BERM_HORIZONTAL_RUN * nx
            right_berm_y = py - camber_drop - self.BERM_VERTICAL_DROP
            right_berm_z = right_z + self.BERM_HORIZONTAL_RUN * nz

            cross_sections.append({
                "dist": cumulative_dist,
                "crown": (crown_x, crown_y, crown_z),
                "left": (left_x, left_y, left_z),
                "right": (right_x, right_y, right_z),
                "left_berm": (left_berm_x, left_berm_y, left_berm_z),
                "right_berm": (right_berm_x, right_berm_y, right_berm_z),
                "perp": (nx, nz),
            })

        # Connect consecutive cross-sections
        for i in range(len(cross_sections) - 1):
            cs0 = cross_sections[i]
            cs1 = cross_sections[i + 1]

            v0 = cs0["dist"] / 5.0
            v1 = cs1["dist"] / 5.0

            # 1. Road surface vertices (Camber normal tilts slightly outward)
            # Left lane: normal = (0.015 * -nx, 1.0, 0.015 * -nz) normalized
            norm_y = 1.0
            norm_mag = math.sqrt(norm_y * norm_y + self.CAMBER_SLOPE * self.CAMBER_SLOPE)
            ny_c = norm_y / norm_mag
            nx_l = -cs0["perp"][0] * self.CAMBER_SLOPE / norm_mag
            nz_l = -cs0["perp"][1] * self.CAMBER_SLOPE / norm_mag
            nx_r = cs0["perp"][0] * self.CAMBER_SLOPE / norm_mag
            nz_r = cs0["perp"][1] * self.CAMBER_SLOPE / norm_mag

            # Left lane vertices
            i_l0 = road_buf.add_vertex(*cs0["left"], nx_l, ny_c, nz_l, 0.0, v0)
            i_c0_l = road_buf.add_vertex(*cs0["crown"], nx_l, ny_c, nz_l, 0.5, v0)
            i_l1 = road_buf.add_vertex(*cs1["left"], nx_l, ny_c, nz_l, 0.0, v1)
            i_c1_l = road_buf.add_vertex(*cs1["crown"], nx_l, ny_c, nz_l, 0.5, v1)
            road_buf.add_quad(i_l0, i_l1, i_c1_l, i_c0_l)

            # Right lane vertices
            i_c0_r = road_buf.add_vertex(*cs0["crown"], nx_r, ny_c, nz_r, 0.5, v0)
            i_r0 = road_buf.add_vertex(*cs0["right"], nx_r, ny_c, nz_r, 1.0, v0)
            i_c1_r = road_buf.add_vertex(*cs1["crown"], nx_r, ny_c, nz_r, 0.5, v1)
            i_r1 = road_buf.add_vertex(*cs1["right"], nx_r, ny_c, nz_r, 1.0, v1)
            road_buf.add_quad(i_c0_r, i_c1_r, i_r1, i_r0)

            # 2. Embankment berms (35° slope)
            # Embankment normal: sin(35°) out, cos(35°) up
            sin35 = math.sin(math.radians(35.0))
            cos35 = math.cos(math.radians(35.0))

            # Left embankment: normal points outward (-perp)
            enx_l = -cs0["perp"][0] * cos35
            eny_l = sin35
            enz_l = -cs0["perp"][1] * cos35

            b_lb0 = embankment_buf.add_vertex(*cs0["left_berm"], enx_l, eny_l, enz_l, 0.0, v0)
            b_ls0 = embankment_buf.add_vertex(*cs0["left"], enx_l, eny_l, enz_l, 1.0, v0)
            b_lb1 = embankment_buf.add_vertex(*cs1["left_berm"], enx_l, eny_l, enz_l, 0.0, v1)
            b_ls1 = embankment_buf.add_vertex(*cs1["left"], enx_l, eny_l, enz_l, 1.0, v1)
            embankment_buf.add_quad(b_lb0, b_lb1, b_ls1, b_ls0)

            # Right embankment: normal points outward (+perp)
            enx_r = cs0["perp"][0] * cos35
            eny_r = sin35
            enz_r = cs0["perp"][1] * cos35

            b_rs0 = embankment_buf.add_vertex(*cs0["right"], enx_r, eny_r, enz_r, 0.0, v0)
            b_rb0 = embankment_buf.add_vertex(*cs0["right_berm"], enx_r, eny_r, enz_r, 1.0, v0)
            b_rs1 = embankment_buf.add_vertex(*cs1["right"], enx_r, eny_r, enz_r, 0.0, v1)
            b_rb1 = embankment_buf.add_vertex(*cs1["right_berm"], enx_r, eny_r, enz_r, 1.0, v1)
            embankment_buf.add_quad(b_rs0, b_rs1, b_rb1, b_rb0)

    def extrude_building(
        self,
        osm_id: int,
        coords: List[Tuple[float, float]],
        tags: Dict[str, str],
        building_buf: GeometryBuffer
    ) -> Dict[str, Any]:
        """
        Extrudes a closed building footprint into a 2.5D building mesh.
        Enforces Civic & Institutional Protection Rule:
        Footprint area alone NEVER designates a building's civic function.
        """
        if len(coords) < 3:
            return {"osmId": osm_id, "valid": False}

        # Clean polygon with Douglas-Peucker simplification (0.2m tolerance)
        poly = Polygon(coords)
        if not poly.is_valid:
            poly = poly.buffer(0)
        if poly.is_empty or poly.geom_type != "Polygon":
            return {"osmId": osm_id, "valid": False}

        poly = poly.simplify(0.2, preserve_topology=True)
        if poly.is_empty or len(poly.exterior.coords) < 4:
            return {"osmId": osm_id, "valid": False}

        cleaned_coords = list(poly.exterior.coords)
        if cleaned_coords[0] == cleaned_coords[-1]:
            cleaned_coords = cleaned_coords[:-1]
        n_pts = len(cleaned_coords)
        if n_pts < 3:
            return {"osmId": osm_id, "valid": False}

        area_m2 = poly.area

        # Evaluate typology and enforce Civic Protection Rule
        amenity = tags.get("amenity", "").lower()
        building_tag = tags.get("building", "").lower()
        religion = tags.get("religion", "").lower()

        # Check explicit semantic tags
        is_civic = False
        typology = "generic_residential"

        if amenity in ("school", "college") or building_tag in ("school", "college"):
            is_civic = True
            typology = "civic_educational"
        elif amenity in ("police", "courthouse"):
            is_civic = True
            typology = "civic_administrative"
        elif amenity in ("hospital", "clinic"):
            is_civic = True
            typology = "civic_healthcare"
        elif amenity == "place_of_worship" or religion in ("hindu", "muslim"):
            is_civic = True
            typology = "religious"
        else:
            # Civic Protection Rule: Default to generic massing by area, NEVER civic
            if area_m2 < 50.0:
                typology = "residential_tin"
            elif area_m2 <= 150.0:
                typology = "residential_brick"
            else:
                typology = "commercial_market"

        # Determine height and floor count
        if "height" in tags:
            try:
                height_m = float(tags["height"].replace("m", "").strip())
                stories = max(1, round(height_m / 3.0))
            except ValueError:
                height_m = 6.0
                stories = 2
        elif "building:levels" in tags:
            try:
                stories = max(1, int(tags["building:levels"]))
                height_m = stories * 3.0
            except ValueError:
                stories = 2
                height_m = 6.0
        else:
            # Procedural height from area
            if area_m2 < 50.0:
                stories = 1
                height_m = 3.2
            elif area_m2 <= 150.0:
                # Deterministic 2 or 3 stories based on osm_id
                stories = 2 if (osm_id % 2 == 0) else 3
                height_m = stories * 3.0
            else:
                # Deterministic 3 to 4 stories
                stories = 3 + (osm_id % 2)
                height_m = stories * 3.0

        # Build Wall Geometry
        wall_start_idx = building_buf.vertex_count
        perimeter_dist = 0.0

        for i in range(n_pts):
            p0 = cleaned_coords[i]
            p1 = cleaned_coords[(i + 1) % n_pts]
            dx = p1[0] - p0[0]
            dz = p1[1] - p0[1]
            seg_len = math.hypot(dx, dz)

            # Wall normal pointing outward
            if seg_len > 1e-6:
                nx = dz / seg_len
                nz = -dx / seg_len
            else:
                nx, nz = 0.0, 1.0

            u0 = perimeter_dist / 4.0
            perimeter_dist += seg_len
            u1 = perimeter_dist / 4.0

            # Ground vertices (Y = 0.0) and Roof-line vertices (Y = height_m)
            v_b0 = building_buf.add_vertex(p0[0], 0.0, p0[1], nx, 0.0, nz, u0, 0.0)
            v_t0 = building_buf.add_vertex(p0[0], height_m, p0[1], nx, 0.0, nz, u0, 0.6)
            v_b1 = building_buf.add_vertex(p1[0], 0.0, p1[1], nx, 0.0, nz, u1, 0.0)
            v_t1 = building_buf.add_vertex(p1[0], height_m, p1[1], nx, 0.0, nz, u1, 0.6)

            building_buf.add_quad(v_b0, v_b1, v_t1, v_t0)

        # Build Roof Geometry (Triangulation at Y = height_m)
        roof_tris = triangulate_2d_polygon(cleaned_coords)
        roof_v_indices = []

        min_x = min(p[0] for p in cleaned_coords)
        max_x = max(p[0] for p in cleaned_coords)
        min_z = min(p[1] for p in cleaned_coords)
        max_z = max(p[1] for p in cleaned_coords)
        span_x = max(1.0, max_x - min_x)
        span_z = max(1.0, max_z - min_z)

        for p in cleaned_coords:
            u_roof = 0.65 + 0.35 * ((p[0] - min_x) / span_x)
            v_roof = 0.65 + 0.35 * ((p[1] - min_z) / span_z)
            v_idx = building_buf.add_vertex(p[0], height_m, p[1], 0.0, 1.0, 0.0, u_roof, v_roof)
            roof_v_indices.append(v_idx)

        for t1, t2, t3 in roof_tris:
            building_buf.add_triangle(roof_v_indices[t1], roof_v_indices[t2], roof_v_indices[t3])

        return {
            "osmId": osm_id,
            "valid": True,
            "typology": typology,
            "isCivic": is_civic,
            "areaM2": round(area_m2, 2),
            "stories": stories,
            "heightM": round(height_m, 2),
            "vertexCount": building_buf.vertex_count - wall_start_idx,
        }


def export_glb(
    buffers: List[GeometryBuffer],
    material_names: List[str] = ("road_asphalt", "embankment_earth", "building_atlas")
) -> bytes:
    """
    Serializes multiple GeometryBuffers into a standard glTF 2.0 Binary (.glb) container.
    """
    materials_def = [
        {
            "name": "road_asphalt",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.22, 0.22, 0.24, 1.0],
                "roughnessFactor": 0.85,
                "metallicFactor": 0.05,
            },
        },
        {
            "name": "embankment_earth",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.38, 0.46, 0.28, 1.0],
                "roughnessFactor": 0.95,
                "metallicFactor": 0.0,
            },
        },
        {
            "name": "building_atlas",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.82, 0.78, 0.72, 1.0],
                "roughnessFactor": 0.75,
                "metallicFactor": 0.1,
            },
        },
    ]

    total_bin = bytearray()
    buffer_views: List[Dict[str, Any]] = []
    accessors: List[Dict[str, Any]] = []
    meshes: List[Dict[str, Any]] = []
    nodes: List[Dict[str, Any]] = []

    # Chunk root node
    nodes.append({"name": "ChunkRoot", "children": []})

    for buf_idx, buf in enumerate(buffers):
        if buf.triangle_count == 0:
            continue

        # 1. Positions (VEC3, FLOAT 5126)
        pos_bytes = struct.pack(f"<{len(buf.positions)}f", *buf.positions)
        pos_offset = len(total_bin)
        total_bin.extend(pos_bytes)
        while len(total_bin) % 4 != 0:
            total_bin.append(0)

        bv_pos_idx = len(buffer_views)
        buffer_views.append({
            "buffer": 0,
            "byteOffset": pos_offset,
            "byteLength": len(pos_bytes),
            "target": 34962,  # ARRAY_BUFFER
        })

        min_bounds, max_bounds = buf.get_bounds()
        acc_pos_idx = len(accessors)
        accessors.append({
            "bufferView": bv_pos_idx,
            "byteOffset": 0,
            "componentType": 5126,  # FLOAT
            "count": buf.vertex_count,
            "type": "VEC3",
            "min": min_bounds,
            "max": max_bounds,
        })

        # 2. Normals (VEC3, FLOAT 5126)
        norm_bytes = struct.pack(f"<{len(buf.normals)}f", *buf.normals)
        norm_offset = len(total_bin)
        total_bin.extend(norm_bytes)
        while len(total_bin) % 4 != 0:
            total_bin.append(0)

        bv_norm_idx = len(buffer_views)
        buffer_views.append({
            "buffer": 0,
            "byteOffset": norm_offset,
            "byteLength": len(norm_bytes),
            "target": 34962,
        })

        acc_norm_idx = len(accessors)
        accessors.append({
            "bufferView": bv_norm_idx,
            "byteOffset": 0,
            "componentType": 5126,
            "count": buf.vertex_count,
            "type": "VEC3",
        })

        # 3. Texcoords (VEC2, FLOAT 5126)
        uv_bytes = struct.pack(f"<{len(buf.uvs)}f", *buf.uvs)
        uv_offset = len(total_bin)
        total_bin.extend(uv_bytes)
        while len(total_bin) % 4 != 0:
            total_bin.append(0)

        bv_uv_idx = len(buffer_views)
        buffer_views.append({
            "buffer": 0,
            "byteOffset": uv_offset,
            "byteLength": len(uv_bytes),
            "target": 34962,
        })

        acc_uv_idx = len(accessors)
        accessors.append({
            "bufferView": bv_uv_idx,
            "byteOffset": 0,
            "componentType": 5126,
            "count": buf.vertex_count,
            "type": "VEC2",
        })

        # 4. Indices (SCALAR, UNSIGNED_SHORT 5123 or UNSIGNED_INT 5125)
        use_uint32 = buf.vertex_count > 65535
        if use_uint32:
            idx_bytes = struct.pack(f"<{len(buf.indices)}I", *buf.indices)
            comp_type = 5125  # UNSIGNED_INT
        else:
            idx_bytes = struct.pack(f"<{len(buf.indices)}H", *buf.indices)
            comp_type = 5123  # UNSIGNED_SHORT

        idx_offset = len(total_bin)
        total_bin.extend(idx_bytes)
        while len(total_bin) % 4 != 0:
            total_bin.append(0)

        bv_idx_idx = len(buffer_views)
        buffer_views.append({
            "buffer": 0,
            "byteOffset": idx_offset,
            "byteLength": len(idx_bytes),
            "target": 34963,  # ELEMENT_ARRAY_BUFFER
        })

        acc_idx_idx = len(accessors)
        accessors.append({
            "bufferView": bv_idx_idx,
            "byteOffset": 0,
            "componentType": comp_type,
            "count": len(buf.indices),
            "type": "SCALAR",
        })

        # Mesh definition
        mesh_idx = len(meshes)
        meshes.append({
            "name": buf.name,
            "primitives": [
                {
                    "attributes": {
                        "POSITION": acc_pos_idx,
                        "NORMAL": acc_norm_idx,
                        "TEXCOORD_0": acc_uv_idx,
                    },
                    "indices": acc_idx_idx,
                    "material": min(buf.material_idx, len(materials_def) - 1),
                }
            ],
        })

        # Mesh Node
        node_idx = len(nodes)
        nodes.append({"name": buf.name, "mesh": mesh_idx})
        nodes[0]["children"].append(node_idx)

    gltf_json = {
        "asset": {
            "version": "2.0",
            "generator": "Dhamrai Life World Pipeline (Milestone 5)",
        },
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": nodes,
        "meshes": meshes,
        "materials": materials_def,
        "buffers": [{"byteLength": len(total_bin)}],
        "bufferViews": buffer_views,
        "accessors": accessors,
    }

    json_str = json.dumps(gltf_json, separators=(",", ":"))
    json_bytes = json_str.encode("utf-8")
    # Pad JSON chunk with spaces (0x20) to 4-byte alignment
    while len(json_bytes) % 4 != 0:
        json_bytes += b" "

    # Pad binary chunk with zeros (0x00) to 4-byte alignment
    while len(total_bin) % 4 != 0:
        total_bin.append(0)

    # GLB header (12 bytes) + Chunk 0 (JSON) + Chunk 1 (BIN)
    total_glb_len = 12 + 8 + len(json_bytes) + 8 + len(total_bin)
    header = struct.pack("<4sII", b"glTF", 2, total_glb_len)
    chunk0_header = struct.pack("<I4s", len(json_bytes), b"JSON")
    chunk1_header = struct.pack("<I4s", len(total_bin), b"BIN\0")

    return header + chunk0_header + json_bytes + chunk1_header + total_bin
