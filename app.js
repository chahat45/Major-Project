const DEMO=[{id:'RD-001',name:'Illustrative Road A',latitude:30.9106,longitude:75.8461,risk_level:'Normal',risk_score:17,timestamp:'2026-10-31 09:10',note:'Synthetic demonstration observation'},{id:'RD-002',name:'Illustrative Road B',latitude:30.9093,longitude:75.8504,risk_level:'Moderate',risk_score:48,timestamp:'2026-10-31 09:12',note:'Synthetic demonstration observation'},{id:'RD-003',name:'Illustrative Road C',latitude:30.9076,longitude:75.8551,risk_level:'Severe',risk_score:85,timestamp:'2026-10-31 09:15',note:'Synthetic demonstration observation'},{id:'RD-004',name:'Illustrative Road D',latitude:30.9034,longitude:75.8587,risk_level:'Severe',risk_score:79,timestamp:'2026-10-31 09:18',note:'Synthetic demonstration observation'},{id:'RD-005',name:'Illustrative Road E',latitude:30.9009,longitude:75.8624,risk_level:'Moderate',risk_score:51,timestamp:'2026-10-31 09:20',note:'Synthetic demonstration observation'},{id:'RD-006',name:'Illustrative Road F',latitude:30.8967,longitude:75.8669,risk_level:'Normal',risk_score:19,timestamp:'2026-10-31 09:24',note:'Synthetic demonstration observation'},{id:'RD-007',name:'Illustrative Road G',latitude:30.9137,longitude:75.8535,risk_level:'Normal',risk_score:23,timestamp:'2026-10-31 09:29',note:'Synthetic demonstration observation'},{id:'RD-008',name:'Illustrative Road H',latitude:30.9166,longitude:75.8596,risk_level:'Moderate',risk_score:63,timestamp:'2026-10-31 09:32',note:'Synthetic demonstration observation'},{id:'RD-009',name:'Illustrative Road I',latitude:30.9202,longitude:75.8649,risk_level:'Severe',risk_score:91,timestamp:'2026-10-31 09:34',note:'Synthetic demonstration observation'},{id:'RD-010',name:'Illustrative Road J',latitude:30.9233,longitude:75.8694,risk_level:'Normal',risk_score:12,timestamp:'2026-10-31 09:38',note:'Synthetic demonstration observation'},{id:'RD-011',name:'Illustrative Road K',latitude:30.8993,longitude:75.8493,risk_level:'Moderate',risk_score:58,timestamp:'2026-10-31 09:41',note:'Synthetic demonstration observation'},{id:'RD-012',name:'Illustrative Road L',latitude:30.8961,longitude:75.8536,risk_level:'Normal',risk_score:24,timestamp:'2026-10-31 09:45',note:'Synthetic demonstration observation'}];
let observations=DEMO.map(x=>({...x})),imported=false,map,layer,selected=null,activeProvenance=null,basemapLayer=null;
let datasetMode='illustrative_comparison',syntheticSensorById=new Map(),scoredRoadGeometry=[],imuTraceById=new Map();
const $=id=>document.getElementById(id);
const color={Normal:'#2fd5a0',Moderate:'#ffb752',Severe:'#ff6476','Not assessed':'#8896a7'};
const severity={'Not assessed':0,Normal:1,Moderate:2,Severe:3};
const rawSeverity={'Not assessed':0,Low:1,Normal:1,Moderate:2,High:3,Severe:3,Critical:4};
const isDemo=r=>r?.demo===true||r?.location_mode==='demo'||r?.gps_status==='demo_location'||r?.assessment_status==='illustrative_demo'||/hybrid_demo|synthetic|illustrative/i.test(r?.source_mode||'')||/DEMO ONLY|SYNTHETIC DEMONSTRATION|synthetic demonstration observation/i.test(r?.note||'');
const escText=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shortSource=r=>isDemo(r)?(/hybrid_demo/i.test(r.source_mode||'')?'HYBRID CASE · YOLO + SIMULATED INPUTS':'SIMULATED SCENARIO DATA'):r.source_mode||'Imported — provenance unverified';
const riskLabel=r=>r.risk_level==='Not assessed'?'Not assessed':r.original_risk_level&&r.original_risk_level!==r.risk_level?`${r.risk_level} · ${r.original_risk_level}`:r.risk_level;
const riskRank=r=>r.risk_level==='Not assessed'?-1:rawSeverity[r.original_risk_level]??severity[r.risk_level]??0;
const showScore=r=>r.risk_score==null?'Not supplied':`${r.risk_score} / 100`;
const timestampValid=r=>r.timestamp&&r.timestamp!=='Not provided'&&!Number.isNaN(Date.parse(r.timestamp));
// Display dates in a readable format; never rewrite the source event timestamp.
const observedDate=r=>/^\d{4}-\d{2}-\d{2}/.test(r.timestamp||'')?r.timestamp.slice(0,10):'';
const formattedObserved=r=>{
  if(!timestampValid(r))return r.timestamp||'Not provided';
  return new Intl.DateTimeFormat('en-GB', {
    day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',
    hour12:false,timeZone:'Asia/Kolkata'
  }).format(new Date(r.timestamp));
};
function syncDateOptions(){
  const input=$('dateFilter');if(!input)return;
  const available=[...new Set(observations.map(observedDate).filter(Boolean))].sort().reverse();
  const wanted=input.value;
  const signature=available.join(',');
  if(input.dataset.dates!==signature){
    input.replaceChildren();
    const all=document.createElement('option');all.value='';all.textContent='All dates';input.append(all);
    for(const day of available){
      const opt=document.createElement('option');opt.value=day;
      const parsed=new Date(day+'T12:00:00+05:30');
      opt.textContent=new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}).format(parsed);
      input.append(opt);
    }
    input.dataset.dates=signature;
    input.value=available.includes(wanted)?wanted:'';
  }
}

