import { describe, it, expect } from 'vitest';
import { organizationSchema, websiteSchema, localBusinessSchema, breadcrumbSchema, itemListSchema } from './schema';
import { siteConfig } from '@/lib/site-config';

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
