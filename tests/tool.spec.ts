import fs from 'node:fs';
import path from 'node:path';
import { unzipSync } from 'fflate';
import { test, expect, makeImage, inspect, sniff, openTool, upload, downloadNth, resultSizes, runOne } from './helpers';

const KB = 1024;

// A large, noisy photo that is much bigger than every size limit we test.
const photo = (page: any, name = 'photo.jpg') =>
  makeImage(page, { name, type: 'image/jpeg', w: 2400, h: 1600, noise: 40 });

test.describe('compress to a target size', () => {
  for (const kb of [20, 50, 100, 200, 500, 1024]) {
    test(`under ${kb} KB`, async ({ page }) => {
      const img = await photo(page);
      expect(img.buffer.length, 'fixture must be bigger than the limit').toBeGreaterThan(kb * KB);
      const out = await runOne(page, kb === 1024 ? '/compress-image-to-1mb' : `/compress-image-to-${kb}kb`, img);
      expect(sniff(out.buf)).toBe('jpeg');
      expect(out.buf.length).toBeLessThanOrEqual(kb * KB);
      // It should use most of the allowance, not over-compress.
      expect(out.buf.length).toBeGreaterThan(kb * KB * 0.3);
      expect(out.name).toBe('photo-compressed.jpg');
    });
  }

  test('a custom target size works', async ({ page }) => {
    await openTool(page, '/');
    await page.locator('select').nth(1).selectOption('custom');
    await page.getByPlaceholder('Size in KB, e.g. 75').fill('150');
    await upload(page, [await photo(page)]);
    const [size] = await resultSizes(page);
    expect(size).toBeLessThanOrEqual(150 * KB);
    expect(size).toBeGreaterThan(150 * KB * 0.3);
  });

  test('a tiny limit still gives a result that fits', async ({ page }) => {
    await openTool(page, '/');
    await page.locator('select').nth(1).selectOption('custom');
    await page.getByPlaceholder('Size in KB, e.g. 75').fill('2');
    await upload(page, [await photo(page)]);
    const [size] = await resultSizes(page);
    expect(size).toBeLessThanOrEqual(2 * KB);
    await expect(page.getByText('Dimensions were reduced')).toBeVisible();
  });

  test('a file already under the limit is returned untouched', async ({ page }) => {
    const tiny = await makeImage(page, { name: 'tiny.jpg', type: 'image/jpeg', w: 200, h: 150 });
    const out = await runOne(page, '/compress-image-to-100kb', tiny);
    expect(out.buf.equals(tiny.buffer)).toBe(true);
    await expect(page.getByText('Already under the limit')).toBeVisible();
  });

  test('a small WebP stays WebP on a size page', async ({ page }) => {
    const webp = await makeImage(page, { name: 'small.webp', type: 'image/webp', w: 300, h: 200 });
    const out = await runOne(page, '/compress-image-to-200kb', webp);
    expect(sniff(out.buf)).toBe('webp');
    expect(out.buf.equals(webp.buffer)).toBe(true);
  });

  test('a PNG that cannot reach the limit is saved as JPG', async ({ page }) => {
    const png = await makeImage(page, { name: 'shot.png', type: 'image/png', w: 1400, h: 1000, noise: 40 });
    const out = await runOne(page, '/compress-image-to-100kb', png);
    expect(sniff(out.buf)).toBe('jpeg');
    expect(out.buf.length).toBeLessThanOrEqual(100 * KB);
    expect(out.name).toBe('shot.jpg');
    await expect(page.getByText('saved as a JPG')).toBeVisible();
  });

  test('a PNG with flat colors stays PNG and keeps transparency', async ({ page }) => {
    const png = await makeImage(page, { name: 'logo.png', type: 'image/png', w: 1200, h: 800, transparent: true });
    await openTool(page, '/compress-image-to-20kb');
    await upload(page, [png]);
    const out = await downloadNth(page);
    expect(out.buf.length).toBeLessThanOrEqual(20 * KB);
    if (sniff(out.buf) === 'png') expect((await inspect(page, out.buf)).transparent).toBe(true);
  });
});