function parseCSV(text){
  text=String(text).replace(/^\uFEFF/,'');const lines=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}
    else if(ch===','&&!quoted){row.push(cell);cell=''}
    else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))lines.push(row);row=[];cell=''}
    else cell+=ch;
  }
  if(quoted)throw Error('CSV contains an unclosed quoted field.');row.push(cell);if(row.some(x=>x.trim()))lines.push(row);return lines;
}
const readOptional=s=>{if(s===''||s===undefined||s===null)return null;const n=Number(s);return Number.isFinite(n)&&n>=0&&n<=100?n:null};
const readFlag=s=>['true','1','yes'].includes(String(s??'').toLowerCase());
// Real roadway overlays require supplied LineString geometry. GeoJSON follows [longitude, latitude].
// A browser-side import is only a display operation and does not validate the ML or GPS source.
function setRoadGeometry(input) {
  if(input?.type!=='FeatureCollection'||!Array.isArray(input.features))throw Error('Expected a GeoJSON FeatureCollection.');
  const convert=(v)=>{const canonical={low:'Normal',normal:'Normal',moderate:'Moderate',medium:'Moderate',high:'Severe',severe:'Severe',critical:'Severe','not assessed':'Not assessed'};return canonical[String(v??'').toLowerCase()]};
  const output=[];
  for(const [i,f] of input.features.entries()){
    if(f?.type!=='Feature'||!f.geometry)throw Error(`Feature ${i+1} is invalid.`);
    const p=f.properties||{};const level=convert(p.display_risk_level??p.risk_level);
    if(!level)throw Error(`Feature ${i+1} needs a supported risk_level.`);
    const g=f.geometry;
    if(!['LineString','MultiLineString'].includes(g.type))throw Error(`Feature ${i+1} must be a road LineString/MultiLineString.`);
    const lines=g.type==='LineString'?[g.coordinates]:g.coordinates;
    if(!Array.isArray(lines)||!lines.length)throw Error(`Feature ${i+1} has no coordinates.`);
    for(const line of lines){
      if(!Array.isArray(line)||line.length<2)throw Error(`Feature ${i+1}: line needs two or more positions.`);
      const points=line.map(pos=>{
        if(!Array.isArray(pos)||pos.length<2)throw Error(`Feature ${i+1}: bad coordinate.`);
        const [lon,lat]=pos.map(Number);
        if(!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lat)>90||Math.abs(lon)>180)throw Error(`Feature ${i+1}: invalid WGS84 coordinate.`);
        return [lat,lon];
      });
      output.push({id:String(p.segment_id??f.id??`GEO-${i+1}`),points,level,score:p.risk_score==null?null:Number(p.risk_score),demo:p.demo===true||String(p.source_mode||'').toLowerCase().includes('synthetic'),source:String(p.source_mode||'not independently verified'),observationId:String(p.observation_id??''),label:String(p.name??p.segment_id??`Road section ${i+1}`),originalLevel:String(p.original_risk_level||p.risk_level||''),runId:String(p.run_id||'')});
    }
  }
  scoredRoadGeometry=output;
  $('geometryStatus').textContent=`${output.length} scored map connectors imported · source geometry not independently verified`;
  refresh();fitMap();
  return output;
}
function clearRoadGeometry(){scoredRoadGeometry=[];$('geometryStatus').textContent='No scored road geometry loaded.'}

