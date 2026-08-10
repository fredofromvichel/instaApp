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

- ❌ Not a design tool that starts from a blank canvas — the user always starts
  from a finished template (she may then move things freely inside it, §4).
- ❌ No Instagram API integration — the app never talks to Instagram.
- ❌ No accounts, no login, no backend, no server-side storage.
- ❌ No photo collages — exactly one photo slot per template.
- ❌ No English UI (German only).

## 3. Core user flow (wizard)

One primary action per screen. Big touch targets (≥ 44 px). Informal German
("du" form) everywhere. Steps:

1. **Format wählen** — visual cards: Quadrat (1080×1080), Hochformat
   (1080×1350), Story (1080×1920).
2. **Inhalte ausfüllen** — the photo and the four universal text fields, plus
   optional QR link and logo. No template is chosen yet.
3. **Vorlage wählen** — one flat grid of all templates, each previewed **with
   the content just entered**, so designs are compared against real words.
4. **Anpassen** — palettes, style variant, text formatting, free placement,
   photo crop, and any extra fields the chosen template adds.
5. **Herunterladen** — full-resolution PNG to the phone.

**Content before template** is the load-bearing decision: the fields are the
same for every template, so switching templates never loses anything and the
user can browse all designs to find where her post looks best. Back/forward
navigation never loses state. Work in progress is autosaved on-device.

## 4. Editor model: universal content in guarded templates

### The four universal fields

Every template maps the same content onto its own design:

| Field | Reading | Slot id |
|-------|---------|---------|
| Überschrift 1 | the headline | `title1` |
| Beschreibungstext 1 | the main paragraph | `text1` |
| Überschrift 2 | short second heading (price, date, name) | `title2` |
| Beschreibungstext 2 | the secondary line/paragraph | `text2` |

