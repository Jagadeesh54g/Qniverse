'use client';

import { useEffect, useRef } from 'react';

const RING = '#6f3ff5';
const HAND = '#08bdba';
const RING_RGB = '111,63,245';
const HAND_RGB = '8,189,186';

export default function QuantumHero() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let raf;
    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    // Electrons riding the two orbital planes.
    const orbiters = Array.from({ length: 10 }, (_, i) => ({
      plane: i % 2,
      phase: (i / 10) * Math.PI * 2,
      speed: 0.42 + (i % 4) * 0.07,
      size: 1.9 + (i % 3) * 0.5,
    }));

    // The hand's sweep leaves a decaying trail of "measurements".
    const trail = [];

    function draw(t) {
      const time = reduced ? 1.2 : t * 0.001;
      ctx.clearRect(0, 0, width, height);

      const cx = width * 0.52;
      const cy = height * 0.5;
      const scale = Math.min(width / 660, height / 620, 1.1);
      const R = 132 * scale;

      // --- faint technical grid --------------------------------------
      ctx.save();
      ctx.strokeStyle = `rgba(${RING_RGB},0.05)`;
      ctx.lineWidth = 1;
      for (let x = cx - R * 2; x <= cx + R * 2; x += 44) {
        ctx.beginPath(); ctx.moveTo(x, cy - R * 1.7); ctx.lineTo(x, cy + R * 1.7); ctx.stroke();
      }
      for (let y = cy - R * 1.7; y <= cy + R * 1.7; y += 44) {
        ctx.beginPath(); ctx.moveTo(cx - R * 2, y); ctx.lineTo(cx + R * 2, y); ctx.stroke();
      }
      ctx.restore();

      // --- ambient field ---------------------------------------------
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.9);
      glow.addColorStop(0, `rgba(${RING_RGB},0.13)`);
      glow.addColorStop(0.6, `rgba(${RING_RGB},0.03)`);
      glow.addColorStop(1, `rgba(${RING_RGB},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.9, 0, Math.PI * 2);
      ctx.fill();

      // --- the logo ring, breathing ----------------------------------
      const breathe = 1 + Math.sin(time * 1.4) * 0.018;
      ctx.beginPath();
      ctx.arc(cx, cy, R * breathe, 0, Math.PI * 2);
      ctx.strokeStyle = RING;
      ctx.lineWidth = 15 * scale;
      ctx.stroke();

      // Inner hairline echo of the ring.
      ctx.beginPath();
      ctx.arc(cx, cy, R * breathe - 15 * scale, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${RING_RGB},0.22)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // --- two orbital planes ----------------------------------------
      for (let p = 0; p < 2; p++) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((p === 0 ? 1 : -1) * 0.62 + time * 0.1);
        ctx.beginPath();
        ctx.ellipse(0, 0, R * 1.52, R * 0.5, 0, 0, Math.PI * 2);
        ctx.strokeStyle = p === 0 ? `rgba(${RING_RGB},0.34)` : `rgba(${HAND_RGB},0.32)`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
      }

      orbiters.forEach((o, i) => {
        const a = time * o.speed + o.phase;
        const rot = (o.plane === 0 ? 1 : -1) * 0.62 + time * 0.1;
        const lx = Math.cos(a) * R * 1.52;
        const ly = Math.sin(a) * R * 0.5;
        const x = cx + lx * Math.cos(rot) - ly * Math.sin(rot);
        const y = cy + lx * Math.sin(rot) + ly * Math.cos(rot);
        const pulse = 0.7 + 0.3 * Math.sin(time * 3 + i);
        ctx.beginPath();
        ctx.arc(x, y, o.size * pulse * scale + 0.6, 0, Math.PI * 2);
        ctx.fillStyle = o.plane === 0 ? RING : HAND;
        ctx.globalAlpha = 0.85;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // --- the hand: the logo's tail, sweeping like a measurement arm --
      const handAngle = time * 0.85 + Math.PI / 4;
      const handLen = R * 1.12;
      const hx = cx + Math.cos(handAngle) * handLen;
      const hy = cy + Math.sin(handAngle) * handLen;

      // Sweep wedge behind the hand.
      ctx.save();
      const wedge = ctx.createRadialGradient(cx, cy, 0, cx, cy, handLen);
      wedge.addColorStop(0, `rgba(${HAND_RGB},0.20)`);
      wedge.addColorStop(1, `rgba(${HAND_RGB},0)`);
      ctx.fillStyle = wedge;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, handLen, handAngle - 0.55, handAngle);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.beginPath();
      ctx.moveTo(cx - Math.cos(handAngle) * R * 0.1, cy - Math.sin(handAngle) * R * 0.1);
      ctx.lineTo(hx, hy);
      ctx.strokeStyle = HAND;
      ctx.lineWidth = 6.5 * scale;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(hx, hy, 6.5 * scale, 0, Math.PI * 2);
      ctx.fillStyle = HAND;
      ctx.shadowBlur = 20;
      ctx.shadowColor = `rgba(${HAND_RGB},0.8)`;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Each sweep drops a measurement outcome onto the trail.
      if (!reduced && trail.length < 70 && Math.random() < 0.28) {
        trail.push({ a: handAngle, r: handLen, life: 1, bit: Math.random() < 0.5 ? '0' : '1' });
      }
      ctx.font = `${11 * scale}px "IBM Plex Mono", monospace`;
      for (let i = trail.length - 1; i >= 0; i--) {
        const m = trail[i];
        m.life -= 0.0075;
        if (m.life <= 0) { trail.splice(i, 1); continue; }
        const x = cx + Math.cos(m.a) * m.r;
        const y = cy + Math.sin(m.a) * m.r;
        ctx.globalAlpha = m.life * 0.85;
        ctx.fillStyle = HAND;
        ctx.fillText(m.bit, x + 9 * scale, y - 6 * scale);
        ctx.beginPath();
        ctx.arc(x, y, 2 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // --- core state --------------------------------------------------
      const corePulse = 1 + Math.sin(time * 2.6) * 0.1;
      ctx.beginPath();
      ctx.arc(cx, cy, 13 * scale * corePulse, 0, Math.PI * 2);
      ctx.fillStyle = RING;
      ctx.shadowBlur = 26;
      ctx.shadowColor = `rgba(${RING_RGB},0.75)`;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.font = `${11 * scale}px "IBM Plex Mono", monospace`;
      ctx.fillStyle = 'rgba(82,82,82,.92)';
      ctx.fillText('|\u03c8\u27e9', cx + 20 * scale, cy - 16 * scale);

      if (!reduced) raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className="hero-canvas" aria-hidden="true" />;
}
