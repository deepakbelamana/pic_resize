import { test, expect, openTool } from './helpers';
import { presets } from '../src/lib/presets';

const TARGETS = [20, 50, 100, 200, 500, 1024];

test.describe('every tool page', () => {
  for (const p of presets) {
    test(`/${p.slug} loads with the right content and starting settings`, async ({ page }) => {
      await openTool(page, `/${p.slug}`);

      await expect(page).toHaveTitle(p.title);
      await expect(page.locator('h1')).toHaveText(p.h1);
      await expect(page.locator('meta[name=description]')).toHaveAttribute('content', p.description);
      await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', new RegExp(`/${p.slug}/?$`));

      // Structured data must be valid JSON.
      const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
      expect(ld.length).toBe(2);
      ld.forEach((t) => expect(() => JSON.parse(t)).not.toThrow());

      // Page's own FAQs plus the shared privacy question.
      await expect(page.locator('details')).toHaveCount(p.faq.length + 1);
      await expect(page.locator('section h2').first()).toBeVisible();

      // The tool starts with this preset's settings.
      const selects = page.locator('select');
      await expect(selects.nth(0)).toHaveValue(p.defaults.format);
      const d = p.defaults.targetKB;
      await expect(selects.nth(1)).toHaveValue(d === null ? 'none' : TARGETS.includes(d) ? String(d) : 'custom');
      await expect(page.getByLabel('Width in pixels')).toHaveValue(p.defaults.width ? String(p.defaults.width) : '');
      await expect(page.getByLabel('Height in pixels')).toHaveValue(p.defaults.height ? String(p.defaults.height) : '');
      await expect(page.getByLabel('Keep aspect ratio')).toBeChecked({ checked: p.defaults.keepAspect });
      await expect(page.locator('input[type=range]')).toHaveValue(String(p.defaults.quality));
      await expect(page.locator('input[type=file]')).toHaveAttribute('accept', p.defaults.accept);
    });
  }
});

test.describe('site pages', () => {
  test('home page', async ({ page }) => {
    await openTool(page, '/');
    await expect(page.locator('h1')).toContainText('Compress, convert and resize');
    await expect(page.locator('h2', { hasText: 'Pick the job you have' })).toBeVisible();
    // Every preset is linked from the home page.
    for (const p of presets) {
      await expect(page.locator(`main a[href="/${p.slug}"]`).first()).toBeAttached();
    }
    await expect(page.locator('table')).toBeVisible();
  });

  test('footer links go to real pages', async ({ page, request }) => {
    await page.goto('/privacy');
    const hrefs = await page.locator('footer a').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute('href')!));
    expect(hrefs.length).toBeGreaterThanOrEqual(presets.length);
    for (const href of hrefs) {
      const res = await request.get(href);
      expect(res.status(), href).toBe(200);
    }
  });

  test('privacy page', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.locator('h1')).toHaveText('Privacy');
  });

  test('unknown URL returns the 404 page', async ({ request }) => {
    const res = await request.get('/this-page-does-not-exist');
    expect(res.status()).toBe(404);
    expect(await res.text()).toContain('That page does not exist');
  });

  test('robots.txt points to the sitemap', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    expect(await res.text()).toMatch(/Sitemap: .*sitemap-index\.xml/);
  });

  test('sitemap lists every tool page', async ({ request }) => {
    const index = await request.get('/sitemap-index.xml');
    expect(index.status()).toBe(200);
    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    for (const p of presets) expect(sitemap).toContain(`/${p.slug}/`);
  });

  test('favicon is served', async ({ request }) => {
    expect((await request.get('/favicon.svg')).status()).toBe(200);
  });
});

test.describe('layout', () => {
  test('no sideways scrolling on a phone-sized screen', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    for (const url of ['/', ...presets.map((p) => `/${p.slug}`), '/privacy']) {
      await page.goto(url);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${url} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
    }
    await ctx.close();
  });

  test('dark mode follows the system setting', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'dark' });
    const page = await ctx.newPage();
    await page.goto('/');
    const bg = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
    expect(bg).toBe('rgb(12, 17, 28)');
    await ctx.close();
  });

  test('light mode uses the light palette', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'light' });
    const page = await ctx.newPage();
    await page.goto('/');
    const bg = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
    expect(bg).toBe('rgb(238, 241, 246)');
    await ctx.close();
  });

  test('FAQ items open and close', async ({ page }) => {
    await page.goto('/compress-image-to-100kb');
    const first = page.locator('details').first();
    await expect(first).not.toHaveAttribute('open', '');
    await first.locator('summary').click();
    await expect(first).toHaveAttribute('open', '');
  });

  test('skip link is the first focusable element', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to the tool' })).toBeFocused();
  });
});
