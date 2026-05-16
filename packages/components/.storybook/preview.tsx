import { withThemeByDataAttribute } from "@storybook/addon-themes";
import type { Preview } from "@storybook/react-vite";

// Self-hosted IBM Plex Sans + Mono via @sophie/theme/fonts (PR-2 of
// Workstream 3). Loads @fontsource @font-face declarations + bundles
// .woff2 assets so VR baselines render with the real Plex glyphs
// rather than the system-sans fallback.
import "@sophie/theme/fonts";
// Sophie's design tokens. Loading `@sophie/theme/css` defines the
// `--sophie-*` CSS custom properties used by every component's
// CSS Modules. We deliberately don't load `@sophie/theme/tailwind`
// here because components use CSS Modules (ADR 0005), not Tailwind
// utility classes — the `@theme` directive would be inert without a
// Tailwind processing step, and the variables come from theme.css
// regardless.
import "@sophie/theme/css";
// Apply --sophie-bg + --sophie-text to the preview body so muted text
// tokens (designed for cream bg) hit AA contrast on every platform.
import "./preview.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // Run axe automatically against every story render.
      // Story authors can override per-story via parameters.a11y.
      context: "body",
      config: {},
      options: {},
    },
    layout: "padded",
  },
  decorators: [
    withThemeByDataAttribute({
      themes: {
        light: "light",
        dark: "dark",
      },
      defaultTheme: "light",
      attributeName: "data-theme",
    }),
  ],
};

export default preview;
