// Local photo cutouts for the internal prototype. No network or image API.
// Usage: swift -module-cache-path /tmp/rainy-swift-cache scripts/build-natural-sprites.swift
import AppKit

struct Mask: Decodable {
    let id: String
    let photo: Int
    let polygon: [[Double]]
    let holes: [[[Double]]]?
}
let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let masks = try JSONDecoder().decode([Mask].self, from: Data(contentsOf: root.appendingPathComponent("scripts/natural-sprite-masks.json")))
let output = root.appendingPathComponent("assets/exploration/natural/targets")
try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
for mask in masks {
    let input = root.appendingPathComponent("assets/exploration/\(mask.id)/detail-\(mask.photo).jpg")
    guard let image = NSImage(contentsOf: input) else { fatalError("Missing \(input.path)") }
    let minX = mask.polygon.map { $0[0] }.min()!
    let maxX = mask.polygon.map { $0[0] }.max()!
    let minY = mask.polygon.map { $0[1] }.min()!
    let maxY = mask.polygon.map { $0[1] }.max()!
    let source = NSBitmapImageRep(data: try Data(contentsOf: input))!
    let cropW = (maxX - minX) * Double(source.pixelsWide)
    let cropH = (maxY - minY) * Double(source.pixelsHigh)
    let scale = 384.0 / max(cropW, cropH)
    let width = Int(ceil(cropW * scale)) + 4
    let height = Int(ceil(cropH * scale)) + 4
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    NSGraphicsContext.current?.imageInterpolation = .high
    let path = NSBezierPath()
    path.windingRule = .evenOdd
    for polygon in [mask.polygon] + (mask.holes ?? []) {
        for (i, point) in polygon.enumerated() {
            let p = NSPoint(x: 2 + (point[0] - minX) * Double(source.pixelsWide) * scale, y: 2 + (maxY - point[1]) * Double(source.pixelsHigh) * scale)
            if i == 0 { path.move(to: p) } else { path.line(to: p) }
        }
        path.close()
    }
    path.addClip()
    image.draw(in: NSRect(x: 2 - minX * Double(source.pixelsWide) * scale,
                          y: 2 - (1 - maxY) * Double(source.pixelsHigh) * scale,
                          width: Double(source.pixelsWide) * scale,
                          height: Double(source.pixelsHigh) * scale))
    NSGraphicsContext.restoreGraphicsState()
    try rep.representation(using: .png, properties: [:])!.write(to: output.appendingPathComponent("\(mask.id).png"))
    print("Cutout: \(mask.id)")
}
