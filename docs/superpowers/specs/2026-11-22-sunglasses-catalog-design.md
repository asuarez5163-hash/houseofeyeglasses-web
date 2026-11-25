# Sunglasses Catalog Design

## Intent

Expose the real B2B Frames sunglasses inventory (`HOE-S-*`) on the public
Sunglasses page. Shoppers must be able to browse women’s, men’s, and kids’
styles while keeping the existing prescription-lens offering understandable.

## Goals

- Read products from the existing `sun` catalog chunk; never duplicate optical
  frames or create a second inventory source.
- Show All, Women, Men, and Kids views, with unisex products included in both
  Women and Men.
- Keep the page bilingual, responsive, keyboard accessible, and consistent
  with the existing C-cine visual system.
- Explain that a real sunglass can be bought as supplied or configured with
  prescription lenses, and retain the separate “sun tint on any optical frame”
  path.
- Give a useful publishing state while the `sun` chunk is temporarily empty.

## Non-goals

- Do not change Central’s inventory, SKUs, prices, stock, or gender data.
- Do not duplicate `HOE-S-*` products into the men/women/kids chunks.
- Do not redesign the global catalog, product configurator, header, or footer.

## Constraints

- HTML is the English SEO source; `build.py` must produce the Spanish twin.
- Existing cached CSS/JS files must not change without an `ASSET_V` bump.
  Page-specific behavior and styles therefore live in new files.
- The page must work with a real non-empty `sun` chunk and with an empty or
  unavailable chunk during publishing.
- The public catalog is written by Central; the static page must not encode
  inventory counts or product records.

## Approaches

1. **One Sunglasses page with audience filters (chosen).** Load `sun` once,
   render a balanced initial selection, and switch the same grid between All,
   Women, Men, and Kids. This keeps one canonical URL and one inventory source.
2. Separate Women’s, Men’s, and Kids’ sunglasses pages. This adds duplicated
   content and maintenance before there is evidence the extra SEO pages are
   useful.
3. Copy sunglasses into the optical gender chunks. Rejected because it blurs
   product type, duplicates records, and risks stock/URL inconsistencies.

## Experience

The existing cinematic sun hero remains the visual anchor. Immediately below
it, a restrained filter rail controls a 12-card real-product grid. The default
selection is balanced across women, men, kids, and unisex when those groups
exist. Exact-gender products precede unisex products in Women and Men views.
Each filter updates the count and “See all” catalog URL.

The educational prescription content follows the shop rather than preceding
it. Its copy distinguishes three truthful paths: buy the sunglass as supplied,
replace its lenses with a prescription, or add a sun tint to another optical
frame.

## Visual direction

- Reuse the existing black/ivory/gold C-cine tokens and Jost/Libre Caslon type.
- Use hairline-separated controls rather than new card chrome.
- Spend the visual emphasis on the real sunglass photography; controls remain
  quiet and compact.
- Two-column cards on phones and three-column cards on larger screens follow
  the established `.look-grid` behavior.

## Validation

- A browser test intercepts the manifest and `sun` chunk with hand-written
  women, men, kids, and unisex fixtures.
- It proves balanced default output, filter behavior, links, empty state,
  English/Spanish switching, mobile overflow, and absence of runtime errors.
- The normal build and existing lens-page checks must still pass.
