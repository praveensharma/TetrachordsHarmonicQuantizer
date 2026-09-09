// harmonic_quantizer.js
//
// Inlet 0: raw MIDI bytes from [midiin]
// Inlet 1: harmony messages from [receive tetrachords_harmony_bus_v1]
// Outlet 0: quantized/raw MIDI bytes to [midiout]
// Outlet 1: status messages
// Outlet 2: shared ensemble assigned-pitch monitor
//
// Every incoming MIDI note is quantized, regardless of channel. All non-note
// channel messages are preserved. Note Offs use the exact pitch chosen for
// their Note Ons. An optional Hold Last Pitch behavior retains one quantized
// output per channel for gestural pitch sources with separate articulation.

autowatch = 1;
inlets = 2;
outlets = 3;

var GLOBAL_NAME = "tetrachords_harmony_v1";
var harmonyGlobal = new Global(GLOBAL_NAME);
// Optional read-only UI taps: failures must never interrupt the MIDI path.
function visual_message(selector, payload) {
    try {
        ['monitor-compact','monitor-detail'].forEach(function(name){
            var display=this.patcher.getnamed(name);
            if(display){display.message(selector,payload);}
        },this);
    } catch(e) {}
}
function visual_note(input,output,channel,reason) {
    try {
        ['monitor-compact','monitor-detail'].forEach(function(name){
            var display=this.patcher.getnamed(name);
            if(display){
                display.message('active',JSON.stringify({pcs:legalPitchClasses,source:source_description()}));
                display.message('event',input,output,channel,reason||'');
            }
        },this);
    } catch(e) {}
}
var NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

var legalPitchClasses = [];
var previousLegalPitchClasses = [];
var activeValidMidiNotes = [];
var harmonyVersion = -1;
var lastSeenHarmonyVersion = -1;
var lastSeenActiveValidVersion = -1;
var hasActiveValidProtocol = 0;
var activeValidSource = "sysex";
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
var quantizerMode = "harmonizer";
var harmonizerMap = "pitchclass";
var melodyState = {};
var voiceState = {};
var lastVoiceDecision = {};
var continuityAmount = 60;
var registerMode = "limited";
var registerLow = 24;
var registerHigh = 48;
var rootGravity = 0;
// Follow Gate preserves the incoming Note On/Off lifecycle. Hold Last Pitch is
// intended for gestural pitch sources whose articulation comes from elsewhere:
// each channel keeps one output note active until a replacement Note On arrives.
var inputBehavior = "follow";
var inputStabilityMs = 20;
var heldNotes = {};
var pendingStableNotes = {};
var inputStabilityTask = null;

// Clear menu labels map to the original internal identifiers so the DSP logic
// remains stable while the presentation names describe the musical behavior.
var MODE_ALIASES = {
    "chord-nearest": "chordnearest",
    "scale-nearest": "nearest",
    "chord-map": "harmonizer",
    "scale-contour": "melody",
    "stateful-nearest": "statefulnearest",
    "scale-smooth": "statefulnearest",
    "voicelead": "statefulnearest",
    "scale-up": "up",
    "scale-down": "down",
    "scale-map": "chromatic"
};

var MODE_MENU_VALUES = [
    "chordnearest", "nearest", "harmonizer", "melody",
    "statefulnearest", "up", "down", "chromatic"
];
var CHORD_MAP_MENU_VALUES = ["pitchclass", "voicing"];
var TIMING_MENU_VALUES = ["immediate", "nextnote", "nextbar"];
var GRAVITY_MENU_VALUES = [0, 1, 2];
var REGISTER_MENU_VALUES = ["limited", "free"];
var INPUT_BEHAVIOR_MENU_VALUES = ["follow", "hold"];

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
var TRACE_PATH = "/private/tmp/harmonic_quantizer_trace.tsv";
var traceLineCount = 0;
var traceInstance = Math.floor(Math.random() * 0x7fffffff).toString(36);

// Store JSON, rather than cross-context JS objects, in Max Global. Each device
// owns one ensemble part, regardless of the incoming or outgoing MIDI channel.
var ensembleGlobal = new Global("tetrachords_ensemble_v1");
var ensembleGroup = 0;
var ensemblePart = 1;
var separationAmount = 0;
var ensembleEpoch = -1;
var ensembleQueue = [];
var ensembleTask = null;
var ensembleSerial = 0;
var ensembleDelivering = false;
var ensembleMonitorText = "";
var ENSEMBLE_WINDOW_MS = 4;

function ensemble_read() {
    try { return JSON.parse(ensembleGlobal.snapshot || "{}"); }
    catch (error) { return {}; }
}

function ensemble_write(state) {
    ensembleGlobal.snapshot = JSON.stringify(state);
}

function ensemble_group(state) {
    var key = String(ensembleGroup);
    if (!state[key]) {
        state[key] = {epoch: 0, members: {}, pending: [], results: {}, deadline: 0};
    }
    return state[key];
}

