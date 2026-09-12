"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const context = vm.createContext({ console, Array, Math, parseInt });
for (const file of ["live_scale_matcher.js", "live_scale_bridge.js"]) {
    vm.runInContext(
        fs.readFileSync(path.join(
            __dirname,
            "..",
            "Tetrachords_Harmony_Receiver",
            file
        ), "utf8"),
        context,
        { filename: file }
    );
}

const matcher = new context.TetrachordsLiveScaleMatcher();

function plain(value) {
    return JSON.parse(JSON.stringify(value));
}

let match = plain(matcher.match({
    rootPitchClass: 0,
    validPitchClasses: [7, 0, 4, 11, 2, 9, 5, 0]
}));
assert.strictEqual(match.matchType, "exact");
assert.strictEqual(match.scaleName, "Major");
assert.deepStrictEqual(match.matchedPitchClasses, [0, 2, 4, 5, 7, 9, 11]);

match = plain(matcher.match({
    rootPitchClass: 3,
    validPitchClasses: [3, 5, 6, 8, 10, 11, 1]
}));
assert.strictEqual(match.matchType, "exact");
assert.strictEqual(match.scaleName, "Minor");
assert.strictEqual(match.rootNote, 3);

// Octave duplicates normalize for matching without changing the raw MIDI
// collection retained by the receiver.
match = plain(matcher.match({
    rootPitchClass: 0,
    validPitchClasses: [60, 72, 64, 67, 71]
}));
assert.strictEqual(match.matchType, "approximate");
assert.deepStrictEqual(
    Array.from(context.live_scale_unique_sorted([60, 72, 64, 67, 71])),
    [0, 4, 7, 11]
);
assert.ok(match.matchedPitchClasses.length >= 3);

// An eight-note Tetrachords field is not collapsed to seven notes. Live gets
// an explicitly reported approximation while the exact set stays canonical.
match = plain(matcher.match({
    rootPitchClass: 0,
    validPitchClasses: [0, 2, 3, 4, 5, 7, 9, 11]
}));
assert.strictEqual(match.matchType, "approximate");
assert.strictEqual(match.scaleName, "Major");
assert.deepStrictEqual(match.missingPitchClasses, [3]);
assert.deepStrictEqual(match.extraPitchClasses, []);

match = plain(matcher.match({ validPitchClasses: [0, 2, 4] }));
assert.strictEqual(match.matchType, "none");

const state = {
    root_note: 4,
    scale_name: "Minor",
    scale_mode: 0,
    scale_intervals: [0, 2, 3, 5, 7, 8, 10]
};
const writes = [];
function LiveAPI(callback) {
    this.callback = callback;
    this.get = (name) => state[name];
    this.set = (name, value) => {
        writes.push([name, value]);
        state[name] = value;
        if (name === "scale_name" && value === "Major") {
            state.scale_intervals = [0, 2, 4, 5, 7, 9, 11];
        }
    };
}
const bridge = new context.TetrachordsLiveScaleBridge(LiveAPI);
bridge.init();
const result = plain(bridge.setCurrentScale(matcher.match({
    rootPitchClass: 0,
    validPitchClasses: [0, 2, 4, 5, 7, 9, 11]
})));
assert.deepStrictEqual(writes, [
    ["root_note", 0],
    ["scale_name", "Major"],
    ["scale_mode", 1]
]);
assert.strictEqual(result.verified, true);
assert.deepStrictEqual(result.actual.scaleIntervals, [0, 2, 4, 5, 7, 9, 11]);

console.log("Live scale matcher and bridge: exact, approximate, normalization and round-trip tests passed.");
