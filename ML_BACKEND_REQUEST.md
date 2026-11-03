# Request to Objective 2 — legitimate coloured road sections

The frontend uses HTML/CSS/JS + Leaflet. It already supports 19/25-column CSV imports, provenance JSON, and scored GeoJSON road lines. **No Python API is necessary for the current demonstration.**

The current one-record hybrid export cannot prove the condition of multiple roads. The supplied eight-point GPS route is synthetic and must remain labelled.

## Optional for real road geometry/assessments

If genuine measurements exist, export:

1. `RoadScope_Real_Observations.csv`: one row per actual assessed sample with `id,latitude,longitude,timestamp,segment_id,run_id,risk_level,original_risk_level,risk_score,assessment_status,source_mode,location_mode,demo`, and optional separate `vision_score,roughness_score,imu_score` and acquisition/GPS status. Use a 0–100 score where present; `Not assessed` must have blank risk_score.
2. `RoadScope_Real_Road_Segments.geojson`: GeoJSON `FeatureCollection` with `LineString` or `MultiLineString` for each *truly located* road section. GeoJSON coordinate order `[longitude, latitude]` (WGS84). Properties: `segment_id`, `observation_id`, `name`, `risk_level` or `display_risk_level`, `risk_score`, `source_mode`, `demo` and, if applicable, `run_id`. Link to observations using `observation_id`, and document how the road geometry was obtained (GPS trace/map matching/source map) and how each segment's score was aggregated.
3. A short provenance file explaining calibration, sampling/time alignment, the origin of GPS coordinates and whether each input was measured, model-inferred, or synthetic.

If these inputs do not exist, explicitly state that and do not fabricate GPS routes, road names, timestamps, segment boundaries or fused field labels from unrelated STRIDE/RDD2022 data. No new ML retraining is required merely to make the UI colourful.
