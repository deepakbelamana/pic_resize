# PicShrink

A free image compressor, converter and resizer that runs entirely in the browser.
No backend, no uploads. Built with Astro, Preact and Tailwind CSS.

## Run it on your Mac

1. Install Node.js 22.23.4 or newer (24 LTS is fine). Either:
   - download the LTS installer from https://nodejs.org, or
   - with Homebrew: `brew install node`
2. Check it: `node -v` should print v22.23.4 or higher.
3. In Terminal:

```bash
cd picshrink
npm install
npm run dev
```

Open http://localhost:4321. Edits reload automatically.

To test the real production output:

```bash
npm run build
npm run preview
```

## Run the automated tests

The suite opens the real built site in a browser and checks every page and feature:
all 21 pages, every target size, all format conversions, resizing, exact-size form presets,
drag and drop, paste, ZIP download, error handling, dark mode and phone-width layout.

First time only (downloads a test browser, about 150 MB):

```bash
npm run test:setup
```

Then, any time:

```bash
npm run test:e2e           # runs everything headless (builds the site first), about 1 to 2 minutes
npm run test:e2e:headed    # same, but you can watch the browser
npm run test:e2e:ui        # interactive runner, good for debugging one test
npx playwright show-report # open the HTML report after a run
```

Run just some tests with `npx playwright test -g "resize"`.

The test images are drawn by the tests, so nothing else is needed. For the HEIC test, copy any
iPhone photo to `tests/fixtures/sample.heic`. Without it that single test is skipped.

If you add a page to `src/lib/presets.ts`, the page tests cover it automatically.

## What is where

| Path | Purpose |
|---|---|
| `src/lib/engine.ts` | Compression, conversion, resize and target-size logic (Canvas API, UPNG for PNG, heic2any for HEIC) |
| `src/components/Tool.tsx` | The interface: drop zone, settings, results, ZIP download |
| `src/lib/presets.ts` | Every tool page. Add an entry here and a new page, sitemap entry and footer link appear |
| `src/pages/[slug].astro` | Template that builds one page per preset |
| `src/pages/index.astro` | Home page |
| `src/config.ts` | Site name. Change it here |
| `tests/` | Playwright tests (`pages.spec.ts` for pages and layout, `tool.spec.ts` for the tool itself) |
| `src/styles/global.css` | Colors and fonts (light and dark) |

## Deploy for free (Cloudflare Pages)

1. Put the project on GitHub.
2. In Cloudflare, go to Workers & Pages, create a Pages project and connect the repo.
3. Build command: `npm run build`. Output directory: `dist`.
4. Add an environment variable `SITE_URL` with your real address, for example `https://yourdomain.com`. It is used for canonical links and the sitemap.
5. Add your domain, then submit `https://yourdomain.com/sitemap-index.xml` in Google Search Console.

Netlify and GitHub Pages also work with the same build settings.

## Before you go live

- Rename the site in `src/config.ts` and check the domain is free.
- Read the form-related pages (`photo-for-online-form`, `signature-for-online-form`) and make sure the example sizes and wording suit what you want to claim.
- Update `src/pages/privacy.astro` to describe any analytics or ads you add.
- Add your analytics or AdSense script in the commented spot in `src/layouts/Layout.astro`.
- Write more helpful text per page over time. Pages with real guidance rank better than pages that only change a number.
