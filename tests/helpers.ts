import { test as base, expect, type Page } from '@playwright/test';
import fs from 'node:fs';

export { expect };

/** Fails any test that logs a console error or throws a page error. */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      await use(errors);
      expect(errors, 'browser console errors').toEqual([]);
    },
    { auto: true },
  ],
});

export interface Img {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

interface MakeOpts {
  name: string;
  type: 'image/jpeg' | 'image/png' | 'image/webp';
  w: number;
  h: number;
  /** Leave the background transparent (PNG/WebP only). */
  transparent?: boolean;
  /** Pixel noise strength. Higher means a bigger, harder-to-compress file. */
  noise?: number;
}

/** Draws a synthetic test picture in the browser and returns it as a file. */
export async function makeImage(page: Page, o: MakeOpts): Promise<Img> {
  const b64 = await page.evaluate(async (o) => {
    const c = document.createElement('canvas');
    c.width = o.w;
    c.height = o.h;
    const ctx = c.getContext('2d')!;
    let seed = 12345;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    if (!o.transparent) {
      const g = ctx.createLinearGradient(0, 0, o.w, o.h);
      g.addColorStop(0, '#1e5fd8');
      g.addColorStop(1, '#e8a33d');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, o.w, o.h);
    }
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `hsla(${rnd() * 360},70%,55%,0.85)`;
      ctx.beginPath();
      ctx.arc(rnd() * o.w, rnd() * o.h, 30 + (rnd() * Math.min(o.w, o.h)) / 6, 0, Math.PI * 2);
      ctx.fill();
    }
    if (o.noise) {
      const d = ctx.getImageData(0, 0, o.w, o.h);
      for (let i = 0; i < d.data.length; i += 4) {
        if (d.data[i + 3] === 0) continue;
        const n = (rnd() - 0.5) * o.noise;
        d.data[i] += n;
        d.data[i + 1] += n;
        d.data[i + 2] += n;
      }
      ctx.putImageData(d, 0, 0);
    }
    const blob: Blob = await new Promise((res) => c.toBlob((b) => res(b!), o.type, 0.92));
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = '';
    for (let i = 0; i < buf.length; i += 0x8000) {
      s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    }
    return btoa(s);
  }, o);
  return { name: o.name, mimeType: o.type, buffer: Buffer.from(b64, 'base64') };
}

export type Sniffed = 'jpeg' | 'png' | 'webp' | 'zip' | 'unknown';

/** Identifies a file by its first bytes, so we never trust the file extension. */
export function sniff(buf: Buffer): Sniffed {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf[0] === 0x89 && buf.subarray(1, 4).toString() === 'PNG') return 'png';
  if (buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'webp';
  if (buf[0] === 0x50 && buf[1] === 0x4b) return 'zip';
  return 'unknown';
}

/** Decodes an image in the browser and reports size and transparency. */
export async function inspect(page: Page, buf: Buffer) {
  return page.evaluate(async (b64) => {
    const u8 = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
    const bmp = await createImageBitmap(new Blob([u8]));
    const c = document.createElement('canvas');
    c.width = bmp.width;
    c.height = bmp.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(bmp, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let transparent = false;
    for (let i = 3; i < d.length; i += 4) {
      if (d[i] < 255) {
        transparent = true;
        break;
      }
    }
    return { w: bmp.width, h: bmp.height, transparent };
  }, buf.toString('base64'));
}

/** Opens a page and waits until the tool has hydrated and can accept files. */
export async function openTool(page: Page, url: string) {
  await page.goto(url);
  await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'));
}

/** Adds files and waits until every one has a finished result. */
export async function upload(page: Page, files: Img[], expectedDone = files.length) {
  await page.locator('input[type=file]').setInputFiles(files);
  await expect(page.locator('a[download]')).toHaveCount(expectedDone, { timeout: 60_000 });
}

export async function downloadNth(page: Page, index = 0) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('a[download]').nth(index).click(),
  ]);
  const file = await download.path();
  return { name: download.suggestedFilename(), buf: fs.readFileSync(file!) };
}

/** Byte sizes of every finished result currently on the page. */
export function resultSizes(page: Page): Promise<number[]> {
  return page.evaluate(() =>
    Promise.all(
      [...document.querySelectorAll<HTMLAnchorElement>('a[download]')].map(
        async (a) => (await (await fetch(a.href)).blob()).size,
      ),
    ),
  );
}

/** Convenience: open a tool page, upload one image, download the result. */
export async function runOne(page: Page, url: string, file: Img) {
  await openTool(page, url);
  await upload(page, [file]);
  return downloadNth(page);
}
