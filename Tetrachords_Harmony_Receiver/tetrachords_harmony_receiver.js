// tetrachords_harmony_receiver.js
//
// Max for Live companion for the Tetrachords 17-byte SysEx message:
// F0 77 01 40 01 [8 interval bytes] [root MIDI note] [mode] [track] F7
//
// Inlet 0: raw MIDI bytes from [midiin]
// Outlet 0: status messages (connect to a message box)
// Outlet 1: harmony, active-chord and valid-note lists for inspection
// Outlet 2: SysEx-derived note monitor
// Outlet 3: dedicated MIDI note-field monitor
// Outlet 4: active valid-note source monitor
//
// The current harmony is shared two ways:
// 1. Global("tetrachords_harmony_v1") stores the latest snapshot.
// 2. A named Max receive bus gets each update immediately.

autowatch = 1;
inlets = 1;
outlets = 5;

var GLOBAL_NAME = "tetrachords_harmony_v1";
var BUS_NAME = "tetrachords_harmony_bus_v1";
var harmonyGlobal = new Global(GLOBAL_NAME);

var song = null;
var ready = false;
var updateLiveUI = 1;
var sysexBuffer = [];
var version = 0;
var chordVersion = 0;
var activeValidVersion = 0;

// The shared valid-note source is selected once here. Quantizers consume the
// resulting active snapshot instead of independently choosing a source.
var validNoteSource = "sysex";
var validNoteCaptureChannel = 0;
var validNoteCaptureWindowMs = 25;
var pendingValidNoteOns = [];
var validNoteCaptureTask = null;
var validMidiNotes = [];
var validMidiPitchClasses = [];
var validMidiVersion = 0;
var derivedValidMidiNotes = [];
var derivedValidPitchClasses = [];
var lastActiveValidKey = "";

// Tetrachords emits the active chord as ordinary MIDI notes on this same
// input.  A value of 0 captures all channels; 1-16 selects one channel.
var chordCaptureChannel = 0;
var chordCaptureDelayMs = 8;
// "sysex" latches chord Note Ons until the next valid Tetrachords SysEx.
// "gate" follows Note On/Off state exactly (the original behavior).
var chordHoldMode = "sysex";
var heldChordNoteCounts = {};
var lastChordKey = "";
var chordPublishTask = null;

var runningStatus = -1;
var channelData = [];
var channelExpected = 0;

var lastRoot = -1;
var lastRootMidiNote = -1;
var lastScale = "";
var lastIntervalKey = "";
var TRACE_PATH = "/private/tmp/tetrachords_receiver_trace.tsv";
var traceLineCount = 0;

var NOTE_NAMES = [
    "C", "C#", "D", "D#", "E", "F",
    "F#", "G", "G#", "A", "A#", "B"
];

function loadbang() {
    init();
}

// The Tetrachords mode byte is only an encoder state. The eight interval
// bytes are authoritative. These names are used only for Ableton's scale UI.
var MODE_TO_LIVE_SCALE = {
    0: "Major",
    1: "Dorian",
    2: "Phrygian",
    3: "Lydian",
    4: "Mixolydian",
    5: "Minor",
    6: "Locrian"
};

var INTERVAL_TO_SCALE = {
    "0,2,4,5,7,9,11,12": "Major",
    "0,2,3,5,7,9,10,12": "Dorian",
    "0,1,3,5,7,8,10,12": "Phrygian",
    "0,2,4,6,7,9,11,12": "Lydian",
    "0,2,4,5,7,9,10,12": "Mixolydian",
    "0,2,3,5,7,8,10,12": "Minor",
    "0,1,3,5,6,8,10,12": "Locrian"
};

function init() {
    try {
        reset_runtime_trace("event\tdetails");
        restore_controls_from_patcher();
        song = new LiveAPI("live_set");
        ready = true;
        restore_valid_note_snapshots();
        publish_active_valid_notes(1);
        status("Ready — waiting for Tetrachords SysEx");
        update_valid_note_monitors();
    } catch (error) {
        song = null;
        ready = false;
        status("LiveAPI init failed: " + error);
    }
}

