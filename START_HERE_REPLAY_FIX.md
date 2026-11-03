# RoadScope — Final Dataset Switch + Moving Car + Run Comparison

## Install the matching frontend files

1. Extract the entire ZIP into a new folder.
2. Open `roadscope-objective03-integrated` in VS Code. Do **not** copy only one JavaScript file into an older HTML version.
3. Stop an old server (`Ctrl+C`), then from that folder run:

   ```bash
   python3 -m http.server 8080
   ```

4. Open `http://localhost:8080` and press **Ctrl+Shift+R** once to discard older cached JavaScript.

## Use Journey Replay

- Choose **Scored network scenarios** in the Active Dataset selector (loaded automatically).
- Open **Journey Replay** in the left navigation.
- Choose a run in the dropdown; the mini blue car appears at the first observation.
- Click **Play** to advance observation-by-observation (850 ms per point, with a short visual transition).
- **Pause**, **Next observation**, and the **slider** update the vehicle and selected risk/evidence.
- On the real Leaflet map, the blue vehicle smoothly travels between successive sample positions and faces the route direction.
- If map tiles/Leaflet are unavailable, the offline coordinate viewer shows the car stepping from point to point.
- This car represents the position of supplied, simulated observations—not a connected live ESP32 vehicle.

## Use Run Comparison

- Open **Run Comparison**.
- Select one of the 21 eligible segments.
- Select **Earlier run** and **Later run** (29 October and 31 October 2026 in the provided scenario data).
- Click **Compare runs**.
- The report shows number of observations, mean score, worst risk classification and the later-minus-earlier mean score difference.
- This uses both whole runs even if the Observation Register is filtered to a specific day. It is a scenario comparison, not evidence of road repair.

## Fixed alert

The earlier `Cannot set properties of null (setting 'textContent')` was caused by using out-of-date JavaScript that tried to update deleted `detailNote` and `detailProvenance` elements. The matching HTML+JS+CSS asset URLs have been versioned together. If you still see the error, ensure the server points to the **new extracted folder** and refresh without cache; do not mix old and new frontend files.

No Python ML training or backend API change is required.
