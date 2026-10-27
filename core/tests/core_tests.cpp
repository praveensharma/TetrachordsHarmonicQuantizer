#include "tetrachords/engine.hpp"

#include <algorithm>
#include <array>
#include <cassert>
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <new>

using namespace tetrachords;

static bool count_allocations = false;
static std::size_t allocations = 0;
void* operator new(std::size_t n) {
    if (count_allocations) ++allocations;
    if (void* p = std::malloc(n ? n : 1)) return p;
    throw std::bad_alloc();
}
void* operator new[](std::size_t n) { return ::operator new(n); }
void operator delete(void* p) noexcept { std::free(p); }
void operator delete[](void* p) noexcept { std::free(p); }

struct Capture {
    std::array<MidiEvent, 2048> events{};
    std::size_t size = 0;
    static void emit(void* context, const MidiEvent& e) noexcept {
        auto& c = *static_cast<Capture*>(context);
        assert(c.size < c.events.size());
        c.events[c.size++] = e;
    }
};

void note(Engine& e, int channel, int pitch, int velocity, bool on, std::uint64_t time = 0) {
    assert(e.process(MidiEvent{time, {{static_cast<std::uint8_t>((on ? 0x90 : 0x80) | channel),
        static_cast<std::uint8_t>(pitch), static_cast<std::uint8_t>(velocity)}}, 3}));
}