All four are optional; empty fields collapse. On two-page templates
**everything numbered "2" belongs to the second image** — the one rule the user
has to learn. A template may add **extra fields** (text slots whose ids are not
universal, e.g. the Steckbrief's `dog:age`); they appear in "Anpassen" once
that template is chosen.

### What the user may do to a slot

| Slot type | User can | User cannot |
|-----------|----------|-------------|
| Photo (exactly 1) | pick it (picker or clipboard), place/resize its box, pan/pinch-crop inside it, shrink it below its box (gap fills with a blurred copy) | — |
| Text | edit content; place/resize freely; bold, italic, one of four fonts | choose arbitrary fonts/colors, lose an element off-canvas |
| QR (optional) | paste a URL; place/resize (never below 0.7 — scannability) | style it beyond black-on-white |
| Logo (optional) | supply logo from brand kit; place/resize freely | — |
| Decor/background | switch curated palette and style variant | move or edit shapes |

**Guardrails** are now about *keeping things usable*, not about keeping things
in place: placement is free (out of the frame, over other elements, hanging
over the image edge), and the only hard rule is that at least `MIN_ON_CANVAS`
(35 %) of an element stays on the canvas, so nothing can be lost. Size stays
within a per-slot range. Undo, per-element reset and whole-design reset are
always one tap away.

**Colors:** one curated palette set shared by all templates (so the choice
survives a template switch), plus colors from the user's brand kit. No free
color picker.

## 5. Templates

Eight templates, one flat list, no categories — with this few, a single grid is
faster to scan than any grouping. Each exists in all three formats and ships
with German example content so previews look finished.

| Template | Look |
|----------|------|
| Klassik | photo on top, text on a white card |
| Vollbild | full-bleed photo, text on a scrim over it |
| Galerie | photo in a passe-partout, centered serif title |
| Notiz | text card for tips, opening hours, notices |
| Zitat | text only, large — works with no photo at all |
| Steckbrief | the shelter-dog CV (extra fields: Alter, Rasse, Geschlecht, Charakter) |
| Panorama (2 Bilder) | one photo continuing across both swipe images |
| Doppel-Post (2 Bilder) | photo page + a text-only second page |

The **Hunde-Steckbrief** stays the signature feature: warm and professional,
photo as hero, `title1` as the name, the fact columns as extra fields, `text1`
as the "Über mich" story. Layout adapts gracefully to missing fields.

## 6. Features

### QR codes
Instagram post images have no clickable links — QR codes are the link
mechanism. Paste a URL → client-side generated QR placed into the template's QR
slot. High error correction, enforced dark-on-light contrast, quiet zone,
optional caption. Empty URL = slot hidden, layout adapts.

### Text formatting
Per text field: **fett**, **kursiv**, and one of four self-hosted families —
Modern (Outfit), Elegant (Fraunces), Kräftig (Archivo), Handschrift (Caveat) —
or "Vorlage" to keep whatever the template chose (the default). Four moods, not
a font list: every one of them works in every template. Formatting is part of
the content (it travels with the field across template switches) and is applied
to the example text too, so the effect is visible before anything is typed.

### Brand kit ("Mein Stil")
Logo upload (transparency supported) + favorite colors. Stored on-device.
Logo auto-offered for logo slots; saved colors appear as extra palettes.

### Drafts ("Entwürfe")
Autosave of the full working state (template, inputs, photo, adjustments) in
IndexedDB, including photo blobs. List with thumbnails; reopen/copy/delete;
cap at ~10 drafts; friendly notice when storage is full. Clear German note
that data lives only on this phone. "Als Kopie öffnen" duplicates a draft and
opens the copy — recurring posts (weekly offers) are edited without touching
the original.

### Export
Exact-resolution PNG (1080×1080 / 1080×1350 / 1080×1920), identical to the
preview. Save via Web Share API (share sheet → photo apps) where available;
download fallback with per-platform German instructions. Sensible file names.
After a successful save, the same post can be exported in the other two
formats in one tap ("Gleicher Post, anderes Format") — same content, palette
and clamped adjustments, re-rendered at the other format's exact resolution.

### Carousel templates ("2 Bilder")
A template may export **multiple swipeable images** (Instagram carousel).
Slot frames then live in an N× wide coordinate space and each exported image
is one 1080-wide window into it, so a panorama photo (e.g. a very long dog)
and background gradients continue seamlessly across the swipe. Preview shows
all slides side by side; export saves/shares one PNG per slide, numbered in
swipe order. The guardrail model is unchanged: slots may declare guardrails
as usual and the Anpassen step maps taps/outlines across the per-slide
preview canvases; photo pan/zoom works as everywhere. Two flavors ship:
a photo continuing across the swipe ("Panorama") and a text-only second page
("Doppel-Post") for posts that need room rather than a second picture.

## 7. Technical constraints

- **Pure static build** — deployable to free static hosting (GitHub Pages /
  Netlify / Vercel). No server code anywhere.
- Everything client-side: rendering (HTML canvas), QR generation, image
  processing, persistence (localStorage/IndexedDB).
- Photos: handle HEIC/large images, EXIF orientation; keep enough resolution
  for 1080-wide export; preview and export must render identically. A photo may
  come from the file picker (gallery/camera) or from the clipboard.
- Fonts: four quality open-source variable fonts, self-hosted (§6).
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
- **Size buttons:** the Anpassen step offers "− Kleiner / + Größer" buttons
  for the selected element as an easier alternative to two-finger pinch; both
  paths go through the same `clampAdjustment` guardrails. Text size scales the
  auto-fit font range (and badge padding) with the frame, so "Größer" genuinely
  enlarges text instead of stopping at the template's maxSize.
- **Guardrail presets** (`TEXT_RAILS`, `QR_RAILS`, `LOGO_RAILS`, `PHOTO_RAILS`
  in `src/templates/shared.ts`) now only bound *size*; movement is bounded by
  the canvas alone (§4). `movable: false` (the default, `LOCKED`) marks
  template decoration — backgrounds, panels, rules — which stays put because it
  *is* the template.
- **Schema extension `variants`:** a template may declare curated style
  variants ("Stil" toggle in Anpassen): per-slot decorative overrides
  (cornerRadius, fill, hidden) that never change layout or guardrails. The
  first variant is the default; the choice persists in drafts.
- **Schema extension `badge.opacity`:** text badges may declare a fill
  opacity (text stays opaque) — used for overlay chips on photos, e.g. the
  carousel swipe hint.
- **Photo zoom below cover fit + blurred backdrop:** the photo crop allows
  `zoom < 1` (down to `MIN_ZOOM`), so a photo may be made *smaller* than its
  slot and slid to any edge — the whole subject fits even when the slot's
  aspect ratio doesn't match. The renderer fills the resulting gap with a
  blurred, cover-scaled copy of the same photo (the trick video players use
  for videos that don't fit their box), so the result never shows raw
  whitespace and never needs a color decision. Guardrails are unchanged:
  offsets stay in -1..1, which now means "never uncovers the frame" when
  zoomed in and "never leaves the frame" when zoomed out.
- **Photo zoom buttons:** "Inhalte" offers "− Kleiner / + Größer" next to the
  pinch gesture — the same reasoning as the Anpassen size buttons, and the
  only discoverable way to find the below-100 % range on a phone.
- **Photos from the clipboard:** "📋 Bild aus Zwischenablage" reads an image
  via `navigator.clipboard.read()` (the browser asks the user first), and a
  `paste` listener accepts images pasted with a keyboard or iOS's "Einfügen".
  Both feed the same decode path as the file picker; a pasted *text* is left
  to the text fields.
- **Schema extension `slides`:** carousel templates declare
  `slides: N`; the engine renders slide k by shifting the N×-wide slot space
  by k·width (see §6 "Carousel templates"). `onPage2()` in
  `src/templates/shared.ts` shifts a frame set onto the second page.
- **Universal content fields:** the biggest revision of the original model.
  Content used to be per-template (each template had its own labelled fields),
  which made 16 templates feel like 16 different forms and made switching
  templates lossy. Text slots now carry the universal ids `title1`/`text1`/
  `title2`/`text2` (§4), the form lives *before* the template step, and the
  template picker previews every design with the real content. Ids that are
  not universal are template extras and are edited in "Anpassen".
- **One palette set, no categories:** palettes moved from per-template lists to
  `src/templates/palettes.ts` so a palette choice survives a template switch;
  category tabs were dropped when the catalog shrank from 16 to 8 templates.
- **Free placement instead of nudging:** `clampAdjustment` no longer caps
  offsets per slot. It takes the slot frame and the canvas and only guarantees
  `MIN_ON_CANVAS` of the element stays visible. This is a deliberate departure
  from the original "impossible to break a layout" rule (§4): the user asked
  for real freedom, and the safety net is now "nothing can be lost" plus undo
  and reset, not "nothing can be moved".
- **Text formatting stored with the value:** `TextValue` carries `bold`,
  `italic` and `font`, so formatting travels with the content across template
  switches and through drafts. A value may hold formatting while its text is
  empty — the renderer treats that as "not filled in" and falls back to the
  example, so styling an empty field never blanks the design.
- **Photo box is placeable:** the photo slot itself declares `PHOTO_RAILS`, so
  the frame can be moved/resized like any other element. Its *content* is a
  separate concern: "Anpassen" offers a "Rahmen bewegen / Bildausschnitt"
  toggle, where the crop path uses the existing `panCrop`/`zoomCrop`.

## 10. Task map

Implementation is broken into tasks 01–15 on the Vibe Kanban board
(project "instaApp"). Key dependency: task 03 (template schema + render
engine) is the keystone; template sets (10–12) and feature tasks (05–09, 13)
build on it and are independent of each other.
