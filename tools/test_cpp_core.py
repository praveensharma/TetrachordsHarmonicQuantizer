#!/usr/bin/env python3
"""Build and test the portable core in a temporary directory; no Live installation."""
import argparse
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent.parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sanitize', action='store_true', help='Address/undefined-behavior sanitizers')
    args = parser.parse_args()
    compiler = os.environ.get('CXX') or shutil.which('clang++') or shutil.which('g++')
    node = shutil.which('node')
    if not compiler or not node:
        parser.error('Install a C++17 compiler and Node.js (or set CXX to the compiler executable)')
    flags = ['-std=c++17', '-Wall', '-Wextra', '-Wpedantic', '-Werror', '-ffp-contract=off', '-I', str(ROOT / 'core/include')]
    flags += ['-O1', '-g', '-fsanitize=address,undefined', '-fno-omit-frame-pointer'] if args.sanitize else ['-O2']
    with tempfile.TemporaryDirectory(prefix='tetrachords-core-') as temporary:
        build = Path(temporary)
        obj = build / 'engine.o'
        subprocess.run([compiler, *flags, '-fno-exceptions', '-fno-rtti', '-c',
                        str(ROOT / 'core/src/engine.cpp'), '-o', str(obj)], check=True)
        for name in ['core_tests', 'timing_tests', 'parity_driver', 'timing_driver']:
            subprocess.run([compiler, *flags, str(ROOT / f'core/tests/{name}.cpp'),
                            str(obj), '-o', str(build / name)], check=True)
        subprocess.run([str(build / 'core_tests')], check=True)
        subprocess.run([str(build / 'timing_tests')], check=True)
        subprocess.run([node, str(ROOT / 'core/tests/parity.js'), '--driver',
                        str(build / 'parity_driver')], check=True)
        subprocess.run([node, str(ROOT / 'core/tests/timing_parity.js'), '--driver',
                        str(build / 'timing_driver')], check=True)


if __name__ == '__main__':
    main()
