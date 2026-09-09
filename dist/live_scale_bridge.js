// All Live Object Model access for Tetrachords Current Scale synchronization.
// Observed Live state is diagnostic only and never becomes harmonic truth.

var LIVE_SCALE_BRIDGE_VERSION = "0.1.0";

function live_scale_bridge_value(value, property) {
    var result = value;
    if (result !== null && typeof result !== "string" &&
        typeof result.length !== "undefined") {
        result = Array.prototype.slice.call(result);
        if (result.length > 1 && result[0] === property) {
            result.shift();
        }
        if (result.length === 1) {
            result = result[0];
        }
    }
    return result;
}

function live_scale_bridge_array(value, property) {
    value = live_scale_bridge_value(value, property);
    if (value === null || typeof value === "undefined") {
        return [];
    }
    return typeof value === "string" ? value.split(/\s+/).filter(function (v) {
        return v !== "";
    }).map(function (v) { return parseInt(v, 10); }) :
        (typeof value.length !== "undefined" ? Array.prototype.slice.call(value) : [value]);
}

function live_scale_bridge_normalize_intervals(values) {
    var seen = {};
    var result = [];
    var i;
    var value;
    values = values || [];
    for (i = 0; i < values.length; i++) {
        value = ((parseInt(values[i], 10) % 12) + 12) % 12;
        if (!seen.hasOwnProperty(value)) {
            seen[value] = true;
            result.push(value);
        }
    }
    result.sort(function (a, b) { return a - b; });
    return result;
}

function live_scale_bridge_arrays_equal(left, right) {
    if (left.length !== right.length) { return false; }
    for (var i = 0; i < left.length; i++) {
        if (left[i] !== right[i]) { return false; }
    }
    return true;
}

function TetrachordsLiveScaleBridge(LiveAPIConstructor, onState) {
    this.LiveAPIConstructor = LiveAPIConstructor;
    this.onState = onState || function () {};
    this.song = null;
    this.observers = [];
    this.lastRequestedKey = "";
    this.lastResult = null;
    this.capabilities = {
        songScaleReadable: false,
        songScaleWritable: false,
        songScaleObservable: false,
        clipScaleReadable: false,
        clipScaleWritable: false,
        clipScaleObservable: false,
        scaleIntervalsWritable: false
    };
}

TetrachordsLiveScaleBridge.prototype.init = function () {
    if (!this.LiveAPIConstructor) {
        throw new Error("LiveAPI unavailable");
    }
    this.song = new this.LiveAPIConstructor("live_set");
    this.capabilities.songScaleReadable = !!this.song.get;
    this.capabilities.songScaleWritable = !!this.song.set;
    this.capabilities.songScaleObservable = true;
    this.observeCurrentScale();
    return this.capabilities;
};

TetrachordsLiveScaleBridge.prototype.readProperty = function (property) {
    if (!this.song || !this.song.get) {
        return null;
    }
    return live_scale_bridge_value(this.song.get(property), property);
};

TetrachordsLiveScaleBridge.prototype.readCurrentScale = function () {
    return {
        rootNote: this.readProperty("root_note"),
        scaleName: this.readProperty("scale_name"),
        scaleMode: this.readProperty("scale_mode"),
        scaleIntervals: live_scale_bridge_array(
            this.song && this.song.get ? this.song.get("scale_intervals") : [],
            "scale_intervals"
        )
    };
};

TetrachordsLiveScaleBridge.prototype.observeCurrentScale = function () {
    var self = this;
    var properties = ["root_note", "scale_name", "scale_mode", "scale_intervals"];
    if (!this.LiveAPIConstructor) {
        return;
    }
    try {
        properties.forEach(function (property) {
            var observer = new self.LiveAPIConstructor(function () {
                var observed = self.readCurrentScale();
                observed.observedProperty = property;
                self.onState({ type: "observed", state: observed });
            }, "live_set");
            observer.property = property;
            self.observers.push(observer);
        });
    } catch (error) {
        this.capabilities.songScaleObservable = false;
        this.onState({ type: "warning", warning: "Observer setup failed: " + error });
    }
};

TetrachordsLiveScaleBridge.prototype.setCurrentScale = function (match) {
    var warnings = [];
    var requested;
    var actual;
    var verified;
    var key;
    if (!this.song || !this.song.set) {
        throw new Error("Song scale is not writable");
    }
    if (!match || match.matchType === "none" || !match.scaleName) {
        return { requested: null, actual: this.readCurrentScale(), verified: false,
            skipped: true, warnings: [match && match.reason ? match.reason : "No scale match"] };
    }
    requested = {
        rootNote: match.rootNote | 0,
        scaleName: match.scaleName,
        scaleMode: 1,
        scaleIntervals: (match.expectedIntervals || []).slice(0)
    };
    key = requested.rootNote + "|" + requested.scaleName + "|" + requested.scaleMode;
    actual = this.readCurrentScale();
    if (this.lastRequestedKey === key &&
        Number(actual.rootNote) === requested.rootNote &&
        String(actual.scaleName) === requested.scaleName &&
        Number(actual.scaleMode) === 1 &&
        live_scale_bridge_arrays_equal(
            live_scale_bridge_normalize_intervals(actual.scaleIntervals),
            live_scale_bridge_normalize_intervals(requested.scaleIntervals)
        )) {
        return { requested: requested, actual: actual, verified: true,
            skipped: true, warnings: [] };
    }

    // Activate scale following only after root and name are in place.
    if (Number(actual.rootNote) !== requested.rootNote) {
        this.song.set("root_note", requested.rootNote);
    }
    if (String(actual.scaleName) !== requested.scaleName) {
        this.song.set("scale_name", requested.scaleName);
    }
    if (Number(actual.scaleMode) !== 1) {
        this.song.set("scale_mode", 1);
    }
    this.lastRequestedKey = key;
    actual = this.readCurrentScale();
    verified = Number(actual.rootNote) === requested.rootNote &&
        String(actual.scaleName) === requested.scaleName &&
        Number(actual.scaleMode) === 1 &&
        live_scale_bridge_arrays_equal(
            live_scale_bridge_normalize_intervals(actual.scaleIntervals),
            live_scale_bridge_normalize_intervals(requested.scaleIntervals)
        );
    if (!verified) {
        warnings.push("Live round-trip differs from requested scale");
    }
    this.lastResult = {
        requested: requested,
        actual: actual,
        verified: verified,
        skipped: false,
        warnings: warnings
    };
    this.onState({ type: "write", result: this.lastResult });
    return this.lastResult;
};

TetrachordsLiveScaleBridge.prototype.getCapabilities = function () {
    return this.capabilities;
};
