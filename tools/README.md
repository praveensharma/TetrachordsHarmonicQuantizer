# AMXD build pipeline

Build and validate both devices without opening Max:

```bash
python3 tools/build_amxd.py
```

Outputs are written to `dist/`. The builder uses an installed AMXD as its
container template when available, otherwise it uses the committed device in
`dist/`. It preserves every non-`ptch` chunk and replaces only the embedded
patch JSON. It then parses the generated container and requires its JSON to
equal the source `.maxpat` object.

After reviewing source changes, install both devices atomically:

```bash
python3 tools/build_amxd.py --install
```

This creates timestamped backups beside existing AMXDs and JavaScript files,
then atomically installs both AMXDs and their companion JavaScript. The
quantizer is mirrored into the canonical `Presets/MIDI Effects/Max MIDI Effect`
location so Live can discover the same device through either User Library
layout. It also works on a fresh machine where the devices have not been
installed yet. Verify the installed files at any time with:

```bash
python3 tools/build_amxd.py --verify-installed
```

The script never launches Max or Ableton.
# Read-only performance monitors

The existing device filenames and User Library paths remain unchanged. Building
with `--install` installs and verifies `harmonic_monitor.js` beside both devices.

- **Play:** original controls plus input → emitted output, semitone displacement,
  source channel, and the active valid pitch-class strip. I/O markers denote the
  last Note On, not currently held keys. Passthrough is explicitly labeled.
- **Quantizer Monitor:** last 24 emitted note pairs (blue input / green output),
  auto-scaled pitch axis, and SysEx/MIDI pitch-class comparison. This is an event
  sequence, not a time graph. The existing ensemble/status readouts remain here.
- **Receiver Monitor:** comparison strips and raw notes with octave labels.
  Amber underlines show pitch-class membership differences, not register differences.

Readouts use C4 = MIDI 60. Source snapshots are not assumed to be synchronized;
their differences are evidence for investigation, not proof of a SysEx parser bug.
The active strip shows the selected valid-note collection; chord-based algorithms
may additionally use chord metadata. No harmonic or allocation algorithm changed.

History is bounded and transient. Drawing is limited to 10 Hz and has no MIDI
outlet. Output telemetry runs after final Note On emission, including ensemble
decisions. Script/monitor failures are isolated from MIDI delivery. Actual
instrument reception and live Max rendering still require a studio check.

Run `node tests/test_monitors.js` along with the existing regression suites.
