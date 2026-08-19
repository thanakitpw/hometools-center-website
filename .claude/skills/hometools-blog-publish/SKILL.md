---
name: hometools-blog-publish
description: Publish a Thai SEO article draft to the Home Tool Center blog (hometools-center.com) — convert the draft to the site's article HTML, write its metadata, validate, and upsert it into Supabase. Use this whenever the user hands over a file from `seo/blogs/`, `seo/drafts/`, or any markdown/Google-Doc-style article and asks to put it on the site, "เอาบทความขึ้นเว็บ", "ลงบทความ", format an article for SEO, add meta/schema to a post, fix or restyle an existing blog post, set a post to draft or published, or swap in a cover image. Also use it when asked what image size the blog needs, or why an article looks unstyled after deploying.
---

# Publishing an SEO article to hometools-center.com

The blog is a Next.js 16 + Supabase site. Articles live in the `posts` table and
are authored in this repo as a pair of files under `seo/published/`, then pushed
to the database by a script. Nothing is typed into a CMS by hand.

Work through the phases below in order. Each one exists because skipping it has
produced a real defect on this site before.

## The one thing that surprises everyone

**`posts.content_md` stores raw HTML, not markdown.** The column name is a
leftover from the WordPress import, and `app/(site)/blog/[slug]/page.tsx` renders
it with `dangerouslySetInnerHTML`. Markdown pasted into that column renders as
literal `##` and `|` characters. Always convert the draft to HTML.

## Phase 1 — read the draft and the destination

Read the draft the user pointed at. Thai SEO drafts for this client usually open
with an HTML comment block holding the target slug, primary/secondary keywords,
title tag and meta description — that block is instructions for you, not body
copy, so keep it out of the published HTML.

Then look at `seo/published/paint-coverage-per-bucket.{html,json}`. That is the
reference implementation; matching its shape is faster and safer than inventing
a new one.

## Phase 2 — write the article HTML

Create `seo/published/<slug>.html` containing the **body only** — no `<html>`,
no `<head>`, and no `<h1>`.

The page template already renders `post.title` as the page's H1. An `<h1>` in the
body gives the page two H1s, which is why `publish-post.js` refuses to write one.

`app/globals.css` defines an `.article-body` block that styles this HTML. Use its
vocabulary rather than inline styles or Tailwind classes — the CSS is the design
system for article content, and classes outside it silently do nothing:

| Class | Use it for |
|---|---|
| `lead` | opening paragraph — put the direct answer here, in bold, for the featured snippet |
| `callout` + `callout-title` | the "short answer" summary box |
| `callout callout-warning` | the "people get this wrong" note |
| `toc` + `toc-title` | table of contents (`<ol>` of `#anchor` links) |
| `table-wrap` wrapping `<table>` | any table — gives it horizontal scroll on mobile |
| `table-compact` on `<table>` | only when every cell is a short value; keeps cells on one line |
| `formula` | a centred formula or rule of thumb |
| `example` | a worked example following a formula |
| `faq` > `faq-item` | the FAQ block (see Phase 3) |
| `cta` + `cta-title` + `cta-links` + `cta-btn` / `cta-btn-ghost` | the closing call to action |

Structure that works for this client's informational queries:

1. `<p class="lead">` — answer the title question in the first sentence, numbers in `<strong>`
2. `<div class="callout callout-answer">` — 3–4 bullet summary
3. `<nav class="toc">` — links to every `<h2 id="…">`
4. `<h2 id="…">` sections, each with a stable **English** id so anchors stay linkable
5. `<div class="cta">` — closing CTA with real internal links
6. `<h2 id="faq">` + the FAQ block

Two habits that matter here:

- **Every `<h2>` needs an `id`, and every TOC link needs a matching one.** The
  validator checks this because a broken anchor is invisible until a reader clicks it.
- **Internal links must point at pages that exist.** Product links are
  `/product/<slug>`; category links use the **full ancestor chain**
  (`/product-category/construction-materials-and-equipment/toa-color/decorative-coatings`),
  not the leaf slug. `references/internal-links.md` lists the ones worth reaching for
  and how to query the database for more. The validator resolves all of them against
  the DB, so a guessed slug fails loudly rather than shipping as a dead link.

Replace generic "visit our site" links from the draft with the specific category or
product page that answers the sentence. That is the whole point of publishing the
article on this domain.

## Phase 3 — the FAQ block

FAQ markup does double duty: it renders as cards, and `lib/seo/faq.ts` parses it
into FAQPage JSON-LD. Deriving the schema from the visible HTML is deliberate —
a hand-written second copy of the Q&A drifts the moment someone edits the article.

