// Renders build/icon.png (1024x1024) — the Belvedir mark on a macOS-style
// squircle, matching the app palette (bg #f6f5f2, ink #1a1a1a).
// Run: swift scripts/make-icon.swift
import AppKit

let canvas = 1024.0
let rep = NSBitmapImageRep(
  bitmapDataPlanes: nil, pixelsWide: Int(canvas), pixelsHigh: Int(canvas),
  bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
  colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0
)!

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)

let bg = NSColor(red: 0xF6 / 255.0, green: 0xF5 / 255.0, blue: 0xF2 / 255.0, alpha: 1)
let ink = NSColor(red: 0x1A / 255.0, green: 0x1A / 255.0, blue: 0x1A / 255.0, alpha: 1)

// Apple icon grid: 824x824 squircle centered on a 1024 canvas.
let inset = 100.0
let squircle = NSBezierPath(
  roundedRect: NSRect(x: inset, y: inset, width: canvas - 2 * inset, height: canvas - 2 * inset),
  xRadius: 185.4, yRadius: 185.4
)
bg.setFill()
squircle.fill()

// The mark, from src/renderer/src/assets/belvedir-mark.svg (100x100 viewBox),
// scaled to 560px and centered. SVG y-axis points down, so flip it.
let scale = 5.6
let offset = (canvas - 100.0 * scale) / 2.0

func circle(_ cx: Double, _ cy: Double, _ r: Double, filled: Bool) {
  let x = offset + cx * scale
  let y = offset + (100.0 - cy) * scale
  let path = NSBezierPath(ovalIn: NSRect(x: x - r * scale, y: y - r * scale, width: 2 * r * scale, height: 2 * r * scale))
  if filled {
    ink.setFill()
    path.fill()
  } else {
    path.lineWidth = 6.0 * scale
    ink.setStroke()
    path.stroke()
  }
}

circle(50, 50, 42, filled: false)
circle(53, 53, 29, filled: false)
circle(56, 56, 17, filled: false)
circle(58, 58, 5, filled: true)

NSGraphicsContext.restoreGraphicsState()

let out = URL(fileURLWithPath: "build/icon.png")
try! FileManager.default.createDirectory(atPath: "build", withIntermediateDirectories: true)
try! rep.representation(using: .png, properties: [:])!.write(to: out)
print("wrote \(out.path)")
