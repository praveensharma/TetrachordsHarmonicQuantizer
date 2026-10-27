# Publishing a runtime beta

Run the project build and automated tests, then commit all source and `dist/`
changes. From a clean checkout:

```sh
python3 tools/package_release.py --version v1.0.0-beta.2 --output /private/tmp/device-releases
```

The script verifies source/distribution consistency before packaging. It includes
every runtime AMXD and JavaScript sidecar, the complete native macOS external
and build manifest, installation notes, release notes,
source commit metadata and per-file SHA-256 checksums. It reads but does not install
or modify devices in the User Library. Outputs must be outside the checkout.

Publish the ZIP and its `.zip.sha256` file as assets on a GitHub prerelease tagged
at that source commit. Do not label a dirty `--allow-dirty` test archive as a release.
Do not include private trace logs, generated test fixtures, backups or credentials.

These AMXDs are built containers with external scripts, not frozen standalone
binaries. Consumers need the complete bundle. A published beta does not imply
host save/reopen or hardware stress tests have passed; retain those limits in the
release description until actually verified.
