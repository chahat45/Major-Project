/* RoadScope Objective 03 — existing feature logic, adapted for Objective 2 provenance. */
let replayTimer=null,replayIndex=0,replayPath=null,replayCursor=null;
let replayCarPoint=null,replayCarFrame=null,replayCarToken=0;
const esc=escText;
const scoreText=showScore;
const available=r=>[r.imu_score,r.vision_score,r.roughness_score??r.context_score].filter(x=>x!=null).length;
const validity=r=>Number.isFinite(r.latitude)&&Number.isFinite(r.longitude)&&Math.abs(r.latitude)<=90&&Math.abs(r.longitude)<=180;
const sortedQueue=()=>[...filtered()].sort((a,b)=>riskRank(b)-riskRank(a)||(b.risk_score??-1)-(a.risk_score??-1));
const confidenceAsPercent=x=>typeof x==='number'&&Number.isFinite(x)?(x*100).toFixed(3)+'%':'Not supplied';

function enhanceSelection(r){
  $('explainInfo').textContent=`${r.id} · ${riskLabel(r)} · ${scoreText(r)} · ${r.assessment_status||'Status unknown'}`;
  const factors=[
    ['Vision condition evidence',r.vision_score],
    ['Road roughness (PPE-derived)',r.roughness_score],
    ['IMU condition evidence',r.imu_score]
  ];
  if(r.context_score!=null)factors.push(['Legacy contextual evidence',r.context_score]);
  $('explainBars').innerHTML=factors.map(([label,n])=>`<div class="factor"><div class="factor-top"><span>${esc(label)}</span><b>${n==null?'Not provided':esc(n)+'/100'}</b></div><div class="factor-track"><div style="width:${n??0}%;background:${n==null?'#cbd5e1':n>=70?'#cf5262':n>=35?'#de9c3f':'#25856a'}"></div></div></div>`).join('');
  const p=r.provenance?.source_input;
  const f=p?.fusion||{};
  const pieces=[];
  if(r.vision_score!=null)pieces.push(`vision condition evidence ${r.vision_score}/100`);
  if(r.roughness_score!=null)pieces.push(`roughness condition evidence ${r.roughness_score}/100`);
  if(r.imu_score!=null)pieces.push(`IMU condition evidence ${r.imu_score}/100`);
  if(r.context_score!=null)pieces.push(`separate context field ${r.context_score}/100`);
  $('reasonText').textContent=`Risk classification: ${r.original_risk_level}. Map category: ${r.risk_level}. Risk index: ${scoreText(r)}. ${pieces.length?pieces.join('; ')+'.':'No modality scores provided.'}`;
  const meta=[];
  if(isDemo(r))meta.push(`<div class="source-pill">${datasetMode==='hybrid'?'Hybrid case · real YOLO detection + simulated fusion inputs':'Simulation dataset · generated location and sensor records'}</div>`);
  if(r.provenance){
    meta.push(`<div><b>Fusion status:</b> ${esc(f.status||r.assessment_status)} &nbsp; <b>Base/renormalised weights:</b> ${esc(Object.entries(f.source_weights_renormalized||{}).map(([k,v])=>`${k} ${(Number(v)*100).toFixed(1)}%`).join(', ')||'Not provided')}</div>`);
    if(f.core_condition_score!=null)meta.push(`<div><b>Core condition score:</b> ${esc(f.core_condition_score)}/100 &nbsp; <b>Rainfall adjustment:</b> +${esc(f.rainfall_modifier_points??0)} points (experimental)</div>`);
    if(f.evidence?.roughness?.ppe!=null)meta.push(`<div><b>SmartRoadSense PPE:</b> ${esc(f.evidence.roughness.ppe)} (synthetic supplied value; not an IRI measurement)</div>`);
    if(f.evidence?.weather?.precipitation_mm_day!=null)meta.push(`<div><b>Daily rainfall:</b> ${esc(f.evidence.weather.precipitation_mm_day)} mm/day (${esc(f.evidence.weather.source||'source unspecified')}; synthetic demo input)</div>`);
    const dets=f.evidence?.vision?.["detections_above_confidence_0.25"]||p.vision_detections_from_model||[];
    if(dets.length)meta.push(`<div><b>Real YOLO detections:</b> ${dets.map(d=>`${esc(d.defect)} — ${esc(confidenceAsPercent(d.confidence))} box confidence`).join('; ')}. Box confidence is <strong>not</strong> the road condition score.</div>`);
    if(p.real_vision_image)meta.push(`<div><b>Vision source filename:</b> ${esc(p.real_vision_image)} (matching original and annotated images are included in the visual-evidence panel)</div>`);
    if(f.limitations?.length)meta.push(`<div class="limitations"><b>Fusion limitations (from provenance)</b><ul>${f.limitations.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div>`);
    if(p.warning)meta.push(`<div><b>Objective 2 warning:</b> ${esc(p.warning)}</div>`);
    if(f.same_place_time_asserted===true)meta.push('<div><b>Provenance clarification:</b> The source payload sets same_place_time_asserted=true, but also explicitly states its modalities were NOT matched. RoadScope does not interpret this flag as evidence of real spatial/temporal alignment.</div>');
  }else{
    if(r.rainfall_modifier_points!=null)meta.push(`<div><b>Supplied rainfall modifier:</b> ${esc(r.rainfall_modifier_points)} points; contextual only</div>`);
    if(r.model_confidence!=null)meta.push(`<div><b>Supplied YOLO box confidence:</b> ${esc(r.model_confidence)}% (not risk accuracy)</div>`);
    if(isDemo(r))meta.push(datasetMode==='hybrid'?'<div>Full fusion weights, detection list and limitations require the accompanying provenance JSON. Attach it using the sidebar.</div>':'<div>These values are manually assigned for interface testing. No trained model evaluation or measured road severity is represented.</div>');
  }
  $('evidenceMetadata').innerHTML=meta.length?`<details class="provenance-expand"><summary>Scoring details, inputs & provenance</summary><div class="provenance-body">${meta.join('')}</div></details>`:'';
  updateHealth(r);
}

