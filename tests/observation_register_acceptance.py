"""Browser acceptance of observation card/table refinements. Offline Leaflet fallback; online tiles not tested."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'index.html').read_text(encoding='utf-8')
html=re.sub(r'<script src="[^"]+"></script>','',html)
html=re.sub(r'<link[^>]*>','',html)
files={}
for path in (ROOT/'data').glob('*'):
    if path.suffix.lower() in ('.csv','.json','.geojson'):
        files['data/'+path.name]=path.read_text(encoding='utf-8-sig')
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1600,'height':1080},device_scale_factor=1,accept_downloads=True)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html,wait_until='domcontentloaded')
    page.add_style_tag(content=(ROOT/'styles.css').read_text())
    for path in ['offline-map.js','app.js','enhancements.js']:
        page.add_script_tag(content=(ROOT/path).read_text())
    page.evaluate('files=>{window.fetch=async url=>({ok:!!files[url],text:async()=>files[url],json:async()=>JSON.parse(files[url])})}',files)
    page.on('dialog',lambda d: (print('ALERT',d.message),d.accept()))
    page.evaluate('loadBundledScored()')
    print('afterload',page.locator('#totalCount').inner_text(),'errors',errors)
    page.wait_for_function("document.getElementById('totalCount').textContent==='1228'")
    assert page.locator('#detailNote').count()==0
    assert page.locator('#detailProvenance').count()==0
    assert page.locator('#dateFilter option').count()==3, page.locator('#dateFilter').inner_text()
    assert page.locator('#dateFilter option').all_text_contents()==['All dates','31 Oct 2026','29 Oct 2026']
    assert page.locator('tbody#rows tr').count()==200
    row=page.locator('tbody#rows tr').first
    assert '(demo)' not in row.inner_text().lower()
    assert '29 Oct 2026' in row.inner_text(),row.inner_text()
    assert row.locator('button.inspect').inner_text()=='View details ↗'
    page.screenshot(path=str(ROOT/'RoadScope_Refined_Dashboard_Preview.png'),full_page=False)
    row.locator('button.inspect').click()
    assert 'SIM-A-01-002' in page.locator('#detailHint').inner_text()
    assert '29 Oct 2026' in page.locator('#detailTime').inner_text()
    page.locator('#dateFilter').select_option('2026-10-29')
    assert page.locator('#totalCount').inner_text()=='612',page.locator('#totalCount').inner_text()
    assert page.locator('#tableSummary').inner_text().startswith('Showing 200 of 612')
    assert page.locator('#visibleCount').inner_text().startswith('612 observations')
    assert page.locator('#rows tr').first.locator('td').nth(4).inner_text().startswith('29 Oct 2026')
    page.screenshot(path=str(ROOT/'RoadScope_Observed_Date_Filter_Preview.png'),full_page=False)
    page.locator('#dateFilter').select_option('2026-10-31')
    assert page.locator('#totalCount').inner_text()=='616'
    assert page.locator('#visibleCount').inner_text().startswith('616 observations')
    page.locator('#dateFilter').select_option('')
    assert page.locator('#totalCount').inner_text()=='1228'
    page.locator('#datasetSelect').select_option('hybrid')
    page.wait_for_function("document.getElementById('detailScore').textContent==='81.6 / 100'")
    assert page.locator('#dateFilter option').count()==1
    assert page.locator('#detailRisk').inner_text()=='Severe · Critical'
    assert page.locator('#detailNote').count()==0
    assert page.locator('#rows tr').first.locator('td').nth(4).inner_text()=='Not provided'
    assert not errors,errors
    browser.close()
print('PASS: removed marked explanatory blocks, removed coordinate suffix, action selects details, readable dates and 612/616 date filtering; hybrid remains valid.')
