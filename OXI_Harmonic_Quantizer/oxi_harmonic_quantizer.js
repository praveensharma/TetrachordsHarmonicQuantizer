// oxi_harmonic_quantizer.js
//
// Inlet 0: raw MIDI bytes from [midiin]
// Inlet 1: harmony messages from [receive tetrachords_harmony_bus_v1]
// Outlet 0: quantized/raw MIDI bytes to [midiout]
// Outlet 1: status messages
//
// Every incoming MIDI note is quantized, regardless of channel. All non-note
// channel messages are preserved. Note Offs use the exact pitch chosen for
// their Note Ons.

autowatch = 1;
inlets = 2;
outlets = 2;

var GLOBAL_NAME = "tetrachords_harmony_v1";
var harmonyGlobal = new Global(GLOBAL_NAME);
var NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

var legalPitchClasses = [];
var harmonyVersion = -1;
var lastSeenHarmonyVersion = -1;
var harmonyRoot = 0;
var activeChordNotes = [];
var activeChordVersion = -1;
var lastSeenChordVersion = -1;
var pendingHarmony = null;
var harmonyTiming = "nextnote";
var midiClockTicks = 0;
var preferUpwardTie = 1;
var enabled = 1;
// "harmonizer" maps C-B directly to successive tones of the active MIDI
// chord captured by the Tetrachords receiver. "chordnearest" preserves the
// incoming contour while moving each note to the closest active chord tone.
// "nearest" keeps the original transparent scale-quantizer mode.
var quantizerMode = "chordnearest";
var harmonizerMap = "pitchclass";
var melodyState = {};
var movementAmount = 24;
var registerLow = 24;
var registerHigh = 48;
var rootGravity = 0;

// Clean v2 menu labels map to the original internal identifiers so the DSP
// logic stays shared with compatibility-safe v1 device instances.
var MODE_ALIASES = {
    "chord-nearest": "chordnearest",
    "scale-nearest": "nearest",
    "chord-map": "harmonizer",
    "scale-contour": "melody",
    "scale-smooth": "voicelead",
    "scale-up": "up",
    "scale-down": "down",
    "scale-map": "chromatic"
};

// Each source channel/note has a FIFO stack of output pitches.
var activeNoteMappings = {};

// Prevent an early Note Off when two source notes collapse onto one output.
var outputNoteRefCounts = {};

var runningStatus = -1;
var channelData = [];
var channelExpected = 0;
var systemDataRemaining = 0;
var inSysEx = false;
var harmonyPollTask = null;

function loadbang() {
    init();
}

function init() {
    sync_from_global(1);

    // Named Max messages can be missed when either device is reloaded.  The
    // receiver also publishes the complete snapshot in Global, so poll it as
    // a reliable second path.  Only a new version changes the active scale.
    if (typeof Task !== "undefined") {
        harmonyPollTask = new Task(poll_harmony_global, this);
        harmonyPollTask.interval = 100;
        harmonyPollTask.repeat();
    }

    if (legalPitchClasses.length > 0) {
        status("Ready — legal notes: " + legalPitchClasses.join(" "));
    } else {
        status("Waiting for Tetrachords harmony");
    }
}

function poll_harmony_global() {
    var globalVersion = harmonyGlobal.version;
    var globalChordVersion = harmonyGlobal.chordVersion;

    if (
        typeof globalVersion !== "undefined" &&
        (globalVersion | 0) !== lastSeenHarmonyVersion
    ) {
        sync_from_global(0);
    }


    if (
        typeof globalChordVersion !== "undefined" &&
        (globalChordVersion | 0) !== lastSeenChordVersion
    ) {
        sync_chord_from_global();
    }
}

function anything() {
    if (inlet !== 1) {
        return;
    }

    if (messagename === "harmony") {
        apply_harmony(arrayfromargs(arguments));
    } else if (messagename === "chord") {
        apply_chord(arrayfromargs(arguments));
    }
}

function harmony() {
    if (inlet !== 1) {
        return;
    }

    apply_harmony(arrayfromargs(arguments));
}

