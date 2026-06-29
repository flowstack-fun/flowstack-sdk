import { useEffect, useMemo } from 'react';

/**
 * Flowstack SDK: Reusable SEO component for every public page.
 *
 * Populates <title>, <meta description>, canonical URL, OG tags, Twitter
 * card tags, and optional JSON-LD structured data — the fundamentals for
 * both classical SEO (Google) and GEO (LLM citation by ChatGPT/Claude/
 * Perplexity).
 *
 * Implementation note: uses direct `document` manipulation via useEffect
 * instead of react-helmet-async. This means:
 *   - Zero peer dependencies (works in any generated app without extra setup)
 *   - No <HelmetProvider> wrapping required
 *   - No risk of "undefined is not an object (t.add)" crashes when a
 *     consumer app forgets the provider
 *   - Works fine for client-side rendered SPAs (Casino's entire world);
 *     SSR pre-rendering populates the baseline from index.html instead.
 *
 * If you need SSR-aware head management with server rendering, wrap the
 * app in your own `<HelmetProvider>` and use Helmet directly alongside this.
 *
 * @example
 * ```tsx
 * import { SEO } from 'flowstack-sdk';
 *
 * export default function HomePage() {
 *   return (
 *     <>
 *       <SEO
 *         title="Happy Paws Dog Walking"
 *         description="Professional dog walking in Brooklyn. 30-min walks $25, 60-min walks $40."
 *         canonicalUrl="/"
 *         siteName="Happy Paws"
 *         baseUrl="https://happypaws.example"
 *       />
 *       <main>...</main>
 *     </>
 *   );
 * }
 * ```
 */

const FALLBACK_SITE_NAME = 'Flowstack App';

export interface SEOProps {
  /** Page title (without site suffix — the component appends it) */
  title: string;
  /** Meta description — should summarize the page in ~150 chars */
  description: string;
  /** Canonical URL for this page (absolute or path). Defaults to the current pathname. */
  canonicalUrl?: string;
  /** Absolute URL to the OG/Twitter share image */
  ogImage?: string;
  /** Optional comma-joined keywords */
  keywords?: string[];
  /** Optional JSON-LD structured data object(s). Pass the object, not a string. */
  jsonLd?: object | object[];
  /** Site name used in the `<title>` suffix. Should match your brand. */
  siteName?: string;
  /** Absolute base URL for the site (e.g. "https://myapp.com"). Used to resolve canonical URLs. */
  baseUrl?: string;
  /** No-index this page (staging, drafts, authenticated interior pages) */
  noIndex?: boolean;
}

// ─── DOM helpers ────────────────────────────────────────────────────────
// All helpers no-op when `document` is undefined (SSR safety).

function setMeta(attr: 'name' | 'property', key: string, content: string | undefined) {
  if (typeof document === 'undefined' || content == null) return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    el.setAttribute('data-flowstack-seo', '1');
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function removeMeta(attr: 'name' | 'property', key: string) {
  if (typeof document === 'undefined') return;
  const el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (el && el.getAttribute('data-flowstack-seo') === '1') {
    el.remove();
  }
}

function setLink(rel: string, href: string) {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    el.setAttribute('data-flowstack-seo', '1');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function SEO({
  title,
  description,
  canonicalUrl,
  ogImage,
  keywords,
  jsonLd,
  siteName = FALLBACK_SITE_NAME,
  baseUrl,
  noIndex = false,
}: SEOProps) {
  // Stable serialized JSON-LD so effect dependencies don't churn on every render.
  const jsonLdSerialized = useMemo(() => {
    if (!jsonLd) return '';
    const arr = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
    return arr.map((obj) => JSON.stringify(obj)).join('\u0000');
  }, [jsonLd]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Resolve the base URL lazily so SSR doesn't touch `window`.
    const resolvedBase = baseUrl ?? (typeof window !== 'undefined' ? window.location.origin : '');

    // Title: prepend site name unless already included.
    const fullTitle = title.includes(siteName) ? title : `${title} | ${siteName}`;
    const prevTitle = document.title;
    document.title = fullTitle;

    // Canonical URL: resolve relative → absolute.
    const canonical = canonicalUrl
      ? canonicalUrl.startsWith('http')
        ? canonicalUrl
        : `${resolvedBase}${canonicalUrl}`
      : typeof window !== 'undefined'
        ? `${resolvedBase}${window.location.pathname}`
        : resolvedBase;

    // Share image: explicit or brand default.
    const image = ogImage || `${resolvedBase}/og-image.png`;

    // Basic meta
    setMeta('name', 'description', description);
    if (keywords && keywords.length > 0) {
      setMeta('name', 'keywords', keywords.join(', '));
    } else {
      removeMeta('name', 'keywords');
    }

    // Canonical link
    setLink('canonical', canonical);

    // Robots
    if (noIndex) {
      setMeta('name', 'robots', 'noindex, nofollow');
    } else {
      removeMeta('name', 'robots');
    }

    // Open Graph
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', canonical);
    setMeta('property', 'og:image', image);
    setMeta('property', 'og:site_name', siteName);

    // Twitter
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', image);

    // JSON-LD structured data. We tag our own scripts with `data-flowstack-seo`
    // so we can clean them up without touching any JSON-LD the host page
    // might have injected directly into index.html.
    const previousScripts = Array.from(
      document.head.querySelectorAll('script[data-flowstack-seo="1"]')
    );
    previousScripts.forEach((s) => s.remove());

    if (jsonLdSerialized) {
      for (const jsonStr of jsonLdSerialized.split('\u0000')) {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-flowstack-seo', '1');
        script.text = jsonStr;
        document.head.appendChild(script);
      }
    }

    return () => {
      // Restore the previous document title on unmount so pages that navigate
      // back to a no-SEO route don't leave stale titles behind.
      document.title = prevTitle;
      // Note: we intentionally leave the meta tags in place. Next SEO render
      // will overwrite them; full cleanup on every unmount causes flicker.
    };
  }, [
    title,
    description,
    canonicalUrl,
    ogImage,
    keywords ? keywords.join(',') : '',
    jsonLdSerialized,
    siteName,
    baseUrl,
    noIndex,
  ]);

  // This component produces no visible output — all effects are on <head>.
  return null;
}
