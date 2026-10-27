// Max adapter: MIDI bytes enter the C++ engine directly, never through JS.
// Production MIDI engine; JS is limited to configuration/readout plumbing.
#include "ext.h"
#include "ext_obex.h"
#include "ext_critical.h"
#include "tetrachords/engine.hpp"

#include <array>
#include <algorithm>
#include <cmath>
#include <cstring>
#include <new>
#include <limits>

using namespace tetrachords;
namespace {
t_class* native_class = nullptr;
Ensemble shared_ensemble;
struct Native {
    t_object object;
    void* midi_out;
    void* status_out;
    void* timer;
    bool busy;
    std::uint64_t rejected, reentrant;
    std::uint64_t time;
    std::array<std::uint8_t, 16384> output;
    std::size_t output_size;
    bool output_overflow;
    alignas(Engine) unsigned char storage[sizeof(Engine)];
    Engine& engine() noexcept { return *reinterpret_cast<Engine*>(storage); }
};
void capture(void* context, const MidiEvent& e) noexcept {
    auto* x = static_cast<Native*>(context);
    if (x->output_size + e.size > x->output.size()) { x->output_overflow = true; return; }
    for (int i = 0; i < e.size; ++i) x->output[x->output_size++] = e.bytes[i];
}
// Max serializes its scheduler/main event paths using this recursive global
// critical section. There is no defer, timer, JS callback or per-note queue.
// This adapter is NOT advertised as lock-free or audio-thread-safe.
bool begin(Native* x) {
    critical_enter(0);
    if (x->busy) { ++x->reentrant; critical_exit(0); return false; }
    x->busy = true;
    x->output_size = 0;
    double ms = 0; clock_getftime(&ms);
    const auto now = static_cast<std::uint64_t>(std::max(0.0, ms) * 1000);
    if (now > x->time) x->time = now;
    return true;
}
void end(Native* x) {
    // A forced pending drain + full panic remains bounded by 16 KiB.
    if (!x->output_overflow)
        for (std::size_t i = 0; i < x->output_size; ++i) outlet_int(x->midi_out, x->output[i]);
    x->busy = false;
    clock_unset(x->timer);
    const auto due = x->engine().next_due();
    if (due != std::numeric_limits<std::uint64_t>::max())
        clock_fdelay(x->timer, due > x->time ? (due - x->time) / 1000.0 : 0.0);
    critical_exit(0);
}
bool integer(const t_atom& a, t_atom_long low, t_atom_long high, t_atom_long& result) {
    if (atom_gettype(&a) != A_LONG) return false;
    result = atom_getlong(&a);
    return result >= low && result <= high;
}
void midi(Native* x, t_atom_long b) {
    if (!begin(x)) return;
    if (b < 0 || b > 255 || x->output_overflow) ++x->rejected;
    else { x->engine().tick(x->time); x->engine().process_byte(static_cast<std::uint8_t>(b), x->time); }
    end(x);
}
void command(Native* x, t_symbol* selector, long argc, t_atom* argv) {
    if (!begin(x)) return;
    const char* name = selector->s_name;
    bool ok = false;
    t_atom_long v = 0;
    if (!argc && !std::strcmp(name, "panic")) { x->engine().panic(x->time); ok = true; }
    else if (!argc && !std::strcmp(name, "resetvoices")) { x->engine().reset_voice_history(x->time); ok = true; }
    else if (!argc && !std::strcmp(name, "resetensemble")) { x->engine().reset_ensemble(x->time); ok = true; }
    else if (!std::strcmp(name, "field") && argc >= 5 && argc <= 133) {
        // field version root source absoluteMask rawCount rawNotes...
        Field f;
        t_atom_long version, root, source, mask, count;
        if (integer(argv[0], 0, 0x7fffffff, version) && integer(argv[1], 0, 11, root)
            && integer(argv[2], 0, 2, source) && integer(argv[3], 0, 4095, mask)
            && integer(argv[4], 0, 128, count) && argc == 5 + count) {
            f.version = version; f.root = root; f.source = static_cast<Source>(source);
            f.pitch_classes = mask; f.raw_count = count; ok = true;
            for (int i = 0; i < count; ++i) {
                if (!integer(argv[5 + i], 0, 127, v)) { ok = false; break; }
                f.raw_notes[i] = v;
            }
            if (ok) ok = x->engine().set_field(f);
        }
    } else if (!std::strcmp(name, "chord") && argc >= 2 && argc <= 130) {
        Chord c;
        t_atom_long version, root;
        if (integer(argv[0], 0, 0x7fffffff, version) && integer(argv[1], 0, 11, root)) {
            c.version = version; c.root = root; c.count = argc - 2; ok = true;
            for (int i = 2; i < argc; ++i) {
                if (!integer(argv[i], 0, 127, v)) { ok = false; break; }
                c.notes[i - 2] = v;
            }
            if (ok) ok = x->engine().set_chord(c);
        }
    } else if (argc == 1 && !std::strcmp(name, "bypass") && integer(argv[0], 0, 1, v)) {
        x->engine().bypass(v != 0, x->time); ok = true;
    } else if (argc == 1 && !std::strcmp(name, "active") && integer(argv[0], 0, 1, v)) {
        if (!v) x->engine().panic(x->time);
        x->engine().bypass(!v, x->time); ok = true;
    } else if (argc == 1 && !std::strcmp(name, "motion")
               && (atom_gettype(argv) == A_LONG || atom_gettype(argv) == A_FLOAT)) {
        auto s = x->engine().settings(); s.motion = atom_getfloat(argv);
        ok = x->engine().set_settings(s, x->time);
    } else if (argc == 1 && integer(argv[0], 0, 127, v)) {
        auto s = x->engine().settings();
        if (!std::strcmp(name, "mode") && v < 8) { s.mode = static_cast<Mode>(v); ok = true; }
        else if (!std::strcmp(name, "chordmap") && v < 2) { s.chord_map = static_cast<ChordMap>(v); ok = true; }
        else if (!std::strcmp(name, "registermode") && v < 2) { s.register_mode = static_cast<RegisterMode>(v); ok = true; }
        else if (!std::strcmp(name, "timing") && v < 3) { s.change = static_cast<Change>(v); ok = true; }
        else if (!std::strcmp(name, "samepitch") && v < 2) { s.same_pitch = static_cast<SamePitch>(v); ok = true; }
        else if (!std::strcmp(name, "tiebreakup") && v < 2) { s.prefer_up = v != 0; ok = true; }
        else if (!std::strcmp(name, "gravity") && v < 3) { s.gravity = v; ok = true; }
        else if (!std::strcmp(name, "continuity") && v <= 100) { s.continuity = v; ok = true; }
        else if (!std::strcmp(name, "inputbehavior") && v < 2) { s.input_behavior = static_cast<InputBehavior>(v); ok = true; }
        else if (!std::strcmp(name, "stability") && v <= 100) { s.stability_ms = v; ok = true; }
        else if (!std::strcmp(name, "ensemble") && v <= 8) { s.ensemble = v; ok = true; }
        else if (!std::strcmp(name, "part") && v >= 1 && v <= 4) { s.part = v; ok = true; }
        else if (!std::strcmp(name, "separation") && v <= 100) { s.separation = v; ok = true; }
        else if (!std::strcmp(name, "low")) { s.low = v; if (s.high < s.low) s.high = s.low; ok = true; }
        else if (!std::strcmp(name, "high")) { s.high = v; if (s.low > s.high) s.low = s.high; ok = true; }
        if (ok) ok = x->engine().set_settings(s, x->time);
    }
    if (!ok) ++x->rejected; // unsupported controls never silently fall back
    end(x);
}
void status(Native* x) {
    if (!begin(x)) return;
    const auto& d = x->engine().diagnostics();
    t_atom atoms[8];
    const std::uint64_t values[] = {d.input_note_ons, d.output_note_ons, x->engine().mapping_count(),
        d.overflows, d.rejected_updates + x->rejected, x->reentrant,
        x->engine().faulted() || x->output_overflow, x->engine().has_pending_field()};
    for (int i = 0; i < 8; ++i) atom_setlong(atoms + i, static_cast<t_atom_long>(values[i]));
    outlet_anything(x->status_out, gensym("status"), 8, atoms);
    end(x);
}
void native_report(Native* x) {
    if (!begin(x)) return;
    Engine::Decision d;
    t_atom atoms[9];
    while (x->engine().pop_decision(d)) {
        const double values[] = {static_cast<double>(d.input), static_cast<double>(d.output),
            static_cast<double>(d.channel + 1), static_cast<double>(d.movement),
            d.input_cost, d.continuity_cost, d.direction_cost, d.collision_cost};
        for (int i = 0; i < 8; ++i) atom_setfloat(atoms + i, values[i]);
        outlet_anything(x->status_out, gensym("nativeevent"), 8, atoms);
    }
    const auto& f = x->engine().field();
    atom_setlong(atoms, f.pitch_classes); atom_setlong(atoms + 1, static_cast<int>(f.source));
    atom_setlong(atoms + 2, f.version); atom_setlong(atoms + 3, x->engine().root());
    outlet_anything(x->status_out, gensym("nativestate"), 4, atoms);
    atom_setlong(atoms, x->engine().settings().ensemble);
    for (int p = 1; p <= 4; ++p) {
        bool conflict = false;
        atom_setlong(atoms + p * 2 - 1, x->engine().ensemble_pitch(p, conflict));
        atom_setlong(atoms + p * 2, conflict);
    }
    outlet_anything(x->status_out, gensym("nativeensemble"), 9, atoms);
    atom_setlong(atoms, x->engine().faulted() || x->output_overflow);
    outlet_anything(x->status_out, gensym("nativefault"), 1, atoms);
    end(x);
}
void timer_tick(Native* x) {
    if (!begin(x)) return;
    x->engine().tick(x->time); end(x);
}
void destroy(Native* x) {
    if (begin(x)) { x->engine().panic(x->time); end(x); }
    clock_unset(x->timer); object_free(x->timer);
    x->engine().~Engine();
}
void* create(t_symbol*, long, t_atom*) {
    auto* x = static_cast<Native*>(object_alloc(native_class));
    if (!x) return nullptr;
    x->busy = false; x->rejected = x->reentrant = x->time = 0;
    x->output_size = 0; x->output_overflow = false;
    x->status_out = outlet_new(x, nullptr); // Max creates outlets right to left
    x->midi_out = intout(x);
    x->timer = clock_new(x, reinterpret_cast<method>(timer_tick));
    new (x->storage) Engine({x, capture}, &shared_ensemble);
    auto s = x->engine().settings();
    s.safe_lifecycle = true;
    s.mode = Mode::ChordMap;
    x->engine().set_settings(s);
    return x;
}
}

extern "C" C74_EXPORT void ext_main(void*) {
    auto* c = class_new("tetrachords.quantizer", reinterpret_cast<method>(create),
        reinterpret_cast<method>(destroy), sizeof(Native), nullptr, A_GIMME, 0);
    class_addmethod(c, reinterpret_cast<method>(midi), "int", A_LONG, 0);
    class_addmethod(c, reinterpret_cast<method>(command), "anything", A_GIMME, 0);
    class_addmethod(c, reinterpret_cast<method>(status), "status", 0);
    class_addmethod(c, reinterpret_cast<method>(native_report), "report", 0);
    class_register(CLASS_BOX, c); native_class = c;
}
