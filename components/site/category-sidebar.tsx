import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { listAllCategories, buildTree, type CategoryNode } from '@/lib/queries/categories';

function Tree({ nodes, activePath, depth = 0 }: { nodes: CategoryNode[]; activePath?: string; depth?: number }) {
  return (
    <ul className={depth === 0 ? 'space-y-3' : 'mt-3 space-y-3 pl-4'}>
      {nodes.map(n => (
        <li key={n.id}>
          {n.children.length > 0 ? (
            // Chevron points down when collapsed, up when expanded. The rotation is
            // scoped to this <details>' own direct summary (`&>summary>svg`) — the tree
            // nests <details> inside <details>, and the previous shared `group/sidebar`
            // name made every child chevron follow whichever ancestor was open rather
            // than its own state, so they all rendered pointing up.
            <details
              className="[&_summary::-webkit-details-marker]:hidden open:[&>summary>svg]:rotate-180"
              open={depth === 0}
            >
              <summary
                className={
                  'flex cursor-pointer list-none items-center justify-between gap-2 py-1 text-[16px] leading-snug outline-none transition-colors hover:text-[var(--color-brand-500)] ' +
                  (depth === 0 ? 'font-medium text-[var(--color-brand-500)]' : 'font-medium text-[#111111]') +
                  (activePath === n.path ? ' !font-semibold !text-[var(--color-brand-500)]' : '')
                }
              >
                <span>{n.name_th}</span>
                <ChevronDown className="h-4 w-4 shrink-0 stroke-[3] transition-transform duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)]" />
              </summary>
              <Tree nodes={n.children} activePath={activePath} depth={depth + 1} />
            </details>
          ) : (
            <Link
              href={`/product-category/${n.path}` as any}
              className={
                'block py-1 text-[15px] leading-snug transition-colors hover:text-[var(--color-brand-500)] ' +
                (depth === 0 ? 'font-medium text-[var(--color-brand-500)]' : 'text-[#111111]') +
                (activePath === n.path ? ' !font-semibold !text-[var(--color-brand-500)]' : '')
              }
            >
              {n.name_th}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * The old site's sidebar was a hand-curated Elementor menu, not a straight render of the
 * category tree, and it differs from the data in one way `parent_id` cannot express:
 * `pvc-pipes-and-fittings-thaipipe` is a ROOT category in WooCommerce, yet the menu
 * listed it *inside* the งานระบบ group (second, right after PVC SCG).
 *
 * So the regrouping below is presentation only — the category keeps its root-level URL
 * (/product-category/pvc-pipes-and-fittings-thaipipe), which is the one Google indexed.
 * Re-parenting it in the DB would have changed that URL and lost the ranking.
 *
 * Ordering itself is data: `scripts/db/set-category-order.js` seeded `sort_order` from
 * that same menu, and `listAllCategories()` sorts by it.
 */
const SECTION_SLUGS = ['system-work', 'construction-materials-and-equipment'];
const MERGE_INTO_SECTION: Record<string, string> = {
  'pvc-pipes-and-fittings-thaipipe': 'system-work',
};

export async function CategorySidebar({ activePath }: { activePath?: string }) {
  const all = await listAllCategories();
  const roots = buildTree(all);
  const bySlug = new Map(roots.map(r => [r.slug, r]));

  for (const [slug, sectionSlug] of Object.entries(MERGE_INTO_SECTION)) {
    const node = bySlug.get(slug);
    const section = bySlug.get(sectionSlug);
    if (!node || !section) continue;
    section.children = [...section.children, node].sort((a, b) => a.sort_order - b.sort_order);
  }

  // Anything not named as a section and not merged into one would otherwise vanish, so
  // fall back to appending it rather than silently dropping a category.
  const merged = new Set(Object.keys(MERGE_INTO_SECTION));
  const sections = [
    ...SECTION_SLUGS.map(s => bySlug.get(s)).filter((n): n is NonNullable<typeof n> => !!n),
    ...roots.filter(r => !SECTION_SLUGS.includes(r.slug) && !merged.has(r.slug)),
  ];

  return (
    // `category-tree` drives the submenu slide-down (see app/globals.css)
    <aside className="category-tree hidden md:block">
      <h2 className="!mb-8 !text-[28px] !font-bold !leading-tight !text-[#003f73]">หมวดหมู่สินค้า</h2>
      <Tree nodes={sections} activePath={activePath} />
    </aside>
  );
}
