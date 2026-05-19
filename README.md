# Sophie

> **Status: active development.** Sophie is being built openly but is not yet
> ready for external use. APIs, package layout, and content schemas are
> changing rapidly. There is no published `@sophie/*` package yet.

Sophie is a schema-driven, AI-authorable platform for interactive scientific
textbooks, course websites, slide decks, and LMS exports — modeled on MyST and
Quarto, designed as a standalone, distributable platform. The platform code
lives in this repo (`@sophie/*` packages); course content lives in *separate*
consumer repositories that depend on `@sophie/*`.

The architectural decisions, design rationale, and roadmap live in
[`docs/website/`](docs/website/) as a [MyST](https://mystmd.org/) site. To run
the docs site locally:

```bash
cd docs/website
npx mystmd start          # http://localhost:3000
```

## For contributors and AI tools

Read [`CLAUDE.md`](CLAUDE.md) before working in this repo. It captures the
human-in-the-loop mandate, the locked architectural decisions (ADRs 0001–0061
at last count), the conventions, and the working style.

Sophie is in the **post-Phase-0 vertical-slice state**: five `@sophie/*`
packages ship (`core`, `components`, `astro`, `cli`, `theme`), the smoke
target at `examples/smoke/` is a working consumer course, and CI runs
typecheck / unit / lint / e2e / Storybook / visual-regression on every
PR. See
[`docs/website/decisions/0023-vertical-slice-build-order.md`](docs/website/decisions/0023-vertical-slice-build-order.md)
for the build-order decision,
[`docs/website/status/roadmap.md`](docs/website/status/roadmap.md) for
the phase plan, and
[`docs/website/status/validation.md`](docs/website/status/validation.md)
for the per-ADR validation tracker.

## License

Sophie is released under the [GNU Affero General Public License v3.0
(or later)](LICENSE). The AGPL preserves Sophie as truly open source while
preventing closed-source commercial forks via its copyleft and network-use
clauses; rationale is documented in
[ADR 0024](docs/website/decisions/0024-license-agpl.md).

Textbook content authored using Sophie lives in *separate* consumer
repositories and is licensed independently (the recommended content license
is CC BY-NC-SA 4.0 — see roadmap).
