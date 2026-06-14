import type { Placement, CollageSettings, PhotoOffset, PhotoNatSize } from '../types';

// ─── Shared helpers ────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

/**
 * Compute the CSS-space image position & size within a frame, matching CollageCanvas logic.
 * For 90°/270° rotation the natural dimensions are swapped before computing the cover scale.
 */
function panInfo(fw: number, fh: number, nat: PhotoNatSize | undefined, off: PhotoOffset, rotation = 0) {
  if (!nat || nat.w === 0 || nat.h === 0) return { imgW: fw, imgH: fh, imgLeft: 0, imgTop: 0 };
  const isSwapped = rotation === 90 || rotation === 270;
  const visNatW = isSwapped ? nat.h : nat.w;
  const visNatH = isSwapped ? nat.w : nat.h;
  const s = Math.max(fw / visNatW, fh / visNatH);
  const cssW = nat.w * s;
  const cssH = nat.h * s;
  const visW = visNatW * s;
  const visH = visNatH * s;
  const mpx = Math.max(0, (visW - fw) / 2);
  const mpy = Math.max(0, (visH - fh) / 2);
  return { imgW: cssW, imgH: cssH,
    imgLeft: (fw - cssW) / 2 + clamp(off.x, -mpx, mpx),
    imgTop:  (fh - cssH) / 2 + clamp(off.y, -mpy, mpy) };
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
    const { photo, x, y, width: fw, height: fh, rotation } = pl;
    const img = imgMap.get(photo.url)!;
    const nat = natSizes.get(photo.id) ?? { w: img.naturalWidth, h: img.naturalHeight };
    const off = offsets.get(photo.id) ?? { x: 0, y: 0 };
    const rotDeg = rotation ?? 0;
    const { imgLeft, imgTop, imgW, imgH } = panInfo(fw, fh, nat, off, rotDeg);

    ctx.save();

    // Clip to the frame (rounded rect) — always in unrotated canvas space.
    const r = 3;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + fw, y,      x + fw, y + fh, r);
    ctx.arcTo(x + fw, y + fh, x,      y + fh, r);
    ctx.arcTo(x,      y + fh, x,      y,      r);
    ctx.arcTo(x,      y,      x + fw, y,      r);
    ctx.closePath();
    ctx.clip();

    // Rotate around the image element's centre (= frame centre when pan offset is 0).
    // This exactly mirrors the CSS `transform: rotate(Xdeg); transform-origin: center`
    // applied to the <img> element inside the frame div.
    if (rotDeg !== 0) {
      const pivotX = x + imgLeft + imgW / 2;
      const pivotY = y + imgTop  + imgH / 2;
      ctx.translate(pivotX, pivotY);
      ctx.rotate((rotDeg * Math.PI) / 180);
      ctx.translate(-pivotX, -pivotY);
    }

    // Draw the full image at its computed CSS position / CSS size.
    // The clip above ensures only the frame area is visible.
    ctx.drawImage(img, x + imgLeft, y + imgTop, imgW, imgH);

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
    const { photo, x, y, width: fw, height: fh, rotation } = pl;
    const off = offsets.get(photo.id) ?? { x: 0, y: 0 };
    const rotDeg = rotation ?? 0;
    const { imgLeft, imgTop, imgW, imgH } = panInfo(fw, fh, natSizes.get(photo.id), off, rotDeg);

    // Image is positioned at its CSS-space coordinates (pre-rotation).
    const imgX = fp(x + imgLeft);
    const imgY = fp(y + imgTop);
    const href = xmlAttr(encodeFilename(photo.name));

    // Rotation pivot = centre of the image element (= frame centre when pan offset is 0),
    // matching the CSS transform-origin: center behaviour.
    const pivotX = fp(x + imgLeft + imgW / 2);
    const pivotY = fp(y + imgTop  + imgH / 2);
    const transformAttr = rotDeg !== 0 ? ` transform="rotate(${rotDeg} ${pivotX} ${pivotY})"` : '';

    // Wrap in a <g> so the clip-path is applied to the already-rotated image.
    // (Applying clip-path directly on a transformed <image> clips in the wrong space.)
    lines.push(`  <g clip-path="url(#clip-${photo.id})">`);
    lines.push(`    <image`);
    lines.push(`       href="${href}"`);
    lines.push(`       x="${imgX}" y="${imgY}" width="${fp(imgW)}" height="${fp(imgH)}"${transformAttr}`);
    lines.push(`       preserveAspectRatio="none"/>`);
    lines.push(`  </g>`);
  }

  lines.push(`</svg>`);
  triggerDownload(new Blob([lines.join('\n')], { type: 'image/svg+xml;charset=utf-8' }), 'collage.svg');
}
