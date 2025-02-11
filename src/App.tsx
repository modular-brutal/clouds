import { Canvas } from '@react-three/fiber';
import { PatternRenderer } from './components/PatternRenderer';
import { DrawingCanvas } from './components/DrawingCanvas';
import { useState, useCallback } from 'react';
import { Leva } from 'leva';
import * as THREE from 'three';

function App() {
  const [drawingTexture, setDrawingTexture] = useState<THREE.Texture | null>(null);

  const handleDraw = useCallback((texture: THREE.Texture) => {
    setDrawingTexture(texture);
  }, []);

  return (
    <>
      <Leva 
        oneLineLabels 
        flat 
        titleBar={false}
        theme={{
          colors: {
            highlight1: '#f32121',
            highlight2: '#f32121',
            highlight3: '#ff4444',
            accent1: '#ff6b6b',
            accent2: '#ff8585',
            accent3: '#ffaeae',
          }
        }}
      />
      <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
        <Canvas style={{ background: '#000000' }}>
          <PatternRenderer drawingTexture={drawingTexture} />
        </Canvas>
        <DrawingCanvas onDraw={handleDraw} />
      </div>
    </>
  );
}

export default App;
