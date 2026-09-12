// Run inside Max for Live 12.4.x Beta. This tool writes each scale property
// back to its current value, so it tests writability without intentionally
// changing the Set or selected clip.
autowatch = 1;
inlets = 1;
outlets = 1;

var SCALE_PROPERTIES = ["root_note", "scale_name", "scale_mode", "scale_intervals"];
var observers = [];

function probe_value(value, property) {
    if (value !== null && typeof value !== "string" &&
        typeof value.length !== "undefined") {
        value = Array.prototype.slice.call(value);
        if (value.length > 1 && value[0] === property) { value.shift(); }
        if (value.length === 1) { value = value[0]; }
    }
    return value;
}

function write_same_value(api, property, value) {
    if (value !== null && typeof value !== "string" &&
        typeof value.length !== "undefined") {
        api.set.apply(api, [property].concat(Array.prototype.slice.call(value)));
    } else {
        api.set(property, value);
    }
}

function probe_property(path, api, property) {
    var result = { readable: false, writable: false, observable: false };
    var value;
    try {
        value = probe_value(api.get(property), property);
        result.readable = true;
        result.value = value;
    } catch (error) {
        result.readError = String(error);
    }
    if (result.readable) {
        try {
            write_same_value(api, property, value);
            result.writable = true;
        } catch (error) {
            result.writeError = String(error);
        }
    }
    try {
        var observer = new LiveAPI(function () {
            post("Live Scale API observer: " + path + " " + property + " changed\n");
        }, path);
        observer.property = property;
        observers.push(observer);
        result.observable = true;
    } catch (error) {
        result.observeError = String(error);
    }
    return result;
}

function probe_path(label, path) {
    var result = { label: label, path: path, available: false, properties: {} };
    var api;
    try {
        api = new LiveAPI(path);
        result.id = api.id;
        result.available = !!api.id;
        if (!result.available) { return result; }
    } catch (error) {
        result.error = String(error);
        return result;
    }
    SCALE_PROPERTIES.forEach(function (property) {
        result.properties[property] = probe_property(path, api, property);
    });
    try { result.isAudioClip = !!Number(probe_value(api.get("is_audio_clip"), "is_audio_clip")); } catch (ignore) {}
    try { result.isMidiClip = !!Number(probe_value(api.get("is_midi_clip"), "is_midi_clip")); } catch (ignore) {}
    return result;
}

function probe() {
    observers = [];
    var report = {
        timestamp: new Date().toString(),
        song: probe_path("Song", "live_set"),
        detailClip: probe_path("Selected detail clip", "live_set view detail_clip")
    };
    var encoded = JSON.stringify(report);
    post("TETRACHORDS_LIVE_SCALE_PROBE " + encoded + "\n");
    outlet(0, "set", encoded);
}

function clearobservers() {
    observers.forEach(function (observer) {
        try { observer.property = ""; } catch (ignore) {}
    });
    observers = [];
    post("Live Scale API probe observers cleared\n");
}

