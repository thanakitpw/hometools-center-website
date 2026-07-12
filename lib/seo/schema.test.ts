import { describe, it, expect } from 'vitest';
import { organizationSchema, websiteSchema } from './schema';
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
