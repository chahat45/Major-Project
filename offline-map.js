/* RoadScope offline contingency. Loaded only when Leaflet's CDN cannot be reached.
   Draws a labelled coordinate plot, NOT a street basemap or verified road geometry.
   Implements the subset of Leaflet used by the existing dashboard. */
(function () {
  if (typeof window.L !== 'undefined') return;
  window.__RoadScopeOfflineMap = true;
  const NS = 'http://www.w3.org/2000/svg';
  const node = (tag, attrs = {}, text) => {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
    if (text !== undefined) el.textContent = String(text);
    return el;
  };
  let active = null;
  function makeMap(id) {
    const container = document.getElementById(id);
    const svg = node('svg', {viewBox:'0 0 960 520',preserveAspectRatio:'none',class:'offline-coordinate-map',role:'img','aria-label':'Offline coordinate plot with clickable road-risk observations'});
    container.replaceChildren(svg);
    const map = {
      _layers: [], _center:[30.91,75.85], _span:[.047,.075], _zoom:13,_batchDepth:0,_dirty:false,
      setView(c,z){this._center=[...c];this._zoom=z||this._zoom;this.draw();return this},
      getZoom(){return this._zoom},
      invalidateSize(){this.draw();return this},
      flyTo(c){this._center=[...c];this.draw();return this},
      fitBounds(bounds){
        const pts=bounds.points||bounds||[];
        if (!pts.length) return this;
        let lowLat=Math.min(...pts.map(p=>p[0])),highLat=Math.max(...pts.map(p=>p[0]));
        let lowLon=Math.min(...pts.map(p=>p[1])),highLon=Math.max(...pts.map(p=>p[1]));
        this._center=[(lowLat+highLat)/2,(lowLon+highLon)/2];
        this._span=[Math.max(.0015,(highLat-lowLat)*1.55),Math.max(.0020,(highLon-lowLon)*1.55)];
        this.draw();return this;
      },
      beginBatch(){this._batchDepth++},
      endBatch(){this._batchDepth=Math.max(0,this._batchDepth-1);if(!this._batchDepth&&this._dirty){this._dirty=false;this.draw()}},
      removeLayer(layer){this._layers=this._layers.filter(x=>x!==layer);if(this._batchDepth)this._dirty=true;else this.draw();return this},
      _add(layer){if(!this._layers.includes(layer))this._layers.push(layer);if(this._batchDepth)this._dirty=true;else this.draw()},
      draw(){
        svg.replaceChildren();
        svg.append(node('rect',{x:0,y:0,width:960,height:520,fill:'#1e2e42'}));
        const minLat=this._center[0]-this._span[0]/2,maxLat=this._center[0]+this._span[0]/2;
        const minLon=this._center[1]-this._span[1]/2,maxLon=this._center[1]+this._span[1]/2;
        const xy=p=>[48+(p[1]-minLon)/(maxLon-minLon)*864,465-(p[0]-minLat)/(maxLat-minLat)*402];
        for(let i=0;i<=8;i++){
          const x=48+i*108;svg.append(node('line',{x1:x,y1:44,x2:x,y2:465,stroke:'#334a61','stroke-width':1}));
          if(i%2===0)svg.append(node('text',{x:x+3,y:483,fill:'#9bb6ce','font-size':11},(minLon+i/8*(maxLon-minLon)).toFixed(4)+'°E'));
        }
        for(let i=0;i<=6;i++){
          const y=465-i*67;svg.append(node('line',{x1:48,y1:y,x2:912,y2:y,stroke:'#334a61','stroke-width':1}));
          if(i%2===0)svg.append(node('text',{x:5,y:y-4,fill:'#9bb6ce','font-size':11},(minLat+i/6*(maxLat-minLat)).toFixed(4)+'°N'));
        }
        svg.append(node('rect',{x:48,y:44,width:864,height:421,fill:'none',stroke:'#5c7991','stroke-width':1.5}));
        svg.append(node('text',{x:66,y:25,fill:'#d6e5f2','font-size':16,'font-weight':'700'},'OFFLINE GPS COORDINATE VIEW'));
        svg.append(node('text',{x:894,y:25,fill:'#aac0d2','text-anchor':'end','font-size':12},'NOT A STREET MAP · PLACEHOLDER LOCATIONS LABELED'));
        this._layers.forEach(l=>{
          if(l.kind==='line' && l.points.length>1){
            const pts=l.points.map(p=>xy(p).join(',')).join(' ');
            const line=node('polyline',{points:pts,fill:'none',stroke:l.options.color||'#416d99','stroke-width':l.options.weight||4,'stroke-dasharray':l.options.dashArray||'none',opacity:l.options.opacity||1});
            svg.append(line);
          }
        });
        this._layers.forEach(l=>{
          if(l.kind!=='marker'&&l.kind!=='vehicle')return;
          const [x,y]=xy(l.point);
          if(x<0||x>960||y<0||y>520)return;
          if(l.kind==='vehicle'){
            const angle=Number(l.options?.icon?.options?.heading)||0;
            const car=node('g',{class:'offline-vehicle',transform:`translate(${x} ${y}) rotate(${angle})`,'aria-label':'Current journey position'});
            car.append(node('rect',{x:-10,y:-18,width:20,height:36,rx:7,fill:'#0b2847',stroke:'#fff','stroke-width':2.5}));
            car.append(node('rect',{x:-7,y:-14,width:14,height:28,rx:5,fill:'#1487c6'}));
            car.append(node('path',{d:'M-6 -9 L6 -9 L4 -3 L-4 -3Z',fill:'#e2f5ff'}));
            car.append(node('rect',{x:-7,y:-16,width:5,height:4,fill:'#ffe29a'}));
            car.append(node('rect',{x:2,y:-16,width:5,height:4,fill:'#ffe29a'}));
            svg.append(car);return;
          }
          const group=node('g',{role:'button',tabindex:'0','aria-label':l.tooltip||'Select observation'});
          const circle=node('circle',{cx:x,cy:y,r:l.options.radius||8,fill:l.options.fillColor||'#ef6673',stroke:l.options.color||'#18334f','stroke-width':l.options.weight||2,'stroke-dasharray':l.options.dashArray||'none',opacity:l.options.fillOpacity||1});
          group.append(circle);
          group.append(node('title',{},l.tooltip||`${l.point[0]}, ${l.point[1]}`));
          group.style.cursor='pointer';
          if(l.click){group.addEventListener('click',l.click);group.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();l.click()}})}
          svg.append(group);
        });
      }
    };
    active=map;map.draw();
    return map;
  }
  function object(kind,point,options={}) {
    return {kind,point,points:kind==='line'?point:null,options,tooltip:'',click:null,_map:null,
      addTo(dest){const m=dest?._map||dest||active;if(dest?._items)dest._items.push(this);this._map=m;m?._add(this);return this},
      setLatLng(p){this.point=[...p];this._map?.draw();return this},
      setIcon(icon){this.options.icon=icon;this._map?.draw();return this},
      bindTooltip(text){this.tooltip=String(text);return this},
      on(event,handler){if(event==='click')this.click=handler;return this}
    };
  }
  window.L={
    map:makeMap,
    control:{zoom:()=>({addTo(map){const host=document.getElementById('map');const buttons=document.createElement('div');buttons.className='offline-zoom';buttons.innerHTML='<button type="button" aria-label="Zoom in">+</button><button type="button" aria-label="Zoom out">−</button>';buttons.children[0].onclick=()=>{map._span=map._span.map(x=>x*.65);map.draw()};buttons.children[1].onclick=()=>{map._span=map._span.map(x=>x*1.54);map.draw()};host.append(buttons);return this}})},
    tileLayer:()=>({addTo(){return this},on(){return this}}),
    layerGroup:()=>({_items:[],_map:null,addTo(map){this._map=map;return this},clearLayers(){this._items.forEach(x=>this._map?.removeLayer(x));this._items=[]}}),
    circleMarker:(point,options)=>object('marker',point,options),
    divIcon:options=>({options}),
    marker:(point,options)=>object('vehicle',point,options),
    polyline:(points,options)=>object('line',points,options),
    latLngBounds:points=>({points})
  };
})();