function cleanRow(src,i){
  const get=(...keys)=>{for(const key of keys){if(src[key]!==undefined&&src[key]!==null&&src[key]!=='')return String(src[key]).trim()}return ''};
  const supplied=get('risk_level','risk_class','risk','condition','severity');
  const originalFromNote=(get('note','description').match(/Objective2 original risk:\s*(Low|Moderate|High|Critical|Not assessed)/i)||[])[1]||'';
  const canonical={normal:'Normal',low:'Normal',medium:'Moderate',moderate:'Moderate',high:'Severe',severe:'Severe',critical:'Severe','not assessed':'Not assessed','not_assessed':'Not assessed',unassessed:'Not assessed'};
  const risk_level=canonical[supplied.toLowerCase()];
  if(!risk_level)throw Error(`Row ${i+2}: unsupported risk_level '${supplied}'.`);
  const raw=get('original_risk_level','ml_risk_level')||originalFromNote||(['low','high','critical','not assessed','not_assessed'].includes(supplied.toLowerCase())?supplied:'');
  const original_risk_level=({'low':'Low','normal':'Normal','moderate':'Moderate','high':'High','critical':'Critical','severe':'Severe','not assessed':'Not assessed','not_assessed':'Not assessed'})[raw.toLowerCase()]||risk_level;
  const latRaw=get('latitude','lat'),lngRaw=get('longitude','lng','lon','long');
  if(!latRaw||!lngRaw)throw Error(`Row ${i+2}: missing GPS coordinates. Do not invent locations for model samples.`);
  const latitude=Number(latRaw),longitude=Number(lngRaw);
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)throw Error(`Row ${i+2}: invalid latitude/longitude.`);
  const scoreRaw=get('risk_score','score');const risk_score=scoreRaw===''?null:Number(scoreRaw);
  if(scoreRaw!==''&&(!Number.isFinite(risk_score)||risk_score<0||risk_score>100))throw Error(`Row ${i+2}: risk_score must be 0–100 or blank.`);
  if(risk_level==='Not assessed'&&risk_score!==null)throw Error(`Row ${i+2}: Not assessed must have a missing risk_score.`);
  const note=get('note','description')||(/synthetic_inputs_existing_objective2_rule_engine/i.test(get('source_mode'))?'SIMULATION ONLY: Experimental risk score calculated by Objective 2 rule engine from synthetic scenario inputs. Not trained-model inference, physical road measurement, or accident probability.':'Imported prediction record');
  const hasRoughnessNote=/context_score below represents PPE roughness condition score/i.test(note);
  const context_score=readOptional(get('context_score'));
  const roughness_score=readOptional(get('roughness_score'))??(hasRoughnessNote?context_score:null);
  const gps_status=get('gps_status');
  const demo=readFlag(get('demo'))||gps_status==='demo_location'||get('location_mode')==='demo'||/DEMO ONLY|ASSESSMENT SCENARIOS/i.test(note);
  return {
    id:get('id','segment_id')||`OBS-${String(i+1).padStart(3,'0')}`,
    name:get('name','road_name','segment_name')||`Road observation ${i+1}`,
    latitude,longitude,risk_level,original_risk_level,risk_score,
    assessment_status:get('assessment_status','status')||(demo?'illustrative_demo':risk_level==='Not assessed'?'not_assessed':'not_provided'),
    timestamp:get('timestamp','observed_at','time')||'Not provided',note,
    group:get('segment_id'),run_id:get('run_id','journey_id'),
    imu_score:readOptional(get('imu_score','vibration_score')),
    vision_score:readOptional(get('vision_score','visual_score')),
    roughness_score,
    context_score:hasRoughnessNote?null:context_score,
    gps_status,imu_status:get('imu_status'),camera_status:get('camera_status'),
    rain_state:get('rain_state'),defect_type:get('defect_type'),model_confidence:readOptional(get('model_confidence')),
    source_mode:get('source_mode')||(demo?(/Objective2 original risk/i.test(note)?'hybrid_demonstration':'synthetic_demonstration'):'unverified_import'),
    location_mode:get('location_mode')||(gps_status==='demo_location'?'demo':''),demo,
    rainfall_modifier_points:readOptional(get('rainfall_modifier_points')),
    rainfall_mm_day:get('rainfall_mm_day'),
    model_info:get('model_info'),
    provenance:null
  };
}
function sidecarForRecord(r,sidecar){
  if(!sidecar||typeof sidecar!=='object')throw Error('Provenance file must contain a JSON object.');
  const candidate=sidecar.candidate_csv_row;
  if(!candidate||String(candidate.id)!==r.id)throw Error('Provenance JSON candidate_csv_row.id must match the imported observation ID.');
  if(candidate.risk_score!==undefined&&Number(candidate.risk_score)!==r.risk_score)throw Error('Provenance risk score does not match CSV.');
  const fusion=sidecar.source_input?.fusion||{};
  if(fusion.risk_score!==undefined&&Number(fusion.risk_score)!==r.risk_score)throw Error('Fusion risk score does not match CSV.');
  if(fusion.risk_level&&sidecar.original_risk_level&&fusion.risk_level!==sidecar.original_risk_level)throw Error('Conflicting original risk levels in provenance JSON.');
  if(sidecar.legacy_risk_level&&sidecar.legacy_risk_level!==r.risk_level)throw Error('Provenance display level conflicts with CSV.');
  r.original_risk_level=sidecar.original_risk_level||fusion.risk_level||r.original_risk_level;
  r.assessment_status=fusion.status||r.assessment_status;
  r.demo=sidecar.demo===true||r.demo;
  r.location_mode=sidecar.location_mode||r.location_mode;
  r.source_mode=sidecar.source_mode||r.source_mode;
  if(fusion.evidence){
    r.vision_score=readOptional(fusion.evidence.vision?.condition_score)??r.vision_score;
    r.imu_score=readOptional(fusion.evidence.imu?.condition_score)??r.imu_score;
    r.roughness_score=readOptional(fusion.evidence.roughness?.condition_score)??r.roughness_score;
    // The attached legacy CSV's context_score=55 was the roughness score, NOT rain impact.
    if(sidecar.candidate_csv_row?.note?.includes('context_score below represents PPE roughness'))r.context_score=null;
    r.rainfall_mm_day=fusion.evidence.weather?.precipitation_mm_day??r.rainfall_mm_day;
  }
  r.rainfall_modifier_points=fusion.rainfall_modifier_points??r.rainfall_modifier_points;
  r.provenance=sidecar;
  return r;
}
function importCSV(content,provenance=null){
  const records=parseCSV(content);if(records.length<2)throw Error('CSV must contain header and at least one record.');
  const headers=records[0].map(x=>x.trim().toLowerCase());
  if(!headers.includes('latitude')&&!headers.includes('lat'))throw Error('Missing latitude column');
  if(!headers.some(x=>['longitude','lng','lon','long'].includes(x)))throw Error('Missing longitude column');
  const rows=records.slice(1).map((cells,i)=>cleanRow(Object.fromEntries(headers.map((h,j)=>[h,cells[j]??''])),i));
  if(!rows.length)throw Error('No valid records found.');
  if(provenance){const match=rows.find(r=>r.id===provenance.candidate_csv_row?.id);if(!match)throw Error('Provenance record not found in CSV.');sidecarForRecord(match,provenance)}
  observations=rows;activeProvenance=provenance;imported=true;selected=null;clearRoadGeometry();
  datasetMode=rows.some(r=>/hybrid_demo/i.test(r.source_mode||''))?'hybrid':rows.every(r=>r.id.startsWith('DEMO-GPS-')&&r.run_id==='DEMO-RUN-001')?'synthetic_route':rows.length>100&&rows.every(r=>/synthetic_inputs_existing_objective2_rule_engine/i.test(r.source_mode||''))?'scored_simulation':'imported';
  if(!['synthetic_route','scored_simulation'].includes(datasetMode)){syntheticSensorById=new Map();imuTraceById=new Map();}
  $('datasetSelect').value=['hybrid','synthetic_route','scored_simulation','illustrative_comparison'].includes(datasetMode)?datasetMode:'synthetic_route';
  $('riskFilter').value='All';$('searchBox').value='';$('dateFilter').value='';
  $('sourceName').textContent=datasetMode==='hybrid'?'HYBRID ANALYSIS CASE':datasetMode==='scored_simulation'?'NETWORK SCENARIO RESULTS':datasetMode==='synthetic_route'?'GPS ROUTE SCENARIO':rows.some(isDemo)?'ASSESSMENT SCENARIOS':'IMPORTED CSV';
  $('sourceSub').textContent=datasetMode==='scored_simulation'?`${rows.length.toLocaleString()} rule-scored records · generated scenario inputs`:rows.some(isDemo)?'Dataset methodology and provenance available below.':`${rows.length} imported records. Verify data provenance and GPS locations.`;
  $('statusTag').textContent=datasetMode==='hybrid'?'HYBRID CASE':rows.some(isDemo)?'SIMULATED DATA':'IMPORTED DATA';
  $('statusDot').classList.toggle('amber',rows.some(isDemo));
  showWarning();refresh();fitMap();if(rows[0])choose(rows[0].id);
  return rows;
}
function showWarning(){
  const demo=observations.some(isDemo);
  const hybrid=datasetMode==='hybrid';
  const scored=datasetMode==='scored_simulation';
  const source=hybrid?'Hybrid case · YOLO inference + simulated fusion inputs':
    scored?'Simulated network · Objective 2 rule-engine scores':
    demo?'Simulated route and sensor scenarios':'Imported observation dataset';
  // A concise, visible provenance label avoids repeated cautionary banners.
  // Source is already marked in the top status tag; full methodology sits in the sidebar.
  // Keep the legacy warning node for compatibility without adding a second banner.
  $('dataWarning').hidden=true;
  $('dataWarning').textContent=`Data source: ${source}`;
  $('sourceDetailsText').textContent=hybrid
    ?'Real YOLO detections are accompanied by synthetic IMU, roughness, rainfall and GPS inputs. The 81.6 index is an experimental fused score, not a measured field assessment.'
    :scored
    ?'All 1,228 coordinates, timestamps, ESP32/IMU samples and 21 scored connector geometries are simulated. Scores were generated with the existing Objective 2 rule engine, not measured from Ludhiana roads.'
    :demo
    ?'This dataset illustrates geospatial and sensor analysis with simulated input records, rather than a recorded field route.'
    :'Imported records are displayed as provided. Verify their acquisition provenance before using them as field assessments.';
  $('provenanceStatus').textContent=activeProvenance?'Source provenance is available for this dataset.':'No separate provenance JSON attached.';
  if($('visionEvidencePanel'))$('visionEvidencePanel').hidden=false;
  $('downloadProvenance').disabled=!activeProvenance;
}