// Live keeps the menu values when an autowatched script recompiles, but the
// new JavaScript context otherwise falls back to channel 0 (all/off). Read the
// controls directly so the running filters always match the visible device.
function restore_controls_from_patcher() {
    var value;

    value = patcher_control_value("chord_channel");
    if (value !== null) {
        chordCaptureChannel = menu_index_or_number(value, "all", 0, 16);
    }

    value = patcher_control_value("chord_hold");
    if (value !== null) {
        chordHoldMode = menu_choice(value, ["sysex", "gate"], chordHoldMode);
    }

    value = patcher_control_value("valid_note_source");
    if (value !== null) {
        validNoteSource = menu_choice(
            value,
            ["sysex", "midi"],
            validNoteSource,
            { "sysex intervals": "sysex", "midi note field": "midi" }
        );
    }

    value = patcher_control_value("valid_note_channel");
    if (value !== null) {
        validNoteCaptureChannel = menu_index_or_number(value, "off", 0, 16);
    }
    harmonyGlobal.validNoteCaptureChannel = validNoteCaptureChannel;

    runtime_trace(
        "RESTORE_CONTROLS\tsource=" + validNoteSource +
        " chordCh=" + chordCaptureChannel +
        " fieldCh=" + validNoteCaptureChannel +
        " hold=" + chordHoldMode
    );
}

function patcher_control_value(varname) {
    var object;
    var value;

    try {
        if (!this.patcher || !this.patcher.getnamed) {
            return null;
        }
        object = this.patcher.getnamed(varname);
        if (!object || !object.getvalueof) {
            return null;
        }
        value = object.getvalueof();
        if (
            value !== null && typeof value !== "string" &&
            typeof value.length !== "undefined"
        ) {
            value = value.length > 0 ? value[0] : null;
        }
        return typeof value === "undefined" ? null : value;
    } catch (error) {
        runtime_trace("RESTORE_ERROR\t" + varname + "=" + error);
        return null;
    }
}

function menu_choice(value, orderedValues, fallback, aliases) {
    var normalized;

    if (typeof value === "number") {
        return orderedValues[value | 0] !== undefined
            ? orderedValues[value | 0]
            : fallback;
    }
    normalized = String(value).toLowerCase();
    if (aliases && aliases.hasOwnProperty(normalized)) {
        normalized = aliases[normalized];
    }
    return orderedValues.indexOf(normalized) >= 0 ? normalized : fallback;
}

function menu_index_or_number(value, zeroLabel, minimum, maximum) {
    var normalized;
    var numeric;

    if (typeof value === "number") {
        numeric = value | 0;
    } else {
        normalized = String(value).toLowerCase();
        numeric = normalized === zeroLabel ? 0 : (parseInt(normalized, 10) | 0);
    }
    return numeric >= minimum && numeric <= maximum ? numeric : minimum;
}

function validsource(value) {
    value = String(value).toLowerCase().replace(/[^a-z]/g, "");
    if (value === "sysexintervals" || value === "derived") {
        value = "sysex";
    } else if (
        value === "8notemidi" || value === "notemidi" ||
        value === "midinotefield" || value === "tetrachordsmidi"
    ) {
        value = "midi";
    }

    if (value !== "sysex" && value !== "midi") {
        return;
    }

    validNoteSource = value;
    runtime_trace("SOURCE\t" + validNoteSource);
    restore_valid_note_snapshots();
    publish_active_valid_notes(1);
}

function restore_valid_note_snapshots() {
    var storedMidiNotes = harmonyGlobal.midiFieldNotes ||
        harmonyGlobal.tetrachordsValidMidiNotes;
    var storedMidiPitchClasses = harmonyGlobal.midiFieldPitchClasses ||
        harmonyGlobal.tetrachordsValidPitchClasses;

    if (
        derivedValidMidiNotes.length === 0 &&
        harmonyGlobal.derivedValidMidiNotes
    ) {
        derivedValidMidiNotes = arrayfromargs(
            harmonyGlobal.derivedValidMidiNotes
        );
        derivedValidPitchClasses = arrayfromargs(
            harmonyGlobal.derivedValidPitchClasses || []
        );
    }

    if (validMidiNotes.length === 0 && storedMidiNotes) {
        validMidiNotes = arrayfromargs(storedMidiNotes);
        validMidiPitchClasses = arrayfromargs(storedMidiPitchClasses || []);
    }
}

