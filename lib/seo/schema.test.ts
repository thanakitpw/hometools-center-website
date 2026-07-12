import { describe, it, expect } from 'vitest';
import { organizationSchema, websiteSchema, localBusinessSchema, breadcrumbSchema, itemListSchema, productSchema, articleSchema, ORG_ID, profileUrls } from './schema';
import { siteConfig } from '@/lib/site-config';
import type { Product, Post } from '@/lib/queries/types';

describe('organizationSchema', () => {
  it('is an Organization with stable @id, name, url, absolute logo', () => {
    const o = organizationSchema();
    expect(o['@type']).toBe('Organization');
    expect(o['@id']).toBe(`${siteConfig.url}/#organization`);
    expect(o.name).toBe(siteConfig.name);
    expect(o.url).toBe(siteConfig.url);
    expect(o.logo).toBe(`${siteConfig.url}/logo-htc.png`);
    expect(o.contactPoint.telephone).toBe(siteConfig.contact.phone);
  });
});

describe('profileUrls', () => {
  it('drops bare-origin URLs and keeps real profile URLs', () => {
    expect(profileUrls(['https://www.facebook.com/', 'https://line.me/'])).toEqual([]);
    expect(profileUrls(['https://www.facebook.com/hometools', 'https://line.me/@htc']))
      .toEqual(['https://www.facebook.com/hometools', 'https://line.me/@htc']);
  });
  it('makes organizationSchema omit sameAs when only bare origins are configured', () => {
    expect(organizationSchema()).not.toHaveProperty('sameAs');
  });
});

describe('websiteSchema', () => {
  it('is a WebSite with a SearchAction pointing at /shop?q=', () => {
    const w = websiteSchema();
    expect(w['@type']).toBe('WebSite');
    expect(w.potentialAction['@type']).toBe('SearchAction');
    expect(w.potentialAction.target.urlTemplate).toBe(
      `${siteConfig.url}/shop?q={search_term_string}`,
    );
    expect(w.publisher['@id']).toBe(`${siteConfig.url}/#organization`);
  });
});

describe('localBusinessSchema', () => {
  it('is a HardwareStore with NAP, address parts, and Mon-Sat hours', () => {
    const b = localBusinessSchema();
    expect(b['@type']).toBe('HardwareStore');
    expect(b.telephone).toBe(siteConfig.contact.phone);
    expect(b.address['@type']).toBe('PostalAddress');
    expect(b.address.postalCode).toBe('10150');
    expect(b.address.addressCountry).toBe('TH');
    const hours = b.openingHoursSpecification[0];
    expect(hours.opens).toBe('08:00');
    expect(hours.closes).toBe('17:00');
    expect(hours.dayOfWeek).toContain('Saturday');
    expect(hours.dayOfWeek).not.toContain('Sunday');
    expect(b.parentOrganization['@id']).toBe(`${siteConfig.url}/#organization`);
  });
});

describe('breadcrumbSchema', () => {
  it('numbers positions from 1 and makes paths absolute; last item has no url', () => {
    const b = breadcrumbSchema([
      { name: 'หน้าแรก', path: '/' },
      { name: 'สินค้าทั้งหมด', path: '/shop' },
      { name: 'ท่อ PVC' },
    ]);
    expect(b['@type']).toBe('BreadcrumbList');
    expect(b.itemListElement).toHaveLength(3);
    expect(b.itemListElement[0].position).toBe(1);
    expect(b.itemListElement[0].item).toBe(`${siteConfig.url}/`);
    expect(b.itemListElement[2].position).toBe(3);
    expect(b.itemListElement[2].item).toBeUndefined();
  });
});

describe('itemListSchema', () => {
  it('lists items with absolute urls and numberOfItems', () => {
    const l = itemListSchema([
      { name: 'A', path: '/product/a' },
      { name: 'B', path: '/product/b' },
    ]);
    expect(l['@type']).toBe('ItemList');
    expect(l.numberOfItems).toBe(2);
    expect(l.itemListElement[1].url).toBe(`${siteConfig.url}/product/b`);
  });
});

const fakeProduct = {
  slug: 'pvc-pipe-1', sku: 'SKU1', name_th: 'ท่อ PVC',
  short_description: '<p>ท่อพีวีซีคุณภาพ</p>', seo_description: null,
  images: [{ src: 'https://cdn/x.jpg' }], brand_id: null,
} as unknown as Product;

const fakePost = {
  slug: 'water-system', title: 'ระบบน้ำ', published_at: '2025-01-02T00:00:00Z',
  cover_image_url: 'https://cdn/c.jpg', og_image_url: null,
} as unknown as Post;

describe('productSchema', () => {
  it('is a Product with NO price/priceCurrency and InStock offer', () => {
    const s = productSchema(fakeProduct);
    expect(s['@type']).toBe('Product');
    expect(s.name).toBe('ท่อ PVC');
    expect(s.description).toBe('ท่อพีวีซีคุณภาพ'); // HTML ถูกถอด
    expect(s.offers.availability).toBe('https://schema.org/InStock');
    expect(s.offers).not.toHaveProperty('price');
    expect(s.offers).not.toHaveProperty('priceCurrency');
    expect(s).not.toHaveProperty('brand');
  });
  it('adds brand only when brandName is given', () => {
    const s = productSchema(fakeProduct, { brandName: 'SCG' });
    expect(s.brand).toEqual({ '@type': 'Brand', name: 'SCG' });
  });
});

describe('articleSchema', () => {
  it('references Organization @id for author and publisher', () => {
    const s = articleSchema(fakePost);
    expect(s['@type']).toBe('Article');
    expect(s.headline).toBe('ระบบน้ำ');
    expect(s.author['@id']).toBe(`${siteConfig.url}/#organization`);
    expect(s.publisher['@id']).toBe(`${siteConfig.url}/#organization`);
    expect(s.mainEntityOfPage['@id']).toBe(`${siteConfig.url}/blog/water-system`);
  });
});
