import { siteConfig } from '@/lib/site-config';

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
