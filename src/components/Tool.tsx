import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { zipSync } from 'fflate';
import {
  formatBytes,
  isHeic,
  processImage,
  type OutFormat,
  type ProcessOptions,
  type ProcessResult,
  type ToolDefaults,
} from '../lib/engine';

interface Done extends ProcessResult {
  url: string;
}
interface Item {
  id: string;
  file: File;
  thumb: string;
  status: 'queued' | 'working' | 'done' | 'error';
  /** The settings this item was last processed with. */
  key?: string;
  result?: Done;
  error?: string;
}

const TARGETS = [20, 50, 100, 200, 500, 1024];
let counter = 0;

const controlClass =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink disabled:opacity-50';
const primaryBtn =
  'inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:brightness-110';
const secondaryBtn =
  'inline-flex items-center justify-center rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:border-ink';

function Field(props: { label: string; hint?: string; children: ComponentChildren }) {
  return (
    <label class="grid content-start gap-1.5 text-sm">
      <span class="font-semibold">{props.label}</span>
      {props.children}
      {props.hint && <span class="text-xs text-muted">{props.hint}</span>}
    </label>
  );
}

function positiveInt(s: string): number | null {
  const n = parseInt(s, 10);
  return n > 0 ? Math.min(n, 16000) : null;
}

function outName(it: Item): string {
  const r = it.result!;
  const base = it.file.name.replace(/\.[^.]+$/, '') || 'image';
  return r.mime === it.file.type ? `${base}-compressed.${r.ext}` : `${base}.${r.ext}`;
}

