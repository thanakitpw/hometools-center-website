/**
 * dataLayer events. These are the site's conversion signals — the quote request is the
 * business outcome, so `generate_lead` is what Google Ads should be told to optimise for.
 *
 * Everything pushes to `window.dataLayer` rather than calling gtag directly, so the same
 * calls work whether a GTM container or bare gtag.js is loaded, and the names match GA4's
 * recommended-event vocabulary so the standard reports light up without custom definitions.
 */

type DataLayerEvent = Record<string, unknown> & { event: string };

function push(payload: DataLayerEvent) {
  if (typeof window === 'undefined') return;
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push(payload);
}

export type TrackedItem = {
  slug: string;
  name: string;
  category?: string | null;
  brand?: string | null;
  quantity?: number;
};

const toGa4Item = (i: TrackedItem) => ({
  item_id: i.slug,
  item_name: i.name,
  ...(i.category ? { item_category: i.category } : {}),
  ...(i.brand ? { item_brand: i.brand } : {}),
  quantity: i.quantity ?? 1,
});

/** A product detail page was viewed. */
export function trackViewItem(item: TrackedItem) {
  push({ event: 'view_item', items: [toGa4Item(item)] });
}

/** A product listing (category or shop) was rendered. */
export function trackViewItemList(listName: string, items: TrackedItem[]) {
  push({
    event: 'view_item_list',
    item_list_name: listName,
    items: items.slice(0, 20).map(toGa4Item),
  });
}

/** Someone searched the catalogue. */
export function trackSearch(term: string, resultCount?: number) {
  if (!term.trim()) return;
  push({ event: 'search', search_term: term, ...(resultCount == null ? {} : { result_count: resultCount }) });
}

/** The quote dialog was opened — intent, not yet a lead. */
export function trackQuoteStart(item?: TrackedItem) {
  push({ event: 'begin_quote', ...(item ? { items: [toGa4Item(item)] } : {}) });
}

/**
 * A quote request or contact message was submitted successfully. This is the conversion:
 * point the Google Ads conversion action at `generate_lead`.
 */
export function trackGenerateLead(source: 'quote' | 'contact', items?: TrackedItem[]) {
  push({
    event: 'generate_lead',
    lead_source: source,
    ...(items?.length ? { items: items.map(toGa4Item) } : {}),
  });
}

/** A form failed validation or the API rejected it — useful for spotting broken funnels. */
export function trackFormError(source: 'quote' | 'contact', reason: string) {
  push({ event: 'form_error', lead_source: source, error_reason: reason });
}

/** A catalogue PDF was opened. */
export function trackCatalogDownload(slug: string, name: string) {
  push({ event: 'file_download', file_name: name, item_id: slug, file_extension: 'pdf' });
}
