---
title: Deploy a Sophie consumer site to GitHub Pages
short_title: Deploy to GitHub Pages
description: Configure GitHub Actions to build and deploy a consumer course site (student profile) to GitHub Pages.
tags: [deploy, github-pages, ci, hosting]
---

# Deploy a Sophie consumer site to GitHub Pages

The default v1 hosting target for the **student profile** of every
Sophie consumer site is GitHub Pages. Free, static, public.
For the **instructor profile**, see
[Set up Cloudflare Access](set-up-cloudflare-access.md).

:::{important} Earned alongside Phase 1
This how-to is a stub until Phase 1 produces the first deployed
consumer course. The recipe below is the expected shape; small
adjustments may be needed once Astro's Pages-deployment patterns are
exercised against a real `@sophie/astro`-integrated site.
:::

## The recipe (expected shape)

### 1. Build settings

In the consumer course's `astro.config.mjs`:

```js
export default defineConfig({
  site: 'https://drannarosen.github.io',
  base: '/astr201',           // matches GH Pages path
  integrations: [sophie()],
});
```

### 2. GitHub Actions workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push: { branches: [main] }
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install
      - run: pnpm sophie audit course astr201
      - run: PROFILE=student pnpm build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }

  deploy:
    needs: build
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

### 3. Repository settings

- *Settings → Pages → Source*: GitHub Actions.
- Confirm the URL: `https://drannarosen.github.io/astr201/`.

## Troubleshooting

- **404 on chapter pages**: usually a `base` mismatch in
  `astro.config.mjs`. The `base` must match the path component of the
  GitHub Pages URL.
- **404 on assets**: ensure all asset URLs use Astro's `base`-aware
  helpers (`Astro.url`, the `<Image>` component) rather than absolute
  paths.
- **`sophie audit` fails in CI**: the build runs `audit` first by
  design. Fix the chapter, push, retry.

## Alternatives

- **Cloudflare Pages** — free, similar workflow, supports preview
  deployments on PRs. Use for the instructor build (which Cloudflare
  Access protects).
- **Vercel** — free tier; deployment protection requires Pro.
- **Netlify** — free tier; deployment previews on PRs.
- **Custom static host** — `dist/` is portable.

## See also

- [Set up Cloudflare Access](set-up-cloudflare-access.md) for the
  instructor build.
- [Set up dual-profile builds](set-up-dual-profile.md) for the
  PROFILE env var mechanism.
