"""Offline-browser end-to-end acceptance of scored simulation, not of real road-data validity."""
from pathlib import Path
import json,re
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
html=ROOT.joinpath('index.html').read_text()
html=re.sub(r'<script src="[^"]+"></script>','',html)
html=re.sub(r'<link[^>]*>','',html)
files={}
for f in ROOT.joinpath('data').glob('*'):
 if f.suffix.lower() in ('.csv','.geojson','.json'):
  files['data/'+f.name]=f.read_text(encoding='utf-8-sig')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1500,'height':950},accept_downloads=True)
 errors=[]; page.on('pageerror',lambda e: errors.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded')
 page.add_style_tag(content=ROOT.joinpath('styles.css').read_text())
 for f in ('offline-map.js','app.js','enhancements.js'):page.add_script_tag(content=ROOT.joinpath(f).read_text())
 page.evaluate('files=>{window.fetch=async url=>({ok:!!files[url],text:async()=>files[url],json:async()=>JSON.parse(files[url])})}',files)
 page.evaluate('loadBundledScored()')
 page.wait_for_function("document.getElementById('totalCount').textContent==='1228'",timeout=60000)
 assert page.locator('#normalCount').inner_text()=='219'
 assert page.locator('#moderateCount').inner_text()=='205'
 assert page.locator('#severeCount').inner_text()=='804'
 assert '21 scored map connectors' in page.locator('#geometryStatus').inner_text()
 assert page.locator('#statusTag').inner_text()=='SIMULATED DATA'
 assert 'simulated' in page.locator('#sourceDetailsText').text_content().lower()
 assert page.locator('#datasetSelect').input_value()=='scored_simulation'
 assert page.locator('#rows tr').count()==200
 assert page.locator('#queueRows tr').count()==200
 assert page.locator('.offline-coordinate-map polyline').count()>=21
 assert page.locator('.offline-coordinate-map g[role="button"]').count()>=1200
 assert 'SIMULATED' in page.locator('#sensorTelemetrySummary').inner_text()
 assert '10 synthetic 2Hz IMU samples' in page.locator('#sensorTelemetrySummary').inner_text()
 print('PASS: 1,228 markers, 21 scored polylines, risk distribution, 200-row UI cap, telemetry and explicit provenance')
 page.locator('#riskFilter').select_option('Normal')
 assert page.locator('#rows tr').count()==200
 assert page.locator('#normalCount').inner_text()=='219'
 page.locator('#riskFilter').select_option('Critical')
 assert page.locator('#totalCount').inner_text()=='1228'
 assert page.locator('#rows tr').count()<=200
 print('PASS: risk filters and source counts')
 page.locator('#riskFilter').select_option('All')
 seq=page.locator('#replayRun option').count();assert seq>=8,seq
 page.locator('#stepBtn').click()
 assert page.locator('#replayCount').inner_text().startswith('2 /')
 print('PASS: per-run synthetic replay')
 assert page.locator('#compareBtn').is_enabled()
 page.locator('#compareBtn').click()
 assert 'Simulated run comparison' in page.locator('#compareResult').inner_text()
 print('PASS: two-run comparison available and marked as simulated')
 with page.expect_download(timeout=20000) as dl:page.locator('#downloadQueue').click()
 assert dl.value.suggested_filename=='roadscope_inspection_priorities.csv'
 with page.expect_download(timeout=20000) as dl:page.locator('#exportBtn').click()
 assert dl.value.suggested_filename.endswith('.csv')
 print('PASS: export priority queue and complete observations')
 page.locator('#datasetSelect').select_option('hybrid')
 page.wait_for_function("document.getElementById('detailScore').textContent==='81.6 / 100'")
 assert page.locator('#detailRisk').inner_text()=='Severe · Critical'
 assert page.locator('#rows tr').count()==1
 assert page.locator('#playBtn').is_disabled()
 print('PASS: separate original 81.6 Critical/Severe hybrid and no invented replay')
 assert not errors, errors
 browser.close()
print('ALL 7 NEW SCORED-SIMULATION BROWSER ACCEPTANCE GROUPS PASSED (offline map; street tiles NOT tested)')
