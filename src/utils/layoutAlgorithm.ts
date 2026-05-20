import type { Photo, Placement, LayoutResult } from '../types';

/**
 * Generates a random collage layout using recursive binary partitioning.
 *
 * The canvas (minus margins) is recursively split into exactly one region per
 * photo, so every photo is placed, the whole page is filled, and the only
 * empty pixels are margins and gaps.  Photos are displayed with object-fit:cover
 * so they are cropped along at most one axis.
 */
export function generateLayout(
  photos: Photo[],
  collageWidth: number,
  collageHeight: number,
  margin: number,
  gap: number,
): LayoutResult {
  if (photos.length === 0) return { placements: [], unplaced: [] };

  const aw = collageWidth  - 2 * margin;
  const ah = collageHeight - 2 * margin;

  if (aw <= 0 || ah <= 0) return { placements: [], unplaced: [...photos] };

  // Shuffle so every regenerate produces a different assignment
  const shuffled = [...photos].sort(() => Math.random() - 0.5);

  const placements: Placement[] = [];
  partition(shuffled, margin, margin, aw, ah, gap, placements);

  return { placements, unplaced: [] };
}

/**
 * Recursively splits the region [x, y, w, h] into one sub-region per photo.
 * The split direction and position are randomised to produce organic layouts.
 * Aspect ratios are constrained to avoid extremely wide or tall frames.
 */
function partition(
  photos: Photo[],
  x: number,
  y: number,
  w: number,
  h: number,
  gap: number,
  placements: Placement[],
): void {
  if (photos.length === 0) return;

  if (photos.length === 1) {
    placements.push({ photo: photos[0], x, y, width: Math.max(1, w), height: Math.max(1, h) });
    return;
  }

  const n = photos.length;
  const MAX_ASPECT_RATIO = 3.5; // Avoid frames wider than 3.5:1 or taller than 1:3.5

  // Photo-count split: pick an index in [1, n-1], biased toward the middle
  // with ±25 % jitter for randomness.
  const countRatio = clamp(0.5 + (Math.random() - 0.5) * 0.5, 0.2, 0.8);
  const splitIdx   = clamp(Math.round(n * countRatio), 1, n - 1);

  // Spatial split ratio: proportional to photo counts + small spatial jitter
  // so sizes vary even when photo counts are equal.
  const spatialRatio = clamp(
    splitIdx / n + (Math.random() - 0.5) * 0.3,
    0.2,
    0.8,
  );

  const group1 = photos.slice(0, splitIdx);
  const group2 = photos.slice(splitIdx);

  // Determine cut direction based on aspect ratio constraints
  let cutVertical: boolean;
  
  // Try vertical cut first
  const w1_v = Math.round((w - gap) * spatialRatio);
  const w2_v = w - gap - w1_v;
  const aspectOkVertical = w1_v >= 1 && w2_v >= 1 &&
    (w1_v / h <= MAX_ASPECT_RATIO && h / w1_v <= MAX_ASPECT_RATIO) &&
    (w2_v / h <= MAX_ASPECT_RATIO && h / w2_v <= MAX_ASPECT_RATIO);

  // Try horizontal cut
  const h1_h = Math.round((h - gap) * spatialRatio);
  const h2_h = h - gap - h1_h;
  const aspectOkHorizontal = h1_h >= 1 && h2_h >= 1 &&
    (w / h1_h <= MAX_ASPECT_RATIO && h1_h / w <= MAX_ASPECT_RATIO) &&
    (w / h2_h <= MAX_ASPECT_RATIO && h2_h / w <= MAX_ASPECT_RATIO);

  // Choose direction: prefer aspect-ratio-safe cuts, with randomness for variety
  if (aspectOkVertical && !aspectOkHorizontal) {
    cutVertical = true;
  } else if (aspectOkHorizontal && !aspectOkVertical) {
    cutVertical = false;
  } else if (aspectOkVertical && aspectOkHorizontal) {
    // Both are safe: use original heuristic (prefer cutting along longer axis)
    cutVertical = w >= h
      ? Math.random() < 0.65   // wide region  → mostly left|right cuts
      : Math.random() < 0.35;  // tall region  → mostly top|bottom cuts
  } else {
    // Neither is safe (extreme settings): prefer the one that violates less
    // If current region is too wide, cut vertically; if too tall, cut horizontally
    cutVertical = w > h;
  }

  if (cutVertical) {
    const w1 = Math.round((w - gap) * spatialRatio);
    const w2 = w - gap - w1;
    if (w1 < 1 || w2 < 1) {
      // degenerate (extreme settings) – stack photos in the same cell
      photos.forEach(p => placements.push({ photo: p, x, y, width: w, height: h }));
      return;
    }
    partition(group1, x,            y, w1, h, gap, placements);
    partition(group2, x + w1 + gap, y, w2, h, gap, placements);
  } else {
    const h1 = Math.round((h - gap) * spatialRatio);
    const h2 = h - gap - h1;
    if (h1 < 1 || h2 < 1) {
      photos.forEach(p => placements.push({ photo: p, x, y, width: w, height: h }));
      return;
    }
    partition(group1, x, y,            w, h1, gap, placements);
    partition(group2, x, y + h1 + gap, w, h2, gap, placements);
  }
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}
