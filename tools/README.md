# AMXD build pipeline

Build and validate all devices without opening Max:

```bash
python3 tools/build_amxd.py
```

Outputs are written to `dist/`. The builder uses an installed AMXD as its
container template when available, otherwise it uses the committed device in
`dist/`. It preserves every non-`ptch` chunk and replaces only the embedded
patch JSON. It then parses the generated container and requires its JSON to
equal the source `.maxpat` object.

After reviewing source changes, install all devices atomically:

```bash
python3 tools/build_amxd.py --install
```

This creates timestamped backups beside existing AMXDs and JavaScript files,
then atomically installs all AMXDs and their companion JavaScript. It also
works on a fresh machine where the devices have not been installed yet. Verify
the installed files at any time with:

```bash
python3 tools/build_amxd.py --verify-installed
```

The script never launches Max or Ableton.
