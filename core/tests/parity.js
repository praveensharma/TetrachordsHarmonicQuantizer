#!/usr/bin/env node
'use strict';

// Oracle is the shipping JS engine, not a reimplementation of its algorithms.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {spawnSync} = require('child_process');
const root = path.resolve(__dirname, '../..');
const driverIndex = process.argv.indexOf('--driver');
if (driverIndex < 0 || !process.argv[driverIndex + 1]) throw Error('Usage: node core/tests/parity.js --driver /path/to/parity_driver');
const driver = path.resolve(process.argv[driverIndex + 1]);
const refIndex = process.argv.indexOf('--reference');
const reference = refIndex >= 0 ? process.argv[refIndex + 1] : path.join(root, 'tests/reference/harmonic_quantizer_legacy.js');
const source = fs.readFileSync(reference, 'utf8');
let total = 0;

function run(name, operations) {
    let now = 0;
    const emitted = [];
    const globals = {};
    const context = vm.createContext({
        Global: function(key) { return globals[key] || (globals[key] = {}); },
        Task: function() { this.cancel = this.schedule = this.repeat = function() {}; },
        Date: class extends Date { constructor(...args) { super(...(args.length ? args : [now / 1000])); } },
        outlet(index, ...values) { if (index === 0) emitted.push(...values.flat()); },
        arrayfromargs: args => Array.from(args),
        messnamed() {},
        patcher: {getnamed() { return null; }},
        inlet: 0
    });
    vm.runInContext(source, context, {filename: reference});
    context.init();
    context.mode('scale-nearest');
    const expected = [];
    const states = [];
    let state = {};
    const lines = [];
    let version = 0;
    for (const op of operations) {
        now = op.timeUs === undefined ? now + 1000 : op.timeUs;
        emitted.length = 0;
        const [kind, ...args] = op;
        if (!['msg', 'byte', 'probe'].includes(kind)) state = {...state, [kind]: args};
        states.push(state);
        let probe = -1;
        if (kind === 'field') {
            const [mask, root = 0, sourceId = 0, raw = [], explicitVersion] = args;
            const id = explicitVersion === undefined ? ++version : explicitVersion;
            const pcs = Array.from({length: 12}, (_, n) => n).filter(n => mask & (1 << n));
            context.apply_valid_notes([id, root, ['sysex', 'midi', 'plinky'][sourceId], ...pcs]);
            lines.push(`${now} field ${id} ${root} ${sourceId} ${mask} ${raw.length} ${raw.join(' ')}`);
        } else if (kind === 'chord') {
            const [notes, root = 0] = args;
            const id = ++version;
            context.apply_chord([id, root, ...notes]);
            lines.push(`${now} chord ${id} ${root} ${notes.length} ${notes.join(' ')}`);
        } else if (kind === 'msg') {
            args.forEach(b => context.msg_int(b));
            lines.push(`${now} msg ${args.length} ${args.join(' ')}`);
        } else {
            switch (kind) {
            case 'mode': context.mode(['nearest', 'chordnearest', 'harmonizer', 'chromatic', 'up', 'down', 'melody', 'statefulnearest'][args[0]]); break;
            case 'map': context.harmonizermap(args[0] ? 'voicing' : 'pitchclass'); break;
            case 'continuity': context.continuity(args[0]); break;
            case 'motion':
                context.motionDecision.effective = args[0];
                context.read_motion = () => ({effective:args[0], base:args[0], spread:0});
                break;
            case 'register': context.registermode(args[0] ? 'free' : 'limited'); break;
            case 'low': context.low(args[0]); break;
            case 'high': context.high(args[0]); break;
            case 'tie': context.tiebreakup(args[0]); break;
            case 'change': context.timing(['immediate', 'nextnote', 'nextbar'][args[0]]); break;
            case 'same': context.samepitch(args[0]); break;
            case 'gravity': context.gravity(['off', 'light', 'strong'][args[0]]); break;
            case 'bypass': context.bypass(args[0]); break;
            case 'reset': context.resetvoices(); break;
            case 'panic': context.panic(); break;
            case 'byte': context.msg_int(args[0]); break;
            case 'probe': probe = context.quantize_note(args[0], 1, args[1]); if (probe === null) probe = -1; break;
            default: throw Error(`Unknown operation ${kind}`);
            }
            lines.push(`${now} ${kind} ${args.join(' ')}`);
        }
        expected.push({step: expected.length, bytes: [...emitted], probe});
    }
    const result = spawnSync(driver, [], {
        input: lines.join('\n') + '\n', encoding: 'utf8', maxBuffer: 64 * 1024 * 1024
    });
    if (result.status !== 0) throw Error(`${name}: C++ driver failed (${result.status}) ${result.stderr}`);
    const actual = result.stdout.trim().split('\n').map(line => JSON.parse(line));
    assert.equal(actual.length, expected.length, `${name}: operation count`);
    for (let i = 0; i < expected.length; ++i) {
        try { assert.deepStrictEqual(actual[i], expected[i]); }
        catch (error) {
            const nearby = operations.slice(Math.max(0, i - 5), i + 1);
            throw Error(`${name}, step ${i}, ${JSON.stringify(operations[i])}\nState inputs: ${JSON.stringify(states[i])}\nRecent operations: ${JSON.stringify(nearby)}\nJS: ${JSON.stringify(expected[i])}\nC++: ${JSON.stringify(actual[i])}\n${error.message}`);
        }
    }
    total += operations.length;
    console.log(`Parity: ${name} (${operations.length} operations) passed.`);
}

