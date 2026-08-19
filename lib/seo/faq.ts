/**
 * Pull question/answer pairs out of an article's stored HTML so the page can emit
 * FAQPage JSON-LD without a second copy of the text drifting out of sync.
 *
 * Articles mark their FAQ up as:
 *   <div class="faq-item"><h3>question</h3><p>answer</p>…</div>
 *
 * Deliberately regex-based, not cheerio: cheerio is a devDependency used by the
 * one-shot migration scripts, and this runs in the app's server bundle.
 */

export type FaqPair = { question: string; answer: string };

const FAQ_ITEM = /<div[^>]*class="[^"]*\bfaq-item\b[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
const HEADING = /<h[34][^>]*>([\s\S]*?)<\/h[34]>/i;

/** Strip tags, decode the handful of entities the articles actually use, collapse space. */
function toText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&lsquo;|&rsquo;/g, "'")
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractFaq(html: string | null | undefined): FaqPair[] {
  if (!html) return [];
  const pairs: FaqPair[] = [];
  for (const [, inner] of html.matchAll(FAQ_ITEM)) {
    const heading = inner.match(HEADING);
    if (!heading) continue;
    const question = toText(heading[1]);
    const answer = toText(inner.slice(heading.index! + heading[0].length));
    if (question && answer) pairs.push({ question, answer });
  }
  return pairs;
}