function chord() {
    if (inlet !== 1) {
        return;
    }

    apply_chord(arrayfromargs(arguments));
}

function list() {
    var values = arrayfromargs(arguments);
    var i;

    if (inlet === 1) {
        // Accept either "harmony ..." (anything) or a bare numeric payload.
        apply_harmony(values);
        return;
    }

    for (i = 0; i < values.length; i++) {
        msg_int(values[i]);
    }
}

function apply_harmony(values) {
    var version;
    var root;
    var pcs;

    // Payload from the receiver is: version, root, pc1, pc2, ...
    if (values.length < 3) {
        return;
    }

    version = values[0] | 0;
    root = positive_mod(values[1] | 0, 12);
    pcs = normalize_pitch_classes(values.slice(2));

    if (pcs.length === 0) {
        return;
    }

    receive_harmony(version, root, pcs, 0);
}

function apply_chord(values) {
    var version;
    var root;
    var notes;

    // Payload from the receiver is: version, root, note1, note2, ...
    // An empty note list explicitly clears the active chord.
    if (values.length < 2) {
        return;
    }

    version = values[0] | 0;
    root = positive_mod(values[1] | 0, 12);
    notes = normalize_midi_notes(values.slice(2));
    receive_chord(version, root, notes);
}

function sync_from_global(forceImmediate) {
    var globalVersion = harmonyGlobal.version;
    var globalRoot = harmonyGlobal.root;
    var globalPcs = harmonyGlobal.legalPitchClasses;

    if (
        typeof globalVersion !== "undefined" &&
        globalPcs &&
        globalPcs.length
    ) {
        receive_harmony(
            globalVersion | 0,
            positive_mod(globalRoot | 0, 12),
            normalize_pitch_classes(globalPcs),
            forceImmediate ? 1 : 0
        );
    }


    sync_chord_from_global();
}


function sync_chord_from_global() {
    var globalChordVersion = harmonyGlobal.chordVersion;
    var globalChordRoot = harmonyGlobal.chordRoot;
    var globalChordNotes = harmonyGlobal.activeChordNotes;

    if (typeof globalChordVersion === "undefined") {
        return;
    }

    receive_chord(
        globalChordVersion | 0,
        positive_mod(
            typeof globalChordRoot === "undefined"
                ? harmonyRoot : globalChordRoot | 0,
            12
        ),
        normalize_midi_notes(globalChordNotes || [])
    );
}

function receive_harmony(version, root, pcs, forceImmediate) {
    if (version === lastSeenHarmonyVersion && !forceImmediate) {
        return;
    }

    lastSeenHarmonyVersion = version;

    if (
        forceImmediate ||
        legalPitchClasses.length === 0 ||
        harmonyTiming === "immediate"
    ) {
        activate_harmony(version, root, pcs);
        return;
    }

    pendingHarmony = { version: version, root: root, pcs: pcs.slice(0) };
    status("Harmony v" + version + " queued for " + timing_description());
}

function receive_chord(version, root, notes) {
    if (version === lastSeenChordVersion) {
        return;
    }

    lastSeenChordVersion = version;
    activeChordVersion = version;
    harmonyRoot = root;
    activeChordNotes = notes.slice(0);

    status(
        activeChordNotes.length > 0
            ? "Chord v" + activeChordVersion + " | " +
              midi_note_names(activeChordNotes) + " | " + mode_description()
            : "Chord cleared | " + mode_description()
    );
}

function activate_harmony(version, root, pcs) {
    harmonyVersion = version;
    harmonyRoot = root;
    legalPitchClasses = pcs.slice(0);
    pendingHarmony = null;
    status(
        "Harmony v" + harmonyVersion + " | root " + NOTE_NAMES[harmonyRoot] +
        " | legal: " + pitch_class_names(legalPitchClasses).join(" ") +
        " | " + mode_description()
    );
}

function apply_pending_harmony() {
    var harmony;

    if (!pendingHarmony) {
        return;
    }

    harmony = pendingHarmony;
    activate_harmony(harmony.version, harmony.root, harmony.pcs);
}

