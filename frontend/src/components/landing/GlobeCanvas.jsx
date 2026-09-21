import { useEffect, useRef } from 'react';
import { createGlobeScene } from '../../utils/landing/globeScene';

export function GlobeCanvas({ spinSpeed }) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scene = createGlobeScene(container, { reducedMotion, spinSpeed });
    sceneRef.current = scene;
    const onPointerMove = (event) => {
      const x = event.clientX / window.innerWidth * 2 - 1;
      const y = event.clientY / window.innerHeight * 2 - 1;
      scene.setPointer(x, y);
    };
    window.addEventListener('pointermove', onPointerMove);
    return () => { window.removeEventListener('pointermove', onPointerMove); scene.dispose(); sceneRef.current = null; };
  }, [spinSpeed]);
  return <div ref={containerRef} className="h-full w-full" aria-hidden="true" />;
}
