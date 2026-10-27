#include "tetrachords/engine.hpp"
#include <array>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>
#include <limits>
using namespace tetrachords;
struct Output { int owner; std::vector<std::array<int,2>>* bytes; };
static void emit(void* p,const MidiEvent& event) noexcept {
    auto& out=*static_cast<Output*>(p);
    for(int i=0;i<event.size;++i)out.bytes->push_back({out.owner,event.bytes[i]});
}
int main() {
    Ensemble registry;std::vector<std::array<int,2>> bytes;bytes.reserve(8192);
    Output o0{0,&bytes},o1{1,&bytes},o2{2,&bytes},o3{3,&bytes};
    Engine a({&o0,emit},&registry),b({&o1,emit},&registry),c({&o2,emit},&registry),d({&o3,emit},&registry);
    const std::array<Engine*,4> engines{{&a,&b,&c,&d}};
    std::uint64_t now=0;std::string line;
    while(std::getline(std::cin,line)) {
        std::istringstream in(line);int owner;std::uint64_t time;std::string op;
        if(!(in>>owner>>time>>op)||owner<0||owner>3||time<now)return 2;
        // Advance actual native deadlines rather than polling at the target.
        for(;;) {
            auto due=std::numeric_limits<std::uint64_t>::max();
            for(auto* e:engines)due=std::min(due,e->next_due());
            if(due>time)break;
            now=due;for(auto* e:engines)if(e->next_due()<=due)e->tick(due);
        }
        now=time;auto& e=*engines[owner];auto s=e.settings();int value;
        if(op=="advance") {}
        else if(op=="msg") {
            int status,note,velocity;if(!(in>>status>>note>>velocity))return 2;
            if(!e.process({time,{{static_cast<std::uint8_t>(status),static_cast<std::uint8_t>(note),static_cast<std::uint8_t>(velocity)}},3}))return 2;
        } else if(op=="field") {
            Field f;int root,mask;if(!(in>>f.version>>root>>mask))return 2;f.root=root;f.pitch_classes=mask;
            if(!e.set_field(f))return 2;
        } else if(op=="panic")e.panic(time);
        else {
            if(!(in>>value))return 2;
            if(op=="ensemble")s.ensemble=value;
            else if(op=="part")s.part=value;
            else if(op=="separation")s.separation=value;
            else if(op=="hold")s.input_behavior=value?InputBehavior::Hold:InputBehavior::Follow;
            else if(op=="stability")s.stability_ms=value;
            else if(op=="register")s.register_mode=value?RegisterMode::Free:RegisterMode::Limited;
            else if(op=="change")s.change=static_cast<Change>(value);
            else if(op=="same")s.same_pitch=value?SamePitch::Retrigger:SamePitch::Legato;
            else if(op=="mode")s.mode=static_cast<Mode>(value);
            else if(op=="continuity")s.continuity=value;
            else return 2;
            if(!e.set_settings(s,time))return 2;
        }
        std::cout<<'[';
        for(std::size_t i=0;i<bytes.size();++i){if(i)std::cout<<',';std::cout<<'['<<bytes[i][0]<<','<<bytes[i][1]<<']';}
        std::cout<<"]\n";bytes.clear();
    }
}
