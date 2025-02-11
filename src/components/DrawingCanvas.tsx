import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';

interface DrawingCanvasProps {
  onDraw: (texture: THREE.Texture) => void;
}

export function DrawingCanvas({ onDraw }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const textureRef = useRef<THREE.Texture | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  // Initialize canvas and texture
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Store context
    contextRef.current = ctx;

    // Initialize texture only once
    if (!textureRef.current) {
      textureRef.current = new THREE.Texture(canvas);
      textureRef.current.needsUpdate = true;
      onDraw(textureRef.current);
    }
  }, []);

  // Drawing functions
  const startDrawing = useCallback((e: MouseEvent) => {
    isDrawing.current = true;
    const ctx = contextRef.current;
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(e.clientX, e.clientY);
  }, []);

  const stopDrawing = useCallback(() => {
    isDrawing.current = false;
    const ctx = contextRef.current;
    if (!ctx) return;
    
    ctx.beginPath();
  }, []);

  const draw = useCallback((e: MouseEvent) => {
    if (!isDrawing.current || !contextRef.current) return;

    const ctx = contextRef.current;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#ffffff';

    ctx.lineTo(e.clientX, e.clientY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(e.clientX, e.clientY);

    if (textureRef.current) {
      textureRef.current.needsUpdate = true;
    }
  }, []);

  // Event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseout', stopDrawing);
    };
  }, [startDrawing, draw, stopDrawing]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'auto',
        zIndex: 1,
      }}
    />
  );
} 