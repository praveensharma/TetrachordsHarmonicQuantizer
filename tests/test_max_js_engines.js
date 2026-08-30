// Integration-style smoke tests with a small mock of the Max JS environment.
// Run from the package root with: node tests/test_max_js_engines.js

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function makeContext(sharedGlobals, patcherValues) {
    const emitted = [];
    const named = [];
    const liveSets = [];

    function Global(name) {
        if (!sharedGlobals[name]) {
            sharedGlobals[name] = {};
        }

        return sharedGlobals[name];
    }

    function LiveAPI() {
        this.set = function set(name, value) {
            liveSets.push([name, value]);
        };
    }

    const context = {
        console,
        Global,
        LiveAPI,
        Array,
        Math,
        parseInt,
        autowatch: 0,
        inlets: 0,
        outlets: 0,
        inlet: 0,
        arrayfromargs(args) {
            return Array.prototype.slice.call(args);
        },
        messnamed(target, ...values) {
            named.push([target].concat(values));
        },
        outlet(index, ...values) {
            emitted.push([index].concat(values));
        }
    };

    if (patcherValues) {
        context.patcher = {
            getnamed(varname) {
                if (!Object.prototype.hasOwnProperty.call(patcherValues, varname)) {
                    return null;
                }
                return {
                    getvalueof() {
                        return patcherValues[varname];
                    }
                };
            }
        };
    }

    vm.createContext(context);
    return { context, emitted, named, liveSets };
}

function loadScript(relativePath, harness) {
    const source = fs.readFileSync(
        path.join(__dirname, "..", relativePath),
        "utf8"
    );
    vm.runInContext(source, harness.context, { filename: relativePath });
}

const sharedGlobals = {};

// Autowatch recompilation must restore the parameter state that Ableton is
// visibly holding instead of silently reverting the JavaScript globals.
const restoredReceiver = makeContext({}, {
    chord_channel: 1,
    chord_hold: 1,
    valid_note_source: 1,
    valid_note_channel: 4
});
loadScript(
    "Tetrachords_Harmony_Receiver/tetrachords_harmony_receiver.js",
    restoredReceiver
);
restoredReceiver.context.init();
assert.strictEqual(restoredReceiver.context.chordCaptureChannel, 1);
assert.strictEqual(restoredReceiver.context.chordHoldMode, "gate");
assert.strictEqual(restoredReceiver.context.validNoteSource, "midi");
assert.strictEqual(restoredReceiver.context.validNoteCaptureChannel, 4);

const receiver = makeContext(sharedGlobals);
loadScript(
    "Tetrachords_Harmony_Receiver/tetrachords_harmony_receiver.js",
    receiver
);
receiver.context.init();

// C Dorian: C D Eb F G A Bb C
receiver.context.list(
    0xF0, 0x77, 0x01, 0x40, 0x01,
    0, 2, 3, 5, 7, 9, 10, 12,
    60, 1, 0, 0xF7
);

assert.deepStrictEqual(
    Array.from(sharedGlobals.tetrachords_harmony_v1.legalPitchClasses),
    [0, 2, 3, 5, 7, 9, 10]
);
assert.strictEqual(sharedGlobals.tetrachords_harmony_v1.root, 0);
assert.strictEqual(sharedGlobals.tetrachords_harmony_v1.scaleName, "Dorian");
assert.deepStrictEqual(
    Array.from(sharedGlobals.tetrachords_harmony_v1.derivedValidMidiNotes),
    [60, 62, 63, 65, 67, 69, 70, 72]
);
assert.ok(receiver.named.length > 0, "receiver should broadcast an update");
assert.deepStrictEqual(
    receiver.named.find((message) => message[1] === "harmony"),
    ["tetrachords_harmony_bus_v1", "harmony", 1, 0, 0, 2, 3, 5, 7, 9, 10]
);
assert.deepStrictEqual(
    receiver.named.slice(-1)[0],
    [
        "tetrachords_harmony_bus_v1", "validnotes", 1, 0, "sysex",
        0, 2, 3, 5, 7, 9, 10
    ]
);
assert.deepStrictEqual(
    receiver.liveSets.slice(-3),
    [
        ["scale_mode", 1],
        ["root_note", 0],
        ["scale_name", "Dorian"]
    ]
);

