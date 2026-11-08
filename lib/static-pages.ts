// import ตรงแทนการอ่านไฟล์ด้วย fs ตอนรัน เพราะ Cloudflare Workers ไม่มีไฟล์ระบบให้อ่าน
// (ไฟล์ ~60KB ถูกรวมเข้า bundle ตอน build)
import staticPages from '@/research/data/static-pages.json';

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

function load() {
  return staticPages as unknown as Record<string, StaticPage>;
}

// Garbage from Complianz cookie banner widget
const NOISE = /^(Manage options|Manage services|Manage \{vendor_count\}|Manage vendors|Functional|Preferences|Statistics|Marketing|View preferences|Save preferences|Accept|Deny|\{title\}|Cookie Policy|Privacy Policy)$/i;

export function getStaticPage(slug: string): StaticPage | null {
  const all = load();
  const p = all[slug];
  if (!p) return null;
  return { ...p, blocks: p.blocks.filter(b => !('text' in b) || !NOISE.test(b.text.trim())) };
}
