// Control-only bridge. No melodic MIDI inlet, parser, note handler or output.
autowatch = 1;
inlets = 1;
outlets = 2; // native commands, human-readable control status
var shared = new Global("tetrachords_harmony_v1");
var protocol = false, lastField = -1, lastChord = -1, polling = null;
function bridge_status(text) { if(typeof status==="function")status(text);else outlet(1,text); }
function maskOf(notes) {
    var mask = 0;
    for (var i = 0; i < notes.length; ++i) mask |= 1 << (((notes[i] % 12) + 12) % 12);
    return mask;
}
function field(values, raw) {
    if (values.length < 3 || values[0] === lastField) return;
    var version = values[0], root = values[1], source = String(values[2]);
    var mask = maskOf(values.slice(3));
    raw = raw || [];
    // A late snapshot must not attach another version's raw voicing to a mask.
    if (maskOf(raw) !== mask) {
        raw = [];
        bridge_status("Raw-note snapshot differs; using committed pitch-class field");
    }
    outlet(0, ["field", version, root, source === "midi" ? 1 : source === "plinky" ? 2 : 0,
        mask, raw.length].concat(raw));
    lastField = version;
    bridge_status("Harmony: " + source + " • " + values.slice(3).join(" "));
}
function validnotes() {
    protocol = true;
    field(arrayfromargs(arguments), shared.activeValidVersion === arguments[0]
        ? (shared.activeValidMidiNotes || []) : []);
}
function harmony() {
    if (protocol) return;
    var values = arrayfromargs(arguments);
    if (values.length >= 3) field([values[0], values[1], "sysex"].concat(values.slice(2)), []);
}
function chord() {
    var values = arrayfromargs(arguments);
    if (values.length < 2 || values[0] === lastChord) return;
    outlet(0, ["chord"].concat(values)); lastChord = values[0];
}
function snapshot() {
    if (typeof shared.activeValidVersion !== "undefined") {
        protocol = true;
        field([shared.activeValidVersion, shared.root || 0, shared.validNoteSource || "sysex"]
            .concat(shared.activeValidPitchClasses || []), shared.activeValidMidiNotes || []);
    } else if (!protocol && typeof shared.version !== "undefined") {
        field([shared.version, shared.root || 0, "sysex"].concat(shared.legalPitchClasses || []), []);
    }
    if (typeof shared.chordVersion !== "undefined") {
        var root = typeof shared.chordRoot === "undefined" ? (shared.root || 0) : shared.chordRoot;
        chord.apply(this, [shared.chordVersion, root].concat(shared.activeChordNotes || []));
    }
}
function bridge_loadbang() {
    protocol = false; lastField = lastChord = -1;
    snapshot();
    if (polling) polling.cancel();
    polling = new Task(snapshot, this); polling.interval = 100; polling.repeat();
}
function bridge_deleted() { if (polling) polling.cancel(); }
