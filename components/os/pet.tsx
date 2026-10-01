'use client';

export const PET_W = 88;
export const PET_H = 92;
/** Where the pointing arm pivots, in the pet's own (unflipped) coordinates. */
export const PET_SHOULDER = { x: 22, y: 62 };

const PX = 4; // one sprite pixel
const COLOR: Record<string, string> = {
  k: '#5B2F0E', // outline
  o: '#DE8E32', // coat
  d: '#B96A1E', // coat, shaded
  c: '#F6E0B0', // cream: muzzle, cheeks, chest, paws
  n: '#2E1707', // nose
  p: '#E2706A', // tongue
  b: '#5C6FD6', // collar
  t: '#A9B6F2', // collar tag
};
const EYE = '#1E1208';

// Left half of the sprite, 11 pixels wide; the right half is its mirror image.
const HALF = [
  '...........',
  '...kk......',
  '..kook.....',
  '..kcook....',
  '..kcoookkkk',
  '..koooooooo',
  '.kooooooooo',
  '.koooocoooo',
  '.kooooooooo',
  '.kcoooooccc',
  '.kccooocccn',
  '..kccoccccc',
  '...kccccckp',
  '....kkbbbbb',
  '...koooccct',
  '..koooocccc',
  '..koooocccc',
  '.kooookoook',
  '.kdoookoook',
  '.kdoookoook',
  '.kccokkccck',
  '..kkkkkkkkk',
];
const EYES = [{ col: 6, row: 8 }, { col: 15, row: 8 }]; // each one pixel wide, two tall

// Runs of the same colour in a row become one rect.
const BODY = HALF.flatMap((half, row) => {
  const line = half + [...half].reverse().join('');
  const rects: { x: number; y: number; w: number; fill: string }[] = [];
  for (let col = 0; col < line.length; ) {
    let end = col;
    while (end < line.length && line[end] === line[col]) end++;
    if (COLOR[line[col]]) rects.push({ x: col * PX, y: row * PX, w: (end - col) * PX, fill: COLOR[line[col]] });
    col = end;
  }
  return rects;
});

type Props = {
  /** Degrees the arm is swung up from pointing straight ahead (ahead = left, or right when flipped). */
  angle: number;
  /** Arm length in px, shoulder to paw. */
  reach: number;
  /** Face right instead of left. */
  flip?: boolean;
  /** Wave hello instead of tapping at the target. */
  wave?: boolean;
};

/** Mochi, the pixel-art shiba who gives the tour. The arm is real: it rotates and stretches to whatever she points at. */
export function Pet({ angle, reach, flip = false, wave = false }: Props) {
  return (
    <svg
      width={PET_W}
      height={PET_H}
      viewBox={`0 0 ${PET_W} ${PET_H}`}
      shapeRendering="crispEdges"
      aria-hidden
      style={{ overflow: 'visible', transform: flip ? 'scaleX(-1)' : undefined }}
    >
      <rect x={8} y={84} width={72} height={6} fill="rgba(0,0,0,0.28)" />
      {BODY.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={PX} fill={r.fill} />
      ))}
      <g className="os-pet-blink" style={{ transformOrigin: '44px 36px' }}>
        {EYES.map((e) => (
          <rect key={e.col} x={e.col * PX} y={e.row * PX} width={PX} height={PX * 2} fill={EYE} />
        ))}
      </g>

      <g style={{ transform: `translate(${PET_SHOULDER.x}px, ${PET_SHOULDER.y}px) rotate(${angle}deg)`, transition: 'transform 300ms ease' }}>
        <g className={wave ? 'os-pet-wave' : 'os-pet-poke'}>
          <rect x={-reach - 6} y={-8} width={reach + 12} height={16} fill={COLOR.k} />
          <rect x={-reach - 2} y={-4} width={reach + 4} height={8} fill={COLOR.o} />
          <rect x={-reach - 2} y={-4} width={12} height={8} fill={COLOR.c} />
        </g>
      </g>
    </svg>
  );
}
