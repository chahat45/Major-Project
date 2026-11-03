# RoadScope — Dataset Switch, Run Comparison and Moving Car Update

- **Dataset switch:** matching HTML/JavaScript/CSS asset versions avoid stale-script errors referencing deleted `detailNote` or `detailProvenance` elements. Install all files together and hard-reload once.
- **Run Comparison:** choose one eligible road segment and two different recorded run IDs, then click **Compare runs**. The difference is **later mean score − earlier mean score**. The app retains both dates independently of the observation table date filter. With the supplied scored scenarios, 21 segments have two runs. There is no comparison for the one-record hybrid ML case.
- **Journey Replay:** choose a run. A miniature blue car appears on its route. **Play** moves it between successive timestamped points; **Pause** stops playback; **Next observation** advances one point; the slider jumps to a waypoint. Heading changes to follow route direction. The selected risk and evidence panels update for each waypoint. This is visual interpolation between supplied observations, not extra GPS measurements. The offline coordinate fallback also displays a car.
- **Data integrity:** simulated routes remain labelled as simulated. No ML models or fusion scores are altered.

Run: `python3 -m http.server 8080` from the `roadscope-objective03-integrated` directory; open `http://localhost:8080`. Use `Ctrl+Shift+R` once to clear old cached scripts.
