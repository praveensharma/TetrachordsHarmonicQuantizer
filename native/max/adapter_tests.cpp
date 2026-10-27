// Host-only Max API shim. Compiles the actual adapter against the actual SDK
// headers; tests routing/validation, not loading or scheduling inside Max/Live.
#include "tetrachords_quantizer.cpp"
#include <cassert>
#include <cstdlib>
#include <map>
#include <string>
#include <vector>

static std::vector<int> bytes;
static std::vector<t_atom_long> report;
static std::map<std::string, t_symbol> symbols;
static long allocation_size = 0;
static int depth = 0;
static bool inject_feedback = false;
static Native* current = nullptr;
static double logical_ms = 1000, timer_delay = -1;

extern "C" {
t_class* class_new(const char*, method, method, long size, method, short, ...) {
    allocation_size = size; return reinterpret_cast<t_class*>(1);
}
t_max_err class_addmethod(t_class*, method, const char*, ...) { return MAX_ERR_NONE; }
t_max_err class_register(t_symbol*, t_class*) { return MAX_ERR_NONE; }
void* object_alloc(t_class*) { return std::calloc(1, allocation_size); }
void* outlet_new(void*, const char*) { return reinterpret_cast<void*>(1); }
void* intout(void*) { return reinterpret_cast<void*>(2); }
void* outlet_int(t_outlet*, t_atom_long b) {
    bytes.push_back(static_cast<int>(b));
    if (inject_feedback) { inject_feedback = false; midi(current, 144); }
    return nullptr;
}
void* outlet_anything(t_outlet*, t_symbol*, short count, t_atom* atoms) {
    report.clear(); for (int i = 0; i < count; ++i) report.push_back(atom_getlong(atoms + i));
    return nullptr;
}
t_symbol* gensym(const char* s) {
    auto& value = symbols[s]; value.s_name = const_cast<char*>(symbols.find(s)->first.c_str()); return &value;
}
void critical_enter(t_critical) { ++depth; }
void critical_exit(t_critical) { assert(depth > 0); --depth; }
void clock_getftime(double* time) { *time = logical_ms; }
t_clock* clock_new(void*, method) { return reinterpret_cast<t_clock*>(3); }
void clock_unset(t_clock*) { timer_delay = -1; }
void clock_fdelay(t_clock*, double delay) { timer_delay = delay; }
t_max_err object_free(void*) { return MAX_ERR_NONE; }
long atom_gettype(const t_atom* a) { return a->a_type; }
t_atom_long atom_getlong(const t_atom* a) { return a->a_w.w_long; }
t_atom_float atom_getfloat(const t_atom* a) { return a->a_type == A_LONG ? a->a_w.w_long : a->a_w.w_float; }
t_max_err atom_setlong(t_atom* a, t_atom_long n) { a->a_type = A_LONG; a->a_w.w_long = n; return MAX_ERR_NONE; }
t_max_err atom_setfloat(t_atom* a, double n) { a->a_type = A_FLOAT; a->a_w.w_float = n; return MAX_ERR_NONE; }
}

void send_command(Native* x, const char* name, std::initializer_list<t_atom_long> values) {
    std::vector<t_atom> atoms(values.size());
    std::size_t i = 0; for (auto v : values) atom_setlong(&atoms[i++], v);
    command(x, gensym(name), static_cast<long>(atoms.size()), atoms.data());
    assert(depth == 0 && !x->busy);
}
void message(Native* x, std::initializer_list<int> values) { for (int b : values) midi(x, b); }

int main() {
    ext_main(nullptr);
    auto* x = static_cast<Native*>(create(nullptr, 0, nullptr)); current = x;
    assert(x && x->engine().settings().safe_lifecycle);
    send_command(x, "registermode", {1}); send_command(x, "timing", {0});
    send_command(x, "field", {1, 0, 1, 1, 2, 60, 72});
    message(x, {144, 61, 100}); assert((bytes == std::vector<int>{144, 60, 100}));
    send_command(x, "field", {2, 0, 1, 0, 0});
    message(x, {128, 61, 0}); assert(bytes[4] == 60 && x->engine().mapping_count() == 0);
    const auto rejected = x->rejected;
    send_command(x, "ensemble", {9}); send_command(x, "field", {3, 0, 1, 1, 1, 61});
    assert(x->rejected == rejected + 2 && x->engine().field().version == 2);
    send_command(x, "field", {3, 0, 1, 1, 1, 60});
    for (int mode = 0; mode < 8; ++mode) {
        send_command(x, "mode", {mode}); bytes.clear();
        message(x, {144, 60, 100, 128, 60, 0});
        assert(bytes.size() == 6 && bytes[1] == bytes[4]);
    }
    bytes.clear(); inject_feedback = true; message(x, {144, 60, 100});
    assert(x->reentrant == 1 && bytes.size() == 3 && depth == 0);
    message(x, {128, 60, 0});
    bytes.clear();
    for (int i = 0; i < 512; ++i) message(x, {144, 60, 100});
    const auto before = bytes.size();
    send_command(x, "panic", {});
    assert(bytes.size() - before == 1632 && !x->output_overflow && x->engine().mapping_count() == 0);
    status(x); assert(report.size() == 8 && report[2] == 0 && report[5] == 1);
    bytes.clear(); send_command(x, "inputbehavior", {1}); send_command(x, "stability", {20});
    message(x, {144, 60, 100}); assert(bytes.empty() && timer_delay == 20);
    logical_ms += 19; timer_tick(x); assert(bytes.empty() && timer_delay == 1);
    logical_ms += 1; timer_tick(x); assert(bytes.size() == 3 && timer_delay == -1);
    send_command(x, "active", {0}); assert(x->engine().mapping_count() == 0 && timer_delay == -1);
    send_command(x, "active", {1}); send_command(x, "inputbehavior", {0});
    send_command(x, "ensemble", {1}); send_command(x, "separation", {100});
    bytes.clear(); message(x, {144, 60, 100, 128, 60, 0}); assert(bytes.empty() && timer_delay == 4);
    logical_ms += 4; timer_tick(x); assert(bytes.size() == 6 && timer_delay == -1);
    destroy(x); std::free(x);
    std::puts("Max adapter host shim: eight modes, raw field, malformed/unsupported controls, safe releases, recursion and full-capacity panic passed. NOT a Max/Live load test.");
}
