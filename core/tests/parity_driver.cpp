#include "tetrachords/engine.hpp"

#include <iostream>
#include <sstream>
#include <string>
#include <vector>

using namespace tetrachords;

struct Capture {
    std::vector<int> bytes;
    std::uint64_t expected_time = 0;
    bool timestamp_ok = true;
    static void emit(void* context, const MidiEvent& e) noexcept {
        auto& c = *static_cast<Capture*>(context);
        c.timestamp_ok = c.timestamp_ok && e.time_us == c.expected_time;
        for (std::size_t i = 0; i < e.size; ++i) c.bytes.push_back(e.bytes[i]);
    }
};

// Host-only text protocol. Streams/vectors/JSON never enter the realtime library.
int main() {
    Capture capture;
    capture.bytes.reserve(4096);
    Engine engine({&capture, &Capture::emit});
    std::string line;
    std::size_t step = 0;
    while (std::getline(std::cin, line)) {
        std::istringstream input(line);
        std::uint64_t time = 0;
        std::string op;
        if (!(input >> time >> op) || time < capture.expected_time) return 2;
        capture.expected_time = time;
        capture.bytes.clear();
        auto s = engine.settings();
        int value = 0, probe = -1;
        if (op == "field") {
            Field f;
            int root = 0, source = 0, mask = 0, count = 0;
            if (!(input >> f.version >> root >> source >> mask >> count)
                || root < 0 || root > 11 || source < 0 || source > 2
                || mask < 0 || mask > 4095 || count < 0 || count > 128) return 2;
            f.root = root; f.source = static_cast<Source>(source);
            f.pitch_classes = mask; f.raw_count = count;
            for (int i = 0; i < count; ++i) {
                if (!(input >> value) || value < 0 || value > 127) return 2;
                f.raw_notes[i] = value;
            }
            if (!engine.set_field(f)) return 2;
        } else if (op == "chord") {
            Chord c;
            int root = 0, count = 0;
            if (!(input >> c.version >> root >> count) || root < 0 || root > 11
                || count < 0 || count > 128) return 2;
            c.root = root; c.count = count;
            for (int i = 0; i < count; ++i) {
                if (!(input >> value) || value < 0 || value > 127) return 2;
                c.notes[i] = value;
            }
            if (!engine.set_chord(c)) return 2;
        } else if (op == "byte") {
            if (!(input >> value) || value < 0 || value > 255) return 2;
            engine.process_byte(value, time);
        } else if (op == "msg") {
            MidiEvent e;
            e.time_us = time;
            int size = 0;
            if (!(input >> size) || size < 1 || size > 3) return 2;
            e.size = size;
            for (int i = 0; i < size; ++i) {
                if (!(input >> value) || value < 0 || value > 255) return 2;
                e.bytes[i] = value;
            }
            if (!engine.process(e)) return 2;
        } else if (op == "probe") {
            int velocity = 0;
            if (!(input >> value >> velocity) || value < 0 || value > 127
                || velocity < 0 || velocity > 127) return 2;
            probe = engine.quantize(value, velocity);
        } else if (op == "panic") engine.panic(time);
        else if (op == "reset") engine.reset_voice_history();
        else {
            if (!(input >> value)) return 2;
            if (op == "bypass") engine.bypass(value != 0, time);
            else {
                if (op == "mode" && value >= 0 && value <= 7) s.mode = static_cast<Mode>(value);
                else if (op == "map" && value >= 0 && value <= 1) s.chord_map = static_cast<ChordMap>(value);
                else if (op == "continuity" && value >= 0 && value <= 100) s.continuity = value;
                else if (op == "motion" && value >= -100 && value <= 100) s.motion = value;
                else if (op == "register" && value >= 0 && value <= 1) s.register_mode = static_cast<RegisterMode>(value);
                else if (op == "change" && value >= 0 && value <= 2) s.change = static_cast<Change>(value);
                else if (op == "same" && value >= 0 && value <= 1) s.same_pitch = static_cast<SamePitch>(value);
                else if (op == "tie" && value >= 0 && value <= 1) s.prefer_up = value != 0;
                else if (op == "gravity" && value >= 0 && value <= 2) s.gravity = value;
                else if (op == "low" && value >= 0 && value <= 127) { s.low = value; if (s.low > s.high) s.high = s.low; }
                else if (op == "high" && value >= 0 && value <= 127) { s.high = value; if (s.high < s.low) s.low = s.high; }
                else return 2;
                if (!engine.set_settings(s)) return 2;
            }
        }
        std::string extra;
        if (input >> extra || !capture.timestamp_ok) return 2;
        std::cout << "{\"step\":" << step++ << ",\"bytes\":[";
        for (std::size_t i = 0; i < capture.bytes.size(); ++i) {
            if (i) std::cout << ',';
            std::cout << capture.bytes[i];
        }
        std::cout << "],\"probe\":" << probe << "}\n";
    }
}
