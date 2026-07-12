import { siteConfig } from '@/lib/site-config';
import type { Product, Post } from '@/lib/queries/types';

export const ORG_ID = `${siteConfig.url}/#organization`;
export const WEBSITE_ID = `${siteConfig.url}/#website`;

/** คืน absolute URL จาก path ภายใน (ถ้าเป็น http(s) อยู่แล้วคืนเดิม) */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return `${siteConfig.url}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: siteConfig.name,
    url: siteConfig.url,
    logo: absoluteUrl(siteConfig.logoUrl),
    image: absoluteUrl(siteConfig.logoUrl),
    telephone: siteConfig.contact.phone,
    email: siteConfig.contact.email,
    sameAs: [siteConfig.social.facebook, siteConfig.social.line],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: siteConfig.contact.phone,
      contactType: 'sales',
      areaServed: 'TH',
      availableLanguage: ['th'],
    },
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: siteConfig.url,
    name: siteConfig.name,
    inLanguage: 'th',
    publisher: { '@id': ORG_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteConfig.url}/shop?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function localBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'HardwareStore',
    '@id': `${siteConfig.url}/#localbusiness`,
    name: siteConfig.name,
    url: siteConfig.url,
    image: absoluteUrl(siteConfig.logoUrl),
    logo: absoluteUrl(siteConfig.logoUrl),
    telephone: siteConfig.contact.phone,
    email: siteConfig.contact.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'เลขที่ 642 ถนนพระราม 2 แขวงบางมด',
      addressLocality: 'เขตจอมทอง',
      addressRegion: 'กรุงเทพมหานคร',
      postalCode: '10150',
      addressCountry: 'TH',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '08:00',
        closes: '17:00',
      },
    ],
    sameAs: [siteConfig.social.facebook, siteConfig.social.line],
    parentOrganization: { '@id': ORG_ID },
  };
}

export function breadcrumbSchema(items: { name: string; path?: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      ...(it.path ? { item: absoluteUrl(it.path) } : {}),
    })),
  };
}

export function itemListSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: absoluteUrl(it.path),
      name: it.name,
    })),
  };
}

export function productSchema(p: Product, opts: { brandName?: string } = {}) {
  const description = (p.short_description || p.seo_description || '')
    .replace(/<[^>]+>/g, '')
    .trim();
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name_th,
    ...(p.sku ? { sku: p.sku } : {}),
    ...(description ? { description } : {}),
    image: p.images.map((i) => i.src),
    ...(opts.brandName ? { brand: { '@type': 'Brand', name: opts.brandName } } : {}),
    offers: {
      '@type': 'Offer',
      url: `${siteConfig.url}/product/${p.slug}`,
      availability: 'https://schema.org/InStock',
      seller: { '@id': ORG_ID },
    },
  };
}

export function articleSchema(p: Post) {
  const image = p.cover_image_url || p.og_image_url || undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: p.title,
    ...(image ? { image } : {}),
    ...(p.published_at ? { datePublished: p.published_at, dateModified: p.published_at } : {}),
    author: { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
    inLanguage: 'th',
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${siteConfig.url}/blog/${p.slug}` },
  };
}
