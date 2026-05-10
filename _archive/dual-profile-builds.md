# Dual-Profile Builds: Mechanism

How the platform produces two separate static builds (student / instructor)
from a single source tree.

**Where this lives in the platform.** The dual-profile mechanism is
implemented in `@sophia/astro` — the only Astro-coupled package. The
`PROFILE` env var, the `vite.define` substitution, the
`<ProfileProvider>` React context (which `<SolutionKey>` and friends
read), and the build-script flags all live there. Consumer course
repos call `@sophia/astro`'s integration in their `astro.config.mjs`
and run `sophia build:both` from the CLI; they don't implement
profile filtering themselves. v1 strict-subset and v2 full mechanism
are both `@sophia/astro` package versions, not consumer-side
work.

## v1 vs. v2 scope

This doc describes the **full v2 mechanism**. The **v1 ship** is a strict
subset of it.

**v1 (initial release):**

- Single build target: `pnpm build` produces `dist/` for the student
  audience and deploys to GitHub Pages.
- Schema includes `Chapter.profiles` and `Mission.profiles` (default
  `['student', 'instructor']`); v1 doesn't act on entity-level filtering.
- MDX components `<SolutionKey>`, `<InstructorNote>`,
  `<MisconceptionGuide>`, `<TeachingTip>` exist but render to `null`
  unconditionally — they collapse and strip from the bundle.
- Authors write solutions and teaching notes *inline* in chapter MDX
  from day one; they're stripped at build but live colocated in source.
- No second deploy target. No Cloudflare Pages, no Cloudflare Access.
- For instructor-side viewing: `pnpm preview:instructor` builds locally
  on `localhost`.

**v2 (activated when triggers are met):**

- Second build target: `pnpm build:instructor` produces a separate
  `dist/instructor/`.
- MDX components flip from always-null to `PROFILE`-conditional.
- Entity-level filtering activates: chapters/missions tagged
  `[instructor]` only don't produce pages in the student build.
- Cloudflare Pages + Cloudflare Access deploy for the instructor build.
- Optional custom domain via Cloudflare DNS.

**v2 triggers (any one is sufficient):**

- ≥10 chapters carrying substantial instructor content.
- TA or co-instructor needs remote access.
- Want to read teaching notes from phone/iPad before class.

**v2 migration cost:** ~1 evening of CI/Cloudflare work, ~10 lines per
component. Zero chapter content changes.

## TL;DR (v2 mechanism)

One codebase, one env var (`PROFILE`), two `astro build` invocations,
two separate `dist/` folders. Filtering happens at two levels:

1. **Entity-level** — content collections filter chapters/missions/etc.
   based on their declared `profiles` array. Excluded entities don't
   produce pages in the build at all.
2. **Body-level** — MDX components like `<SolutionKey>` and
   `<InstructorNote>` conditionally render based on the build's profile.
   In the student build, they collapse to `null` and tree-shake away.

## package.json scripts

In **v1**, only `build` and `preview:instructor` are wired into CI; the
others exist but only `build` runs on push.

```jsonc
// v1 minimum
{
  "scripts": {
    "dev":                "astro dev",
    "build":              "PROFILE=student astro build",
    "preview":            "astro preview",
    "preview:instructor": "PROFILE=instructor astro build && astro preview"
  }
}
```

When **v2** activates, scripts expand to the dual-profile shape:

```jsonc
// v2 full
{
  "scripts": {
    "dev":               "PROFILE=instructor astro dev",
    "build:student":     "PROFILE=student astro build --outDir dist/student",
    "build:instructor":  "PROFILE=instructor astro build --outDir dist/instructor",
    "build:both":        "pnpm build:student && pnpm build:instructor",
    "preview:student":   "astro preview --outDir dist/student",
    "preview:instructor":"astro preview --outDir dist/instructor"
  }
}
```

## astro.config.mjs

```js
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

const profile = process.env.PROFILE ?? 'student';

export default defineConfig({
  integrations: [mdx()],
  site: profile === 'student'
    ? 'https://astrobytes-edu.github.io'
    : 'http://localhost:4321',
  base: profile === 'student' ? '/astr201' : '/astr201-instructor',
  vite: {
    define: {
      'import.meta.env.PROFILE': JSON.stringify(profile),
    },
  },
});
```

The `vite.define` line is the critical bit: it bakes the literal string
into the bundle wherever a component reads `import.meta.env.PROFILE`,
so dead branches tree-shake away.

