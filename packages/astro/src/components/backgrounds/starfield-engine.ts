/**
 * Photometric starfield engine — vendored Canvas 2D renderer for the
 * Deep Field course-home background (ADR 0097 #5).
 *
 * Vendored, NOT a dependency: this is a self-contained TypeScript port of
 * the technique from Anna's `cosmic-playground`
 * (`packages/runtime/src/starfield.ts`), adapted from the design-prototype
 * script at
 * `docs/reviews/assets/2026-05-31-course-home-deep-field/index.html`. The
 * two repos stay independent (ADR 0001) — a copy, not a shared package.
 *
 * Faithful to the prototype: power-law magnitude classes (bright stars
 * rare), spectral colors, multi-harmonic twinkle, sprite halos, subtle
 * Milky Way band + nebulae, diffraction spikes, shooting stars, two-layer
 * compositing (a baked static layer + a per-frame twinkle/shooting pass),
 * ambient-plus density, `prefers-reduced-motion` (one static frame, no
 * rAF loop), and pause-on-hidden-tab.
 *
 * Tuned DOWN for a text-forward course home: lower density/brightness
 * than the playground original so cards and prose stay legible.
 *
 * Determinism: `generateStars` accepts an injected `rng: () => number`
 * (default `Math.random`) so the distribution logic is unit-testable.
 * `Math.random` in shipped runtime code is fine — the Date.now/Math.random
 * ban is workflow-script-only, not component code.
 */

/** A single photometric magnitude class (power-law weighted). */
export interface MagnitudeClass {
  /** Fraction of stars in this class (the classes' `f` sum to ~1). */
  readonly f: number;
  /** Minimum sprite radius (px). */
  readonly min: number;
  /** Maximum sprite radius (px). */
  readonly max: number;
  /** Base opacity for the class. */
  readonly op: number;
  /** 1 → this class twinkles; 0 → static (baked into the static layer). */
  readonly tw: 0 | 1;
}

/**
 * Power-law-ish magnitude classes: bright stars are rare. Ported verbatim
 * from the prototype `MAG` table. The `f` values weight a single uniform
 * draw across the classes (see `generateStars`).
 */
export const MAGNITUDE_CLASSES = [
  { f: 0.012, min: 1.8, max: 2.7, op: 0.95, tw: 1 },
  { f: 0.04, min: 1.3, max: 1.9, op: 0.8, tw: 1 },
  { f: 0.1, min: 0.9, max: 1.3, op: 0.62, tw: 1 },
  { f: 0.3, min: 0.6, max: 0.9, op: 0.42, tw: 0 },
  { f: 0.4, min: 0.4, max: 0.6, op: 0.26, tw: 0 },
  { f: 0.148, min: 0.3, max: 0.45, op: 0.15, tw: 0 },
] as const satisfies readonly [MagnitudeClass, ...MagnitudeClass[]];

/**
 * The faintest class — the power-law draw's tail. `.at(-1) ?? [0]` is
 * statically `MagnitudeClass` (not `… | undefined`) under
 * `noUncheckedIndexedAccess`: the `??` is unreachable (the tuple is
 * non-empty) but satisfies the checker, and this survives table edits
 * without a literal index.
 */
const FAINTEST_CLASS: MagnitudeClass =
  MAGNITUDE_CLASSES.at(-1) ?? MAGNITUDE_CLASSES[0];

/** Spectral colors: hot-blue → solar-white → cool-amber. */
export const SPECTRAL_COLORS = [
  "#aabfff",
  "#cad8ff",
  "#ffffff",
  "#fff4e8",
  "#ffd2a1",
  "#ffcc6f",
] as const satisfies readonly [string, ...string[]];

/** A nebula cloud descriptor, in fractional canvas coordinates. */
export interface NebulaCloud {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly c: readonly [number, number, number];
}