export default function Tool({ defaults }: { defaults: ToolDefaults }) {
  const inList = defaults.targetKB !== null && TARGETS.includes(defaults.targetKB);
  const [format, setFormat] = useState<OutFormat>(defaults.format);
  const [quality, setQuality] = useState(defaults.quality);
  const [targetMode, setTargetMode] = useState(
    defaults.targetKB === null ? 'none' : inList ? String(defaults.targetKB) : 'custom',
  );
  const [customKB, setCustomKB] = useState(
    defaults.targetKB !== null && !inList ? String(defaults.targetKB) : '',
  );
  const [width, setWidth] = useState(defaults.width ? String(defaults.width) : '');
  const [height, setHeight] = useState(defaults.height ? String(defaults.height) : '');
  const [keepAspect, setKeepAspect] = useState(defaults.keepAspect);
  const [items, setItems] = useState<Item[]>([]);
  const [over, setOver] = useState(false);
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<Item[]>(items);
  itemsRef.current = items;
  const runRef = useRef(0);

  const targetKB =
    targetMode === 'none' ? null : targetMode === 'custom' ? positiveInt(customKB) : Number(targetMode);
  const opts: ProcessOptions = {
    format,
    quality,
    targetKB,
    width: positiveInt(width),
    height: positiveInt(height),
    keepAspect,
  };
  const optsKey = JSON.stringify(opts);

  function addFiles(list: FileList | File[]) {
    const files = Array.from(list);
    const ok = files.filter(
      (f) => (f.type.startsWith('image/') || isHeic(f)) && f.type !== 'image/svg+xml',
    );
    const skipped = files.length - ok.length;
    setMessage(
      skipped
        ? `${skipped} file${skipped > 1 ? 's were' : ' was'} skipped. Only JPG, PNG, WebP, GIF, BMP and HEIC images work here.`
        : '',
    );
    if (!ok.length) return;
    setItems((prev) => [
      ...prev,
      ...ok.map((f) => ({
        id: String(++counter),
        file: f,
        thumb: isHeic(f) ? '' : URL.createObjectURL(f),
        status: 'queued' as const,
      })),
    ]);
  }

  function patch(id: string, change: Partial<Item>) {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...change } : p)));
  }

  function removeItem(id: string) {
    setItems((prev) => {
      const gone = prev.find((p) => p.id === id);
      if (gone) {
        if (gone.thumb) URL.revokeObjectURL(gone.thumb);
        if (gone.result) URL.revokeObjectURL(gone.result.url);
      }
      return prev.filter((p) => p.id !== id);
    });
  }

  function clearAll() {
    items.forEach((it) => {
      if (it.thumb) URL.revokeObjectURL(it.thumb);
      if (it.result) URL.revokeObjectURL(it.result.url);
    });
    setItems([]);
    setMessage('');
  }

  // Process anything that has not been processed with the current settings.
  useEffect(() => {
    if (!itemsRef.current.some((i) => i.key !== optsKey)) return;
    const runId = ++runRef.current;
    const timer = setTimeout(async () => {
      for (const it of [...itemsRef.current]) {
        if (runRef.current !== runId) return;
        if (it.key === optsKey) continue;
        patch(it.id, { status: 'working' });
        try {
          const r = await processImage(it.file, opts);
          if (runRef.current !== runId) return;
          if (!itemsRef.current.some((p) => p.id === it.id)) continue;
          const url = URL.createObjectURL(r.blob);
          setItems((prev) =>
            prev.map((p) => {
              if (p.id !== it.id) return p;
              if (p.result) URL.revokeObjectURL(p.result.url);
              return { ...p, status: 'done', key: optsKey, result: { ...r, url }, error: undefined };
            }),
          );
        } catch (e) {
          if (runRef.current !== runId) return;
          patch(it.id, {
            status: 'error',
            key: optsKey,
            error: e instanceof Error ? e.message : 'Something went wrong with this file.',
          });
        }
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [items.length, optsKey]);

  // Paste images from the clipboard.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = e.clipboardData?.files;
      if (files && files.length) addFiles(files);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  async function downloadAll() {
    const files: Record<string, Uint8Array> = {};
    const used = new Set<string>();
    for (const it of items) {
      if (!it.result) continue;
      let name = outName(it);
      let n = 1;
      while (used.has(name)) name = outName(it).replace(/(\.[^.]+)$/, `-${n++}$1`);
      used.add(name);
      files[name] = new Uint8Array(await it.result.blob.arrayBuffer());
    }
    const zip = zipSync(files, { level: 0 });
    const url = URL.createObjectURL(new Blob([zip as BlobPart], { type: 'application/zip' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'compressed-images.zip';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  const done = items.filter((i) => i.result);
  const totalBefore = done.reduce((s, i) => s + i.file.size, 0);
  const totalAfter = done.reduce((s, i) => s + i.result!.blob.size, 0);
  const busy = items.some((i) => i.status === 'queued' || i.status === 'working');
  const hasItems = items.length > 0;

  return (
    <section aria-label="Image tool" class="grid gap-5">
      <div
        role="button"
        tabIndex={0}
        aria-label="Choose images or drop them here"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (e.dataTransfer?.files) addFiles(e.dataTransfer.files);
        }}
        class={`cursor-pointer rounded-2xl border-2 px-6 text-center transition-colors ${
          hasItems ? 'py-6' : 'py-14 sm:py-20'
        } ${over ? 'border-accent bg-accent/10' : 'border-ink/80 bg-surface hover:border-accent'}`}
      >
        <svg
          class="mx-auto mb-3 size-10 text-accent"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M12 4v10m0 0-4-4m4 4 4-4" />
          <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
        </svg>
        <p class="text-xl font-bold sm:text-2xl">{hasItems ? 'Add more images' : 'Drop images here'}</p>
        <p class="mt-1 text-sm text-muted">
          Click to choose files, or paste an image with Ctrl or Cmd + V.
        </p>
        {!hasItems && (
          <p class="mt-4 text-sm font-medium">
            Your images stay on this device. Nothing is uploaded.
          </p>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={defaults.accept}
        class="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const input = e.currentTarget;
          if (input.files) addFiles(input.files);
          input.value = '';
        }}
      />

      <div class="grid gap-4 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Save as">
          <select
            class={controlClass}
            value={format}
            onChange={(e) => setFormat(e.currentTarget.value as OutFormat)}
          >
            <option value="original">Same as original</option>
            <option value="jpeg">JPG</option>
            <option value="png">PNG</option>
            <option value="webp">WebP</option>
          </select>
        </Field>

        <Field
          label="Target file size"
          hint={targetKB ? 'Finds the best quality that fits.' : 'Pick a limit, or leave it off.'}
        >
          <select
            class={controlClass}
            value={targetMode}
            onChange={(e) => setTargetMode(e.currentTarget.value)}
          >
            <option value="none">No limit</option>
            {TARGETS.map((kb) => (
              <option value={String(kb)} key={kb}>
                {kb === 1024 ? 'Under 1 MB' : `Under ${kb} KB`}
              </option>
            ))}
            <option value="custom">Custom</option>
          </select>
          {targetMode === 'custom' && (
            <input
              class={controlClass}
              type="number"
              min="1"
              inputMode="numeric"
              placeholder="Size in KB, e.g. 75"
              value={customKB}
              onInput={(e) => setCustomKB(e.currentTarget.value)}
            />
          )}
        </Field>

        <Field
          label={`Quality ${quality}%`}
          hint={
            targetKB
              ? 'Set automatically while a target size is on.'
              : format === 'png'
                ? 'Lower values use fewer colors. 100% is lossless.'
                : 'Around 80% looks the same to most eyes.'
          }
        >
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={quality}
            disabled={targetKB !== null}
            class="w-full accent-[var(--accent)] disabled:opacity-40"
            onInput={(e) => setQuality(Number(e.currentTarget.value))}
          />
        </Field>

        <fieldset class="grid content-start gap-1.5 text-sm">
          <legend class="mb-1.5 font-semibold">Resize in pixels</legend>
          <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <input
              class={controlClass}
              type="number"
              min="1"
              inputMode="numeric"
              placeholder="Width"
              aria-label="Width in pixels"
              value={width}
              onInput={(e) => setWidth(e.currentTarget.value)}
            />
            <span aria-hidden="true" class="text-muted">
              by
            </span>
            <input
              class={controlClass}
              type="number"
              min="1"
              inputMode="numeric"
              placeholder="Height"
              aria-label="Height in pixels"
              value={height}
              onInput={(e) => setHeight(e.currentTarget.value)}
            />
          </div>
          <label class="mt-1 flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={keepAspect}
              class="size-4 accent-[var(--accent)]"
              onChange={(e) => setKeepAspect(e.currentTarget.checked)}
            />
            Keep aspect ratio
          </label>
        </fieldset>
      </div>

      <p class="min-h-5 text-sm text-warn" role="status" aria-live="polite">
        {message}
      </p>

      {hasItems && (
        <div class="overflow-hidden rounded-2xl border border-line bg-surface">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <p class="text-sm tabular-nums" aria-live="polite">
              <span class="font-semibold">
                {items.length} image{items.length > 1 ? 's' : ''}
              </span>
              {done.length > 0 && (
                <span class="text-muted">
                  {' '}
                  {formatBytes(totalBefore)} to {formatBytes(totalAfter)}
                </span>
              )}
              {busy && <span class="text-muted"> Working…</span>}
            </p>
            <div class="flex flex-wrap gap-2">
              {done.length > 1 && (
                <button type="button" class={primaryBtn} onClick={downloadAll}>
                  Download all as ZIP
                </button>
              )}
              <button type="button" class={secondaryBtn} onClick={clearAll}>
                Clear all
              </button>
            </div>
          </div>

          <ul>
            {items.map((it) => {
              const r = it.result;
              const saved = r ? Math.round((1 - r.blob.size / it.file.size) * 100) : 0;
              const ratio = r ? Math.min(1, r.blob.size / it.file.size) : 1;
              return (
                <li
                  key={it.id}
                  class="grid grid-cols-[56px_1fr] items-center gap-x-4 gap-y-3 border-b border-line px-5 py-4 last:border-b-0 sm:grid-cols-[56px_1fr_auto]"
                >
                  <div class="size-14 overflow-hidden rounded-lg bg-ground">
                    {(r?.url || it.thumb) && (
                      <img
                        src={r?.url || it.thumb}
                        alt=""
                        class="size-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>

                  <div class="min-w-0">
                    <p class="truncate font-semibold" title={it.file.name}>
                      {it.file.name}
                    </p>
                    {r ? (
                      <>
                        <p class="text-sm tabular-nums text-muted">
                          {formatBytes(it.file.size)} to {formatBytes(r.blob.size)}
                          {'  '}
                          <span class="whitespace-nowrap">
                            {r.origWidth}×{r.origHeight}
                            {r.width !== r.origWidth || r.height !== r.origHeight
                              ? ` to ${r.width}×${r.height}`
                              : ''}{' '}
                            px
                          </span>
                        </p>
                        <div
                          class="mt-2 h-2 overflow-hidden rounded-full bg-line/70"
                          role="img"
                          aria-label={`New file is ${Math.round(ratio * 100)}% of the original size`}
                        >
                          <div
                            class="h-full rounded-full bg-accent transition-[width] duration-500"
                            style={{ width: `${Math.max(2, ratio * 100)}%` }}
                          />
                        </div>
                        {!r.reachedTarget && (
                          <p class="mt-2 rounded-md bg-warn-bg px-3 py-2 text-sm text-warn">
                            Could not reach {targetKB} KB. The smallest result is{' '}
                            {formatBytes(r.blob.size)}. Try a smaller width or height.
                          </p>
                        )}
                        {r.note && <p class="mt-2 text-xs text-muted">{r.note}</p>}
                      </>
                    ) : it.status === 'error' ? (
                      <p class="mt-1 text-sm text-warn">{it.error}</p>
                    ) : (
                      <p class="mt-1 animate-pulse text-sm text-muted">Working…</p>
                    )}
                  </div>

                  <div class="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-1 sm:justify-end">
                    {r &&
                      (saved > 0 ? (
                        <span class="rounded-full bg-good-bg px-2.5 py-1 text-xs font-semibold text-good">
                          {saved}% smaller
                        </span>
                      ) : saved < 0 ? (
                        <span class="rounded-full bg-warn-bg px-2.5 py-1 text-xs font-semibold text-warn">
                          {Math.abs(saved)}% larger
                        </span>
                      ) : null)}
                    {r && (
                      <a class={primaryBtn} href={r.url} download={outName(it)}>
                        Download
                      </a>
                    )}
                    <button
                      type="button"
                      class={secondaryBtn}
                      onClick={() => removeItem(it.id)}
                      aria-label={`Remove ${it.file.name}`}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
