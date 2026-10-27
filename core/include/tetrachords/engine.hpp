#pragma once

#include <array>
#include <cstddef>
#include <cstdint>

namespace tetrachords {

enum class Mode : std::uint8_t {
    ScaleNearest, ChordNearest, ChordMap, ScaleMap, ScaleUp, ScaleDown,
    ScaleContour, StatefulNearest
};
enum class ChordMap : std::uint8_t { PitchClass, Voicing };
enum class RegisterMode : std::uint8_t { Limited, Free };
enum class Change : std::uint8_t { Immediate, NextNote, NextBar };
enum class SamePitch : std::uint8_t { Legato, Retrigger };
enum class Source : std::uint8_t { Derived, MidiField, Plinky };
enum class InputBehavior : std::uint8_t { Follow, Hold };
class Ensemble;

struct Settings {
    Mode mode = Mode::ScaleNearest;
    RegisterMode register_mode = RegisterMode::Limited;
    Change change = Change::NextNote;
    SamePitch same_pitch = SamePitch::Legato;
    ChordMap chord_map = ChordMap::PitchClass;
    std::uint8_t low = 24, high = 48, gravity = 0;
    std::uint8_t continuity = 60;
    double motion = 0; // effective bias supplied by host, -100..100
    bool prefer_up = true;
    // Migration oracle uses false; native adapters opt into ownership-safe
    // empty-field/bypass behavior and ignore unmatched releases.
    bool safe_lifecycle = false;
    InputBehavior input_behavior = InputBehavior::Follow;
    std::uint8_t stability_ms = 20, ensemble = 0, part = 1, separation = 0;
};

// Adapters assemble complete updates. MIDI masks use absolute pitch classes.
// Raw notes retain their order, register and duplicates; they are never a voicing
// inferred from the mask. An empty mask explicitly means no usable field.
struct Field {
    std::int64_t version = 0;
    std::uint8_t root = 0;
    Source source = Source::Derived;
    std::uint16_t pitch_classes = 0;
    std::array<std::uint8_t, 128> raw_notes{};
    std::uint16_t raw_count = 0;
};

struct Chord {
    std::int64_t version = 0;
    std::uint8_t root = 0;
    std::array<std::uint8_t, 128> notes{};
    std::uint16_t count = 0;
};

struct MidiEvent {
    std::uint64_t time_us = 0; // supplied by host; core never reads a clock
    std::array<std::uint8_t, 3> bytes{};
    std::uint8_t size = 0;
};

// Callback must be nonblocking, allocation-free and non-reentrant. It must copy
// the event if retained. There is no hidden output queue or scheduler.
struct Sink {
    void* context = nullptr;
    void (*emit)(void*, const MidiEvent&) noexcept = nullptr;
};

struct Diagnostics {
    std::uint64_t input_note_ons = 0, output_note_ons = 0;
    std::uint64_t rejected_updates = 0, overflows = 0;
};

class Engine {
public:
    static constexpr std::size_t mapping_capacity = 512;
    explicit Engine(Sink sink, Ensemble* ensemble = nullptr) noexcept;
    ~Engine() noexcept;
    Engine(const Engine&) = delete;
    Engine& operator=(const Engine&) = delete;

    bool set_settings(const Settings&, std::uint64_t time_us = 0) noexcept;
    const Settings& settings() const noexcept { return settings_; }
    bool set_field(const Field&, bool force = false) noexcept;
    bool set_chord(const Chord&) noexcept;
    const Field& field() const noexcept { return field_; }
    const Chord& chord() const noexcept { return chord_; }
    bool has_pending_field() const noexcept { return pending_field_; }
    std::uint8_t root() const noexcept { return root_; }

    // Complete messages are validated; raw byte input additionally supports
    // running status, interleaved real-time messages and SysEx passthrough.
    bool process(const MidiEvent&) noexcept;
    void process_byte(std::uint8_t, std::uint64_t time_us) noexcept;
    void bypass(bool, std::uint64_t time_us) noexcept;
    void panic(std::uint64_t time_us) noexcept;
    void reset_voice_history(std::uint64_t time_us = 0) noexcept;
    void reset_ensemble(std::uint64_t time_us) noexcept;
    void tick(std::uint64_t time_us) noexcept;
    std::uint64_t next_due() const noexcept; // UINT64_MAX means no timer needed
    struct Decision {
        std::uint8_t input = 0, output = 0, channel = 0;
        int movement = 0;
        double input_cost = 0, continuity_cost = 0, direction_cost = 0, collision_cost = 0;
    };
    bool pop_decision(Decision&) noexcept;
    int last_output() const noexcept { return last_output_; }
    int ensemble_pitch(std::uint8_t part, bool& conflict) const noexcept;

