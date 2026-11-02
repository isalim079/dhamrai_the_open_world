"""
Dhamrai Life — Coordinate Reference System & Projection Module
==============================================================
Projection Standard: Bangladesh Universal Transverse Mercator 2010 (BUTM2010)
CRS Authority: ESRI:102954 (WGS 84 Transverse Mercator, Central Meridian 90°E)
Adoption Status: Provisionally Adopted (Survey of Bangladesh NSDI aligned; independent geodetic benchmark confirmation pending)
Vertical Datum: Provisional baseline at Rathkhola (+12.0m MSL estimated)

Axis Mapping for Three.js:
  +X = Easting offset in meters (delta East)
  +Y = Elevation offset in meters (delta Height)
  +Z = Inverted Northing offset in meters (-delta North, Three.js -Z forward)
"""

import math
from typing import Tuple, Dict, Any
import pyproj

# Project candidate WKT2 definition of BUTM2010 (ESRI:102954)
BUTM2010_WKT = """
PROJCRS["BUTM2010",
    BASEGEOGCRS["WGS 84",
        ENSEMBLE["World Geodetic System 1984 ensemble",
            MEMBER["World Geodetic System 1984 (Transit)"],
            MEMBER["World Geodetic System 1984 (G730)"],
            MEMBER["World Geodetic System 1984 (G873)"],
            MEMBER["World Geodetic System 1984 (G1150)"],
            MEMBER["World Geodetic System 1984 (G1674)"],
            MEMBER["World Geodetic System 1984 (G1762)"],
            MEMBER["World Geodetic System 1984 (G2139)"],
            ELLIPSOID["WGS 84",6378137,298.257223563,
                LENGTHUNIT["metre",1]],
            ENSEMBLEACCURACY[2.0]],
        PRIMEM["Greenwich",0,
            ANGLEUNIT["degree",0.0174532925199433]],
        ID["EPSG",4326]],
    CONVERSION["TM 90 NE",
        METHOD["Transverse Mercator",
            ID["EPSG",9807]],
        PARAMETER["Latitude of natural origin",0,
            ANGLEUNIT["degree",0.0174532925199433],
            ID["EPSG",8801]],
        PARAMETER["Longitude of natural origin",90,
            ANGLEUNIT["degree",0.0174532925199433],
            ID["EPSG",8802]],
        PARAMETER["Scale factor at natural origin",0.9996,
            SCALEUNIT["unity",1],
            ID["EPSG",8805]],
        PARAMETER["False easting",500000,
            LENGTHUNIT["metre",1],
            ID["EPSG",8806]],
        PARAMETER["False northing",0,
            LENGTHUNIT["metre",1],
            ID["EPSG",8807]]],
    CS[Cartesian,2],
        AXIS["(E)",east,
            ORDER[1],
            LENGTHUNIT["metre",1]],
        AXIS["(N)",north,
            ORDER[2],
            LENGTHUNIT["metre",1]],
    USAGE[
        SCOPE["Survey of Bangladesh Topographic & NSDI Applications."],
        AREA["Bangladesh - onshore and offshore."],
        BBOX[18.56,88.01,26.64,92.67]],
    ID["ESRI",102954]]
""".strip()

PROJ_STRING = "+proj=tmerc +lat_0=0 +lon_0=90 +k=0.9996 +x_0=500000 +y_0=0 +datum=WGS84 +units=m +no_defs +type=crs"

# Anchored World Origin: Dhamrai Rathkhola Stand / Chariot Yard
ORIGIN_NAME = "Dhamrai Rathkhola Stand"
ORIGIN_LON = 90.217400
ORIGIN_LAT = 23.914800
ORIGIN_ELEVATION = 12.0  # Meters above MSL

# Authoritative full-precision BUTM 2010 projected origin constants (pyproj 3.6.1):
ORIGIN_PROJECTED_EASTING = 522126.5567081776
ORIGIN_PROJECTED_NORTHING = 2644810.7821246446