int main() {
    Capture out;
    Engine e({&out, &Capture::emit});
    auto s = e.settings();
    s.register_mode = RegisterMode::Free; s.change = Change::Immediate;
    assert(e.set_settings(s));
    Field field;
    field.pitch_classes = 0xab5;
    field.source = Source::MidiField;
    field.raw_count = 8;
    field.raw_notes = {{60, 62, 64, 65, 67, 69, 71, 72}};
    assert(e.set_field(field));
    assert(e.field().raw_count == 8 && e.field().raw_notes[7] == 72);
    Field repeated = field;
    repeated.version = 1; repeated.raw_count = 9; repeated.raw_notes[8] = 60;
    assert(e.set_field(repeated));
    assert(e.field().raw_count == 9 && e.field().raw_notes[8] == 60);
    auto bad = field;
    bad.version = 2; bad.raw_count = 129;
    assert(!e.set_field(bad));
    bad = field; bad.root = 12; assert(!e.set_field(bad));
    bad = field; bad.pitch_classes = 1; assert(!e.set_field(bad));
    bad = field; bad.raw_notes[0] = 255; assert(!e.set_field(bad));
    assert(e.field().version == 1 && e.diagnostics().rejected_updates == 4);
    Chord chord; chord.count = 129; assert(!e.set_chord(chord));
    chord.count = 1; chord.notes[0] = 255; assert(!e.set_chord(chord));
    auto invalid = s; invalid.low = 100; invalid.high = 20;
    assert(!e.set_settings(invalid));
    assert(!e.process(MidiEvent{0, {{144, 255, 100}}, 3}));
    assert(!e.process(MidiEvent{0, {{144, 60, 0}}, 2}));
    assert(!e.process(MidiEvent{0, {{60, 0, 0}}, 1}));

    // Independent mathematical oracle over every possible nonempty PC mask.
    std::uint64_t selections = 0;
    for (int mode = 0; mode < 2; ++mode) for (int tie = 0; tie < 2; ++tie) {
        s.mode = static_cast<Mode>(mode); s.prefer_up = tie != 0;
        assert(e.set_settings(s));
        chord = Chord{}; chord.count = 0; chord.version = mode * 2 + tie;
        assert(e.set_chord(chord));
        for (int mask = 1; mask < 4096; ++mask) {
            field = Field{}; field.version = static_cast<std::int64_t>(++selections);
            field.pitch_classes = mask;
            assert(e.set_field(field, true));
            for (int n = 0; n < 128; ++n) {
                int best = -1, distance = 999;
                for (int c = 0; c < 128; ++c) if (mask & (1 << (c % 12))) {
                    const int d = std::abs(c - n);
                    if (d < distance || (d == distance && ((tie && c > best) || (!tie && c < best)))) {
                        best = c; distance = d;
                    }
                }
                assert(e.quantize(n) == best);
            }
        }
    }

    field = Field{}; field.version = static_cast<std::int64_t>(++selections);
    field.pitch_classes = 0xab5; assert(e.set_field(field, true));
    s.mode = Mode::ScaleNearest; s.same_pitch = SamePitch::Retrigger;
    assert(e.set_settings(s));
    out.size = 0;
    note(e, 0, 61, 100, true); note(e, 0, 62, 90, true);
    assert(out.size == 3 && out.events[1].bytes[0] == 128);
    note(e, 0, 61, 0, false); assert(out.size == 3);
    note(e, 0, 62, 0, false); assert(out.size == 4 && e.mapping_count() == 0);

    // Overflow is intentionally safer than legacy's unbounded allocation.
    out.size = 0; s.same_pitch = SamePitch::Legato; assert(e.set_settings(s));
    for (std::size_t i = 0; i < Engine::mapping_capacity; ++i) note(e, 0, 60, 100, true);
    assert(e.mapping_count() == Engine::mapping_capacity);
    note(e, 0, 60, 100, true);
    assert(e.faulted() && e.mapping_count() == 0 && e.diagnostics().overflows == 1);
    const auto count = out.size;
    note(e, 1, 67, 100, true); note(e, 0, 60, 0, false);
    assert(out.size == count);
    assert(e.process(MidiEvent{0, {{0xb0, 1, 10}}, 3})); // non-note traffic remains alive
    e.panic(0); assert(!e.faulted());
    out.size = 0; note(e, 1, 67, 100, true); assert(out.size == 1);
    note(e, 1, 67, 0, false);

    // No new/delete in either note path, state updates, raw parsing or panic.
    count_allocations = true;
    field.version++;
    assert(e.set_field(field));
    assert(e.set_settings(s));
    for (auto b : {0xf0, 0x77, 0x01, 0xf8, 0xf7}) e.process_byte(b, 0);
    out.size = 0;
    for (std::size_t i = 0; i <= Engine::mapping_capacity; ++i) note(e, 0, 60, 100, true);
    e.panic(0);
    s.same_pitch = SamePitch::Retrigger;
    assert(e.set_settings(s));
    out.size = 0;
    note(e, 0, 60, 100, true); note(e, 0, 60, 100, true);
    note(e, 0, 60, 0, false); note(e, 0, 60, 0, false);
    const auto begin = std::chrono::steady_clock::now();
    for (int i = 0; i < 100000; ++i) {
        out.size = 0;
        note(e, i % 16, i % 128, 100, true, i);
        note(e, i % 16, i % 128, 0, false, i);
    }
    e.panic(100000);
    const auto end = std::chrono::steady_clock::now();
    count_allocations = false;
    assert(allocations == 0 && e.mapping_count() == 0);
    const double ms = std::chrono::duration<double, std::milli>(end - begin).count();
    std::printf("Core: exhaustive nearest oracle, state validation, retrigger, overflow/panic and 100000 allocation-free pairs passed.\n");
    std::printf("Engine storage: %zu bytes. Aggregate host processing: %.3f ms / 100000 pairs; NOT Live or hardware latency.\n", sizeof(Engine), ms);

    std::array<double, 10000> samples{};
    for (std::size_t i = 0; i < samples.size(); ++i) {
        out.size = 0;
        const auto start = std::chrono::steady_clock::now();
        note(e, i % 16, i % 128, 100, true, i);
        note(e, i % 16, i % 128, 0, false, i);
        samples[i] = std::chrono::duration<double, std::micro>(std::chrono::steady_clock::now() - start).count();
    }
    std::sort(samples.begin(), samples.end());
    std::printf("Host note-pair processing (microseconds, includes timer overhead): median %.3f, p95 %.3f, p99 %.3f, max %.3f.\n",
        samples[4999], samples[9499], samples[9899], samples.back());

    // Native policy intentionally diverges from legacy only at documented
    // ownership hazards. Field loss must never recalculate a held release.
    e.panic(0); out.size = 0;
    s.safe_lifecycle = true; s.same_pitch = SamePitch::Legato;
    assert(e.set_settings(s));
    field.version++; field.pitch_classes = 1; assert(e.set_field(field, true));
    note(e, 0, 61, 100, true); // C# -> C
    assert(out.events[0].bytes[1] == 60);
    field.version++; field.pitch_classes = 0; assert(e.set_field(field, true));
    note(e, 0, 61, 0, false);
    assert(out.size == 2 && out.events[1].bytes[1] == 60 && e.mapping_count() == 0);
    note(e, 0, 63, 100, true); // raw but still owned
    field.version++; field.pitch_classes = 1; assert(e.set_field(field, true));
    note(e, 0, 63, 0, false);
    assert(out.events[3].bytes[1] == 63 && e.mapping_count() == 0);
    note(e, 0, 61, 100, true);
    const auto before_orphan = out.size;
    note(e, 0, 62, 0, false); // would previously release the C owned by C#
    assert(out.size == before_orphan && e.mapping_count() == 1);
    e.bypass(true, 0); // retire old ownership but retain release identity
    note(e, 0, 61, 100, true); // new raw C#
    const auto before_late_off = out.size;
    note(e, 0, 61, 0, false); // old instance must not end new raw note
    assert(out.size == before_late_off);
    e.bypass(false, 0);
    note(e, 0, 61, 0, false);
    assert(out.events[out.size - 1].bytes[1] == 61 && e.mapping_count() == 0);
    // All newly added modes also remain allocation-free under sustained use.
    count_allocations = true;
    for (int mode = 0; mode < 8; ++mode) {
        s.mode = static_cast<Mode>(mode); assert(e.set_settings(s));
        for (int i = 0; i < 256; ++i) {
            out.size = 0; note(e, i % 16, i % 128, 100, true);
            note(e, i % 16, i % 128, 0, false);
        }
    }
    count_allocations = false;
    assert(allocations == 0 && e.mapping_count() == 0);
    std::puts("Native lifecycle: field loss/recovery, orphan release, bypass tombstones and eight allocation-free modes passed.");
    // The added scheduled/coordinated paths must also remain heap-free.
    Ensemble registry;
    Engine scheduled({&out, &Capture::emit}, &registry);
    s = scheduled.settings(); s.safe_lifecycle = true; s.register_mode = RegisterMode::Free;
    s.ensemble = 1; s.separation = 50; s.input_behavior = InputBehavior::Hold; s.stability_ms = 20;
    count_allocations = true;
    assert(scheduled.set_settings(s));
    field = Field{}; field.pitch_classes = 0xab5; assert(scheduled.set_field(field));
    for (int i = 0; i < 1000; ++i) {
        out.size = 0;
        const std::uint64_t time = static_cast<std::uint64_t>(i) * 30000;
        note(scheduled, i % 16, i % 128, 100, true, time);
        scheduled.tick(time + 20000); scheduled.tick(time + 24000);
    }
    out.size = 0; scheduled.panic(30000000);
    count_allocations = false;
    assert(allocations == 0 && scheduled.mapping_count() == 0);
    std::puts("Native scheduling/coordinator: 1000 Hold + Separation cycles also allocation-free.");
    // Intentional native safety fixes: never emit an invalid pitch due to a
    // missing chord ceiling, non-field gravity root, clamping or narrow window.
    e.panic(0); s = Settings{}; s.safe_lifecycle = true; s.change = Change::Immediate;
    s.register_mode = RegisterMode::Free; s.gravity = 2;
    field = Field{}; field.version = 999999; field.pitch_classes = 1; field.root = 3;
    assert(e.set_field(field,true));
    Chord empty; empty.version = 999999; assert(e.set_chord(empty));
    for(int mode=0;mode<8;++mode) {
        s.mode=static_cast<Mode>(mode); assert(e.set_settings(s));
        for(int n=0;n<128;++n) {const int q=e.quantize(n,127);assert(q>=0 && q%12==0);}
    }
    s.mode=Mode::ChordNearest; s.register_mode=RegisterMode::Limited;s.low=0;s.high=61;
    assert(e.set_settings(s));assert(e.quantize(100)==60);
    s.high=3;field.pitch_classes=0x800;field.version++;
    assert(e.set_field(field,true));assert(e.set_settings(s));assert(e.quantize(100)==-1);
    std::puts("Native pitch safety: chord fallback, arbitrary-field gravity, MIDI boundaries and impossible ceiling passed.");
    e.panic(0); s=Settings{};s.safe_lifecycle=true;s.mode=Mode::StatefulNearest;s.continuity=100;
    s.same_pitch=SamePitch::Retrigger;s.register_mode=RegisterMode::Free;assert(e.set_settings(s));
    field=Field{};field.version=1000001;field.pitch_classes=0x91;assert(e.set_field(field,true));
    e.bypass(true,0);out.size=0;note(e,0,60,100,true);note(e,0,60,100,true);
    assert(out.size==2&&out.events[0].bytes[0]==144&&out.events[1].bytes[0]==144);
    note(e,0,60,0,false);note(e,0,60,0,false);e.bypass(false,0);out.size=0;
    note(e,0,67,100,true);assert(out.events[0].bytes[1]==67);note(e,0,67,0,false);
    std::puts("Native bypass: no injected retrigger offs and no contamination of stateful pitch history passed.");
}