function ensemble_refresh() {
    // Display indices are separate from persisted group/part numeric values.
    try {
        var groupMenu=this.patcher.getnamed('ensemble_group_selector');
        var voiceMenu=this.patcher.getnamed('ensemble_part_selector');
        if(groupMenu){groupMenu.message('set',ensembleGroup);}
        if(voiceMenu){voiceMenu.message('set',ensemblePart-1);}
    } catch(e) {}
    if (!ensembleGroup) {
        ensemble_monitor("Independent — no ensemble coordination");
        return;
    }
    var state = ensemble_read();
    var group = ensemble_group(state);
    var now = new Date().getTime();
    var id;
    for (id in group.members) {
        if (now - group.members[id].seen > 2000) {
            delete group.members[id];
            delete group.results[id];
            group.pending = group.pending.filter(function (job) { return job.owner !== id; });
        }
    }
    if (ensembleEpoch !== group.epoch) {
        voiceState = {};
        melodyState = {};
        lastVoiceDecision = {};
        ensembleEpoch = group.epoch;
    }
    var member = group.members[traceInstance] || {part: ensemblePart, note: null};
    member.seen = now;
    member.part = ensemblePart;
    group.members[traceInstance] = member;
    ensemble_write(state);
    var parts = [[], [], [], []];
    for (id in group.members) {
        member = group.members[id];
        parts[member.part - 1].push(member.note);
    }
    var labels = [];
    var notes = [];
    for (var i = 0; i < 4; i++) {
        var note = parts[i].length === 1 ? parts[i][0] : null;
        labels.push("Voice " + "ABCD".charAt(i) + ": " + (parts[i].length > 1 ? "CONFLICT" :
            note === null ? "—" : midi_note_name(note) + " (" + note + ")"));
        if (note !== null) { notes.push(note); }
    }
    var duplicate = notes.some(function (note, index) { return notes.indexOf(note) !== index; });
    ensemble_monitor("Ensemble " + "ABCDEFGH".charAt(ensembleGroup-1) + " | " + labels.join("  ") +
        (duplicate ? " | UNISON" : "") + " | assigned pitches");
}

function ensemble_monitor(text) {
    if (text !== ensembleMonitorText) {
        ensembleMonitorText = text;
        outlet(2, "set", text);
    }
}

function ensemble_release() {
    var state = ensemble_read();
    if (ensembleGroup && state[String(ensembleGroup)]) {
        var group = state[String(ensembleGroup)];
        delete group.members[traceInstance];
        delete group.results[traceInstance];
        group.pending = group.pending.filter(function (job) { return job.owner !== traceInstance; });
        ensemble_write(state);
    }
}

function ensemble(value) {
    ensemble_flush(true);
    ensemble_release();
    ensembleGroup = clamp(value | 0, 0, 8);
    ensembleEpoch = -1;
    ensemble_refresh();
}

function part(value) {
    ensemble_flush(true);
    ensemble_release();
    ensemblePart = clamp(value | 0, 1, 4);
    ensemble_refresh();
}

function separation(value) { separationAmount = clamp(value | 0, 0, 100); }

function resetensemble() {
    if (!ensembleGroup) { resetvoices(); return; }
    // Finish pending Note Ons before clearing memory; their Note Off mappings
    // survive the reset. Other members adopt the new epoch before their next note.
    ensemble_flush(true);
    var state = ensemble_read();
    var group = ensemble_group(state);
    ensemble_resolve(group);
    group.epoch++;
    for (var id in group.members) { group.members[id].note = null; }
    ensemble_write(state);
    ensemble_refresh();
}

function ensemble_options(base, input) {
    var pcs = (quantizerMode === "harmonizer" || quantizerMode === "chordnearest") &&
        activeChordNotes.length ? active_chord_pitch_classes() : legalPitchClasses;
    var result = [{note: base, cost: 0}];
    if (!pcs.length || !separationAmount) { return result; }
    // A bounded soft preference: never leap more than six semitones simply to
    // avoid another part. Octave doubling remains allowed in this first version.
    for (var n = Math.max(0, base - 6); n <= Math.min(127, base + 6); n++) {
        if (n === base || pcs.indexOf(n % 12) < 0) { continue; }
        if (registerMode === "limited" && (n > registerHigh || n < Math.min(base, registerLow))) { continue; }
        if (quantizerMode === "up" && n < input) { continue; }
        if (quantizerMode === "down" && n > input) { continue; }
        result.push({note: n, cost: (n - base) * (n - base)});
    }
    return result;
}

function ensemble_enqueue(channel, input, velocity, base) {
    var state = ensemble_read();
    var group = ensemble_group(state);
    var id = traceInstance + ":" + (++ensembleSerial);
    group.pending.push({id: id, owner: traceInstance, part: ensemblePart,
        options: ensemble_options(base, input), separation: separationAmount,
        upward: preferUpwardTie, serial: ensembleSerial});
    if (!group.deadline) { group.deadline = new Date().getTime() + ENSEMBLE_WINDOW_MS; }
    ensemble_write(state);
    ensembleQueue.push({id: id, channel: channel, input: input, velocity: velocity,
        due: new Date().getTime() + ENSEMBLE_WINDOW_MS, epoch: group.epoch});
    if (typeof Task !== "undefined") {
        if (!ensembleTask) { ensembleTask = new Task(ensemble_tick, this); }
        ensembleTask.schedule(1);
    } else { ensemble_flush(true); }
}