function updateHealth(r){
  const p=r.provenance?.source_input;
  const realVision=!!(p?.vision_detections_from_model?.length);
  const mode=datasetMode==='hybrid'?'HYBRID INPUTS':['synthetic_route','scored_simulation'].includes(datasetMode)?'SCENARIO INPUTS':isDemo(r)?'SCENARIO DATA':imported?'IMPORTED DATA':'SCENARIO DATA';
  $('healthTag').textContent=mode;
  const cells=[
    ['GPS',validity(r),isDemo(r)||/SIMULATED/i.test(r.gps_status)?'Simulated GPS coordinates':'Coordinate fields supplied'],
    ['IMU',r.imu_score!=null||!!r.imu_status,r.imu_status==='synthetic_evidence'||isDemo(r)?'Simulated model/sensor input':'Model evidence or sensor status supplied'],
    ['Camera / vision',r.vision_score!=null||!!r.camera_status,realVision?'YOLO detection evidence provided':isDemo(r)?'Simulated visual evidence':'Visual evidence fields present'],
    ['Roughness',r.roughness_score!=null,r.roughness_score!=null?(isDemo(r)?'Simulated roughness input':'Roughness score supplied'):'No roughness evidence'],
    ['Weather/context',r.rainfall_mm_day!=null||r.context_score!=null||!!r.rain_state,r.rainfall_mm_day!=null&&isDemo(r)?'Simulated rainfall input':'Weather/context fields supplied']
  ];
  $('healthGrid').innerHTML=cells.map(([label,ok,description])=>`<div class="health-cell"><span class="health-indicator ${ok?'present':'absent'}"></span><b>${esc(label)}</b><span>${ok?'DATA / METADATA PRESENT':'NOT PROVIDED'}</span><small>${esc(description)}</small></div>`).join('');
  $('healthFoot').textContent='This panel tracks data availability; hardware connectivity is a separate measurement.';
}