// The same Tetrachords input also carries the exact active chord. Capture a
// C minor seventh chord on channel 1, including running-status note messages.
receiver.context.msg_int(0x90);
receiver.context.msg_int(48);
receiver.context.msg_int(100);
receiver.context.msg_int(51);
receiver.context.msg_int(100);
receiver.context.msg_int(55);
receiver.context.msg_int(100);
receiver.context.msg_int(58);
receiver.context.msg_int(100);

assert.deepStrictEqual(
    Array.from(sharedGlobals.tetrachords_harmony_v1.activeChordNotes),
    [48, 51, 55, 58]
);
assert.deepStrictEqual(
    Array.from(sharedGlobals.tetrachords_harmony_v1.activeChordPitchClasses),
    [0, 3, 7, 10]
);
assert.deepStrictEqual(
    receiver.named.slice(-1)[0],
    ["tetrachords_harmony_bus_v1", "chord", 4, 0, 48, 51, 55, 58]
);

// SysEx hold is the default: short Tetrachords Note Offs must not clear the
// active chord. A new valid SysEx arms a fresh capture while the old published
// chord remains available until the new Note On burst arrives.
[48, 51, 55, 58].forEach((note) => {
    receiver.context.msg_int(0x80);
    receiver.context.msg_int(note);
    receiver.context.msg_int(0);
});
assert.deepStrictEqual(
    Array.from(sharedGlobals.tetrachords_harmony_v1.activeChordNotes),
    [48, 51, 55, 58]
);

const latchGlobals = {};
const latchReceiver = makeContext(latchGlobals);
loadScript(
    "Tetrachords_Harmony_Receiver/tetrachords_harmony_receiver.js",
    latchReceiver
);
latchReceiver.context.list(
    0xF0, 0x77, 0x01, 0x40, 0x01,
    0, 2, 3, 5, 7, 9, 10, 12,
    60, 1, 0, 0xF7
);
[48, 51, 55, 58].forEach((note) => {
    latchReceiver.context.msg_int(0x90);
    latchReceiver.context.msg_int(note);
    latchReceiver.context.msg_int(100);
});
latchReceiver.context.list(
    0xF0, 0x77, 0x01, 0x40, 0x01,
    0, 2, 4, 5, 7, 9, 11, 12,
    65, 0, 0, 0xF7
);
assert.deepStrictEqual(
    Array.from(latchGlobals.tetrachords_harmony_v1.activeChordNotes),
    [48, 51, 55, 58]
);
[53, 57, 60].forEach((note) => {
    latchReceiver.context.msg_int(0x90);
    latchReceiver.context.msg_int(note);
    latchReceiver.context.msg_int(100);
});
assert.deepStrictEqual(
    Array.from(latchGlobals.tetrachords_harmony_v1.activeChordNotes),
    [53, 57, 60]
);

// Gate mode remains available for users who explicitly want note-length
// following rather than a latched harmony snapshot.
const gateGlobals = {};
const gateReceiver = makeContext(gateGlobals);
loadScript(
    "Tetrachords_Harmony_Receiver/tetrachords_harmony_receiver.js",
    gateReceiver
);
gateReceiver.context.chordhold("gate");
gateReceiver.context.list(
    0xF0, 0x77, 0x01, 0x40, 0x01,
    0, 2, 4, 5, 7, 9, 11, 12,
    60, 0, 0, 0xF7
);
gateReceiver.context.msg_int(0x90);
gateReceiver.context.msg_int(60);
gateReceiver.context.msg_int(100);
gateReceiver.context.msg_int(0x80);
gateReceiver.context.msg_int(60);
gateReceiver.context.msg_int(0);
assert.deepStrictEqual(
    Array.from(gateGlobals.tetrachords_harmony_v1.activeChordNotes),
    []
);

