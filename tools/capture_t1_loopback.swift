// Diagnostic only: reads T-1 and publishes a receive-only virtual MIDI sink.
// No MIDI output port is created; cannot transmit to hardware.
import Foundation
import CoreMIDI
import Darwin
let duration = Double(CommandLine.arguments.dropFirst().first ?? "180") ?? 180
var info = mach_timebase_info_data_t()
mach_timebase_info(&info)
let scale = Double(info.numer) / Double(info.denom) / 1_000_000
func emit(_ value: [String: Any]) {
    let data = try! JSONSerialization.data(withJSONObject: value, options: [.sortedKeys])
    print(String(data: data, encoding: .utf8)!); fflush(stdout)
}
func read(_ packets: UnsafePointer<MIDIPacketList>, _ source: String) {
    let arrival = Double(mach_absolute_time()) * scale
    var packet = UnsafeRawPointer(packets).advanced(by: MemoryLayout<MIDIPacketList>.offset(of: \.packet)!).assumingMemoryBound(to: MIDIPacket.self)
    for _ in 0..<packets.pointee.numPackets {
        let bytes = UnsafeRawPointer(packet).advanced(by: MemoryLayout<MIDIPacket>.offset(of: \.data)!).assumingMemoryBound(to: UInt8.self)
        emit(["source":source,"arrivalMs":arrival,"timestampMs":Double(packet.pointee.timeStamp)*scale,
              "unix":Date().timeIntervalSince1970,"bytes":Array(UnsafeBufferPointer(start:bytes,count:Int(packet.pointee.length)))])
        packet = UnsafePointer(MIDIPacketNext(packet))
    }
}
var client = MIDIClientRef(), port = MIDIPortRef(), sink = MIDIEndpointRef()
guard MIDIClientCreate("Codex isolated latency capture" as CFString,nil,nil,&client) == noErr else { exit(1) }
guard MIDIDestinationCreateWithBlock(client,"Codex Latency Sink" as CFString,&sink,{ packets,_ in read(packets,"Live output") }) == noErr else { exit(2) }
guard MIDIInputPortCreateWithBlock(client,"T1 input timing" as CFString,&port,{ packets,_ in read(packets,"T-1") }) == noErr else { exit(3) }
var found = false
for i in 0..<MIDIGetNumberOfSources() {
    let source = MIDIGetSource(i)
    var value: Unmanaged<CFString>?
    MIDIObjectGetStringProperty(source,kMIDIPropertyDisplayName,&value)
    if value?.takeRetainedValue() as String? == "T-1" {
        found = MIDIPortConnectSource(port,source,nil) == noErr
    }
}
emit(["ready":found,"sink":"Codex Latency Sink","duration":duration])
RunLoop.current.run(until:Date().addingTimeInterval(duration))
MIDIPortDispose(port); MIDIEndpointDispose(sink); MIDIClientDispose(client)
emit(["done":true])
