"""Validate the converter's ZIP without extracting or trusting entry paths."""
import hashlib
import json
from pathlib import Path, PurePosixPath
import stat
import sys
import zipfile

archive, game = map(Path, sys.argv[1:3])
files = {}
size = 0
with zipfile.ZipFile(archive) as zipped:
    seen = set()
    for item in zipped.infolist():
        name = item.filename
        path = PurePosixPath(name)
        if (not name or path.is_absolute() or '..' in path.parts or '\\' in name
                or ':' in name or name in seen or str(path) != name.rstrip('/')):
            raise ValueError(f'Unsafe or duplicate ZIP path: {name}')
        seen.add(name)
        mode = item.external_attr >> 16
        if stat.S_ISLNK(mode):
            raise ValueError(f'Symbolic link in ZIP: {name}')
        if item.is_dir():
            continue
        data = zipped.read(item)  # zipfile checks CRC while reading.
        target = game / name
        if not target.is_file() or target.is_symlink() or data != target.read_bytes():
            raise ValueError(f'ZIP differs from game tree: {name}')
        files[name] = hashlib.sha256(data).hexdigest()
        size += len(data)
actual = {p.relative_to(game).as_posix() for p in game.rglob('*') if p.is_file()}
if set(files) != actual or not {'game.js', 'game.json'}.issubset(files):
    raise ValueError('ZIP root/files differ from game tree')
digest = hashlib.sha256()
for name in sorted(files):
    digest.update((name + '\0' + files[name] + '\n').encode())
print(json.dumps({'treeSha256': digest.hexdigest(), 'fileCount': len(files), 'uncompressedBytes': size}))