// Eight field positions remain valid even when two positions use the exact
// same MIDI note number rather than octave-separated instances.
const duplicateFieldGlobals = {};
const duplicateFieldReceiver = makeContext(duplicateFieldGlobals);
loadScript(
    "Tetrachords_Harmony_Receiver/tetrachords_harmony_receiver.js",
    duplicateFieldReceiver
);
duplicateFieldReceiver.context.validnotechannel(3);
duplicateFieldReceiver.context.validsource("midi");
[60, 60, 62, 63, 65, 67, 69, 70].forEach((note) => {
    duplicateFieldReceiver.context.msg_int(0x92);
    duplicateFieldReceiver.context.msg_int(note);
    duplicateFieldReceiver.context.msg_int(100);
});
duplicateFieldReceiver.context.flushvalidnotes();
assert.deepStrictEqual(
    Array.from(
        duplicateFieldGlobals.tetrachords_harmony_v1.midiFieldNotes
    ),
    [60, 60, 62, 63, 65, 67, 69, 70]
);
assert.deepStrictEqual(
    Array.from(
        duplicateFieldGlobals.tetrachords_harmony_v1
            .midiFieldPitchClasses
    ),
    [0, 2, 3, 5, 7, 9, 10]
);

// A dedicated channel captures a Note On burst of any size as one atomic
// valid-note field. It preserves repeated notes, ignores release-only bursts,
// and never leaks field notes into chord capture.
receiver.context.validnotechannel(3);
receiver.context.validsource("midi");
[60, 62, 63, 65, 67, 69, 70, 72].forEach((note) => {
    receiver.context.msg_int(0x92);
    receiver.context.msg_int(note);
    receiver.context.msg_int(100);
});
receiver.context.flushvalidnotes();
assert.deepStrictEqual(
    Array.from(sharedGlobals.tetrachords_harmony_v1.midiFieldNotes),
    [60, 62, 63, 65, 67, 69, 70, 72]
);
assert.deepStrictEqual(
    Array.from(sharedGlobals.tetrachords_harmony_v1.midiFieldPitchClasses),
    [0, 2, 3, 5, 7, 9, 10]
);
assert.deepStrictEqual(
    Array.from(sharedGlobals.tetrachords_harmony_v1.activeChordNotes),
    [48, 51, 55, 58]
);
assert.strictEqual(sharedGlobals.tetrachords_harmony_v1.validNoteSource, "midi");
assert.strictEqual(receiver.context.comparison_label(), " • EXACT RAW MATCH");

// Each new Note On burst completely replaces the previous field. Note Offs
// never change the committed collection.
receiver.context.msg_int(0x82);
receiver.context.msg_int(60);
receiver.context.msg_int(0);
assert.deepStrictEqual(
    Array.from(sharedGlobals.tetrachords_harmony_v1.midiFieldNotes),
    [60, 62, 63, 65, 67, 69, 70, 72]
);
receiver.context.msg_int(0x92);
receiver.context.msg_int(61);
receiver.context.msg_int(100);
receiver.context.flushvalidnotes();
assert.deepStrictEqual(
    Array.from(sharedGlobals.tetrachords_harmony_v1.midiFieldNotes),
    [61]
);
assert.strictEqual(receiver.context.comparison_label(), " • DIFFERENT");

[61, 62, 63, 65, 67, 69, 70, 72].forEach((note) => {
    receiver.context.msg_int(0x82);
    receiver.context.msg_int(note);
    receiver.context.msg_int(0);
});
receiver.context.flushvalidnotes();
assert.deepStrictEqual(
    Array.from(sharedGlobals.tetrachords_harmony_v1.midiFieldNotes),
    [61]
);