async function loadBundledHybrid(options={}){
  const btn=$('datasetSelect');btn.disabled=true;
  try{
    const [csv,sidecar]=await Promise.all([
      fetch('data/RoadScope_Hybrid_DEMO.csv').then(r=>{if(!r.ok)throw Error('Bundled CSV not found');return r.text()}),
      fetch('data/RoadScope_Hybrid_DEMO.provenance.json').then(r=>{if(!r.ok)throw Error('Bundled provenance not found');return r.json()})
    ]);
    importCSV(csv,sidecar);
  }catch(err){if(!options.silent)alert('Unable to load bundled Objective 2 demo: '+err.message)}
  finally{btn.disabled=false}
}
async function importProvenanceFile(file){
  if(!imported)throw Error('Import the matching CSV first.');
  if(file.size>1024*1024)throw Error('Provenance JSON is unexpectedly large.');
  const sidecar=JSON.parse(await file.text());const row=observations.find(r=>r.id===sidecar.candidate_csv_row?.id);
  if(!row)throw Error('Matching observation ID was not found.');
  sidecarForRecord(row,sidecar);activeProvenance=sidecar;
  $('sourceName').textContent=datasetMode==='hybrid'?'HYBRID ANALYSIS CASE':datasetMode==='scored_simulation'?'NETWORK SCENARIO RESULTS':datasetMode==='synthetic_route'?'GPS ROUTE SCENARIO':observations.some(isDemo)?'ASSESSMENT SCENARIOS':'IMPORTED CSV';
  $('sourceSub').textContent=observations.some(isDemo)?'Attached dataset metadata and evidence':'Attached dataset metadata and evidence';
  $('statusTag').textContent=datasetMode==='hybrid'?'HYBRID CASE':observations.some(isDemo)?'SIMULATED DATA':'IMPORTED DATA';
  showWarning();refresh();choose(row.id);
}
function filtered(){
  const filter=$('riskFilter').value,q=$('searchBox').value.toLowerCase().trim(),date=$('dateFilter')?.value||'';
  return observations.filter(r=>(!date||observedDate(r)===date)&&(filter==='All'||(filter==='Critical'?r.original_risk_level==='Critical':r.risk_level===filter))&&(!q||[r.id,r.name,r.risk_level,r.original_risk_level,r.timestamp,r.note].some(v=>String(v??'').toLowerCase().includes(q))));
}
function renderMetrics(){
  const dated=observations.filter(r=>!$('dateFilter')?.value||observedDate(r)===$('dateFilter').value);
  const total=dated.length,counts={Normal:0,Moderate:0,Severe:0,'Not assessed':0};
  dated.forEach(r=>{counts[r.risk_level]=(counts[r.risk_level]||0)+1});
  $('totalCount').textContent=total;$('normalCount').textContent=counts.Normal;$('moderateCount').textContent=counts.Moderate;$('severeCount').textContent=counts.Severe;
  $('notAssessedCount').textContent=`${counts['Not assessed']} not assessed`;
  $('donutNumber').textContent=total;
  let at=0;const stops=[];for(const level of ['Normal','Moderate','Severe','Not assessed']){const next=at+(total?counts[level]/total*100:0);stops.push(`${color[level]} ${at}% ${next}%`);at=next}
  $('donut').style.background=total?`conic-gradient(${stops.join(',')})`:'#e6eaf0';
  for(const level of ['Normal','Moderate','Severe','Not assessed'])$(''+({Normal:'normalPct',Moderate:'moderatePct',Severe:'severePct','Not assessed':'notAssessedPct'}[level])).textContent=(total?Math.round(100*counts[level]/total):0)+'%';
}
function choose(id,{centerMap=true}={}){
  selected=observations.find(r=>r.id===id);if(!selected)return;
  $('detailName').textContent=selected.name;
  $('detailHint').textContent=`${selected.id} · ${shortSource(selected)}`;
  $('detailRisk').textContent=riskLabel(selected);
  $('detailRisk').style.color=color[selected.risk_level];
  $('detailScore').textContent=showScore(selected);
  $('detailCoords').textContent=`${selected.latitude.toFixed(5)}, ${selected.longitude.toFixed(5)}`;
  $('detailTime').textContent=formattedObserved(selected);
  if(typeof enhanceSelection==='function')enhanceSelection(selected);
  if(typeof renderSyntheticTelemetry==='function')renderSyntheticTelemetry(selected);
  if(map&&centerMap)map.flyTo([selected.latitude,selected.longitude],Math.max(14,map.getZoom()),{duration:.7});
}
function renderMap(){
  if(!map)return;
  if(typeof map.beginBatch==='function')map.beginBatch();
  layer.clearLayers();const rows=filtered();
  // Imported GeoJSON geometry can represent mapped road sections; it is never inferred from risk markers.
  let visibleSegments=0;
  scoredRoadGeometry.forEach(seg=>{
    if($('dateFilter')?.value&&seg.observationId&&!rows.some(r=>r.id===seg.observationId))return;
    if($('riskFilter').value!=='All' && seg.level!==$('riskFilter').value && !($('riskFilter').value==='Critical'&&seg.originalLevel==='Critical'))return;
    visibleSegments++;
    const line=L.polyline(seg.points,{color:color[seg.level],weight:9,opacity:.91,dashArray:seg.demo?'9,6':null}).addTo(layer);
    line.bindTooltip(`${seg.label} · ${seg.level} · ${seg.score??'unscored'} · ${seg.runId||'run not supplied'}${seg.demo?' · scenario geometry':''}`);
    const ref=observations.find(r=>r.id===seg.observationId)||observations.find(r=>r.group===seg.id&&(!seg.runId||r.run_id===seg.runId));
    if(ref)line.on('click',()=>choose(ref.id));
  });
  // Only a SAMPLE coordinate track is drawn between consecutive positions; this is not OSM map matching.
  if(!scoredRoadGeometry.length&&datasetMode==='synthetic_route'&&rows.length>=2){
    const groups=new Map();
    rows.filter(timestampValid).forEach(r=>{if(r.run_id){if(!groups.has(r.run_id))groups.set(r.run_id,[]);groups.get(r.run_id).push(r)}});
    groups.forEach(seq=>{
      seq.sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp));
      for(let i=1;i<seq.length;i++){
        const prev=seq[i-1],curr=seq[i];
        const line=L.polyline([[prev.latitude,prev.longitude],[curr.latitude,curr.longitude]],{color:color[curr.risk_level],weight:9,opacity:.90,dashArray:'9,7'}).addTo(layer);
        line.bindTooltip(`Sample track ${i} · ${riskLabel(curr)} · ${showScore(curr)} · NOT road-matched`);
        line.on('click',()=>choose(curr.id));
      }
    });
  }
  rows.forEach(r=>{
    const marker=L.circleMarker([r.latitude,r.longitude],{radius:r.risk_level==='Severe'?10:8,color:isDemo(r)?'#1b344a':'#0b1729',weight:2,fillColor:color[r.risk_level],fillOpacity:r.risk_level==='Not assessed'?.55:.95}).addTo(layer);
    marker.bindTooltip(`${r.name} · ${riskLabel(r)}${isDemo(r)?' · Scenario':''}`);
    marker.on('click',()=>choose(r.id));
  });
  $('visibleCount').textContent=`${rows.length.toLocaleString()} observations · ${scoredRoadGeometry.length?visibleSegments+' scored scenario segments':datasetMode==='synthetic_route'?'scenario track':'no road geometry imported'}`;
  if(typeof map.endBatch==='function')map.endBatch();
}
function renderTable(){
  const rows=filtered();$('rows').innerHTML='';
  for(const r of rows.slice(0,200)){
    const tr=document.createElement('tr');
    const values=[r.name,`${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)}`,riskLabel(r),showScore(r),formattedObserved(r)];
    values.forEach((v,i)=>{const td=document.createElement('td');if(i===2){const span=document.createElement('span');span.className='risk-badge '+r.risk_level.replaceAll(' ','-');span.textContent=v;td.append(span)}else td.textContent=v;tr.append(td)});
    const td=document.createElement('td'),btn=document.createElement('button');btn.className='inspect';btn.textContent='View details ↗';btn.title='Select this observation, update its risk evidence and centre the map';btn.onclick=()=>{choose(r.id);document.querySelector('.detail').scrollIntoView({behavior:'smooth',block:'center'});};td.append(btn);tr.append(td);$('rows').append(tr);
  }
  $('tableSummary').textContent=`Showing ${Math.min(rows.length,200)} of ${rows.length} filtered observations · ${observations.length} total (search to narrow, export to access all)`;
}
function refresh(){syncDateOptions();renderMetrics();renderMap();renderTable();if(typeof enhanceRefresh==='function')enhanceRefresh()}
function fitMap(){if(!map)return;const rows=filtered();const pts=[...rows.map(r=>[r.latitude,r.longitude]),...scoredRoadGeometry.flatMap(s=>s.points)];if(pts.length)map.fitBounds(L.latLngBounds(pts),{padding:[45,45],maxZoom:16})}
function csvQuote(v){let s=String(v??'');if(/^[\s]*[=+@\-\t\r]/.test(s)&&isNaN(Number(s)))s="'"+s;return '"'+s.replaceAll('"','""')+'"'}
const csvHeaders=['id','name','latitude','longitude','risk_level','original_risk_level','risk_score','assessment_status','timestamp','note','segment_id','run_id','imu_score','vision_score','roughness_score','context_score','gps_status','imu_status','camera_status','rain_state','defect_type','model_confidence','source_mode','location_mode','demo','rainfall_modifier_points','rainfall_mm_day'];
const csvValue=(r,h)=>h==='segment_id'?r.group:h==='risk_level'?r.risk_level:r[h];
function saveCSV(){
  const txt=[csvHeaders.join(','),...observations.map(r=>csvHeaders.map(h=>csvQuote(csvValue(r,h))).join(','))].join('\r\n');
  downloadText(imported?'road_predictions_export.csv':'roadscope_observations.csv',txt,'text/csv');
}
function nav(view){
  document.body.dataset.view=view;document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.view===view));
  $('viewCrumb').textContent=view.toUpperCase();
  $('pageTitle').innerHTML=({overview:'Road Intelligence <span>Overview</span>',map:'Geospatial <span>Risk Explorer</span>',records:'Road <span>Observations</span>',replay:'Recorded <span>Journey Replay</span>',comparison:'Run <span>Comparison</span>',reports:'Inspection <span>Reports</span>'})[view];
  if(view==='records')document.querySelector('.table-panel').scrollIntoView({behavior:'smooth',block:'start'});
  else if(['replay','comparison','reports'].includes(view))document.getElementById(({replay:'replayPanel',comparison:'comparePanel',reports:'reportPanel'})[view]).scrollIntoView({behavior:'smooth',block:'start'});
  else window.scrollTo({top:0,behavior:'smooth'});setTimeout(()=>map&&map.invalidateSize(),200);
}

