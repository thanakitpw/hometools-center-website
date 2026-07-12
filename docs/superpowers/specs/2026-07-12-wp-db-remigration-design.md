# Design: Full re-migration from WooCommerce DB → Supabase

**Date:** 2026-07-12
**Status:** Approved (design) — pending spec review
**Author:** Claude Code session

---

## 1. Problem & goal

The current Supabase data was built from an HTML **crawl** (Phase 0), which is
lossy and incomplete:

| Data | Live DB (truth) | Migrated (crawl) | Gap |
|---|---|---|---|
| Products (`product`) | **347** | 200 | **147 missing** |
| Product categories | 42 | 42 | ok |
| Blog posts (`post`) | 31 | 30 | 1 |
| Pages (`page`) | 13 | 8 | 5 |
| Media attachments | 746 + 84 PDF | 256 | large gap |
| Redirects | 72 (RankMath) + 6 (Redirection) | 32 | ~46 |

The client provided the authoritative WooCommerce database and uploads:

- `backup-oldwebsite/adminhometools_wp_orpro.sql` — 25 MB, phpMyAdmin-format
  dump, table prefix `jQH0o_`, one row-tuple per line.
- `backup-oldwebsite/wpuploads.zip` — 510 MB, the full `wp-content/uploads` tree.

**Goal:** Re-migrate **products, categories, posts, referenced media, SEO meta,
and redirects** from the DB dump (the source of truth), fully replacing the
crawl-derived rows. Achieve field-level parity with the old site.

**Business model note (confirmed by the data):** products have no `_sku` and only
~55 have a `_price` → this is a quote-based B2B catalogue, matching the locked
project decision (request-a-quote, not checkout). Prices and SKUs are therefore
intentionally not migrated as commerce fields.

---

## 2. Scope

### In scope — tables re-migrated (truncate + insert)
- `products`
- `product_categories` (m2m)
- `categories`
- `posts`
- `redirects`

### Preserved — never touched by the importer
- `quote_requests`, `contact_messages` (real user submissions)
- `admin_users`, `site_settings`, `menus`
- All hand-built React pages (`about-us`, `contact-us`, `promotion`, home, …).
  The old pages are Elementor-built; their `post_content` is Elementor JSON, not
  clean HTML. Re-deriving them is high-effort / low-value and out of scope.
- Existing Supabase Storage files (reused when content hash matches).

### Explicitly out of scope
- **Brand mapping.** The DB has **no** brand taxonomy (`woocommerce_attribute_taxonomies`
  = 0, no `product_brand`). `brand_id` stays `null`; brand assignment remains a
  separate manual task per `TASKS.md`.
- Pages / home layout parity (separate design/polish track already in progress).
- Product variations — all 348 products are `simple` (0 `product_variation`
  rows), so `variants` stays `[]`.

---

## 3. Architecture — three independent stages

```
STAGE 1: EXTRACT            STAGE 2: MEDIA              STAGE 3: IMPORT
temp MySQL server      →     resolve referenced    →    truncate + insert
import dump                  attachments → zip          (FK-safe order)
SQL queries → JSON           → Storage → url-map        JSON → Supabase
(then drop server)           (skip if hash exists)      (rewrite media URLs)
```

Each stage is a standalone script with a well-defined artifact boundary, so it
can be run and verified independently and re-run idempotently.

New scripts live under `scripts/db/`:

| Unit | File | Input | Output |
|---|---|---|---|
| Extract | `scripts/db/extract.js` (+ `extract.sql`) | dump.sql | `research/db-2026-07/*.json` |
| Media | `scripts/db/media.js` | attachments.json + zip | Storage uploads + `db-2026-07/url-map.json` |
| Import | `scripts/db/import.js` | `db-2026-07/*.json` + url-map | Supabase rows |
| Verify | `scripts/db/verify.js` | Supabase + JSON | parity report |

### Stage 1 — Extract (temp MySQL)

1. Create a throwaway datadir under the scratchpad, init a MySQL instance
   (`mysqld --initialize-insecure`), start it on a **non-default socket/port** so
   it never collides with anything the user runs.