// A smaller non-empty burst is valid; this mode no longer requires eight notes.
[61, 64, 66].forEach((note) => {
    receiver.context.msg_int(0x92);
    receiver.context.msg_int(note);
    receiver.context.msg_int(100);
});
receiver.context.flushvalidnotes();
assert.deepStrictEqual(
    Array.from(sharedGlobals.tetrachords_harmony_v1.midiFieldNotes),
    [61, 64, 66]
);

// Restore the original field for the downstream quantizer assertions.
[61, 64, 66].forEach((note) => {
    receiver.context.msg_int(0x82);
    receiver.context.msg_int(note);
    receiver.context.msg_int(0);
});
receiver.context.flushvalidnotes();
[60, 62, 63, 65, 67, 69, 70, 72].forEach((note) => {
    receiver.context.msg_int(0x92);
    receiver.context.msg_int(note);
    receiver.context.msg_int(100);
});
receiver.context.flushvalidnotes();
assert.deepStrictEqual(
    Array.from(sharedGlobals.tetrachords_harmony_v1.midiFieldNotes),
    [60, 62, 63, 65, 67, 69, 70, 72]
);

// Switching back to SysEx after a reload restores its saved snapshot instead
// of publishing an empty collection; switching to the field remains live.
receiver.context.derivedValidMidiNotes = [];
receiver.context.derivedValidPitchClasses = [];
receiver.context.validsource("sysex");
assert.deepStrictEqual(
    Array.from(sharedGlobals.tetrachords_harmony_v1.activeValidPitchClasses),
    [0, 2, 3, 5, 7, 9, 10]
);
assert.strictEqual(sharedGlobals.tetrachords_harmony_v1.validNoteSource, "sysex");
receiver.context.validsource("midi");
assert.deepStrictEqual(
    Array.from(sharedGlobals.tetrachords_harmony_v1.activeValidPitchClasses),
    [0, 2, 3, 5, 7, 9, 10]
);
assert.strictEqual(sharedGlobals.tetrachords_harmony_v1.validNoteSource, "midi");

const quantizer = makeContext(sharedGlobals);
loadScript(
    "Harmonic_Quantizer/harmonic_quantizer.js",
    quantizer
);
quantizer.context.init();
quantizer.context.inlet = 0;
assert.strictEqual(quantizer.context.registerHigh, 48);
assert.strictEqual(quantizer.context.quantizerMode, "harmonizer");

const restoredQuantizer = makeContext(sharedGlobals, {
    quantizer_mode: 1,
    chord_map: 1,
    harmony_change: 0,
    root_gravity: 2,
    movement: 37,
    register_low: 48,
    register_high: 64
});
loadScript(
    "Harmonic_Quantizer/harmonic_quantizer.js",
    restoredQuantizer
);
restoredQuantizer.context.init();
assert.strictEqual(restoredQuantizer.context.quantizerMode, "nearest");
assert.strictEqual(restoredQuantizer.context.harmonizerMap, "voicing");
assert.strictEqual(restoredQuantizer.context.harmonyTiming, "immediate");
assert.strictEqual(restoredQuantizer.context.rootGravity, 2);
assert.strictEqual(restoredQuantizer.context.movementAmount, 37);
assert.strictEqual(restoredQuantizer.context.registerLow, 48);
assert.strictEqual(restoredQuantizer.context.registerHigh, 64);

// Presentation labels normalize to the established internal mode names.
[
    ["chord-nearest", "chordnearest"],
    ["scale-nearest", "nearest"],
    ["chord-map", "harmonizer"],
    ["scale-contour", "melody"],
    ["scale-smooth", "voicelead"],
    ["scale-up", "up"],
    ["scale-down", "down"],
    ["scale-map", "chromatic"]
].forEach(([label, internal]) => {
    quantizer.context.mode(label);
    assert.strictEqual(quantizer.context.quantizerMode, internal);
});
quantizer.context.mode("chord-map");
// Isolate mapping tests from the narrower production register default.
quantizer.context.high(96);