test.describe('form presets give exact pixel sizes', () => {
  test('photo: 200 x 230 pixels and under 50 KB', async ({ page }) => {
    const out = await runOne(page, '/photo-for-online-form', await photo(page));
    const info = await inspect(page, out.buf);
    expect([info.w, info.h]).toEqual([200, 230]);
    expect(out.buf.length).toBeLessThanOrEqual(50 * KB);
    expect(sniff(out.buf)).toBe('jpeg');
  });

  test('signature: 140 x 60 pixels and under 20 KB', async ({ page }) => {
    const out = await runOne(page, '/signature-for-online-form', await photo(page));
    const info = await inspect(page, out.buf);
    expect([info.w, info.h]).toEqual([140, 60]);
    expect(out.buf.length).toBeLessThanOrEqual(20 * KB);
  });
});

test.describe('format conversion', () => {
  const cases: {
    url: string;
    input: { type: 'image/jpeg' | 'image/png' | 'image/webp'; transparent?: boolean };
    expectFormat: 'jpeg' | 'png' | 'webp';
    ext: string;
    transparentAfter?: boolean;
  }[] = [
    { url: '/png-to-jpg', input: { type: 'image/png', transparent: true }, expectFormat: 'jpeg', ext: 'jpg', transparentAfter: false },
    { url: '/jpg-to-png', input: { type: 'image/jpeg' }, expectFormat: 'png', ext: 'png' },
    { url: '/webp-to-png', input: { type: 'image/webp' }, expectFormat: 'png', ext: 'png' },
    { url: '/webp-to-jpg', input: { type: 'image/webp' }, expectFormat: 'jpeg', ext: 'jpg' },
    { url: '/jpg-to-webp', input: { type: 'image/jpeg' }, expectFormat: 'webp', ext: 'webp' },
    { url: '/png-to-webp', input: { type: 'image/png', transparent: true }, expectFormat: 'webp', ext: 'webp', transparentAfter: true },
  ];

  for (const c of cases) {
    test(c.url, async ({ page }) => {
      const img = await makeImage(page, { name: 'sample.' + c.input.type.split('/')[1], w: 900, h: 600, noise: 20, ...c.input });
      const out = await runOne(page, c.url, img);
      expect(sniff(out.buf)).toBe(c.expectFormat);
      expect(out.name).toBe(`sample.${c.ext}`);
      const info = await inspect(page, out.buf);
      expect([info.w, info.h]).toEqual([900, 600]);
      if (c.transparentAfter !== undefined) expect(info.transparent).toBe(c.transparentAfter);
    });
  }
});

test.describe('compress by format', () => {
  test('compress JPG makes the file smaller', async ({ page }) => {
    const img = await photo(page);
    const out = await runOne(page, '/compress-jpg', img);
    expect(sniff(out.buf)).toBe('jpeg');
    expect(out.buf.length).toBeLessThan(img.buffer.length);
  });

  test('compress PNG makes the file smaller and keeps transparency', async ({ page }) => {
    const img = await makeImage(page, { name: 'art.png', type: 'image/png', w: 1200, h: 800, transparent: true, noise: 6 });
    const out = await runOne(page, '/compress-png', img);
    expect(sniff(out.buf)).toBe('png');
    expect(out.buf.length).toBeLessThan(img.buffer.length);
    expect((await inspect(page, out.buf)).transparent).toBe(true);
  });

  test('a lower quality setting gives a smaller file', async ({ page }) => {
    const img = await photo(page);
    const sizes: number[] = [];
    for (const q of ['90', '30']) {
      await openTool(page, '/compress-jpg');
      await page.locator('input[type=range]').fill(q);
      await upload(page, [img]);
      sizes.push((await resultSizes(page))[0]);
    }
    expect(sizes[1]).toBeLessThan(sizes[0]);
  });

  test('the quality slider is disabled while a target size is set', async ({ page }) => {
    await openTool(page, '/compress-image-to-100kb');
    await expect(page.locator('input[type=range]')).toBeDisabled();
    await page.locator('select').nth(1).selectOption('none');
    await expect(page.locator('input[type=range]')).toBeEnabled();
  });
});