function ensemble_resolve(group) {
    var jobs = group.pending;
    if (!jobs.length) { return; }
    var counts = {};
    var occupied = {};
    var id;
    for (id in group.members) {
        var member = group.members[id];
        counts[member.part] = (counts[member.part] || 0) + 1;
        occupied[id] = member.note;
    }
    // Replace stale assignments for all parts participating in this batch.
    for (var i = 0; i < jobs.length; i++) { delete occupied[jobs[i].owner]; }
    jobs.sort(function (a, b) { return a.part - b.part || a.serial - b.serial; });
    for (i = 0; i < jobs.length; i++) {
        var job = jobs[i];
        var best = job.options[0].note;
        var bestCost = Infinity;
        for (var j = 0; j < job.options.length; j++) {
            var option = job.options[j];
            var cost = option.cost;
            if (counts[job.part] === 1) {
                for (id in occupied) {
                    if (id !== job.owner && occupied[id] === option.note) { cost += 36 * job.separation / 100; }
                }
            } else if (j > 0) { continue; } // Duplicate part IDs: transparent, visible conflict.
            if (cost < bestCost || (cost === bestCost &&
                (job.upward ? option.note > best : option.note < best))) {
                best = option.note;
                bestCost = cost;
            }
        }
        if (!group.results[job.owner]) { group.results[job.owner] = {}; }
        group.results[job.owner][job.id] = best;
        occupied[job.owner] = best;
        if (group.members[job.owner]) { group.members[job.owner].note = best; }
    }
    group.pending = [];
    group.deadline = 0;
}

function ensemble_tick() { ensemble_flush(false); }

function ensemble_flush(force) {
    if (!ensembleGroup || !ensembleQueue.length) { return; }
    ensemble_refresh();
    var state = ensemble_read();
    var group = ensemble_group(state);
    if (force || new Date().getTime() >= group.deadline) { ensemble_resolve(group); }
    var ready = group.results[traceInstance] || {};
    var deliveries = [];
    while (ensembleQueue.length) {
        var event = ensembleQueue[0];
        if (event.id && !ready.hasOwnProperty(event.id)) { break; }
        if (!force && new Date().getTime() < event.due) { break; }
        ensembleQueue.shift();
        if (event.id) { event.output = ready[event.id]; delete ready[event.id]; }
        deliveries.push(event);
    }
    group.results[traceInstance] = ready;
    ensemble_write(state);
    ensembleDelivering = true;
    for (var i = 0; i < deliveries.length; i++) {
        var item = deliveries[i];
        if (item.id) { deliver_note_on(item.channel, item.input, item.velocity, item.output, item.epoch === group.epoch); }
        else { handle_note_off(item.channel, item.input, item.velocity); }
    }
    ensembleDelivering = false;
    ensemble_refresh();
    if (ensembleQueue.length && ensembleTask) { ensembleTask.schedule(1); }
}

function notifydeleted() {
    if (ensembleTask) { ensembleTask.cancel(); }
    if (harmonyPollTask) { harmonyPollTask.cancel(); }
    if (inputStabilityTask) { inputStabilityTask.cancel(); }
    ensemble_release();
}

function loadbang() {
    init();
}

