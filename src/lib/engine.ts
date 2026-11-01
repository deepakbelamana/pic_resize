// Image engine: everything runs in the browser using the Canvas API.
// No file is ever sent to a server.
import UPNG from 'upng-js';

export type OutFormat = 'original' | 'jpeg' | 'png' | 'webp';
type Fmt = 'jpeg' | 'png' | 'webp';

/** Starting settings for one tool page (a "preset"). */
export interface ToolDefaults {
  format: OutFormat;
  /** Target file size in KB (1 KB = 1024 bytes), or null for no limit. */
  targetKB: number | null;
  /** Quality 5-100. Ignored while a target size is set. */
  quality: number;
  width: number | null;
  height: number | null;
  /** When true, width/height act as a bounding box and the ratio is kept. */
  keepAspect: boolean;
  /** Value for the file picker's accept attribute. */
  accept: string;
}

export interface ProcessOptions {
  format: OutFormat;
  quality: number;
  targetKB: number | null;
  width: number | null;
  height: number | null;
  keepAspect: boolean;
}

export interface ProcessResult {
  blob: Blob;
  width: number;
  height: number;
  origWidth: number;
  origHeight: number;
  mime: string;
  ext: string;
  reachedTarget: boolean;
  note?: string;
}

const MIME: Record<Fmt, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};
const EXT: Record<Fmt, string> = { jpeg: 'jpg', png: 'png', webp: 'webp' };

// Safari on iPhone refuses canvases above ~16.7 million pixels.
const MAX_PIXELS = 16_000_000;

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export function isHeic(file: File): boolean {
  return /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  }
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

let webpSupported: boolean | null = null;
function supportsWebp(): boolean {
  if (webpSupported === null) {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    webpSupported = c.toDataURL('image/webp').startsWith('data:image/webp');
  }
  return webpSupported;
}

interface Decoded {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
}

async function decode(file: File): Promise<Decoded> {
  let blob: Blob = file;

  if (isHeic(file)) {
    // The HEIC decoder is large, so it is only loaded when a HEIC file shows up.
    const { default: heic2any } = await import('heic2any');
    const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.95 });
    blob = Array.isArray(out) ? out[0] : out;
  }

  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' });
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      // fall through to the <img> path
    }
  }

  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch {
    URL.revokeObjectURL(url);
    throw new Error('This file could not be read as an image.');
  }
  if (!img.naturalWidth || !img.naturalHeight) {
    URL.revokeObjectURL(url);
    throw new Error('This image has no readable size.');
  }
  return {
    source: img,
    width: img.naturalWidth,
    height: img.naturalHeight,
    close: () => URL.revokeObjectURL(url),
  };
}

function resolveFormat(file: File, wanted: OutFormat): { fmt: Fmt; note?: string } {
  let fmt: Fmt;
  if (wanted === 'original') {
    fmt = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpeg';
  } else {
    fmt = wanted;
  }
  if (fmt === 'webp' && !supportsWebp()) {
    return { fmt: 'jpeg', note: 'This browser cannot save WebP, so the image was saved as JPG.' };
  }
  return { fmt };
}

function fitSize(w: number, h: number, o: ProcessOptions): { w: number; h: number } {
  const tw = o.width;
  const th = o.height;
  if (tw && th && !o.keepAspect) return { w: tw, h: th };
  if (tw || th) {
    const ratio = Math.min(tw ? tw / w : Infinity, th ? th / h : Infinity);
    return { w: Math.max(1, Math.round(w * ratio)), h: Math.max(1, Math.round(h * ratio)) };
  }
  return { w, h };
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/**
 * Draws the source at w x h. Big reductions are done in halving steps, which
 * looks much sharper than one giant jump.
 */
function drawScaled(
  src: CanvasImageSource,
  sw: number,
  sh: number,
  w: number,
  h: number,
  flatten: boolean,
): HTMLCanvasElement {
  let cur: CanvasImageSource = src;
  let cw = sw;
  let ch = sh;
  while (cw / 2 >= w && ch / 2 >= h) {
    const nw = Math.max(1, Math.floor(cw / 2));
    const nh = Math.max(1, Math.floor(ch / 2));
    const step = makeCanvas(nw, nh);
    const sctx = step.getContext('2d')!;
    sctx.imageSmoothingQuality = 'high';
    sctx.drawImage(cur, 0, 0, nw, nh);
    cur = step;
    cw = nw;
    ch = nh;
  }
  const out = makeCanvas(w, h);
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (flatten) {
    // JPG has no transparency, so transparent pixels become white.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(cur, 0, 0, w, h);
  return out;
}

function toBlob(c: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    c.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('The browser could not save this image.'))),
      mime,
      quality,
    );
  });
}

function encodePng(c: HTMLCanvasElement, colors: number): Blob {
  const ctx = c.getContext('2d')!;
  const { data } = ctx.getImageData(0, 0, c.width, c.height);
  // colors = 0 keeps every color (lossless); lower numbers shrink the palette.
  const buf = UPNG.encode([data.buffer], c.width, c.height, colors);
  return new Blob([buf], { type: 'image/png' });
}

