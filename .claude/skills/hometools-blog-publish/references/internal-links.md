# Internal link targets

Every internal link in an article is resolved against the database by
`scripts/seo/publish-post.js`, so a guessed slug fails the publish rather than
shipping as a dead link. Use the ones below, or query for more.

## The category-URL trap

`categories.slug` stores only the **leaf** segment (`decorative-coatings`), but the
public URL is the **full ancestor chain**, matching what WordPress had indexed:

```
/product-category/construction-materials-and-equipment/toa-color/decorative-coatings
```

Linking to the bare leaf still resolves — it 308s to the canonical path — but that
wastes a redirect hop on an internal link. Write the full path.

## Paint (TOA) — the branch most articles need

| Page | Path |
|---|---|
| สี TOA (parent) | `/product-category/construction-materials-and-equipment/toa-color` |
| สีทาบ้าน | `…/toa-color/decorative-coatings` |
| สีทาเหล็ก | `…/toa-color/metal-coatings` |
| สีงานไม้ | `…/toa-color/wood-coatings` |
| สีตกแต่งพิเศษ | `…/toa-color/special-paint` |
| สีทนทานสูง | `…/toa-color/heavy-duty-coatings` |
| เคมีภัณฑ์ | `…/toa-color/construction-chemicals` |
| ยิปซัม | `…/toa-color/gypsum` |

Useful product slugs: `supershield-alkali-resisting-primer` (รองพื้นปูนใหม่กันด่าง),
`toa-contact-primer` (รองพื้นปูนทับสีเก่า), `supershield-duraclean-a-matt`,
`toa-roof-paint`, `toa-pu-waterproof`.

## Pipes and plumbing — the other main branch

| Page | Path |
|---|---|
| งานระบบ | `/product-category/system-work` |
| ท่อ PVC (SCG) | `/product-category/system-work/pvc-pipes-and-fittings-scg` |
| ท่อ PVC (ท่อน้ำไทย) | `/product-category/pvc-pipes-and-fittings-thaipipe` ← a ROOT category, not under system-work |
| ท่อ PPR | `/product-category/system-work/ppr-pipes-and-fittings` |
| ท่อ PE | `/product-category/system-work/pe-pipes-and-fittings` |
| มิเตอร์/ก็อก/วาล์ว/ปั๊ม | `/product-category/system-work/meters-taps-sluices-water-pumps-and-valves` |
| แท๊งค์น้ำ | `/product-category/system-work/water-tank` |

## Static pages

`/`, `/shop`, `/blog`, `/promotion`, `/how-to-place-an-order`, `/about-us`,
`/contact-us`, `/privacy-policy`, `/cookie-policy`

`/contact-us` is the right CTA target for "ขอใบเสนอราคา" — the site is quote-based,
there is no checkout.

## Linking to other articles

Only **published** posts resolve; a link to a draft fails the validator. That is
usually correct — pointing readers at a 404 helps nobody — but it means a planned
cross-link has to wait until the other article is live.

## Finding more

```bash
node -e "
require('dotenv').config({path:'.env.local',quiet:true});
const {createClient}=require('@supabase/supabase-js');
const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async()=>{
  const {data:c}=await sb.from('categories').select('id,slug,name_th,parent_id').order('sort_order');
  const by=Object.fromEntries(c.map(x=>[x.id,x]));
  const path=x=>{const s=[];for(let k=x;k;k=k.parent_id?by[k.parent_id]:null)s.unshift(k.slug);return s.join('/')};
  c.forEach(x=>console.log(x.name_th,'|','/product-category/'+path(x)));
})();"
```

Swap `categories` for `products` (`select('slug,name_th')`) to search product slugs;
filter with `.ilike('name_th','%สี%')` to narrow by Thai name.