function init() {
    reset_runtime_trace("time\tinstance\tevent\tdetails");
    restore_controls_from_patcher();
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

// Max preserves parameter values in the Live Set, but recompiling an
// autowatched [js] object recreates this JavaScript context with the defaults
// above. The visible controls do not necessarily emit their values again, so
// explicitly adopt the values that Ableton is showing. Without this step the
// menu can say Scale Nearest while the engine is actually running Chord Map.
function restore_controls_from_patcher() {
    var value;

    value = patcher_control_value("quantizer_mode");
    quantizerMode = menu_value(value, MODE_MENU_VALUES, MODE_ALIASES, quantizerMode);

    value = patcher_control_value("chord_map");
    harmonizerMap = menu_value(value, CHORD_MAP_MENU_VALUES, null, harmonizerMap);

    value = patcher_control_value("harmony_change");
    harmonyTiming = menu_value(value, TIMING_MENU_VALUES, null, harmonyTiming);

    value = patcher_control_value("root_gravity");
    rootGravity = menu_value(value, GRAVITY_MENU_VALUES, null, rootGravity) | 0;

    value = patcher_control_value("continuity");
    if (value !== null) {
        continuityAmount = clamp(value | 0, 0, 100);
    }
    value = patcher_control_value("ensemble_group");
    if (value !== null) { ensembleGroup = clamp(value | 0, 0, 8); }
    value = patcher_control_value("ensemble_part");
    if (value !== null) { ensemblePart = clamp(value | 0, 1, 4); }
    value = patcher_control_value("ensemble_separation");
    if (value !== null) { separationAmount = clamp(value | 0, 0, 100); }

    value = patcher_control_value("register_mode");
    registerMode = menu_value(value, REGISTER_MENU_VALUES, null, registerMode);

    value = patcher_control_value("register_low");
    if (value !== null) {
        registerLow = clamp(value | 0, 0, 127);
    }

    value = patcher_control_value("register_high");
    if (value !== null) {
        registerHigh = clamp(value | 0, 0, 127);
    }

    value = patcher_control_value("input_behavior");
    inputBehavior = menu_value(
        value,
        INPUT_BEHAVIOR_MENU_VALUES,
        {
            "follow-gate": "follow",
            "follow gate": "follow",
            "hold-last-pitch": "hold",
            "hold last pitch": "hold"
        },
        inputBehavior
    );

    value = patcher_control_value("input_stability");
    if (value !== null) {
        inputStabilityMs = clamp(value | 0, 0, 100);
    }

    if (registerLow > registerHigh) {
        registerHigh = registerLow;
    }

    runtime_trace(
        "RESTORE_CONTROLS\tmode=" + quantizerMode +
        " map=" + harmonizerMap +
        " timing=" + harmonyTiming +
        " gravity=" + rootGravity +
        " continuity=" + continuityAmount +
        " register=" + registerMode + "/" + registerLow + "-" + registerHigh +
        " input=" + inputBehavior + "/" + inputStabilityMs + "ms"
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

function menu_value(value, orderedValues, aliases, fallback) {
    var normalized;

    if (value === null) {
        return fallback;
    }
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

function poll_harmony_global() {
    ensemble_refresh();
    var globalVersion = harmonyGlobal.version;
    var globalChordVersion = harmonyGlobal.chordVersion;
    var globalActiveValidVersion = harmonyGlobal.activeValidVersion;

    if (
        typeof globalActiveValidVersion !== "undefined" &&
        (globalActiveValidVersion | 0) !== lastSeenActiveValidVersion
    ) {
        sync_valid_notes_from_global(0);
    }

    if (
        typeof globalActiveValidVersion === "undefined" &&
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
    } else if (messagename === "validnotes") {
        apply_valid_notes(arrayfromargs(arguments));
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

function validnotes() {
    if (inlet !== 1) {
        return;
    }

    apply_valid_notes(arrayfromargs(arguments));
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

    // New receivers publish a centralized validnotes snapshot immediately
    // after this diagnostic harmony message. Once that protocol is visible,
    // the quantizer no longer treats the derived set as independently active.
    if (!hasActiveValidProtocol) {
        receive_harmony(version, root, pcs, 0, "sysex");
    }
}

function apply_valid_notes(values) {
    var version;
    var root;
    var source;
    var pcs;

    // Payload: version, root, source, pc1, pc2, ... . An empty pitch-class
    // list is meaningful: MIDI Note Field is selected but no set exists.
    if (values.length < 3) {
        return;
    }

    version = values[0] | 0;
    root = positive_mod(values[1] | 0, 12);
    source = String(values[2]);
    pcs = normalize_pitch_classes(values.slice(3));
    runtime_trace(
        "RX_VALID\t" + version + "/" + source + "\troot=" + root +
        " pcs=" + pcs.join(",")
    );
    hasActiveValidProtocol = 1;
    sync_active_valid_midi_notes();
    receive_harmony(version, root, pcs, 0, source);
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
    if (typeof harmonyGlobal.activeValidVersion !== "undefined") {
        sync_valid_notes_from_global(forceImmediate);
    } else {
        sync_legacy_harmony_from_global(forceImmediate);
    }

    sync_chord_from_global();
}

function sync_legacy_harmony_from_global(forceImmediate) {
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
            forceImmediate ? 1 : 0,
            "sysex"
        );
    }
}

function sync_valid_notes_from_global(forceImmediate) {
    var globalVersion = harmonyGlobal.activeValidVersion;
    var globalRoot = harmonyGlobal.root;
    var globalSource = harmonyGlobal.validNoteSource;
    var globalPcs = harmonyGlobal.activeValidPitchClasses;

    if (typeof globalVersion === "undefined") {
        return;
    }

    hasActiveValidProtocol = 1;
    sync_active_valid_midi_notes();
    receive_harmony(
        globalVersion | 0,
        positive_mod(typeof globalRoot === "undefined" ? 0 : globalRoot | 0, 12),
        normalize_pitch_classes(globalPcs || []),
        forceImmediate ? 1 : 0,
        typeof globalSource === "undefined" ? "sysex" : String(globalSource)
    );
}

function sync_active_valid_midi_notes() {
    activeValidMidiNotes = normalize_midi_notes(
        harmonyGlobal.activeValidMidiNotes || []
    );
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

function receive_harmony(version, root, pcs, forceImmediate, source) {
    var isActiveProtocol = hasActiveValidProtocol;
    var lastVersion = isActiveProtocol
        ? lastSeenActiveValidVersion : lastSeenHarmonyVersion;

    if (version === lastVersion && !forceImmediate) {
        runtime_trace(
            "IGNORE_DUPLICATE\t" + version + "/" + source +
            "\tpcs=" + pcs.join(",")
        );
        return;
    }

    if (isActiveProtocol) {
        lastSeenActiveValidVersion = version;
    } else {
        lastSeenHarmonyVersion = version;
    }
    source = source || "sysex";

    if (
        forceImmediate ||
        legalPitchClasses.length === 0 ||
        pcs.length === 0 ||
        harmonyTiming === "immediate"
    ) {
        activate_harmony(version, root, pcs, source);
        return;
    }

    pendingHarmony = {
        version: version,
        root: root,
        pcs: pcs.slice(0),
        source: source
    };
    runtime_trace(
        "QUEUE\t" + version + "/" + source + "\tpcs=" + pcs.join(",")
    );
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

function activate_harmony(version, root, pcs, source) {
    previousLegalPitchClasses = legalPitchClasses.slice(0);
    harmonyVersion = version;
    harmonyRoot = root;
    activeValidSource = source || "sysex";
    legalPitchClasses = pcs.slice(0);
    pendingHarmony = null;
    visual_message('active',JSON.stringify({pcs:legalPitchClasses,source:source_description()}));
    runtime_trace(
        "ACTIVE\t" + version + "/" + activeValidSource +
        "\troot=" + harmonyRoot + " pcs=" + legalPitchClasses.join(",")
    );
    status(
        source_description() + " v" + harmonyVersion +
        " | root " + NOTE_NAMES[harmonyRoot] +
        " | legal: " +
        (legalPitchClasses.length > 0
            ? pitch_class_names(legalPitchClasses).join(" ")
            : "waiting for complete set") +
        " | " + mode_description()
    );
}

function apply_pending_harmony() {
    var harmony;

    if (!pendingHarmony) {
        return;
    }

    harmony = pendingHarmony;
    activate_harmony(
        harmony.version,
        harmony.root,
        harmony.pcs,
        harmony.source
    );
}

function source_description() {
    return activeValidSource === "midi" ? "MIDI Note Field" : "SysEx Intervals";
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
        value === "statefulnearest" ||
        value === "up" ||
        value === "down"
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

function statefulnearest() {
    mode("statefulnearest");
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

function continuity(value) {
    continuityAmount = clamp(value | 0, 0, 100);
    status("Continuity: " + continuityAmount + "%");
}

function inputbehavior(value) {
    var normalized = typeof value === "number"
        ? INPUT_BEHAVIOR_MENU_VALUES[value | 0]
        : String(value).toLowerCase();

    if (normalized === "follow-gate" || normalized === "follow gate") {
        normalized = "follow";
    } else if (
        normalized === "hold-last-pitch" ||
        normalized === "hold last pitch"
    ) {
        normalized = "hold";
    }

    if (INPUT_BEHAVIOR_MENU_VALUES.indexOf(normalized) < 0) {
        return;
    }

    if (normalized !== inputBehavior) {
        ensemble_flush(true);
        cancel_pending_stable_notes();
        release_all_managed_notes();
        inputBehavior = normalized;
    }

    status(input_behavior_description());
}

function stability(value) {
    inputStabilityMs = clamp(value | 0, 0, 100);
    if (inputStabilityMs === 0) {
        input_stability_flush(true);
    }
    status(input_behavior_description());
}

function input_behavior_description() {
    if (inputBehavior === "hold") {
        return "Input: Hold Last Pitch" +
            (inputStabilityMs > 0
                ? " | settle " + inputStabilityMs + " ms"
                : " | immediate");
    }
    return "Input: Follow Gate | source Note Offs preserved";
}

function registermode(value) {
    if (value !== "limited" && value !== "free") {
        return;
    }
    registerMode = value;
    status(
        value === "free"
            ? "Register: Free — preserve source octave"
            : "Register: Limited — " + registerLow + " to " + registerHigh
    );
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
    var nextEnabled = (v | 0) ? 0 : 1;
    ensemble_flush(true);
    if (enabled && !nextEnabled) {
        cancel_pending_stable_notes();
        release_all_managed_notes();
    }
    enabled = nextEnabled;
    status(enabled ? "Quantizer enabled" : "Quantizer bypassed");
}

function cancel_pending_stable_notes() {
    pendingStableNotes = {};
    if (inputStabilityTask) {
        inputStabilityTask.cancel();
    }
}

function release_output_reference(channel, outputNote, velocity) {
    var outputKey = note_key(channel, outputNote);

    if (
        outputNoteRefCounts.hasOwnProperty(outputKey) &&
        outputNoteRefCounts[outputKey] > 1
    ) {
        outputNoteRefCounts[outputKey] -= 1;
        return;
    }

    delete outputNoteRefCounts[outputKey];
    send_midi3(0x80 | ((channel - 1) & 0x0F), outputNote, velocity || 0);
}

function remove_active_mapping(channel, inputNote, outputNote) {
    var sourceKey = note_key(channel, inputNote);
    var mappings = activeNoteMappings[sourceKey];
    var index;

    if (!mappings || !mappings.length) {
        return;
    }

    index = mappings.indexOf(outputNote);
    if (index >= 0) {
        mappings.splice(index, 1);
    }
    if (mappings.length === 0) {
        delete activeNoteMappings[sourceKey];
    }
}

function release_held_note(channel) {
    var held = heldNotes[channel];

    if (!held) {
        return;
    }

    remove_active_mapping(channel, held.input, held.output);
    release_output_reference(channel, held.output, 0);
    delete heldNotes[channel];
}

function release_all_managed_notes() {
    var key;
    var parts;
    var channel;
    var note;
    var count;
    var i;

    for (key in outputNoteRefCounts) {
        if (!outputNoteRefCounts.hasOwnProperty(key)) {
            continue;
        }
        parts = key.split(":");
        channel = parseInt(parts[0], 10);
        note = parseInt(parts[1], 10);
        count = Math.max(1, outputNoteRefCounts[key] | 0);
        for (i = 0; i < count; i++) {
            send_midi3(0x80 | ((channel - 1) & 0x0F), note, 0);
        }
    }

    activeNoteMappings = {};
    outputNoteRefCounts = {};
    heldNotes = {};
}

function panic() {
    if (ensembleTask) { ensembleTask.cancel(); }
    ensembleQueue = [];
    ensemble_release();
    cancel_pending_stable_notes();

    // Send explicit Note Offs before discarding the mapping. Some hardware,
    // including older MIDI implementations, does not act on CC 123 reliably.
    release_all_managed_notes();
    melodyState = {};
    voiceState = {};
    lastVoiceDecision = {};

    for (var channel = 1; channel <= 16; channel++) {
        send_midi3(0xB0 | ((channel - 1) & 0x0F), 123, 0);
        // Center pitch bend (14-bit value 8192: LSB 0, MSB 64).
        send_midi3(0xE0 | ((channel - 1) & 0x0F), 0, 64);
    }

    status("Explicit Note Offs, All Notes Off and centered pitch bend sent");
}

function resetvoices() {
    ensemble_flush(true);
    voiceState = {};
    lastVoiceDecision = {};
    status("Voice memory reset — next notes use Scale Nearest");
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
        if(type===0x90 && data2>0){visual_note(data1,data1,channel,!enabled?'Bypassed':'No valid set — passthrough');}
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
    if (inputBehavior === "hold" && inputStabilityMs > 0) {
        if (
            pendingStableNotes[channel] &&
            pendingStableNotes[channel].input === inputNote
        ) {
            // Repeated reports of the same pitch confirm stability rather than
            // restarting the timer forever.
            pendingStableNotes[channel].velocity = velocity;
        } else {
            pendingStableNotes[channel] = {
                channel: channel,
                input: inputNote,
                velocity: velocity,
                due: new Date().getTime() + inputStabilityMs
            };
        }
        runtime_trace(
            "SETTLE_QUEUE\tch=" + channel + " note=" + inputNote +
            " delay=" + inputStabilityMs
        );
        if (typeof Task !== "undefined") {
            if (!inputStabilityTask) {
                inputStabilityTask = new Task(input_stability_tick, this);
            }
            inputStabilityTask.schedule(1);
        }
        return;
    }

    process_note_on_now(channel, inputNote, velocity);
}

function input_stability_tick() {
    input_stability_flush(false);
}

function input_stability_flush(force) {
    var now = new Date().getTime();
    var ready = [];
    var channel;

    for (channel in pendingStableNotes) {
        if (!pendingStableNotes.hasOwnProperty(channel)) {
            continue;
        }
        if (force || now >= pendingStableNotes[channel].due) {
            ready.push(pendingStableNotes[channel]);
            delete pendingStableNotes[channel];
        }
    }

    ready.sort(function (a, b) { return a.channel - b.channel; });
    for (var i = 0; i < ready.length; i++) {
        process_note_on_now(
            ready[i].channel,
            ready[i].input,
            ready[i].velocity
        );
    }

    if (Object.keys(pendingStableNotes).length && inputStabilityTask) {
        inputStabilityTask.schedule(1);
    }
}

function process_note_on_now(channel, inputNote, velocity) {
    var outputNote;
    if (ensembleGroup) { ensemble_refresh(); }

    if (harmonyTiming === "nextnote") {
        apply_pending_harmony();
    }

    runtime_trace(
        "INPUT_NOTE\tch=" + channel + " note=" + inputNote +
        " velocity=" + velocity + " mode=" + quantizerMode
    );
    outputNote = quantize_note(inputNote, channel, velocity);
    if (ensembleGroup) {
        ensemble_enqueue(channel, inputNote, velocity, outputNote);
        return;
    }
    deliver_note_on(channel, inputNote, velocity, outputNote);
}

function deliver_note_on(channel, inputNote, velocity, outputNote, remember) {
    var previousVoice = voiceState.hasOwnProperty(channel)
        ? copy_voice_state(voiceState[channel]) : null;
    var sourceKey = note_key(channel, inputNote);
    var outputKey;

    if (inputBehavior === "hold") {
        release_held_note(channel);
    }

    outputKey = note_key(channel, outputNote);

    if (!activeNoteMappings.hasOwnProperty(sourceKey)) {
        activeNoteMappings[sourceKey] = [];
    }

    activeNoteMappings[sourceKey].push(outputNote);

    if (!outputNoteRefCounts.hasOwnProperty(outputKey)) {
        outputNoteRefCounts[outputKey] = 0;
    }

    outputNoteRefCounts[outputKey] += 1;
    if (remember !== false) { commit_voice_state(channel, inputNote, outputNote, previousVoice); }
    runtime_trace(
        "NOTE\t" + harmonyVersion + "/" + activeValidSource +
        "\tch=" + channel + " in=" + inputNote + " out=" + outputNote +
        " mode=" + quantizerMode + " pcs=" + legalPitchClasses.join(",")
    );
    if (quantizerMode === "statefulnearest") {
        status(stateful_voice_status(channel));
    } else {
        status(
            "TRACE ch" + channel + " " + midi_note_name(inputNote) +
            " → " + midi_note_name(outputNote) + " | " + source_description() +
            " v" + harmonyVersion + " | allowed " +
            pitch_class_names(legalPitchClasses).join(" ")
        );
    }
    send_midi3(0x90 | ((channel - 1) & 0x0F), outputNote, velocity);
    if (inputBehavior === "hold") {
        heldNotes[channel] = {input: inputNote, output: outputNote};
        status(
            "Holding " + midi_note_name(outputNote) +
            " from " + midi_note_name(inputNote) +
            " | ch " + channel +
            (inputStabilityMs > 0
                ? " | settle " + inputStabilityMs + " ms"
                : " | immediate")
        );
    }
    visual_note(
        inputNote,
        outputNote,
        channel,
        inputBehavior === "hold" ? "Hold Last Pitch" : mode_description()
    );
}

function copy_voice_state(state) {
    if (!state) {
        return null;
    }
    return {
        input: state.input,
        output: state.output,
        version: state.version
    };
}

function commit_voice_state(channel, inputNote, outputNote, previousVoice) {
    var harmonyChanged = previousVoice &&
        previousVoice.version !== harmonyVersion;
    var common = harmonyChanged &&
        is_legal_note(previousVoice.output) &&
        previousVoice.output === outputNote;
    var movement = previousVoice ? outputNote - previousVoice.output : 0;

    voiceState[channel] = {
        input: inputNote,
        output: outputNote,
        version: harmonyVersion
    };
    lastVoiceDecision[channel] = {
        input: inputNote,
        previous: previousVoice ? previousVoice.output : null,
        output: outputNote,
        movement: movement,
        common: common ? 1 : 0,
        version: harmonyVersion
    };

    runtime_trace(
        "VOICE\tch=" + channel +
        " in=" + inputNote +
        " prev=" + (previousVoice ? previousVoice.output : "none") +
        " out=" + outputNote +
        " move=" + signed_number(movement) +
        " continuity=" + continuityAmount +
        (common ? " COMMON" : "")
    );
}

function stateful_voice_status(channel) {
    var decision = lastVoiceDecision[channel];

    if (!decision) {
        return "Stateful Nearest waiting for voice " + channel;
    }
    return "V" + channel + " IN " + midi_note_name(decision.input) +
        " PREV " + (decision.previous === null
            ? "—" : midi_note_name(decision.previous)) +
        " OUT " + midi_note_name(decision.output) +
        " MOVE " + signed_number(decision.movement) +
        (decision.common ? " [COMMON]" : "") +
        " | Continuity " + continuityAmount + "% | v" + decision.version;
}

function signed_number(value) {
    return value > 0 ? "+" + value : String(value);
}

function midi_note_name(note) {
    var value = clamp(note | 0, 0, 127);
    return NOTE_NAMES[positive_mod(value, 12)] +
        (Math.floor(value / 12) - 1);
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
    file.writeline(
        String(new Date().getTime()) + "\t" + traceInstance + "\t" + line
    );
    file.close();
    traceLineCount += 1;
}

function handle_note_off(channel, inputNote, velocity) {
    if (inputBehavior === "hold") {
        runtime_trace(
            "HOLD_IGNORE_OFF\tch=" + channel + " note=" + inputNote
        );
        return;
    }

    if (!ensembleDelivering && ensembleGroup) {
        ensembleQueue.push({channel: channel, input: inputNote, velocity: velocity,
            due: new Date().getTime() + ENSEMBLE_WINDOW_MS});
        if (typeof Task !== "undefined") {
            if (!ensembleTask) { ensembleTask = new Task(ensemble_tick, this); }
            ensembleTask.schedule(1);
        } else { ensemble_flush(true); }
        return;
    }
    var sourceKey = note_key(channel, inputNote);
    var outputNote;

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

    release_output_reference(channel, outputNote, velocity);
}

function quantize_note(inputNote, channel, velocity) {
    var note = clamp(inputNote | 0, 0, 127);
    var result;
    var statefulHadPrior = quantizerMode === "statefulnearest" &&
        voiceState.hasOwnProperty(channel || 1);

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
    } else if (quantizerMode === "statefulnearest") {
        result = stateful_nearest_quantize(note, channel || 1);
    } else if (quantizerMode === "up") {
        result = directional_quantize(note, 1);
    } else if (quantizerMode === "down") {
        result = directional_quantize(note, -1);
    } else {
        result = nearest_quantize(note);
    }

    if (
        quantizerMode !== "harmonizer" &&
        quantizerMode !== "chordnearest"
    ) {
        result = apply_root_gravity(result, velocity || 0);
    }

    // Free register quantizes the musical pitch target without any octave
    // folding, Low/High window, or safety ceiling. The source sequencer owns
    // register; this device only decides which notes belong to the harmony.
    if (registerMode === "free") {
        return clamp(result, 0, 127);
    }

    // Nearest modes normally preserve the incoming register. The displayed
    // High value is nevertheless a hard safety ceiling: a stray high source
    // note must never leave a hardware oscillator parked at an extreme pitch.
    // Search against that ceiling instead of quantizing above it and then
    // octave-folding the result, which can create a surprising one-octave jump
    // at the top of an otherwise stepwise melody. Low notes stay transparent.
    if (
        quantizerMode === "nearest" ||
        quantizerMode === "chordnearest" ||
        (quantizerMode === "statefulnearest" &&
         (!statefulHadPrior || continuityAmount === 0))
    ) {
        result = clamp(result, 0, 127);
        if (result > registerHigh) {
            runtime_trace(
                "SAFETY_LIMIT\tmode=" + quantizerMode + " note=" + result +
                " ceiling=" + registerHigh
            );
            return nearest_mode_note_at_or_below(registerHigh, quantizerMode);
        }
        return result;
    }
    return constrain_to_register(result);
}

function nearest_mode_note_at_or_below(ceiling, mode) {
    var pitchClasses = mode === "chordnearest"
        ? active_chord_pitch_classes()
        : legalPitchClasses;
    var candidate;

    if (pitchClasses.length === 0) {
        return clamp(ceiling | 0, 0, 127);
    }

    for (candidate = clamp(ceiling | 0, 0, 127); candidate >= 0; candidate--) {
        if (pitchClasses.indexOf(positive_mod(candidate, 12)) >= 0) {
            return candidate;
        }
    }

    return clamp(ceiling | 0, 0, 127);
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

function stateful_nearest_quantize(note, channel) {
    var prior = voiceState[channel];
    var candidates;
    var continuity;
    var previousWeight;
    var harmonyChanged;
    var best;
    var bestScore = Infinity;
    var bestInputDistance = Infinity;
    var bestPreviousDistance = Infinity;
    var i;
    var candidate;
    var inputDistance;
    var previousDistance;
    var score;

    // The first note and Continuity 0% are deliberately identical to Scale
    // Nearest. This gives the studio test an exact, trustworthy A/B endpoint.
    if (!prior || continuityAmount === 0) {
        return nearest_quantize(note);
    }

    candidates = stateful_candidates();
    if (candidates.length === 0) {
        return nearest_quantize(note);
    }

    continuity = continuityAmount / 100;
    previousWeight = 3 * continuity;
    harmonyChanged = prior.version !== harmonyVersion;

    for (i = 0; i < candidates.length; i++) {
        candidate = candidates[i];
        inputDistance = Math.abs(candidate - note);
        previousDistance = Math.abs(candidate - prior.output);

        // Squared distances produce a useful compromise between the two
        // targets. A linear weighted sum would let the heavier endpoint win
        // completely and make high continuity permanently sticky.
        score = inputDistance * inputDistance +
            previousWeight * previousDistance * previousDistance;

        // On the first Note On after a harmonic change, reward retaining the
        // exact previous pitch when it remains legal. The bonus is deliberately
        // finite: a clearly different incoming gesture can still move the line.
        if (
            harmonyChanged &&
            candidate === prior.output &&
            is_legal_note(candidate)
        ) {
            score -= 64 * continuity;
        }

        if (
            score < bestScore ||
            (score === bestScore && inputDistance < bestInputDistance) ||
            (score === bestScore && inputDistance === bestInputDistance &&
             previousDistance < bestPreviousDistance) ||
            (score === bestScore && inputDistance === bestInputDistance &&
             previousDistance === bestPreviousDistance &&
             prefer_candidate(candidate, best))
        ) {
            best = candidate;
            bestScore = score;
            bestInputDistance = inputDistance;
            bestPreviousDistance = previousDistance;
        }
    }

    return typeof best === "undefined" ? nearest_quantize(note) : best;
}

function stateful_candidates() {
    var low = registerMode === "limited" ? registerLow : 0;
    var high = registerMode === "limited" ? registerHigh : 127;
    var candidates = [];
    var note;

    for (note = low; note <= high; note++) {
        if (is_legal_note(note)) {
            candidates.push(note);
        }
    }
    return candidates;
}

function prefer_candidate(candidate, currentBest) {
    if (typeof currentBest === "undefined") {
        return true;
    }
    return preferUpwardTie ? candidate > currentBest : candidate < currentBest;
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
    if (quantizerMode === "statefulnearest") {
        return "Stateful Nearest: continuity " + continuityAmount + "%";
    }
    if (quantizerMode === "up") {
        return "Directional: quantize upward only";
    }
    if (quantizerMode === "down") {
        return "Directional: quantize downward only";
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
