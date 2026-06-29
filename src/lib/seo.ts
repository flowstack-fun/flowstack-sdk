/**
 * Flowstack SDK: JSON-LD schema.org helpers for SEO + GEO.
 *
 * Every Flowstack-generated app should use one or more of these builders
 * to inject structured data into the page head (via `<SEO jsonLd={...}>`).
 * Search engines use JSON-LD for rich snippets; LLMs extract it for
 * factual citations.
 *
 * Pass absolute URLs directly, or pass paths and set `baseUrl` per-app
 * via each builder's `baseUrl` option.
 */

function resolveUrl(url: string, baseUrl?: string): string {
  if (url.startsWith('http')) return url;
  const base = baseUrl ?? (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}${url}`;
}

export interface OrganizationOptions {
  name: string;
  url?: string;
  logo?: string;
  description?: string;
  sameAs?: string[];
  contactEmail?: string;
  baseUrl?: string;
}

export function buildOrganizationJsonLd(opts: OrganizationOptions) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: opts.name,
    url: opts.url ?? opts.baseUrl ?? (typeof window !== 'undefined' ? window.location.origin : ''),
    ...(opts.logo && { logo: opts.logo }),
    ...(opts.description && { description: opts.description }),
    ...(opts.sameAs && opts.sameAs.length > 0 && { sameAs: opts.sameAs }),
    ...(opts.contactEmail && {
      contactPoint: {
        '@type': 'ContactPoint',
        email: opts.contactEmail,
        contactType: 'customer support',
      },
    }),
  };
}

export interface WebSiteOptions {
  name: string;
  url?: string;
  description?: string;
  searchUrl?: string;
  baseUrl?: string;
}

export function buildWebSiteJsonLd(opts: WebSiteOptions) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: opts.name,
    url: opts.url ?? opts.baseUrl ?? (typeof window !== 'undefined' ? window.location.origin : ''),
    ...(opts.description && { description: opts.description }),
    ...(opts.searchUrl && {
      potentialAction: {
        '@type': 'SearchAction',
        target: opts.searchUrl,
        'query-input': 'required name=search_term_string',
      },
    }),
  };
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[], baseUrl?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: resolveUrl(item.url, baseUrl),
    })),
  };
}

export interface ArticleOptions {
  title: string;
  description: string;
  url: string;
  datePublished: string; // ISO 8601
  dateModified?: string;
  authorName?: string;
  image?: string;
  baseUrl?: string;
}

export function buildArticleJsonLd(opts: ArticleOptions) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.title,
    description: opts.description,
    url: resolveUrl(opts.url, opts.baseUrl),
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
    ...(opts.authorName && {
      author: { '@type': 'Person', name: opts.authorName },
    }),
    ...(opts.image && { image: opts.image }),
  };
}

export interface FAQPageItem {
  question: string;
  answer: string;
}

/**
 * FAQPage JSON-LD — high-signal GEO primitive.
 *
 * LLMs map Q&A pairs directly to user questions, so FAQs are among the
 * easiest content for generative engines to cite. Pair with the `<FAQ>`
 * component which auto-renders the dl/dt/dd markup.
 */
export function buildFAQPageJsonLd(items: FAQPageItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export interface LocalBusinessOptions {
  name: string;
  description: string;
  url?: string;
  telephone?: string;
  email?: string;
  address?: {
    streetAddress?: string;
    addressLocality: string; // city
    addressRegion?: string; // state/province
    postalCode?: string;
    addressCountry?: string;
  };
  priceRange?: string; // "$" / "$$" / "$$$"
  areaServed?: string | string[];
  openingHours?: string[]; // e.g. ["Mo-Fr 09:00-17:00"]
  baseUrl?: string;
}

/**
 * LocalBusiness JSON-LD — critical for service-area businesses.
 *
 * Rich snippets on Google + direct LLM citations on "dog walkers in Brooklyn"
 * style queries depend on this schema. The build pipeline can infer the type
 * from the user's build prompt (e.g. "dog walking business" → LocalBusiness).
 */
export function buildLocalBusinessJsonLd(opts: LocalBusinessOptions) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: opts.name,
    description: opts.description,
    url: opts.url ?? opts.baseUrl ?? (typeof window !== 'undefined' ? window.location.origin : ''),
    ...(opts.telephone && { telephone: opts.telephone }),
    ...(opts.email && { email: opts.email }),
    ...(opts.address && {
      address: {
        '@type': 'PostalAddress',
        ...opts.address,
      },
    }),
    ...(opts.priceRange && { priceRange: opts.priceRange }),
    ...(opts.areaServed && { areaServed: opts.areaServed }),
    ...(opts.openingHours && opts.openingHours.length > 0 && {
      openingHoursSpecification: opts.openingHours,
    }),
  };
}
