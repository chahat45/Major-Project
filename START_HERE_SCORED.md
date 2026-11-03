# RoadScope — Final scored simulation integration

Run `python3 -m http.server 8080` inside this directory, then open `http://localhost:8080`.

1. Initial screen: 1,228 simulated scored observations (219 Normal, 205 Moderate, 804 Severe) plus 21 *simulated approximate connectors* shaded by risk category.
2. Use filters, map markers, segment tooltips and observation details. Use search if the 200-row register limit hides a specific record.
3. Open Explainability and Sensor Reading Inspector; synthetic readings are linked to the selected observation. The simulated sensor measurements and YOLO/IMU scenarios are NOT trained-model outputs for those records.
4. Select a `run_id` in Journey Replay; replay one synthetic run at a time.
5. In Comparison, select any common `segment_id` and the two successive synthetic passes. Comparison is NOT observed road change.
6. Export full 1,228-row observations CSV; priority queue shows top 200 for responsiveness but its CSV download includes every row. Print a report if required.
7. Use Active Dataset → ML fusion case (1 observation) for the separate 81.6/100 Critical hybrid case and actual YOLO detection images. Do NOT claim the hybrid record belongs to the simulated route.
8. The 42-feature All Runs GeoJSON can be imported manually, but avoid duplicating two passes on a single map when presenting latest-run conditions.

**Warnings:** Everything in the scored network is simulated. GPS/timestamps/sensors/road geometries are invented examples. Rule-engine scores are not measured predictive accuracy or accident risk. The original 81.6 hybrid case uses real YOLO image inference only; other inputs are synthetic.