function validnotechannel(value) {
    var channel;

    if (value === "off" || value === "Off" || value === 0 || value === "0") {
        channel = 0;
    } else {
        channel = value | 0;
        if (channel < 1 || channel > 16) {
            return;
        }
    }

    abandon_pending_valid_notes();
    validNoteCaptureChannel = channel;
    harmonyGlobal.validNoteCaptureChannel = validNoteCaptureChannel;
    runtime_trace("FIELD_CHANNEL\t" + validNoteCaptureChannel);
    update_valid_note_monitors();
    status(
        validNoteCaptureChannel === 0
            ? "MIDI Note Field capture: Off"
            : "MIDI Note Field capture: channel " + validNoteCaptureChannel
    );
}

function validwindow(value) {
    validNoteCaptureWindowMs = Math.max(10, Math.min(50, value | 0));
    status("MIDI Note Field capture window: " + validNoteCaptureWindowMs + " ms");
}

function chordchannel(value) {
    var channel;

    if (value === "all" || value === "All") {
        channel = 0;
    } else {
        channel = value | 0;
        if (channel < 0 || channel > 16) {
            return;
        }
    }

    chordCaptureChannel = channel;
    clear_active_chord();
    status(
        "Chord capture: " +
        (chordCaptureChannel === 0 ? "all channels" : "channel " + chordCaptureChannel)
    );
}

function chorddelay(value) {
    chordCaptureDelayMs = Math.max(0, Math.min(100, value | 0));
    status("Chord transition buffer: " + chordCaptureDelayMs + " ms");
}

function chordhold(value) {
    value = String(value).toLowerCase();
    if (value !== "sysex" && value !== "gate") {
        return;
    }

    chordHoldMode = value;
    status(
        chordHoldMode === "sysex"
            ? "Chord Hold: latched until the next Tetrachords SysEx"
            : "Chord Hold: follows MIDI Note On/Off gates"
    );
}

function updatelive(v) {
    updateLiveUI = (v | 0) ? 1 : 0;
    status("Update Live scale/root: " + (updateLiveUI ? "on" : "off"));
}

function rebroadcast() {
    if (harmonyGlobal.message && harmonyGlobal.message.length >= 5) {
        broadcast_harmony(harmonyGlobal.message);
        outlet(1, harmonyGlobal.message);
        if (harmonyGlobal.chordMessage) {
            broadcast_harmony(harmonyGlobal.chordMessage);
            outlet(1, harmonyGlobal.chordMessage);
        }
        if (harmonyGlobal.validNoteMessage) {
            broadcast_harmony(harmonyGlobal.validNoteMessage);
            outlet(1, harmonyGlobal.validNoteMessage);
        }
        status("Rebroadcast current harmony, chord and valid-note source");
    } else {
        status("No Tetrachords harmony received yet");
    }
}

// Friendly Presentation-mode controls. These keep the patching logic and the
// original method names intact while giving the device readable button labels.
function refresh() {
    rebroadcast();
}

function live(value) {
    if (value === "on" || value === 1 || value === "1") {
        updatelive(1);
    } else if (value === "off" || value === 0 || value === "0") {
        updatelive(0);
    }
}

function msg_int(value) {
    var v = value & 0xFF;

    // MIDI real-time bytes may occur inside SysEx and do not alter its state.
    if (v >= 0xF8) {
        return;
    }

    if (v === 0xF0) {
        clear_channel_parser();
        sysexBuffer = [v];
        return;
    }

    if (sysexBuffer.length > 0) {
        if (v >= 0x80 && v !== 0xF7) {
            status("SysEx aborted by status 0x" + v.toString(16));
            sysexBuffer = [];
            clear_channel_parser();
            return;
        }

        sysexBuffer.push(v);

        if (v === 0xF7) {
            handle_sysex(sysexBuffer.slice(0));
            sysexBuffer = [];
        }
        return;
    }

    if (v >= 0xF0) {
        clear_channel_parser();
        return;
    }

    if (v >= 0x80) {
        begin_channel_message(v);
        return;
    }

    collect_channel_data(v & 0x7F);
}

function list() {
    var bytes = arrayfromargs(arguments);
    var i;

    if (
        bytes.length >= 2 &&
        bytes[0] === 0xF0 &&
        bytes[bytes.length - 1] === 0xF7
    ) {
        handle_sysex(bytes);
        return;
    }

    for (i = 0; i < bytes.length; i++) {
        msg_int(bytes[i]);
    }
}

