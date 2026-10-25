# AMXD build pipeline

Build and validate all three devices without opening Max:

```bash
python3 tools/build_amxd.py
```

Outputs are written to `dist/`. The builder uses an installed AMXD as its
container template when available, otherwise it uses the committed device in
`dist/`. It preserves every non-`ptch` chunk and replaces only the embedded
patch JSON. It then parses the generated container and requires its JSON to
equal the source `.maxpat` object.

After reviewing source changes, install the devices at their existing paths:

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

The script never launches Max or Ableton. It now includes the dedicated
**Tetrachords Note Field Input**, whose Ableton track filters hardware channel 3
before Live converts channels internally. The main receiver track filters the
chord channel (normally 1), with **Field input = Separate track**. See README's
two-track setup. Run `node tests/test_field_input.js` to verify the role-separated
transport, atomic capture and preservation of chord/SysEx state.
# Read-only performance monitors

## Ensemble controls

The Play page uses **Independent / Ensemble A–H** and **Voice A–D** menus.
Devices coordinate only within the same ensemble; give each device a distinct
voice. Voice labels are identities, not MIDI channels or fixed bass/treble roles.
The menus drive the original persisted numeric parameters, preserving saved
group and part assignments and automation. A = former 1, B = 2, and so on.

**Avoid Unison %** is the former Separation control, with unchanged behavior:
0% preserves each quantizer's normal pitch choice; higher values penalize choosing
another member's last assigned exact MIDI pitch. 100% is the strongest preference,
not guaranteed uniqueness or a probability. Alternatives remain valid notes within
six semitones of the original result and respect existing mode/register rules.
Octave doubles are allowed. Comparison uses last assigned notes, not a held-note
gate detector. Independent disables this coordination; enabled ensembles retain
the existing 4 ms collection window even with Avoid Unison at zero.

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
