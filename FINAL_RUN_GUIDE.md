# RoadScope — Final Professional Dashboard

## Start on Ubuntu

From this directory:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`. Stop with Ctrl+C. No API key is needed for the OpenStreetMap basemap; an internet connection is required for online map tiles. A coordinate-map fallback is bundled for offline use.

## Dashboard layout

The default scored-network scenario contains 1,228 Objective 2 rule-engine risk-index records, 21 linked coloured scenario segments, and corresponding generated sensor records. Use **Active Dataset** to choose the separate eight-point GPS route, hybrid YOLO case, or comparison dataset. All remain independent.

Risk filters, map selection, evidence bars, per-run replay, run comparison, priority queue, CSV download, JSON provenance export and printable reports remain available.

The dashboard's model-evaluation percentages are not part of the main operational interface; numerical model evaluations should still be documented accurately in project technical reports.

## Data lineage

The default network and GPS route input positions, timestamps and sensor values are **simulated**. Source status is shown in the header and its details under **Dataset methodology & provenance** in the sidebar. This is not a surveyed or physically mapped Ludhiana road network.

The **hybrid YOLO** case contains real YOLO detection boxes from an RDD2022 image, alongside simulated other-modal inputs, and does not have image GPS. The 81.6/100 index is a designed risk score, not a model-accuracy measure or crash probability. The original `Critical` risk level is preserved separately from the legacy `Severe` map category.

The separate archived CSV, GeoJSON, JSON and original assessment files are retained without changes to values or model/fusion logic.

## Final verification

Run:

```bash
python3 tests/data_integrity.py
python3 tests/validate_handoff.py
python3 tests/frontend_acceptance.py
python3 tests/scored_integration_acceptance.py
```

The browser tests use an offline Leaflet-compatible coordinate renderer. Verify actual OpenStreetMap tiles, print/export controls and browser layout on the presentation computer.