function handle_sysex(message) {
    var root;
    var rootMidiNote;
    var mode;
    var track;
    var intervals;
    var intervalKey;
    var scaleName;

    if (
        message.length !== 17 ||
        message[0] !== 0xF0 ||
        message[1] !== 0x77 ||
        message[2] !== 0x01 ||
        message[3] !== 0x40 ||
        message[4] !== 0x01 ||
        message[16] !== 0xF7
    ) {
        status("Ignored non-matching SysEx (" + message.length + " bytes)");
        return;
    }

    intervals = message.slice(5, 13);
    rootMidiNote = message[13] & 0x7F;
    root = rootMidiNote % 12;
    mode = message[14] & 0x7F;
    track = message[15] & 0x7F;
    intervalKey = intervals.join(",");

    if (INTERVAL_TO_SCALE.hasOwnProperty(intervalKey)) {
        scaleName = INTERVAL_TO_SCALE[intervalKey];
    } else if (MODE_TO_LIVE_SCALE.hasOwnProperty(mode)) {
        scaleName = MODE_TO_LIVE_SCALE[mode];
    } else {
        scaleName = "Major";
    }

    apply_harmony(root, intervals, scaleName, track, rootMidiNote);

    // Tetrachords chord notes may be short triggers rather than sustained
    // gates. In SysEx hold mode, begin a fresh capture epoch but keep the
    // previously published chord active until the new Note On burst arrives.
    if (chordHoldMode === "sysex") {
        begin_latched_chord_capture();
    }
}

function begin_channel_message(statusByte) {
    var type = statusByte & 0xF0;

    runningStatus = statusByte;
    channelData = [];
    channelExpected = (type === 0xC0 || type === 0xD0) ? 1 : 2;
}

function collect_channel_data(dataByte) {
    var type;
    var channel;
    var note;
    var velocity;

    if (runningStatus < 0 || channelExpected === 0) {
        return;
    }

    channelData.push(dataByte & 0x7F);
    if (channelData.length < channelExpected) {
        return;
    }

    type = runningStatus & 0xF0;
    channel = (runningStatus & 0x0F) + 1;

    note = channelData[0] & 0x7F;
    velocity = channelData.length > 1 ? channelData[1] & 0x7F : 0;

    if (type === 0x90 && velocity > 0) {
        runtime_trace(
            "MIDI_NOTE_ON\tch=" + channel + " note=" + note +
            " velocity=" + velocity
        );
    }

    if (
        validNoteCaptureChannel > 0 &&
        channel === validNoteCaptureChannel &&
        type === 0x90 && velocity > 0
    ) {
        capture_valid_field_note(note);
    } else if (
        channel !== validNoteCaptureChannel &&
        (chordCaptureChannel === 0 || chordCaptureChannel === channel) &&
        (type === 0x80 || type === 0x90)
    ) {
        update_chord_note(note, type === 0x90 && velocity > 0);
    }

    channelData = [];
}

function capture_valid_field_note(note) {
    // Every short Note On burst is a complete replacement field. Note Offs
    // are ignored, so an earlier collection can never be merged into a later
    // smaller collection merely because its gates are still held.
    pendingValidNoteOns.push(note | 0);
    runtime_trace(
        "FIELD_NOTE_ON\tnote=" + (note | 0) +
        " pending=" + pendingValidNoteOns.join(",")
    );
    schedule_valid_note_finalize();
    update_valid_note_monitors();
}

function schedule_valid_note_finalize() {
    if (typeof Task === "undefined") {
        return;
    }

    if (validNoteCaptureTask) {
        validNoteCaptureTask.cancel();
    }
    validNoteCaptureTask = new Task(finalize_valid_note_capture, this);
    validNoteCaptureTask.schedule(validNoteCaptureWindowMs);
}