## src/content/config.ts

```ts
import { defineCollection, z } from 'astro:content';

const profiles = z
  .array(z.enum(['student', 'instructor']))
  .default(['student', 'instructor']);

const chapters = defineCollection({
  type: 'content',
  schema: z.object({
    id: z.string(),
    title: z.string(),
    profiles,
    // ...other fields from content-schema.md
  }),
});

export const collections = { chapters };
```

## Page-level filtering

```astro
---
// src/pages/chapters/[slug].astro
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const chapters = await getCollection(
    'chapters',
    ({ data }) => data.profiles.includes(import.meta.env.PROFILE)
  );
  return chapters.map((chapter) => ({
    params: { slug: chapter.slug },
    props: { chapter },
  }));
}

const { chapter } = Astro.props;
const { Content } = await chapter.render();
---
<Layout>
  <article>
    <Content />
  </article>
</Layout>
```

## MDX components for inline conditional rendering

In **v1**, these always return `null`. They exist only so chapter
authors can write solutions and notes inline; build-time stripping
removes them from the bundle.

```tsx
// src/components/Profile.tsx — v1 minimum
export const InstructorOnly = (_: { children: any }) => null;
export const StudentOnly    = ({ children }: { children: any }) => <>{children}</>;
export const SolutionKey    = (_: { children: any }) => null;
export const InstructorNote = (_: { children: any }) => null;
```

In **v2**, the same components become PROFILE-conditional. This is the
"flip" — no chapter content changes, just the implementation:

```tsx
// src/components/Profile.tsx — v2
const PROFILE = import.meta.env.PROFILE;

export const InstructorOnly = ({ children }) =>
  PROFILE === 'instructor' ? <>{children}</> : null;

export const StudentOnly = ({ children }) =>
  PROFILE === 'student' ? <>{children}</> : null;

export const SolutionKey = ({ children }) =>
  PROFILE === 'instructor'
    ? <aside class="solution-key">{children}</aside>
    : null;

export const InstructorNote = ({ children }) =>
  PROFILE === 'instructor'
    ? <aside class="instructor-note">{children}</aside>
    : null;
```

## A chapter using both

```mdx
---
id: flux-luminosity-distance
title: "Flux, Luminosity, and Distance"
profiles: [student, instructor]
---
import { Prediction, SolutionKey, InstructorNote } from '~/components/Profile';

## How flux relates to luminosity

The flux you measure on Earth depends on both how bright the star actually
is and how far away it is.

<Prediction
  question="If the distance to a star doubles, what happens to the measured flux?"
  choices={["Doubles", "Halves", "Decreases by 4×", "Stays the same"]}
/>

<SolutionKey>
Flux scales as $1/d^2$, so distance doubling → 4× flux drop.
</SolutionKey>

<InstructorNote>
Common stumble: students conflate flux and luminosity here. Plan ~10 minutes
of board work showing the inverse-square diagram before the demo.
</InstructorNote>
```

One source. Two audiences. Different bundles.

## Output layout

```text
dist/
  student/
    index.html
    chapters/
      flux-luminosity-distance/
        index.html         # student content only
    _astro/                # tree-shaken bundle, no instructor strings
  instructor/
    index.html
    chapters/
      flux-luminosity-distance/
        index.html         # student + instructor content
    _astro/                # different bundle
```

## Deploy + auth ("how do I have both, with instructor login?")

GitHub Pages cannot do auth — it serves static files publicly. To have
*both* sites publicly reachable but instructor gated behind login, you
need a separate host for the instructor build.

**Recommended targets:**

| Build      | Host                  | Auth                      | URL example                          |
|------------|-----------------------|---------------------------|--------------------------------------|
| Student    | GitHub Pages          | None (public)             | `astrobytes-edu.github.io/astr201/`  |
| Instructor | Cloudflare Pages      | Cloudflare Access (free)  | `astr201-instructor.astrobytes.edu`  |

No code changes in the Astro app between the two — auth lives at the edge.

### How Cloudflare Access works

Cloudflare Access is part of Cloudflare's Zero Trust offering. The free
plan covers up to 50 seats (verify current limits — Cloudflare adjusts
free-tier specifics over time). It works as a reverse-proxy gate: when
someone requests `astr201-instructor.astrobytes.edu`, Cloudflare
intercepts the request *before* it reaches your Pages content,
authenticates the user against an identity provider, checks the access
policy, and only then proxies through to the deployment.

