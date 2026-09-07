import React from 'react';

export const NoiseOverlay: React.FC = () => {
  return (
    <svg
      className="pointer-events-none fixed inset-0 z-40 h-full w-full opacity-[0.035]"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <filter id="datum-noise">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.85"
          numOctaves="3"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#datum-noise)" />
    </svg>
  );
};
