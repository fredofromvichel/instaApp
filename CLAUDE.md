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

Not yet scaffolded — defined by task 02. When task 02 lands, document here:
the chosen stack, and the `dev` / `build` / `preview` / `lint` / `test`
commands (including how to run a single test).
