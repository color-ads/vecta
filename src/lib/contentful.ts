// Contentful Delivery API client.
//
// Usage in an Astro component (server-side, runs at build/SSR time):
//
//   ---
//   import { getContentfulClient } from '../lib/contentful';
//   const client = getContentfulClient();
//   const entries = await client.getEntries({ content_type: 'tipologia' });
//   ---
//
// For unpublished content in dev, pass `{ preview: true }` and set
// CONTENTFUL_PREVIEW_TOKEN in `.env`.

import { createClient, type ContentfulClientApi } from 'contentful';

interface ClientOptions {
  /** When true, uses the Preview API token (unpublished + draft content). */
  preview?: boolean;
}

let cachedDelivery: ContentfulClientApi<undefined> | null = null;
let cachedPreview: ContentfulClientApi<undefined> | null = null;

/**
 * Returns a memoized Contentful client. Reads credentials from env vars at
 * call time (Astro exposes `import.meta.env` for non-PUBLIC vars on the
 * server side).
 *
 * Throws a descriptive error if required env vars are missing — fail fast
 * during build instead of silently shipping a broken page.
 */
export function getContentfulClient(opts: ClientOptions = {}): ContentfulClientApi<undefined> {
  const preview = opts.preview === true;

  if (preview && cachedPreview) return cachedPreview;
  if (!preview && cachedDelivery) return cachedDelivery;

  const space = import.meta.env.CONTENTFUL_SPACE_ID;
  const environment = import.meta.env.CONTENTFUL_ENVIRONMENT || 'master';
  const accessToken = preview
    ? import.meta.env.CONTENTFUL_PREVIEW_TOKEN
    : import.meta.env.CONTENTFUL_ACCESS_TOKEN;

  if (!space) {
    throw new Error(
      'Contentful: CONTENTFUL_SPACE_ID is not set. Copy .env.example to .env and fill in real credentials.',
    );
  }
  if (!accessToken) {
    throw new Error(
      `Contentful: ${preview ? 'CONTENTFUL_PREVIEW_TOKEN' : 'CONTENTFUL_ACCESS_TOKEN'} is not set.`,
    );
  }

  const client = createClient({
    space,
    accessToken,
    environment,
    host: preview ? 'preview.contentful.com' : 'cdn.contentful.com',
  });

  if (preview) cachedPreview = client;
  else cachedDelivery = client;

  return client;
}

// Memoized fetch of the singleton `webSite` entry. Sections call this in
// their frontmatter; we cache the result so multiple sections in the same
// build don't issue duplicate requests.
let cachedWebsite: any = null;
export async function getWebsite(): Promise<any> {
  if (cachedWebsite) return cachedWebsite;
  const client = getContentfulClient();
  const res = await client.getEntries({
    content_type: 'webSite',
    limit: 1,
    include: 2,
  });
  cachedWebsite = res.items[0] ?? null;
  return cachedWebsite;
}