class CoordinateTransformer:
    def __init__(self, origin_lon: float = ORIGIN_LON, origin_lat: float = ORIGIN_LAT, origin_elev: float = ORIGIN_ELEVATION):
        self.crs_wgs84 = pyproj.CRS.from_epsg(4326)
        # Instantiate from the mathematically consistent candidate WKT
        self.crs_butm = pyproj.CRS.from_wkt(BUTM2010_WKT)
        
        # Exact pyproj Transformers (always_xy: True ensures (longitude, latitude) / (easting, northing) ordering)
        self.trans_to_butm = pyproj.Transformer.from_crs(self.crs_wgs84, self.crs_butm, always_xy=True)
        self.trans_to_wgs84 = pyproj.Transformer.from_crs(self.crs_butm, self.crs_wgs84, always_xy=True)
        
        # Compute and cache projected world origin
        self.origin_lon = origin_lon
        self.origin_lat = origin_lat
        self.origin_elev = origin_elev
        if origin_lon == ORIGIN_LON and origin_lat == ORIGIN_LAT:
            self.origin_easting = ORIGIN_PROJECTED_EASTING
            self.origin_northing = ORIGIN_PROJECTED_NORTHING
        else:
            self.origin_easting, self.origin_northing = self.trans_to_butm.transform(self.origin_lon, self.origin_lat)

    def wgs84_to_butm(self, lon: float, lat: float) -> Tuple[float, float]:
        """Convert WGS84 (lon, lat in degrees) to BUTM2010 (easting, northing in meters)."""
        return self.trans_to_butm.transform(lon, lat)

    def butm_to_wgs84(self, easting: float, northing: float) -> Tuple[float, float]:
        """Convert BUTM2010 (easting, northing in meters) to WGS84 (lon, lat in degrees)."""
        return self.trans_to_wgs84.transform(easting, northing)

    def wgs84_to_game(self, lon: float, lat: float, elevation: float = 12.0) -> Tuple[float, float, float]:
        """
        Convert WGS84 geodetic coordinates to local metric Three.js game coordinates.
        Returns: (x, y, z) where:
          x = Easting - Origin_Easting (meters)
          y = Elevation - Origin_Elevation (meters)
          z = -(Northing - Origin_Northing) (meters, -Z forward/North)
        """
        easting, northing = self.wgs84_to_butm(lon, lat)
        game_x = easting - self.origin_easting
        game_y = elevation - self.origin_elev
        game_z = -(northing - self.origin_northing)
        return round(game_x, 4), round(game_y, 4), round(game_z, 4)

    def game_to_wgs84(self, game_x: float, game_y: float, game_z: float) -> Tuple[float, float, float]:
        """
        Convert local Three.js game coordinates back to WGS84 (lon, lat, elevation).
        """
        easting = game_x + self.origin_easting
        northing = -game_z + self.origin_northing
        elevation = game_y + self.origin_elev
        lon, lat = self.butm_to_wgs84(easting, northing)
        return round(lon, 7), round(lat, 7), round(elevation, 3)

    def get_slice_bounding_envelope(self, half_width: float = 512.0, half_height: float = 512.0) -> Tuple[float, float, float, float]:
        """
        Calculate the complete WGS84 axis-aligned bounding envelope [min_lon, min_lat, max_lon, max_lat]
        encompassing all four projected corners of a centered world slice.
        
        Due to Transverse Mercator meridian convergence (~0.088 deg at Dhamrai longitude),
        projected easting/northing axes are rotated relative to geographic meridians/parallels.
        Evaluating all 4 corners ensures that both the SE corner (latitude minimum)
        and NW corner (latitude maximum) are strictly contained within the query envelope.
        """
        corners = [
            (-half_width, +half_height),  # SW
            (-half_width, -half_height),  # NW
            (+half_width, +half_height),  # SE
            (+half_width, -half_height),  # NE
        ]
        lons = []
        lats = []
        for gx, gz in corners:
            lon, lat = self.butm_to_wgs84(self.origin_easting + gx, self.origin_northing - gz)
            lons.append(lon)
            lats.append(lat)
        return (math.floor(min(lons) * 1e6) / 1e6,
                math.floor(min(lats) * 1e6) / 1e6,
                math.ceil(max(lons) * 1e6) / 1e6,
                math.ceil(max(lats) * 1e6) / 1e6)

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "authority": "ESRI:102954",
            "name": "BUTM2010",
            "status": "Provisionally Adopted",
            "central_meridian": 90.0,
            "latitude_of_origin": 0.0,
            "scale_factor": 0.9996,
            "false_easting": 500000.0,
            "false_northing": 0.0,
            "datum": "WGS 84 (Ensemble)",
            "origin": {
                "name": ORIGIN_NAME,
                "lon": self.origin_lon,
                "lat": self.origin_lat,
                "elevation": self.origin_elev,
                "projected_easting": self.origin_easting,
                "projected_northing": self.origin_northing
            }
        }
