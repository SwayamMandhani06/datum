import React from 'react';

export const NoiseOverlay: React.FC = () => {
  return (
    <svg
      className="pointer-events-none fixed inset-0 z-[100] h-full w-full opacity-[0.022]"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <filter id="datum-noise-v3">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.72"
          numOctaves="4"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#datum-noise-v3)" />
    </svg>
  );
};