function tiebreakup(v) {
    preferUpwardTie = (v | 0) ? 1 : 0;
    status("Equal-distance ties go " + (preferUpwardTie ? "up" : "down"));
}

function mode(value) {
    if (MODE_ALIASES.hasOwnProperty(value)) {
        value = MODE_ALIASES[value];
    }

    if (
        value === "nearest" ||
        value === "harmonizer" ||
        value === "chordnearest" ||
        value === "chromatic" ||
        value === "melody" ||
        value === "voicelead" ||
        value === "up" ||
        value === "down" ||
        value === "sticky"
    ) {
        quantizerMode = value;
        status(mode_description());
    }
}

function harmonizer() {
    mode("harmonizer");
}

function harmonizermap(value) {
    if (value === "pitchclass" || value === "voicing") {
        harmonizerMap = value;
        status(mode_description());
    }
}

function melody() {
    mode("melody");
}

function voicelead() {
    mode("voicelead");
}

function nearest() {
    mode("nearest");
}

function chordnearest() {
    mode("chordnearest");
}

function chromatic() {
    mode("chromatic");
}

function up() {
    mode("up");
}

function down() {
    mode("down");
}

function sticky() {
    mode("sticky");
}

function timing(value) {
    if (
        value === "immediate" ||
        value === "nextnote" ||
        value === "nextbar"
    ) {
        harmonyTiming = value;
        status("Harmony changes: " + timing_description());
        if (value === "immediate") {
            apply_pending_harmony();
        }
    }
}

function timing_description() {
    if (harmonyTiming === "nextnote") {
        return "next Note On";
    }
    if (harmonyTiming === "nextbar") {
        return "next bar (96 MIDI clocks)";
    }
    return "immediately";
}

function movement(value) {
    movementAmount = clamp(value | 0, 24, 48);
    status("Movement: " + movementAmount + "% (smooth to strong)");
}

function low(value) {
    registerLow = clamp(value | 0, 0, 127);
    if (registerLow > registerHigh) {
        registerHigh = registerLow;
    }
    status("Register: " + registerLow + " to " + registerHigh);
}

function high(value) {
    registerHigh = clamp(value | 0, 0, 127);
    if (registerHigh < registerLow) {
        registerLow = registerHigh;
    }
    status("Register: " + registerLow + " to " + registerHigh);
}

function gravity(value) {
    if (value === "off") {
        rootGravity = 0;
    } else if (value === "light") {
        rootGravity = 1;
    } else if (value === "strong") {
        rootGravity = 2;
    } else {
        return;
    }
    status("Root gravity: " + value);
}

function bypass(v) {
    enabled = (v | 0) ? 0 : 1;
    status(enabled ? "Quantizer enabled" : "Quantizer bypassed");
}

function panic() {
    var channel;

    activeNoteMappings = {};
    outputNoteRefCounts = {};
    melodyState = {};

    for (channel = 1; channel <= 16; channel++) {
        send_midi3(0xB0 | ((channel - 1) & 0x0F), 123, 0);
    }

    status("All Notes Off sent");
}

function msg_int(value) {
    var v;

    if (inlet !== 0) {
        return;
    }

    v = value & 0xFF;

    // Real-time messages can appear anywhere and do not disturb parser state.
    if (v >= 0xF8) {
        if (v === 0xF8) {
            midiClockTicks = (midiClockTicks + 1) % 96;
            if (midiClockTicks === 0 && harmonyTiming === "nextbar") {
                apply_pending_harmony();
            }
        } else if (v === 0xFA) {
            midiClockTicks = 0;
        }
        outlet(0, v);
        return;
    }

    if (inSysEx) {
        outlet(0, v);

        if (v === 0xF7) {
            inSysEx = false;
        }

        return;
    }

    if (v === 0xF0) {
        clear_parser_state();
        inSysEx = true;
        outlet(0, v);
        return;
    }

    if (v >= 0xF0) {
        handle_system_status(v);
        return;
    }

    if (v >= 0x80) {
        begin_channel_message(v);
        return;
    }

    if (systemDataRemaining > 0) {
        outlet(0, v & 0x7F);
        systemDataRemaining -= 1;
        return;
    }

    collect_channel_data(v & 0x7F);
}

