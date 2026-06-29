import type { ImgHTMLAttributes } from 'react';

/**
 * Flowstack SDK: Lazy-loading, accessible `<img>` wrapper.
 *
 * Wraps `<img>` with sensible defaults for performance: `loading="lazy"`,
 * `decoding="async"`, and a REQUIRED `alt` attribute (TypeScript enforces it).
 *
 * Exported as `LazyImage` (not `Image`) to avoid collision with the native
 * `window.Image` constructor in any consumer that might destructure both.
 *
 * Use instead of raw `<img>` in every Flowstack-generated app so below-the-fold
 * images don't block first paint and every image is accessible + SEO-friendly.
 *
 * @example
 * ```tsx
 * import { LazyImage } from 'flowstack-sdk';
 *
 * <LazyImage src="/dog.jpg" alt="Golden retriever on a leash in a Brooklyn park" width={800} height={600} />
 * ```
 */

interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt' | 'loading'> {
  /** REQUIRED. Descriptive alt text — never "image" or empty for content images. */
  alt: string;
  /** Override lazy loading. Default is lazy; set 'eager' for above-the-fold hero images. */
  loading?: 'lazy' | 'eager';
}

export function LazyImage({ alt, loading = 'lazy', decoding = 'async', ...rest }: LazyImageProps) {
  return <img alt={alt} loading={loading} decoding={decoding} {...rest} />;
}
