/**
 * `products.description_md` is a misnomer: it holds the raw WordPress `post_content`
 * (HTML), carried over verbatim by the 2026-07 migration. It is the main body of every
 * product page on the old site — headings, spec bullets, price-table images.
 *
 * The one thing that does not survive the move is dFlip's `[dflip id="123"]` shortcode
 * (41 products). WordPress expanded it into a flipbook widget; here it would render as
 * literal text mid-page. The catalog it points at is served separately by
 * `products.catalog_pdf_url` + <PdfFlipbook>, so the shortcode is stripped rather than
 * shown — see scripts/db/fix-product-catalog-pdfs.js, which backfills catalog_pdf_url
 * from the same dFlip records so nothing is lost by dropping it.
 */
const DFLIP_SHORTCODE = /\[dflip\b[^\]]*\][\s\S]*?\[\/dflip\]|\[dflip\b[^\]]*\]|\[\/dflip\]/gi;

export type ProductDescription = {
  /** HTML to render, shortcodes removed. Empty string when nothing meaningful is left. */
  html: string;
  /** True when there is real prose to show — use this to gate the whole section. */
  hasContent: boolean;
};

export function buildProductDescription(
  descriptionHtml: string | null | undefined,
  shortDescriptionHtml?: string | null
): ProductDescription {
  // Prefer the full body; fall back to the excerpt for the products that only have one.
  const source = pickSource(descriptionHtml, shortDescriptionHtml);
  const html = source.replace(DFLIP_SHORTCODE, '').trim();

  // A description that was *only* a flipbook shortcode leaves behind empty markup
  // (`<p></p>`, stray `&nbsp;`). Rendering that produces a heading above blank space,
  // so measure the visible text rather than the markup length.
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Text alone is not the test: several products describe themselves entirely with a
  // linked catalog banner or spec diagram and carry no prose at all. Gating on text
  // would silently drop those images off the page.
  const hasMedia = /<(img|iframe|video|embed)\b/i.test(html);

  return { html, hasContent: text.length > 20 || hasMedia };
}

function pickSource(full?: string | null, short?: string | null): string {
  return hasSubstance(full) ? full! : short || '';
}

/** Anything left once the shortcode goes — prose or embedded media — counts. */
function hasSubstance(html?: string | null): boolean {
  if (!html) return false;
  const stripped = html.replace(DFLIP_SHORTCODE, '');
  return (
    stripped.replace(/<[^>]+>|&nbsp;|\s/gi, '').length > 0 ||
    /<(img|iframe|video|embed)\b/i.test(stripped)
  );
}
