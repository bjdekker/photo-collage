import type { DefaultLayout, Placement, Photo, PhotoNatSize } from '../types';

export const DEFAULT_LAYOUTS: DefaultLayout[] = [
  {
    id: 'insta-strip',
    name: 'Insta Strip',
    description: 'Three portrait frames in a vertical column, perfect for Instagram stories',
    width: 4000,
    height: 2667,
    frames: [
      // 3 × 1067 = 3201px; remaining 799px divided into 4 equal gutters ≈ 200px each
      // so frames are evenly spaced and centred on the 4000px canvas.
      { x: 200,  y: 534, width: 1067, height: 1600 },   // Left frame
      { x: 1467, y: 534, width: 1067, height: 1600 },   // Centre frame
      { x: 2734, y: 534, width: 1067, height: 1600 },   // Right frame
    ],
  },
];

export function getDefaultLayoutById(id: string): DefaultLayout | undefined {
  return DEFAULT_LAYOUTS.find(layout => layout.id === id);
}

/**
 * Preload an image to get its natural dimensions.
 * Returns a promise that resolves to PhotoNatSize.
 */
export function preloadImageSize(url: string): Promise<PhotoNatSize> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${url}`));
    };
    img.src = url;
  });
}

/**
 * Preload all image sizes for a list of photos.
 * Returns a Map of photo IDs to their natural sizes.
 */
export async function preloadPhotoSizes(photos: Photo[]): Promise<Map<string, PhotoNatSize>> {
  const sizes = new Map<string, PhotoNatSize>();
  await Promise.all(
    photos.map(async photo => {
      try {
        const size = await preloadImageSize(photo.url);
        sizes.set(photo.id, size);
      } catch (error) {
        console.error(`Failed to preload image for ${photo.name}:`, error);
      }
    })
  );
  return sizes;
}

/**
 * Applies a default layout to photos.
 * Photos are assigned to frames in order.
 * If a photo is landscape (width >= height), it's rotated 90° to portrait mode.
 */
export function applyDefaultLayout(
  photos: Photo[],
  layout: DefaultLayout,
  natSizes: Map<string, PhotoNatSize>,
): Placement[] {
  const placements: Placement[] = [];

  for (let i = 0; i < Math.min(photos.length, layout.frames.length); i++) {
    const photo = photos[i];
    const frame = layout.frames[i];
    const nat = natSizes.get(photo.id);

    // Determine if photo is landscape and should be rotated
    const isLandscape = nat && nat.w >= nat.h;
    const rotation = isLandscape ? 90 : 0;

    placements.push({
      photo,
      x: frame.x,
      y: frame.y,
      width: frame.width,
      height: frame.height,
      rotation,
    });
  }

  return placements;
}
