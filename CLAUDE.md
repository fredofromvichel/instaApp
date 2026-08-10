# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A German-language, mobile-first, **pure static** web app that lets a computer
beginner design professional Instagram post images (products/offers, quotes/
tips, shelter-dog CVs) on her smartphone and download them as PNGs.

**Read `SPEC.md` first — it is the single source of truth** for product
decisions (wizard flow, template model, guardrails, formats, persistence,
constraints). Do not re-litigate decisions recorded there; if implementation
must diverge, update SPEC.md in the same change.

## Ground rules

- **No backend.** Everything runs client-side; the build must remain
  deployable as plain static files.
- **UI language is German only**, informal "du" form. Code, comments, and
  docs for developers are English.
- **Template-first, never free-canvas.** New features must respect the
  guardrail model in SPEC.md §4.
- Mobile-first: touch targets ≥ 44 px, one primary action per screen; target
  browsers are iOS Safari and Android Chrome.
- Preview and PNG export must render identically (same engine, exact
  1080-based resolutions).

## Task workflow

Work is organized as tasks 01–15 on the Vibe Kanban board (project
"instaApp"). Each task description is self-contained, lists its dependencies,
and ends with a model/thinking recommendation. Task 03 (template schema +
render engine) is the keystone — consult its schema before building anything
that touches templates.

## Stack & commands

Vite 8 + React 19 + TypeScript (strict) · Biome (lint + format) · Vitest.
`vite.config.ts` uses `base: "./"` so the build works on any static host or
subpath — keep it that way.

```sh
npm run dev        # dev server
npm run build      # type-check (tsc -b) + production build to dist/
npm run preview    # serve the production build locally
npm run lint       # biome check .
npm run lint:fix   # biome check --write .
npm test           # run all tests once (vitest run)
npm run test:watch # watch mode
```

Run a single test file: `npx vitest run src/lib/formats.test.ts`
Run tests matching a name: `npx vitest run -t "German labels"`

CI (`.github/workflows/deploy.yml`) runs lint + test + build and deploys
`dist/` to GitHub Pages on every push to `main`.

## Architecture: the render engine (task 03)

`src/engine/` is the keystone everything builds on. Three separate inputs
feed one pure render path:

- **Template** (`src/engine/types.ts`, instances in `src/templates/`):
  declarative design — slots with explicit per-format frames
  (square/portrait/story, 1080-based pixels), palettes referenced by
  semantic color roles, guardrails per slot. Draw order = slot array order.
- **Values**: user content keyed by slot id (text / photo+crop / qr / logo
  images). Text slots use the four universal ids `title1`/`text1`/`title2`/
  `text2` (SPEC.md §4) so content survives switching templates; a `TextValue`
  also carries its own bold/italic/font. Empty or missing text falls back to
  the slot's German `example`.
- **Adjustments**: the user's placement, always clamped through
  `clampAdjustment` — free inside the canvas, guaranteeing only that
  `MIN_ON_CANVAS` of the element stays visible. Decoration is `LOCKED`.

Rules that must not be broken:

- Preview and export share `renderPost` at full target resolution; previews
  are scaled with CSS only. Never render at preview resolution.
- All interaction math (cover-crop panning, adjustment clamping, text
  auto-fit) lives in the pure modules `src/engine/geometry.ts` /
  `src/engine/text.ts` with injected measurement — keep them
  canvas-free and unit-tested; gestures (tasks 05/08) must reuse them.
- Text can never overflow a frame: `autoFitText` shrinks within the font's
  min/max and truncates with an ellipsis + `overflow` flag at worst.
- The wizard is **content first, template second** — anything that assumes a
  template exists while editing content is a bug.
- Slots never hold concrete colors — only `ColorRole` references into the
  active palette.