// Loads the eight actual files supplied by Objective 2 for a SYNTHETIC UI demonstration.
// No request is made to the live ESP32, and no predictions are calculated in JavaScript.
// Load the Objective 2 scored-only simulation without modifying the original hybrid case.
// 17-column data, 21 latest-run approximate connectors, 1,228 linked synthetic sensor rows.
async function loadBundledScored(){
  const selector=$('datasetSelect');selector.disabled=true;
  try{
    const file=async path=>{const r=await fetch(path);if(!r.ok)throw Error('Required simulation file unavailable: '+path);return r.text()};
    const [scores,geometryText,sensorsText,provenanceText,imuText]=await Promise.all([
      file('data/RoadScope_SIMULATED_Scored_Observations.csv'),
      file('data/RoadScope_SIMULATED_Scored_Road_Segments.geojson'),
      file('data/ESP32_SIMULATED_Scored_Observation_Sensors.csv'),
      file('data/PROVENANCE.json'),
      file('data/IMU_SIMULATED_2Hz_Scored_Observation_Samples.csv')
    ]);
    const rows=importCSV(scores);
    if(rows.length!==1228||datasetMode!=='scored_simulation')throw Error('Unexpected scored-simulation observation count or source mode.');
    const geometry=setRoadGeometry(JSON.parse(geometryText));
    if(geometry.length!==21)throw Error('Expected 21 latest-run scored connectors, found '+geometry.length);
    const csvMap=text=>{const cells=parseCSV(text);const keys=cells[0];return cells.slice(1).map(row=>Object.fromEntries(keys.map((k,i)=>[k,row[i]??''])))};
    const sensors=csvMap(sensorsText),traces=csvMap(imuText);
    syntheticSensorById=new Map(sensors.map(row=>[row.observation_id,row]));
    imuTraceById=new Map();
    for(const row of traces){const id=row.observation_id;if(!imuTraceById.has(id))imuTraceById.set(id,[]);imuTraceById.get(id).push(row)}
    if(syntheticSensorById.size!==rows.length||traces.length!==12280||imuTraceById.size!==rows.length)throw Error('Synthetic sensor/IMU samples do not align with scored observation IDs.');
    const provenance=JSON.parse(provenanceText);
    if(!/SYNTHETIC/i.test(provenance.dataset_status||''))throw Error('Simulation provenance is missing explicit synthetic status.');
    activeProvenance=provenance;
    $('datasetSelect').value='scored_simulation';
    $('sourceName').textContent='NETWORK SCENARIO RESULTS';
    $('sourceSub').textContent='1,228 scenario assessments · 21 coloured segments · linked sensor data';
    $('statusTag').textContent='SIMULATED DATA';
    showWarning();refresh();fitMap();if(rows[0])choose(rows[0].id);nav('overview');
  }catch(err){console.error('[RoadScope] Scored dataset load failed:',err);alert('Scored dataset could not load: '+err.message)}
  finally{selector.disabled=false}
}