/** Subtle reflection/dust nebulae baked into the static layer. */
export const NEBULAE: readonly NebulaCloud[] = [
  { x: 0.84, y: 0.16, r: 0.26, c: [140, 160, 210] }, // reflection blue, top-right
  { x: 0.1, y: 0.78, r: 0.24, c: [150, 110, 165] }, // violet dust, lower-left
  { x: 0.6, y: 0.95, r: 0.22, c: [80, 150, 150] }, // teal, bottom
];

/**
 * Density divisor: `count = round((W*H) / STAR_AREA_DIVISOR)`. Larger →
 * fewer stars. The prototype's "ambient-plus" value (text-forward tuning).
 */
export const STAR_AREA_DIVISOR = 2200;

/** A generated star, in CSS pixels. */
export interface Star {
  x: number;
  y: number;
  /** Sprite radius (px). */
  size: number;
  /** Spectral color (hex). */
  color: string;
  /** Effective opacity (class base × per-star jitter). */
  op: number;
  /** 1 → twinkles each frame; 0 → baked static. */
  tw: 0 | 1;
  /** Twinkle phase offset (rad). */
  ph: number;
  /** Twinkle speed multiplier. */
  sp: number;
}

/** Options for {@link generateStars}. */
export interface GenerateStarsOptions {
  /**
   * Injected uniform RNG in `[0, 1)`. Defaults to `Math.random`; tests
   * pass a seeded generator for determinism.
   */
  rng?: () => number;
  /** Override the area divisor (defaults to {@link STAR_AREA_DIVISOR}). */
  areaDivisor?: number;
}

/** Pick the magnitude class for a single weighted draw `r ∈ [0, 1)`. */
function pickMagnitudeClass(r: number): MagnitudeClass {
  let acc = 0;
  for (const k of MAGNITUDE_CLASSES) {
    acc += k.f;
    if (r <= acc) return k;
  }
  // Tail (the `f` values sum to ~0.998): fall through to the faintest.
  return FAINTEST_CLASS;
}

/**
 * Generate the photometric field for a `width × height` canvas (CSS px).
 *
 * Pure given `opts.rng`: count scales with area (`/ areaDivisor`), each
 * star's class is a power-law weighted draw, its color a uniform pick from
 * {@link SPECTRAL_COLORS}, and its size/opacity/twinkle-phase jittered. No
 * canvas, DOM, or globals touched — this is the testable distribution core.
 */
export function generateStars(
  width: number,
  height: number,
  opts: GenerateStarsOptions = {}
): Star[] {
  const rng = opts.rng ?? Math.random;
  const divisor = opts.areaDivisor ?? STAR_AREA_DIVISOR;
  const rand = (a: number, b: number): number => a + rng() * (b - a);

  const count = Math.round((width * height) / divisor);
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const m = pickMagnitudeClass(rng());
    stars.push({
      x: rng() * width,
      y: rng() * height,
      size: rand(m.min, m.max),
      // Index is always in `[0, len)`; `?? [0]` only satisfies the
      // `noUncheckedIndexedAccess` checker (the branch is unreachable).
      color:
        SPECTRAL_COLORS[(rng() * SPECTRAL_COLORS.length) | 0] ??
        SPECTRAL_COLORS[0],
      op: m.op * rand(0.8, 1.1),
      tw: m.tw,
      ph: rng() * 6.28,
      sp: rand(0.6, 1.6),
    });
  }
  return stars;
}

/** Handle returned by {@link initStarfield}; call `destroy()` to clean up. */
export interface StarfieldHandle {
  destroy(): void;
}

/** Options for {@link initStarfield}. */
export interface InitStarfieldOptions {
  /** Override the area divisor (defaults to {@link STAR_AREA_DIVISOR}). */
  areaDivisor?: number;
}

/**
 * Wire the starfield to a `<canvas>`: builds the field, bakes the static
 * layer (nebulae + Milky Way band + non-twinkling stars + diffraction
 * spikes), and either renders ONE static frame (reduced-motion) or runs
 * the rAF twinkle/shooting-star loop. Pauses on hidden tab; rebuilds on
 * resize (debounced). Returns a `destroy()` that stops the loop and
 * removes the listeners.
 *
 * Browser-only (reads `window`/`document`/`matchMedia`); call it from a
 * bundled component `<script>`, never at module top-level.
 */