test.describe('resize', () => {
  test('default width 1280 keeps the aspect ratio', async ({ page }) => {
    const out = await runOne(page, '/resize-image', await photo(page));
    const info = await inspect(page, out.buf);
    expect([info.w, info.h]).toEqual([1280, 853]);
  });

  test('width and height with aspect ratio kept fits inside the box', async ({ page }) => {
    await openTool(page, '/resize-image');
    await page.getByLabel('Width in pixels').fill('400');
    await page.getByLabel('Height in pixels').fill('400');
    await upload(page, [await photo(page)]);
    const info = await inspect(page, (await downloadNth(page)).buf);
    expect([info.w, info.h]).toEqual([400, 267]);
  });

  test('unticking keep aspect ratio gives the exact size', async ({ page }) => {
    await openTool(page, '/resize-image');
    await page.getByLabel('Width in pixels').fill('400');
    await page.getByLabel('Height in pixels').fill('400');
    await page.getByLabel('Keep aspect ratio').uncheck();
    await upload(page, [await photo(page)]);
    const info = await inspect(page, (await downloadNth(page)).buf);
    expect([info.w, info.h]).toEqual([400, 400]);
  });

  test('height alone works', async ({ page }) => {
    await openTool(page, '/resize-image');
    await page.getByLabel('Width in pixels').fill('');
    await page.getByLabel('Height in pixels').fill('500');
    await upload(page, [await photo(page)]);
    const info = await inspect(page, (await downloadNth(page)).buf);
    expect([info.w, info.h]).toEqual([750, 500]);
  });

  test('an enlarged image reports its new size', async ({ page }) => {
    await openTool(page, '/resize-image');
    await page.getByLabel('Width in pixels').fill('600');
    await upload(page, [await makeImage(page, { name: 'small.png', type: 'image/png', w: 300, h: 200 })]);
    const info = await inspect(page, (await downloadNth(page)).buf);
    expect([info.w, info.h]).toEqual([600, 400]);
  });
});

test.describe('settings change results live', () => {
  test('changing the target size reprocesses files already added', async ({ page }) => {
    await openTool(page, '/');
    await upload(page, [await photo(page)]);
    const [before] = await resultSizes(page);
    await page.locator('select').nth(1).selectOption('50');
    await expect.poll(async () => (await resultSizes(page))[0], { timeout: 30_000 }).toBeLessThanOrEqual(50 * KB);
    expect(before).toBeGreaterThan(50 * KB);
  });

  test('changing the output format reprocesses files already added', async ({ page }) => {
    await openTool(page, '/');
    await upload(page, [await makeImage(page, { name: 'pic.jpg', type: 'image/jpeg', w: 600, h: 400, noise: 20 })]);
    await page.locator('select').nth(0).selectOption('png');
    await expect.poll(() => page.locator('a[download]').first().getAttribute('download'), { timeout: 30_000 }).toBe('pic.png');
    await page.locator('select').nth(0).selectOption('webp');
    await expect.poll(() => page.locator('a[download]').first().getAttribute('download'), { timeout: 30_000 }).toBe('pic.webp');
  });
});