// Harmonizer Pitch Class mode maps C-B to successive rooted chord tones and
// wraps after exhausting the active chord.
quantizer.context.mode("harmonizer");
quantizer.context.harmonizermap("pitchclass");
assert.deepStrictEqual(
    [60, 61, 62, 63, 64].map((note) =>
        quantizer.context.quantize_note(note, 1, 100)
    ),
    [60, 63, 67, 70, 72]
);

// Chord Nearest targets the same active chord without treating C-B as
// selectors, preserving the direction and approximate shape of the input.
quantizer.context.mode("chordnearest");
assert.deepStrictEqual(
    [60, 61, 62, 64, 65, 69, 71].map((note) =>
        quantizer.context.quantize_note(note, 1, 100)
    ),
    [60, 60, 63, 63, 67, 70, 72]
);

// With no active chord, Chord Nearest falls back to the current scale.
quantizer.context.apply_chord([5, 0]);
assert.strictEqual(quantizer.context.quantize_note(61, 1, 100), 62);
quantizer.context.apply_chord([6, 0, 48, 51, 55, 58]);
quantizer.context.mode("harmonizer");

// Exact Voicing mode preserves an inversion supplied by Tetrachords.
quantizer.context.apply_chord([5, 0, 52, 55, 60]);
quantizer.context.harmonizermap("voicing");
assert.deepStrictEqual(
    [60, 61, 62, 63].map((note) =>
        quantizer.context.quantize_note(note, 1, 100)
    ),
    [64, 67, 72, 76]
);

// Return to the established nearest-note behavior for existing tests.
quantizer.context.mode("nearest");

// Transparent nearest modes never octave-wrap a low source note into the
// configured generated-note register. C#1 moves one semitone to D1 here.
quantizer.context.low(48);
quantizer.context.high(64);
assert.strictEqual(quantizer.context.quantize_note(25, 1, 100), 26);
// The High parameter is a hard safety ceiling even for transparent modes.
const safeHighNearest = quantizer.context.quantize_note(100, 1, 100);
assert.ok(safeHighNearest >= 48 && safeHighNearest <= 64);
// The boundary participates in note choice; do not pick F4 and octave-fold
// it to F3 when D#4 is the nearest legal pitch below a ceiling of E4.
quantizer.context.apply_harmony([7, 0, 0, 1, 3, 5, 6, 8, 10]);
assert.strictEqual(quantizer.context.quantize_note(64, 1, 100), 63);
assert.strictEqual(quantizer.context.quantize_note(65, 1, 100), 63);

const timingBaseVersion = quantizer.context.harmonyVersion;

// Channel 2: C#4 should tie upward to D4 in C Dorian.
quantizer.context.msg_int(0x91);
quantizer.context.msg_int(61);
quantizer.context.msg_int(100);
quantizer.context.msg_int(0x81);
quantizer.context.msg_int(61);
quantizer.context.msg_int(0);

const midiBytes = quantizer.emitted
    .filter((message) => message[0] === 0)
    .map((message) => message[1]);

assert.deepStrictEqual(midiBytes, [0x91, 62, 100, 0x81, 62, 0]);

// A held note retains the pitch chosen at Note On even if the active chord
// changes before Note Off.
quantizer.emitted.length = 0;
quantizer.context.mode("harmonizer");
quantizer.context.harmonizermap("pitchclass");
quantizer.context.apply_chord([6, 0, 48, 51, 55, 58]);
quantizer.context.msg_int(0x90);
quantizer.context.msg_int(61);
quantizer.context.msg_int(100);
quantizer.context.apply_chord([7, 5, 53, 56, 60]);
quantizer.context.msg_int(0x80);
quantizer.context.msg_int(61);
quantizer.context.msg_int(0);
assert.deepStrictEqual(
    quantizer.emitted
        .filter((message) => message[0] === 0)
        .map((message) => message[1]),
    [0x90, 63, 100, 0x80, 63, 0]
);
quantizer.context.mode("nearest");

