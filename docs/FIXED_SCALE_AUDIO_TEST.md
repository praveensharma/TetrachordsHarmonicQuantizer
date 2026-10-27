# Receiver-free audio comparison

Build with `python3 tools/build_fixed_scale_test.py`.
The generated **Harmonic Quantizer Fixed Scale Test.amxd** uses the production
MIDI graph, control adapter and native binary. Its only extra logic initializes
an isolated C-major field plus test controls. It does not generate notes, run
acceptance sequences, or publish to the studio harmony bus.

Verified in Live: Scale Nearest, Register Free, Immediate, device enabled.
The initializer also selects Follow Gate, Legato, independent ensemble and
zero separation. C-major field: C D E F G A B; chord metadata C E G C.

On the existing T-1 channel-1 → FH-2 channel-5 test lane, Native Acceptance
and Native Legacy Recall are disabled. Only this fixed-scale device is enabled.
Existing clips and hardware routing were preserved; transport remains stopped.

For a controlled audio A/B, record two short identical sequences, one with this
device's activator Off and one On. Keep all other settings, synth envelope,
recording monitoring, buffer and routing identical. Keep the old validation
fixtures disabled. Recorded onset alignment is not absolute round-trip latency.
This test wrapper is not installed as a public release or replacement preset.