function finalize_valid_note_capture() {
    var candidate = pendingValidNoteOns.slice(0);

    if (validNoteCaptureTask) {
        validNoteCaptureTask.cancel();
        validNoteCaptureTask = null;
    }
    pendingValidNoteOns = [];

    if (candidate.length === 0) {
        update_valid_note_monitors();
        status("No pending MIDI Note Field burst");
        return;
    }

    validMidiNotes = candidate.slice(0);
    validMidiPitchClasses = unique_pitch_classes(validMidiNotes);
    validMidiVersion += 1;
    harmonyGlobal.midiFieldNotes = validMidiNotes.slice(0);
    harmonyGlobal.midiFieldPitchClasses = validMidiPitchClasses.slice(0);
    harmonyGlobal.midiFieldVersion = validMidiVersion;
    runtime_trace(
        "FIELD_COMMIT\tv=" + validMidiVersion +
        " notes=" + validMidiNotes.join(",") +
        " pcs=" + validMidiPitchClasses.join(",")
    );
    publish_active_valid_notes(0);
}

function abandon_pending_valid_notes() {
    if (validNoteCaptureTask) {
        validNoteCaptureTask.cancel();
        validNoteCaptureTask = null;
    }
    pendingValidNoteOns = [];
}

// Test/debug hook: treat the current collection window as elapsed.
function flushvalidnotes() {
    finalize_valid_note_capture();
}

function clear_channel_parser() {
    runningStatus = -1;
    channelData = [];
    channelExpected = 0;
}

function update_chord_note(note, isOn) {
    var key = String(note | 0);
    var count = heldChordNoteCounts.hasOwnProperty(key)
        ? heldChordNoteCounts[key] : 0;

    if (isOn) {
        heldChordNoteCounts[key] = count + 1;
    } else if (chordHoldMode === "sysex") {
        // A latched chord is replaced by the next SysEx + Note On burst, not
        // by the release time of the current Tetrachords chord notes.
        return;
    } else if (count > 1) {
        heldChordNoteCounts[key] = count - 1;
    } else {
        delete heldChordNoteCounts[key];
    }

    schedule_chord_publish();
}

function begin_latched_chord_capture() {
    if (chordPublishTask) {
        chordPublishTask.cancel();
        chordPublishTask = null;
    }

    heldChordNoteCounts = {};
    // Force a new publication even when two consecutive harmony states use
    // the same MIDI voicing or only the reported root changes.
    lastChordKey = "__new_sysex_" + version;
    status("Harmony received — waiting for active-chord Note Ons");
}

function schedule_chord_publish() {
    if (typeof Task === "undefined") {
        publish_active_chord();
        return;
    }

    if (chordPublishTask) {
        chordPublishTask.cancel();
    }

    chordPublishTask = new Task(publish_active_chord, this);
    chordPublishTask.schedule(chordCaptureDelayMs);
}

function publish_active_chord() {
    var notes = active_chord_notes();
    var chordKey = notes.join(",");
    var root = typeof harmonyGlobal.root === "undefined"
        ? 0 : positive_mod(harmonyGlobal.root | 0, 12);
    var pitchClasses;
    var message;

    chordPublishTask = null;
    if (chordKey === lastChordKey) {
        return;
    }

    lastChordKey = chordKey;
    chordVersion += 1;
    pitchClasses = unique_pitch_classes(notes);
    message = ["chord", chordVersion, root].concat(notes);

    harmonyGlobal.chordVersion = chordVersion;
    harmonyGlobal.chordRoot = root;
    harmonyGlobal.activeChordNotes = notes.slice(0);
    harmonyGlobal.activeChordPitchClasses = pitchClasses.slice(0);
    harmonyGlobal.chordMessage = message;

    broadcast_harmony(message);
    outlet(1, message);

    status(
        notes.length > 0
            ? "Active chord: " + midi_note_names(notes) +
              " | root " + NOTE_NAMES[root]
            : "Active chord cleared — waiting for Tetrachords notes"
    );
}

function active_chord_notes() {
    var notes = [];
    var key;

    for (key in heldChordNoteCounts) {
        if (
            heldChordNoteCounts.hasOwnProperty(key) &&
            heldChordNoteCounts[key] > 0
        ) {
            notes.push(parseInt(key, 10));
        }
    }

    notes.sort(function (a, b) { return a - b; });
    return notes;
}

function unique_pitch_classes(notes) {
    var seen = {};
    var result = [];
    var i;
    var pitchClass;

    for (i = 0; i < notes.length; i++) {
        pitchClass = positive_mod(notes[i], 12);
        if (!seen.hasOwnProperty(pitchClass)) {
            seen[pitchClass] = true;
            result.push(pitchClass);
        }
    }

    return result;
}

