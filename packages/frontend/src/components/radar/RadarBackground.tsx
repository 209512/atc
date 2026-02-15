import React, { useMemo } from 'react';
import * as THREE from 'three';

interface RadarBackgroundProps {
  isDark: boolean;
}

export const RadarBackground = ({ isDark }: RadarBackgroundProps) => {
    const count = 4000;
    const [positions, colors] = useMemo(() => {
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const color = new THREE.Color();
      
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 50;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
        
        if (isDark) {
            color.setHex(0xffffff);
        } else {
            color.setHex(0x0f172a);
        }
        
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }
      return [positions, colors];
    }, [isDark]);
  
    return (
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
            args={[positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            count={colors.length / 3}
            array={colors}
            itemSize={3}
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={isDark ? 0.1 : 0.15}
          vertexColors
          transparent
          opacity={isDark ? 0.8 : 0.9}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    );
};