```html
<div class="faq">
  <div class="faq-item">
    <h3>คำถาม?</h3>
    <p>คำตอบ</p>
  </div>
</div>
```

The parser reads to the first `</div>`, so a nested `<div>` inside a `.faq-item`
would silently truncate the answer in the schema. The validator rejects that.

Never hand-write a `<script type="application/ld+json">` block into the article.
Article, FAQPage and BreadcrumbList schemas are all emitted by the page component.

## Phase 4 — write the metadata JSON

Create `seo/published/<slug>.json` alongside the HTML:

```json
{
  "slug": "english-kebab-slug",
  "title": "หัวข้อบทความเต็ม (แสดงเป็น H1 บนหน้า)",
  "seo_title": "หัวข้อสำหรับ <title>",
  "seo_description": "…",
  "excerpt": "…",
  "author": "Home Tool Center",
  "tags": ["สีทาบ้าน", "…"],
  "status": "published",
  "content_file": "<slug>.html",
  "cover_image_url": null,
  "og_image_url": null,
  "_notes": { "primary_kw": "…", "secondary_kw": ["…"], "source_draft": "seo/blogs/….md" }
}
```

Field notes worth knowing:

- **`slug` must be lowercase ASCII kebab-case.** WordPress stored Thai slugs
  percent-encoded and it caused 38 dead product pages; English slugs avoid the
  whole class of problem. The URL becomes `/blog/<slug>`.
- **`seo_title` must NOT contain "| Home Tool Center".** The root layout applies
  a `%s | Home Tool Center` template, so the brand is appended automatically —
  including it yourself duplicates it. Budget ~40 Thai characters for `seo_title`
  so the rendered title stays near 60 with the brand suffix.
- `seo_description`: ~120–155 characters, primary keyword near the front,
  and it should read like a promise rather than a summary.
- `excerpt` feeds the meta description fallback and the Article schema's
  `description`. Write it, don't leave it null.
- `status`: `draft` keeps the post off the live site entirely (`/blog/<slug>`
  returns 404 and it disappears from `/blog`). Use `draft` while a cover image is
  still pending, then flip to `published`.

## Phase 5 — validate and publish

```bash
node scripts/seo/publish-post.js seo/published/<slug>.json --dry   # check only
node scripts/seo/publish-post.js seo/published/<slug>.json         # write
```

The script upserts on `slug`, so re-running republishes in place and keeps the URL
and the original `published_at` — the article's age signal and its position in the
blog listing both survive an edit. Add `--draft` to force draft status regardless
of the JSON.

If it reports failures, fix the article rather than the validator. Every check
corresponds to a defect that reached production once already.

## Phase 6 — verify

Run the dev server and check the real page, not just the file:

```bash
npm run dev
curl -s localhost:3000/blog/<slug> | grep -c '<h1'          # expect 1
curl -s localhost:3000/blog/<slug> | grep -o 'FAQPage'      # expect a hit
npm run build                                                # must stay green
```

A screenshot at 1280px and at 390px is worth the minute it takes — Thai text
reflows differently from Latin and mobile problems are invisible on desktop.

⚠️ If a CSS change looks like it did not apply, curl the stylesheet the page links
to and grep it. Turbopack has served a stale CSS chunk here before; `rm -rf .next/dev`
and restart fixes it. Do not trust a screenshot to tell you whether CSS shipped.

## Phase 7 — deploying

Content changes reach the live site on their own — the post lives in the database
and `/blog/*` revalidates hourly. **Only code changes need a deploy.**

If a deploy is needed, read `references/deploy.md` first. There is a live-site
hazard in this repo's branch layout that has to be checked before pushing.

## Cover images

Ask for **1200 × 630 px** (JPG for photos, PNG for flat graphics with text, under
~300 KB). That size serves the in-article cover, `og:image` and the Twitter/LINE/
Facebook preview.

The `/blog` listing card crops to 16:10, which trims **96 px from each side**, so
keep logos and text at least ~110 px in from the left and right edges. The article
cover itself is uncropped.

Until real art arrives, leave `cover_image_url` and `og_image_url` as `null` — the
post page and the listing card both render a labelled placeholder. Be explicit with
the user that a null cover means **no `og:image`**, so shares to LINE and Facebook
have no preview image.

`scripts/seo/make-cover.js` can compose a cover from the site's fonts, logo and a
product shot if the client has no art. It needs a per-slug entry in its `COVERS`
map, and falls back to system Chrome because this machine has no Playwright browsers
installed.

## Reference files

- `references/internal-links.md` — real category paths, product slugs and the SQL to find more
- `references/deploy.md` — the branch/production hazard, and how to verify a deploy
