#!/usr/bin/env python3
"""Build/test the macOS Max external. Never installs into the User Library."""
import argparse
from pathlib import Path
import platform
import plistlib
import shutil
import subprocess
import tempfile
import sys

ROOT = Path(__file__).resolve().parent.parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sdk', type=Path, required=True, help='Official max-sdk-base checkout')
    parser.add_argument('--output', type=Path, default=ROOT / 'native/build')
    parser.add_argument('--sanitize', action='store_true', help='Sanitize host shim (bundle remains optimized)')
    args = parser.parse_args()
    if platform.system() != 'Darwin':
        parser.error('This first adapter build targets macOS; core supports other host toolchains separately.')
    includes = args.sdk.resolve() / 'c74support/max-includes'
    if not (includes / 'ext.h').is_file():
        parser.error('SDK must contain c74support/max-includes/ext.h')
    compiler = shutil.which('clang++')
    if not compiler:
        parser.error('Apple command line tools / clang++ required')
    flags = ['-std=c++17', '-Wall', '-Wextra', '-ffp-contract=off', '-Wno-cast-function-type-mismatch',
             '-I', str(includes), '-I', str(ROOT / 'core/include')]
    from native_artifact import record, verify, source_digest
    build_source=source_digest()
    revision=subprocess.run(['git','-C',str(args.sdk),'rev-parse','HEAD'],capture_output=True,text=True)
    sdk_revision=revision.stdout.strip() if revision.returncode==0 else 'unversioned SDK'
    with tempfile.TemporaryDirectory(prefix='tetrachords-max-test-') as temp:
        exe = str(Path(temp) / 'adapter_tests')
        sanitizers = ['-fsanitize=address,undefined', '-g', '-fno-omit-frame-pointer'] if args.sanitize else []
        subprocess.run([compiler, *flags, '-O1', *sanitizers,
                        str(ROOT / 'native/max/adapter_tests.cpp'), str(ROOT / 'core/src/engine.cpp'),
                        '-o', exe], check=True)
        subprocess.run([exe], check=True)
    bundle = args.output.resolve() / 'tetrachords.quantizer.mxo'
    macos = bundle / 'Contents/MacOS'
    macos.mkdir(parents=True, exist_ok=True)
    # One universal Mach-O rather than different release names per architecture.
    subprocess.run([compiler, *flags, '-O2', '-fno-exceptions', '-fno-rtti', '-fvisibility=hidden',
                    '-arch', 'arm64', '-arch', 'x86_64', '-mmacosx-version-min=11.0',
                    '-bundle', '-undefined', 'dynamic_lookup',
                    str(ROOT / 'native/max/tetrachords_quantizer.cpp'), str(ROOT / 'core/src/engine.cpp'),
                    '-o', str(macos / 'tetrachords.quantizer')], check=True)
    # Generated build metadata, not handwritten source.
    with (bundle / 'Contents/Info.plist').open('wb') as stream:
        plistlib.dump({'CFBundleIdentifier': 'com.tetrachords.quantizer',
                      'CFBundleExecutable': 'tetrachords.quantizer',
                      'CFBundlePackageType': 'iLaX', 'CFBundleVersion': '0.2.0',
                      'CFBundleName': 'tetrachords.quantizer'}, stream)
    subprocess.run(['codesign', '--force', '--sign', '-', str(bundle)], check=True)
    subprocess.run(['codesign', '--verify', '--strict', str(bundle)], check=True)
    subprocess.run(['lipo', '-info', str(macos / 'tetrachords.quantizer')], check=True)
    subprocess.run(['node', str(ROOT / 'native/max/test_harmony_bridge.js')], check=True)
    record(args.output.resolve(),build_source,sdk_revision); verify(args.output.resolve())
    print(f'Built native external: {bundle}\nRun tools/build_amxd.py to package it. No Live Set or User Library was modified.')


if __name__ == '__main__':
    main()
