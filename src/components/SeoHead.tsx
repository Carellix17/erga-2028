import { Helmet } from "react-helmet-async";

const BASE_URL = "https://erga-learning.app";

interface SeoHeadProps {
  title: string;
  description: string;
  /** Route path, e.g. "/login". Used for the self-referencing canonical and og:url. */
  path: string;
  /** Set true for private/utility routes that should not be indexed. */
  noindex?: boolean;
  /** Optional JSON-LD structured data object(s) to inject into <head>. */
  jsonLd?: object | object[];
}

/**
 * Per-route head metadata: unique title/description and a canonical link that
 * self-references the route instead of pointing everything at the root.
 */
export function SeoHead({ title, description, path, noindex, jsonLd }: SeoHeadProps) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={path} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={`${BASE_URL}${path}`} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {noindex && <meta name="robots" content="noindex" />}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
