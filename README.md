# Community Events Calendar Demo

Static GitHub Pages starter for a community events app.

## Included
- Home page calendar with month / week / day views
- Separate event pages
- Separate JSON data files per event
- Shared styling and reusable JS
- Christmas on Vinegar Hill flyer section rendered from JSON data
- Reference source files stored in `assets/docs/`

## Event Data Files
- `data/fall-fest-2026.json`
- `data/second-fridays-2026.json`
- `data/christmas-on-vinegar-hill-2026.json`

## Christmas on Vinegar Hill structure
The Christmas page now supports:
- grouped locations
- multi-vendor location modals
- vendor lists per host location
- a flyer tab rendered from data
- downloadable source reference files

## Reference Files
- `assets/docs/christmas-on-vinegar-hill-2025-pamphlet.docx`
- `assets/docs/christmas-on-vinegar-hill-vendor-reference.xlsx`

- Month view stays in a true 7-column grid, including on smaller screens via horizontal scrolling.


## Added in v5
- General bucket pages and data files:
  - `community-events.html`
  - `high-school-events.html`
  - `town-services.html`
- Home calendar filter chips for event buckets
- Proper light month-view calendar grid with color-coded event chips

- Location modal vendor lists now render only for locations marked `multiVendor: true`.
