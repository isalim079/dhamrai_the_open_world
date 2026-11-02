"""Run Phase 0 evidence checks from the repository root, capturing real output.
Does not acquire new source data or start any Phase 1 work.
"""
import hashlib
import json
import os
import platform
import subprocess
from pathlib import Path
import pyproj
import shapely
import certifi


def main():
    env = dict(os.environ, PYTHONPATH='tools/geo-pipeline')
    runs = []
    def run(args, expected=0):
        completed = subprocess.run(args, env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        result = {'command': 'PYTHONPATH=tools/geo-pipeline ' + ' '.join(args),
                  'exit_code': completed.returncode, 'expected_exit_code': expected,
                  'output': completed.stdout, 'expected_result': completed.returncode == expected}
        runs.append(result)
        print(result['command'] + '\n' + completed.stdout + f'Exit code: {completed.returncode}')
        if completed.returncode != expected:
            raise RuntimeError('Unexpected command failure')
    python = '.venv/bin/python'
    run([python, 'tools/geo-pipeline/audit_osm_coverage.py', '--offline'])
    run([python, 'tools/geo-pipeline/generate_mission_routes.py'])
    paths = ['data/sources/osm_audit_summary.json', 'data/world/mission_routes.json']
    before = {p: hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in paths}
    run([python, 'tools/geo-pipeline/audit_osm_coverage.py', '--offline'])
    run([python, 'tools/geo-pipeline/generate_mission_routes.py'])
    after = {p: hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in paths}
    if before != after:
        raise ValueError('Offline generated evidence is not byte-deterministic')
    print('PASS: audit summary and mission routes reproduce byte-for-byte.')
    run([python, 'tools/geo-pipeline/test_coordinate_transform.py'])
    run([python, 'tools/geo-pipeline/test_chunk_grid.py'])
    # Exit 2 deliberately records the unresolved actual-polygon dependency.
    run([python, 'tools/geo-pipeline/audit_chunk_grid.py'], expected=2)
    acquisition = subprocess.run(['curl', '-L', '--fail', '--max-time', '20',
        'https://api.openstreetmap.org/api/0.6/relation/4730829/full', '-o', '/tmp/dhamrai_relation.xml'],
        text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    result = {'environment': {'python': platform.python_version(), 'platform': platform.platform(),
        'pyproj': pyproj.__version__, 'proj': pyproj.proj_version_str,
        'shapely': shapely.__version__, 'geos': shapely.geos_version_string, 'certifi': certifi.__version__},
        'runs': runs, 'deterministic_outputs_sha256': after,
        'boundary_acquisition_attempt': {'command': 'curl -L --fail --max-time 20 https://api.openstreetmap.org/api/0.6/relation/4730829/full -o /tmp/dhamrai_relation.xml',
                                       'exit_code': acquisition.returncode, 'output': acquisition.stdout},
        'limitations': ['No real Upazila polygon counts were computed.', 'No independently validated ground-control, courtyard geometry, OAuth integration or legal approval is provided.']}
    Path('data/sources/test_execution.json').write_text(json.dumps(result, indent=2) + '\n')
    print('Wrote data/sources/test_execution.json')


if __name__ == '__main__':
    main()
