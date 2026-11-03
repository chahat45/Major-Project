# RoadScope dataset-switch and Run Comparison fix

## Cause
The previous frontend release removed `detailNote` and `detailProvenance` from `index.html`. Its older `app.js` still wrote `textContent` to those removed nodes. When the browser reused cached old JavaScript with the new HTML, a `Cannot set properties of null (setting 'textContent')` error appeared after the CSV had already loaded.

## Fix
This release includes matching `index.html`, `app.js`, `enhancements.js`, and `styles.css`, with version-tagged asset URLs in `index.html` to prevent using an earlier cached JS bundle. The script no longer references removed elements. Error alerts remain for genuine data loading failures.

## Run Comparison checked
- Scored network: 21 eligible segments with two simulated runs (29 Oct 2026 and 31 Oct 2026).
- Choose a segment, choose the earlier and later run, click Compare runs.
- Outputs: per-run observation count, average risk score, highest reported category, first observation time, and later-minus-earlier mean score change.
- Before/after is a **comparison of simulated runs**; it does not demonstrate an actual road repair.
- The observation-table date filter does **not** restrict the comparison; both full runs remain available.
- Single-run GPS route or hybrid single-case dataset: comparison stays unavailable (correct).

## Install
Extract the ZIP and replace the matching frontend files **together**; avoid mixing files from different releases. Stop the old server (Ctrl+C), run `python3 -m http.server 8080` from the extracted folder, then use Ctrl+Shift+R or a private browser tab once.