const on = (ch, n, v = 100) => ['msg', 0x90 | ch, n, v];
const off = (ch, n, v = 0) => ['msg', 0x80 | ch, n, v];

// Every 12-bit field, with every MIDI note covered across masks. Probe the real
// selector directly; separate message tests exercise ownership and passthrough.
{
    const ops = [['change', 0], ['register', 1]];
    for (let mask = 0; mask < 4096; ++mask) {
        ops.push(['field', mask, mask % 12, mask % 3]);
        for (const n of [0, 1, 11, 12, 60, 61, 126, 127, mask % 128]) ops.push(['probe', n, 100]);
    }
    run('all field masks, roots, sources and MIDI boundaries', ops);
}
{
    const ops = [['change', 0]];
    for (const mask of [0, 1, 0x800, 0xab5, 0x5ad, 0xfff]) {
        ops.push(['field', mask]);
        for (const chord of [[], [48], [48, 52, 55, 60], [127, 0, 127], [61, 73]]) {
            ops.push(['chord', chord, 1]);
            for (const mode of [0, 1]) for (const reg of [0, 1]) for (const tie of [0, 1]) {
                ops.push(['mode', mode], ['register', reg], ['tie', tie], ['low', 40], ['high', 64]);
                for (let n = 0; n < 128; ++n) ops.push(['probe', n, 100]);
            }
        }
    }
    run('both modes, register window, empty chords/fields and ties', ops);
}
{
    const ops = [['change', 0], ['register', 1]];
    for (const mask of [1, 0x112, 0xab5, 0xfff]) for (const root of [0, 1, 7, 11]) {
        ops.push(['field', mask, root]);
        for (const mode of [0, 1]) for (const gravity of [0, 1, 2]) {
            ops.push(['mode', mode], ['gravity', gravity]);
            for (const velocity of [0, 63, 64, 95, 96, 127])
                for (let n = 0; n < 128; n += 3) ops.push(['probe', n, velocity]);
        }
    }
    run('root gravity thresholds, sparse fields and transpositions', ops);
}

for (const same of [0, 1]) for (const mode of [0, 1]) {
    const ops = [['change', 0], ['register', 1], ['same', same], ['mode', mode],
        ['field', 0xab5, 0, 1, [60, 62, 64, 65, 67, 69, 71, 72]], ['chord', [48, 52, 55]]];
    for (let ch = 0; ch < 16; ++ch) {
        ops.push(on(ch, 61), on(ch, 62), on(ch, 61, 90),
            ['field', 0x5ad, 1, 2], ['chord', [49, 53, 56], 1],
            off(ch, 61, 41), off(ch, 62), ['msg', 0x90 | ch, 61, 0], off(ch, 99),
            ['field', 0xab5], ['chord', [48, 52, 55]]);
    }
    ops.push(on(0, 60), on(1, 67), on(0, 60), ['reset'], ['bypass', 1], off(0, 60),
        on(0, 63), ['bypass', 0], off(0, 63), on(0, 60), ['panic'], ['panic']);
    run(`lifecycle channels/held harmony/repeated pitches/bypass/panic mode=${mode} same=${same}`, ops);
}

{
    const ops = [['field', 1], ['change', 1], on(0, 60), ['field', 4],
        off(0, 60), on(0, 60), off(0, 60), ['change', 2], ['field', 16],
        ['byte', 0xfa]];
    for (let i = 0; i < 95; ++i) ops.push(['byte', 0xf8]);
    ops.push(on(0, 60), off(0, 60), ['byte', 0xf8], on(0, 60), off(0, 60));
    ops.push(['field', 32], ['change', 0], on(0, 60), off(0, 60));
    // Duplicate version is ignored even when the contents/source differ.
    ops.push(['field', 1, 0, 1, [], 999], ['field', 4, 2, 2, [], 999], on(0, 60), off(0, 60));
    run('next-note/clock-bar/immediate activation and duplicate versions', ops);
}
{
    const bytes = [0x90, 61, 0xf8, 100, 62, 90, 0x80, 61, 0, 62, 0,
        0xc0, 12, 13, 0xd1, 90, 0xe2, 0, 64, 0xb0, 64, 127,
        0xf2, 0, 0xf8, 4, 0xf1, 32, 0xf3, 9,
        0xf0, 0x77, 0x01, 0xf8, 0x02, 0xf7, 0x90, 60, 90, 0x90, 60, 0];
    run('raw parser running status, realtime, system and SysEx passthrough',
        [['field', 0xab5], ['register', 1], ...bytes.map(b => ['byte', b]), ['panic']]);
}

