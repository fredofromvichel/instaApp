# Insta-Studio

A German-language, mobile-first web app that lets a computer beginner design
professional Instagram post images (products & offers, quotes & tips, shelter
dog CVs) on her smartphone — template-first, no design skills needed, finished
PNG straight to the photo library.

**Product spec:** [SPEC.md](SPEC.md) · **Guidance for AI agents:** [CLAUDE.md](CLAUDE.md) · **End-user guide (German):** [ANLEITUNG.md](ANLEITUNG.md)

## Stack

- Vite + React + TypeScript (strict), pure static build — no backend
- Canvas render engine (`src/engine/`) drawing at exact Instagram resolutions
  (1080×1080 / 1080×1350 / 1080×1920); preview and PNG export share one code path
- Self-hosted fonts (Fontsource: Outfit Variable, Fraunces Variable)
- IndexedDB for on-device drafts + brand kit; PWA (offline after first load)
- Biome (lint/format), Vitest (tests)

## Commands

```sh
npm install
npm run dev        # dev server (dev-only deep links: /?step=content&format=square&template=hund-steckbrief)
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build
npm run lint       # biome check .
npm test           # vitest run
```

## Deployment (GitHub Pages)

The repo ships a workflow (`.github/workflows/deploy.yml`) that lints, tests,
builds, and deploys `dist/` to GitHub Pages on every push to `main`.

One-time setup:

1. Create a GitHub repository and push this repo to it.
2. In the repo settings: **Settings → Pages → Build and deployment → Source:
   GitHub Actions**.
3. Push to `main` (or run the workflow manually). The app appears at
   `https://<user>.github.io/<repo>/`.

The build uses relative asset paths (`base: "./"`), so it also works on
Netlify/Vercel or any static file host without changes.

## Adding a new template

Templates are declarative data — no rendering code needed:

1. Read the schema in `src/engine/types.ts` (`Template`, `Slot`, `Palette`).
   Key ideas: every slot has explicit per-format `frames` (1080-based pixels);
   colors are semantic roles resolved through palettes; `guardrails` bound the
   user's repositioning; `fixed` text slots render decorative captions;
   `showWith` collapses captions with their companion slot.
2. Add the template to the matching set in `src/templates/`
   (`products.ts`, `quotes.ts`, `dogs.ts`) — or start a new file and register
   it in `src/templates/catalog.ts`.
3. Conventions: photo slot id `photo`, QR slot id `qr`, logo slot id `logo`
   (the editing UI and brand-kit auto-offer key off these ids).
4. Provide German `example` content for every text slot and 3–5 palettes —
   catalog thumbnails render examples via `previewExamples`.
5. Check it in the dev server in all three formats:
   `/?step=download&format=story&template=<id>` etc.

## Repository layout

```
src/engine/     schema types, geometry/text math (pure, tested), canvas renderer, PNG export
src/templates/  template sets + catalog registry
src/state/      wizard reducer/context, brand kit context
src/steps/      the five wizard screens
src/components/ preview canvas, form fields, drafts, brand sheet, onboarding
src/lib/        photo loading, gestures, QR, persistence (IndexedDB), autosave
```
