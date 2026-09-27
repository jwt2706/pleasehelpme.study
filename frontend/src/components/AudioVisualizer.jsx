import { useEffect, useRef } from "react";

/**
 * Small bar visualizer driven by a Web Audio AnalyserNode. Renders nothing
 * when inactive, so it can be dropped in conditionally without layout jump
 * handled separately by the caller.
 */
export default function AudioVisualizer({ analyser, active, color = "var(--accent)" }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!analyser || !active || !canvasRef.current) {
      cancelAnimationFrame(rafRef.current);
      return undefined;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const data = new Uint8Array(analyser.frequencyBinCount);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const barCount = data.length;
    const gap = 3;
    const barWidth = (width - gap * (barCount - 1)) / barCount;

    function draw() {
      analyser.getByteFrequencyData(data);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = color;
      for (let i = 0; i < barCount; i++) {
        const v = data[i] / 255;
        const barHeight = Math.max(2, v * height);
        const x = i * (barWidth + gap);
        const y = (height - barHeight) / 2;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, barWidth, barHeight, 2);
        else ctx.rect(x, y, barWidth, barHeight);
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(draw);
    }
    draw();

    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser, active, color]);

  if (!active) return null;

  return <canvas className="audio-visualizer" ref={canvasRef} />;
}