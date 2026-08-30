#!/usr/bin/env python3
"""Build Max for Live AMXD devices without opening Max.

An AMXD is an ``ampf`` container. The editable Max patch is stored as UTF-8
JSON in its ``ptch`` chunk. This tool replaces that chunk while preserving all
other template chunks byte-for-byte, then parses the generated file again and
compares its embedded JSON with the source ``.maxpat``.

By default, all devices are built into ``dist/``. Pass ``--install`` to make
timestamped backups and atomically update the Ableton User Library files.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import struct
import sys
import tempfile
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable


PROJECT_ROOT = Path(__file__).resolve().parent.parent
USER_LIBRARY_ROOT = Path.home() / "Music/Ableton/User Library"
MAX4LIVE_LIBRARY = USER_LIBRARY_ROOT / "Max4Live"
MIDI_EFFECT_LIBRARY = (
    USER_LIBRARY_ROOT / "Presets/MIDI Effects/Max MIDI Effect/Imported"
)


@dataclass(frozen=True)
class Device:
    name: str
    maxpat: Path
    javascript: Path
    install_dir: Path
    filename: str
    install_alias_dirs: tuple[Path, ...] = ()

    @property
    def install_dirs(self) -> tuple[Path, ...]:
        return (self.install_dir, *self.install_alias_dirs)

    @property
    def installed_amxd(self) -> Path:
        return self.install_dir / self.filename

    @property
    def installed_javascript(self) -> Path:
        return self.install_dir / self.javascript.name

    @property
    def seed_amxd(self) -> Path:
        return PROJECT_ROOT / "dist" / self.filename


DEVICES = (
    Device(
        name="Harmonic Quantizer",
        maxpat=PROJECT_ROOT
        / "Harmonic_Quantizer/Harmonic Quantizer.maxpat",
        javascript=PROJECT_ROOT
        / "Harmonic_Quantizer/harmonic_quantizer.js",
        install_dir=MAX4LIVE_LIBRARY / "Harmonic Quantizer",
        filename="Harmonic Quantizer.amxd",
        install_alias_dirs=(MIDI_EFFECT_LIBRARY,),
    ),
    Device(
        name="Tetrachords Harmony Receiver",
        maxpat=PROJECT_ROOT
        / "Tetrachords_Harmony_Receiver/Tetrachords Harmony Receiver.maxpat",
        javascript=PROJECT_ROOT
        / "Tetrachords_Harmony_Receiver/tetrachords_harmony_receiver.js",
        install_dir=MAX4LIVE_LIBRARY / "Tetrachords Harmony Receiver",
        filename="Tetrachords Harmony Receiver.amxd",
    ),
)


@dataclass(frozen=True)
class Chunk:
    tag: bytes
    data: bytes


@dataclass(frozen=True)
class Container:
    prefix: bytes
    chunks: tuple[Chunk, ...]


def parse_container(payload: bytes, source: Path) -> Container:
    if len(payload) < 20 or payload[:4] != b"ampf":
        raise ValueError(f"{source}: not an AMPF/AMXD container")

    prefix = payload[:12]
    chunks: list[Chunk] = []
    offset = 12

    while offset < len(payload):
        if offset + 8 > len(payload):
            raise ValueError(f"{source}: truncated chunk header at {offset}")
        tag = payload[offset : offset + 4]
        size = struct.unpack_from("<I", payload, offset + 4)[0]
        data_start = offset + 8
        data_end = data_start + size
        if data_end > len(payload):
            raise ValueError(
                f"{source}: chunk {tag!r} declares {size} bytes past EOF"
            )
        chunks.append(Chunk(tag, payload[data_start:data_end]))
        offset = data_end

    if offset != len(payload):
        raise ValueError(f"{source}: unparsed bytes after final chunk")
    if sum(chunk.tag == b"ptch" for chunk in chunks) != 1:
        raise ValueError(f"{source}: expected exactly one ptch chunk")
    return Container(prefix, tuple(chunks))


def encode_container(container: Container) -> bytes:
    output = bytearray(container.prefix)
    for chunk in container.chunks:
        output.extend(chunk.tag)
        output.extend(struct.pack("<I", len(chunk.data)))
        output.extend(chunk.data)
    return bytes(output)


def read_maxpat(path: Path) -> tuple[bytes, object]:
    raw = path.read_bytes().rstrip(b"\0")
    try:
        parsed = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ValueError(f"{path}: invalid UTF-8 Max patch JSON: {error}") from error
    if not isinstance(parsed, dict) or "patcher" not in parsed:
        raise ValueError(f"{path}: JSON does not contain a patcher")
    if not raw.endswith(b"\n"):
        raw += b"\n"
    return raw + b"\0", parsed


def replace_patch(template: Container, patch_data: bytes) -> Container:
    return Container(
        template.prefix,
        tuple(
            Chunk(chunk.tag, patch_data) if chunk.tag == b"ptch" else chunk
            for chunk in template.chunks
        ),
    )


def embedded_patch(container: Container, source: Path) -> object:
    data = next(chunk.data for chunk in container.chunks if chunk.tag == b"ptch")
    try:
        return json.loads(data.rstrip(b"\0").decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ValueError(f"{source}: invalid embedded ptch JSON: {error}") from error


def unchanged_non_patch_chunks(before: Container, after: Container) -> bool:
    before_other = [(c.tag, c.data) for c in before.chunks if c.tag != b"ptch"]
    after_other = [(c.tag, c.data) for c in after.chunks if c.tag != b"ptch"]
    return before.prefix == after.prefix and before_other == after_other


def atomic_write(path: Path, payload: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=path.parent
    )
    temporary = Path(temporary_name)
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def backup(path: Path, stamp: str) -> Path:
    destination = path.with_name(f"{path.name}.backup-{stamp}")
    shutil.copy2(path, destination)
    return destination


def template_for(device: Device) -> Path:
    if device.installed_amxd.exists():
        return device.installed_amxd
    if device.seed_amxd.exists():
        return device.seed_amxd
    raise ValueError(
        f"{device.name}: no installed AMXD or committed dist seed is available"
    )


def build_device(device: Device, output: Path) -> dict[str, object]:
    template_path = template_for(device)
    template_bytes = template_path.read_bytes()
    template = parse_container(template_bytes, template_path)
    patch_data, source_json = read_maxpat(device.maxpat)
    generated = replace_patch(template, patch_data)
    generated_bytes = encode_container(generated)

    # Validate before writing anything.
    reparsed = parse_container(generated_bytes, output)
    if embedded_patch(reparsed, output) != source_json:
        raise ValueError(f"{device.name}: embedded JSON differs from source")
    if not unchanged_non_patch_chunks(template, reparsed):
        raise ValueError(f"{device.name}: non-patch AMXD metadata changed")

    atomic_write(output, generated_bytes)

    # Validate the bytes actually present on disk after the atomic rename.
    installed = parse_container(output.read_bytes(), output)
    if embedded_patch(installed, output) != source_json:
        raise ValueError(f"{device.name}: on-disk verification failed")

    return {
        "name": device.name,
        "source": str(device.maxpat),
        "template": str(template_path),
        "output": str(output),
        "bytes": len(generated_bytes),
        "chunks": [chunk.tag.decode("ascii", "replace") for chunk in installed.chunks],
    }


def verify_installed(devices: Iterable[Device]) -> list[dict[str, object]]:
    results = []
    for device in devices:
        _, source_json = read_maxpat(device.maxpat)
        locations = []
        for install_dir in device.install_dirs:
            installed = install_dir / device.filename
            installed_javascript = install_dir / device.javascript.name
            container = parse_container(installed.read_bytes(), installed)
            if embedded_patch(container, installed) != source_json:
                raise ValueError(
                    f"{device.name}: installed AMXD does not match source maxpat"
                )
            if (
                not installed_javascript.exists()
                or installed_javascript.read_bytes()
                != device.javascript.read_bytes()
            ):
                raise ValueError(
                    f"{device.name}: installed JavaScript does not match source"
                )
            locations.append(
                {
                    "installed": str(installed),
                    "bytes": installed.stat().st_size,
                    "javascript": str(installed_javascript),
                }
            )
        results.append(
            {
                "name": device.name,
                "locations": locations,
                "javascript_verified": True,
                "verified": True,
            }
        )
    return results


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--install",
        action="store_true",
        help="back up and atomically update all User Library AMXDs",
    )
    mode.add_argument(
        "--verify-installed",
        action="store_true",
        help="verify installed AMXDs exactly match their source maxpats",
    )
    parser.add_argument(
        "--dist",
        type=Path,
        default=PROJECT_ROOT / "dist",
        help="staging output directory (default: project dist/)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        if args.verify_installed:
            results = verify_installed(DEVICES)
        elif args.install:
            stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            backups: dict[str, list[str]] = {}
            for device in DEVICES:
                backups[device.name] = []
                for install_dir in device.install_dirs:
                    installed_amxd = install_dir / device.filename
                    installed_javascript = install_dir / device.javascript.name
                    if installed_amxd.exists():
                        backups[device.name].append(
                            str(backup(installed_amxd, stamp))
                        )
                    if installed_javascript.exists():
                        backups[device.name].append(
                            str(backup(installed_javascript, stamp))
                        )

            results = []
            for device in DEVICES:
                result = build_device(device, device.installed_amxd)
                atomic_write(
                    device.installed_javascript,
                    device.javascript.read_bytes(),
                )
                for install_dir in device.install_alias_dirs:
                    atomic_write(
                        install_dir / device.filename,
                        device.installed_amxd.read_bytes(),
                    )
                    atomic_write(
                        install_dir / device.javascript.name,
                        device.javascript.read_bytes(),
                    )
                result["javascript"] = str(device.installed_javascript)
                result["javascript_verified"] = (
                    device.installed_javascript.read_bytes()
                    == device.javascript.read_bytes()
                )
                result["locations"] = verify_installed((device,))[0]["locations"]
                results.append(result)
            for result in results:
                result["backup"] = backups[result["name"]]
        else:
            args.dist.mkdir(parents=True, exist_ok=True)
            results = [
                build_device(device, args.dist / device.filename)
                for device in DEVICES
            ]
        print(json.dumps({"ok": True, "devices": results}, indent=2))
        return 0
    except (OSError, ValueError) as error:
        print(json.dumps({"ok": False, "error": str(error)}, indent=2), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
