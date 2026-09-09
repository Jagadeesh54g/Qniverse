'use client';

import { useEffect, useRef } from 'react';

export default function QuantumHero() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    let raf;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 24 }, (_, i) => ({
      orbit: i % 4,
      phase: (i / 24) * Math.PI * 2,
      speed: 0.35 + (i % 5) * 0.055,
      size: 1.5 + (i % 3) * 0.7,
    }));

    const drawLine = (x1, y1, x2, y2, alpha = 0.18) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(15,98,254,${alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    function draw(t) {
      const time = t * 0.001;
      ctx.clearRect(0, 0, width, height);

      const cx = width * 0.54;
      const cy = height * 0.50;
      const scale = Math.min(width / 680, height / 640, 1.08);
      const rx = 215 * scale;
      const ry = 108 * scale;

      // Very subtle technical grid.
      ctx.save();
      ctx.globalAlpha = 0.28;
      for (let x = cx - rx - 90; x <= cx + rx + 90; x += 42) drawLine(x, cy - ry - 90, x, cy + ry + 90, 0.055);
      for (let y = cy - ry - 90; y <= cy + ry + 90; y += 42) drawLine(cx - rx - 90, y, cx + rx + 90, y, 0.055);
      ctx.restore();

      // Soft central field.
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 230 * scale);
      glow.addColorStop(0, 'rgba(15,98,254,0.13)');
      glow.addColorStop(0.55, 'rgba(15,98,254,0.035)');
      glow.addColorStop(1, 'rgba(15,98,254,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, 240 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Rotating quantum orbital system.
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(time * 0.16);
      for (let i = 0; i < 4; i++) {
        const angle = i * Math.PI / 4;
        ctx.save();
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(15,98,254,0.48)' : 'rgba(8,189,186,0.40)';
        ctx.lineWidth = i === 1 ? 2 : 1;
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();

      // Bloch-sphere-like inner geometry.
      const sphereR = 92 * scale;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-time * 0.08);
      ctx.beginPath();
      ctx.arc(0, 0, sphereR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(15,98,254,0.24)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, sphereR, sphereR * 0.33, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(15,98,254,0.25)';
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, sphereR * 0.34, sphereR, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(8,189,186,0.18)';
      ctx.stroke();
      ctx.restore();

      // State vector / circuit axis.
      const axisY = cy + sphereR + 66 * scale;
      const startX = cx - 180 * scale;
      const endX = cx + 180 * scale;
      drawLine(startX, axisY, endX, axisY, 0.24);

      for (let i = 0; i < 5; i++) {
        const x = startX + i * ((endX - startX) / 4);
        const pulse = (Math.sin(time * 2.3 - i * 0.7) + 1) / 2;
        ctx.beginPath();
        ctx.arc(x, axisY, 4 + pulse * 2, 0, Math.PI * 2);
        ctx.fillStyle = i === 2 ? '#08bdba' : '#0f62fe';
        ctx.globalAlpha = 0.65 + pulse * 0.35;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Animated particles travelling on the orbitals.
      particles.forEach((p, index) => {
        const orbitAngle = time * p.speed + p.phase;
        const rotation = time * 0.16 + (p.orbit % 4) * Math.PI / 4;
        const localX = Math.cos(orbitAngle) * rx;
        const localY = Math.sin(orbitAngle) * ry;
        const x = cx + localX * Math.cos(rotation) - localY * Math.sin(rotation);
        const y = cy + localX * Math.sin(rotation) + localY * Math.cos(rotation);
        const pulse = 0.65 + 0.35 * Math.sin(time * 3 + index);

        ctx.beginPath();
        ctx.arc(x, y, p.size * pulse + 0.7, 0, Math.PI * 2);
        ctx.fillStyle = index % 3 === 0 ? '#08bdba' : '#0f62fe';
        ctx.shadowBlur = 15;
        ctx.shadowColor = index % 3 === 0 ? '#08bdba' : '#0f62fe';
        ctx.globalAlpha = 0.8;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      });

      // Central quantum state.
      const statePulse = 1 + Math.sin(time * 2.8) * 0.08;
      ctx.beginPath();
      ctx.arc(cx, cy, 16 * scale * statePulse, 0, Math.PI * 2);
      ctx.fillStyle = '#0f62fe';
      ctx.shadowBlur = 32;
      ctx.shadowColor = 'rgba(15,98,254,0.7)';
      ctx.fill();
      ctx.shadowBlur = 0;

      // Rotating state vector.
      const vectorAngle = time * 1.1;
      const vx = cx + Math.cos(vectorAngle) * 70 * scale;
      const vy = cy + Math.sin(vectorAngle) * 70 * scale;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(vx, vy);
      ctx.strokeStyle = '#08bdba';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(vx, vy, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#08bdba';
      ctx.fill();

      // Small labels make the animation communicate a quantum-lab idea.
      ctx.font = '11px "IBM Plex Mono", monospace';
      ctx.fillStyle = 'rgba(82,82,82,.9)';
      ctx.fillText('|ψ⟩', cx + 22, cy - 18);
      ctx.fillText('STATEVECTOR', startX, axisY + 26);
      ctx.fillText('01', endX - 14, axisY + 26);

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className="hero-canvas" aria-hidden="true" />;
}