import type { Placement, CollageSettings, PhotoOffset, PhotoNatSize } from '../types';

// ─── Shared helpers ────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

/** Compute absolute image position & size within a frame, given the pan offset. */
function panInfo(fw: number, fh: number, nat: PhotoNatSize | undefined, off: PhotoOffset) {
  if (!nat || nat.w === 0 || nat.h === 0) return { imgW: fw, imgH: fh, imgLeft: 0, imgTop: 0, s: 1 };
  const s = Math.max(fw / nat.w, fh / nat.h);
  const iw = nat.w * s; const ih = nat.h * s;
  const mpx = Math.max(0, (iw - fw) / 2); const mpy = Math.max(0, (ih - fh) / 2);
  return { s, imgW: iw, imgH: ih,
    imgLeft: (fw - iw) / 2 + clamp(off.x, -mpx, mpx),
    imgTop:  (fh - ih) / 2 + clamp(off.y, -mpy, mpy) };
}

function loadImg(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load image: ${url}`));
    img.src = url;
  });
}

function triggerDownload(blob: Blob, filename: string) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: filename });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
}

/** Round to 2 decimal places for compact SVG output. */
function fp(n: number) { return String(Math.round(n * 100) / 100); }

/** Escape a string for use inside an XML attribute value. */
function xmlAttr(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Percent-encode characters that are not safe in a relative URL path. */
function encodeFilename(name: string) {
  return name.replace(/[^A-Za-z0-9._\-~]/g, c => encodeURIComponent(c));
}

// ─── Canvas exporter (shared by JPEG + PNG) ────────────────────────────────

async function buildCanvas(
  placements: Placement[], settings: CollageSettings,
  offsets: Map<string, PhotoOffset>, natSizes: Map<string, PhotoNatSize>,
): Promise<HTMLCanvasElement> {
  // Load all unique image URLs concurrently (cached by browser if already loaded)
  const imgMap = new Map<string, HTMLImageElement>();
  await Promise.all([...new Set(placements.map(p => p.photo.url))].map(async url => {
    imgMap.set(url, await loadImg(url));
  }));

  const canvas = document.createElement('canvas');
  canvas.width = settings.width;
  canvas.height = settings.height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, settings.width, settings.height);

  for (const pl of placements) {
    const { photo, x, y, width: fw, height: fh } = pl;
    const img = imgMap.get(photo.url)!;
    const nat = natSizes.get(photo.id) ?? { w: img.naturalWidth, h: img.naturalHeight };
    const off = offsets.get(photo.id) ?? { x: 0, y: 0 };
    const { imgLeft, imgTop, s } = panInfo(fw, fh, nat, off);

    // Source rect in natural-pixel space: the frame-visible slice of the image
    const sx = -imgLeft / s;
    const sy = -imgTop / s;
    const sw = fw / s;
    const sh = fh / s;

    ctx.save();
    ctx.beginPath();
    // Rounded-rect clip (3 px radius, matching the CSS border-radius)
    const r = 3;
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + fw, y,      x + fw, y + fh, r);
    ctx.arcTo(x + fw, y + fh, x,      y + fh, r);
    ctx.arcTo(x,      y + fh, x,      y,      r);
    ctx.arcTo(x,      y,      x + fw, y,      r);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, sx, sy, sw, sh, x, y, fw, fh);
    ctx.restore();
  }

  return canvas;
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((res, rej) =>
    canvas.toBlob(b => b ? res(b) : rej(new Error('Canvas export failed')), type, quality),
  );
}

// ─── Public export functions ───────────────────────────────────────────────

export async function exportAsJpeg(
  placements: Placement[], settings: CollageSettings,
  offsets: Map<string, PhotoOffset>, natSizes: Map<string, PhotoNatSize>,
): Promise<void> {
  const canvas = await buildCanvas(placements, settings, offsets, natSizes);
  triggerDownload(await canvasToBlob(canvas, 'image/jpeg', 1.0), 'collage.jpg');
}

export async function exportAsPng(
  placements: Placement[], settings: CollageSettings,
  offsets: Map<string, PhotoOffset>, natSizes: Map<string, PhotoNatSize>,
): Promise<void> {
  const canvas = await buildCanvas(placements, settings, offsets, natSizes);
  triggerDownload(await canvasToBlob(canvas, 'image/png'), 'collage.png');
}

/**
 * Exports an Inkscape-compatible SVG.
 * Image hrefs are bare filenames — the photo files must live in the same
 * directory as the saved SVG.
 */
export function exportAsSvg(
  placements: Placement[], settings: CollageSettings,
  offsets: Map<string, PhotoOffset>, natSizes: Map<string, PhotoNatSize>,
): void {
  const { width, height } = settings;
  const lines: string[] = [
    `<?xml version="1.0" encoding="UTF-8" standalone="no"?>`,
    `<svg`,
    `   xmlns="http://www.w3.org/2000/svg"`,
    `   xmlns:xlink="http://www.w3.org/1999/xlink"`,
    `   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"`,
    `   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.0.dtd"`,
    `   width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"`,
    `   version="1.1" inkscape:version="1.0">`,
    `  <sodipodi:namedview id="namedview1" inkscape:document-units="px"/>`,
    `  <defs>`,
  ];

  // One clipPath per placement — clips the <image> to the frame rectangle
  for (const pl of placements) {
    lines.push(`    <clipPath id="clip-${pl.photo.id}">`);
    lines.push(`      <rect x="${fp(pl.x)}" y="${fp(pl.y)}" width="${fp(pl.width)}" height="${fp(pl.height)}" rx="3" ry="3"/>`);
    lines.push(`    </clipPath>`);
  }

  lines.push(`  </defs>`);
  lines.push(`  <rect width="${width}" height="${height}" fill="#ffffff"/>`);

  for (const pl of placements) {
    const { photo, x, y, width: fw, height: fh } = pl;
    const off = offsets.get(photo.id) ?? { x: 0, y: 0 };
    const { imgLeft, imgTop, imgW, imgH } = panInfo(fw, fh, natSizes.get(photo.id), off);

    // The <image> is positioned at the full rendered size (including the
    // panned/cropped region) and the clipPath reveals only the frame area.
    const imgX = fp(x + imgLeft);
    const imgY = fp(y + imgTop);
    const href  = xmlAttr(encodeFilename(photo.name));

    lines.push(`  <image`);
    lines.push(`     href="${href}"`);
    lines.push(`     x="${imgX}" y="${imgY}" width="${fp(imgW)}" height="${fp(imgH)}"`);
    lines.push(`     clip-path="url(#clip-${photo.id})"`);
    lines.push(`     preserveAspectRatio="none"/>`);
  }

  lines.push(`</svg>`);
  triggerDownload(new Blob([lines.join('\n')], { type: 'image/svg+xml;charset=utf-8' }), 'collage.svg');
}