function handle_system_status(statusByte) {
    clear_parser_state();
    outlet(0, statusByte);

    if (statusByte === 0xFA) {
        midiClockTicks = 0;
    }

    if (statusByte === 0xF1 || statusByte === 0xF3) {
        systemDataRemaining = 1;
    } else if (statusByte === 0xF2) {
        systemDataRemaining = 2;
    } else {
        systemDataRemaining = 0;
    }
}

function begin_channel_message(statusByte) {
    var type = statusByte & 0xF0;

    runningStatus = statusByte;
    channelData = [];
    systemDataRemaining = 0;
    channelExpected = (type === 0xC0 || type === 0xD0) ? 1 : 2;
}

function collect_channel_data(dataByte) {
    if (runningStatus < 0 || channelExpected <= 0) {
        return;
    }

    channelData.push(dataByte);

    if (channelData.length < channelExpected) {
        return;
    }

    if (channelExpected === 1) {
        process_channel_message(runningStatus, channelData[0], 0);
    } else {
        process_channel_message(
            runningStatus,
            channelData[0],
            channelData[1]
        );
    }

    // Keep running status; start collecting the next message.
    channelData = [];
}

function process_channel_message(statusByte, data1, data2) {
    var type = statusByte & 0xF0;
    var channel = (statusByte & 0x0F) + 1;

    if (
        !enabled ||
        legalPitchClasses.length === 0
    ) {
        send_channel_message(statusByte, data1, data2);
        return;
    }

    if (type === 0x90 && data2 > 0) {
        handle_note_on(channel, data1, data2);
        return;
    }

    if (type === 0x80 || (type === 0x90 && data2 === 0)) {
        handle_note_off(channel, data1, data2);
        return;
    }

    send_channel_message(statusByte, data1, data2);
}

function handle_note_on(channel, inputNote, velocity) {
    var outputNote;
    var sourceKey = note_key(channel, inputNote);
    var outputKey;

    if (harmonyTiming === "nextnote") {
        apply_pending_harmony();
    }

    outputNote = quantize_note(inputNote, channel, velocity);
    outputKey = note_key(channel, outputNote);

    if (!activeNoteMappings.hasOwnProperty(sourceKey)) {
        activeNoteMappings[sourceKey] = [];
    }

    activeNoteMappings[sourceKey].push(outputNote);

    if (!outputNoteRefCounts.hasOwnProperty(outputKey)) {
        outputNoteRefCounts[outputKey] = 0;
    }

    outputNoteRefCounts[outputKey] += 1;
    send_midi3(0x90 | ((channel - 1) & 0x0F), outputNote, velocity);
}

function handle_note_off(channel, inputNote, velocity) {
    var sourceKey = note_key(channel, inputNote);
    var outputNote;
    var outputKey;

    if (
        activeNoteMappings.hasOwnProperty(sourceKey) &&
        activeNoteMappings[sourceKey].length > 0
    ) {
        outputNote = activeNoteMappings[sourceKey].shift();

        if (activeNoteMappings[sourceKey].length === 0) {
            delete activeNoteMappings[sourceKey];
        }
    } else {
        // Defensive fallback when a Note Off arrives without its Note On.
        outputNote = quantize_note(inputNote, channel, 0);
    }

    outputKey = note_key(channel, outputNote);

    if (
        outputNoteRefCounts.hasOwnProperty(outputKey) &&
        outputNoteRefCounts[outputKey] > 1
    ) {
        outputNoteRefCounts[outputKey] -= 1;
        return;
    }

    delete outputNoteRefCounts[outputKey];
    send_midi3(0x80 | ((channel - 1) & 0x0F), outputNote, velocity);
}