// A faithful display adapter for Objective 2's 8-row synthetic ESP32 sample CSV.
// Deliberately does not call these values actual hardware measurements or GPS fixes.
function renderSyntheticTelemetry(r){
  const grid=$('sensorTelemetryGrid');
  if(!grid)return;
  const sample=['synthetic_route','scored_simulation'].includes(datasetMode)?syntheticSensorById.get(r.id):null;
  $('sensorTelemetryTag').textContent=sample?'SIMULATED SENSOR DATA':'NO TELEMETRY LINKED';
  if(!sample){
    $('sensorTelemetrySummary').textContent=datasetMode==='hybrid'?'This independent image-assessment case has no linked ESP32 stream.':'Sensor records are available for the route and scored network datasets.';
    grid.innerHTML='<div class="telemetry-placeholder">No linked, recorded ESP32 sensor readings for this observation. Sensor data availability and physical hardware health are different.</div>';
    return;
  }
  if(datasetMode==='scored_simulation'){
    const fields=[
      ['GPS status',sample.gps_fix_quality],['GPS uncertainty (simulated m)',sample.gps_uncertainty_m_simulated],
      ['IMU ax (g)',sample.ax_g_simulated],['IMU ay (g)',sample.ay_g_simulated],['IMU az (g)',sample.az_g_simulated],
      ['Gyroscope X (°/s)',sample.gx_dps_simulated],['Gyroscope Y (°/s)',sample.gy_dps_simulated],['Gyroscope Z (°/s)',sample.gz_dps_simulated],
      ['Vibration (g)',sample.vibration_g_simulated],['Rain ADC (12-bit)',sample.rain_adc_12bit_simulated],
      ['Rain state',sample.rain_state_simulated],['Temperature (°C)',sample.temperature_c_simulated],
      ['Humidity (%)',sample.humidity_pct_simulated],['Ultrasonic (cm)',sample.ultrasonic_cm_simulated],
      ['Light state',sample.light_state_simulated],['PPE proxy',sample.ppe_proxy_simulated],
      ['Weather rainfall (mm/day)',sample.weather_rain_mm_day_simulated]
    ];
    const traces=imuTraceById.get(r.id)||[];
    $('sensorTelemetrySummary').textContent=`${r.id} · ${sample.timestamp_ist_simulated} · ${sample.gps_fix_quality} · ${traces.length} synthetic 2Hz IMU samples · simulated input stream`;
    grid.innerHTML=fields.map(([k,v])=>`<div class="telemetry-card"><small>${esc(k)}</small><strong>${esc(v||'Not supplied')}</strong></div>`).join('');
    return;
  }
  const f=[
    ['Simulated GPS fix',sample.gps_fix],
    ['Simulated satellites',sample.satellites_SIMULATED],
    ['IMU ax (g)',sample.imu_ax_g_SIMULATED],
    ['IMU ay (g)',sample.imu_ay_g_SIMULATED],
    ['IMU az (g)',sample.imu_az_g_SIMULATED],
    ['Gyroscope X (°/s)',sample.gyro_x_dps_SIMULATED],
    ['Rain ADC',sample.rain_adc_SIMULATED],
    ['Rain state',sample.rain_state_SIMULATED],
    ['Temperature (°C)',sample.temperature_c_SIMULATED],
    ['Humidity (%)',sample.humidity_percent_SIMULATED],
    ['Ultrasonic (cm)',sample.ultrasonic_distance_cm_SIMULATED],
    ['LDR light',sample.ldr_light_state_SIMULATED]
  ];
  $('sensorTelemetrySummary').textContent=`${r.id} · ${sample.timestamp_SIMULATED_IST} · ${sample.gps_fix} · simulated input values`;
  grid.innerHTML=f.map(([k,v])=>`<div class="telemetry-card"><small>${esc(k)}</small><strong>${esc(v||'Not supplied')}</strong></div>`).join('');
}

function renderQueue(){
  const rows=sortedQueue();let ranked=0;
  $('queueRows').innerHTML=rows.slice(0,200).map(r=>{
    const unassessed=r.risk_level==='Not assessed';
    const priority=unassessed?'UNRANKED':`#${++ranked}`;
    return `<tr><td><strong>${priority}</strong></td><td>${esc(r.name)}<small class="cell-sub">${esc(r.id)} · ${isDemo(r)?'SIMULATED':'IMPORTED DATA'}</small></td><td><span class="risk-badge ${r.risk_level.replaceAll(' ','-')}">${esc(riskLabel(r))}</span></td><td>${esc(scoreText(r))}</td><td>${available(r)}/3 primary evidence fields</td><td><button class="inspect" data-qid="${esc(r.id)}">Inspect ↗</button></td></tr>`;
  }).join('');
  $('queueRows').querySelectorAll('[data-qid]').forEach(btn=>btn.onclick=()=>{choose(btn.dataset.qid);document.querySelector('.map-card').scrollIntoView({behavior:'smooth'})});
}

