import { useRef, useState, type PointerEvent } from 'react';
import { ChevronLeft, ChevronRight, Crosshair, ScanFace } from 'lucide-react';
import { definitions, type Metric, type Point, type Side } from './analysis';
import { measurementLines, type MeasurementLine } from './measurement-lines';
import { useI18n } from './i18n';
import type { Photo } from './photos';

export default function PhotoEditor({photo,side,selectedMetric,editing,selectedPoint,onSelectPoint,onChange,zoom,activeLine,onSelectLine}: {
  photo:Photo;side:Side;selectedMetric?:Metric;editing:boolean;selectedPoint:string;
  onSelectPoint:(id:string)=>void;onChange:(key:string,point:Point)=>void;zoom:number;
  activeLine?:MeasurementLine;onSelectLine?:(id:string)=>void;
}) {
  const {t}=useI18n(),svgRef=useRef<SVGSVGElement>(null),dragging=useRef<string|null>(null);
  const [announcement,setAnnouncement]=useState(''),defs=definitions[side];
  const pointFromPointer=(event:PointerEvent<SVGSVGElement>):Point=>{const rect=event.currentTarget.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height))};};
  const update=(key:string,point:Point)=>{onChange(key,point);setAnnouncement(`${t(defs.find(def=>def.id===key)?.label??'')} ${t('updated.')}`);};
  const place=(event:PointerEvent<SVGSVGElement>)=>{if(!editing||event.target!==event.currentTarget)return;update(selectedPoint,pointFromPointer(event));const next=defs.find(def=>def.id!==selectedPoint&&!photo.points[def.id]);if(next)onSelectPoint(next.id);};
  const lines=measurementLines(side,photo.points,photo.width,photo.height).filter(line=>!selectedMetric||line.metricIds.includes(selectedMetric.id));
  const activePoints=selectedMetric?.points??Object.keys(photo.points);
  return <>
    <div className={`photo-canvas ${editing?'is-editing':'is-exploring'} ${photo.source==='auto'?'auto-landmarks':''}`}>
      <div className="photo-image-wrap" style={{aspectRatio:`${photo.width}/${photo.height}`,width:`min(100%, calc(var(--photo-height) * ${photo.width/photo.height}))`,transform:`scale(${zoom})`}}>
        <img src={photo.url} alt={t(side==='front'?'Front photo, kept only in this session':'Side photo, kept only in this session')} draggable={false}/>
        <svg ref={svgRef} className="measurement-overlay" viewBox={`0 0 ${photo.width} ${photo.height}`} aria-label={t('Landmark editor')} onPointerDown={place}
          onPointerMove={event=>{if(dragging.current)update(dragging.current,pointFromPointer(event));}}
          onPointerUp={event=>{dragging.current=null;if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}}
          onPointerCancel={()=>{dragging.current=null;}}>
          <g className="measurement-lines" key={selectedMetric?.id??'all'}>
            {lines.map((line,index)=>{const active=activeLine?.id===line.id;return <g key={line.id} className={`measure-line ${active?'is-active':''} ${line.reference?'is-reference':''}`} style={{animationDelay:`${index*35}ms`}} data-line-id={line.id} role={!editing&&onSelectLine?'button':undefined} tabIndex={!editing&&onSelectLine?0:undefined} aria-label={t(line.name)} aria-pressed={!editing?active:undefined}
              onPointerDown={event=>{if(editing)return;event.stopPropagation();onSelectLine?.(line.id);}}
              onKeyDown={event=>{if(!editing&&(event.key==='Enter'||event.key===' ')){event.preventDefault();onSelectLine?.(line.id);}}}>
              <title>{t(line.name)}</title>
              <line className="line-hit-area" x1={line.from.x*photo.width} y1={line.from.y*photo.height} x2={line.to.x*photo.width} y2={line.to.y*photo.height} stroke="transparent" strokeWidth="18" vectorEffect="non-scaling-stroke" style={{pointerEvents:editing?'none':'stroke'}}/>
              <line className="line-visible" x1={line.from.x*photo.width} y1={line.from.y*photo.height} x2={line.to.x*photo.width} y2={line.to.y*photo.height} stroke={active?'#9acaff':'#4b99ff'} strokeWidth={active?3:1.5} strokeDasharray={line.reference?'5 4':undefined} vectorEffect="non-scaling-stroke" pointerEvents="none"/>
            </g>;})}
          </g>
          {defs.filter(def=>photo.points[def.id]).map((def,index)=>{const point=photo.points[def.id],active=activePoints.includes(def.id),selected=editing&&selectedPoint===def.id;return <g key={def.id} className={`measure-point ${active?'active':'dimmed'} ${selected?'selected':''}`} style={{animationDelay:`${index*35}ms`}} role={editing?'button':undefined} tabIndex={editing?0:undefined} aria-label={`${t(def.label)}. ${t('Use arrow keys to move.')}`} onFocus={()=>onSelectPoint(def.id)}
            onKeyDown={event=>{if(!editing||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();const delta=event.shiftKey?.01:.002;update(def.id,{x:Math.max(0,Math.min(1,point.x+(event.key==='ArrowRight'?delta:event.key==='ArrowLeft'?-delta:0))),y:Math.max(0,Math.min(1,point.y+(event.key==='ArrowDown'?delta:event.key==='ArrowUp'?-delta:0)))});}}
            onPointerDown={event=>{if(!editing)return;event.stopPropagation();onSelectPoint(def.id);dragging.current=def.id;svgRef.current?.setPointerCapture(event.pointerId);}}>
            <circle cx={point.x*photo.width} cy={point.y*photo.height} r={Math.max(9,photo.width*.018)} fill="transparent" pointerEvents={editing?'all':'none'}/>
            <circle cx={point.x*photo.width} cy={point.y*photo.height} r={Math.max(3.2,photo.width*.006)} fill={selected?'#fff':'#438dff'} stroke={selected?'#2862c9':'#fff'} strokeWidth="2" vectorEffect="non-scaling-stroke" pointerEvents={editing?'all':'none'}/>
            {editing&&<text x={point.x*photo.width+photo.width*.016} y={point.y*photo.height-photo.height*.012} fontSize={Math.max(13,photo.width*.025)} fill="white" paintOrder="stroke" stroke="#152131" strokeWidth="3" strokeLinejoin="round" pointerEvents="none">{index+1}</text>}
          </g>;})}
          {!editing&&activeLine&&<g className="line-endpoints" pointerEvents="none">{[activeLine.from,activeLine.to].map((point,index)=><circle key={index} cx={point.x*photo.width} cy={point.y*photo.height} r={photo.width*.011} fill="none" stroke="#d2e8ff" strokeWidth="2" vectorEffect="non-scaling-stroke"/>)}</g>}
        </svg>
        {!editing&&activeLine&&onSelectLine&&<div className="line-caption" key={activeLine.id} style={{left:`clamp(90px,${(activeLine.from.x+activeLine.to.x)*50}%,calc(100% - 90px))`,top:`clamp(22px,${(activeLine.from.y+activeLine.to.y)*50}%,calc(100% - 45px))`}}><span>{t(activeLine.name)}</span><small>{t(activeLine.display)}</small></div>}
      </div>
      <div className="photo-corner top-left"/><div className="photo-corner top-right"/><div className="photo-corner bottom-left"/><div className="photo-corner bottom-right"/>
    </div>
    {editing&&<div className="point-toolbar"><div className="point-toolbar-heading"><Crosshair size={16}/><span>{Object.keys(photo.points).length}/{defs.length} {t('landmarks placed')}</span><ScanFace size={16}/></div><label htmlFor="point-selector">{t('Active point')}</label><div className="point-selector-row"><button className="icon-button" aria-label={t('Previous point')} onClick={()=>onSelectPoint(defs[(defs.findIndex(def=>def.id===selectedPoint)-1+defs.length)%defs.length].id)}><ChevronLeft size={18}/></button><select id="point-selector" value={selectedPoint} onChange={event=>onSelectPoint(event.target.value)}>{defs.map((def,index)=><option key={def.id} value={def.id}>{index+1}. {t(def.label)} {photo.points[def.id]?'✓':''}</option>)}</select><button className="icon-button" aria-label={t('Next point')} onClick={()=>onSelectPoint(defs[(defs.findIndex(def=>def.id===selectedPoint)+1)%defs.length].id)}><ChevronRight size={18}/></button></div><p>{t(defs.find(def=>def.id===selectedPoint)?.hint??'')} {t('Tap to place a point, or drag an existing one.')}</p></div>}
    <span className="sr-only" role="status">{announcement}</span>
  </>;
}
