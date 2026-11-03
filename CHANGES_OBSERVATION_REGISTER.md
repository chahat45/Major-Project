# RoadScope selected observation and observation register refinements

- Removed the two selected-observation free-text panels indicated in the uploaded screenshot. Important data provenance remains in the sidebar methodology disclosure, the explainability panel and exported source files.
- Removed `(demo)` / `(scenario)` suffix from visual coordinate labels only; the original data-source flags and provenance are unchanged.
- Formatted the stored ISO-8601 timestamps into readable `DD Mon YYYY, HH:MM:SS` in Asia/Kolkata. The original timestamps remain unchanged in the input/export files.
- Added an **Observed date** dropdown generated from available timestamps. For the current scored dataset the choices are 29 October and 31 October 2026, without manufacturing different collection dates.
- Changed **Action → Details** and **Inspect → View details**. This action selects a record, updates the selected observation and associated evidence/telemetry and centres the map; the details panel scrolls into view.
- Date filtering updates the map, observation table, inspection priorities and headline counts. Filtering by date only selects among existing records.
- Preserved the original 1,228 synthetic scenario records, 21 scored connectors, separate hybrid YOLO assessment, JSON provenance and report download mechanisms.

Launch: `python3 -m http.server 8080` from the extracted `roadscope-objective03-integrated/` directory.
