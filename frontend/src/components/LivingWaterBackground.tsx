import React, { useEffect, useRef } from 'react';

interface LivingWaterBackgroundProps {
  ntu: number;
}

interface Particle {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  alpha: number;
  decay: number;
  hue: number;
}

export const LivingWaterBackground: React.FC<LivingWaterBackgroundProps> = ({ ntu }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentNtuRef = useRef<number>(ntu);

  // Smooth lerp for turbidity transitions
  useEffect(() => {
    currentNtuRef.current = ntu;
  }, [ntu]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle pool
    const particles: Particle[] = [];
    const maxParticles = 300;

    for (let i = 0; i < maxParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.4,
        vy: Math.random() * 0.5 + 0.1,
        alpha: Math.random() * 0.6 + 0.2,
        decay: Math.random() * 0.005 + 0.002,
        hue: 195,
      });
    }

    let smoothNtu = ntu;
    let time = 0;

    const render = () => {
      time += 0.015;
      // Exponential smoothing for NTU
      smoothNtu += (currentNtuRef.current - smoothNtu) * 0.04;

      // Turbidity factor: 0.0 (crystal clear) to 1.0 (heavy silt cloud)
      const turbFactor = Math.min(1.0, Math.max(0.0, (smoothNtu - 5) / 140));

      // Color interpolation:
      // Clear: Deep navy abyss rgb(3, 10, 26) -> rgb(1, 4, 12)
      // Murky: Murky greenish-teal rgb(6, 26, 26)
      // Heavy Silt: Murky sediment brownish-olive rgb(26, 24, 12)
      let r1 = 3 + turbFactor * 26;
      let g1 = 12 + turbFactor * 16;
      let b1 = 28 - turbFactor * 18;

      let r2 = 1 + turbFactor * 18;
      let g2 = 4 + turbFactor * 12;
      let b2 = 12 - turbFactor * 8;

      if (smoothNtu > 60) {
        // Shift toward sediment brown-khaki
        const siltExtra = Math.min(1.0, (smoothNtu - 60) / 100);
        r1 += siltExtra * 14;
        g1 += siltExtra * 8;
        b1 -= siltExtra * 6;
      }

      // Draw background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, `rgb(${Math.round(r1)}, ${Math.round(g1)}, ${Math.round(b1)})`);
      bgGrad.addColorStop(1, `rgb(${Math.round(r2)}, ${Math.round(g2)}, ${Math.round(b2)})`);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Draw surface caustic light rays (clearer water = brighter rays, murky water = attenuated rays)
      const rayOpacity = Math.max(0.02, 0.25 * (1.0 - turbFactor * 0.85));
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 4; i++) {
        const rayX = width * (0.2 + i * 0.2) + Math.sin(time + i * 1.5) * 60;
        const rayWidth = 80 + Math.sin(time * 0.8 + i) * 30;
        const rayGrad = ctx.createLinearGradient(rayX, 0, rayX + 60, height);
        rayGrad.addColorStop(0, `rgba(0, 242, 254, ${rayOpacity * 0.8})`);
        rayGrad.addColorStop(0.5, `rgba(79, 172, 254, ${rayOpacity * 0.4})`);
        rayGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = rayGrad;
        ctx.beginPath();
        ctx.moveTo(rayX - rayWidth / 2, 0);
        ctx.lineTo(rayX + rayWidth / 2, 0);
        ctx.lineTo(rayX + rayWidth * 2.5, height);
        ctx.lineTo(rayX - rayWidth * 1.5, height);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Active particle count scales with turbidity: 40 particles in clear water, up to 280 in high NTU
      const activeCount = Math.floor(40 + turbFactor * 240);

      // Particulate rendering
      for (let i = 0; i < activeCount; i++) {
        const p = particles[i];
        p.x += p.vx + Math.sin(time + p.y * 0.01) * 0.3;
        p.y += p.vy * (1.0 + turbFactor * 1.2);

        // Wrap around edges
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y > height) {
          p.y = 0;
          p.x = Math.random() * width;
        }

        // Particle color based on turbidity:
        // Clear: bioluminescent cyan/white dust
        // Murky: brownish-green organic sediment flocs
        const pr = Math.round(70 + turbFactor * 120);
        const pg = Math.round(180 - turbFactor * 60);
        const pb = Math.round(230 - turbFactor * 170);
        const pAlpha = p.alpha * (0.4 + turbFactor * 0.6);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * (1.0 + turbFactor * 0.8), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${pAlpha})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000"
      style={{ opacity: 0.95 }}
    />
  );
};
