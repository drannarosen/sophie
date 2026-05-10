---
title: Set up Cloudflare Access for the instructor build
short_title: Cloudflare Access
description: Deploy and protect the instructor-profile build using Cloudflare Pages + Cloudflare Access.
tags: [deploy, cloudflare, access, instructor, v2]
---

# Set up Cloudflare Access for the instructor build

GitHub Pages cannot do auth — it serves static files publicly. To
have *both* sites publicly reachable but **the instructor gated
behind login**, you need a separate host for the instructor build.

This how-to is the v2 step. Until v2 triggers fire (see
[Set up dual-profile](set-up-dual-profile.md)), the instructor build
is local-only via `sophie preview --profile=instructor`.

## Recommended targets

| Build | Host | Auth | URL example |
|---|---|---|---|
| Student | GitHub Pages | None (public) | `drannarosen.github.io/astr201/` |
| Instructor | Cloudflare Pages | Cloudflare Access (free) | `astr201-instructor.astrobytes.edu` |

No code changes in the Astro app between the two — auth lives at the
edge.

## How Cloudflare Access works

Cloudflare Access is part of Cloudflare's Zero Trust offering. The
free plan covers up to 50 seats (verify current limits — Cloudflare
adjusts free-tier specifics over time). It works as a reverse-proxy
gate: when someone requests `astr201-instructor.astrobytes.edu`,
Cloudflare intercepts the request *before* it reaches your Pages
content, authenticates the user against an identity provider, checks
the access policy, and only then proxies through to the deployment.

```{mermaid}
flowchart LR
    Browser --> Edge[Cloudflare edge]
    Edge --> Login{Logged in?}
    Login -->|no| Challenge[Login page]
    Challenge --> Edge
    Login -->|yes, allowed| Origin[Pages origin]
    Origin --> Browser
    Login -->|yes, denied| Denied[403]
```

If the user is not logged in or doesn't match policy, Cloudflare
serves its own login page, never the underlying content. Login
session is held in a Cloudflare-issued JWT cookie scoped to the
application's domain.

## Step 1: Get the repo onto Cloudflare Pages

Three deployment paths. Pick one — they're equivalent in result.

### Path A — Cloudflare dashboard, git-connected (simplest)

1. Cloudflare dashboard → *Pages* → *Create a project* → *Connect to Git*.
2. Authorize the GitHub app on your repo.
3. Build settings:
   - **Framework preset:** None.
   - **Build command:** `pnpm install && pnpm build:instructor`
   - **Build output directory:** `dist/instructor`
   - **Root directory:** *(leave blank or set to `apps/astr201/` if monorepo)*
   - **Environment variables:** `PROFILE=instructor`, `NODE_VERSION=20`
4. Cloudflare auto-deploys on every push to `main`. Preview deploys
   on PRs work automatically.

### Path B — GitHub Actions deploys via Wrangler (most control)

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push: { branches: [main] }

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install
      - run: pnpm build:both
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist/student }
      - uses: actions/upload-artifact@v4
        with: { name: instructor-build, path: dist/instructor }

  deploy-student:
    needs: build
    permissions: { pages: write, id-token: write }
    environment: { name: github-pages }
    runs-on: ubuntu-latest
    steps:
      - uses: actions/deploy-pages@v4

  deploy-instructor:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with: { name: instructor-build, path: dist/instructor }
      - name: Publish to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: >-
            pages deploy dist/instructor
            --project-name=astr201-instructor
            --branch=main
```

Required GitHub secrets:

- `CLOUDFLARE_API_TOKEN` — created in Cloudflare dashboard:
  *My Profile → API Tokens → Create Token → "Edit Cloudflare Pages"
  template*. Scope it to the relevant account and zone.
- `CLOUDFLARE_ACCOUNT_ID` — found in any zone's *Overview* page in
  the dashboard.

### Path C — Local Wrangler push (good for one-offs)

```bash
pnpm dlx wrangler pages deploy dist/instructor \
  --project-name=astr201-instructor \
  --branch=main