// A replay is only available for a single identifiable run with real timestamps.
function replayRuns(){
  const groups=new Map();
  filtered().filter(r=>r.run_id&&validity(r)&&timestampValid(r)).forEach(r=>{
    const group=groups.get(r.run_id)||[];group.push(r);groups.set(r.run_id,group);
  });
  return groups;
}
function chronological(){
  const run=$('replayRun').value;
  return (replayRuns().get(run)||[]).slice().sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp)||a.id.localeCompare(b.id));
}
// Miniature vehicle used only to display the position of a timestamped replay record.
// It follows input GPS/scenario points; interpolation is a visual transition, NOT a real GPS sample.
function replayHeading(a,b){
  if(!a||!b)return 0;
  const rad=Math.PI/180, lat1=a.latitude*rad,lat2=b.latitude*rad,lon=(b.longitude-a.longitude)*rad;
  const y=Math.sin(lon)*Math.cos(lat2),x=Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(lon);
  return (Math.atan2(y,x)/rad+360)%360;
}
function replayVehicleIcon(heading){
  return L.divIcon({className:'roadscope-replay-car-icon',iconSize:[42,46],iconAnchor:[21,23],heading,
    html:`<div class="roadscope-car-body" style="transform:rotate(${heading.toFixed(1)}deg)"><svg viewBox="0 0 40 46" width="40" height="46" role="img" aria-label="Journey position"><rect x="9" y="4" width="22" height="38" rx="8" fill="#071a2f" stroke="white" stroke-width="2.2"/><rect x="12" y="7" width="16" height="32" rx="6" fill="#1677b8"/><path d="M13 14 L27 14 L25 20 L15 20 Z" fill="#c9f1ff"/><path d="M14 29 L26 29 L27 34 L13 34 Z" fill="#81b7d7"/><rect x="10" y="6" width="5" height="4" rx="1" fill="#ffe29a"/><rect x="25" y="6" width="5" height="4" rx="1" fill="#ffe29a"/><rect x="10" y="36" width="5" height="4" rx="1" fill="#ff6b70"/><rect x="25" y="36" width="5" height="4" rx="1" fill="#ff6b70"/></svg></div>`});
}
function cancelReplayCarMotion(){
  replayCarToken++;
  if(replayCarFrame!=null&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(replayCarFrame);
  replayCarFrame=null;
}
function removeReplayCar(){
  cancelReplayCarMotion();
  if(map&&replayCursor)map.removeLayer(replayCursor);
  replayCursor=null;replayCarPoint=null;
}
function showReplayCar(position,heading,animate=false){
  if(!map||typeof L==='undefined')return;
  cancelReplayCarMotion();
  const supportsCar=typeof L.marker==='function'&&typeof L.divIcon==='function';
  if(!replayCursor){
    replayCursor=supportsCar
      ?L.marker(position,{icon:replayVehicleIcon(heading),interactive:false,keyboard:false,zIndexOffset:2000}).addTo(map)
      :L.circleMarker(position,{radius:13,color:'#ffffff',weight:3,fillColor:'#177ab6',fillOpacity:1}).addTo(map);
    replayCarPoint=position.slice();return;
  }
  if(typeof replayCursor.setIcon==='function'&&supportsCar)replayCursor.setIcon(replayVehicleIcon(heading));
  const from=replayCarPoint||position;
  const canAnimate=animate&&!window.__RoadScopeOfflineMap&&typeof requestAnimationFrame==='function'&&typeof replayCursor.setLatLng==='function';
  if(!canAnimate){
    if(typeof replayCursor.setLatLng==='function')replayCursor.setLatLng(position);
    else{map.removeLayer(replayCursor);replayCursor=L.circleMarker(position,{radius:13,color:'#ffffff',weight:3,fillColor:'#177ab6',fillOpacity:1}).addTo(map)}
    replayCarPoint=position.slice();return;
  }
  const token=++replayCarToken;
  const started=performance.now(),duration=640;
  const tick=now=>{
    if(token!==replayCarToken)return;
    const f=Math.min(1,Math.max(0,(now-started)/duration)),e=f*f*(3-2*f);
    replayCursor.setLatLng([from[0]+(position[0]-from[0])*e,from[1]+(position[1]-from[1])*e]);
    if(f<1)replayCarFrame=requestAnimationFrame(tick);else{replayCarFrame=null;replayCarPoint=position.slice()}
  };
  replayCarPoint=position.slice();
  replayCarFrame=requestAnimationFrame(tick);
}
function stopReplay(){
  if(replayTimer){clearInterval(replayTimer);replayTimer=null}
  cancelReplayCarMotion();
  // Pausing finishes the current waypoint transition, keeping the car synchronized
  // with the selected observation instead of leaving it halfway between points.
  if(replayCursor&&replayCarPoint&&typeof replayCursor.setLatLng==='function')replayCursor.setLatLng(replayCarPoint);
  $('playBtn').textContent='▶ Play';
}
function seekReplay(index,animate=false){
  const seq=chronological();if(!seq.length){$('replaySummary').textContent='No eligible recorded run. This sample is not a journey.';removeReplayCar();return}
  replayIndex=Math.max(0,Math.min(seq.length-1,index));$('replaySeek').value=replayIndex;$('replayCount').textContent=`${replayIndex+1} / ${seq.length}`;
  const r=seq[replayIndex],prev=seq[Math.max(0,replayIndex-1)],next=seq[Math.min(seq.length-1,replayIndex+1)];
  $('replaySummary').innerHTML=`<strong>🚙 ${esc(r.name)}</strong> <span class="risk-badge ${r.risk_level.replaceAll(' ','-')}">${esc(riskLabel(r))}</span><span>${esc(formattedObserved(r))}</span><span>${esc(scoreText(r))}</span>${isDemo(r)?'<span class="demo-mini">SIMULATED RUN</span>':''}`;
  choose(r.id,{centerMap:false});
  showReplayCar([r.latitude,r.longitude],replayHeading(replayIndex===0?r:prev,replayIndex===0?next:r),animate);
}
function setupReplay(){
  stopReplay();const groups=replayRuns(),select=$('replayRun'),old=select.value;
  const runIds=[...groups.keys()].sort();select.innerHTML=runIds.map(id=>`<option value="${esc(id)}">${esc(id)}</option>`).join('');
  if(runIds.includes(old))select.value=old;
  const seq=chronological(),n=seq.length,replayAvailable=n>=2;
  $('replaySeek').max=Math.max(0,n-1);$('replaySeek').disabled=n===0;
  $('playBtn').disabled=!replayAvailable;$('stepBtn').disabled=!replayAvailable;
  $('replayDescription').textContent=runIds.length
    ?`${n} timestamped observations from run ${select.value}. ${seq.some(isDemo)?'Scenario dataset.':'Not map-matched; validate GPS track.'} Never connects separate run IDs.`
    :'Unavailable for this dataset: a journey needs a valid timestamp, GPS and a shared run_id. The hybrid demo has none; no route will be invented.';
  if(map&&typeof L!=='undefined'){
    if(replayPath)map.removeLayer(replayPath);removeReplayCar();
    replayPath=replayAvailable?L.polyline(seq.map(x=>[x.latitude,x.longitude]),{color:'#1c6eaa',weight:3,opacity:.65,dashArray:'7,7'}).addTo(map):null;
  }
  if(n)seekReplay(0);else{$('replayCount').textContent='0 / 0';$('replaySummary').textContent='Journey replay unavailable: no eligible run.'}
}

function runIds(segment){
  const grouped=observations.filter(r=>r.group===segment&&r.run_id);
  const ids=[...new Set(grouped.map(r=>r.run_id))];
  return ids.filter(id=>grouped.filter(r=>r.run_id===id).every(timestampValid)).sort((a,b)=>{
    const first=id=>Math.min(...grouped.filter(r=>r.run_id===id).map(r=>Date.parse(r.timestamp)));
    return first(a)-first(b);
  });
}
function configureCompare(){
  const all=[...new Set(observations.filter(r=>r.group&&r.run_id).map(r=>r.group))].sort();
  const segs=all.filter(s=>runIds(s).length>=2),seg=$('compareSegment'),old=seg.value;
  seg.innerHTML=segs.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('');
  if(segs.includes(old))seg.value=old;
  populateRuns();$('compareBtn').disabled=!segs.length;
  if(!segs.length)$('compareResult').textContent='Comparison unavailable: provide at least two different run_id values for the same real segment_id. This hybrid demo has neither. No before/after claim is made.';
}
function populateRuns(){
  const runs=runIds($('compareSegment').value);
  for(const id of ['compareBefore','compareAfter'])$(id).innerHTML=runs.map(r=>`<option value="${esc(r)}">${esc(r)}</option>`).join('');
  if(runs.length>1)$('compareAfter').selectedIndex=1;
}
function getRunRecord(seg,run){
  const matches=observations.filter(r=>r.group===seg&&r.run_id===run);
  if(!matches.length)return null;
  const scores=matches.map(r=>r.risk_score).filter(x=>x!=null);
  const worst=[...matches].sort((a,b)=>riskRank(b)-riskRank(a))[0];
  const dated=matches.filter(timestampValid).map(r=>r.timestamp).sort((a,b)=>Date.parse(a)-Date.parse(b));
  return {records:matches.length,avg:scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:null,level:riskLabel(worst),demo:matches.some(isDemo),firstTimestamp:dated[0]||null,lastTimestamp:dated.at(-1)||null};
}
function compareRuns(){
  const seg=$('compareSegment').value,a=$('compareBefore').value,b=$('compareAfter').value;
  if(!seg||!a||!b||a===b){$('compareResult').textContent='Select one segment and two different recorded runs. For imported datasets, provide matching segment_id and different run_id values.';return}
  const first=getRunRecord(seg,a),last=getRunRecord(seg,b);if(!first||!last)return;
  const times=run=>Math.min(...observations.filter(r=>r.group===seg&&r.run_id===run).map(r=>Date.parse(r.timestamp)));
  if(!Number.isFinite(times(a))||!Number.isFinite(times(b))||times(a)>=times(b)){
    $('compareResult').textContent='Run A must be recorded earlier than run B, with valid timestamps for comparable observations.';return;
  }
  const delta=first.avg!=null&&last.avg!=null?last.avg-first.avg:null;
  $('compareResult').innerHTML=`${first.demo||last.demo?'<p class="demo-callout">Simulated run comparison · risk-index change</p>':''}<div class="compare-cards"><div><small>EARLIER RUN · ${esc(a)}</small><strong>${esc(first.level)}</strong><p>Mean score: ${first.avg==null?'Not provided':first.avg.toFixed(1)} · ${first.records} observations</p><p>First observation: ${esc(first.firstTimestamp?formattedObserved({timestamp:first.firstTimestamp}):'Unknown')}</p></div><div><small>LATER RUN · ${esc(b)}</small><strong>${esc(last.level)}</strong><p>Mean score: ${last.avg==null?'Not provided':last.avg.toFixed(1)} · ${last.records} observations</p><p>First observation: ${esc(last.firstTimestamp?formattedObserved({timestamp:last.firstTimestamp}):'Unknown')}</p></div><div><small>SCORE DIFFERENCE · B − A</small><strong>${delta==null?'Unavailable':(delta>0?'+':'')+delta.toFixed(1)}</strong><p>${delta==null?'Scores missing':delta>0?'Higher reported score in run B':delta<0?'Lower reported score in run B':'No mean-score change'}</p></div></div>`;
}

function csvEscape(v){let s=String(v??'');if(/^[\s]*[=+@\-\t\r]/.test(s)&&isNaN(Number(s)))s="'"+s;return '"'+s.replaceAll('"','""')+'"'}
function downloadText(filename,text,mime){const blob=new Blob([text],{type:mime+';charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)}
function saveQueue(){
  const headers=['priority','id','name','latitude','longitude','risk_level','original_risk_level','assessment_status','risk_score','timestamp','segment_id','run_id','imu_score','vision_score','roughness_score','context_score','source_mode','location_mode','demo','model_confidence','defect_type','rainfall_modifier_points','rainfall_mm_day','note'];
  let rank=0;const rows=sortedQueue().map(r=>headers.map(h=>h==='priority'?(r.risk_level==='Not assessed'?'UNRANKED':++rank):csvValue(r,h)));
  downloadText('roadscope_inspection_priorities.csv',[headers,...rows].map(row=>row.map(csvEscape).join(',')).join('\r\n'),'text/csv');
}
function printReport(){
  const rows=sortedQueue();let rank=0;
  const table=rows.map(r=>`<tr><td>${r.risk_level==='Not assessed'?'UNRANKED':++rank}</td><td>${esc(r.id)} — ${esc(r.name)}</td><td>${esc(riskLabel(r))}<br><small>Status: ${esc(r.assessment_status)}</small></td><td>${esc(scoreText(r))}</td><td>${esc(r.latitude.toFixed(5))}, ${esc(r.longitude.toFixed(5))} ${isDemo(r)?'(DEMO)':''}</td><td>${esc(r.timestamp)}</td><td>${esc(shortSource(r))}<br>${esc(r.note)}</td></tr>`).join('');
  const hasDemo=rows.some(isDemo);
  const reportSource=datasetMode==='hybrid'?'Hybrid ML case (simulated supporting inputs)':hasDemo?'Simulated assessment dataset':imported?'Imported observations':'Sample dataset';
  const demoWarning=datasetMode==='hybrid'?'YOLO detections originate from a real inference image. Supporting IMU, roughness, rainfall and coordinates are simulated.':'Coordinates, sensor records, timestamps and risk assessments were generated for a software simulation.';
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>RoadScope Inspection Report</title><style>body{font:13px Arial;color:#1a2e44;padding:24px}h1{font-size:25px}h2{font-size:17px}table{border-collapse:collapse;width:100%;font-size:11px}td,th{padding:8px;border:1px solid #bac5d2;text-align:left;vertical-align:top}th{background:#eaf0f7}p{line-height:1.6}.source-statement{padding:10px;border-left:3px solid #527ca0;background:#f0f5f9}small{color:#52677b}@page{size:A4 landscape;margin:14mm}</style></head><body><h1>RoadScope · Road Inspection Priority Report</h1><p><strong>Source:</strong> ${esc(reportSource)} &nbsp; <strong>Generated:</strong> ${esc(new Date().toLocaleString())} &nbsp; <strong>Records:</strong> ${rows.length}</p>${hasDemo?'<p class="source-statement"><b>Dataset:</b> '+esc(demoWarning)+'</p>':''}<p>Risk indices are project-defined screening scores. Unassessed records are unranked; the original ML class is preserved alongside the display class.</p><h2>Inspection screening queue</h2><table><thead><tr><th>Priority</th><th>Observation</th><th>Map / Original risk</th><th>Score</th><th>Coordinates</th><th>Observed at</th><th>Evidence, provenance and warning</th></tr></thead><tbody>${table}</tbody></table><p><small>Generated from the selected RoadScope dataset. Consult the source provenance file for acquisition details and scoring methodology.</small></p></body></html>`;
  const win=window.open('','_blank');if(!win){alert('Allow popups to open the printable report.');return}
  win.document.open();win.document.write(html);win.document.close();win.focus();setTimeout(()=>win.print(),350);
}
function enhanceRefresh(){
  renderQueue();setupReplay();configureCompare();
  $('reportInfo').textContent=`${filtered().length} filtered observations · ${observations.some(isDemo)?'SIMULATED':imported?'Imported / unverified':'Synthetic dashboard example'}`;
  if(selected)enhanceSelection(selected);
}
$('replayRun').onchange=()=>{setupReplay();const seq=chronological();if(map&&seq.length>=2&&typeof L!=='undefined')map.fitBounds(L.latLngBounds(seq.map(r=>[r.latitude,r.longitude])),{padding:[46,46],maxZoom:15})};
$('playBtn').onclick=()=>{
  if(replayTimer){stopReplay();return}
  const seq=chronological();if(seq.length<2)return;if(replayIndex>=seq.length-1)seekReplay(0);
  $('playBtn').textContent='❚❚ Pause';replayTimer=setInterval(()=>{if(replayIndex>=chronological().length-1){stopReplay();return}seekReplay(replayIndex+1,true)},850);
};
$('stepBtn').onclick=()=>{stopReplay();const n=chronological().length;if(n)seekReplay((replayIndex+1)%n,true)};
$('replaySeek').oninput=e=>{stopReplay();seekReplay(Number(e.target.value))};
$('compareSegment').onchange=populateRuns;$('compareBtn').onclick=compareRuns;
$('downloadQueue').onclick=saveQueue;$('printReport').onclick=printReport;$('reportBtn').onclick=printReport;
// Base app initialises before enhancements.js is loaded.
enhanceRefresh();if(selected)enhanceSelection(selected);
