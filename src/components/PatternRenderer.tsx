import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useControls, folder } from 'leva';
import * as THREE from 'three';
import fragmentShader from '../shaders/pattern.frag?raw';

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

interface PatternRendererProps {
  drawingTexture: THREE.Texture | null;
}

export function PatternRenderer({ drawingTexture }: PatternRendererProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // UI Controls with more descriptive labels and folders
  const { 
    a, b, c, d, 
    noiseScale, 
    patternMix, 
    enableDithering, 
    enablePixelation,
    patternType,
    colorTheme 
  } = useControls('Pattern Controls', {
    'Pattern Type': folder({
      patternType: {
        value: 'flow',
        options: ['flow', 'waves', 'cells'],
        label: 'Pattern Style'
      },
    }),
    'Color Theme': folder({
      colorTheme: {
        value: 'cycle',
        options: ['cycle', 'daynight'],
        label: 'Color Mode'
      },
    }),
    'Flow Parameters': folder({
      a: { value: 1.0, min: 0.1, max: 5.0, step: 0.01, label: 'Flow X' },
      b: { value: 2.0, min: 0.1, max: 5.0, step: 0.01, label: 'Flow Y' },
      c: { value: 1.5, min: 0.1, max: 5.0, step: 0.01, label: 'Flow Speed X' },
      d: { value: 1.8, min: 0.1, max: 5.0, step: 0.01, label: 'Flow Speed Y' },
    }),
    'Effect Controls': folder({
      enableDithering: { value: true, label: 'Enable Dithering' },
      enablePixelation: { value: true, label: 'Enable Pixelation' },
      noiseScale: { value: 1.0, min: 0.1, max: 3.0, step: 0.1, label: 'Pixel Size' },
      patternMix: { value: 0.8, min: 0, max: 1, step: 0.01, label: 'Dither Amount' },
    }),
  });

  // Create a default texture for initialization
  const defaultTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.fillRect(0, 0, 1, 1);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  // Shader uniforms
  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      deJongParams: { value: new THREE.Vector4(a, b, c, d) },
      noiseScale: { value: noiseScale },
      patternMix: { value: patternMix },
      drawTexture: { value: defaultTexture },
      enableDithering: { value: enableDithering },
      enablePixelation: { value: enablePixelation },
      patternType: { value: 0 },
      colorTheme: { value: 0 }, // 0: cycle, 1: daynight
    }),
    []
  );

  // Update drawing texture when it changes
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.drawTexture.value = drawingTexture || defaultTexture;
      if (materialRef.current.uniforms.drawTexture.value) {
        materialRef.current.uniforms.drawTexture.value.needsUpdate = true;
      }
    }
  }, [drawingTexture, defaultTexture]);

  // Update resolution when window size changes
  useEffect(() => {
    const handleResize = () => {
      if (materialRef.current) {
        materialRef.current.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Call once to set initial size
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Animation loop with immediate control updates
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
      materialRef.current.uniforms.deJongParams.value.set(a, b, c, d);
      materialRef.current.uniforms.noiseScale.value = noiseScale;
      materialRef.current.uniforms.patternMix.value = patternMix;
      materialRef.current.uniforms.enableDithering.value = enableDithering;
      materialRef.current.uniforms.enablePixelation.value = enablePixelation;
      materialRef.current.uniforms.patternType.value = 
        patternType === 'flow' ? 0 :
        patternType === 'waves' ? 1 : 2;
      materialRef.current.uniforms.colorTheme.value = colorTheme === 'cycle' ? 0 : 1;
      materialRef.current.needsUpdate = true;
    }
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[20, 20]} />
      <shaderMaterial
        ref={materialRef}
        fragmentShader={fragmentShader}
        vertexShader={vertexShader}
        uniforms={uniforms}
        transparent={true}
      />
    </mesh>
  );
} 