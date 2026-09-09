import React from 'react';

// Subtle noise overlay — very low opacity for surface texture
export const NoiseOverlay: React.FC = () => {
  return (
    <svg
      className="pointer-events-none fixed inset-0 z-[100] h-full w-full opacity-[0.018]"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <filter id="datum-noise-v4">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.65"
          numOctaves="4"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#datum-noise-v4)" />
    </svg>
  );
};
