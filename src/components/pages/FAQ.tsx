import { useEffect, useId, useMemo } from 'react';

/**
 * Flowstack SDK: FAQ component with auto-generated FAQPage JSON-LD.
 *
 * Renders a semantic `<dl>`/`<dt>`/`<dd>` Q&A list AND injects a matching
 * `FAQPage` JSON-LD block into the document head so Google can produce
 * rich snippets and LLMs (ChatGPT, Claude, Perplexity) can extract the
 * questions as citable answers.
 *
 * Implementation note: manipulates `document.head` via useEffect instead
 * of using `react-helmet-async`. See SEO.tsx for the rationale — same
 * story: zero peer deps, no provider wrapping, can't crash on missing
 * context.
 *
 * @example
 * ```tsx
 * import { FAQ } from 'flowstack-sdk';
 *
 * <FAQ
 *   heading="Common questions"
 *   items={[
 *     { question: "How much does it cost?", answer: "Free tier: 10 credits/day." },
 *     { question: "What can I build?", answer: "CRMs, dashboards, trackers." },
 *   ]}
 * />
 * ```
 */

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQProps {
  items: FAQItem[];
  /** Optional heading above the FAQ list */
  heading?: string;
  /** Heading level for the h-tag (default h2). Keep sequential with your page. */
  headingLevel?: 2 | 3;
}

export function FAQ({ items, heading, headingLevel = 2 }: FAQProps) {
  // Each FAQ instance gets a stable id so multiple FAQs on the same page
  // don't clobber each other's JSON-LD script element.
  const instanceId = useId();

  const jsonLdSerialized = useMemo(() => {
    return JSON.stringify({
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
    });
  }, [items]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const scriptId = `flowstack-faq-jsonld-${instanceId.replace(/[^a-zA-Z0-9]/g, '')}`;
    let script = document.head.querySelector<HTMLScriptElement>(`script#${scriptId}`);
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      script.setAttribute('data-flowstack-seo', '1');
      document.head.appendChild(script);
    }
    script.text = jsonLdSerialized;

    return () => {
      // Remove this instance's script on unmount so stale FAQs don't linger.
      script?.remove();
    };
  }, [instanceId, jsonLdSerialized]);

  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const headingId = heading ? `faq-heading-${instanceId.replace(/[^a-zA-Z0-9]/g, '')}` : undefined;

  return (
    <section aria-labelledby={headingId}>
      {heading && (
        <Heading id={headingId} className="text-2xl font-semibold mb-6">
          {heading}
        </Heading>
      )}
      <dl>
        {items.map((item, i) => (
          <div key={i} className="mb-6">
            <dt className="text-lg font-semibold mb-2">{item.question}</dt>
            <dd className="leading-relaxed">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
