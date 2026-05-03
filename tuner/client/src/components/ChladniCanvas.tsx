import { useEffect, useRef } from "react";

interface ChladniCanvasProps {
  frequency: number;
  color?: string;
  size?: number;
  interactive?: boolean;
  frequencies?: number[]; // for multi-track layering
}

// Classical Chladni equation:
// cos(n·π·x/L)·cos(m·π·y/L) − cos(m·π·x/L)·cos(n·π·y/L) = 0
// We derive n, m from frequency using log-based mapping

function freqToNM(freq: number): { n: number; m: number } {
  // Map frequency to integer pair (n, m) producing visually meaningful patterns
  const log = Math.log2(freq / 100);
  const base = Math.max(1, Math.round(log * 2));
  const n = base + (Math.round(freq / 73) % 3);
  const m = base + (Math.round(freq / 53) % 4);
  return { n: Math.max(1, n), m: Math.max(2, m) };
}

/**
 * Renders a single frequency layer onto an offscreen canvas and returns it.
 * Using an offscreen canvas lets us composite with drawImage (which respects
 * globalCompositeOperation), whereas putImageData bypasses compositing entirely.
 */
function renderFrequencyLayer(
  freq: number,
  color: string,
  size: number,
  alpha: number,
  threshold = 0.12
): HTMLCanvasElement {
  const offscreen = document.createElement("canvas");
  offscreen.width = size;
  offscreen.height = size;
  const ctx = offscreen.getContext("2d")!;

  const { n, m } = freqToNM(freq);
  const L = Math.PI;

  // Parse hex color to RGB (always a 6-digit hex)
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const x = (px / size) * L;
      const y = (py / size) * L;
      const val =
        Math.cos(n * x) * Math.cos(m * y) - Math.cos(m * x) * Math.cos(n * y);
      const abs = Math.abs(val);

      if (abs < threshold) {
        const intensity = 1 - abs / threshold;
        const bright = intensity * intensity; // squared for sharp nodal lines
        const i = (py * size + px) * 4;
        data[i] = Math.round(r * bright * alpha);
        data[i + 1] = Math.round(g * bright * alpha);
        data[i + 2] = Math.round(b * bright * alpha);
        data[i + 3] = Math.round(220 * bright * alpha);
      }
    }
  }

  // Write pixel data to the offscreen canvas (this is fine — no compositing needed here)
  ctx.putImageData(imgData, 0, 0);

  return offscreen;
}

function drawChladni(
  canvas: HTMLCanvasElement,
  frequencies: number[],
  color: string
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const size = canvas.width;

  // Background
  ctx.fillStyle = "#050a14";
  ctx.fillRect(0, 0, size, size);

  if (frequencies.length === 0) return;

  frequencies.forEach((freq, idx) => {
    const alpha = idx === 0 ? 1 : 0.6;

    // Render this frequency to an offscreen canvas
    const layer = renderFrequencyLayer(freq, color, size, alpha);

    // Composite the layer onto the main canvas using "screen"
    // drawImage respects globalCompositeOperation; putImageData does NOT
    ctx.save();
    ctx.globalCompositeOperation = idx === 0 ? "source-over" : "screen";
    ctx.drawImage(layer, 0, 0);
    ctx.restore();

    // Glow pass: draw the same layer again blurred and screened
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.2 * alpha;
    ctx.filter = "blur(5px)";
    ctx.drawImage(layer, 0, 0);
    ctx.restore();
  });
}

export default function ChladniCanvas({
  frequency,
  color = "#6366f1",
  size = 220,
  frequencies,
}: ChladniCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const allFreqs =
    frequencies && frequencies.length > 0 ? frequencies : [frequency];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = size;
    canvas.height = size;
    drawChladni(canvas, allFreqs, color);
  }, [allFreqs.join(","), color, size]);

  return (
    <canvas
      ref={canvasRef}
      className="chladni-canvas w-full"
      style={{ maxWidth: size, display: "block", margin: "0 auto" }}
    />
  );
}

// Multi-frequency Chladni for the composer
export function MultiChladniCanvas({
  tracks,
  size = 320,
}: {
  tracks: { frequency: number; color: string; volume: number }[];
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || tracks.length === 0) return;
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background
    ctx.fillStyle = "#050a14";
    ctx.fillRect(0, 0, size, size);

    tracks.forEach((track, idx) => {
      // Render this track to an offscreen canvas
      const layer = renderFrequencyLayer(
        track.frequency,
        track.color,
        size,
        track.volume,
        0.15
      );

      // Each track composited with "screen" so colors blend additively
      ctx.save();
      ctx.globalCompositeOperation = idx === 0 ? "source-over" : "screen";
      ctx.drawImage(layer, 0, 0);
      ctx.restore();

      // Glow pass
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.15 * track.volume;
      ctx.filter = "blur(5px)";
      ctx.drawImage(layer, 0, 0);
      ctx.restore();
    });
  }, [JSON.stringify(tracks), size]);

  return (
    <canvas
      ref={canvasRef}
      className="chladni-canvas w-full"
      style={{ maxWidth: size, display: "block", margin: "0 auto" }}
    />
  );
}
