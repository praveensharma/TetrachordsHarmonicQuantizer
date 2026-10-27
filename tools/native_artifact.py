"""Native provenance and exact recursive bundle verification (no SDK dependency)."""
import hashlib
import json
import shutil
import os
import tempfile
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NAME = 'tetrachords.quantizer.mxo'
MANIFEST = 'native_build.json'


def source_digest():
    paths = [ROOT/'core/src/engine.cpp', ROOT/'core/include/tetrachords/engine.hpp',
             ROOT/'native/max/tetrachords_quantizer.cpp', ROOT/'tools/build_native_max.py', ROOT/'tools/native_artifact.py']
    digest = hashlib.sha256()
    for path in paths:
        digest.update(path.relative_to(ROOT).as_posix().encode())
        digest.update(path.read_bytes())
    return digest.hexdigest()


def inventory(bundle):
    return {p.relative_to(bundle).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted(bundle.rglob('*')) if p.is_file()}


def record(directory, expected_source=None, sdk_revision='unknown'):
    if expected_source is not None and source_digest()!=expected_source:
        raise ValueError('Sources changed during compilation; rebuild before packaging')
    data = {'source_sha256':source_digest(), 'platform':'macOS', 'architectures':['arm64','x86_64'],
            'sdk_revision':sdk_revision,
            'files':inventory(directory/NAME)}
    (directory/MANIFEST).write_text(json.dumps(data,indent=2)+'\n')


def verify(directory, require_current=True):
    data = json.loads((directory/MANIFEST).read_text())
    if require_current and data['source_sha256'] != source_digest():
        raise ValueError('Native external is stale; run tools/build_native_max.py with the Max SDK first')
    if not data['files'] or data['files'] != inventory(directory/NAME):
        raise ValueError('Native bundle is missing or differs from its build manifest')
    if 'Contents/MacOS/tetrachords.quantizer' not in data['files']:
        raise ValueError('Native bundle has no executable')
    return data


def copy(directory, destination):
    verify(directory)
    destination.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.native-stage-',dir=destination) as temporary:
        stage=Path(temporary)
        shutil.copytree(directory/NAME,stage/NAME)
        shutil.copy2(directory/MANIFEST,stage/MANIFEST)
        verify(stage)
        stamp=datetime.now().strftime('%Y%m%d-%H%M%S-%f')
        previous=destination/(NAME+'.backup-'+stamp)
        if (destination/NAME).exists(): os.replace(destination/NAME,previous)
        try: os.replace(stage/NAME,destination/NAME)
        except OSError:
            if previous.exists():os.replace(previous,destination/NAME)
            raise
        if (destination/MANIFEST).exists():shutil.copy2(destination/MANIFEST,destination/(MANIFEST+'.backup-'+stamp))
        os.replace(stage/MANIFEST,destination/MANIFEST)
    verify(destination)
