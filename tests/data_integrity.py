"""Verify supplied, bundled Objective2 evidence without asserting field validation."""
from pathlib import Path
import csv, json
ROOT=Path(__file__).resolve().parents[1]
with (ROOT/'data/RoadScope_Hybrid_DEMO.csv').open(encoding='utf-8-sig',newline='') as f:
    rows=list(csv.DictReader(f))
assert len(rows)==1
r=rows[0]
assert r['id']=='DEMO-HYBRID-001' and float(r['risk_score'])==81.6 and r['risk_level']=='Severe'
side=json.loads((ROOT/'data/RoadScope_Hybrid_DEMO.provenance.json').read_text())
assert side['candidate_csv_row']['id']==r['id']
assert side['original_risk_level']=='Critical' and side['demo'] is True
assert side['source_input']['synthetic_inputs']['ppe']==0.62
vision=json.loads((ROOT/'evidence/D40_pothole__India_004340_assessment.json').read_text())
assert [d['confidence'] for d in vision['detections']]==[0.38532,0.35237]
for image in ['D40_pothole__India_004340.jpg','D40_pothole__India_004340_annotated.jpg']:
    assert (ROOT/'evidence'/image).stat().st_size>1000
with (ROOT/'data/RoadScope_SYNTHETIC_Route.csv').open(encoding='utf-8-sig',newline='') as f:
    route=list(csv.DictReader(f))
with (ROOT/'data/ESP32_SYNTHETIC_Sensor_Readings.csv').open(encoding='utf-8-sig',newline='') as f:
    sensors=list(csv.DictReader(f))
assert len(route)==len(sensors)==8
assert {r['id'] for r in route}=={r['id'] for r in sensors}
assert len({r['run_id'] for r in route})==1
assert all('SYNTHETIC' in r['note'] for r in route)
assert json.loads((ROOT/'data/road_segments_EMPTY_TEMPLATE.geojson').read_text())['features']==[]
print('PASS: hybrid provenance, matched YOLO evidence, 8 synthetic GPS rows and 8 sensor rows.')