// Program change on channel 2 is preserved.
quantizer.emitted.length = 0;
quantizer.context.msg_int(0xC1);
quantizer.context.msg_int(12);
assert.deepStrictEqual(
    quantizer.emitted
        .filter((message) => message[0] === 0)
        .map((message) => message[1]),
    [0xC1, 12]
);

// Panic explicitly releases mapped notes and recenters pitch bend on every
// channel; it does not rely on CC 123 being implemented by the destination.
quantizer.emitted.length = 0;
quantizer.context.outputNoteRefCounts = {"1:72": 1};
quantizer.context.panic();
const panicBytes = quantizer.emitted
    .filter((message) => message[0] === 0)
    .map((message) => message[1]);
assert.deepStrictEqual(panicBytes.slice(0, 3), [0x80, 72, 0]);
assert.ok(
    panicBytes.some((value, index) =>
        value === 0xE0 &&
        panicBytes[index + 1] === 0 &&
        panicBytes[index + 2] === 64
    )
);

// Channel 1 is quantized too; incoming channels are preserved but never filtered.
quantizer.emitted.length = 0;
quantizer.context.msg_int(0x90);
quantizer.context.msg_int(61);
quantizer.context.msg_int(99);
assert.deepStrictEqual(
    quantizer.emitted
        .filter((message) => message[0] === 0)
        .map((message) => message[1]),
    [0x90, 62, 99]
);

// Source-track SysEx passes through byte-for-byte.
quantizer.emitted.length = 0;
[0xF0, 1, 2, 3, 0xF7].forEach((byte) => {
    quantizer.context.msg_int(byte);
});
assert.deepStrictEqual(
    quantizer.emitted
        .filter((message) => message[0] === 0)
        .map((message) => message[1]),
    [0xF0, 1, 2, 3, 0xF7]
);

// Melodic modes stay inside the active harmony and preserve upward contour.
quantizer.context.mode("melody");
const melodyFirst = quantizer.context.quantize_note(60, 1, 80);
const melodySecond = quantizer.context.quantize_note(64, 1, 80);
assert.ok(quantizer.context.is_legal_note(melodyFirst));
assert.ok(quantizer.context.is_legal_note(melodySecond));
assert.ok(melodySecond >= melodyFirst);

quantizer.context.mode("voicelead");
quantizer.context.movement(25);
const voiceLed = quantizer.context.quantize_note(67, 1, 80);
assert.ok(quantizer.context.is_legal_note(voiceLed));

// Register constraints keep generated notes in the requested range.
quantizer.context.low(48);
quantizer.context.high(72);
const constrained = quantizer.context.quantize_note(100, 2, 80);
assert.ok(constrained >= 48 && constrained <= 72);

// Harmony timing can latch at the next note or a 4/4 MIDI-clock bar.
quantizer.context.timing("nextnote");
quantizer.context.apply_valid_notes([
    timingBaseVersion + 1, 2, "sysex", 2, 4, 5, 7, 9, 11, 0
]);
assert.strictEqual(quantizer.context.harmonyVersion, timingBaseVersion);
quantizer.context.handle_note_on(1, 60, 80);
assert.strictEqual(quantizer.context.harmonyVersion, timingBaseVersion + 1);

quantizer.context.timing("nextbar");
quantizer.context.apply_valid_notes([
    timingBaseVersion + 2, 5, "midi", 5, 7, 8, 10, 0, 2, 3
]);
for (let tick = 0; tick < 95; tick += 1) {
    quantizer.context.msg_int(0xF8);
}
assert.strictEqual(quantizer.context.harmonyVersion, timingBaseVersion + 1);
quantizer.context.msg_int(0xF8);
assert.strictEqual(quantizer.context.harmonyVersion, timingBaseVersion + 2);

