"""Regression check for the revised frontend using a coordinate-only local Leaflet fallback.
Requires Playwright and Chromium. This does NOT verify online OSM tile access or real hardware/ML inference.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'index.html').read_text()
html=re.sub(r'<script src="[^"]+"></script>','',html)
html=re.sub(r'<link[^>]*>','',html)
files={}
for path in (ROOT/'data').glob('*'):
    if path.suffix.lower() in ('.csv','.json','.geojson'):
        files['data/'+path.name]=path.read_text(encoding='utf-8-sig')
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1600,'height':1000},accept_downloads=True)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html,wait_until='domcontentloaded')
    page.add_style_tag(content=(ROOT/'styles.css').read_text())
    for f in ['offline-map.js','app.js','enhancements.js']:
        page.add_script_tag(content=(ROOT/f).read_text())
    page.evaluate('files=>{window.fetch=async url=>({ok:!!files[url],text:async()=>files[url],json:async()=>JSON.parse(files[url])})}',files)
    page.evaluate('loadBundledSyntheticRoute()')
    page.wait_for_function("document.getElementById('totalCount').textContent==='8'")
    assert page.locator('#datasetSelect').input_value()=='synthetic_route'
    assert page.locator('#rows tr').count()==8
    assert page.locator('.offline-coordinate-map polyline').count()>=7
    assert page.locator('#visionEvidencePanel img').count()==2
    assert page.locator('#statusTag').inner_text()=='SIMULATED DATA'
    assert 'simulated' in page.locator('#sourceDetailsText').text_content().lower()
    print('PASS: 8 point synthetic coloured map, sensor CSV integration, separate YOLO evidence panel')
    page.locator('#stepBtn').click()
    assert page.locator('#replayCount').inner_text()=='2 / 8'
    assert 'DEMO-GPS-002' in page.locator('#sensorTelemetrySummary').inner_text()
    page.locator('#playBtn').click()
    assert 'Pause' in page.locator('#playBtn').inner_text()
    page.locator('#playBtn').click()
    assert 'Play' in page.locator('#playBtn').inner_text()
    print('PASS: replay and sensor inspector')
    with page.expect_download() as dl: page.locator('#downloadQueue').click()
    assert dl.value.suggested_filename=='roadscope_inspection_priorities.csv'
    page.evaluate("window.__reportHTML='';window.open=()=>({document:{open(){},write(s){window.__reportHTML=s},close(){}},focus(){},print(){}})")
    page.locator('#printReport').click()
    assert 'Simulated assessment dataset' in page.evaluate('window.__reportHTML')
    print('PASS: inspection queue, CSV download and printable report disclosure')
    page.locator('#datasetSelect').select_option('hybrid')
    page.wait_for_function("document.getElementById('detailScore').textContent==='81.6 / 100'")
    assert page.locator('#rows tr').count()==1
    assert page.locator('#detailRisk').inner_text()=='Severe · Critical'
    assert page.locator('#playBtn').is_disabled()
    assert 'roughness' in page.locator('#explainBars').inner_text().lower()
    page.locator('.provenance-expand summary').click()
    assert '38.532%' in page.locator('#evidenceMetadata').inner_text()
    with page.expect_download() as dl:page.locator('#downloadProvenance').click()
    assert 'provenance' in dl.value.suggested_filename
    page.locator('#riskFilter').select_option('Critical')
    assert page.locator('#rows tr').count()==1
    print('PASS: original ML assessment 81.6, Critical class, evidence and JSON provenance')
    page.locator('#datasetSelect').select_option('illustrative_comparison')
    assert page.locator('#rows tr').count()==12
    assert page.locator('#compareBtn').is_enabled()
    page.locator('#compareBtn').click()
    assert 'Simulated run comparison' in page.locator('#compareResult').inner_text()
    print('PASS: independent two-run synthetic comparison')
    # Not assessed with missing score is intentionally represented as unscored/grey, not zero.
    page.evaluate("importCSV('id,name,latitude,longitude,risk_level,risk_score\\nN1,Unassessed,30.91,75.85,Not assessed,')")
    assert page.locator('#detailScore').inner_text()=='Not supplied'
    assert page.locator('#notAssessedCount').inner_text()=='1 not assessed'
    print('PASS: Not assessed remains null, not Normal')
    page.locator('#datasetSelect').select_option('synthetic_route')
    page.wait_for_function("document.getElementById('totalCount').textContent==='8'")
    geo={'type':'FeatureCollection','features':[{'type':'Feature','properties':{
      'segment_id':'DEMO-SEG-001','observation_id':'DEMO-GPS-003','risk_level':'Moderate','risk_score':44,
      'demo':True,'source_mode':'synthetic_coordinate_test'},
      'geometry':{'type':'LineString','coordinates':[[75.85013,30.91011],[75.85025,30.91022]]}}]}
    page.evaluate('g=>setRoadGeometry(g)',geo)
    assert '1 scored map connectors' in page.locator('#geometryStatus').inner_text()
    assert page.locator('.offline-coordinate-map polyline').count()>=2
    page.evaluate('setRoadGeometry({type:"FeatureCollection",features:[]})')
    print('PASS: GeoJSON scored road geometry overlay and coordinate order')
    assert not errors,errors
    browser.close()
print('ALL ROADScope DARK-EDITION BROWSER REGRESSION GROUPS PASSED (offline coordinate test; online maps not tested).')