```

First run authenticates via browser; subsequent pushes are silent.

## Step 2: Configure Cloudflare Access

Once the Pages project exists and has at least one deployment:

1. Cloudflare dashboard → *Zero Trust* (left sidebar). Sign up for the
   free Zero Trust plan if you haven't.
2. *Access* → *Applications* → *Add an application* → *Self-hosted*.
3. **Application configuration:**
   - **Name:** `ASTR 201 Instructor Materials`
   - **Session duration:** `24h` is reasonable.
   - **Application domain:** the public URL of your Pages project.
   - **Identity providers:** enable *One-time PIN* (sends a 6-digit
     code to email) and/or *Google* (most frictionless).
4. **Add an Access policy:**
   - **Policy name:** `Allow Anna and TAs`
   - **Action:** Allow
   - **Configure rules:**
     - *Selector:* Emails. *Value:* a list of explicit emails.
     - *OR:* *Selector:* Emails ending in. *Value:* `@sdsu.edu`.
       Combined with a Google IdP restricted to SDSU domain.
5. **Review** → **Save**.

## Step 3: Custom domain (optional but recommended)

Default URL is `astr201-instructor.pages.dev`, which works but isn't
memorable. For `astr201-instructor.astrobytes.edu`:

**Prerequisites:** the parent domain (e.g., `astrobytes.edu`) must
be on Cloudflare DNS. Free.

1. Cloudflare dashboard → your zone → *DNS* → *Add record*:
   - **Type:** CNAME
   - **Name:** `astr201-instructor`
   - **Target:** `astr201-instructor.pages.dev`
   - **Proxy status:** Proxied (orange cloud).
2. Cloudflare dashboard → *Pages* → your project → *Custom domains*
   → *Set up a custom domain* → enter
   `astr201-instructor.astrobytes.edu`.
3. Update the Cloudflare Access *Application domain* to the new
   custom domain.

## Step 4: Verify

In a fresh browser (or incognito window):

1. Visit `astr201-instructor.astrobytes.edu`.
2. Cloudflare Access intercepts → presents login page.
3. Log in with an email on the allowlist.
4. Confirm content loads.
5. Try an off-list email → confirm Cloudflare denies access.
6. (Optional) `grep` the *student* bundle for instructor-only strings
   as defense-in-depth.

## Authentication methods compared

| Method | Setup effort | UX | When to use |
|---|---|---|---|
| One-time PIN | None | Email round-trip | Fallback; works for any email |
| Google login | Low (OAuth) | One click | Default for personal Gmail/SDSU |
| Microsoft login | Low (OAuth) | One click | If SDSU uses Microsoft 365 |
| GitHub login | Low (OAuth) | One click | Devs only; unlikely fit here |
| SAML (institution) | High | Federated SSO | Only if SDSU IT supports it |

Recommended for v1: **One-time PIN** (always works) plus **Google
login** (fast for daily use). Skip institutional SAML unless SDSU IT
will set it up.

## Cost

- **Cloudflare Pages:** free for unlimited sites, 500 builds/month,
  100 custom domains, 25 MiB max file size. Course site fits
  comfortably.
- **Cloudflare Zero Trust (Access):** free for up to 50 users.
- **Cloudflare DNS:** free for unlimited zones.
- **Wrangler / GitHub Actions:** free.

Total monthly cost: **$0**. Verify current limits — Cloudflare's
free-tier specifics shift periodically.

## Common gotchas

- **First Access challenge sometimes fails on a new browser** because
  Cloudflare hasn't propagated the policy yet. Wait 1–2 minutes and
  retry.
- **Custom domain TLS cert provisioning** takes 5–10 minutes after
  CNAME is added.
- **Cloudflare API token scoping**: use the auto-generated "Edit
  Cloudflare Pages" template; don't grant broader scope.
- **Don't put Cloudflare Access in front of the *student* site**, even
  by accident — it'll block your students.
- **`--branch=main`** in Wrangler tells Pages this is a production
  deployment (vs. preview). Without it, every push lands as a preview.

## Alternatives

- **Private GitHub Pages** — supported on paid GitHub Team/Enterprise.
  Simpler than Cloudflare Access *if* you already have a paid plan.
- **Vercel** with deployment protection or password — works similarly;
  free tier is more constrained.
- **Canvas** — for *distributing* instructor materials to TAs (PDF or
  HTML upload), Canvas's role-based access is the right tool. Worse
  for "browse your live instructor site"; better for handoff.
- **Local-only** (`sophie preview --profile=instructor`) — simplest
  path. No deploy, no auth, zero risk of leak. Good baseline.

## Recommended starting point

1. Start with **local-only** for the simplest case (v1).
2. Add **Cloudflare Pages + Access (Path A)** when you need to read
   instructor notes from any device or share with a TA. Roughly an
   evening of setup.
3. Move to **Path B (GitHub Actions + Wrangler)** once you want
   preview deploys on PRs and a unified CI flow.
4. Add Canvas distribution only if a specific TA workflow demands it.