Concretely, the request flow looks like:

```
Browser → Cloudflare edge → Access challenge (login) → Pages origin
```

If the user is not logged in or doesn't match policy, Cloudflare serves
its own login page, never the underlying content. Login session is held
in a Cloudflare-issued JWT cookie scoped to the application's domain.

### Step 1: Get the repo onto Cloudflare Pages

Three deployment paths. Pick one — they're equivalent in result.

**Path A — Cloudflare dashboard, git-connected (simplest):**

1. Cloudflare dashboard → *Pages* → *Create a project* → *Connect to Git*.
2. Authorize the GitHub app on your repo.
3. Build settings:
   - **Framework preset:** None.
   - **Build command:** `pnpm install && pnpm build:instructor`
   - **Build output directory:** `dist/instructor`
   - **Root directory:** *(leave blank or set to `apps/astr201/` if monorepo)*
   - **Environment variables:** `PROFILE=instructor`, `NODE_VERSION=20`
4. Cloudflare auto-deploys on every push to `main`. Preview deploys on
   PRs work automatically.

**Path B — GitHub Actions deploys via Wrangler (most control):**

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
- `CLOUDFLARE_ACCOUNT_ID` — found in any zone's *Overview* page in the
  dashboard.

**Path C — Local Wrangler push (good for one-offs):**

```bash
pnpm dlx wrangler pages deploy dist/instructor \
  --project-name=astr201-instructor \
  --branch=main
```

First run authenticates via browser; subsequent pushes are silent.

### Step 2: Configure Cloudflare Access

Once the Pages project exists and has at least one deployment:

1. Cloudflare dashboard → *Zero Trust* (left sidebar). Sign up for the
   free Zero Trust plan if you haven't (asks for billing info but
   doesn't charge for free-tier usage).
