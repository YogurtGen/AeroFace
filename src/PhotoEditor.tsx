import { useRef, useState, type PointerEvent } from 'react';
import { ChevronLeft, ChevronRight, Crosshair, ScanFace } from 'lucide-react';
import { definitions, type Metric, type Point, type Side } from './analysis';
import type { Photo } from './photos';

export default function PhotoEditor({ photo, side, selectedMetric, editing, selectedPoint, onSelectPoint, onChange, zoom }: {
  photo: Photo; side: Side; selectedMetric?: Metric; editing: boolean; selectedPoint: string;
  onSelectPoint: (id: string) => void; onChange: (key: string, point: Point) => void; zoom: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null), dragging = useRef<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const defs = definitions[side];
  const pointFromPointer = (event: PointerEvent<SVGSVGElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) };
  };
  const update = (key: string, point: Point) => { onChange(key, point); setAnnouncement(`${defs.find(d=>d.id===key)?.label} diperbarui.`); };
  const place = (event: PointerEvent<SVGSVGElement>) => {
    if (!editing || event.target !== event.currentTarget) return;
    update(selectedPoint, pointFromPointer(event));
    const next = defs.find(def => def.id !== selectedPoint && !photo.points[def.id]);
    if (next) onSelectPoint(next.id);
  };
  const activePoints = selectedMetric?.points ?? Object.keys(photo.points);
  const segments = selectedMetric?.segments ?? (side === 'front'
    ? [['eyeLO','eyeLI','eyeRI','eyeRO'],['cheekL','cheekR'],['jawL','chin','jawR'],['noseBase','chin']]
    : [['nasion','noseTip','noseBase','upperLip','lowerLip','chin'],['ramusTop','jawAngle','chin']]);
  return <>
    <div className={`photo-canvas ${editing ? 'is-editing' : ''}`}>
      <div className="photo-image-wrap" style={{ aspectRatio: `${photo.width}/${photo.height}`, width: `min(100%, calc(var(--photo-height) * ${photo.width/photo.height}))`, transform: `scale(${zoom})` }}>
        <img src={photo.url} alt={`Foto ${side === 'front' ? 'depan' : 'samping'} yang dipilih, hanya tersimpan dalam sesi ini`} draggable={false}/>
        <svg ref={svgRef} className="measurement-overlay" viewBox={`0 0 ${photo.width} ${photo.height}`} aria-label="Editor titik ukur wajah" onPointerDown={place}
          onPointerMove={event=>{if(dragging.current) update(dragging.current,pointFromPointer(event));}}
          onPointerUp={event=>{dragging.current=null; if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}}
          onPointerCancel={()=>{dragging.current=null;}}>
          <g className="measurement-lines" key={selectedMetric?.id ?? 'all'} pointerEvents="none">
            {segments.filter(segment=>segment.every(key=>photo.points[key])).map((segment,index)=><polyline key={index} points={segment.map(key=>`${photo.points[key].x*photo.width},${photo.points[key].y*photo.height}`).join(' ')} fill="none" stroke="#4b99ff" strokeWidth="2" vectorEffect="non-scaling-stroke"/>) }
          </g>
          {defs.filter(def=>photo.points[def.id]).map((def,index)=>{
            const point=photo.points[def.id], active=activePoints.includes(def.id), selected=editing && selectedPoint===def.id;
            return <g key={def.id} className={`measure-point ${active?'active':'dimmed'} ${selected?'selected':''}`} role={editing?'button':undefined} tabIndex={editing?0:undefined} aria-label={`${def.label}. Gunakan tombol panah untuk menggeser.`}
              onFocus={()=>onSelectPoint(def.id)}
              onKeyDown={event=>{if(!editing||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();const delta=event.shiftKey?.01:.002;update(def.id,{x:Math.max(0,Math.min(1,point.x+(event.key==='ArrowRight'?delta:event.key==='ArrowLeft'?-delta:0))),y:Math.max(0,Math.min(1,point.y+(event.key==='ArrowDown'?delta:event.key==='ArrowUp'?-delta:0)))});}}
              onPointerDown={event=>{if(!editing)return;event.stopPropagation();onSelectPoint(def.id);dragging.current=def.id;svgRef.current?.setPointerCapture(event.pointerId);}}>
              <circle cx={point.x*photo.width} cy={point.y*photo.height} r={Math.max(9,photo.width*.018)} fill="transparent"/>
              <circle cx={point.x*photo.width} cy={point.y*photo.height} r={Math.max(3.2,photo.width*.006)} fill={selected?'#fff':'#438dff'} stroke={selected?'#2862c9':'#fff'} strokeWidth="2" vectorEffect="non-scaling-stroke"/>
              {editing&&<text x={point.x*photo.width+photo.width*.016} y={point.y*photo.height-photo.height*.012} fontSize={Math.max(13,photo.width*.025)} fill="white" paintOrder="stroke" stroke="#152131" strokeWidth="3" strokeLinejoin="round">{index+1}</text>}
            </g>;
          })}
        </svg>
      </div>
      <div className="photo-corner top-left"/><div className="photo-corner top-right"/><div className="photo-corner bottom-left"/><div className="photo-corner bottom-right"/>
    </div>
    {editing&&<div className="point-toolbar">
      <div className="point-toolbar-heading"><Crosshair size={16}/><span>{Object.keys(photo.points).length}/{defs.length} titik ditempatkan</span><ScanFace size={16}/></div>
      <label htmlFor="point-selector">Titik aktif</label>
      <div className="point-selector-row">
        <button className="icon-button" aria-label="Titik sebelumnya" onClick={()=>onSelectPoint(defs[(defs.findIndex(d=>d.id===selectedPoint)-1+defs.length)%defs.length].id)}><ChevronLeft size={18}/></button>
        <select id="point-selector" value={selectedPoint} onChange={event=>onSelectPoint(event.target.value)}>{defs.map((def,index)=><option key={def.id} value={def.id}>{index+1}. {def.label} {photo.points[def.id]?'✓':''}</option>)}</select>
        <button className="icon-button" aria-label="Titik berikutnya" onClick={()=>onSelectPoint(defs[(defs.findIndex(d=>d.id===selectedPoint)+1)%defs.length].id)}><ChevronRight size={18}/></button>
      </div>
      <p>{defs.find(def=>def.id===selectedPoint)?.hint} Ketuk foto untuk menempatkan, atau geser titik yang sudah ada.</p>
    </div>}
    <span className="sr-only" role="status">{announcement}</span>
  </>;
}
