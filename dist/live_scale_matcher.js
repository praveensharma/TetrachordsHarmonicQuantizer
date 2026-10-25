// Pure Tetrachords harmonic-state -> Ableton Live Current Scale matcher.
// This file deliberately has no LiveAPI or Max dependencies so it can be
// exercised by Node tests as well as included by the receiver's Max js object.

var LIVE_SCALE_LIBRARY_VERSION = "Live 12.4.x LOM names";

var TETRACHORDS_LIVE_SCALE_DEFINITIONS = [
    { name: "Major", intervals: [0, 2, 4, 5, 7, 9, 11] },
    { name: "Minor", intervals: [0, 2, 3, 5, 7, 8, 10] },
    { name: "Dorian", intervals: [0, 2, 3, 5, 7, 9, 10] },
    { name: "Mixolydian", intervals: [0, 2, 4, 5, 7, 9, 10] },
    { name: "Lydian", intervals: [0, 2, 4, 6, 7, 9, 11] },
    { name: "Phrygian", intervals: [0, 1, 3, 5, 7, 8, 10] },
    { name: "Locrian", intervals: [0, 1, 3, 5, 6, 8, 10] },
    { name: "Diminished", intervals: [0, 1, 3, 4, 6, 7, 9, 10] },
    { name: "Whole-half", intervals: [0, 2, 3, 5, 6, 8, 9, 11] },
    { name: "Whole Tone", intervals: [0, 2, 4, 6, 8, 10] },
    { name: "Minor Blues", intervals: [0, 3, 5, 6, 7, 10] },
    { name: "Minor Pentatonic", intervals: [0, 3, 5, 7, 10] },
    { name: "Major Pentatonic", intervals: [0, 2, 4, 7, 9] },
    { name: "Harmonic Minor", intervals: [0, 2, 3, 5, 7, 8, 11] },
    { name: "Melodic Minor", intervals: [0, 2, 3, 5, 7, 9, 11] },
    { name: "Super Locrian", intervals: [0, 1, 3, 4, 6, 8, 10] },
    { name: "Bhairav", intervals: [0, 1, 4, 5, 7, 8, 11] },
    { name: "Hungarian Minor", intervals: [0, 2, 3, 6, 7, 8, 11] },
    { name: "Minor Gypsy", intervals: [0, 1, 4, 5, 7, 8, 10] },
    { name: "Hirojoshi", intervals: [0, 2, 3, 7, 8] },
    { name: "In-Sen", intervals: [0, 1, 5, 7, 10] },
    { name: "Iwato", intervals: [0, 1, 5, 6, 10] },
    { name: "Kumoi", intervals: [0, 2, 3, 7, 9] },
    { name: "Pelog", intervals: [0, 1, 3, 7, 8] },
    { name: "Spanish", intervals: [0, 1, 3, 4, 5, 6, 8, 10] }
];

function live_scale_positive_mod(value, modulus) {
    return ((value % modulus) + modulus) % modulus;
}

function live_scale_unique_sorted(values) {
    var seen = {};
    var result = [];
    var i;
    var value;
    values = values || [];
    for (i = 0; i < values.length; i++) {
        value = live_scale_positive_mod(values[i] | 0, 12);
        if (!seen.hasOwnProperty(value)) {
            seen[value] = true;
            result.push(value);
        }
    }
    result.sort(function (a, b) { return a - b; });
    return result;
}

function live_scale_absolute_pitch_classes(root, intervals) {
    var result = [];
    var i;
    for (i = 0; i < intervals.length; i++) {
        result.push(live_scale_positive_mod((root | 0) + intervals[i], 12));
    }
    return live_scale_unique_sorted(result);
}

function live_scale_difference(left, right) {
    var result = [];
    var i;
    for (i = 0; i < left.length; i++) {
        if (right.indexOf(left[i]) < 0) {
            result.push(left[i]);
        }
    }
    return result;
}

function live_scale_arrays_equal(left, right) {
    if (left.length !== right.length) {
        return false;
    }
    for (var i = 0; i < left.length; i++) {
        if (left[i] !== right[i]) {
            return false;
        }
    }
    return true;
}

function TetrachordsLiveScaleMatcher(definitions) {
    this.definitions = definitions || TETRACHORDS_LIVE_SCALE_DEFINITIONS;
    this.cache = {};
}

TetrachordsLiveScaleMatcher.prototype.match = function (state) {
    var root;
    var valid;
    var cacheKey;
    var best = null;
    var i;

    if (!state || typeof state.rootPitchClass === "undefined" ||
        state.rootPitchClass === null) {
        return {
            rootNote: null,
            scaleName: "",
            matchType: "none",
            matchedPitchClasses: [],
            missingPitchClasses: [],
            extraPitchClasses: [],
            score: 0,
            reason: "Tetrachords root unavailable"
        };
    }
    root = live_scale_positive_mod(state.rootPitchClass | 0, 12);
    valid = live_scale_unique_sorted(state.validPitchClasses || []);
    if (!valid.length) {
        return {
            rootNote: root,
            scaleName: "",
            matchType: "none",
            matchedPitchClasses: [],
            missingPitchClasses: [],
            extraPitchClasses: [],
            score: 0,
            reason: "No active valid-note collection"
        };
    }

    cacheKey = root + "|" + valid.join(",");
    if (this.cache.hasOwnProperty(cacheKey)) {
        return this.cache[cacheKey];
    }

    for (i = 0; i < this.definitions.length; i++) {
        var definition = this.definitions[i];
        var candidate = live_scale_absolute_pitch_classes(
            root,
            definition.intervals
        );
        var missing = live_scale_difference(valid, candidate);
        var extra = live_scale_difference(candidate, valid);
        var matched = live_scale_difference(valid, missing);
        var exact = live_scale_arrays_equal(valid, candidate);
        // Extra Live notes are especially dangerous: native devices may emit
        // pitches that our exact Tetrachords collection considers invalid.
        // This intentionally favors a clean subset over a broad superscale.
        var score = matched.length * 10 - missing.length * 4 - extra.length * 14;
        var result = {
            rootNote: root,
            scaleName: definition.name,
            matchType: exact ? "exact" : "approximate",
            matchedPitchClasses: matched,
            missingPitchClasses: missing,
            extraPitchClasses: extra,
            expectedIntervals: definition.intervals.slice(0),
            expectedPitchClasses: candidate,
            score: exact ? 1000 : score,
            reason: exact ? "Exact Live scale" : "Nearest Live scale projection"
        };
        if (!best || result.score > best.score ||
            (result.score === best.score && result.extraPitchClasses.length < best.extraPitchClasses.length) ||
            (result.score === best.score && result.extraPitchClasses.length === best.extraPitchClasses.length &&
             result.missingPitchClasses.length < best.missingPitchClasses.length)) {
            best = result;
        }
    }

    this.cache[cacheKey] = best;
    return best;
};