async function loadBundledSyntheticRoute(){
  const btn=$('datasetSelect');btn.disabled=true;
  try{
    const [routeText,sensorText]=await Promise.all([
      fetch('data/RoadScope_SYNTHETIC_Route.csv').then(r=>{if(!r.ok)throw Error('Synthetic GPS route CSV missing');return r.text()}),
      fetch('data/ESP32_SYNTHETIC_Sensor_Readings.csv').then(r=>{if(!r.ok)throw Error('Synthetic ESP32 readings CSV missing');return r.text()})
    ]);
    const all=parseCSV(sensorText);
    if(all.length<2)throw Error('Synthetic ESP32 file contains no data');
    const headers=all[0].map(x=>x.trim());
    const sensors=new Map(all.slice(1).map(row=>{const obj=Object.fromEntries(headers.map((key,i)=>[key,row[i]??'']));return [obj.id,obj]}));
    if(sensors.size!==8)throw Error(`Expected eight synthetic ESP32 rows, found ${sensors.size}`);
    // CSV parser remains the same working 19-column importer.
    const rows=importCSV(routeText);
    if(datasetMode!=='synthetic_route'||rows.length!==8||!rows.every(r=>sensors.has(r.id)))throw Error('Route/telemetry IDs do not match expected eight-point handoff');
    syntheticSensorById=sensors;
    // Refresh selected observation after the supplementary sensor CSV has been attached.
    if(selected)choose(selected.id);
    $('sourceName').textContent='GPS ROUTE SCENARIO';
    $('sourceSub').textContent='Eight-point GPS route scenario · linked sensor values';
    showWarning();refresh();fitMap();nav('overview');
  }catch(err){alert('Synthetic route import failed: '+err.message)}
  finally{btn.disabled=false;}
}