function clear_active_chord() {
    heldChordNoteCounts = {};
    lastChordKey = "__force__";
    publish_active_chord();
}

function apply_harmony(root, intervals, scaleName, track, rootMidiNote) {
    var intervalKey = intervals.join(",");
    var legalPitchClasses;
    var message;
    var i;

    if (typeof rootMidiNote === "undefined") {
        rootMidiNote = 60 + positive_mod(root, 12);
    }

    if (
        root === lastRoot &&
        rootMidiNote === lastRootMidiNote &&
        scaleName === lastScale &&
        intervalKey === lastIntervalKey
    ) {
        return;
    }

    lastRoot = root;
    lastRootMidiNote = rootMidiNote;
    lastScale = scaleName;
    lastIntervalKey = intervalKey;
    legalPitchClasses = build_legal_pitch_classes(root, intervals);
    derivedValidMidiNotes = [];
    for (i = 0; i < intervals.length; i++) {
        derivedValidMidiNotes.push(
            Math.max(0, Math.min(127, (rootMidiNote | 0) + (intervals[i] | 0)))
        );
    }
    derivedValidPitchClasses = legalPitchClasses.slice(0);
    version += 1;

    // The list format is:
    // harmony <version> <root> <pc1> <pc2> ...
    message = ["harmony", version, root].concat(legalPitchClasses);

    harmonyGlobal.version = version;
    harmonyGlobal.root = root;
    harmonyGlobal.intervals = intervals.slice(0);
    harmonyGlobal.legalPitchClasses = legalPitchClasses.slice(0);
    harmonyGlobal.derivedValidMidiNotes = derivedValidMidiNotes.slice(0);
    harmonyGlobal.derivedValidPitchClasses = derivedValidPitchClasses.slice(0);
    harmonyGlobal.scaleName = scaleName;
    harmonyGlobal.track = track;
    harmonyGlobal.message = message;

    // Immediately send the complete harmony payload to loaded subscribers.
    // The quantizer accepts: harmony <version> <root> <pc1> <pc2> ...
    broadcast_harmony(message);

    // Visible/debug output from the receiver device.
    outlet(1, message);

    publish_active_valid_notes(0);

    if (ready && updateLiveUI) {
        try {
            song.set("scale_mode", 1);
            song.set("root_note", root);
            song.set("scale_name", scaleName);
        } catch (error) {
            status(
                "Harmony broadcast, but Live scale UI update failed: " + error
            );
            return;
        }
    }

    status(
        "Legal notes: " +
        pitch_class_names(legalPitchClasses).join(" ") +
        " | root " + NOTE_NAMES[root] +
        " | Live label " + scaleName
    );
}

function publish_active_valid_notes(force) {
    var activeMidiNotes = validNoteSource === "midi"
        ? validMidiNotes.slice(0) : derivedValidMidiNotes.slice(0);
    var activePitchClasses = validNoteSource === "midi"
        ? validMidiPitchClasses.slice(0) : derivedValidPitchClasses.slice(0);
    var root = typeof harmonyGlobal.root === "undefined"
        ? 0 : positive_mod(harmonyGlobal.root | 0, 12);
    var key = validNoteSource + "|" + root + "|" + activeMidiNotes.join(",") +
        "|" + activePitchClasses.join(",");
    var message;

    if (activeMidiNotes.length === 0 || activePitchClasses.length === 0) {
        update_valid_note_monitors();
        status(
            valid_source_label() +
            " has no note collection yet — previous active collection retained"
        );
        return;
    }

    harmonyGlobal.validNoteSource = validNoteSource;
    harmonyGlobal.activeValidMidiNotes = activeMidiNotes.slice(0);
    harmonyGlobal.activeValidPitchClasses = activePitchClasses.slice(0);

    if (!force && key === lastActiveValidKey) {
        update_valid_note_monitors();
        return;
    }

    lastActiveValidKey = key;
    activeValidVersion += 1;
    message = ["validnotes", activeValidVersion, root, validNoteSource]
        .concat(activePitchClasses);
    runtime_trace(
        "PUBLISH\tv=" + activeValidVersion + " source=" + validNoteSource +
        " root=" + root + " pcs=" + activePitchClasses.join(",")
    );

    harmonyGlobal.activeValidVersion = activeValidVersion;
    harmonyGlobal.validNoteMessage = message;
    broadcast_harmony(message);
    outlet(1, message);
    update_valid_note_monitors();

    if (validNoteSource === "midi" && activeMidiNotes.length === 0) {
        status("MIDI Note Field selected — waiting for a note collection");
    } else {
        status(
            "Active valid notes: " + valid_source_label() + " | " +
            midi_note_names(activeMidiNotes)
        );
    }
}

