# Deploying

## Content vs. code

Publishing an article writes to Supabase. The live site picks it up on its own —
`/blog` and `/blog/[slug]` carry `revalidate = 3600`, so a new or edited post appears
within an hour with no deploy at all. Same for setting a post to `draft`: it drops off
the site as its cache turns over. `sitemap.xml` revalidates on the same hour.

**Only changes to code, CSS or components need a deploy.**

⚠️ **One content change does need a deploy: draft → published.** `/blog/[slug]` builds
`generateStaticParams` from *published* slugs, so a draft was never prerendered and
production is serving a **cached 404** for it under `revalidate = 3600` — flipping the
status in the database does not clear that, and the post is also absent from the
prerendered sitemap. Push to `main` (or redeploy) and it goes live at once. Editing or
unpublishing a post that is already live is the case ISR handles on its own.

## The hazard: main is the production branch

The Vercel project is GitHub-connected with `productionBranch: main`, so **any push to
`main` builds and ships production** — to a live client site with Google Ads running
against it.

This has already gone wrong once. Sessions 5–7 (launch, DNS cutover, Google Ads/GTM
recovery) were committed to `feat/launch-and-analytics` and deployed to production from
that branch via the CLI, but never merged back. `main` sat five commits behind what was
actually serving traffic. Pushing `main` in that state would have built a production
deployment without GTM, `.vercelignore` or the DNS tooling — silently removing conversion
tracking from a live storefront.

So before any push to `main`:

```bash
git fetch origin
git branch -r                                            # what other branches exist?
git log --oneline origin/main..origin/<branch>           # is any of them ahead?
```

If a branch is ahead, merge it into `main` first, then confirm nothing was lost:

```bash
comm -23 <(git ls-tree -r --name-only origin/<branch> | sort) \
         <(git ls-tree -r --name-only HEAD | sort)        # expect empty
git diff --stat origin/<branch> HEAD                      # expect only your own files
```

Cross-check against the running site too — if production serves something the incoming
tree lacks (`curl -s https://hometools-center.com/ | grep -c googletagmanager`), stop.

## After deploying

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://hometools-center.com/
curl -s https://hometools-center.com/ | grep -c googletagmanager        # analytics intact
curl -s https://hometools-center.com/blog/<slug> | grep -c article-body # new CSS shipped
```

Then pull the stylesheet the page links to and grep it for the rule you changed. The
HTML referencing a class proves nothing about whether the CSS defining it deployed.
