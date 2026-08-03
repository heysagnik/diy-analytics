import React from 'react';

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
};


const mulberry32 = (seed: number) => {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const GRID = 5;
const HALF = Math.ceil(GRID / 2);

interface VisitorAvatarProps {
  userId: string;
  size?: number;
  className?: string;
}

export const VisitorAvatar: React.FC<VisitorAvatarProps> = ({ userId, size = 28, className = '' }) => {
  const seed = hashString(userId);
  const rand = mulberry32(seed);
  const hue = Math.abs(seed) % 360;

  const cells: boolean[][] = Array.from({ length: GRID }, () =>
    Array.from({ length: HALF }, () => rand() > 0.45)
  );

  const cellSize = 100 / GRID;

  return (
    <div
      className={`overflow-hidden rounded-md ring-1 ring-inset ring-black/10 dark:ring-white/10 ${className}`}
      style={{ width: size, height: size, flexShrink: 0 }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
        <rect width="100" height="100" fill={`hsl(${hue} var(--avatar-bg-s) var(--avatar-bg-l))`} />
        {cells.map((row, y) =>
          row.map((filled, x) => {
            if (!filled) return null;
            const mirroredX = GRID - 1 - x;
            return (
              <React.Fragment key={`${x}-${y}`}>
                <rect x={x * cellSize} y={y * cellSize} width={cellSize} height={cellSize} fill={`hsl(${hue} var(--avatar-cell-s) var(--avatar-cell-l))`} />
                {mirroredX !== x && (
                  <rect x={mirroredX * cellSize} y={y * cellSize} width={cellSize} height={cellSize} fill={`hsl(${hue} var(--avatar-cell-s) var(--avatar-cell-l))`} />
                )}
              </React.Fragment>
            );
          })
        )}
      </svg>
    </div>
  );
};

export default VisitorAvatar;
