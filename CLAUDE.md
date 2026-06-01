# CLAUDE.md — Metabolica standing rules

Read automatically each session. This is the repo-checked-in half of the rules;
machine-private Claude memory holds the rest (owner profile, reply format). The
owner **is a programmer** — use precise technical language, terminal-first, no
hand-holding.

> This file was seeded from another project's "AI Handoff" template. Only the
> rules below actually apply to Metabolica — the template's stack (npm/Vite/Zod/
> TypeScript/`ud.csv`) does **not**; this project has no build step.

---

## A. How every reply should look

- After the full answer, add a short **Summary** of only what the owner needs.
- Then, on its own line in ALL CAPS, the single most burning thing — 2–10 words.
- End with a checkbox list of unfinished/pending tasks, each prefixed with a
  one-word ALL-CAPS code `<who><priority>`: `- [ ] U1 task`. `who` = `U` (owner
  asked) or `C` (Claude proposed); `priority` = `1` high / `2` medium / `3` low.
  Omit the list only when nothing is pending.
- Links go at the very bottom of the message only — never inline.
- Annotate any command you offer with a 1–3 word description, e.g.
  `node tests/domain.test.js — run tests`.

## B. Versioning & commits

- Commit subjects: `vX.Y.Z[.D] <2-5 word summary>`, single line. e.g.
  `v0.1.4 Fix chart height`.
- SemVer + a 4th "tweak" digit `A.B.C.D` = major.minor.patch.tweak:
  - **D** for tiny edits (text/colour/one-liner) — 4-segment, `v0.1.4.1`.
  - **C** for a normal self-contained feature/fix — 3-segment, `v0.1.5`.
  - **B**/**A** for substantial/major work; detail in the commit body.
- **On-screen version lockstep:** the `.brand .version` span exists in
  `index.html`, `guide.html`, and `methodology.html`, plus the `<title>` in
  `index.html`. Update all of them to the new version in the same commit, or they
  drift (they have).
- Commit completed work promptly. Parallel AI sessions and worktrees
  (see `PARALLEL-AI-WORKFLOW.md`) can reset/clobber the tree — don't leave
  finished work uncommitted across a hand-off.

## C. How to make changes safely

- **No build step.** The edited `.html`/`.js` files are the shipped artifact —
  there is no `dist/`, no bundler, no `package.json`.
- **Renames are project-wide.** Grep the entire repo (all three HTML pages,
  `domain.js`, `seed-adomas.js`, docs) and update every occurrence.
- **Keep correctness logic in `domain.js`** — pure functions, no DOM, no storage.
  It is dual-loaded: `window.Domain` in the browser and `require()`-able in Node
  for tests. Policy is **fail-soft**: validate at the boundary, reject bad rows,
  report the count, never throw and never silently coerce.
- **Run the tests before calling a change done:** `node tests/domain.test.js`
  (no framework, no build; non-zero exit on failure).
- **Concurrent AI sessions edit this repo** and can only talk through files/git.
  Leave short `AI-NOTE (Claude):` comments for anything that must survive another
  AI's edits. Prefer one-AI-per-file and let a commit land between hand-offs. If
  the working tree contains changes you didn't make, flag them — don't fold them
  into your commit.
- **Duplicated constants to keep in sync:** the `USERS` roster is the single
  source of truth in `index.html` and is copied into `guide.html` and
  `methodology.html` so their header reflects the same picked user. Changing the
  roster means updating all three (or extracting a shared `app.js`).

## D. Product rules

- Client-side only, data stored in the browser; each user gets isolated data
  keyed by their roster `id`. No passwords yet — you tap a profile to select it
  (`role: 'admin'` gates admin-only features via `Auth.isAdmin()`).
- Storage split: **localStorage** for small data (weight log, profile,
  active user, checklist); **IndexedDB** for large data (meals with photos,
  admin imports). Photos are downsized + JPEG-compressed before saving.
- **No canned/fake summary text in the UI.** Show only values computed live from
  the data. A real in-app AI summarizer can come later; until then, don't fake it.

## E. Data & seed

- `seed-adomas.js` is generated from `data/Libra_*.csv` (a Libra Weight Manager
  export). Regenerating the seed shouldn't require code changes.
- Bad rows are caught at the `domain.js` boundary and surfaced as sanity flags in
  the UI, never silently coerced.

## F. Project at a glance

- **Metabolica** — a weight + diet tracker with a PSMF (protein-sparing modified
  fast) prep guide. Three pages:
  - `index.html` — the tracker SPA (Chart / Logs / Diet / Users views, modals).
  - `guide.html` — PSMF preparation checklist + expandable guidance sections.
  - `methodology.html` — the deficit/timeline calculator and rationale.
- **Stack:** plain HTML + vanilla JS, no framework, no build. Chart.js via CDN
  for the weight chart. `domain.js` is the durable, unit-tested spec.

## G. Working agreements

- The owner works directly on `main`; commit there when work is complete. Don't
  open a PR unless asked.
- To add a standing rule, the owner says "remember: …" → append it here (repo
  rules) or to Claude memory (owner/behavioral facts). Keep the two in sync.
