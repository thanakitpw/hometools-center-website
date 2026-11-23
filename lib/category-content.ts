/**
 * Split categories.description into the parts the category page renders.
 *
 * The column holds either plain text (older rows, or whatever an editor types in /admin) or
 * HTML authored in seo/categories/<slug>.html. In the HTML form, everything before
 * `<!--more-->` is the short intro shown under the H1, and everything after it is the long
 * guide + FAQ shown below the product grid — keeping the products above the fold while still
 * giving the page indexable copy.
 */
export type CategoryContent = {
  introText: string | null;
  introHtml: string | null;
  bodyHtml: string | null;
};

const MORE = '<!--more-->';

export function splitCategoryContent(description: string | null | undefined): CategoryContent {
  const d = (description ?? '').trim();
  if (!d) return { introText: null, introHtml: null, bodyHtml: null };
  if (!/<[a-z][\s\S]*>/i.test(d)) return { introText: d, introHtml: null, bodyHtml: null };
  const at = d.indexOf(MORE);
  if (at === -1) return { introText: null, introHtml: d, bodyHtml: null };
  const intro = d.slice(0, at).trim();
  const body = d.slice(at + MORE.length).trim();
  return { introText: null, introHtml: intro || null, bodyHtml: body || null };
}
