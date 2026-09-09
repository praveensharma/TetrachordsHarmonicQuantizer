# Live Current Scale bridge

## Authority model

The receiver owns the canonical harmonic state. Its active valid-note source is
either SysEx Intervals or MIDI Note Field. The sources are never assumed equal.
The exact selected collection continues to feed the custom quantizers.

Ableton Live Current Scale is a lossy consumer of that state:

```text
SysEx root + selected exact valid-note source
                    |
                    +--> custom quantizers (exact)
                    |
                    +--> LiveScaleMatcher --> Live Current Scale (projection)
```

MIDI Note Field pitch classes are normalized only for matching. Raw MIDI notes,
octaves, order and duplicate pitch classes remain available in shared state.

## Installed-beta capability evidence

Target inspected: Ableton Live 12 Beta 12.4.15b1 with bundled Max 9.1.5.

The current Song LOM documents `root_note`, `scale_name`, and `scale_mode` as
read/write/observe and `scale_intervals` as read/observe. The installed beta's
`_MxDCore/LomTypes.pyc` exposes all four names for both Song and Clip. Runtime
Clip mutability and selected/playing-clip precedence still need the retained
probe because the public Clip documentation lags the beta.

| Property | Song | MIDI clip | Audio clip |
|---|---|---|---|
| `root_note` | R/W/O documented | exposed; runtime probe pending | exposed; runtime probe pending |
| `scale_name` | R/W/O documented | exposed; runtime probe pending | exposed; runtime probe pending |
| `scale_mode` | R/W/O documented | exposed; runtime probe pending | exposed; runtime probe pending |
| `scale_intervals` | R/O documented | exposed; runtime probe pending | exposed; runtime probe pending |

Use `tools/Live Scale API Probe.maxpat` inside Live's bundled Max. It reads each
property, writes back the same value to test writability, attaches observers,
and emits a JSON report to the Max Console. Select a MIDI clip, then an audio
clip, and retain both reports before enabling any future clip-stamping feature.

## Matching policy

The matcher fixes the candidate root to the latest Tetrachords SysEx root, then
compares the active exact pitch-class set with a versioned Live scale library.
Exact equality wins. Approximate matching heavily penalizes extra notes because
a Live-native device emitting a Tetrachords-invalid note is usually worse than
omitting one color tone. Approximate status is always visible; it is never
presented as exact.

If no SysEx root or no complete active collection exists, the bridge performs a
safe no-op. If Live Scale Sync is enabled after state exists, it immediately
projects the retained state. Manual Live scale edits are not continuously
fought; the next Tetrachords harmonic commit restores the projected state.

## Clip support recommendation

Keep clip mutation disabled for Phase 1. The installed beta exposes the new
properties, but public documentation and precedence behavior are not yet stable
enough to stamp clips automatically. Revisit after the runtime probe confirms
MIDI/audio capability and a controlled test documents Song versus selected and
playing clip behavior.