test.describe('adding files', () => {
  test('several files at once, each with its own result', async ({ page }) => {
    await openTool(page, '/compress-image-to-100kb');
    const files = await Promise.all(
      [1, 2, 3, 4, 5, 6].map((i) => makeImage(page, { name: `batch-${i}.jpg`, type: 'image/jpeg', w: 1400, h: 1000, noise: 40 })),
    );
    await upload(page, files);
    for (const s of await resultSizes(page)) expect(s).toBeLessThanOrEqual(100 * KB);
    await expect(page.getByText('6 images')).toBeVisible();
  });

  test('download all as ZIP, with unique names for duplicates', async ({ page }) => {
    await openTool(page, '/compress-image-to-100kb');
    const a = await photo(page, 'same.jpg');
    const b = await photo(page, 'same.jpg');
    const c = await makeImage(page, { name: 'other.png', type: 'image/png', w: 1200, h: 800, noise: 40 });
    await upload(page, [a, b, c]);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download all as ZIP' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('compressed-images.zip');
    const files = unzipSync(new Uint8Array(fs.readFileSync((await download.path())!)));
    const names = Object.keys(files);
    expect(names).toHaveLength(3);
    expect(new Set(names).size).toBe(3);
    for (const n of names) expect(files[n].length).toBeLessThanOrEqual(100 * KB);
  });

  test('the ZIP button only appears with two or more results', async ({ page }) => {
    await openTool(page, '/');
    await upload(page, [await makeImage(page, { name: 'one.jpg', type: 'image/jpeg', w: 400, h: 300 })]);
    await expect(page.getByRole('button', { name: 'Download all as ZIP' })).toHaveCount(0);
  });

  test('remove deletes one image and clear all deletes the rest', async ({ page }) => {
    await openTool(page, '/');
    await upload(page, [
      await makeImage(page, { name: 'a.jpg', type: 'image/jpeg', w: 400, h: 300 }),
      await makeImage(page, { name: 'b.jpg', type: 'image/jpeg', w: 400, h: 300 }),
    ]);
    await page.getByRole('button', { name: 'Remove a.jpg' }).click();
    await expect(page.locator('a[download]')).toHaveCount(1);
    await expect(page.getByText('b.jpg')).toBeVisible();
    await page.getByRole('button', { name: 'Clear all' }).click();
    await expect(page.locator('a[download]')).toHaveCount(0);
    await expect(page.getByText('Drop images here')).toBeVisible();
  });

  test('files that are not images are skipped with a message', async ({ page }) => {
    await openTool(page, '/');
    await page.locator('input[type=file]').setInputFiles([{ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') }]);
    await expect(page.getByRole('status')).toContainText('skipped');
    await expect(page.locator('a[download]')).toHaveCount(0);
  });

  test('a broken image shows an error instead of hanging', async ({ page }) => {
    await openTool(page, '/');
    await page.locator('input[type=file]').setInputFiles([{ name: 'broken.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('this is not a jpeg') }]);
    await expect(page.getByText(/could not be read|could not save/)).toBeVisible();
    await expect(page.locator('a[download]')).toHaveCount(0);
  });

  test('drag and drop adds an image', async ({ page }) => {
    await openTool(page, '/');
    const img = await makeImage(page, { name: 'dropped.jpg', type: 'image/jpeg', w: 500, h: 400 });
    const dt = await page.evaluateHandle(({ b64, name, type }) => {
      const dt = new DataTransfer();
      dt.items.add(new File([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], name, { type }));
      return dt;
    }, { b64: img.buffer.toString('base64'), name: img.name, type: img.mimeType });
    await page.dispatchEvent('[role=button]', 'dragover', { dataTransfer: dt });
    await page.dispatchEvent('[role=button]', 'drop', { dataTransfer: dt });
    await expect(page.locator('a[download]')).toHaveCount(1);
    await expect(page.getByText('dropped.jpg')).toBeVisible();
  });

  test('pasting an image adds it', async ({ page }) => {
    await openTool(page, '/');
    const img = await makeImage(page, { name: 'pasted.png', type: 'image/png', w: 300, h: 200 });
    await page.evaluate(({ b64, name, type }) => {
      const dt = new DataTransfer();
      dt.items.add(new File([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], name, { type }));
      window.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt }));
    }, { b64: img.buffer.toString('base64'), name: img.name, type: img.mimeType });
    await expect(page.locator('a[download]')).toHaveCount(1);
  });

  test('the drop zone opens the file picker from the keyboard', async ({ page }) => {
    await openTool(page, '/');
    const zone = page.getByRole('button', { name: 'Choose images or drop them here' });
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), (async () => { await zone.focus(); await zone.press('Enter'); })()]);
    expect(chooser.isMultiple()).toBe(true);
  });

  test('the home page file picker accepts HEIC too', async ({ page }) => {
    await openTool(page, '/');
    await expect(page.locator('input[type=file]')).toHaveAttribute('accept', /heic/);
  });
});

test.describe('result details', () => {
  test('shows before and after sizes, pixel size and the saving', async ({ page }) => {
    await openTool(page, '/compress-image-to-100kb');
    await upload(page, [await photo(page)]);
    const row = page.locator('li').first();
    await expect(row).toContainText('2400×1600');
    await expect(row).toContainText('smaller');
    await expect(row.getByRole('img')).toHaveAttribute('aria-label', /% of the original size/);
  });

  test('warns when the converted file is larger', async ({ page }) => {
    await openTool(page, '/jpg-to-png');
    await upload(page, [await makeImage(page, { name: 'p.jpg', type: 'image/jpeg', w: 800, h: 600, noise: 30 })]);
    await expect(page.getByText(/% larger/)).toBeVisible();
  });
});

test.describe('HEIC (needs a real sample file)', () => {
  const heic = path.resolve('tests/fixtures/sample.heic');

  test('converts a HEIC photo to JPG', async ({ page }) => {
    test.skip(!fs.existsSync(heic), 'Put any iPhone photo at tests/fixtures/sample.heic to run this test.');
    await openTool(page, '/heic-to-jpg');
    await page.locator('input[type=file]').setInputFiles(heic);
    await expect(page.locator('a[download]')).toHaveCount(1, { timeout: 90_000 });
    const out = await downloadNth(page);
    expect(sniff(out.buf)).toBe('jpeg');
    expect(out.name).toBe('sample.jpg');
    const info = await inspect(page, out.buf);
    expect(info.w).toBeGreaterThan(100);
  });
});
