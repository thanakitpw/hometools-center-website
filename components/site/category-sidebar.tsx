import Link from 'next/link';
import { listAllCategories, buildTree, type CategoryNode } from '@/lib/queries/categories';

function Tree({ nodes, activeSlug }: { nodes: CategoryNode[]; activeSlug?: string }) {
  return (
    <ul className="space-y-0.5 text-sm">
      {nodes.map(n => (
        <li key={n.id}>
          <Link
            href={`/product-category/${n.slug}` as any}
            className={
              'block rounded px-2 py-1.5 hover:bg-[var(--color-muted)] ' +
              (activeSlug === n.slug ? 'font-semibold text-[var(--color-brand-500)]' : '')
            }
          >
            {n.name_th}
          </Link>
          {n.children.length > 0 && (
            <div className="ml-3 border-l border-[var(--color-border)] pl-2">
              <Tree nodes={n.children} activeSlug={activeSlug} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export async function CategorySidebar({ activeSlug }: { activeSlug?: string }) {
  const all = await listAllCategories();
  const tree = buildTree(all);
  return (
    <aside className="hidden md:block">
      <h2 className="!mb-3 !text-base !text-[var(--color-fg)]">หมวดหมู่สินค้า</h2>
      <Tree nodes={tree} activeSlug={activeSlug} />
    </aside>
  );
}
