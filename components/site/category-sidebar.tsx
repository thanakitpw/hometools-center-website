import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { listAllCategories, buildTree, type CategoryNode } from '@/lib/queries/categories';

function Tree({ nodes, activePath, depth = 0 }: { nodes: CategoryNode[]; activePath?: string; depth?: number }) {
  return (
    <ul className={depth === 0 ? 'space-y-3' : 'mt-3 space-y-3 pl-4'}>
      {nodes.map(n => (
        <li key={n.id}>
          {n.children.length > 0 ? (
            <details className="group/sidebar [&_summary::-webkit-details-marker]:hidden" open={depth === 0}>
              <summary
                className={
                  'flex cursor-pointer list-none items-center justify-between gap-2 py-1 text-[16px] leading-snug outline-none transition-colors hover:text-[var(--color-brand-500)] ' +
                  (depth === 0 ? 'font-medium text-[var(--color-brand-500)]' : 'font-medium text-[#111111]') +
                  (activePath === n.path ? ' !font-semibold !text-[var(--color-brand-500)]' : '')
                }
              >
                <span>{n.name_th}</span>
                <ChevronDown className="h-4 w-4 shrink-0 stroke-[3] transition-transform group-open/sidebar:rotate-180" />
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

export async function CategorySidebar({ activePath }: { activePath?: string }) {
  const all = await listAllCategories();
  const tree = buildTree(all);
  return (
    <aside className="hidden md:block">
      <h2 className="!mb-8 !text-[28px] !font-bold !leading-tight !text-[#003f73]">หมวดหมู่สินค้า</h2>
      <Tree nodes={tree} activePath={activePath} />
    </aside>
  );
}
