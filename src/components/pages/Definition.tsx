import { useEffect, useId, useMemo } from 'react';

/**
 * Flowstack SDK: Definition component with optional DefinedTermSet JSON-LD (P0-20).
 *
 * Renders semantic <dl>/<dt>/<dd> for glossaries, how-it-works sections,
 * feature explanations, and any key-value content that should be extractable
 * by both search engines and LLMs.
 *
 * @example
 * ```tsx
 * import { Definition } from 'flowstack-sdk';
 *
 * <Definition
 *   heading="How it works"
 *   items={[
 *     { term: "Upload", definition: "Drop your CSV and we parse it automatically." },
 *     { term: "Analyze", definition: "Our AI runs statistical analysis on your data." },
 *   ]}
 * />
 * ```
 */

export interface DefinitionItem {
  term: string;
  definition: string;
}

export interface DefinitionProps {
  items: DefinitionItem[];
  heading?: string;
  headingLevel?: 2 | 3;
  /** Inject DefinedTermSet JSON-LD (default: true). */
  jsonLd?: boolean;
}

export function Definition({ items, heading, headingLevel = 2, jsonLd = true }: DefinitionProps) {
  const instanceId = useId();

  const jsonLdSerialized = useMemo(() => {
    if (!jsonLd) return null;
    return JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'DefinedTermSet',
      name: heading || 'Definitions',
      hasDefinedTerm: items.map((item) => ({
        '@type': 'DefinedTerm',
        name: item.term,
        description: item.definition,
      })),
    });
  }, [items, heading, jsonLd]);

  useEffect(() => {
    if (typeof document === 'undefined' || !jsonLdSerialized) return;
    const scriptId = `flowstack-def-jsonld-${instanceId.replace(/[^a-zA-Z0-9]/g, '')}`;
    let script = document.head.querySelector<HTMLScriptElement>(`script#${scriptId}`);
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      script.setAttribute('data-flowstack-seo', '1');
      document.head.appendChild(script);
    }
    script.text = jsonLdSerialized;
    return () => { script?.remove(); };
  }, [instanceId, jsonLdSerialized]);

  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const headingId = heading ? `def-heading-${instanceId.replace(/[^a-zA-Z0-9]/g, '')}` : undefined;

  return (
    <section aria-labelledby={headingId}>
      {heading && (
        <Heading id={headingId} className="text-2xl font-semibold mb-6">
          {heading}
        </Heading>
      )}
      <dl>
        {items.map((item, i) => (
          <div key={i} className="mb-4">
            <dt className="font-semibold">{item.term}</dt>
            <dd className="mt-1 leading-relaxed">{item.definition}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
