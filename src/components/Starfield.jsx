import React, { useEffect, useRef } from 'react';

const Starfield = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Create an offscreen canvas. We will pre-render the dark background and 
    // all the small static stars onto this once. This eliminates 99% of the computational 
    // cost during the animation loop, removing the hover lag.
    const offscreenCanvas = document.createElement('canvas');
    const offscreenCtx = offscreenCanvas.getContext('2d');

    let animationFrameId;
    let movingStars = [];

    // Aesthetic galaxy colors for the large stars
    const starColors = [
      '#FF6B6B', // Red-ish
      '#4ECDC4', // Teal 
      '#45B7D1', // Blue
      '#FDCB6E', // Yellow
      '#6C5CE7', // Purple
      '#A8E6CF', // Light Green
      '#FFA07A'  // Light Salmon
    ];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // Match offscreen canvas to main canvas size
      offscreenCanvas.width = canvas.width;
      offscreenCanvas.height = canvas.height;

      initStaticBackground();
      initMovingStars();
    };

    const initStaticBackground = () => {
      // Draw deep space background
      offscreenCtx.fillStyle = '#050510';
      offscreenCtx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);

      // Draw static tiny stars (keeps dense galaxy feel but they don't animate or have expensive shadows)
      const numStaticStars = Math.floor((offscreenCanvas.width * offscreenCanvas.height) / 3000);
      offscreenCtx.fillStyle = 'rgba(255, 255, 255, 0.4)'; // Static dim opacity
      for (let i = 0; i < numStaticStars; i++) {
        const x = Math.random() * offscreenCanvas.width;
        const y = Math.random() * offscreenCanvas.height;
        const radius = Math.random() * 1.2 + 0.3;

        offscreenCtx.beginPath();
        offscreenCtx.arc(x, y, radius, 0, Math.PI * 2);
        offscreenCtx.fill();
      }
    };

    const respawnStar = (star) => {
      star.x = Math.random() * canvas.width;
      star.y = Math.random() * canvas.height;
      star.vx = (Math.random() - 0.5) * 0.4;
      star.vy = (Math.random() - 0.5) * 0.4;
      star.radius = Math.random() * 3 + 2;
      star.baseOpacity = Math.random() * 0.4 + 0.4;
      star.twinkleSpeed = Math.random() * 0.05 + 0.015;
      // Start at the bottom of the sine wave so it fades in naturally without popping
      star.phase = Math.PI * 1.5;
      star.color = starColors[Math.floor(Math.random() * starColors.length)];
    };

    const initMovingStars = () => {
      movingStars = [];
      // Exact 15 colored, moving, glowing stars
      for (let i = 0; i < 15; i++) {
        const star = {};
        respawnStar(star);
        // Randomize phases just for the initial load so they aren't visually synced
        star.phase = Math.random() * Math.PI * 2;
        movingStars.push(star);
      }
    };

    const render = () => {
      // 1. Draw cached static background (Hyper-fast, no per-frame recalculation)
      ctx.drawImage(offscreenCanvas, 0, 0);

      // 2. Animate and draw only the 15 large colored stars
      movingStars.forEach(star => {
        // Update position
        star.x += star.vx;
        star.y += star.vy;

        // 1. Off-screen respawn: if it floats entirely off the canvas width/height, vanish and respawn
        const margin = 20;
        if (
          star.x < -margin ||
          star.x > canvas.width + margin ||
          star.y < -margin ||
          star.y > canvas.height + margin
        ) {
          respawnStar(star);
        }

        // Update twinkle
        const prevPhase = star.phase;
        star.phase += star.twinkleSpeed;

        // 2. Dim cycle respawn: 
        // A sine wave is at its dimmest point at 1.5 PI (approx 4.71 radians). 
        // If the star just crossed that threshold this frame, evaluate if it should form a completely new star!
        const normalizedPrev = prevPhase % (Math.PI * 2);
        const normalizedCurr = star.phase % (Math.PI * 2);
        if (normalizedPrev <= Math.PI * 1.5 && normalizedCurr > Math.PI * 1.5) {
          if (Math.random() < 0.35) { // 35% chance to burn out and respawn instead of just getting bright again
            respawnStar(star);
          }
        }

        const currentOpacity = star.baseOpacity + Math.sin(star.phase) * 0.4;
        const clampedOpacity = Math.max(0.1, Math.min(1, currentOpacity));

        // Use globalAlpha for opacity to easily support hex colors without parsing
        ctx.globalAlpha = clampedOpacity;

        ctx.save();
        ctx.translate(star.x, star.y);

        // Slightly rotate the star randomly so they aren't all perfectly vertical
        // (Creates a more natural constellation look)
        ctx.rotate(star.phase * 0.1);

        ctx.beginPath();

        // Draw a beautiful 4-point constellation glint star!
        const r = star.radius * 2.2;

        ctx.moveTo(0, -r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.quadraticCurveTo(0, 0, 0, r);
        ctx.quadraticCurveTo(0, 0, -r, 0);
        ctx.quadraticCurveTo(0, 0, 0, -r);

        ctx.fillStyle = star.color;
        ctx.shadowBlur = Math.max(0, star.radius * 4); // The colored aura
        ctx.shadowColor = star.color;
        ctx.fill();

        // Draw a bright hot white core at the absolute center to make it look like a real star
        ctx.beginPath();
        ctx.arc(0, 0, star.radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.shadowBlur = 0; // Don't blur the sharp core
        ctx.fill();

        ctx.restore();

        // Reset context properties to prevent pollution
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    window.addEventListener('resize', resize);
    resize(); // Initiate first draw
    render(); // Start loop

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  );
};

export default Starfield;