/** Encodes the canvas. With a target size, finds the best quality that fits. */
async function encode(
  c: HTMLCanvasElement,
  fmt: Fmt,
  quality: number,
  targetBytes: number | null,
): Promise<Blob> {
  const q = Math.min(1, Math.max(0.05, quality / 100));

  if (fmt === 'png') {
    if (!targetBytes) return encodePng(c, q >= 0.95 ? 0 : Math.max(8, Math.round(q * 256)));
    let last!: Blob;
    for (const colors of [0, 256, 128, 64, 32, 16]) {
      await tick();
      last = encodePng(c, colors);
      if (last.size <= targetBytes) return last;
    }
    return last;
  }

  const mime = MIME[fmt];
  if (!targetBytes) return toBlob(c, mime, q);

  const top = await toBlob(c, mime, 0.95);
  if (top.size <= targetBytes) return top;
  const bottom = await toBlob(c, mime, 0.05);
  if (bottom.size > targetBytes) return bottom;

  let lo = 0.05;
  let hi = 0.95;
  let best = bottom;
  for (let i = 0; i < 7; i++) {
    const mid = (lo + hi) / 2;
    const b = await toBlob(c, mime, mid);
    if (b.size <= targetBytes) {
      best = b;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return best;
}

export async function processImage(file: File, o: ProcessOptions): Promise<ProcessResult> {
  const dec = await decode(file);
  try {
    const { fmt, note } = resolveFormat(file, o.format);
    const notes: string[] = [];
    if (note) notes.push(note);

    const base = fitSize(dec.width, dec.height, o);
    if (base.w * base.h > MAX_PIXELS) {
      const r = Math.sqrt(MAX_PIXELS / (base.w * base.h));
      base.w = Math.max(1, Math.floor(base.w * r));
      base.h = Math.max(1, Math.floor(base.h * r));
      notes.push('This image is very large, so it was scaled down to fit browser limits.');
    }

    const targetBytes = o.targetKB ? Math.round(o.targetKB * 1024) : null;
    const sizeChanged = base.w !== dec.width || base.h !== dec.height;
    const sameFormat = MIME[fmt] === file.type;

    // Already inside the limit and nothing to change: keep the original untouched.
    if (targetBytes && sameFormat && !sizeChanged && file.size <= targetBytes) {
      return {
        blob: file,
        width: dec.width,
        height: dec.height,
        origWidth: dec.width,
        origHeight: dec.height,
        mime: file.type,
        ext: EXT[fmt],
        reachedTarget: true,
        note: 'Already under the limit, so the original file was kept.',
      };
    }

    let scale = 1;
    let shrunk = false;
    let fmtUsed: Fmt = fmt;
    let switchedToJpeg = false;
    let out!: { blob: Blob; w: number; h: number };
    for (let attempt = 0; attempt < 14; attempt++) {
      const w = Math.max(1, Math.round(base.w * scale));
      const h = Math.max(1, Math.round(base.h * scale));
      const canvas = drawScaled(dec.source, dec.width, dec.height, w, h, fmtUsed === 'jpeg');
      await tick();
      const blob = await encode(canvas, fmtUsed, o.quality, targetBytes);
      // A PNG that cannot reach the limit by trimming colors: JPG will do far better.
      if (fmtUsed === 'png' && targetBytes && blob.size > targetBytes && !switchedToJpeg) {
        fmtUsed = 'jpeg';
        switchedToJpeg = true;
        notes.push('This PNG could not get small enough, so it was saved as a JPG. Transparent areas became white.');
        continue;
      }
      out = { blob, w, h };
      if (!targetBytes || blob.size <= targetBytes || Math.min(w, h) <= 24) break;
      // Quality alone was not enough: shrink the pixel dimensions and retry.
      scale *= Math.max(0.5, Math.min(0.92, Math.sqrt(targetBytes / blob.size) * 0.95));
      shrunk = true;
    }

    // Re-encoding made it bigger and nothing else changed: keep the original.
    if (!targetBytes && sameFormat && !sizeChanged && out.blob.size >= file.size) {
      return {
        blob: file,
        width: dec.width,
        height: dec.height,
        origWidth: dec.width,
        origHeight: dec.height,
        mime: file.type,
        ext: EXT[fmt],
        reachedTarget: true,
        note: 'This file is already well optimised, so the original was kept.',
      };
    }

    if (shrunk) notes.push('Dimensions were reduced to fit the size limit.');

    return {
      blob: out.blob,
      width: out.w,
      height: out.h,
      origWidth: dec.width,
      origHeight: dec.height,
      mime: MIME[fmtUsed],
      ext: EXT[fmtUsed],
      reachedTarget: !targetBytes || out.blob.size <= targetBytes,
      note: notes.length ? notes.join(' ') : undefined,
    };
  } finally {
    dec.close();
  }
}