function resetDemo(){
  if(typeof stopReplay==='function')stopReplay();
  datasetMode='illustrative_comparison';syntheticSensorById=new Map();clearRoadGeometry();$('datasetSelect').value='illustrative_comparison';
  observations=DEMO.map(x=>({...x}));imported=false;selected=null;activeProvenance=null;
  $('sourceName').textContent='DEMONSTRATION';$('sourceSub').textContent='Repeated-run assessment scenarios for comparison';
  $('statusTag').textContent='SIMULATED DATA';$('statusDot').classList.add('amber');$('riskFilter').value='All';$('searchBox').value='';$('dateFilter').value='';
  showWarning();refresh();fitMap();if(observations[0])choose(observations[0].id);
}
// The interactive street basemap is separate from model-derived risk markers.
// OpenStreetMap works without an API key for reasonable interactive use.
// CARTO requires a free key; it is used only in browser memory, never stored.
function basemapConfig(provider,key=''){
  if(provider==='osm')return {
    url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    options:{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'},
    label:'OpenStreetMap streets · no key required'
  };
  if(!['carto-light','carto-voyager'].includes(provider))throw Error('Unsupported basemap provider');
  if(!key)throw Error('CARTO requires a basemap API key. OpenStreetMap works without one.');
  const style=provider==='carto-light'?'light_all':'rastertiles/voyager';
  return {
    url:`https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(key)}`,
    options:{maxZoom:19,subdomains:'abcd',attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> &copy; <a href="https://carto.com/attribution/">CARTO</a>'},
    label:provider==='carto-light'?'CARTO Positron · authenticated':'CARTO Voyager · authenticated'
  };
}
function applyBasemap(provider){
  const key=$('cartoKey').value.trim(),keyGroup=$('mapKeyEntry');
  keyGroup.hidden=provider==='osm';
  if(provider!=='osm'&&!key){
    $('basemapStatus').textContent='Enter a CARTO API key and click Apply key. Existing street map stays active.';
    return false;
  }
  let cfg;
  try{cfg=basemapConfig(provider,key)}catch(err){$('basemapStatus').textContent=err.message;return false}
  if(!map){$('basemapStatus').textContent='Offline GPS coordinate view · street basemap unavailable in this browser';return false}
  const next=L.tileLayer(cfg.url,cfg.options);
  if(!window.__RoadScopeOfflineMap){
    next.on('tileerror',()=>{
      // Failure of a map tile does NOT invalidate model risk markers.
      $('mapTileNotice').hidden=false;
      $('mapTileNotice').textContent=provider==='osm'?'Street tiles unavailable. Check internet access; risk markers remain selectable.':'CARTO tiles unavailable. Check the API key or switch to OpenStreetMap.';
      $('basemapStatus').textContent=provider==='osm'?'OpenStreetMap tiles unavailable · markers still work':'CARTO tiles unavailable · check API key / network';
    });
    next.on('tileload',()=>{
      if(basemapLayer===next){$('mapTileNotice').hidden=true;$('basemapStatus').textContent=cfg.label+' · roads are map background, not assessed segments';}
    });
  }
  if(basemapLayer)map.removeLayer(basemapLayer);
  basemapLayer=next.addTo(map);
  $('mapTileNotice').hidden=true;
  $('basemapStatus').textContent=window.__RoadScopeOfflineMap?'Offline GPS coordinate view · no street tiles':cfg.label+' · online tiles';
  return true;
}
function init(){
  if(typeof L!=='undefined'){
    map=L.map('map',{zoomControl:false}).setView([30.91,75.85],13);
    L.control.zoom({position:'topright'}).addTo(map);
    applyBasemap('osm');
    layer=L.layerGroup().addTo(map);
  }else $('mapFallback').hidden=false;
  if(window.__RoadScopeOfflineMap){$('mapFallback').hidden=false;$('basemapStatus').textContent='Offline coordinate fallback · street tiles unavailable';}
  $('mapProvider').onchange=e=>applyBasemap(e.target.value);
  $('applyMapKey').onclick=()=>applyBasemap($('mapProvider').value);
  $('cartoKey').onkeydown=e=>{if(e.key==='Enter')applyBasemap($('mapProvider').value)};
  document.querySelectorAll('.nav').forEach(n=>n.onclick=()=>nav(n.dataset.view));
  $('riskFilter').onchange=refresh;$('searchBox').oninput=refresh;$('dateFilter').onchange=()=>{refresh();fitMap();};$('fitBtn').onclick=fitMap;
  $('exportBtn').onclick=saveCSV;
  $('datasetSelect').onchange=async e=>{
    const mode=e.target.value;
    if(mode==='scored_simulation')await loadBundledScored();
    else if(mode==='hybrid')await loadBundledHybrid();
    else if(mode==='synthetic_route')await loadBundledSyntheticRoute();
    else resetDemo();
  };
  $('roadGeometryFile').onchange=async e=>{
    const f=e.target.files?.[0];if(f){try{setRoadGeometry(JSON.parse(await f.text()))}catch(err){alert('Road geometry import failed: '+err.message)}e.target.value=''}
  };
  $('csvFile').onchange=async e=>{const file=e.target.files?.[0];if(file){try{importCSV(await file.text())}catch(err){alert('CSV import failed: '+err.message)}e.target.value=''}};
  $('provenanceFile').onchange=async e=>{const file=e.target.files?.[0];if(file){try{await importProvenanceFile(file)}catch(err){alert('Provenance import failed: '+err.message)}e.target.value=''}};
  $('downloadProvenance').onclick=()=>{if(activeProvenance)downloadText('roadscope_attached_provenance.json',JSON.stringify(activeProvenance,null,2),'application/json')};
  // The original demo samples are synthetic, including the two demo passes.
  DEMO.forEach((r,i)=>{r.group='DEMO-'+(i%4+1);r.run_id=i<6?'DEMO-PASS-01':'DEMO-PASS-02';r.imu_score=[12,39,78,71,49,13,25,58,90,16,43,22][i];r.vision_score=[15,51,91,86,48,20,16,62,87,13,67,25][i];r.context_score=[4,18,12,23,8,9,10,11,19,5,16,7][i];r.roughness_score=null;r.rain_state=i%3===0?'DAMP':'DRY';r.defect_type=r.risk_level==='Severe'?'Pothole':r.risk_level==='Moderate'?'Surface anomaly':'None reported';r.model_confidence=null;r.demo=true;r.location_mode='demo';r.source_mode='synthetic_dashboard_demo';r.original_risk_level=r.risk_level;r.assessment_status='illustrative_demo';r.provenance=null});
  resetDemo();
}
init();
// Show the actual Objective 2 handoff first; keep synthetic journey mode separately accessible.
window.addEventListener('load',()=>{if(!imported)loadBundledScored()},{once:true});