    // Contour selection updates its degree history, as in the JS reference.
    // Stateful history is committed only by an actually delivered Note On.
    int quantize(std::uint8_t note, std::uint8_t velocity = 0,
                 std::uint8_t channel = 0) noexcept;
    std::size_t mapping_count() const noexcept { return mapping_count_; }
    bool faulted() const noexcept { return faulted_; }
    const Diagnostics& diagnostics() const noexcept { return diagnostics_; }

private:
    friend class Ensemble;
    struct Mapping {
        std::uint64_t order = 0;
        std::uint8_t channel = 0, input = 0;
        std::int16_t output = -1; // -1 is a retrigger tombstone
        bool used = false;
    };
    struct Output {
        std::uint64_t order = 0;
        std::uint16_t owners = 0;
    };
    Sink sink_;
    Settings settings_{};
    Field field_{}, pending_{};
    Chord chord_{};
    std::uint16_t chord_mask_ = 0;
    std::int64_t last_field_version_ = -1, last_chord_version_ = -1;
    std::uint8_t root_ = 0;
    bool pending_field_ = false, enabled_ = true, faulted_ = false;
    std::array<Mapping, mapping_capacity> mappings_{};
    std::array<Output, 16 * 128> outputs_{};
    std::size_t mapping_count_ = 0;
    std::uint64_t serial_ = 0;
    Diagnostics diagnostics_{};
    struct Voice {
        int input = 0, output = 0, degree = 0;
        std::int64_t version = -1;
        bool valid = false;
    };
    std::array<Voice, 16> voices_{}, contours_{};
    Ensemble* ensemble_ = nullptr;
    struct Option { int note = 0; double cost = 0; };
    struct Queued {
        std::uint64_t due = 0, serial = 0, epoch = 0;
        std::uint8_t channel = 0, input = 0, velocity = 0;
        std::uint8_t option_count = 0, separation = 0, part = 1;
        bool on = false, ready = false, upward = true;
        int output = -1;
        double collision_cost = 0;
        std::array<Option, 13> options{};
    };
    std::array<Queued, 512> queue_{};
    std::size_t queue_begin_ = 0, queue_size_ = 0;
    struct Stable { bool used = false; std::uint8_t input = 0, velocity = 0; std::uint64_t due = 0; };
    std::array<Stable, 16> stable_{};
    std::array<Decision, 32> decisions_{};
    std::size_t decision_begin_ = 0, decision_size_ = 0;
    int last_output_ = -1;

    int running_status_ = -1;
    std::array<std::uint8_t, 2> channel_data_{};
    std::uint8_t channel_count_ = 0, expected_ = 0, system_remaining_ = 0;
    std::uint8_t clock_ticks_ = 0;
    bool in_sysex_ = false;

    void activate(const Field&) noexcept;
    void apply_pending() noexcept;
    void clear_parser() noexcept;
    void channel_message(std::uint8_t, std::uint8_t, std::uint8_t, std::uint64_t) noexcept;
    void note_on(std::uint8_t, std::uint8_t, std::uint8_t, std::uint64_t) noexcept;
    void accept_on(std::uint8_t, std::uint8_t, std::uint8_t, std::uint64_t) noexcept;
    void prepare_on(std::uint8_t, std::uint8_t, std::uint8_t, std::uint64_t) noexcept;
    void deliver(std::uint8_t, std::uint8_t, std::uint8_t, int, std::uint64_t, bool = true, double = 0) noexcept;
    void flush(std::uint64_t, bool force = false) noexcept;
    bool enqueue(const Queued&, std::uint64_t) noexcept;
    void capacity_fault(std::uint64_t) noexcept;
    void release_held(std::uint8_t, std::uint64_t) noexcept;
    Decision costs(int, int, std::uint8_t) const noexcept;
    void note_off(std::uint8_t, std::uint8_t, std::uint8_t, std::uint64_t) noexcept;
    void release(std::uint8_t, int, std::uint8_t, std::uint64_t) noexcept;
    void release_all(std::uint64_t, bool keep_tombstones = false) noexcept;
    void send(std::uint64_t, std::uint8_t, std::uint8_t = 0,
              std::uint8_t = 0, std::uint8_t size = 3) noexcept;
    int nearest(int note, std::uint16_t mask) const noexcept;
    int gravity(int note, std::uint8_t velocity) const noexcept;
    int constrain(int note) const noexcept;
    int mapped(int note, std::uint16_t mask) const noexcept;
    int chord_map(int note) const noexcept;
    int contour(int note, std::uint8_t channel) noexcept;
    int stateful(int note, std::uint8_t channel) const noexcept;
};

// A host-owned bounded registry shared by engines; no platform/Max dependencies.
// Caller serializes all engines using the same registry. Registry outlives them.
class Ensemble {
public:
    static constexpr std::size_t capacity = 64;
private:
    friend class Engine;
    std::array<Engine*, capacity> members_{};
    struct Group { std::uint64_t deadline = 0, epoch = 0; std::uint8_t priority = 1; };
    std::array<Group, 9> groups_{};
    std::uint64_t serial_ = 0;
    bool attach(Engine*) noexcept;
    void detach(Engine*) noexcept;
    void resolve(std::uint8_t) noexcept;
};

} // namespace tetrachords
