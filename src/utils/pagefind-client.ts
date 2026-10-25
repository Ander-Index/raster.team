/**
 * Shared Pagefind browser lifecycle.
 *
 * Astro's ClientRouter keeps one JavaScript realm while swapping page HTML.
 * Pagefind's module-level singleton caches the FIRST detected `<html lang>`,
 * so navigating from zh -> en -> ja would keep searching the zh index.
 *
 * This helper creates a fresh Pagefind instance per (script URL, current
 * html lang), destroys the previous instance, and ignores superseded loads.
 * It uses Pagefind's public `createInstance()` API (1.5.x) so the index
 * language follows the server-rendered `<html lang>`.
 */
export interface PagefindSearchData {
  url: string;
  excerpt?: string;
  meta?: { title?: string };
}

export interface PagefindResult {
  data: () => Promise<PagefindSearchData>;
}

export interface PagefindResultSet {
  results: PagefindResult[];
}

export interface PagefindInstance {
  init?: () => Promise<void>;
  search: (term: string) => Promise<PagefindResultSet | null>;
  destroy?: () => Promise<void> | void;
}

interface PagefindModule {
  createInstance?: (options: { basePath: string }) => PagefindInstance;
  init?: () => Promise<void>;
  destroy?: () => Promise<void>;
  search?: PagefindInstance['search'];
}

interface ActivePagefind {
  key: string;
  instance: PagefindInstance;
}

const INVALID_SCRIPT = 'Pagefind script URL is missing';

let active: ActivePagefind | null = null;
let pending: { key: string; promise: Promise<PagefindInstance> } | null = null;
let generation = 0;

/** Current SSR language; Astro updates `<html lang>` before `astro:page-load`. */
export function pagefindLanguage(): string {
  return (document.documentElement.lang || 'unknown').toLowerCase();
}

function pagefindBasePath(script: string): string {
  try {
    const path = new URL(script, window.location.origin).pathname;
    return path.endsWith('/') ? path : path.replace(/[^/]*$/, '');
  } catch {
    return script.replace(/[^/]*$/, '');
  }
}

async function destroyQuietly(instance: PagefindInstance | undefined): Promise<void> {
  if (!instance?.destroy) return;
  try {
    await instance.destroy();
  } catch {
    // The old instance may already have been torn down by ClientRouter.
  }
}

/**
 * Get the Pagefind instance for the current document language and bundle.
 * Safe to call concurrently: a newer language supersedes older loads and
 * the old instance is destroyed before the next one is used.
 */
export function getPagefind(script: string | undefined): Promise<PagefindInstance> {
  if (!script) return Promise.reject(new Error(INVALID_SCRIPT));

  const key = `${script}|${pagefindLanguage()}`;
  if (active?.key === key) return Promise.resolve(active.instance);
  if (pending?.key === key) return pending.promise;

  const myGeneration = ++generation;
  const previous = active?.instance;
  active = null;

  const promise = (async () => {
    await destroyQuietly(previous);

    const mod = (await import(/* @vite-ignore */ script)) as PagefindModule;
    // Another navigation/language change won while the module was loading.
    if (myGeneration !== generation) return getPagefind(script);

    let instance: PagefindInstance;
    if (typeof mod.createInstance === 'function') {
      instance = mod.createInstance({ basePath: pagefindBasePath(script) });
      if (typeof instance.init === 'function') await instance.init();
    } else {
      // Compatibility fallback for Pagefind versions without
      // createInstance(). The module-level singleton must be reset.
      if (typeof mod.destroy === 'function') await mod.destroy();
      if (typeof mod.init === 'function') await mod.init();
      if (typeof mod.search !== 'function') {
        throw new Error('Pagefind search() API is unavailable');
      }
      instance = { search: mod.search.bind(mod) };
    }

    if (myGeneration !== generation) {
      await destroyQuietly(instance);
      return getPagefind(script);
    }

    active = { key, instance };
    if (pending?.key === key) pending = null;
    return instance;
  })().catch((error) => {
    if (pending?.key === key) pending = null;
    throw error;
  });

  pending = { key, promise };
  return promise;
}
