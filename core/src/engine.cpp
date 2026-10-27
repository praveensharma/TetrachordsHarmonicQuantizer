#include "tetrachords/engine.hpp"

#include <algorithm>
#include <cstdlib>
#include <cmath>
#include <limits>

namespace tetrachords {
namespace {
int clamp_note(int n) noexcept { return std::max(0, std::min(127, n)); }
int mod(int n, int d) noexcept { return (n % d + d) % d; }
int js_round(double x) noexcept { return static_cast<int>(std::floor(x + 0.5)); }
int degrees(std::uint16_t mask, int root, std::array<int, 12>& out) noexcept {
    int count = 0;
    for (int d = 0; d < 12; ++d)
        if (mask & (1u << ((root + d) % 12))) out[count++] = d;
    return count;
}
int degree_index(int note, int root, const std::array<int, 12>& ds, int count) noexcept {
    int best = 0, distance = 99;
    for (int i = 0; i < count; ++i) {
        int d = std::abs(mod(note - root, 12) - ds[i]);
        d = std::min(d, 12 - d);
        if (d < distance) { distance = d; best = i; }
    }
    return best;
}
bool contains(std::uint16_t mask, int n) noexcept {
    return (mask & (1u << (n % 12))) != 0;
}
int nearby_pc(int note, int pc) noexcept {
    const int base = 12 * (note / 12) + pc;
    int result = base - 12;
    for (int n : {base, base + 12})
        if (std::abs(n - note) < std::abs(result - note)) result = n;
    return clamp_note(result);
}
}

Engine::Engine(Sink sink, Ensemble* ensemble) noexcept : sink_(sink), ensemble_(ensemble) {
    if (ensemble_ && !ensemble_->attach(this)) { ensemble_ = nullptr; faulted_ = true; ++diagnostics_.overflows; }
}
Engine::~Engine() noexcept { if (ensemble_) ensemble_->detach(this); }

bool Engine::set_settings(const Settings& s, std::uint64_t time) noexcept {
    if (static_cast<int>(s.mode) > 7 || static_cast<int>(s.register_mode) > 1
        || static_cast<int>(s.change) > 2 || static_cast<int>(s.same_pitch) > 1
        || static_cast<int>(s.chord_map) > 1 || s.continuity > 100
        || !std::isfinite(s.motion) || std::abs(s.motion) > 100
        || s.low > s.high || s.high > 127 || s.gravity > 2
        || static_cast<int>(s.input_behavior) > 1 || s.stability_ms > 100
        || s.ensemble > 8 || s.part < 1 || s.part > 4 || s.separation > 100
        || (s.ensemble && !ensemble_)) return false;
    if (s.ensemble != settings_.ensemble || s.part != settings_.part
        || s.input_behavior != settings_.input_behavior) flush(time, true);
    if (s.input_behavior != settings_.input_behavior) {
        stable_ = {}; release_all(time, false);
    }
    settings_ = s;
    if (s.change == Change::Immediate) apply_pending();
    if (!s.stability_ms) {
        for (std::uint8_t ch = 0; ch < 16; ++ch) if (stable_[ch].used) {
            auto pending = stable_[ch]; stable_[ch].used = false;
            prepare_on(ch, pending.input, pending.velocity, time);
        }
    }
    return true;
}

bool Engine::set_field(const Field& f, bool force) noexcept {
    bool valid = f.root < 12 && f.version >= 0 && f.raw_count <= f.raw_notes.size()
        && f.pitch_classes <= 0xfff && static_cast<int>(f.source) <= 2;
    std::uint16_t raw_mask = 0;
    if (valid) {
        for (std::size_t i = 0; i < f.raw_count; ++i) {
            if (f.raw_notes[i] > 127) { valid = false; break; }
            raw_mask |= static_cast<std::uint16_t>(1u << (f.raw_notes[i] % 12));
        }
        if (f.raw_count && raw_mask != f.pitch_classes) valid = false;
    }
    if (!valid) { ++diagnostics_.rejected_updates; return false; }
    if (f.version == last_field_version_ && !force) return true;
    last_field_version_ = f.version;
    if (force || !field_.pitch_classes || !f.pitch_classes
        || settings_.change == Change::Immediate) activate(f);
    else { pending_ = f; pending_field_ = true; }
    return true;
}

bool Engine::set_chord(const Chord& c) noexcept {
    bool valid = c.version >= 0 && c.root < 12 && c.count <= c.notes.size();
    std::uint16_t mask = 0;
    if (valid) for (std::size_t i = 0; i < c.count; ++i) {
        if (c.notes[i] > 127) { valid = false; break; }
        mask |= static_cast<std::uint16_t>(1u << (c.notes[i] % 12));
    }
    if (!valid) { ++diagnostics_.rejected_updates; return false; }
    if (c.version == last_chord_version_) return true;
    last_chord_version_ = c.version;
    chord_ = c;
    chord_mask_ = mask;
    root_ = c.root; // legacy chord metadata can update root independently
    return true;
}

void Engine::activate(const Field& f) noexcept {
    field_ = f;
    root_ = f.root;
    pending_field_ = false;
}
void Engine::apply_pending() noexcept { if (pending_field_) activate(pending_); }

int Engine::nearest(int note, std::uint16_t mask) const noexcept {
    if (!mask || contains(mask, note)) return note;
    for (int distance = 1; distance <= 12; ++distance) {
        const int down = note - distance, up = note + distance;
        const bool dl = down >= 0 && contains(mask, down);
        const bool ul = up <= 127 && contains(mask, up);
        if (dl && ul) return settings_.prefer_up ? up : down;
        if (dl) return down;
        if (ul) return up;
    }
    return note;
}

int Engine::gravity(int note, std::uint8_t velocity) const noexcept {
    if (!settings_.gravity || velocity < (settings_.gravity == 2 ? 64 : 96)) return note;
    int fifth = 0, distance = 99;
    for (int degree = 0; degree < 12; ++degree) {
        if (contains(field_.pitch_classes, (root_ + degree) % 12)
            && std::abs(degree - 7) < distance) {
            fifth = degree;
            distance = std::abs(degree - 7);
        }
    }
    const int root_note = nearby_pc(note, root_);
    const int fifth_note = nearby_pc(note, (root_ + fifth) % 12);
    const int candidate = std::abs(root_note - note) <= std::abs(fifth_note - note)
        ? root_note : fifth_note;
    return std::abs(candidate - note) <= (settings_.gravity == 2 ? 4 : 2) ? candidate : note;
}

int Engine::constrain(int note) const noexcept {
    int result = note, guard = 0;
    while (result < settings_.low && guard < 12) { result += 12; ++guard; }
    while (result > settings_.high && guard < 24) { result -= 12; ++guard; }
    if (result < settings_.low || result > settings_.high) {
        result = std::max<int>(settings_.low, std::min<int>(settings_.high, note));
        int distance = 999;
        for (int n = settings_.low; n <= settings_.high; ++n)
            if (contains(field_.pitch_classes, n) && std::abs(n - note) < distance) {
                result = n; distance = std::abs(n - note);
            }
    }
    return clamp_note(result);
}

int Engine::mapped(int note, std::uint16_t mask) const noexcept {
    std::array<int, 12> ds{};
    const int count = degrees(mask, root_, ds);
    if (!count) return note;
    const int index = js_round((note % 12) * (count - 1) / 11.0);
    int result = 12 * (note / 12) + (root_ + ds[index]) % 12;
    while (result > 127) result -= 12;
    return result;
}

int Engine::chord_map(int note) const noexcept {
    if (!chord_.count) return nearest(note, field_.pitch_classes);
    const int selector = note % 12, octave = 12 * (note / 12);
    if (settings_.chord_map == ChordMap::Voicing) {
        // JS normalizes exact duplicates and sorts chord notes on receipt.
        auto notes = chord_.notes;
        std::sort(notes.begin(), notes.begin() + chord_.count);
        const int count = static_cast<int>(std::unique(notes.begin(), notes.begin() + chord_.count) - notes.begin());
        return notes[selector % count] + 12 * js_round((octave - notes[0]) / 12.0)
            + 12 * (selector / count);
    }
    std::array<int, 12> ds{};
    const int count = degrees(chord_mask_, root_, ds);
    return octave + root_ + ds[selector % count] + 12 * (selector / count);
}

int Engine::contour(int note, std::uint8_t channel) noexcept {
    std::array<int, 12> ds{};
    const int count = degrees(field_.pitch_classes, root_, ds);
    if (!count) return note;
    auto& prior = contours_[channel];
    int result = mapped(note, field_.pitch_classes);
    if (prior.valid) {
        const int delta = note - prior.input;
        const int step = delta == 0 ? 0 : (delta > 0 ? 1 : -1)
            * std::max(1, js_round(std::abs(delta) * count / 12.0));
        const int index = prior.degree + step;
        const int turns = static_cast<int>(std::floor(index / static_cast<double>(count)));
        const int pc = (root_ + ds[mod(index, count)]) % 12;
        const int target = prior.output + delta;
        const int base = 12 * static_cast<int>(std::floor(target / 12.0)) + pc + turns * 12;
        result = base - 12;
        for (int n : {base, base + 12})
            if (std::abs(n - target) < std::abs(result - target)) result = n;
        result = clamp_note(result);
    }
    prior = Voice{note, result, degree_index(result, root_, ds, count), field_.version, true};
    return result;
}

int Engine::stateful(int note, std::uint8_t channel) const noexcept {
    const auto& prior = voices_[channel];
    if ((!prior.valid || !settings_.continuity) && settings_.motion == 0)
        return nearest(note, field_.pitch_classes);
    int best = -1, input_distance = 999, prior_distance = 999;
    double score = std::numeric_limits<double>::infinity();
    const int low = settings_.register_mode == RegisterMode::Limited ? settings_.low : 0;
    const int high = settings_.register_mode == RegisterMode::Limited ? settings_.high : 127;
    for (int n = low; n <= high; ++n) if (contains(field_.pitch_classes, n)) {
        const int di = std::abs(n - note), dp = prior.valid ? std::abs(n - prior.output) : 0;
        double continuity_cost = 0, direction_cost = 0;
        if (prior.valid && settings_.continuity) {
            const double continuity = settings_.continuity / 100.0;
            continuity_cost = 3 * continuity * dp * dp;
            if (prior.version != field_.version && n == prior.output) continuity_cost -= 64 * continuity;
        }
        if (prior.valid && (n - prior.output) * settings_.motion < 0)
            direction_cost = 12 * std::abs(settings_.motion / 100.0) * std::min(dp, 4) / 4;
        const double cost = di * di + continuity_cost + direction_cost;
        if (cost < score || (cost == score && (di < input_distance
            || (di == input_distance && (dp < prior_distance || (dp == prior_distance
                && (settings_.prefer_up ? n > best : n < best))))))) {
            best = n; score = cost; input_distance = di; prior_distance = dp;
        }
    }
    if (best >= 0) return best;
    if (settings_.motion != 0 && settings_.register_mode == RegisterMode::Limited) return -1;
    return nearest(note, field_.pitch_classes);
}

int Engine::quantize(std::uint8_t input, std::uint8_t velocity, std::uint8_t channel) noexcept {
    if (channel > 15) return -1;
    const int note = clamp_note(input);
    const auto mask = (settings_.mode == Mode::ChordNearest || settings_.mode == Mode::ChordMap) && chord_mask_
        ? chord_mask_ : field_.pitch_classes;
    if (!mask) return note;
    int result = nearest(note, mask);
    switch (settings_.mode) {
    case Mode::ChordMap: result = chord_map(note); break;
    case Mode::ScaleMap: result = mapped(note, mask); break;
    case Mode::ScaleContour: result = contour(note, channel); break;
    case Mode::StatefulNearest: result = stateful(note, channel); break;
    case Mode::ScaleUp:
    case Mode::ScaleDown:
        for (int d = 0; d <= 12; ++d) {
            const int n = note + (settings_.mode == Mode::ScaleUp ? d : -d);
            if (n >= 0 && n <= 127 && contains(mask, n)) { result = n; break; }
        }
        break;
    default: break;
    }
    if (result < 0 && settings_.mode == Mode::StatefulNearest) return -1;
    if (settings_.mode != Mode::ChordMap && settings_.mode != Mode::ChordNearest) {
        const int attracted = gravity(result, velocity);
        if (!settings_.safe_lifecycle || contains(mask, attracted)) result = attracted;
    }
    const auto finish = [&](int candidate, bool use_low) {
        if (!settings_.safe_lifecycle) return clamp_note(candidate);
        const int low = use_low && settings_.register_mode == RegisterMode::Limited ? settings_.low : 0;
        const int high = settings_.register_mode == RegisterMode::Limited ? settings_.high : 127;
        if (candidate >= low && candidate <= high && contains(mask, candidate)) return candidate;
        int best = -1, distance = 999;
        for (int n = low; n <= high; ++n) if (contains(mask, n)) {
            const int d = std::abs(n - candidate);
            if (d < distance || (d == distance && (settings_.prefer_up ? n > best : n < best))) {
                best = n; distance = d;
            }
        }
        return best; // no legal pitch inside a hard window: explicit silent owner
    };
    if (settings_.register_mode == RegisterMode::Free) return finish(result, false);
    const bool nearest_register = settings_.mode == Mode::ScaleNearest || settings_.mode == Mode::ChordNearest
        || (settings_.mode == Mode::StatefulNearest && (!voices_[channel].valid || !settings_.continuity)
            && settings_.motion == 0);
    if (!nearest_register) return finish(constrain(result), true);
    if (result <= settings_.high) return finish(result, false);
    if (settings_.safe_lifecycle) return finish(result, false);
    // Legacy Chord Nearest falls back to the field for selection but its ceiling
    // helper still uses the (empty) chord and returns High without re-quantizing.
    if (settings_.mode == Mode::ChordNearest && !chord_mask_) return settings_.high;
    // Preserve nearest-mode low notes; High is a safety ceiling, not folding.
    for (int n = settings_.high; n >= 0; --n) if (contains(mask, n)) return n;
    return settings_.high; // explicit legacy fallback if no pitch exists below High
}

void Engine::send(std::uint64_t time, std::uint8_t s, std::uint8_t a,
                  std::uint8_t b, std::uint8_t size) noexcept {
    if (size == 3 && (s & 0xf0) == 0x90 && b) ++diagnostics_.output_note_ons;
    if (sink_.emit) sink_.emit(sink_.context, MidiEvent{time, {{s, a, b}}, size});
}

void Engine::note_on(std::uint8_t ch, std::uint8_t input, std::uint8_t vel,
                     std::uint64_t time) noexcept {
    if (settings_.change == Change::NextNote) apply_pending();
    const int chosen = settings_.safe_lifecycle && (!enabled_ || !field_.pitch_classes)
        ? input : quantize(input, vel, ch);
    deliver(ch, input, vel, chosen, time);
}

void Engine::deliver(std::uint8_t ch, std::uint8_t input, std::uint8_t vel,
                     int chosen, std::uint64_t time, bool remember, double collision) noexcept {
    if (chosen >= 0 && enabled_ && field_.pitch_classes && settings_.input_behavior == InputBehavior::Hold)
        release_held(ch, time);
    Mapping* slot = nullptr;
    for (auto& m : mappings_) if (!m.used) { slot = &m; break; }
    if (!slot) {
        capacity_fault(time);
        return;
    }
    if (chosen < 0) {
        *slot = Mapping{++serial_, ch, input, -1, true};
        ++mapping_count_;
        return;
    }
    const auto output = static_cast<std::uint8_t>(chosen);
    auto& state = outputs_[ch * 128 + output];
    if (enabled_ && field_.pitch_classes && settings_.same_pitch == SamePitch::Retrigger && state.owners) {
        for (auto& m : mappings_)
            if (m.used && m.channel == ch && m.output == output) m.output = -1;
        state.owners = 0;
        send(time, 0x80 | ch, output, 0);
    }
    *slot = Mapping{++serial_, ch, input, output, true};
    ++mapping_count_;
    if (!state.owners) state.order = serial_;
    ++state.owners;
    auto decision = costs(output, input, ch);
    decision.collision_cost = collision;
    decision.movement = voices_[ch].valid ? output - voices_[ch].output : 0;
    if (remember && enabled_ && field_.pitch_classes) voices_[ch] = Voice{input, output, 0, field_.version, true};
    last_output_ = output;
    if (decision_size_ == decisions_.size()) { decision_begin_ = (decision_begin_ + 1) % decisions_.size(); --decision_size_; }
    decisions_[(decision_begin_ + decision_size_++) % decisions_.size()] = decision;
    send(time, 0x90 | ch, output, vel);
}

void Engine::release(std::uint8_t ch, int note, std::uint8_t vel, std::uint64_t time) noexcept {
    auto& output = outputs_[ch * 128 + static_cast<std::size_t>(note)];
    if (output.owners > 1) { --output.owners; return; }
    output.owners = 0;
    send(time, 0x80 | ch, static_cast<std::uint8_t>(note), vel);
}

void Engine::note_off(std::uint8_t ch, std::uint8_t input, std::uint8_t vel,
                      std::uint64_t time) noexcept {
    Mapping* first = nullptr;
    for (auto& m : mappings_)
        if (m.used && m.channel == ch && m.input == input && (!first || m.order < first->order)) first = &m;
    int output;
    if (first) {
        output = first->output;
        first->used = false;
        --mapping_count_;
        if (output < 0) return;
    } else {
        if (settings_.safe_lifecycle) return; // never release another note's owner
        output = quantize(input, 0, ch); // documented legacy orphan-off fallback
    }
    if (output < 0) return;
    release(ch, output, vel, time);
}

void Engine::release_all(std::uint64_t time, bool keep_tombstones) noexcept {
    // Match JS insertion order, including re-insertions after a prior release.
    for (;;) {
        std::size_t selected = outputs_.size();
        std::uint64_t first = std::numeric_limits<std::uint64_t>::max();
        for (std::size_t i = 0; i < outputs_.size(); ++i)
            if (outputs_[i].owners && outputs_[i].order < first) {
                selected = i; first = outputs_[i].order;
            }
        if (selected == outputs_.size()) break;
        auto& output = outputs_[selected];
        for (std::uint16_t i = 0; i < output.owners; ++i)
            send(time, 0x80 | static_cast<std::uint8_t>(selected / 128), selected % 128, 0);
        output.owners = 0;
    }
    for (auto& m : mappings_) {
        if (keep_tombstones && m.used) m.output = -1;
        else m.used = false;
    }
    if (!keep_tombstones) mapping_count_ = 0;
}

void Engine::bypass(bool bypassed, std::uint64_t time) noexcept {
    if (enabled_ && bypassed) {
        if (!settings_.safe_lifecycle) flush(time, true);
        stable_ = {};
        release_all(time, settings_.safe_lifecycle);
        // Canceled queued Ons still need FIFO identities for their later offs.
        // Offs already accepted into the queue consume their retired owners now.
        while (queue_size_) {
            const auto q = queue_[queue_begin_];
            queue_begin_ = (queue_begin_ + 1) % queue_.size(); --queue_size_;
            if (q.on) {
                Mapping* slot = nullptr;
                for (auto& m : mappings_) if (!m.used) { slot = &m; break; }
                if (!slot) { capacity_fault(time); break; }
                *slot = Mapping{++serial_, q.channel, q.input, -1, true}; ++mapping_count_;
            } else note_off(q.channel, q.input, q.velocity, time);
        }
        queue_begin_ = queue_size_ = 0;
    }
    enabled_ = !bypassed;
}
void Engine::panic(std::uint64_t time) noexcept {
    stable_ = {}; queue_begin_ = queue_size_ = 0;
    release_all(time);
    reset_voice_history();
    contours_ = {};
    faulted_ = false;
    for (std::uint8_t ch = 0; ch < 16; ++ch) {
        send(time, 0xb0 | ch, 123, 0);
        send(time, 0xe0 | ch, 0, 64);
    }
}

void Engine::reset_voice_history(std::uint64_t time) noexcept { flush(time, true); voices_ = {}; }

void Engine::channel_message(std::uint8_t s, std::uint8_t a, std::uint8_t b,
                             std::uint64_t time) noexcept {
    const auto type = s & 0xf0;
    const bool on = type == 0x90 && b > 0;
    const bool off = type == 0x80 || (type == 0x90 && b == 0);
    if (on) ++diagnostics_.input_note_ons;
    if (faulted_ && (on || off)) return;
    // Exact legacy message-level behavior: an empty field bypasses even if a
    // chord is available, and does not migrate outstanding transformed owners.
    if ((!enabled_ || !field_.pitch_classes) && !settings_.safe_lifecycle) {
        send(time, s, a, b, (type == 0xc0 || type == 0xd0) ? 2 : 3);
    } else if (on) accept_on(s & 15, a, b, time);
    else if (off) {
        if (enabled_ && field_.pitch_classes && settings_.input_behavior == InputBehavior::Hold) return;
        if (settings_.ensemble && settings_.separation && enabled_ && field_.pitch_classes) {
            Queued q; q.channel = s & 15; q.input = a; q.velocity = b; q.due = time + 4000;
            q.ready = true; enqueue(q, time);
        } else note_off(s & 15, a, b, time);
    }
    else send(time, s, a, b, (type == 0xc0 || type == 0xd0) ? 2 : 3);
}

void Engine::clear_parser() noexcept {
    running_status_ = -1;
    channel_count_ = expected_ = system_remaining_ = 0;
}
void Engine::process_byte(std::uint8_t b, std::uint64_t time) noexcept {
    if (b >= 0xf8) {
        if (b == 0xf8) {
            clock_ticks_ = (clock_ticks_ + 1) % 96;
            if (!clock_ticks_ && settings_.change == Change::NextBar) apply_pending();
        } else if (b == 0xfa) clock_ticks_ = 0;
        send(time, b, 0, 0, 1);
        return;
    }
    if (in_sysex_) {
        send(time, b, 0, 0, 1);
        if (b == 0xf7) in_sysex_ = false;
        return;
    }
    if (b == 0xf0) { clear_parser(); in_sysex_ = true; send(time, b, 0, 0, 1); return; }
    if (b >= 0xf0) {
        clear_parser();
        system_remaining_ = (b == 0xf1 || b == 0xf3) ? 1 : (b == 0xf2 ? 2 : 0);
        send(time, b, 0, 0, 1);
        return;
    }
    if (b >= 0x80) {
        running_status_ = b;
        channel_count_ = system_remaining_ = 0;
        expected_ = ((b & 0xf0) == 0xc0 || (b & 0xf0) == 0xd0) ? 1 : 2;
        return;
    }
    if (system_remaining_) { --system_remaining_; send(time, b, 0, 0, 1); return; }
    if (running_status_ < 0 || !expected_) return;
    channel_data_[channel_count_++] = b;
    if (channel_count_ < expected_) return;
    channel_message(static_cast<std::uint8_t>(running_status_), channel_data_[0],
                    expected_ == 1 ? 0 : channel_data_[1], time);
    channel_count_ = 0;
}

bool Engine::process(const MidiEvent& e) noexcept {
    if (!e.size || e.size > 3 || e.bytes[0] < 0x80 || e.bytes[0] == 0xf0) return false;
    const auto s = e.bytes[0];
    const int expected = s < 0xf0 ? (((s & 0xf0) == 0xc0 || (s & 0xf0) == 0xd0) ? 2 : 3)
        : ((s == 0xf1 || s == 0xf3) ? 2 : (s == 0xf2 ? 3 : 1));
    if (e.size != expected) return false;
    for (std::size_t i = 1; i < e.size; ++i) if (e.bytes[i] > 127) return false;
    for (std::size_t i = 0; i < e.size; ++i) process_byte(e.bytes[i], e.time_us);
    return true;
}

void Engine::capacity_fault(std::uint64_t time) noexcept {
    ++diagnostics_.overflows; stable_ = {}; queue_begin_ = queue_size_ = 0;
    release_all(time); faulted_ = true;
}

void Engine::release_held(std::uint8_t channel, std::uint64_t time) noexcept {
    for (auto& m : mappings_) if (m.used && m.channel == channel) {
        if (m.output >= 0) release(channel, m.output, 0, time);
        m.used = false; --mapping_count_;
    }
}

void Engine::accept_on(std::uint8_t ch, std::uint8_t input, std::uint8_t vel, std::uint64_t time) noexcept {
    if (enabled_ && field_.pitch_classes && settings_.input_behavior == InputBehavior::Hold && settings_.stability_ms) {
        auto& pending = stable_[ch];
        if (!pending.used || pending.input != input)
            pending = Stable{true, input, vel, time + settings_.stability_ms * 1000u};
        else pending.velocity = vel; // repeated reports confirm, never restart timer
    } else prepare_on(ch, input, vel, time);
}

Engine::Decision Engine::costs(int candidate, int input, std::uint8_t ch) const noexcept {
    Decision result; result.input = input; result.output = candidate; result.channel = ch;
    const int di = std::abs(candidate - input);
    result.input_cost = di * di;
    const auto& prior = voices_[ch];
    if (settings_.mode == Mode::StatefulNearest && prior.valid) {
        const int dp = std::abs(candidate - prior.output);
        if (settings_.continuity) {
            const double c = settings_.continuity / 100.0;
            result.continuity_cost = 3 * c * dp * dp;
            if (prior.version != field_.version && candidate == prior.output && contains(field_.pitch_classes, candidate))
                result.continuity_cost -= 64 * c;
        }
        if ((candidate - prior.output) * settings_.motion < 0)
            result.direction_cost = 12 * std::abs(settings_.motion / 100.0) * std::min(dp, 4) / 4;
    }
    return result;
}

bool Engine::enqueue(const Queued& q, std::uint64_t time) noexcept {
    if (queue_size_ == queue_.size()) { capacity_fault(time); return false; }
    queue_[(queue_begin_ + queue_size_++) % queue_.size()] = q;
    return true;
}

void Engine::prepare_on(std::uint8_t ch, std::uint8_t input, std::uint8_t velocity, std::uint64_t time) noexcept {
    if (faulted_) return;
    if (!settings_.ensemble || !settings_.separation || !enabled_ || !field_.pitch_classes) {
        note_on(ch, input, velocity, time); return;
    }
    if (settings_.change == Change::NextNote) apply_pending();
    const int base = quantize(input, velocity, ch);
    if (base < 0) { deliver(ch, input, velocity, base, time); return; }
    Queued q; q.channel = ch; q.input = input; q.velocity = velocity;
    q.on = true; q.output = base; q.due = time + 4000; q.part = settings_.part;
    q.separation = settings_.separation; q.upward = settings_.prefer_up;
    auto& group = ensemble_->groups_[settings_.ensemble];
    std::size_t pending_count = 0;
    for (const auto* e : ensemble_->members_) if (e && e->settings_.ensemble == settings_.ensemble)
        pending_count += e->queue_size_;
    if (pending_count >= 512) { capacity_fault(time); return; }
    q.epoch = group.epoch; q.serial = ++ensemble_->serial_;
    const auto add = [&](int n) {
        auto c = costs(n, input, ch);
        q.options[q.option_count++] = Option{n, c.input_cost + c.continuity_cost + c.direction_cost};
    };
    add(base);
    const auto mask = (settings_.mode == Mode::ChordMap || settings_.mode == Mode::ChordNearest) && chord_mask_
        ? chord_mask_ : field_.pitch_classes;
    for (int n = std::max(0, base - 6); n <= std::min(127, base + 6); ++n) {
        if (n == base || !contains(mask, n)) continue;
        if (settings_.register_mode == RegisterMode::Limited && (n < settings_.low || n > settings_.high)) continue;
        if (settings_.mode == Mode::ScaleUp && n < input) continue;
        if (settings_.mode == Mode::ScaleDown && n > input) continue;
        add(n);
    }
    if (enqueue(q, time) && !group.deadline) group.deadline = q.due;
}

void Engine::flush(std::uint64_t time, bool force) noexcept {
    if (!queue_size_) return;
    if (settings_.ensemble && ensemble_) {
        auto& g = ensemble_->groups_[settings_.ensemble];
        if (force || (g.deadline && time >= g.deadline)) ensemble_->resolve(settings_.ensemble);
    }
    while (queue_size_) {
        auto q = queue_[queue_begin_];
        if (!q.ready || (!force && time < q.due)) break;
        queue_begin_ = (queue_begin_ + 1) % queue_.size(); --queue_size_;
        if (q.on) {
            const bool remember = !ensemble_ || q.epoch == ensemble_->groups_[settings_.ensemble].epoch;
            deliver(q.channel, q.input, q.velocity, q.output, time, remember, q.collision_cost);
        } else note_off(q.channel, q.input, q.velocity, time);
        if (faulted_) break;
    }
}

void Engine::tick(std::uint64_t time) noexcept {
    for (std::uint8_t ch = 0; ch < 16; ++ch) if (stable_[ch].used && time >= stable_[ch].due) {
        auto pending = stable_[ch]; stable_[ch].used = false;
        prepare_on(ch, pending.input, pending.velocity, time);
    }
    flush(time);
}

std::uint64_t Engine::next_due() const noexcept {
    auto due = std::numeric_limits<std::uint64_t>::max();
    for (const auto& s : stable_) if (s.used) due = std::min(due, s.due);
    if (queue_size_) due = std::min(due, queue_[queue_begin_].due);
    return due;
}

bool Engine::pop_decision(Decision& result) noexcept {
    if (!decision_size_) return false;
    result = decisions_[decision_begin_]; decision_begin_ = (decision_begin_ + 1) % decisions_.size(); --decision_size_;
    return true;
}

bool Ensemble::attach(Engine* engine) noexcept {
    for (auto& member : members_) if (!member) { member = engine; return true; }
    return false;
}
void Ensemble::detach(Engine* engine) noexcept { for (auto& m : members_) if (m == engine) m = nullptr; }

void Ensemble::resolve(std::uint8_t group) noexcept {
    auto& g = groups_[group];
    std::array<std::uint16_t, 5> counts{};
    for (auto* e : members_) if (e && e->settings_.ensemble == group) ++counts[e->settings_.part];
    bool resolved = false;
    // Selection scan is bounded by 64 engines x 512 queued events; no heap sort.
    for (;;) {
        Engine* owner = nullptr; Engine::Queued* selected = nullptr;
        int best_rank = 99;
        for (auto* e : members_) if (e && e->settings_.ensemble == group) {
            for (std::size_t i = 0; i < e->queue_size_; ++i) {
                auto& job = e->queue_[(e->queue_begin_ + i) % e->queue_.size()];
                if (!job.on || job.ready) continue;
                const int rank = (job.part + 4 - g.priority) % 4;
                if (!selected || rank < best_rank || (rank == best_rank && job.serial < selected->serial)) {
                    selected = &job; owner = e; best_rank = rank;
                }
            }
        }
        if (!selected) break;
        auto& job = *selected;
        double best_cost = std::numeric_limits<double>::infinity(), penalty = 0;
        int best = job.output;
        for (int i = 0; i < job.option_count; ++i) {
            const auto& candidate = job.options[i];
            if (counts[job.part] > 1 && i > 0) continue;
            double collision = 0;
            if (counts[job.part] == 1) for (auto* e : members_) if (e && e->settings_.ensemble == group) {
                if (e != owner) {
                    bool active = false;
                    for (int ch = 0; ch < 16; ++ch)
                        if (e->outputs_[ch * 128 + candidate.note].owners) { active = true; break; }
                    if (active) collision += 36 * job.separation / 100.0;
                }
                // Planned events also occupy a pitch, as in the JS allocator.
                for (std::size_t k = 0; k < e->queue_size_; ++k) {
                    const auto& planned = e->queue_[(e->queue_begin_ + k) % e->queue_.size()];
                    if (planned.on && planned.ready && planned.output == candidate.note)
                        collision += 36 * job.separation / 100.0;
                }
            }
            const double cost = candidate.cost + collision;
            if (cost < best_cost || (cost == best_cost && (job.upward ? candidate.note > best : candidate.note < best))) {
                best_cost = cost; best = candidate.note; penalty = collision;
            }
        }
        job.output = best; job.collision_cost = penalty; job.ready = true; resolved = true;
    }
    if (resolved) g.priority = g.priority % 4 + 1;
    g.deadline = 0;
}

void Engine::reset_ensemble(std::uint64_t time) noexcept {
    if (!settings_.ensemble || !ensemble_) { flush(time, true); reset_voice_history(); return; }
    // Resolve all choices, but emit only this engine's MIDI from this call.
    // Other hosts drain their own events on their already-scheduled timers.
    flush(time, true);
    ++ensemble_->groups_[settings_.ensemble].epoch;
    for (auto* e : ensemble_->members_) if (e && e->settings_.ensemble == settings_.ensemble) {
        e->voices_ = {}; e->contours_ = {}; e->last_output_ = -1;
    }
}

int Engine::ensemble_pitch(std::uint8_t part, bool& conflict) const noexcept {
    conflict = false; int note = -1, count = 0;
    if (settings_.ensemble && ensemble_) for (const auto* e : ensemble_->members_)
        if (e && e->settings_.ensemble == settings_.ensemble && e->settings_.part == part) {
            ++count; note = e->last_output_;
        }
    conflict = count > 1; return count == 1 ? note : -1;
}

} // namespace tetrachords
