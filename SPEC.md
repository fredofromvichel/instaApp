# Insta-Studio — Product Specification

> Working title. A friendlier German name can be chosen before launch (task 15).
> This document is the single source of truth for all implementation tasks.
> If implementation diverges from this spec, update the spec (see task 15).

## 1. What this is

A **German-language, mobile-first web app** that lets a person with no computer
skills design professional-looking Instagram post images on her smartphone.

The guiding principle: **remove choices instead of adding features.** The user
never designs from scratch — she fills in professionally pre-designed templates.
Layout, spacing, and typography stay professional because she cannot break them.

- **Primary user:** one specific person (computer beginner, smartphone only).
- **Secondary goal:** keep templates and structure generic enough that other
  people could use the tool later. No feature may be tailored so narrowly that
  it only works for the primary user.

## 2. What it is not

- ❌ Not a free-form design tool (no Canva-style canvas).
- ❌ No Instagram API integration — the app never talks to Instagram.
- ❌ No accounts, no login, no backend, no server-side storage.
- ❌ No photo collages — exactly one photo slot per template.
- ❌ No English UI (German only).

## 3. Core user flow (wizard)

One primary action per screen. Big touch targets (≥ 44 px). Informal German
("du" form) everywhere. Steps:

1. **Format wählen** — visual cards: Quadrat (1080×1080), Hochformat
   (1080×1350), Story (1080×1920).
2. **Vorlage wählen** — category tabs with template preview thumbnails.
3. **Inhalte ausfüllen** — photo, texts, optional QR link, optional logo.
4. **Anpassen** — curated color palettes; light repositioning within guardrails.
5. **Herunterladen** — full-resolution PNG to the phone.

Back/forward navigation never loses state. Work in progress is autosaved
on-device.

## 4. Editor model: template-first with guardrails

A template defines **slots**; the user can only fill and lightly adjust them:

| Slot type | User can | User cannot |
|-----------|----------|-------------|
| Photo (exactly 1) | pick photo, pan/pinch-crop within the slot | move/resize the slot freely |
| Text | edit content; nudge/resize within template-defined limits | choose fonts, break layout, drag off-canvas |
| QR (optional) | paste a URL; nudge/resize within limits | style it beyond palette-derived colors |
| Logo (optional) | supply logo from brand kit; nudge/resize within limits | — |
| Decor/background | switch curated palette | edit shapes |

**Guardrails** (defined per slot in the template schema): allowed offset range,
min/max scale, legibility minimums. It must be *impossible* to produce a broken
or ugly layout by dragging. Per-element and whole-design reset ("Zurücksetzen").

**Colors:** only curated palettes shipped with each template, plus colors from
the user's brand kit. No free color picker.

## 5. Template categories

Each template exists in all three formats and ships with German example content
so previews look finished.

### a) Produkte & Angebote
Hero photo, product name, prominent price/offer element, short description,
optional QR (shop/website), optional logo.

### b) Zitate, Tipps & Infoposts
Text-first. Big quote/headline, optional author/sub-line, generated backgrounds
(gradients/patterns — must look great with zero uploads), optional QR and logo.

### c) Hunde-Steckbriefe (shelter-dog CVs) — signature feature
Warm, emotional, professional; the dog's photo is the hero.
Input is a **mix of fixed form fields and free text**:

- Fixed fields: **Name, Alter, Rasse, Geschlecht, Charakter** (short tags).
- Free text: one story area ("Über mich" / "Ich suche…").
- Optional QR → adoption page or contact link.
- No fixed shelter organization: neutral warm default design with an optional
  logo slot (any logo from the brand kit).
- Layout must adapt gracefully to missing fields; empty slots collapse.

## 6. Features

### QR codes
Instagram post images have no clickable links — QR codes are the link
mechanism. Paste a URL → client-side generated QR placed into the template's QR
slot. High error correction, enforced dark-on-light contrast, quiet zone,
optional caption. Empty URL = slot hidden, layout adapts.

### Brand kit ("Mein Stil")
Logo upload (transparency supported) + favorite colors. Stored on-device.
Logo auto-offered for logo slots; saved colors appear as extra palettes.

### Drafts ("Entwürfe")
Autosave of the full working state (template, inputs, photo, adjustments) in
IndexedDB, including photo blobs. List with thumbnails; reopen/delete; cap at
~10 drafts; friendly notice when storage is full. Clear German note that data
lives only on this phone.

### Export
Exact-resolution PNG (1080×1080 / 1080×1350 / 1080×1920), identical to the
preview. Save via Web Share API (share sheet → photo apps) where available;
download fallback with per-platform German instructions. Sensible file names.

## 7. Technical constraints

- **Pure static build** — deployable to free static hosting (GitHub Pages /
  Netlify / Vercel). No server code anywhere.
- Everything client-side: rendering (HTML canvas), QR generation, image
  processing, persistence (localStorage/IndexedDB).
- Photos: handle HEIC/large images, EXIF orientation; keep enough resolution
  for 1080-wide export; preview and export must render identically.
- Fonts: 1–2 quality open-source fonts, self-hosted.
- PWA: installable to home screen, works offline after first load.
- Target browsers: iOS Safari and Android Chrome (current versions).
- `html lang="de"`; all UI strings German, informal "du".

## 8. Quality bar

- Templates must look **Instagram-worthy**: real typographic hierarchy,
  generous whitespace, no clip-art aesthetics.
- Long or short real-world text never breaks a layout (auto-fit + limits).
- Exported QR codes must scan reliably from a phone screen.
- The whole flow must be completable one-handed on a phone by a first-time
  user without instructions.

## 9. Implementation notes (where reality refined the spec)

- **QR styling:** always near-black modules on white (not palette-derived) —
  maximum scannability beats color matching; §6's contrast requirement is
  thereby trivially guaranteed.
- **Schema extensions** beyond §4: `scrim` fills (photo-overlay gradients),
  `fixed` decorative text slots (captions/eyebrows that never appear in the
  form), and `showWith` (captions collapse together with their companion
  slot — keeps sparse dog CVs looking intentional).
- **Dog character tags:** rendered as one accent-colored line separated by
  "·" (one input field), not individual chip elements.
- **Onboarding:** one friendly sheet with three steps instead of multiple
  screens — fewer taps, same message.
- **Brand palettes:** a saved brand color becomes the template's default
  palette with accent + contrast-safe text-on-accent swapped in.

## 10. Task map

Implementation is broken into tasks 01–15 on the Vibe Kanban board
(project "instaApp"). Key dependency: task 03 (template schema + render
engine) is the keystone; template sets (10–12) and feature tasks (05–09, 13)
build on it and are independent of each other.