function quantize_note(inputNote, channel, velocity) {
    var note = clamp(inputNote | 0, 0, 127);
    var result;

    if (
        legalPitchClasses.length === 0 &&
        !(
            (quantizerMode === "harmonizer" ||
             quantizerMode === "chordnearest") &&
            activeChordNotes.length > 0
        )
    ) {
        return note;
    }

    if (quantizerMode === "harmonizer") {
        result = activeChordNotes.length > 0
            ? harmonize_to_active_chord(note)
            : nearest_quantize(note);
    } else if (quantizerMode === "chordnearest") {
        result = activeChordNotes.length > 0
            ? chord_nearest_quantize(note)
            : nearest_quantize(note);
    } else if (quantizerMode === "chromatic") {
        result = chromatic_to_harmony(note);
    } else if (quantizerMode === "melody") {
        result = melody_quantize(note, channel || 1);
    } else if (quantizerMode === "voicelead") {
        result = voicelead_quantize(note, channel || 1);
    } else if (quantizerMode === "up") {
        result = directional_quantize(note, 1);
    } else if (quantizerMode === "down") {
        result = directional_quantize(note, -1);
    } else if (quantizerMode === "sticky") {
        result = voicelead_quantize(note, channel || 1);
    } else {
        result = nearest_quantize(note);
    }

    if (
        quantizerMode !== "harmonizer" &&
        quantizerMode !== "chordnearest"
    ) {
        result = apply_root_gravity(result, velocity || 0);
    }
    return constrain_to_register(result);
}

function nearest_quantize(note) {
    var distance;
    var down;
    var up;
    var downLegal;
    var upLegal;

    if (is_legal_note(note)) {
        return note;
    }

    for (distance = 1; distance <= 12; distance++) {
        down = note - distance;
        up = note + distance;
        downLegal = down >= 0 && is_legal_note(down);
        upLegal = up <= 127 && is_legal_note(up);

        if (downLegal && upLegal) {
            return preferUpwardTie ? up : down;
        }

        if (downLegal) {
            return down;
        }

        if (upLegal) {
            return up;
        }
    }

    return note;
}

function chord_nearest_quantize(note) {
    var pitchClasses = active_chord_pitch_classes();
    var distance;
    var down;
    var up;
    var downLegal;
    var upLegal;

    if (pitchClasses.length === 0) {
        return nearest_quantize(note);
    }

    if (pitchClasses.indexOf(positive_mod(note, 12)) >= 0) {
        return note;
    }

    for (distance = 1; distance <= 12; distance++) {
        down = note - distance;
        up = note + distance;
        downLegal = down >= 0 &&
            pitchClasses.indexOf(positive_mod(down, 12)) >= 0;
        upLegal = up <= 127 &&
            pitchClasses.indexOf(positive_mod(up, 12)) >= 0;

        if (downLegal && upLegal) {
            return preferUpwardTie ? up : down;
        }
        if (downLegal) {
            return down;
        }
        if (upLegal) {
            return up;
        }
    }

    return note;
}

function directional_quantize(note, direction) {
    var distance;
    var candidate;

    for (distance = 0; distance <= 12; distance++) {
        candidate = note + direction * distance;
        if (candidate >= 0 && candidate <= 127 && is_legal_note(candidate)) {
            return candidate;
        }
    }

    return nearest_quantize(note);
}

function melody_quantize(note, channel) {
    var degrees = harmony_degrees();
    var prior = melodyState[channel];
    var degreeIndex;
    var delta;
    var degreeSteps;
    var target;
    var result;

    if (degrees.length === 0) {
        return note;
    }

    if (!prior) {
        result = chromatic_to_harmony(note);
        degreeIndex = degree_index_for_note(result, degrees);
    } else {
        delta = note - prior.input;
        degreeSteps = 0;
        if (delta !== 0) {
            degreeSteps = (delta > 0 ? 1 : -1) * Math.max(
                1,
                Math.round(Math.abs(delta) * degrees.length / 12)
            );
        }
        degreeIndex = prior.degree + degreeSteps;
        target = prior.output + delta;
        result = degree_note_near(target, degreeIndex, degrees);
    }

    melodyState[channel] = {
        input: note,
        output: result,
        degree: degree_index_for_note(result, degrees),
        version: harmonyVersion
    };
    return result;
}

