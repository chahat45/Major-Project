# SYNTHETIC RoadScope/ESP32 demonstration inputs

These CSV files are **simulated**, with all GPS coordinates, timestamps, IMU values, weather/temperature/rain readings, ultrasonic distances, LDR states, dashboard scores, and risk levels intentionally invented for UI testing. They are **not** actual ESP32 or GPS observations, not synchronized real-world data, and not a fusion model evaluation. Do not report them as field measurements or use them to compute predictive accuracy.

- `RoadScope_SYNTHETIC_Route.csv` is a 19-column CSV compatible with the existing vanilla-JS RoadScope browser import and supports synthetic route replay. All eight rows use the same demo segment/run. Risk scores here are manually illustrated UI examples, **not outputs from the trained models or fusion engine**. `context_score` is an illustrative UI factor, not an actual weather/roughness sensor value.
- `ESP32_SYNTHETIC_Sensor_Readings.csv` depicts plausible examples for the hardware described in the project's mid-sem report: ESP32 + MPU6500-compatible IMU, GPS NEO-6M, raindrop ADC, DHT11, HC-SR04, and LDR. The values and units are only a hypothetical teaching example; no GPS fix, calibration, raw packet capture or physical log has been verified for these rows.

Import `RoadScope_SYNTHETIC_Route.csv` via RoadScope's existing Import CSV button. The coordinates are test points near the dashboard's default map view, not a recorded trip. Keep this demo separate from the real YOLO result `RoadScope_Hybrid_DEMO.csv` and the real sensor logger.
