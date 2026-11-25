# Sunglasses Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the public Sunglasses storefront for the real `HOE-S-*` inventory, with All, Women, Men, and Kids browsing plus accurate prescription guidance.

**Architecture:** Keep Central as the sole inventory source and consume its existing `sun` chunk through `window.hoeCatalog`. A new page-specific controller renders and filters the shared frame cards, while a new dictionary and stylesheet avoid changing cached shared assets.

**Tech Stack:** Static HTML, vanilla JavaScript, CSS, Python build pipeline, Playwright browser checks.

**Spec:** `docs/superpowers/specs/2026-11-22-sunglasses-catalog-design.md`

## Global Constraints

- Do not mutate Central inventory, SKUs, prices, stock, or gender data.
- Do not duplicate sunglasses into optical category chunks.
- Women and Men views include unisex products; Kids includes only kids.
- English HTML and its generated Spanish twin must both be complete.
- New page-specific assets must work without changing existing cached files.
- Empty/unavailable `sun` data must explain publishing status without throwing.

## Review Focus

- Empty or failed `sun` chunk shows a useful state and no console error.
- Fewer than 12 records still render without duplicates or broken counts.
- Unisex records appear in Women and Men without hiding exact-gender records.
- Language switching updates controls, copy, title, and count labels.
- 375px and iPhone layouts have no horizontal overflow.

---

### Task 1: Sunglasses browser contract

**Files:**
- Create: `tools/check_sunglasses_page.js`
- Test: `tools/check_sunglasses_page.js`

**Interfaces:**
- Consumes: `sunglasses.html`, `window.hoeCatalog`, `window.hoeFrameCard`
- Produces: an executable browser regression check for the storefront contract

- [x] **Step 1: Write the failing browser test**

Use Playwright routes for a literal manifest and a literal `sun` fixture with
women, men, kids, and unisex records. Assert 12 balanced cards by default,
audience filtering, exact catalog URLs, empty state, EN/ES, and no overflow.

- [x] **Step 2: Run the test to verify it fails**

Run: `node tools/check_sunglasses_page.js http://127.0.0.1:8771`

Expected: FAIL because the current page has no sunglasses filter or `sun`
chunk-driven grid.

### Task 2: Page-specific storefront

**Files:**
- Create: `js/pages/sunglasses.js`
- Create: `css/pages/sunglasses.css`
- Create: `js/i18n/sunglasses.js`
- Modify: `src/pages/sunglasses.html`

**Interfaces:**
- Consumes: `hoeCatalog.chunk('sun')`, `hoeFrameCard(record)`, `hoeT(key)`
- Produces: audience buttons, counts, a 12-card grid, updated catalog link, and publishing empty state

- [x] **Step 1: Implement the minimal controller**

Load `sun` once. Expose All, Women, Men, and Kids views. Balance All across
exact women, exact men, kids, and unisex; prioritize exact-gender records in
Women/Men before adding unisex. Update `aria-pressed`, counts, cards, and the
catalog URL on every selection.

- [x] **Step 2: Add the page-specific copy and styles**

Override only `tp.sun.*` plus new `sun.shop.*` keys in the new dictionary.
Keep the existing visual tokens, keyboard focus, reduced-motion behavior, and
shared grid breakpoints.

- [x] **Step 3: Restructure the source page**

Put the real storefront directly below the hero, move prescription education
below it, and remove claims that ready-made or non-prescription sunglasses are
unavailable.

- [x] **Step 4: Build and run the focused test**

Run: `python3 build.py`

Run: `node tools/check_sunglasses_page.js http://127.0.0.1:8771`

Expected: build exits 0 and the focused test prints `TODO OK`.

### Task 3: Regression and visual verification

**Files:**
- Modify only if a verified regression requires it: files from Task 2

**Interfaces:**
- Consumes: built site in `PUBLICAR/site-repo`
- Produces: evidence that the storefront works at desktop and phone sizes

- [x] **Step 1: Run existing relevant checks**

Run the existing lens-page and build checks against the local served site.
Expected: no new failures.

- [x] **Step 2: Inspect desktop and 375px screenshots**

Confirm hierarchy, card balance, control wrapping, focus visibility, Spanish
copy, and zero horizontal overflow.

- [x] **Step 3: Review the final diff**

Confirm only the new page-specific assets, page source, tests, and docs changed.

### Task 4: Publish static page and solar catalog

**Files:**
- Publish: built static page assets to `PUBLICAR/site-repo`
- Publish: Central’s existing `HOE-S-*` export through its normal export flow

**Interfaces:**
- Consumes: verified static build and Central’s prepared `sun` inventory
- Produces: a live non-empty `sun` chunk and a public storefront that reads it

- [ ] **Step 1: Publish the verified static page assets**

Use the repository’s explicit publication allowlist; do not touch Central-owned
`data/`, product pages, photos, sitemaps, or `assets/frames/`.

- [ ] **Step 2: Run Central’s normal web export**

The export must write/upload the new `sun` chunk and publish the manifest last.

- [ ] **Step 3: Verify production**

Confirm the live manifest points to a non-empty `sun` chunk, the page renders
real `HOE-S-*` cards for Women/Men/Kids, product links work, and EN/ES/mobile
checks pass.
