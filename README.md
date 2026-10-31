# RoadPulse — AIoT Road Risk Dashboard (Objective 03)

This is a **working, responsive frontend** for the project's stated Objective 03: an interactive colour-coded map that visualises Normal (green), Moderate (orange) and Severe (red) risk observations. It contains a risk dashboard, searchable observations, map tooltips, selection details, risk filters, CSV import/export, and a clearly labelled synthetic demonstration mode.

## Start

Open `index.html` in your browser, or for more reliable local hosting:

```bash
cd road-risk-dashboard
python -m http.server 8080
```

Then visit http://localhost:8080. The basemap and fonts require an internet connection because Leaflet, OpenStreetMap/CARTO tiles and Google Fonts are served via CDN.

## Import your real prediction results

Click **Import prediction CSV**. Required columns:

- `latitude`, `longitude`: real WGS84 GPS coordinates, valid numeric values
- `risk_level`: `Normal`, `Moderate`, or `Severe`

Optional columns: `id`, `name`, `risk_score` (0–100), `timestamp`, `note`, `segment_id`. Alternative headers `lat`, `lon`, `risk_class`, `score`, `road_name`, etc. are supported. CSVs must contain one row per geotagged observation; do not invent GPS coordinates for ML rows that lack them.

For road-segment **lines** (rather than point observations), supply a `segment_id` on multiple consecutive GPS observations from the same segment. Points with the same `segment_id` are connected in timestamp order, and the line uses the highest risk level among its observations. This is an illustrative segmentation policy, not a map-matching algorithm. Validate route continuity before using it with field data.

## Integration notes

- Your Random Forest output can supply condition/risk classification or a sensor prediction feature, depending on training labels.
- YOLO can supply visual evidence for a geotagged observation **only if** image time/location matches sensor observations.
- Apply a **documented, tested scoring policy** in Python/backend to generate `risk_score` and `risk_level`; this frontend deliberately does not invent an ML model or calculate a fabricated score.
- Demonstration coordinates and scores are **synthetic**; they do not represent a surveyed road or trained model accuracy.
- The road-condition classes are **project-specific**, not Pavement Condition Index or International Roughness Index ratings.
- Imported CSV data stays in your browser for this session, not in a database. This is the Objective 03 display component, not a finished MERN backend.

## Suggested demo

1. Open the dashboard and explain the prominent `DEMO DATA` label.
2. Filter for Severe; inspect a red map marker and risk score.
3. Import a genuine geotagged prediction CSV, then show updated stats and map.
4. Explain the distinction between plotting geotagged predictions and fully validated field risk assessment.


## Formal submission presentation

The interface uses a formal light workspace, navy navigation, and a visible risk-interpretation/evidence-quality panel. Use imported geotagged observations for project results. Synthetic examples remain explicitly marked as demonstrations. Risk classes are project-defined and must not be presented as PCI/IRI.
