"""Standard-library verification of Objective 2 handoff data; no Python ML required."""
from pathlib import Path
import csv, json, math
root=Path(__file__).resolve().parent.parent
csv_path=root/'data/RoadScope_Hybrid_DEMO.csv'
provenance_path=root/'data/RoadScope_Hybrid_DEMO.provenance.json'
with csv_path.open(encoding='utf-8-sig',newline='') as f:
 rows=list(csv.DictReader(f))
assert len(rows)==1,'Expected a single hybrid example record'
r=rows[0]
p=json.loads(provenance_path.read_text())
fusion=p['source_input']['fusion']
assert r['id']==p['candidate_csv_row']['id']=='DEMO-HYBRID-001'
assert r['risk_level']=='Severe' and p['original_risk_level']=='Critical'
assert float(r['risk_score'])==fusion['risk_score']==81.6
assert r['gps_status']=='demo_location' and p['demo'] is True
assert not r['timestamp'] and not r['segment_id'] and not r['run_id']
assert p['source_mode'].startswith('hybrid_demo')
assert len(fusion['evidence']['vision']['detections_above_confidence_0.25'])==2
assert fusion['evidence']['roughness']['condition_score']==55
assert fusion['evidence']['vision']['condition_score']==88
assert fusion['evidence']['imu']['condition_score']==78
weights=fusion['source_weights_renormalized']
core=sum(weights[k]*fusion['evidence'][k]['condition_score'] for k in ('roughness','vision','imu'))
assert math.isclose(core,76.6) and math.isclose(core+fusion['rainfall_modifier_points'],81.6)
print('PASS: supplied CSV and provenance match; 81.6 = 76.6 + 5; DEMO-only GPS and missing timestamp/run are preserved')
