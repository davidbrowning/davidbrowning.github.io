# Grocery list

`index.html` renders a tappable shopping list. Checked items get struck out and drop to the bottom of their section. Checks (and items added in the store) are saved in the phone's browser per list, so a refresh doesn't lose them.

## New trip

1. Copy `lists/2026-11-08.json` to `lists/YYYY-MM-DD.json` and edit the items. Each item needs `name` and a `section` id from `sections.json`; `note` is optional.
2. Add `{"id": "YYYY-MM-DD", "title": "..."}` to the **top** of `lists/index.json`. The page opens the first entry by default.
3. Older trips stay reachable from the dropdown, or at `grocery/?list=YYYY-MM-DD`.

To change the aisle order, reorder `sections.json`. An unknown section id falls into "Other".