function voicelead_quantize(note, channel) {
    var degrees = harmony_degrees();
    var prior = melodyState[channel];
    var strongTarget = chromatic_to_harmony(note);
    var smoothTarget = strongTarget;
    var retainedDegree;
    var blendedTarget;
    var result;

    if (prior) {
        retainedDegree = prior.degree;
        smoothTarget = degree_note_near(
            prior.output + (note - prior.input),
            retainedDegree,
            degrees
        );
    }

    blendedTarget = Math.round(
        smoothTarget * (100 - movementAmount) / 100 +
        strongTarget * movementAmount / 100
    );
    result = nearest_quantize(blendedTarget);

    melodyState[channel] = {
        input: note,
        output: result,
        degree: degree_index_for_note(result, degrees),
        version: harmonyVersion
    };
    return result;
}

function mode_description() {
    if (quantizerMode === "harmonizer") {
        return harmonizerMap === "voicing"
            ? "Harmonizer: C-B selects exact chord voicing"
            : "Harmonizer: C-B selects rooted chord tones";
    }
    if (quantizerMode === "chordnearest") {
        return "Chord Nearest: closest active chord tone";
    }
    if (quantizerMode === "chromatic") {
        return "Chromatic map: C-B selects Tetrachords degrees";
    }
    if (quantizerMode === "melody") {
        return "Melody: preserve direction and degree contour";
    }
    if (quantizerMode === "voicelead") {
        return "Voice Lead: retain degrees with minimum movement";
    }
    if (quantizerMode === "up") {
        return "Directional: quantize upward only";
    }
    if (quantizerMode === "down") {
        return "Directional: quantize downward only";
    }
    if (quantizerMode === "sticky") {
        return "Sticky: voice-led melodic contour";
    }
    return "Nearest: closest allowed Tetrachords note";
}

function harmonize_to_active_chord(inputNote) {
    if (harmonizerMap === "voicing") {
        return harmonize_exact_voicing(inputNote);
    }

    return harmonize_pitch_classes(inputNote);
}

function harmonize_pitch_classes(inputNote) {
    var degrees = active_chord_degrees();
    var selector;
    var degreeIndex;
    var octaveTurns;
    var inputOctaveC;

    if (degrees.length === 0) {
        return nearest_quantize(inputNote);
    }

    // Within every input octave, C is chord tone 1, C# tone 2, and so on.
    // Once every chord tone has been used, selection wraps one octave up.
    selector = positive_mod(inputNote, 12);
    degreeIndex = positive_mod(selector, degrees.length);
    octaveTurns = Math.floor(selector / degrees.length);
    inputOctaveC = 12 * Math.floor(inputNote / 12);

    return inputOctaveC + harmonyRoot +
        degrees[degreeIndex] + 12 * octaveTurns;
}

function harmonize_exact_voicing(inputNote) {
    var notes = activeChordNotes.slice(0);
    var selector;
    var noteIndex;
    var octaveTurns;
    var inputOctaveC;
    var octaveShift;

    if (notes.length === 0) {
        return nearest_quantize(inputNote);
    }

    notes.sort(function (a, b) { return a - b; });
    selector = positive_mod(inputNote, 12);
    noteIndex = positive_mod(selector, notes.length);
    octaveTurns = Math.floor(selector / notes.length);
    inputOctaveC = 12 * Math.floor(inputNote / 12);
    octaveShift = 12 * Math.round((inputOctaveC - notes[0]) / 12);

    return notes[noteIndex] + octaveShift + 12 * octaveTurns;
}

function active_chord_degrees() {
    var seen = {};
    var degrees = [];
    var i;
    var degree;

    for (i = 0; i < activeChordNotes.length; i++) {
        degree = positive_mod(activeChordNotes[i] - harmonyRoot, 12);
        if (!seen.hasOwnProperty(degree)) {
            seen[degree] = true;
            degrees.push(degree);
        }
    }

    degrees.sort(function (a, b) { return a - b; });
    return degrees;
}

