import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import projectData from '../data/projects.json';

// Fisher-Yates shuffle
function shuffle(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

// Module-level variables to persist state across route changes
let cachedGridItems = null;
let savedScrollPos = 0;

export default function HomeGrid() {
  const navigate = useNavigate();
  const [hoveredProject, setHoveredProject] = useState(null);
  const [overlayPosition, setOverlayPosition] = useState({ top: '50%', left: '50%' });
  
  const isHoveredRef = useRef(false);
  const marqueeRef = useRef(null);

  // Sync state to ref so the animation loop can cleanly read it every frame
  useEffect(() => {
    isHoveredRef.current = hoveredProject !== null;
  }, [hoveredProject]);

  // Generate grid items only once per session so they don't reshuffle when hitting "Back"
  if (!cachedGridItems) {
    const spacers = Array.from({ length: 250 }).map((_, i) => ({
      isSpacer: true,
      uniqueId: `spacer-${i}`,
      size: Math.random() > 0.85 ? '2x2' : '1x1'
    }));
    
    // Duplicate projects to appear 3 times each, with varying randomized sizes 
    const repeatedProjects = [];
    projectData.forEach(p => {
      for (let i = 0; i < 3; i++) {
        const rand = Math.random();
        let randomSize = '1x1';
        if (rand > 0.85) {
          randomSize = '3x3'; 
        } else if (rand > 0.45) {
          randomSize = '2x2';
        } else {
          randomSize = '1x1';
        }

        repeatedProjects.push({
          ...p,
          uniqueId: `${p.id}-inst-${i}`,
          size: randomSize
        });
      }
    });

    const combined = [...repeatedProjects, ...spacers];
    cachedGridItems = shuffle(combined);
  }
  
  const gridItems = cachedGridItems;

  useEffect(() => {
    let animationFrameId;
    let lastTime = performance.now();
    let currentPos = savedScrollPos;
    
    // 3600px over 60 seconds (60000ms)
    const speed = 3600 / 60000; 

    // Apply the very first position immediately to prevent a visible jump
    if (marqueeRef.current) {
      marqueeRef.current.style.transform = `translateX(${currentPos}px)`;
    }
    
    const update = (time) => {
      const delta = time - lastTime;
      lastTime = time;
      
      // If the delta is extremely large (e.g., user tabbed away), ignore this frame
      if (delta > 100) {
        animationFrameId = requestAnimationFrame(update);
        return;
      }

      if (!isHoveredRef.current) {
        currentPos -= speed * delta;
        // The block is 3600px wide (40 * 90px). Since we have two blocks 
        // side-by-side, resetting at -3600 creates a flawless loop.
        if (currentPos <= -3600) {
          currentPos += 3600;
        }
        if (marqueeRef.current) {
          marqueeRef.current.style.transform = `translateX(${currentPos}px)`;
        }
        // Save to global state so it's remembered when unmounting
        savedScrollPos = currentPos;
      }
      animationFrameId = requestAnimationFrame(update);
    };
    
    animationFrameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const handleMouseEnter = (item) => {
    setHoveredProject(item);
    
    // Smart placement logic: Find least crowded area
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const margin = viewportW > 600 ? 20 : 10;
    
    const cardW = Math.min(450, viewportW - (margin * 2)); // Dynamic responsive card width
    const cardH = 320; // safe estimation of height with larger fonts and 1-2 paragraphs
    
    const maxSafeW = viewportW - cardW - (margin * 2); 
    const maxSafeH = viewportH - cardH - (margin * 2);
    
    // Fallback if screen is tiny
    if (maxSafeW < 0 || maxSafeH < 0) {
      setOverlayPosition({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
      return;
    }

    // Capture every visible project currently rendered on screen
    const projectElements = document.querySelectorAll('.grid-item');
    const onScreenRects = Array.from(projectElements)
      .map(el => el.getBoundingClientRect())
      .filter(r => r.right > 0 && r.left < viewportW && r.bottom > 0 && r.top < viewportH);

    let bestPos = { top: margin, left: margin };
    let minOverlap = Infinity;

    // Run a Monte Carlo simulation (40 tries) for random points within the safe zone
    for (let i = 0; i < 40; i++) {
      const testX = margin + Math.random() * maxSafeW;
      const testY = margin + Math.random() * maxSafeH;
      let overlapArea = 0;
      
      for (const r of onScreenRects) {
        // Calculate rectangular intersection overlap
        const overlapX = Math.max(0, Math.min(testX + cardW, r.right) - Math.max(testX, r.left));
        const overlapY = Math.max(0, Math.min(testY + cardH, r.bottom) - Math.max(testY, r.top));
        
        if (overlapX > 0 && overlapY > 0) {
          overlapArea += (overlapX * overlapY);
        }
      }

      // If we found a spot with less overlap than the last best, make it the new best
      if (overlapArea < minOverlap) {
        minOverlap = overlapArea;
        bestPos = { top: testY, left: testX };
      }
      
      // If we found a spot with zero overlap, we can exit early!
      if (overlapArea === 0) break;
    }

    setOverlayPosition({
      top: `${bestPos.top}px`,
      left: `${bestPos.left}px`,
      transform: 'none'
    });
  };

  // Extract a single block rendering so we can duplicate it seamlessly
  const renderGridBlock = (blockId) => (
    <div className="home-grid-block" key={blockId}>
      {gridItems.map((item, idx) => {
        if (item.isSpacer) {
          return (
            <div 
              key={`${blockId}-${item.uniqueId}-${idx}`} 
              className={`grid-spacer size-${item.size}`}
            />
          );
        }
        
        return (
          <div 
            key={`${blockId}-${item.uniqueId}-${idx}`}
            className={`grid-item size-${item.size}`}
            onClick={() => navigate(`/project/${item.id}`)}
            onMouseEnter={() => handleMouseEnter(item)}
            onMouseLeave={() => setHoveredProject(null)}
          >
            <img 
              src={`/projects/${item.id}/key-image.jpg`} 
              alt={item.title} 
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <div className="marquee-wrapper">
        <div className={`marquee-train ${hoveredProject ? 'has-hover' : ''}`} ref={marqueeRef}>
          {renderGridBlock('block-1')}
          {renderGridBlock('block-2')}
        </div>
      </div>
      
      {hoveredProject && (
        <div className="global-project-overlay">
          <div className="overlay-card" style={overlayPosition}>
            <h2>{hoveredProject.title}</h2>
            <p>{hoveredProject.description}</p>
          </div>
        </div>
      )}
    </>
  );
}
