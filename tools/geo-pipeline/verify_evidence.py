"""Verify preserved OSM hashes and a generated evidence checksum inventory.
Run --write after intentional evidence changes; ordinary runs only verify.
"""
import argparse
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET

RAW_HASHES = {
    'sample_a_pourashava_core': '62a8c13d770e164afbcde033cb1d10696e05d17696a4d38b94ec59e78d6d9141',
    'sample_b_phase1_slice': 'e69f01828ddbf3a7efc0267b126b987324e88b68c0343c4dafcf0532bb18e3a7',
    'sample_c_rural_union': '7a527854ff79ada45e48ba8f7dcd3e1e94b4c2a4dbf73ace78f7627747edd007',
    'sample_d_jahangirnagar_univ': '2c0b3a6ca6fd7a1c0899ea4e0c1062bdbe0d900e6eabdc2a8e49e771663939f2'
}


def checksum(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    from audit_osm_coverage import AREAS, get_api_url
    summary = json.loads(Path('data/sources/osm_audit_summary.json').read_text())
    manifest = {'license': '© OpenStreetMap contributors, ODbL 1.0; https://www.openstreetmap.org/copyright',
                'acquisition_date': '2026-11-02 (inherited report date; not independently attested)',
                'scope': 'Original preserved API bytes; integrity does not establish source authenticity or field accuracy.', 'snapshots': []}
    for key, expected in RAW_HASHES.items():
        path = Path('data/sources/raw_osm_' + key + '.xml')
        actual = checksum(path)
        if actual != expected or actual != summary['areas'][key]['snapshot_sha256']:
            raise ValueError(f'Raw snapshot checksum mismatch: {path}')
        root = ET.parse(path).getroot()
        manifest['snapshots'].append({'area_key': key, 'file': str(path), 'size_bytes': path.stat().st_size,
            'sha256': expected, 'query_url': get_api_url(AREAS[key]['bbox']),
            'query_bbox': AREAS[key]['bbox'], 'xml_bounds': root.find('bounds').attrib,
            'osm_metadata': root.attrib})
        print(f'PASS {path}: {actual}')
    raw_manifest = Path('data/sources/raw_osm_snapshot_manifest.json')
    inventory = Path('data/sources/evidence_checksums.json')
    if args.write:
        raw_manifest.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
        paths = sorted(list(Path('tools/geo-pipeline').glob('*.py')) +
                       [Path('tools/geo-pipeline/requirements.txt')] +
                       [p for p in Path('data').rglob('*') if p.is_file() and p != inventory] +
                       [Path('PROGRESS.md'), Path('guideFiles/PROGRESS.md')])
        inventory.write_text(json.dumps({'algorithm': 'SHA-256',
            'scope': 'All Python evidence scripts, requirements, data artifacts and both progress files. Inventory excludes itself to avoid self-reference; documentation/report prose is not checksum-attested.',
            'files': [{'file': str(p), 'size_bytes': p.stat().st_size, 'sha256': checksum(p)} for p in paths]}, indent=2) + '\n')
        print(f'Wrote {raw_manifest} and {inventory}')
    else:
        if json.loads(raw_manifest.read_text()) != manifest:
            raise ValueError('Raw snapshot manifest metadata does not match preserved XML/configuration')
        entries = json.loads(inventory.read_text())['files']
        for entry in entries:
            p = Path(entry['file'])
            if checksum(p) != entry['sha256'] or p.stat().st_size != entry['size_bytes']:
                raise ValueError(f'Evidence checksum mismatch: {p}')
        if Path('PROGRESS.md').read_bytes() != Path('guideFiles/PROGRESS.md').read_bytes():
            raise ValueError('Progress trackers differ')
        print(f'PASS all {len(entries)} evidence file checksums and sizes; raw manifest metadata; identical progress trackers.')


if __name__ == '__main__':
    main()
