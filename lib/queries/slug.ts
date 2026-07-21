/**
 * Slugs migrated from WordPress can be Thai ('ท่อ-pb'), which travels the wire
 * percent-encoded. Next.js 16 is not consistent about decoding it back: for the same
 * request, `generateMetadata` receives the decoded param while the page component
 * receives the raw '%E0%B8%97%E0%B9%88%E0%B8%AD-pb'. Looking up only the value handed
 * to us therefore 404s the page while its <title> resolves fine.
 *
 * So every slug lookup matches on both forms. The DB stores the decoded form (see
 * `scripts/db/extract.js`); the encoded candidate exists purely to absorb whichever
 * form the framework hands over.
 */
export function slugCandidates(slug: string): string[] {
  const forms = [slug];
  try {
    const decoded = decodeURIComponent(slug);
    if (decoded !== slug) forms.push(decoded);
  } catch {
    // Malformed escape (e.g. a literal '%' in the slug) — match the raw value only.
  }
  return forms;
}