2. `CREATE DATABASE htc_wp; mysql htc_wp < dump.sql`.
3. Run `extract.sql` queries, writing clean JSON to `research/db-2026-07/`:
   - `products.json` — posts joined with a pivot of relevant postmeta keys,
     category relationships, and the primary-category meta.
   - `categories.json` — terms + term_taxonomy + termmeta (image, order, seo).
   - `posts.json` — blog posts with tags + rank_math meta.
   - `redirects.json` — `rank_math_redirections` + `redirection_items`.
   - `attachments.json` — attachment `ID → _wp_attached_file` (+ alt text) map,
     used by Stage 2 to resolve media.
4. Shut the server down and delete the temp datadir.

Using a real MySQL engine (not a hand-rolled parser) guarantees correct handling
of Thai text, embedded Elementor JSON, and SQL escaping.

### Stage 2 — Media (referenced-only)

1. Unzip `wpuploads.zip` to a temp dir.
2. Collect the **referenced** attachment set: every product featured image
   (`_thumbnail_id`) + gallery (`_product_image_gallery`), every post cover +
   images embedded in post/product content, every OG image, and every catalog
   PDF referenced by a product.
3. For each referenced attachment, resolve its file via
   `attachments.json` (`_wp_attached_file`), read the **full-size** original
   from the unzipped tree, upload to Supabase Storage bucket `media`.
   - Naming: ASCII files keep their path; non-ASCII (Thai) filenames use
     `u-<md5-12>.<ext>` — the existing convention (Storage rejects non-ASCII keys).
   - Skip upload if an object with the same key already exists (hash-stable).
4. Emit `url-map.json`: `old WP URL → Supabase Storage public URL`.