function active_chord_pitch_classes() {
    var seen = {};
    var pitchClasses = [];
    var i;
    var pitchClass;

    for (i = 0; i < activeChordNotes.length; i++) {
        pitchClass = positive_mod(activeChordNotes[i], 12);
        if (!seen.hasOwnProperty(pitchClass)) {
            seen[pitchClass] = true;
            pitchClasses.push(pitchClass);
        }
    }

    pitchClasses.sort(function (a, b) { return a - b; });
    return pitchClasses;
}

function degree_index_for_note(note, degrees) {
    var interval = positive_mod(note - harmonyRoot, 12);
    var bestIndex = 0;
    var bestDistance = 99;
    var i;
    var distance;

    for (i = 0; i < degrees.length; i++) {
        distance = circular_distance(interval, degrees[i]);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = i;
        }
    }
    return bestIndex;
}

function degree_note_near(target, degreeIndex, degrees) {
    var wrappedIndex = positive_mod(degreeIndex, degrees.length);
    var octaveTurns = Math.floor(degreeIndex / degrees.length);
    var pitchClass = positive_mod(harmonyRoot + degrees[wrappedIndex], 12);
    var base = 12 * Math.floor(target / 12) + pitchClass + octaveTurns * 12;
    var candidates = [base - 12, base, base + 12];
    var result = candidates[0];
    var best = Math.abs(result - target);
    var i;
    var distance;

    for (i = 1; i < candidates.length; i++) {
        distance = Math.abs(candidates[i] - target);
        if (distance < best) {
            best = distance;
            result = candidates[i];
        }
    }
    return clamp(result, 0, 127);
}

function apply_root_gravity(note, velocity) {
    var threshold;
    var radius;
    var rootNote;
    var fifthNote;
    var candidate;

    if (rootGravity === 0) {
        return note;
    }

    threshold = rootGravity === 2 ? 64 : 96;
    radius = rootGravity === 2 ? 4 : 2;
    if (velocity < threshold) {
        return note;
    }

    rootNote = pitch_class_near(note, harmonyRoot);
    fifthNote = pitch_class_near(note, fifth_pitch_class());
    candidate = Math.abs(rootNote - note) <= Math.abs(fifthNote - note)
        ? rootNote : fifthNote;
    return Math.abs(candidate - note) <= radius ? candidate : note;
}

function fifth_pitch_class() {
    var degrees = harmony_degrees();
    var best = 0;
    var bestDistance = 99;
    var i;
    var distance;

    for (i = 0; i < degrees.length; i++) {
        distance = Math.abs(degrees[i] - 7);
        if (distance < bestDistance) {
            bestDistance = distance;
            best = degrees[i];
        }
    }
    return positive_mod(harmonyRoot + best, 12);
}

function pitch_class_near(note, pitchClass) {
    var base = 12 * Math.floor(note / 12) + pitchClass;
    var candidates = [base - 12, base, base + 12];
    var result = candidates[0];
    var best = Math.abs(result - note);
    var i;
    var distance;

    for (i = 1; i < candidates.length; i++) {
        distance = Math.abs(candidates[i] - note);
        if (distance < best) {
            best = distance;
            result = candidates[i];
        }
    }
    return clamp(result, 0, 127);
}

function constrain_to_register(note) {
    var result = note;
    var guard = 0;

    while (result < registerLow && guard < 12) {
        result += 12;
        guard += 1;
    }
    while (result > registerHigh && guard < 24) {
        result -= 12;
        guard += 1;
    }
    if (result < registerLow || result > registerHigh) {
        result = nearest_legal_in_register(note);
    }
    return clamp(result, 0, 127);
}

function nearest_legal_in_register(target) {
    var best = clamp(target, registerLow, registerHigh);
    var bestDistance = 999;
    var note;
    var distance;

    for (note = registerLow; note <= registerHigh; note++) {
        if (is_legal_note(note)) {
            distance = Math.abs(note - target);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = note;
            }
        }
    }
    return best;
}

