"""Acceptance: no dataset switch alerts, run comparison across two dates, waypoint car control.
Offline Leaflet fallback; online map tiles not tested.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re
ROOT=Path(__file__).resolve().parents[1]
html=ROOT.joinpath('index.html').read_text(encoding='utf-8')
html=re.sub(r'<script src="[^"]+"></script>','',html)
html=re.sub(r'<link[^>]*>','',html)
files={'data/'+p.name:p.read_text(encoding='utf-8-sig') for p in (ROOT/'data').iterdir() if p.suffix.lower() in ('.csv','.json','.geojson')}
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1520,'height':950},accept_downloads=True)
 errors=[]; alerts=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d: (alerts.append(d.message),d.accept()))
 page.set_content(html,wait_until='domcontentloaded')
 page.add_style_tag(content=(ROOT/'styles.css').read_text())
 for f in ['offline-map.js','app.js','enhancements.js']:page.add_script_tag(content=(ROOT/f).read_text())
 page.evaluate('files=>{window.fetch=async url=>({ok:!!files[url],text:async()=>files[url],json:async()=>JSON.parse(files[url])})}',files)
 page.evaluate('loadBundledScored()')
 page.wait_for_function("document.getElementById('totalCount').textContent==='1228'",timeout=45000)
 assert page.locator('.offline-vehicle').count()==1,'car missing at initial replay waypoint'
 first=page.locator('.offline-vehicle').get_attribute('transform')
 page.locator('#stepBtn').click()
 assert page.locator('#replayCount').inner_text().startswith('2 / ')
 nextpos=page.locator('.offline-vehicle').get_attribute('transform')
 assert nextpos !=first, 'car did not move to next observation'
 assert page.locator('#replaySummary').inner_text().find('🚙')>=0
 print('PASS mini car Next observation, coordinate and risk summary update',first,'=>',nextpos)
 page.locator('#replaySeek').fill('5')
 assert page.locator('#replayCount').inner_text().startswith('6 / ')
 sliderpos=page.locator('.offline-vehicle').get_attribute('transform')
 assert sliderpos!=nextpos,'car did not track seek slider'
 print('PASS mini car seeks to waypoint 6')
 page.locator('#replaySeek').fill('0')
 page.locator('#playBtn').click()
 page.wait_for_timeout(1900)
 assert page.locator('#replayCount').inner_text() != '1 / 612', page.locator('#replayCount').inner_text()
 page.locator('#playBtn').click()
 afterPause=page.locator('#replayCount').inner_text()
 page.wait_for_timeout(1000)
 assert page.locator('#replayCount').inner_text()==afterPause, 'car advanced after Pause'
 print('PASS Play/Pause progression',afterPause)
 page.locator('#dateFilter').select_option('2026-10-29')
 assert page.locator('#totalCount').inner_text()=='612'
 page.locator('#compareBtn').click()
 compare=page.locator('#compareResult').inner_text()
 assert 'EARLIER RUN' in compare and 'LATER RUN' in compare and 'SCORE DIFFERENCE' in compare,compare
 assert '29 Oct 2026' in compare and '31 Oct 2026' in compare,compare
 assert 'Simulated run comparison' in compare
 print('PASS Run Comparison across both dates despite selected date filter')
 for mode in ('hybrid','scored_simulation','synthetic_route','scored_simulation','hybrid','scored_simulation'):
  page.locator('#datasetSelect').select_option(mode)
  page.wait_for_function('(mode)=>document.getElementById("datasetSelect").disabled===false',arg=mode,timeout=45000)
  if mode=='scored_simulation':page.wait_for_function("document.getElementById('totalCount').textContent==='1228'")
  if mode=='hybrid':page.wait_for_function("document.getElementById('detailScore').textContent==='81.6 / 100'")
 assert not alerts,alerts
 assert not errors,errors
 assert page.locator('.offline-vehicle').count()==1,'car did not restore on scored-run return'
 print('PASS repeated dataset switches, no alerts/JS errors; car restored to eligible route')
 browser.close()
print('ALL REPLAY-CAR AND DATASET-SWITCH REGRESSION TESTS PASSED')
