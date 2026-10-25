# Voice Separation v2

Quantizers in the same named Ensemble share active realized pitches. The
automatable **Voice Separation** parameter adds a finite exact-MIDI-note
collision cost to the existing input-distance, continuity, and common-tone
score. Octave equivalents are not collisions and unisons remain possible.

Events arriving within the existing 4 ms coordination window are evaluated in
a deterministic order. First-choice priority rotates Voice A through D between
batches. Register limits remain hard candidate constraints.

Remembered pitch and occupied pitch are separate. In Follow Notes mode, a Note
Off removes the corresponding realized pitch from occupancy. In Hold Last Pitch
mode, occupancy remains until replacement or reset. This is a useful CV pitch
proxy but cannot know whether an independently patched analog envelope is still
audible.

At 0%, Note Ons bypass ensemble coordination and retain the independent v1 path.
Note On/Off pairing continues to use the captured transformed-note FIFO, so a
later harmony or parameter change cannot redirect an earlier Note Off.

Runtime tracing emits `SEPARATION` only when collision pressure changes the
otherwise preferred result, including the avoided pitch, selected pitch, and
winning score.