function update_valid_note_monitors() {
    var midiState;
    var activeNotes = validNoteSource === "midi"
        ? validMidiNotes : derivedValidMidiNotes;

    outlet(
        2,
        "set",
        "SysEx Intervals: " +
        (derivedValidMidiNotes.length > 0
            ? midi_note_names(derivedValidMidiNotes)
            : "waiting")
    );

    if (validNoteCaptureChannel === 0) {
        midiState = "Off";
    } else if (pendingValidNoteOns.length > 0) {
        midiState = "ch " + validNoteCaptureChannel + " • " +
            pendingValidNoteOns.length + " notes pending";
    } else if (validMidiNotes.length > 0) {
        midiState = "ch " + validNoteCaptureChannel + " • " +
            validMidiNotes.length + " notes • " + midi_note_names(validMidiNotes);
    } else {
        midiState = "ch " + validNoteCaptureChannel + " • waiting for notes";
    }
    outlet(3, "set", "MIDI Note Field: " + midiState);

    outlet(
        4,
        "set",
        "Active: " + valid_source_label() + " • " +
        (activeNotes.length > 0 ? midi_note_names(activeNotes) : "no complete set") +
        comparison_label()
    );
}

function valid_source_label() {
    return validNoteSource === "midi" ? "MIDI Note Field" : "SysEx Intervals";
}

function comparison_label() {
    if (derivedValidMidiNotes.length === 0 || validMidiNotes.length === 0) {
        return "";
    }

    return arrays_equal(derivedValidMidiNotes, validMidiNotes)
        ? " • EXACT RAW MATCH"
        : pitch_class_sets_equal(
            derivedValidPitchClasses,
            validMidiPitchClasses
        )
            ? " • SAME PITCH CLASSES"
            : " • DIFFERENT";
}

function pitch_class_sets_equal(left, right) {
    var leftSorted = left.slice(0).sort(function (a, b) { return a - b; });
    var rightSorted = right.slice(0).sort(function (a, b) { return a - b; });
    return arrays_equal(leftSorted, rightSorted);
}

function arrays_equal(left, right) {
    var i;
    if (left.length !== right.length) {
        return false;
    }
    for (i = 0; i < left.length; i++) {
        if ((left[i] | 0) !== (right[i] | 0)) {
            return false;
        }
    }
    return true;
}

function broadcast_harmony(message) {
    // `messnamed` is Max's variadic named-message API. Sending through the
    // Global object only transmits its first message atom, which left the
    // quantizer stuck on the harmony state it saw when it loaded.
    messnamed.apply(null, [BUS_NAME].concat(message));
}

function build_legal_pitch_classes(root, intervals) {
    var seen = {};
    var result = [];
    var i;
    var pitchClass;

    for (i = 0; i < intervals.length; i++) {
        pitchClass = positive_mod(root + (intervals[i] | 0), 12);

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

function pitch_class_names(pitchClasses) {
    var result = [];
    var i;

    for (i = 0; i < pitchClasses.length; i++) {
        result.push(NOTE_NAMES[pitchClasses[i]]);
    }

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

function positive_mod(value, modulus) {
    return ((value % modulus) + modulus) % modulus;
}

function status(text) {
    outlet(0, "set", text);
}

function reset_runtime_trace(header) {
    var file;
    traceLineCount = 0;
    if (typeof File === "undefined") {
        return;
    }
    file = new File(TRACE_PATH, "write");
    if (file.isopen) {
        file.eof = 0;
        file.position = 0;
        file.writeline(header);
        file.close();
    }
}

function runtime_trace(line) {
    var file;
    if (typeof File === "undefined" || traceLineCount >= 1000) {
        return;
    }
    file = new File(TRACE_PATH, "readwrite");
    if (!file.isopen) {
        return;
    }
    file.position = file.eof;
    file.writeline(String(new Date().getTime()) + "\t" + line);
    file.close();
    traceLineCount += 1;
}
