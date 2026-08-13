// Pure Node.js smoke tests for the quantization and mapping rules.
// Run from the package root with: node tests/test_quantizer_logic.js

"use strict";

const assert = require("assert");

function positiveMod(value, modulus) {
    return ((value % modulus) + modulus) % modulus;
}

function isLegal(note, legalPitchClasses) {
    return legalPitchClasses.includes(positiveMod(note, 12));
}

function quantizeNote(note, legalPitchClasses, preferUpwardTie) {
    if (isLegal(note, legalPitchClasses)) {
        return note;
    }

    for (let distance = 1; distance <= 12; distance += 1) {
        const down = note - distance;
        const up = note + distance;
        const downLegal = down >= 0 && isLegal(down, legalPitchClasses);
        const upLegal = up <= 127 && isLegal(up, legalPitchClasses);

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

function harmonizePitchClass(note, root, activeChordNotes) {
    const degrees = activeChordNotes
        .map((chordNote) => positiveMod(chordNote - root, 12))
        .filter((value, index, values) => values.indexOf(value) === index)
        .sort((a, b) => a - b);
    const selector = positiveMod(note, 12);
    const degreeIndex = selector % degrees.length;
    const octaveTurns = Math.floor(selector / degrees.length);
    const inputOctaveC = 12 * Math.floor(note / 12);

    return inputOctaveC + root + degrees[degreeIndex] + 12 * octaveTurns;
}

function harmonizeVoicing(note, activeChordNotes) {
    const notes = activeChordNotes.slice().sort((a, b) => a - b);
    const selector = positiveMod(note, 12);
    const noteIndex = selector % notes.length;
    const octaveTurns = Math.floor(selector / notes.length);
    const inputOctaveC = 12 * Math.floor(note / 12);
    const octaveShift = 12 * Math.round((inputOctaveC - notes[0]) / 12);

    return notes[noteIndex] + octaveShift + 12 * octaveTurns;
}

const cMajor = [0, 2, 4, 5, 7, 9, 11];

assert.strictEqual(quantizeNote(60, cMajor, true), 60);
assert.strictEqual(quantizeNote(61, cMajor, true), 62);
assert.strictEqual(quantizeNote(61, cMajor, false), 60);
assert.strictEqual(quantizeNote(0, [11], true), 11);
assert.strictEqual(quantizeNote(127, [0], true), 120);

// C-B act as successive selectors into the exact active chord.
assert.deepStrictEqual(
    [60, 61, 62, 63, 64].map((note) =>
        harmonizePitchClass(note, 0, [48, 51, 55, 58])
    ),
    [60, 63, 67, 70, 72]
);

// Exact voicing retains an E-G-C inversion rather than re-rooting it.
assert.deepStrictEqual(
    [60, 61, 62, 63].map((note) =>
        harmonizeVoicing(note, [52, 55, 60])
    ),
    [64, 67, 72, 76]
);

// D Dorian intervals at root D become D E F G A B C.
const dDorian = [0, 2, 3, 5, 7, 9, 10, 12]
    .map((interval) => positiveMod(2 + interval, 12))
    .filter((value, index, values) => values.indexOf(value) === index)
    .sort((a, b) => a - b);

assert.deepStrictEqual(dDorian, [0, 2, 4, 5, 7, 9, 11]);
assert.strictEqual(quantizeNote(66, dDorian, true), 67);

console.log("All quantizer smoke tests passed.");
