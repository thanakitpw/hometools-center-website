import fs from 'node:fs';
import path from 'node:path';

type Block =
  | { type: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'li'; text: string }
  | { type: 'img'; src: string; alt?: string }
  | { type: 'iframe'; src: string };

export type StaticPage = {
  slug: string;
  title: string;
  h1: string | null;
  seo_description: string;
  blocks: Block[];
};

let cache: Record<string, StaticPage> | null = null;

function load() {
  if (cache) return cache;
  const file = path.join(process.cwd(), 'research', 'data', 'static-pages.json');
  cache = JSON.parse(fs.readFileSync(file, 'utf8'));
  return cache!;
}

// Garbage from Complianz cookie banner widget
const NOISE = /^(Manage options|Manage services|Manage \{vendor_count\}|Manage vendors|Functional|Preferences|Statistics|Marketing|View preferences|Save preferences|Accept|Deny|\{title\}|Cookie Policy|Privacy Policy)$/i;

export function getStaticPage(slug: string): StaticPage | null {
  const all = load();
  const p = all[slug];
  if (!p) return null;
  return { ...p, blocks: p.blocks.filter(b => !('text' in b) || !NOISE.test(b.text.trim())) };
}
