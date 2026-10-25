#!/usr/bin/env python3
"""Build a verified, portable runtime ZIP; never install into the User Library."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parent.parent


def git(*args):
    return subprocess.check_output(["git", "-C", str(ROOT), *args], text=True).strip()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--version", required=True, help="For example v1.0.0-beta.1")
    parser.add_argument("--output", type=Path, required=True, help="Outside this checkout")
    parser.add_argument("--allow-dirty", action="store_true", help="Local test packages only")
    args = parser.parse_args()
    if not re.fullmatch(r"v[0-9]+\.[0-9]+\.[0-9]+(?:-[A-Za-z0-9.-]+)?", args.version):
        parser.error("Expected a version such as v1.0.0-beta.1")
    output = args.output.resolve()
    if output == ROOT or ROOT in output.parents:
        parser.error("Output must be outside the checkout")
    dirty = bool(git("status", "--porcelain"))
    if dirty and not args.allow_dirty:
        parser.error("Commit changes first; release packages must come from a clean checkout")
    rota = (ROOT / "src/rota_core.js").exists()
    project = "ROTA" if rota else "TetrachordsHarmonicQuantizer"
    builder = ROOT / ("tools/build.py" if rota else "tools/build_amxd.py")
    import sys
    subprocess.run([sys.executable, str(builder), "--verify-dist"], check=True)
    files = {}
    for path in sorted((ROOT / "dist").iterdir()):
        if path.is_file() and path.suffix in (".amxd", ".js"):
            files["Devices/" + path.name] = path.read_bytes()
    expected = (2, 3) if rota else (5, 8)
    actual = tuple(sum(name.endswith(ext) for name in files) for ext in (".amxd", ".js"))
    if actual != expected:
        raise RuntimeError(f"Unexpected AMXD/script inventory: {actual}, expected {expected}")
    for relative in ("README.md", "docs/RELEASE_NOTES.md", "docs/LATENCY.md",
                     "docs/LATENCY_AUDIT.md", "docs/PLINKY_HARMONY_RECEIVER.md",
                     "docs/VOICE_LEADING_V3.md", "LICENSE", "LICENSE.md"):
        path = ROOT / relative
        if path.is_file():
            files[relative] = path.read_bytes()
    files["INSTALL.txt"] = (
        f"{project} {args.version}\n\n"
        "Requires Ableton Live with Max for Live. Developed with Live 12 Beta / Max 9.\n"
        "1. Back up your Live Sets and existing devices.\n"
        "2. Quit Live before replacing an existing library installation.\n"
        "3. Copy ALL files from Devices together into one folder in your Ableton\n"
        "   User Library, for example Presets/MIDI Effects/Max MIDI Effect/" + project + ".\n"
        "   Do not copy only the AMXDs: the adjacent JavaScript files are required.\n"
        "4. Open Live and drag the AMXD devices from that folder onto MIDI tracks.\n"
        "5. Existing Sets may retain embedded older device definitions. Reload or\n"
        "   replace updated devices, check parameters/routing, then save a copy.\n\n"
        "This is a beta, not hardware or save/reopen certification. Read\n"
        "docs/RELEASE_NOTES.md and README.md for routing and verification limits.\n"
        "No hardware configuration or Live Set is changed by extracting this ZIP.\n"
    ).encode()
    files["BUILD.json"] = (json.dumps({
        "project": project, "version": args.version, "commit": git("rev-parse", "HEAD"),
        "dirty": dirty, "amxd_count": actual[0], "javascript_count": actual[1],
        "format": "AMXD with required external JavaScript sidecars; not frozen",
    }, indent=2) + "\n").encode()
    sums = "".join(hashlib.sha256(data).hexdigest() + "  " + name + "\n"
                   for name, data in sorted(files.items()))
    files["SHA256SUMS.txt"] = sums.encode()
    prefix = project + "-" + args.version
    output.mkdir(parents=True, exist_ok=True)
    archive = output / (prefix + ".zip")
    if archive.exists():
        raise FileExistsError(f"Refusing to overwrite {archive}")
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as bundle:
        for name, data in sorted(files.items()):
            info = zipfile.ZipInfo(prefix + "/" + name, (2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            bundle.writestr(info, data)
    with zipfile.ZipFile(archive) as bundle:
        assert bundle.testzip() is None
        assert set(bundle.namelist()) == {prefix + "/" + name for name in files}
        for name, data in files.items():
            assert bundle.read(prefix + "/" + name) == data, name
    checksum = hashlib.sha256(archive.read_bytes()).hexdigest()
    manifest = archive.with_suffix(".zip.sha256")
    manifest.write_text(checksum + "  " + archive.name + "\n")
    print(json.dumps({"archive": str(archive), "sha256": checksum,
                      "checksum_file": str(manifest), "files": len(files)}, indent=2))


if __name__ == "__main__":
    main()

