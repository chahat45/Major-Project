# RoadScope — Road Condition Intelligence (Dark-Slate Edition)

Static HTML5/CSS3/vanilla JavaScript + Leaflet 1.9.4. No backend, Node, database, or API key is necessary to run the default OpenStreetMap map.

## Start on Ubuntu

1. Extract the ZIP and enter its `roadscope-objective03-integrated/` directory.
2. `python3 -m http.server 8080`
3. Open `http://localhost:8080/` (internet is required for OpenStreetMap road tiles and Leaflet CDN).

Alternatively use `./run_roadscope.sh`.

## The data selector

The sidebar has a normal **Active Dataset** selector, not presentation controls.

- **Scored road network · 1,228 observations** (initial view): 1,228 synthetic rule-engine-scored rows, 21 latest-run coloured simulated straight-connector geometries, corresponding 1,228 synthetic ESP32 observations and 12,280 synthetic IMU samples. No measured GPS fixes or real road condition data; no trained YOLO or RF inference for these simulated rows. Use the risk filter, maps, observation search, run selector, comparison and reports. The list and priority queue show the first 200 filtered records for speed; export includes all records. The remaining 212 unscored observations in the original fixture were deliberately excluded by Objective 2 and are NOT zero-risk roads.


- **Sample GPS route · 8 observations** (optional): eight *synthetic* locations with manually assigned Normal/Moderate/Severe scores. Coloured dashed connectors link consecutive sample points. **They are not actual road alignments or ML evaluation data.** Selecting a point shows synthetic ESP32 readings, and the journey-replay control is enabled.
- **ML fusion case · 1 observation**: the one supplied hybrid fusion CSV/JSON. This retains score **81.6/100**, raw risk level **Critical**, three-colour display **Severe**, and full limitations. YOLO detections are from a real RDD2022 model inference; IMU, roughness, rainfall and GPS placeholder are synthetic. There is no valid route replay for this one case.
- **Repeated-run sample · 12 observations**: separate synthetic records for showcasing the two-run comparison logic. Not evidence of physical road improvement.

The **YOLO11n Visual Evidence** panel always shows the matched original/annotated RDD2022 image and model-evaluation metrics, clearly identified as separate from whichever map dataset is active.

## Import genuine road results

**Import assessed observations (CSV)** accepts the original 19-column RoadScope input as well as the enriched Objective 2 CSV. Required columns: `latitude,longitude,risk_level`. Scores 0–100, missing scores blank, risk levels Normal/Moderate/Severe or Low/Moderate/High/Critical/Not assessed. Extra fields such as `original_risk_level`, `roughness_score`, `segment_id`, `run_id`, `source_mode`, `location_mode`, and `demo` are recognised. No GPS is invented.

**Attach provenance (JSON)** attaches the supplied Objective 2 sidecar when `candidate_csv_row.id` and risk score agree.

**Import scored road geometry (GeoJSON)** accepts a valid FeatureCollection of LineString or MultiLineString features. This is the route to **colouring actual road geometries**, if legitimately geotagged and assessed road sections are available. The app does not compute road geometries, reroute paths, classify unnamed streets, or extract GPS positions from an RDD image.

GeoJSON uses WGS84 `coordinates: [[longitude, latitude], ...]`. Each feature needs:

```json
{
  "type": "Feature",
  "properties": {
    "segment_id": "IDENTIFIER_FROM_ACTUAL_ROAD_DATA",
    "observation_id": "MATCHING_ROADSCOPE_CSV_ID",
    "name": "Road section",
    "risk_level": "Moderate",
    "risk_score": 55,
    "source_mode": "VERIFIED_SOURCE_NAME",
    "demo": false
  },
  "geometry": {"type":"LineString", "coordinates": []}
}
```

The example above is an **incomplete schema illustration**, not a usable geojson feature. Replace `coordinates` only with actual valid road geometry; it must contain at least two positions. The included `data/road_segments_EMPTY_TEMPLATE.geojson` contains no made-up road locations.

Risk colours: Normal/Low = green, Moderate = amber, High/Critical/Severe = red, Not assessed = grey (never zero). Each imported geometry uses its own supplied category. Map markers remain selectable. GeoJSON lines are selectable when their `observation_id` matches a loaded CSV row.

## Professional interface and safety

- Dark-slate theme and increased font sizes.
- No presentation-mode strip or "Load Objective 2" buttons.
- Seven existing areas preserved: risk map, explainability, inspection queue, journey replay, sensor readiness, before/after comparison, and reports.
- OpenStreetMap online tiles are keyless; optional CARTO key input is available in the map toolbar.
- If Leaflet CDN fails, an explicit **coordinate-only fallback** appears. It is not a street map.
- Browser imports do not persist after reload; use CSV/JSON files as the reproducible source.
- No automatic Python model inference, live ESP32 connection, GPS fix verification, or validated road-network coverage is claimed.

## Testing

`python3 tests/data_integrity.py` — validates bundled inputs and matched YOLO JSON/image files.

`python3 tests/frontend_acceptance.py` — optional Playwright/Chromium-based browser test using a local fallback map (does not test public OSM tile loading).

Before submission, check the street tiles, filters, report print, CSV export, all dataset modes, and matching YOLO image pair on the exact laptop and network you will use.

## New Objective 2 scored dataset integrity

- `data/RoadScope_SIMULATED_Scored_Observations.csv`: 1,228 unique scored observations with 17 columns.
- `data/RoadScope_SIMULATED_Scored_Road_Segments.geojson`: 21 simulation connectors (latest pass per segment).
- `data/RoadScope_SIMULATED_Scored_All_Runs.geojson`: 42 simulation connectors across both runs (optional, not loaded with latest-run geometry).
- `data/ESP32_SIMULATED_Scored_Observation_Sensors.csv`: 1,228 simulated ESP32 observations linked by ID.
- `data/IMU_SIMULATED_2Hz_Scored_Observation_Samples.csv`: 12,280 simulated 2Hz samples (10 per observation).
- `data/PROVENANCE.json`: source description and limitations, loaded for the scored dataset; not the one-record hybrid sidecar.
- The original 81.6 YOLO hybrid case remains selectable and separate.
- The standalone source README mentions 24/48 geometry features in one procedural section, but the *actual packaged files* contain 21/42, validated by this build.

No backend is necessary for the software demonstration. Genuine road-risk claims would require authentic geotagged synchronized observations, road-centreline matching and independent risk-score validation.
