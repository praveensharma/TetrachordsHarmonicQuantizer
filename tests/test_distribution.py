"""Package consistency, host-independent builds and sandboxed install regression."""
import contextlib, importlib.util, io, json, sys, tempfile
from dataclasses import replace
from pathlib import Path
from types import SimpleNamespace

root=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(root/'tools'))
spec=importlib.util.spec_from_file_location('package_build',root/'tools/build_amxd.py')
build=importlib.util.module_from_spec(spec);sys.modules[spec.name]=build;spec.loader.exec_module(build)
build.verify_distribution(build.DEVICES,root/'dist')
with tempfile.TemporaryDirectory(prefix='harmonic-package-test-') as temporary:
    directory=Path(temporary)
    devices=tuple(replace(d,install_dir=directory/'library'/str(i),install_alias_dirs=(directory/'alias'/str(i),)) for i,d in enumerate(build.DEVICES))
    # Committed AMXD seeds must win over a personal installed copy.
    devices[0].install_dir.mkdir(parents=True)
    devices[0].installed_amxd.write_bytes(b'not an AMXD')
    assert build.template_for(devices[0])==devices[0].seed_amxd
    build.DEVICES=devices
    build.parse_args=lambda: SimpleNamespace(device=None,verify_installed=False,verify_dist=False,install=True,dist=directory/'dist')
    with contextlib.redirect_stdout(io.StringIO()):assert build.main()==0
    build.verify_distribution(devices,directory/'dist');build.verify_installed(devices)
    for d in devices:
        for install in d.install_dirs:
            assert (install/d.filename).read_bytes()==(directory/'dist'/d.filename).read_bytes()
    script=directory/'dist'/devices[0].javascript.name
    script.write_text('// stale packaged script\n')
    try:build.verify_distribution(devices,directory/'dist')
    except ValueError:pass
    else:raise AssertionError('Stale JavaScript must fail package verification')
print('Distribution: all source/AMXD/scripts aligned, stale assets rejected, install rebuilds dist, portable seeds verified.')
