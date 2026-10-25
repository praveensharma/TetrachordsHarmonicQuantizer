// Read-only CoreMIDI listener; optional FH-2 configuration dump request.
import Foundation
import CoreMIDI

func name(_ object: MIDIObjectRef) -> String {
    var value: Unmanaged<CFString>?
    MIDIObjectGetStringProperty(object, kMIDIPropertyDisplayName, &value)
    return value?.takeRetainedValue() as String? ?? "unknown"
}
func emit(_ object: [String: Any]) {
    if let data = try? JSONSerialization.data(withJSONObject: object, options: [.sortedKeys]),
       let text = String(data: data, encoding: .utf8) { print(text); fflush(stdout) }
}
let args = CommandLine.arguments
let seconds = Double(args.dropFirst().first ?? "30") ?? 30
var client = MIDIClientRef()
let created = MIDIClientCreate("Codex MIDI diagnostic" as CFString, nil, nil, &client)
guard created == noErr else { emit(["error": "MIDIClientCreate", "status": created]); exit(1) }
var port = MIDIPortRef()
let sourceNames = (0..<MIDIGetNumberOfSources()).map { name(MIDIGetSource($0)) }
let input = MIDIInputPortCreateWithBlock(client, "Read-only capture" as CFString, &port) { packets, context in
    let index = Int(bitPattern: context) - 1
    let source = index >= 0 && index < sourceNames.count ? sourceNames[index] : "unknown"
    var packet = UnsafeRawPointer(packets).advanced(by: MemoryLayout<MIDIPacketList>.offset(of: \.packet)!).assumingMemoryBound(to: MIDIPacket.self)
    for _ in 0..<packets.pointee.numPackets {
        let count = Int(packet.pointee.length)
        let data = UnsafeRawPointer(packet).advanced(by: MemoryLayout<MIDIPacket>.offset(of: \.data)!).assumingMemoryBound(to: UInt8.self)
        let bytes = Array(UnsafeBufferPointer(start: data, count: count))
        emit(["time": Date().timeIntervalSince1970, "source": source, "bytes": bytes])
        packet = UnsafePointer(MIDIPacketNext(packet))
    }
}
guard input == noErr else { emit(["error": "MIDIInputPortCreate", "status": input]); exit(1) }
for i in 0..<sourceNames.count {
    let endpoint = MIDIGetSource(i), label = sourceNames[i]
    if label.lowercased().contains("plinky") || label.contains("FH-2") || label.contains("Muse") {
        let status = MIDIPortConnectSource(port, endpoint, UnsafeMutableRawPointer(bitPattern: Int(i)+1))
        emit(["connected": label, "status": status])
    }
}
for i in 0..<MIDIGetNumberOfDestinations() { emit(["destination": name(MIDIGetDestination(i))]) }
if args.contains("--request-fh2") {
    var output = MIDIPortRef()
    MIDIOutputPortCreate(client, "Read configuration" as CFString, &output)
    for i in 0..<MIDIGetNumberOfDestinations() {
        let endpoint = MIDIGetDestination(i)
        if name(endpoint) == "FH-2" {
            var list = MIDIPacketList()
            let query: [UInt8] = [0xF0,0x00,0x21,0x27,0x2F,0x21,0xF7]
            withUnsafeMutablePointer(to: &list) { ptr in
                let first = MIDIPacketListInit(ptr)
                query.withUnsafeBufferPointer { buffer in
                    _ = MIDIPacketListAdd(ptr, MemoryLayout<MIDIPacketList>.size, first, 0, query.count, buffer.baseAddress!)
                }
                let status = MIDISend(output, endpoint, ptr)
                emit(["configurationRequest": name(endpoint), "status": status])
            }
        }
    }
}
emit(["captureSeconds": seconds])
RunLoop.current.run(until: Date().addingTimeInterval(seconds))
MIDIPortDispose(port)
MIDIClientDispose(client)
emit(["done": true])