WordPress-generated thumbnail sizes are **not** uploaded; the site renders from
full-size originals (fewer files, faster, full parity for what's actually shown).

### Stage 3 — Import (FK-safe truncate + insert)

Order matters because of foreign keys:

1. `categories` — insert parents before children (topological by `parent`), keep
   a `wp_term_id → uuid` map.
2. `products` — insert, resolving `primary_category_id` via the category map and
   rewriting every media URL through `url-map.json`.
3. `product_categories` — insert all product↔category edges.
4. `posts` — insert, preserving existing English blog slugs (see §5.1).
5. `redirects` — insert merged/deduped set (see §5.4).

Truncate is scoped to exactly these five tables (in reverse FK order), so all
preserved tables are untouched. The whole run is idempotent: re-running produces
the same result.

---

## 4. Field mapping

### products (`post_type = 'product'`)

| Supabase column | WP source | Notes |
|---|---|---|
| `slug` | `post_name` | |
| `name_th` | `post_title` | |
| `name_en` | — | null |
| `short_description` | `post_excerpt` | WooCommerce short description |
| `description_md` | `post_content` (image URLs rewritten) | fallback to recrawl `description_html` if empty |
| `images` (jsonb) | `_thumbnail_id` + `_product_image_gallery` → Storage URLs | featured first |
| `primary_category_id` | `rank_math_primary_product_cat` (347 present) | else first category |
| `specs` (jsonb) | recrawl `specs` (matched by slug) | DB raw has no clean spec table |
| `catalog_pdf_url` | recrawl `catalog_pdf_url` / dFlip meta → Storage | |
| `seo_title` | `rank_math_title` (template resolved) | else null → app default |
| `seo_description` | `rank_math_description` | else null → app default |
| `og_image_url` | `rank_math_facebook_image` → featured fallback | |
| `status` | `post_status` | publish→published, draft→draft, private/pending→draft |
| `published_at` | `post_date` | |
| `sort_order` | `menu_order` | |
| `sku`, `brand_id`, `variants`, `package_size` | — | null / `[]` (see §2 out-of-scope) |

### categories (`product_cat` terms)

| Supabase | WP source |
|---|---|
| `slug` | `terms.slug` |
| `name_th` | `terms.name` |
| `parent_id` | `term_taxonomy.parent` → resolved uuid |
| `description` | `term_taxonomy.description` |
| `banner_image_url` | termmeta `thumbnail_id` → Storage URL |
| `seo_title` / `seo_description` | termmeta `rank_math_title` / `rank_math_description` |
| `sort_order` | termmeta `order` |
| `is_published` | true (all live categories) |

### posts (`post_type = 'post'`)

| Supabase | WP source |
|---|---|
| `slug` | **existing English slug** (see §5.1) — NOT `post_name` |
| `title` | `post_title` |
| `excerpt` | `post_excerpt` |
| `content_md` | `post_content` (image URLs rewritten) |
| `cover_image_url` | `_thumbnail_id` → Storage URL |
| `tags` (text[]) | `post_tag` relationships |
| `category_id` | `category` relationship → resolved uuid |
| `seo_title` / `seo_description` / `og_image_url` | rank_math meta |
| `status` | `post_status` |
| `published_at` | `post_date` |

### redirects

Union of three sources, deduped by `from_path` (first-wins priority: migration
map → RankMath → Redirection):
- `jQH0o_rank_math_redirections` — `sources` JSON (`pattern`) → `url_to` (72)
- `jQH0o_redirection_items` — `url` → `action_data` (6)
- existing `research/redirect-map.json` — blog Thai→English 301s (32)

---

## 5. Edge cases & reconciliation

### 5.1 Blog slug preservation (SEO-critical)
The locked decision moved blog posts from Thai top-level slugs to
`/blog/<english>` with a 301. The DB `post_name` is the **Thai** slug. The
importer must **not** overwrite the assigned English slug. Reconciliation:
match each DB post to its English slug via `research/redirect-map.json`
(`from_path` = Thai slug, `reason` = Thai title, `to_path` = `/blog/<english>`),
matching on slug first, then normalized title. Any DB post with no existing
English slug (e.g. the +1 new post) gets a freshly transliterated English slug
plus a new 301 rule.

### 5.2 RankMath title templates
Many products/posts don't store a literal `rank_math_title`; they inherit a
template like `%title% %sep% %sitename%`. The importer resolves the common tokens
(`%title%`, `%sep%`, `%sitename%`, `%page%`). If a value can't be resolved
cleanly it is left `null` so the app's `generateMetadata` produces its default.

### 5.3 Empty product descriptions
Some WooCommerce products keep body copy only in the short description or in
Elementor. When `post_content` is empty, fall back to the recrawl
`description_html` (the rendered version customers actually saw), matched by slug.

### 5.4 Redirect dedup & loop safety
Merge the three redirect sources, drop exact `from_path` duplicates, and drop any
rule whose `from_path == to_path` or that would form a 1-hop loop with another
rule. Keep `status_code` from the source (default 301).

### 5.5 Idempotency
Full truncate+insert each run. Storage uploads skip when the target key already
exists, so media isn't re-uploaded. Extraction and import can each be re-run
independently from their JSON artifacts.

---

## 6. Verification (parity gate)

`scripts/db/verify.js` after import:
- **Counts:** products = 347, categories = 42, posts = 31, redirects ≥ 78.
- **Referential:** every `primary_category_id` resolves; no orphan
  `product_categories`; every `images[]` / `cover_image_url` / `og_image_url` is
  a reachable Storage URL (HTTP 200 spot-check on a sample).
- **Spot-check** 5 products across categories: name, category, image count, SEO
  fields match the old live page (or the recrawl JSON).
- **Build:** `npm run build` passes.
- **Manual:** load `/shop` and a product page in the running dev server and eyeball.

Report is written to `research/db-2026-07/verify-report.json` and summarized to
stdout. Migration is "done" only when counts match and the build passes.

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| Temp MySQL init fails on this Mac | Fallback: `mysql.server start` against a scratch datadir; last resort documented Node parse of specific tables |
| Dump charset/collation mismatch on MySQL 9.6 | Import into `utf8mb4`; verify a Thai product title round-trips before extracting |
| Thai filenames in zip mis-decoded | Resolve files by `_wp_attached_file` (DB value), not by listing the zip |
| Over-writing real user data | Truncate list is a hard-coded allow-list of 5 tables; preserved tables asserted before run |
| Slug collisions vs existing English blog slugs | Match-then-transliterate, assert slug uniqueness before insert |

---

## 8. Deliverables

- `scripts/db/extract.js`, `scripts/db/extract.sql`
- `scripts/db/media.js`
- `scripts/db/import.js`
- `scripts/db/verify.js`
- `research/db-2026-07/*.json` (extraction artifacts, committed)
- Updated `TASKS.md` / `CLAUDE.md` session log
