"""Back up one atomic content snapshot plus immutable history/assets; no signing keys."""
import io
import json
from pathlib import Path
import sys
import tarfile

def backup_content(root, destination):
    root, destination = Path(root).resolve(), Path(destination).resolve()
    active = root / 'active.json'
    if not active.exists():
        return {'status': 'no-published-content'}
    raw = active.read_bytes()
    snapshot = json.loads(raw)
    assert snapshot['version'] == 1 and len(snapshot['revision']) == 64
    # Assets/revisions precede the active switch and never mutate. Reading the
    # active document first guarantees every referenced asset is in this inventory.
    files = sorted(p for p in root.rglob('*') if p.is_file() and not p.is_symlink()
                   and p.name != 'active.json' and not p.name.endswith('.tmp') and 'publish.lock' not in p.parts)
    temp = destination.with_name(destination.name + '.pending')
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tarfile.open(temp, 'w:gz') as archive:
        info = tarfile.TarInfo('active.json'); info.size = len(raw); info.mode = 0o600
        archive.addfile(info, io.BytesIO(raw))
        for file in files:
            relative = file.relative_to(root)
            if relative.parts[0] not in ('assets', 'revisions', 'receipts') and relative.name != 'rollback.jsonl':
                continue
            data = file.read_bytes()
            info = tarfile.TarInfo(relative.as_posix()); info.size = len(data); info.mode = 0o600
            archive.addfile(info, io.BytesIO(data))
    temp.replace(destination)
    return {'status': 'backed-up', 'revision': snapshot['revision'], 'bytes': destination.stat().st_size}

if __name__ == '__main__':
    print(json.dumps(backup_content(sys.argv[1], sys.argv[2])))