export function initStarfield(
  canvas: HTMLCanvasElement,
  opts: InitStarfieldOptions = {}
): StarfieldHandle {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) return { destroy() {} };
  // Bind to a non-null const so the rAF-deferred `frame()` closure keeps
  // the narrowing (TS drops control-flow narrowing across a closure that
  // is invoked later, e.g. via requestAnimationFrame).
  const ctx: CanvasRenderingContext2D = maybeCtx;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const divisor = opts.areaDivisor ?? STAR_AREA_DIVISOR;

  let W = 0;
  let H = 0;
  let dpr = 1;
  let raf = 0;
  let stars: Star[] = [];
  let twinklers: Star[] = [];
  let staticCanvas: HTMLCanvasElement | null = null;
  let shooting: ShootingStar | null = null;
  let nextShoot = 0;
  const sprites = new Map<string, HTMLCanvasElement>();

  const rand = (a: number, b: number): number => a + Math.random() * (b - a);

  function spriteFor(size: number, color: string): HTMLCanvasElement {
    const key = size.toFixed(1) + color;
    const cached = sprites.get(key);
    if (cached) return cached;
    const glow = size > 0.9 ? size * 5 : size * 2.4;
    const dim = Math.max(2, Math.ceil(glow * 2 * dpr));
    const s = document.createElement("canvas");
    s.width = s.height = dim;
    const c = s.getContext("2d");
    if (!c) return s;
    const cx = dim / 2;
    if (size > 0.9) {
      const g = c.createRadialGradient(cx, cx, 0, cx, cx, glow * dpr);
      g.addColorStop(0, "rgba(255,255,255,0.5)");
      g.addColorStop(0.35, "rgba(255,255,255,0.12)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = g;
      c.fillRect(0, 0, dim, dim);
    }
    c.fillStyle = color;
    c.beginPath();
    c.arc(cx, cx, size * dpr, 0, 7);
    c.fill();
    sprites.set(key, s);
    return s;
  }

  function build(): void {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth;
    H = innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sprites.clear();
    stars = generateStars(W, H, { areaDivisor: divisor });
    twinklers = reduced ? [] : stars.filter((s) => s.tw === 1);
    buildStatic();
    shooting = null;
    nextShoot = performance.now() + rand(5000, 12000);
  }

  function buildStatic(): void {
    staticCanvas = document.createElement("canvas");
    staticCanvas.width = W * dpr;
    staticCanvas.height = H * dpr;
    const c = staticCanvas.getContext("2d");
    if (!c) return;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const n of NEBULAE) {
      const g = c.createRadialGradient(
        n.x * W,
        n.y * H,
        0,
        n.x * W,
        n.y * H,
        n.r * Math.max(W, H)
      );
      g.addColorStop(0, `rgba(${n.c[0]},${n.c[1]},${n.c[2]},0.045)`);
      g.addColorStop(1, `rgba(${n.c[0]},${n.c[1]},${n.c[2]},0)`);
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
    }
    // Milky Way band: a faint diagonal light gradient.
    c.save();
    c.translate(W / 2, H / 2);
    c.rotate((-20 * Math.PI) / 180);
    const bw = Math.max(W, H) * 0.22;
    const diag = Math.hypot(W, H);
    const g2 = c.createLinearGradient(0, -bw, 0, bw);
    g2.addColorStop(0, "rgba(210,205,190,0)");
    g2.addColorStop(0.5, "rgba(212,206,192,0.06)");
    g2.addColorStop(1, "rgba(210,205,190,0)");
    c.fillStyle = g2;
    c.fillRect(-diag, -bw, diag * 2, bw * 2);
    c.restore();
    // Static (non-twinkling) stars baked into the layer.
    for (const s of stars) {
      if (s.tw === 1 && !reduced) continue;
      const sp = spriteFor(s.size, s.color);
      const w = sp.width / dpr;
      const h = sp.height / dpr;
      c.globalAlpha = Math.min(1, s.op);
      c.drawImage(sp, s.x - w / 2, s.y - h / 2, w, h);
    }
    c.globalAlpha = 1;
    // Diffraction spikes on the brightest stars.
    for (const s of stars) {
      if (s.size < 1.85) continue;
      const len = s.size * 4 + 5;
      for (const a of [0.785, 2.356, 3.927, 5.498]) {
        const ex = s.x + Math.cos(a) * len;
        const ey = s.y + Math.sin(a) * len;
        const g = c.createLinearGradient(s.x, s.y, ex, ey);
        g.addColorStop(0, `rgba(255,255,255,${s.op * 0.45})`);
        g.addColorStop(1, "rgba(255,255,255,0)");
        c.strokeStyle = g;
        c.lineWidth = 0.6;
        c.beginPath();
        c.moveTo(s.x, s.y);
        c.lineTo(ex, ey);
        c.stroke();
      }
    }
  }

  function frame(now: number): void {
    const t = now / 1000;
    ctx.clearRect(0, 0, W, H);
    if (staticCanvas) ctx.drawImage(staticCanvas, 0, 0, W, H);
    for (const s of twinklers) {
      const tw =
        0.6 * Math.sin(t * s.sp + s.ph) +
        0.4 * Math.sin(t * s.sp * 1.618 + s.ph * 0.7);
      const op = s.op + tw * 0.22;
      if (op <= 0) continue;
      const sp = spriteFor(s.size, s.color);
      const w = sp.width / dpr;
      const h = sp.height / dpr;
      ctx.globalAlpha = Math.max(0, Math.min(1, op));
      ctx.drawImage(sp, s.x - w / 2, s.y - h / 2, w, h);
    }
    ctx.globalAlpha = 1;
    if (!shooting && now > nextShoot) {
      const left = Math.random() < 0.5;
      shooting = {
        x: left ? -40 : W + 40,
        y: rand(0, H * 0.5),
        vx: (left ? 1 : -1) * rand(430, 620),
        vy: rand(120, 240),
        life: 0,
        max: rand(0.7, 1.1),
      };
    }
    if (shooting) {
      shooting.life += 1 / 60;
      const p = shooting.life / shooting.max;
      const a = Math.max(0, 1 - p * 1.3);
      const tx = shooting.x - shooting.vx * 0.06;
      const ty = shooting.y - shooting.vy * 0.06;
      const g = ctx.createLinearGradient(shooting.x, shooting.y, tx, ty);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(0.3, `rgba(255,240,200,${a * 0.6})`);
      g.addColorStop(1, "rgba(255,220,150,0)");
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(shooting.x, shooting.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      shooting.x += shooting.vx / 60;
      shooting.y += shooting.vy / 60;
      if (p >= 1) {
        shooting = null;
        nextShoot = now + rand(9000, 22000);
      }
    }
    raf = requestAnimationFrame(frame);
  }

  const start = (): void => {
    if (!raf && !reduced) raf = requestAnimationFrame(frame);
  };
  const stop = (): void => {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };

  build();
  if (reduced) {
    // Reduced-motion: render exactly ONE static frame, never loop.
    if (staticCanvas) ctx.drawImage(staticCanvas, 0, 0, W, H);
  } else {
    start();
  }

  let rz: ReturnType<typeof setTimeout> | undefined;
  const onResize = (): void => {
    clearTimeout(rz);
    rz = setTimeout(() => {
      stop();
      build();
      if (reduced) {
        if (staticCanvas) ctx.drawImage(staticCanvas, 0, 0, W, H);
      } else {
        start();
      }
    }, 200);
  };
  const onVisibility = (): void => {
    // Pause the loop while the tab is hidden; resume on return.
    if (document.hidden) stop();
    else start();
  };

  addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", onVisibility);

  return {
    destroy(): void {
      stop();
      clearTimeout(rz);
      removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}

/** A shooting star in flight (per-frame, not part of the baked layer). */
interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
}