2. *Access* → *Applications* → *Add an application* → *Self-hosted*.
3. **Application configuration:**
   - **Name:** `ASTR 201 Instructor Materials`
   - **Session duration:** `24h` is reasonable; longer is more
     convenient, shorter is more secure.
   - **Application domain:** the public URL of your Pages project,
     either the default `astr201-instructor.pages.dev` or your custom
     subdomain (see Step 3).
   - **Identity providers:** enable *One-time PIN* (sends a 6-digit
     code to the user's email — no setup required) and/or *Google*
     (requires OAuth setup but is the most frictionless login).
4. **Add an Access policy:**
   - **Policy name:** `Allow Anna and TAs`
   - **Action:** Allow
   - **Configure rules:**
     - *Selector:* Emails. *Value:* a list of explicit emails:
       `alrosen@sdsu.edu`, plus any TA/co-instructor emails.
     - *OR* (if you want to allow anyone at SDSU who logs in via SSO):
       *Selector:* Emails ending in. *Value:* `@sdsu.edu`. Combined with
       a Google IdP that's restricted to SDSU domain.
5. **Review** → **Save**.

### Step 3: Custom domain (optional but recommended)

Default URL is `astr201-instructor.pages.dev`, which works but isn't
memorable. For a custom subdomain like `astr201-instructor.astrobytes.edu`:

**Prerequisites:** the parent domain (e.g., `astrobytes.edu`) must be on
Cloudflare DNS. Free.

1. Cloudflare dashboard → your zone → *DNS* → *Add record*:
   - **Type:** CNAME
   - **Name:** `astr201-instructor`
   - **Target:** `astr201-instructor.pages.dev`
   - **Proxy status:** Proxied (orange cloud).
2. Cloudflare dashboard → *Pages* → your project → *Custom domains* →
   *Set up a custom domain* → enter `astr201-instructor.astrobytes.edu`.
   Cloudflare verifies the CNAME and provisions a TLS cert automatically
   (5–10 minutes).
3. Update the Cloudflare Access *Application domain* to the new custom
   domain.

### Step 4: Verify

In a fresh browser (or incognito window):

1. Visit `astr201-instructor.astrobytes.edu`.
2. Cloudflare Access intercepts → presents login page with the IdPs you
   enabled.
3. Log in with an email on the allowlist.
4. Confirm content loads.
5. Try logging in with an off-list email → confirm Cloudflare denies access.
6. (Optional) `grep` the student bundle for instructor-only strings as a
   defense-in-depth check that profile filtering worked.

### Authentication methods, compared

| Method            | Setup effort | UX               | When to use                     |
|-------------------|--------------|------------------|---------------------------------|
| One-time PIN      | None         | Email round-trip | Fallback; works for any email   |
| Google login      | Low (OAuth)  | One click        | Default for personal Gmail/SDSU |
| Microsoft login   | Low (OAuth)  | One click        | If SDSU uses Microsoft 365      |
| GitHub login      | Low (OAuth)  | One click        | Devs only; unlikely fit here    |
| SAML (institution)| High         | Federated SSO    | Only if SDSU IT supports it     |

Recommended for v1: enable **One-time PIN** (always works) plus **Google
login** (fast for daily use). Skip the institutional SAML route unless
SDSU IT is willing to set it up.

### Cost

- **Cloudflare Pages:** free for unlimited sites, 500 builds/month, 100
  custom domains, 25 MiB max file size. Course site fits comfortably.
- **Cloudflare Zero Trust (Access):** free for up to 50 users.
- **Cloudflare DNS:** free for unlimited zones.
- **Wrangler / GitHub Actions:** free.

Total monthly cost for the recommended setup: **$0**. Verify current
limits — Cloudflare's free-tier specifics shift periodically.

### Common gotchas

- **First Access challenge sometimes fails on a new browser** because
  Cloudflare hasn't propagated the policy yet. Wait 1–2 minutes and retry.
- **Custom domain TLS cert provisioning** takes 5–10 minutes after CNAME
  is added; you'll see a "certificate pending" state on the Pages domain
  page in the meantime.
- **Cloudflare API token scoping**: the auto-generated "Edit Cloudflare
  Pages" template is sufficient. Don't grant broader scope than needed.
- **Don't put Cloudflare Access in front of the *student* site**, even
  by accident — it'll block your students. Access applications are
  per-domain, so as long as the student site is on a different domain
  (GitHub Pages), this isn't a risk.
- **`--branch=main`** in Wrangler tells Pages this is a production
  deployment (vs. preview). Without it, every push lands as a preview.

### Alternatives recap

- **Private GitHub Pages** — supported on paid GitHub Team/Enterprise.
  Anyone with repo read access sees the Pages site. Simpler than
  Cloudflare Access *if* you already have a paid plan with this
  feature. Verify current plan tiers.
- **Vercel** with deployment protection or password — works similarly;
  free tier is more constrained.
- **Canvas** — for *distributing* instructor materials to TAs (PDF or
  HTML upload), Canvas's role-based access is the right tool. Worse for
  "browse your live instructor site"; better for handoff to TAs.
- **Local-only** (`pnpm preview:instructor`) — simplest path. No deploy,
  no auth, zero risk of leak. Good baseline before adding the cloud
  setup.

### Recommended starting point

1. Start with **local-only** for the simplest case.
2. Add **Cloudflare Pages + Access (Path A)** when you need to read
   instructor notes from any device or share with a TA. Roughly an
   evening of setup.
3. Move to **Path B (GitHub Actions + Wrangler)** once you want preview
   deploys on PRs and a unified CI flow.
4. Add Canvas distribution only if a specific TA workflow demands it.

## Caveats and verification

- This sketch uses Astro 4/5-era APIs. Astro evolves quickly; verify the
  current syntax for `vite.define`, content collections, and `astro:env`
  against current Astro docs when wiring this up for real.
- The "no instructor strings in the student bundle" property depends on
  Vite's literal-string substitution + tree-shaking working as expected.
  For anything genuinely sensitive (solution keys), `grep` the student
  `dist/` for known instructor-only strings as a smoke test before
  trusting it.
- The newer `astro:env` typed-env API is a cleaner alternative to
  `vite.define` once it stabilizes. Either works.

## Why this is better than Quarto's profile system

Quarto's `_quarto-student.yml` / `_quarto-instructor.yml` gate at the
file level (or via per-chunk `#| profile:` flags). Maintaining two
near-identical config files is high-friction, which is probably why
the dual-profile YAMLs you set up in your existing courses never got
used.

The Astro+MDX approach removes that friction by letting instructor
content live *inline* in the natural flow of the prose:

```mdx
The flux you measure on Earth depends on both...

<InstructorNote>
Plan ~10 minutes of board work here before the demo.
</InstructorNote>

<OMI ... />
```

One file. One source of truth. Two audiences. Build-time filtering
guarantees the student bundle is genuinely clean of instructor content.