// Seeded random event histories keep polyphony bounded below the core's finite
// capacity. All final releases use source identity, never recalculated output.
for (const same of [0, 1]) {
    let state = 0x12345678;
    const random = n => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state % n; };
    const held = [];
    const ops = [['register', 1], ['same', same], ['field', 0xab5]];
    for (let i = 0; i < 20000; ++i) {
        if (i % 47 === 0) ops.push(['field', random(4096), random(12), random(3)]);
        if (i % 83 === 0) ops.push(['chord', [random(128), random(128), random(128)], random(12)]);
        if (i % 109 === 0) ops.push(['mode', random(2)], ['tie', random(2)], ['high', random(128)]);
        // Empty-field passthrough is a known legacy ownership discontinuity;
        // periodic panic provides the same explicit recovery on both engines.
        if (i % 251 === 0) { ops.push(['panic']); held.length = 0; }
        if (held.length && (held.length >= 16 || random(3) === 0)) {
            const index = random(held.length), [ch, n] = held.splice(index, 1)[0];
            ops.push(off(ch, n, random(128)));
        } else { const ch = random(16), n = random(128); held.push([ch, n]); ops.push(on(ch, n, 1 + random(127))); }
    }
    held.forEach(([ch, n]) => ops.push(off(ch, n)));
    ops.push(['panic']);
    run(`seeded live-event stress, same=${same}`, ops);
}
for (const mode of [2, 3, 4, 5, 6, 7]) {
    const ops = [['change', 0], ['mode', mode]];
    for (const reg of [0, 1]) for (const root of [0, 1, 7, 11])
    for (const mask of [0, 1, 0x800, 0xab5, 0x5ad, 0xfff]) {
        ops.push(['register', reg], ['low', 40], ['high', 64], ['field', mask, root]);
        for (const chord of [[], [48], [48, 52, 55, 60], [127, 0, 127], [61, 73]]) {
            ops.push(['chord', chord, root]);
            for (const map of [0, 1]) {
                ops.push(['map', map]);
                for (let n = 0; n < 128; ++n) ops.push(['probe', n, 100]);
            }
        }
    }
    run(`expanded selector mode=${mode}, all pitches, roots, registers, raw voicings`, ops);
}
for (const mode of [2, 3, 4, 5, 6, 7]) {
    const ops = [['change', 0], ['mode', mode], ['register', 1], ['field', 0xab5], ['chord', [48, 52, 55]]];
    for (const continuity of [0, 30, 60, 100]) for (const motion of [-100, -40, 0, 40, 100]) {
        ops.push(['continuity', continuity], ['motion', motion]);
        for (let i = 0; i < 32; ++i) {
            const ch = i % 16, n = (i * 17 + 37) % 128;
            ops.push(on(ch, n), off(ch, n));
            if (i % 7 === 0) ops.push(['field', i % 2 ? 0x5ad : 0xab5, i % 12]);
        }
        ops.push(['reset'], ['register', 0], ['low', 61], ['high', 61],
            ['field', 1], on(0, 60), off(0, 60), ['panic'], ['register', 1], ['field', 0xab5]);
    }
    run(`expanded event/history mode=${mode}, continuity, direction, silence, reset`, ops);
}
{
    let seed = 0x39c714a2;
    const random = n => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
    const ops = [['change', 0], ['field', 0xab5]];
    const held = [];
    for (let i = 0; i < 30000; ++i) {
        if (i % 13 === 0) ops.push(['mode', random(8)], ['register', random(2)],
            ['continuity', random(101)], ['motion', random(201)-100], ['gravity', random(3)],
            ['map', random(2)], ['tie', random(2)], ['same', random(2)]);
        if (i % 29 === 0) ops.push(['low', random(128)], ['high', random(128)],
            ['field', random(4096), random(12)], ['chord', [random(128), random(128), random(128)], random(12)]);
        if (i % 127 === 0) { ops.push(['panic']); held.length = 0; }
        if (held.length && (held.length > 10 || random(2))) {
            const [ch, n] = held.shift(); ops.push(off(ch, n, random(128)));
        } else {
            const ch = random(16), n = random(128); held.push([ch, n]); ops.push(on(ch, n, 1+random(127)));
        }
    }
    ops.push(['panic']);
    run('seeded mixed-mode automation, register, gravity, motion, history and releases', ops);
}
console.log(`Actual JS/C++ differential parity passed: ${total} operations. No Max/Live/hardware timing claim.`);
