# Voice Leading: Motion and Same Pitch

## Studio setup

1. Reload the updated **Harmonic Quantizer** from the User Library.
2. For the Gamut articulation test, open **Input**, choose **Follow Gate** and
   **Same Pitch: Retrigger**. Use **Ensemble: Independent** initially to isolate
   note articulation from the existing 4 ms coordination window.
3. Add one **Harmonic Motion** MIDI effect, and select the same Ensemble A–H as
   your four quantizers. It passes MIDI through unchanged and can sit on a
   convenient track. It is a control device, not an additional quantization stage.
4. Use **Stateful Nearest** on those quantizers and assign distinct **Voice A–D**.
   For the spread experiment, assign those identities in intended low-to-high order.
5. Leave all Motion Bias values at 0. Record the same source phrase with Spread
   at 0, +100 (Expand), and -100 (Contract). Reset Ensemble between takes for
   comparable voice histories. Keep Continuity, Separation and harmony identical.

Tetrachords' selected valid field remains authoritative: MIDI Note Field and
SysEx fields both work, and this feature does not assume they are equivalent.
Chord Map and other non-stateful modes keep their existing pitch behavior.

## Same Pitch ownership

Legato retains the existing MIDI behavior: incoming Note Ons are forwarded,
including repeated output pitches, and overlapping owners share a final Note
Off. Hardware may keep its gate continuously high across those repeated Ons.

Retrigger sends Off then On when a new note resolves to an already-active pitch
on the same MIDI channel. The new note alone owns the replacement gate. Older
input mappings remain as FIFO tombstones so their eventual releases are consumed
without cutting off the replacement or prolonging its gate. Distinct channels
remain independent. The setting can change while notes are active.

In Hold Last Pitch, replacement already releases the held note, so both settings
retain that behavior; Settle still applies only in Hold mode. Defaults remain
Legato and neutral motion to avoid changing existing projects on installation.

This guarantees MIDI Off/On ordering without adding a timed gap. Whether FH-2
and the downstream envelope produce a new audible attack with that pulse width
must be verified on the instrument. The reported intermittent timing problem
has not yet been reproduced with raw/post-quantizer MIDI and audio captures.

## Motion scoring

One controller exposes five floating-point Live parameters, all saved with the
Set: V1–V4 Motion Bias (-100..100) and Spread Motion (-100..100), plus its ensemble.
The macro contributions for Voice A–D are `spread × [-1, -0.4, 0.4, 1]`.
Effective bias is the individual value plus that contribution, clamped to ±100.
Changing Spread never edits the four base controls. Voice identities are fixed;
there is no pitch sorting, center tracking or automatic voice-crossing behavior.

For a candidate `c` and the previous realized output `p`, let `delta = c - p`
and `b = effective bias / 100`. Direction cost is:

```
delta * b >= 0: 0
otherwise:     12 * abs(b) * min(abs(delta), 4) / 4
```

It is a bounded penalty for contrary movement, with no reward for marching
up/down and no cost for remaining stationary. Input and continuity use the
existing squared distances; a valid common tone retains the existing finite
bonus. Separation remains an independent exact-pitch penalty. The shared
candidate-cost helper feeds Stateful Nearest and ensemble candidate evaluation.
Zero effective motion keeps the old nearest/continuity paths and MIDI results.
No motion batching delay is added. Existing ensemble buffering still applies
only with an ensemble and Separation above zero.

With nonzero motion, Limited register is a hard candidate boundary, including
the first note and Continuity 0. If that range contains no valid pitch, that
input is silent and its off is consumed. Free uses valid MIDI pitches 0–127.
Neutral preserves the existing mode-specific register behavior.

## Ownership, diagnostics and limits

Use one Harmonic Motion controller per ensemble. Controllers publish a small
snapshot every 250 ms and immediately on parameter changes. Quantizers read the
snapshot when processing a note. Duplicate active controllers produce a visible
conflict and neutral motion, rather than choosing whichever writes last. Removing
a controller unregisters it; a stalled controller expires after two seconds.
No harmonic state or live voice history is persisted in the controller.

The controller displays all four effective biases. The quantizer Monitor status
shows base, macro contribution, effective bias and input/continuity/direction
costs for the chosen pitch. Existing separation diagnostics remain available.
This is suitable for studio evaluation; it is not a full candidate-table editor.
Do not use matching ensemble IDs for unrelated instruments in simultaneously
open Sets: the shared ensemble namespace has the existing Max Global scope.

## Build and validation

```
python3 tools/performance_layout.py
node tests/test_motion_retrigger.js
node tests/test_quantizer_logic.js
node tests/test_max_js_engines.js
node tests/test_ensemble.js
node tests/test_monitors.js
python3 tools/build_amxd.py --device 'Harmonic Quantizer' --device 'Harmonic Motion'
python3 tools/build_amxd.py --install --device 'Harmonic Quantizer' --device 'Harmonic Motion'
python3 tools/build_amxd.py --verify-installed --device 'Harmonic Quantizer' --device 'Harmonic Motion'
```

Both devices fit the 169 px presentation height. The quantizer gains an Input
tab, keeping the main performance controls and note display visible on Play.
The existing file names are overwritten with backups; Harmonic Motion is new.
An already-loaded device may retain its embedded patch until replaced/reloaded.
Automated tests verify logic, parameter metadata/restore paths and packages;
actual Live automation recall, visual rendering, jitter and hardware attacks
remain studio acceptance checks.