function circular_distance(a, b) {
    var distance = Math.abs(a - b) % 12;
    return Math.min(distance, 12 - distance);
}

function chromatic_to_harmony(inputNote) {
    var degrees = harmony_degrees();
    var chromaticInput;
    var degreeIndex;
    var targetPitchClass;
    var outputNote;

    if (degrees.length === 0) {
        return inputNote;
    }

    // C through B are a chromatic degree selector, independent of the
    // incoming note's relation to the target root. This deliberately maps
    // every input pitch through the current Tetrachords set, so changing the
    // root or intervals produces an audible new harmony.
    chromaticInput = positive_mod(inputNote, 12);
    degreeIndex = Math.round(chromaticInput * (degrees.length - 1) / 11);
    targetPitchClass = positive_mod(harmonyRoot + degrees[degreeIndex], 12);
    outputNote = 12 * Math.floor(inputNote / 12) + targetPitchClass;

    while (outputNote < 0) {
        outputNote += 12;
    }
    while (outputNote > 127) {
        outputNote -= 12;
    }

    return outputNote;
}

function harmony_degrees() {
    var degrees = [];
    var seen = {};
    var i;
    var interval;

    for (i = 0; i < legalPitchClasses.length; i++) {
        interval = positive_mod(legalPitchClasses[i] - harmonyRoot, 12);
        if (!seen.hasOwnProperty(interval)) {
            seen[interval] = true;
            degrees.push(interval);
        }
    }

    degrees.sort(function (a, b) { return a - b; });
    return degrees;
}

function normalize_midi_notes(values) {
    var seen = {};
    var result = [];
    var i;
    var note;

    for (i = 0; i < values.length; i++) {
        note = clamp(values[i] | 0, 0, 127);
        if (!seen.hasOwnProperty(note)) {
            seen[note] = true;
            result.push(note);
        }
    }

    result.sort(function (a, b) { return a - b; });
    return result;
}

function midi_note_names(notes) {
    var result = [];
    var i;
    var octave;

    for (i = 0; i < notes.length; i++) {
        octave = Math.floor(notes[i] / 12) - 1;
        result.push(NOTE_NAMES[positive_mod(notes[i], 12)] + octave);
    }

    return result.join(" ");
}

function is_legal_note(note) {
    var pitchClass = positive_mod(note, 12);
    var i;

    for (i = 0; i < legalPitchClasses.length; i++) {
        if (legalPitchClasses[i] === pitchClass) {
            return true;
        }
    }

    return false;
}

function send_channel_message(statusByte, data1, data2) {
    var type = statusByte & 0xF0;

    if (type === 0xC0 || type === 0xD0) {
        outlet(0, statusByte & 0xFF);
        outlet(0, data1 & 0x7F);
    } else {
        send_midi3(statusByte, data1, data2);
    }
}

function send_midi3(statusByte, data1, data2) {
    outlet(0, statusByte & 0xFF);
    outlet(0, data1 & 0x7F);
    outlet(0, data2 & 0x7F);
}

function clear_parser_state() {
    runningStatus = -1;
    channelData = [];
    channelExpected = 0;
    systemDataRemaining = 0;
}

function normalize_pitch_classes(values) {
    var seen = {};
    var result = [];
    var i;
    var pitchClass;

    for (i = 0; i < values.length; i++) {
        pitchClass = positive_mod(values[i] | 0, 12);

        if (!seen.hasOwnProperty(pitchClass)) {
            seen[pitchClass] = true;
            result.push(pitchClass);
        }
    }

    result.sort(function (a, b) {
        return a - b;
    });

    return result;
}

function pitch_class_names(values) {
    var names = [];
    var i;

    for (i = 0; i < values.length; i++) {
        names.push(NOTE_NAMES[positive_mod(values[i], 12)]);
    }
    return names;
}

function note_key(channel, note) {
    return channel + ":" + note;
}

function positive_mod(value, modulus) {
    return ((value % modulus) + modulus) % modulus;
}

function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
}

function status(text) {
    outlet(1, "set", text);
}
