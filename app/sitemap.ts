import type { MetadataRoute } from 'next';
import { createClient as createSupabase } from '@supabase/supabase-js';
import { siteConfig } from '@/lib/site-config';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Use anon client (sitemap runs in build/edge — no cookies)
  const sb = createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const base = siteConfig.url;

  const [products, categories, posts] = await Promise.all([
    sb.from('products').select('slug, updated_at').eq('status', 'published'),
    sb.from('categories').select('slug, updated_at').eq('is_published', true),
    sb.from('posts').select('slug, updated_at, published_at').eq('status', 'published'),
  ]);

  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/shop`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/blog`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/about-us`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/contact-us`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/how-to-place-an-order`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/promotion`, changeFrequency: 'weekly', priority: 0.6 },
  ];

  const productUrls: MetadataRoute.Sitemap = (products.data || []).map(p => ({
    url: `${base}/product/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const categoryUrls: MetadataRoute.Sitemap = (categories.data || []).map(c => ({
    url: `${base}/product-category/${c.slug}`,
    lastModified: c.updated_at ? new Date(c.updated_at) : undefined,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const postUrls: MetadataRoute.Sitemap = (posts.data || []).map(p => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : p.published_at ? new Date(p.published_at) : undefined,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...staticUrls, ...categoryUrls, ...productUrls, ...postUrls];
}