// Live must restore per-device settings. Presentation controls are registered
// parameters with initial values, and no loadmess is allowed to overwrite the
// state stored in an Ableton Set.
const quantizerPatch = JSON.parse(fs.readFileSync(
    path.join(
        __dirname,
        "..",
        "Harmonic_Quantizer",
        "Harmonic Quantizer.maxpat"
    ),
    "utf8"
));

const receiverPatch = JSON.parse(fs.readFileSync(
    path.join(
        __dirname,
        "..",
        "Tetrachords_Harmony_Receiver",
        "Tetrachords Harmony Receiver.maxpat"
    ),
    "utf8"
));

function patchBox(patch, id) {
    return patch.patcher.boxes
        .map((entry) => entry.box)
        .find((box) => box.id === id);
}

function hasPatchline(patch, sourceId, destinationId) {
    return patch.patcher.lines.some((entry) =>
        entry.patchline.source[0] === sourceId &&
        entry.patchline.destination[0] === destinationId
    );
}

[
    "obj-mode-menu",
    "obj-harmonizer-menu",
    "obj-timing-menu",
    "obj-gravity-menu",
    "obj-movement-number",
    "obj-low-number",
    "obj-high-number"
].forEach((id) => {
    assert.strictEqual(patchBox(quantizerPatch, id).parameter_enable, 1);
    assert.ok(
        hasPatchline(quantizerPatch, "obj-thisdevice", id),
        `live.thisdevice should restore ${id} after Ableton loads saved state`
    );
});
assert.deepStrictEqual(
    patchBox(quantizerPatch, "obj-mode-menu")
        .saved_attribute_attributes.valueof.parameter_enum,
    [
        "chord-nearest",
        "scale-nearest",
        "chord-map",
        "scale-contour",
        "scale-smooth",
        "scale-up",
        "scale-down",
        "scale-map"
    ]
);
assert.deepStrictEqual(
    patchBox(quantizerPatch, "obj-mode-menu")
        .saved_attribute_attributes.valueof.parameter_initial,
    [2]
);
assert.strictEqual(
    patchBox(quantizerPatch, "obj-mode-menu")
        .saved_attribute_attributes.valueof.parameter_mmax,
    7
);
assert.ok(
    !patchBox(quantizerPatch, "obj-mode-menu")
        .saved_attribute_attributes.valueof.parameter_enum
        .includes("sticky")
);
assert.deepStrictEqual(
    patchBox(quantizerPatch, "obj-high-number")
        .saved_attribute_attributes.valueof.parameter_initial,
    [48]
);
assert.strictEqual(patchBox(quantizerPatch, "obj-movement-number").minimum, 24);
assert.strictEqual(patchBox(quantizerPatch, "obj-movement-number").maximum, 48);
assert.strictEqual(patchBox(receiverPatch, "obj-chord-channel-menu").parameter_enable, 1);
assert.strictEqual(patchBox(receiverPatch, "obj-chord-hold-menu").parameter_enable, 1);
assert.strictEqual(patchBox(receiverPatch, "obj-valid-source-menu").parameter_enable, 1);
assert.strictEqual(patchBox(receiverPatch, "obj-valid-channel-menu").parameter_enable, 1);
assert.deepStrictEqual(
    patchBox(receiverPatch, "obj-valid-source-menu")
        .saved_attribute_attributes.valueof.parameter_initial,
    [0]
);
assert.deepStrictEqual(
    patchBox(receiverPatch, "obj-valid-channel-menu")
        .saved_attribute_attributes.valueof.parameter_initial,
    [0]
);
assert.ok(
    !quantizerPatch.patcher.boxes.some((entry) =>
        /^obj-load-(mode|timing|gravity|movement|low|high|harmonizer-map)$/.test(
            entry.box.id || ""
        )
    )
);
assert.ok(
    !receiverPatch.patcher.boxes.some((entry) =>
        /^obj-load-chord-(channel|hold)$/.test(entry.box.id || "")
    )
);

console.log("All Max JS engine smoke tests passed.");
