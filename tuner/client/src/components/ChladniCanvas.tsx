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
  // Reference: Cymavis method of mapping Hz to Chladni parameters
  const log = Math.log2(freq / 100);
  const base = Math.max(1, Math.round(log * 2));
  const n = base + (Math.round(freq / 73) % 3);
  const m = base + (Math.round(freq / 53) % 4);
  return { n: Math.max(1, n), m: Math.max(2, m) };
}

function drawChladni(
  canvas: HTMLCanvasElement,
  frequencies: number[],
  color: string
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;

  ctx.fillStyle = "#050a14";
  ctx.fillRect(0, 0, W, H);

  if (frequencies.length === 0) return;

  // Draw each frequency as a layer
  frequencies.forEach((freq, idx) => {
    const { n, m } = freqToNM(freq);
    const L = Math.PI;
    const threshold = 0.12;
    const alpha = idx === 0 ? 1 : 0.6;

    const imgData = ctx.createImageData(W, H);
    const data = imgData.data;

    // Parse hex color to RGB
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const x = (px / W) * L;
        const y = (py / H) * L;
        const val = Math.cos(n * x) * Math.cos(m * y) - Math.cos(m * x) * Math.cos(n * y);
        const abs = Math.abs(val);

        if (abs < threshold) {
          // On the nodal line — bright
          const intensity = 1 - (abs / threshold);
          const bright = intensity * intensity; // square for sharpness
          const i = (py * W + px) * 4;
          data[i]   = Math.round(r * bright * alpha);
          data[i+1] = Math.round(g * bright * alpha);
          data[i+2] = Math.round(b * bright * alpha);
          data[i+3] = Math.round(200 * bright * alpha);
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Add subtle glow
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.15 * alpha;
    ctx.filter = "blur(4px)";
    ctx.putImageData(imgData, 0, 0);
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

  const allFreqs = frequencies && frequencies.length > 0 ? frequencies : [frequency];

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
export function MultiChladniCanvas({ tracks, size = 320 }: { tracks: { frequency: number; color: string; volume: number }[]; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || tracks.length === 0) return;
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#050a14";
    ctx.fillRect(0, 0, size, size);

    tracks.forEach(track => {
      const { n, m } = freqToNM(track.frequency);
      const L = Math.PI;
      const threshold = 0.15;

      const imgData = ctx.createImageData(size, size);
      const data = imgData.data;

      const r = parseInt(track.color.slice(1, 3), 16);
      const g = parseInt(track.color.slice(3, 5), 16);
      const b = parseInt(track.color.slice(5, 7), 16);

      for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
          const x = (px / size) * L;
          const y = (py / size) * L;
          const val = Math.cos(n * x) * Math.cos(m * y) - Math.cos(m * x) * Math.cos(n * y);
          const abs = Math.abs(val);

          if (abs < threshold) {
            const intensity = (1 - abs / threshold) * track.volume;
            const bright = intensity * intensity;
            const i = (py * size + px) * 4;
            data[i]   = Math.min(255, data[i]   + Math.round(r * bright));
            data[i+1] = Math.min(255, data[i+1] + Math.round(g * bright));
            data[i+2] = Math.min(255, data[i+2] + Math.round(b * bright));
            data[i+3] = Math.min(255, data[i+3] + Math.round(200 * bright));
          }
        }
      }

      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.putImageData(imgData, 0, 0);
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
