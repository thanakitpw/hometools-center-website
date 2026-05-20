export type ProductImage = { src: string; alt?: string };
export type ProductSpec = { key: string; value: string };

export type Product = {
  id: string;
  slug: string;
  sku: string | null;
  name_th: string;
  name_en: string | null;
  short_description: string | null;
  description_md: string | null;
  brand_id: string | null;
  primary_category_id: string | null;
  images: ProductImage[];
  package_size: string | null;
  specs: ProductSpec[];
  catalog_pdf_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  status: 'draft' | 'published' | 'archived';
  sort_order: number;
  published_at: string | null;
};

export type Category = {
  id: string;
  slug: string;
  name_th: string;
  name_en: string | null;
  parent_id: string | null;
  description: string | null;
  banner_image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  sort_order: number;
  is_published: boolean;
};

export type Brand = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
};

export type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content_md: string | null;
  cover_image_url: string | null;
  author: string | null;
  tags: string[];
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  status: 'draft' | 'published' | 'archived';
  published_at: string | null;
};
