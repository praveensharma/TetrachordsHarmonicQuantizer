#include "tetrachords/engine.hpp"
#include <array>
#include <cassert>
#include <cstdio>
#include <limits>
using namespace tetrachords;
struct Capture {
    std::array<MidiEvent,4096> events{}; std::size_t count=0;
    static void emit(void* p,const MidiEvent& e) noexcept {
        auto& c=*static_cast<Capture*>(p);assert(c.count<c.events.size());c.events[c.count++]=e;
    }
};
void send(Engine& e,int pitch,bool on,std::uint64_t time,int velocity=100,int channel=0) {
    assert(e.process({time,{{static_cast<std::uint8_t>((on?0x90:0x80)|channel),
        static_cast<std::uint8_t>(pitch),static_cast<std::uint8_t>(on?velocity:0)}},3}));
}
void configure(Engine& e,int part=1,int separation=0) {
    auto s=e.settings();s.safe_lifecycle=true;s.register_mode=RegisterMode::Free;
    s.change=Change::Immediate;s.mode=Mode::ScaleNearest;s.ensemble=1;s.part=part;s.separation=separation;
    assert(e.set_settings(s));Field f;f.version=1;f.pitch_classes=0x35;assert(e.set_field(f));
}
int main() {
    Ensemble registry;
    Capture ca,cb,cc,cd;
    Engine a({&ca,Capture::emit},&registry),b({&cb,Capture::emit},&registry),
        c({&cc,Capture::emit},&registry),d({&cd,Capture::emit},&registry);
    configure(a,1);configure(b,2);configure(c,3);configure(d,4);
    send(a,61,true,0);assert(ca.count==1&&ca.events[0].time_us==0);
    send(a,61,false,1);assert(a.mapping_count()==0&&a.next_due()==std::numeric_limits<std::uint64_t>::max());
    ca.count=0;auto s=a.settings();s.input_behavior=InputBehavior::Hold;s.stability_ms=20;assert(a.set_settings(s));
    send(a,60,true,0);send(a,60,false,1000); // hold deliberately ignores source releases
    send(a,60,true,5000,90);assert(a.next_due()==20000);a.tick(19999);assert(ca.count==0);
    a.tick(20000);assert(ca.count==1&&ca.events[0].bytes[2]==90);
    send(a,62,true,21000);send(a,64,true,22000);a.tick(41000);assert(ca.count==1);
    a.tick(42000);assert(ca.count==3&&ca.events[1].bytes[0]==0x80&&ca.events[2].bytes[1]==64);
    assert(a.mapping_count()==1);
    for(int i=0;i<1000;i++){send(a,60+i%12,true,50000+i*1000);a.tick(70000+i*1000);}
    assert(a.mapping_count()==1&&!a.faulted()); // no build-up of ignored offs
    ca.count=0;send(a,62,true,2000000);s.stability_ms=0;assert(a.set_settings(s,2000001));
    assert(ca.count==2&&a.next_due()==std::numeric_limits<std::uint64_t>::max());
    send(a,62,true,2000002);a.bypass(true,2000003);assert(a.next_due()==std::numeric_limits<std::uint64_t>::max());
    a.panic(2000004);a.bypass(false,2000005);ca.count=cb.count=cc.count=cd.count=0;
    configure(a,1,100);configure(b,2,100);configure(c,3,100);configure(d,4,100);
    s=a.settings();s.input_behavior=InputBehavior::Follow;assert(a.set_settings(s));
    send(a,60,true,0);send(b,60,true,0);send(c,60,true,0);send(d,60,true,0);
    a.tick(3999);assert(ca.count==0&&cb.count==0);a.tick(4000);b.tick(4000);c.tick(4000);d.tick(4000);
    assert(ca.events[0].bytes[1]==60&&cb.events[0].bytes[1]==62&&cc.events[0].bytes[1]==64&&cd.events[0].bytes[1]==65);
    for(auto* e:{&a,&b,&c,&d})send(*e,60,false,5000);
    for(auto* e:{&a,&b,&c,&d})e->tick(9000);
    for(auto* e:{&a,&b,&c,&d})assert(e->mapping_count()==0);
    ca.count=cb.count=cc.count=cd.count=0;
    for(auto* e:{&a,&b,&c,&d})send(*e,60,true,10000);
    for(auto* e:{&a,&b,&c,&d})e->tick(14000);
    assert(cb.events[0].bytes[1]==60&&cc.events[0].bytes[1]==62&&cd.events[0].bytes[1]==64&&ca.events[0].bytes[1]==65);
    // Active occupancy survives rhythmically independent events; ended owners do not.
    for(auto* e:{&a,&b,&c,&d})e->panic(15000);
    ca.count=cb.count=0;send(a,60,true,20000);a.tick(24000);
    send(b,60,true,30000);b.tick(34000);assert(cb.events[0].bytes[1]!=ca.events[0].bytes[1]);
    send(a,60,false,35000);a.tick(39000);send(b,60,false,35000);b.tick(39000);
    cb.count=0;send(b,60,true,40000);b.tick(44000);assert(cb.events[0].bytes[1]==60);
    b.panic(45000);a.panic(45000);ca.count=cb.count=0;
    s=b.settings();s.part=1;assert(b.set_settings(s));
    send(a,60,true,50000);send(b,60,true,50000);a.tick(54000);b.tick(54000);
    assert(ca.events[0].bytes[1]==60&&cb.events[0].bytes[1]==60); // visible conflict, transparent
    bool conflict=false;a.ensemble_pitch(1,conflict);assert(conflict);
    for(auto* e:{&a,&b,&c,&d})e->panic(60000);
    configure(a,1,50);s=a.settings();s.input_behavior=InputBehavior::Hold;s.stability_ms=20;assert(a.set_settings(s));
    ca.count=0;send(a,60,true,70000);a.tick(89999);assert(ca.count==0);a.tick(90000);
    assert(a.next_due()==94000);a.tick(94000);assert(ca.count==1&&ca.events[0].time_us==94000);
    // Panic discards uncommitted events: no zombie note-on after a reset.
    send(a,64,true,95000);a.panic(96000);ca.count=0;a.tick(200000);assert(ca.count==0);
    s=a.settings();s.input_behavior=InputBehavior::Follow;assert(a.set_settings(s));
    send(a,61,true,210000);a.bypass(true,211000);ca.count=0;
    send(a,61,true,212000);assert(ca.count==1&&ca.events[0].bytes[1]==61);
    send(a,61,false,213000);assert(ca.count==1); // canceled queued instance, not new raw note
    send(a,61,false,214000);assert(ca.count==2&&a.mapping_count()==0);
    std::puts("Native timing: immediate path, 20/24 ms hold/ensemble windows, stability replacement, zero settle, bounded hold ownership, rotating priority, asynchronous occupancy, conflicts and panic cancellation passed.");
}
