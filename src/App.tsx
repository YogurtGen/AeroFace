import { useI18n } from './i18n';
import { APPEARANCE_MODEL, predictAppearance, stopAppearance } from './appearance';
import AngleReadings from './AngleReadings';
import RadarChart from './RadarChart';
import { flushSync } from 'react-dom';
import { measurementLines } from './measurement-lines';
import { finishScanAnimation, useIntroMotion } from './motion';
import AnalysisOverlay from './AnalysisOverlay';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { ArrowDownToLine, ArrowLeft, ArrowRight, Check, CheckCheck, ChevronRight, CircleHelp, Crop, Download, FileImage, FileJson, Fingerprint, Focus, ImagePlus, Info, Layers2, LockKeyhole, Maximize2, Monitor, MoveUpRight, RotateCw, ScanFace, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Trash2, Upload, Video, WifiOff, X, ZoomIn, ZoomOut } from 'lucide-react';
import { RUBRIC, SIDE_LABEL, calculateMetrics, definitions, requiredSides, scoreMetrics, scoreText, tierLabel, tiers, totalScore, validatePoints, type Metric, type Mode, type Point, type Side, type RatingReference } from './analysis';
import { detectLandmarks, readPhoto, revokePhoto, stopDetector, transformPhoto, type DetectionPhase, type Photo, type Photos } from './photos';
import { downloadBlob, exportReport, reportData } from './report';
import Illustration from './Illustration';
import PhotoEditor from './PhotoEditor';

const modes: { id: Mode; title: string; subtitle: string }[] = [
  { id: 'front', title: 'Front', subtitle: '1 photo' }, { id: 'profile', title: 'Side', subtitle: '1 photo' }, { id: 'full', title: 'Full', subtitle: '2 photos' },
];
function Brand() { return <span className="brand"><span className="brand-symbol"><svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="m5 23 8-18h3l8 18M8 17h12" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><circle cx="23" cy="5" r="2" fill="currentColor"/></svg></span>AeroFace<span className="brand-dot">.</span></span>; }
function ErrorMessage({ message, onDismiss }: { message: string; onDismiss: () => void }) { const { t } = useI18n(); return <div className="error-message" role="alert"><Info size={18}/><p>{message}</p><button className="icon-button" aria-label={t("Close message")} onClick={onDismiss}><X size={16}/></button></div>; }
function UploadCard({ side, photo, disabled, onFile, onRemove, onCamera }: { side: Side; photo?: Photo; disabled: boolean; onFile: (file: File) => void; onRemove: () => void; onCamera: () => void }) {
  const { t } = useI18n();
  const inputRef=useRef<HTMLInputElement>(null), [dragging,setDragging]=useState(false);
  function drop(event: DragEvent<HTMLDivElement>) {event.preventDefault();setDragging(false);if(disabled)return;if(event.dataTransfer.files[0])onFile(event.dataTransfer.files[0]);}
  return <div className={`upload-card ${photo?'has-photo':''} ${dragging?'dragging':''}`} onDragOver={event=>{event.preventDefault();if(!disabled)setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={drop}>
    <input ref={inputRef} data-testid={`upload-${side}`} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} disabled={disabled} onChange={event=>{if(event.target.files?.[0])onFile(event.target.files[0]);event.target.value='';}}/>
    <div className="upload-card-top"><span>{t(SIDE_LABEL[side])}</span>{photo?<span className="ready-label"><Check size={13}/>{t("Ready")}</span>:<span className="photo-count">{side==='front'?'01':'02'}</span>}</div>
    <button className="upload-target" disabled={disabled} onClick={()=>inputRef.current?.click()} aria-label={t(side==='front'?'Choose front photo':'Choose side photo')}>
      {photo?<><img src={photo.url} alt={t(side==='front'?'Your chosen front photo':'Your chosen side photo')}/><span className="replace-photo"><ImagePlus size={16}/>{t("Change photo")}</span></>:<><span className="upload-icon"><ImagePlus size={24} strokeWidth={1.4}/></span><strong>{t("Choose photo")}</strong><span>{t("or drop it here")}</span></>}
    </button>
    {photo&&Math.min(photo.width,photo.height)<256&&<p className="upload-quality-note"><Info size={13}/><span>{photo.width} × {photo.height} · {t('Low resolution — this photo can still be used.')}</span></p>}
    <div className="upload-card-bottom"><button className="text-button" onClick={onCamera} disabled={disabled}><Video size={14}/>{t("Use camera")}</button>{photo&&<button className="icon-button" aria-label={t(side==='front'?'Remove front photo':'Remove side photo')} onClick={onRemove} disabled={disabled}><Trash2 size={14}/></button>}</div>
  </div>;
}

function TierBadge({score,reference}:{score:number;reference:RatingReference}) {
  const {t}=useI18n();
  return <div className="tier-badges"><span className="tier-badge">{tierLabel(score,reference)}</span>{score<5&&<span className="sub-five">Sub-5</span>}<small>{t('Experimental AI tier')}</small></div>;
}
function TierScale({score,reference}:{score?:number;reference:RatingReference}) {
  const {t,language}=useI18n();
  return <details className="tier-scale surface"><summary>{t('See tier bands')}<span>{score!==undefined?tierLabel(score,reference):t('Illustrated guide')}<ChevronRight size={15}/></span></summary><p>{t('Illustrations are examples, not templates for a tier. Many different faces can receive similar scores. These app bands are not validated PSL ratings or population percentiles. Sub-5 overlaps all scores below 5.')}</p><div className="tier-band-list">{tiers.map((tier,index)=><div key={tier.label} className={score!==undefined&&tierLabel(score,reference)===tierLabel(tier.min,reference)?'current':''}><Illustration compact plain reference={reference} variant={index}/><strong>{tierLabel(tier.min,reference)}</strong><span>{scoreText(tier.min,language)} – {tier.max<10?'<':''}{scoreText(tier.max,language)}</span></div>)}</div><p>{t('Each lower limit is included; each upper limit is excluded, except 10.')}</p></details>;
}

function ReferencePicker({reference,onChange,disabled=false}:{reference:RatingReference;onChange:(value:RatingReference)=>void;disabled?:boolean}){const {t}=useI18n();return <fieldset className="reference-control"><legend>{t('Profile')}</legend><div role="group" aria-label={t('Rating reference')}>{(['man','woman'] as const).map(value=><button key={value} aria-pressed={reference===value} disabled={disabled} onClick={()=>onChange(value)}>{t(value==='man'?'Man':'Woman')}</button>)}</div><p>{t('Choose your reference. Not inferred from the photo. The AI predictor is shared; no separate gender calibration is claimed.')}</p></fieldset>;}
export default function App() {
  const { language, setLanguage, t } = useI18n();
  const [reference,setReference]=useState<RatingReference>('man');
  const [mode,setMode]=useState<Mode>('full'), [photos,setPhotos]=useState<Photos>({}), [side,setSide]=useState<Side>('front');
  const photosRef=useRef<Photos>({}), epochRef=useRef(0), scanController=useRef<AbortController|null>(null);
  const [step,setStepState]=useState(0), [busy,setBusy]=useState(''), [error,setError]=useState('');
  const [selectedPoint,setSelectedPoint]=useState('eyeLO'), [metricId,setMetricId]=useState(''), [editing,setEditing]=useState(true);
  const [showLines,setShowLines]=useState(true), [zoom,setZoom]=useState(1), [glass,setGlass]=useState(true);
  const [dialog,setDialog]=useState<'privacy'|'method'|'guide'|'camera'|'settings'|null>(null), dialogRef=useRef<HTMLDialogElement>(null);
  const [includePhotos,setIncludePhotos]=useState(false), [created,setCreated]=useState(new Date()), [offline,setOffline]=useState(t("Preparing offline mode"));
  const [cameraError,setCameraError]=useState(''), [cameraReady,setCameraReady]=useState(false), videoRef=useRef<HTMLVideoElement>(null);
  const titleRef=useRef<HTMLHeadingElement>(null), transitionRef=useRef<ViewTransition|null>(null);
  const [motion,setMotion]=useState(true),[lineId,setLineId]=useState(''),[phase,setPhase]=useState<DetectionPhase>('runtime'),[detecting,setDetecting]=useState(false),[guideFocus,setGuideFocus]=useState<'balance'|'eyes'|'jaw'>('balance');
  useIntroMotion();
  useEffect(()=>{document.documentElement.dataset.motion=motion?'on':'off';},[motion]);
  function setStep(next:number){
    if(next===step)return;
    if(!document.startViewTransition||!motion||matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.dataset.input==='keyboard'){setStepState(next);return;}
    transitionRef.current?.skipTransition();
    transitionRef.current=document.startViewTransition(()=>flushSync(()=>setStepState(next)));
    transitionRef.current.ready.catch(()=>{});
  }
  function tiltPreview(event:React.PointerEvent<HTMLDivElement>){
    if(!motion||!matchMedia('(hover:hover) and (pointer:fine)').matches||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const target=event.currentTarget.querySelector<HTMLElement>('.illustration-motion'),rect=event.currentTarget.getBoundingClientRect();
    if(target)target.style.transform=`perspective(900px) rotateX(${-(event.clientY-rect.top-rect.height/2)/rect.height*5}deg) rotateY(${(event.clientX-rect.left-rect.width/2)/rect.width*6}deg)`;
  }

  const sides=requiredSides(mode), photo=photos[side];
  const hasPhotos=sides.every(key=>photos[key]);
  const allConfirmed=sides.every(key=>photos[key]?.confirmed);
  let metrics: Metric[]=[];
  if(photo){try{metrics=calculateMetrics(side,photo.points,photo.width,photo.height);}catch{/* Incomplete placement is an expected editor state. */}}
  const selectedMetric=metrics.find(metric=>metric.id===metricId)??metrics[0];
  const sideScores=Object.fromEntries(sides.filter(key=>photos[key]?.confirmed).map(key=>{const p=photos[key]!;return[key,scoreMetrics(calculateMetrics(key,p.points,p.width,p.height))];}));
  const total=totalScore(mode,sideScores);
  const appearance=mode!=='profile'&&photos.front?.confirmed?photos.front.appearance:undefined;
  const lines=photo?measurementLines(side,photo.points,photo.width,photo.height):[];
  const visibleLines=lines.filter(line=>line.metricIds.includes(selectedMetric?.id??''));
  const activeLine=visibleLines.find(line=>line.id===lineId)??visibleLines[0];
  const donePoints=photo?definitions[side].filter(def=>photo.points[def.id]).length:0;

  function putPhoto(key: Side, next?: Photo) {const previous=photosRef.current[key];const state={...photosRef.current,[key]:next};photosRef.current=state;setPhotos(state);if(previous&&previous.url!==next?.url)revokePhoto(previous);}
  useEffect(()=>()=>{scanController.current?.abort();Object.values(photosRef.current).forEach(revokePhoto);stopDetector();stopAppearance();},[]);
  useEffect(()=>{const beforePrint=()=>transitionRef.current?.skipTransition();window.addEventListener('beforeprint',beforePrint);return()=>window.removeEventListener('beforeprint',beforePrint);},[]);
  useEffect(()=>{document.documentElement.dataset.glass=glass?'on':'off';},[glass]);
  useEffect(()=>{
    const keyboard=()=>{document.documentElement.dataset.input='keyboard';}; const pointer=()=>{document.documentElement.dataset.input='pointer';};
    window.addEventListener('keydown',keyboard);window.addEventListener('pointerdown',pointer);
    return()=>{window.removeEventListener('keydown',keyboard);window.removeEventListener('pointerdown',pointer);};
  },[]);
  useEffect(()=>{
    if(import.meta.env.DEV){setOffline(t("Local mode"));return;}
    if(!('serviceWorker'in navigator)){setOffline(t("Offline unavailable"));return;}
    let active=true;
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then(()=>navigator.serviceWorker.ready).then(()=>{if(active)setOffline(t("Ready to use offline"));}).catch(()=>{if(active)setOffline(t("Offline not ready yet"));});
    return()=>{active=false;};
  },[]);
  useEffect(()=>{const element=dialogRef.current;if(dialog&&!element?.open)element?.showModal();else if(!dialog&&element?.open)element.close();},[dialog]);
  useEffect(()=>{
    if(dialog!=='camera')return;
    let active=true,stream:MediaStream|undefined;setCameraReady(false);setCameraError('');
    navigator.mediaDevices?.getUserMedia({video:{facingMode:'user',width:{ideal:1280}},audio:false}).then(async value=>{
      if(!active){value.getTracks().forEach(track=>track.stop());return;}stream=value;
      if(videoRef.current){videoRef.current.srcObject=value;await videoRef.current.play();if(active)setCameraReady(true);}
    }).catch(()=>{if(active)setCameraError(t("Camera unavailable or permission denied. You can still choose a photo from your gallery."));});
    if(!navigator.mediaDevices)setCameraError(t("This browser does not support the camera. Choose a photo from your gallery."));
    return()=>{active=false;stream?.getTracks().forEach(track=>track.stop());};
  },[dialog]);

  function chooseMode(next: Mode){setMode(next);setSide(next==='profile'?'profile':'front');setSelectedPoint(next==='profile'?'nasion':'eyeLO');setStep(0);setError('');setZoom(1);}
  function chooseSide(next: Side){setSide(next);setLineId('');setSelectedPoint(definitions[next].find(def=>!photos[next]?.points[def.id])?.id??definitions[next][0].id);setMetricId('');setZoom(1);setError('');}
  async function loadFile(key: Side,file: Blob){const epoch=++epochRef.current;setBusy(t("Reading your photo locally…"));setError('');try{const next=await readPhoto(file);if(epoch!==epochRef.current){revokePhoto(next);return;}putPhoto(key,next);}catch(err){if(epoch===epochRef.current)setError((err as Error).message);}finally{if(epoch===epochRef.current)setBusy('');}}
  async function startAnalysis(){if(!hasPhotos)return;setStep(1);setEditing(true);setMetricId('');setError('');setZoom(1);chooseSide(sides[0]);if(!Object.keys(photosRef.current[sides[0]]!.points).length)await autoDetect(sides[0]);}
  async function autoDetect(key:Side=side){
    const current=photosRef.current[key];if(!current)return;
    scanController.current?.abort();const controller=new AbortController();scanController.current=controller;
    const epoch=++epochRef.current,startedAt=performance.now();setPhase('runtime');setDetecting(true);setBusy(t('Finding landmarks on your device…'));setError('');
    try{
      const points=await detectLandmarks(current,key,value=>{if(epoch===epochRef.current)setPhase(value);});
      if(epoch!==epochRef.current)return;
      let estimate:Photo['appearance'];
      if(key==='front'){
        setPhase('rating');setBusy(t('Running the local appearance model…'));
        try{estimate=await predictAppearance({...current,points},controller.signal);}catch{if(!controller.signal.aborted&&epoch===epochRef.current)setError(t('AI appearance is unavailable. Geometry is still available; no appearance tier will be assigned.'));}
      }
      if(epoch!==epochRef.current)return;
      setPhase('visualizing');setBusy(t('Visualizing your measurements…'));
      await finishScanAnimation(startedAt,controller.signal);
      if(epoch===epochRef.current&&!controller.signal.aborted&&photosRef.current[key]?.url===current.url)putPhoto(key,{...current,points,appearance:estimate,source:'auto',confirmed:false});
    }catch(err){if(epoch===epochRef.current)setError((err as Error).message);}
    finally{if(epoch===epochRef.current){setBusy('');setDetecting(false);scanController.current=null;}}
  }
  function updatePoint(key: string,point: Point){if(!photo)return;putPhoto(side,{...photo,points:{...photo.points,[key]:point},appearance:undefined,confirmed:false});}
  async function transform(operation:'rotate'|'crop'){if(!photo)return;const epoch=++epochRef.current;setBusy(t("Adjusting your photo…"));setError('');try{const next=await transformPhoto(photo,operation);if(epoch===epochRef.current){putPhoto(side,next);setZoom(1);setEditing(true);setSelectedPoint(definitions[side][0].id);}else revokePhoto(next);}catch{if(epoch===epochRef.current)setError(t("Could not adjust this photo. Please choose it again."));}finally{if(epoch===epochRef.current)setBusy('');}}
  async function confirmSide(){
    if(!photo)return;
    try{
      validatePoints(side,photo.points,photo.width,photo.height);
      setError('');
      let confirmed={...photo,confirmed:true};
      if(side==='front'&&!photo.appearance){
        const epoch=++epochRef.current,controller=new AbortController();scanController.current=controller;setBusy(t('Running the local appearance model…'));setDetecting(true);setPhase('rating');
        try{if(photo.source!=='auto')await detectLandmarks(photo,'front');confirmed={...confirmed,appearance:await predictAppearance(photo,controller.signal)};}
        catch{if(epoch===epochRef.current&&!controller.signal.aborted)setError(t('AI appearance is unavailable. Geometry is still available; no appearance tier will be assigned.'));}
        finally{if(epoch===epochRef.current){setBusy('');setDetecting(false);scanController.current=null;}}
        if(epoch!==epochRef.current||controller.signal.aborted)return;
      }
      putPhoto(side,confirmed);const next=sides.find(key=>key!==side&&!photosRef.current[key]?.confirmed);
      if(next){chooseSide(next);setEditing(true);if(!Object.keys(photosRef.current[next]!.points).length)await autoDetect(next);}
      else{setCreated(new Date());setStep(2);setEditing(false);setMetricId('');titleRef.current?.focus();}
    }catch(err){setError((err as Error).message);}
  }
  function reset(){epochRef.current++;scanController.current?.abort();scanController.current=null;setDetecting(false);stopDetector();stopAppearance();Object.values(photosRef.current).forEach(revokePhoto);photosRef.current={};setPhotos({});setStep(0);setBusy('');setError('');setIncludePhotos(false);setZoom(1);setSide(mode==='profile'?'profile':'front');}
  async function capture(){const video=videoRef.current;if(!video?.videoWidth)return;const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;canvas.getContext('2d')!.drawImage(video,0,0);const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',.95));setDialog(null);if(blob)await loadFile(side,blob);}
  async function exportPng(){setBusy(t("Creating your report on this device…"));try{await document.fonts.ready;const report=document.querySelector<HTMLElement>('.print-report');if(!report)throw new Error('Report is unavailable.');await exportReport(report,mode,created,language);}catch{setError(t("Could not export the report. Try again or use Save PDF."));}finally{setBusy('');}}
  function showDetail(key: Side,id:string){chooseSide(key);setMetricId(id);setEditing(false);setStep(1);setShowLines(true);}
  const pointInstructions=photo?.source==='auto'?t("Landmarks found automatically. Move any misplaced points, then confirm."):t("Tap the photo to follow the landmark guide. You can move and refine each point.");

  return <div className="app-shell">
    <a href="#main" className="skip-link" onClick={event=>{event.preventDefault();document.getElementById('main')?.focus();}}>{t("Skip to analysis")}</a>
    <header className="site-header glass">
      <a href="#" aria-label={t("AeroFace, back to photo selection")} onClick={event=>{event.preventDefault();setStep(0);}}><Brand/></a>
      <nav aria-label={t("App information")}><button className="nav-link" onClick={()=>setDialog('method')}>{t("How scoring works")}</button><button className="nav-link" onClick={()=>setDialog('privacy')}>{t("Privacy")}<MoveUpRight size={12}/></button></nav>
      <span className="local-badge"><span/>{t("Processed locally")}</span><button className="settings-trigger icon-button" aria-label={t('Settings')} onClick={()=>setDialog('settings')}><Settings2 size={18}/></button>
    </header>

    <main id="main" tabIndex={-1} className={`main-content step-${step}`}>
      <div className="workspace-topline"><div className="workspace-name"><span className="workspace-orb"><ScanFace size={14}/></span>Personal face studio<span className="version-label">v1.0</span></div><button className="text-button quiet" aria-label={t(glass?"Reduce transparency":"Enable liquid glass")} onClick={()=>setGlass(value=>!value)} aria-pressed={!glass}><SlidersHorizontal size={14}/><span className="transparency-label">{glass?t("Reduce transparency"):t("Enable liquid glass")}</span></button></div>
      <div className="page-heading"><div><p className="intro-label">{t("A closer look, on your terms.")}</p><h1 ref={titleRef} tabIndex={-1}>{step===0?<>{t("Know your angles.")}<br/><span>{t("See what adds up.")}</span></>:step===1?t("Behind every measurement."):t("Your face, in perspective.")}</h1><p className="page-description">{step===0?t("Explore your proportions, trace every measurement, and keep your photos to yourself."):step===1?t("Check the points. Follow the lines. You stay in control."):t("Your results in one place. Export them only when you choose.")}</p></div>{step>0&&<button className="secondary-button" onClick={()=>setStep(step===2?1:0)}><ArrowLeft size={15}/>{step===2?t("Review again"):t("Back to photos")}</button>}</div>

      <nav className="step-navigation" aria-label={t("Analysis steps")}>
        {[[t("Choose photo"),'01'],[t("Measurements"),'02'],[t("Face report"),'03']].map(([label,number],index)=><button key={label} className={`step-item ${step===index?'current':''} ${step>index?'complete':''}`} aria-current={step===index?'step':undefined} disabled={!!busy||(index===1&&!hasPhotos)||(index===2&&!allConfirmed)} onClick={()=>{setStep(index);if(index===1)setEditing(true);}}><span className="step-number">{step>index?<Check size={13}/>:number}</span>{label}{index<2&&<ChevronRight size={14} className="step-chevron"/>}</button>)}
      </nav>
      {error&&<ErrorMessage message={t(error)} onDismiss={()=>setError('')}/>}

      {step===0&&<section className="start-grid" aria-label={t("Choose mode and photos")}>
        <div className="setup-panel surface">
          <div className="section-heading"><div><h2>{t("Start with your angle.")}</h2><p>{t("Choose what you want to explore.")}</p></div><span className="small-index"><Focus size={20} strokeWidth={1.2}/></span></div>
          <ReferencePicker reference={reference} onChange={setReference} disabled={!!busy}/>
          <div className="mode-control glass" role="group" aria-label={t("Analysis mode")}><span className="mode-indicator" style={{transform:`translateX(${modes.findIndex(item=>item.id===mode)*100}%)`}}/>{modes.map(item=><button key={item.id} aria-pressed={mode===item.id} disabled={!!busy} className={mode===item.id?'selected':''} onClick={()=>chooseMode(item.id)}><span>{t(item.title)}</span><small>{t(item.subtitle)}</small></button>)}</div>
          <div className={`upload-grid ${sides.length===1?'single':''}`}>{sides.map(key=><UploadCard key={key} side={key} photo={photos[key]} disabled={!!busy} onFile={file=>loadFile(key,file)} onRemove={()=>putPhoto(key)} onCamera={()=>{chooseSide(key);setDialog('camera');}}/>)}</div>
          <div className="upload-format"><FileImage size={13}/><span>{t("JPG, PNG, WebP · up to 20 MB per photo")}</span></div>
          <button className="primary-button wide" disabled={!hasPhotos||!!busy} onClick={startAnalysis}>{busy?<><span className="spinner"/>{t(busy)}</>:<>{t("Start analysis")}<ArrowRight size={17}/></>}</button>
          <p className="local-note"><LockKeyhole size={12}/>{t("Your photos stay on your device. No account. No uploads.")}</p>
        </div>
        <div className="preview-panel" onPointerMove={tiltPreview} onPointerLeave={event=>{const target=event.currentTarget.querySelector<HTMLElement>('.illustration-motion');if(target)target.style.transform='perspective(900px) rotateX(0deg) rotateY(0deg)';}}>
          <div className="preview-top"><span className="preview-label"><span/>{t("Geometry, explained.")}</span><button className="icon-button" onClick={()=>setDialog('guide')} aria-label={t("Open photo guide")}><Maximize2 size={16}/></button></div>
          <div className="illustration-motion" key={mode==='profile'?'profile':'front'}><Illustration side={mode==='profile'?'profile':'front'} focus={guideFocus} reference={reference}/></div><div className="anatomy-tabs" role="group" aria-label={t('Read the lines')}>{(['balance','eyes','jaw'] as const).map((key,index)=><button key={key} aria-pressed={guideFocus===key} onClick={()=>setGuideFocus(key)}>{t(mode==='profile'?['Profile balance','Lip–chin relation','Visual ramus'][index]:['Facial symmetry','Eye spacing','Visible jaw width'][index])}</button>)}</div>
          <div className="illustration-note glass"><span className="note-icon"><Layers2 size={17}/></span><div><strong>{t("Every line has a story.")}</strong><p>{t("The points, lines, and reasoning behind your score.")}</p></div><Sparkles size={16}/></div>
          <span className="illustration-caption">{t("Illustrated guide · not an analysis result")}</span>
        </div>
      </section>}

      {step===0&&<div className="below-start"><button className="guide-link" onClick={()=>setDialog('guide')}><CircleHelp size={16}/><span>{t("What makes a good photo?")}</span><ArrowRight size={14}/></button><div className="principles"><span><ShieldCheck size={14}/>{t("Private by design")}</span><span><ScanFace size={14}/>{t("Transparent scoring")}</span><span><WifiOff size={14}/>{t("Works offline")}</span></div></div>}

      {step===1&&photo&&<section className="analysis-grid" aria-label={t("Facial measurements")}>
        <div className="editor-panel surface">
          <div className="editor-header"><div className="side-tabs" role="group" aria-label={t("Displayed view")}>{sides.map(key=><button key={key} className={side===key?'active':''} disabled={!!busy} onClick={()=>{chooseSide(key);if(editing&&!Object.keys(photosRef.current[key]!.points).length)void autoDetect(key);}}>{key==='front'?t("Front"):t("Side")}{photos[key]?.confirmed&&<Check size={13}/>}</button>)}</div><span className="subtle-label">{photo.width} × {photo.height}</span></div>
          <div className="photo-stage"><PhotoEditor photo={photo} side={side} selectedMetric={!editing&&showLines?selectedMetric:undefined} editing={editing&&!busy} selectedPoint={selectedPoint} onSelectPoint={setSelectedPoint} onChange={updatePoint} zoom={zoom} activeLine={!editing&&showLines?activeLine:undefined} onSelectLine={id=>{setLineId(id);setShowLines(true);}}/>{!showLines&&!editing&&<img className="original-overlay" src={photo.url} alt={t("Original photo without measurement lines")}/>}{detecting?<AnalysisOverlay phase={phase} appearance={side==="front"}/>:!!busy&&<div className="processing-overlay glass" role="status"><span className="spinner"/><span>{t(busy)}</span></div>}</div>
          <div className="editor-tools"><div><button className="icon-button" aria-label={t("Zoom out")} disabled={zoom<=1} onClick={()=>setZoom(value=>Math.max(1,value-.25))}><ZoomOut size={17}/></button><span>{Math.round(zoom*100)}%</span><button className="icon-button" aria-label={t("Zoom in")} disabled={zoom>=2} onClick={()=>setZoom(value=>Math.min(2,value+.25))}><ZoomIn size={17}/></button></div><div><button className="text-button" disabled={!!busy} onClick={()=>transform('rotate')}><RotateCw size={15}/>{t("Rotate")}</button><button className="text-button" disabled={!!busy} onClick={()=>transform('crop')} title={t("Center crop to 3:4; landmarks will reset")}><Crop size={15}/>{t("Crop 3:4")}</button><button className="text-button" aria-pressed={showLines} disabled={editing} onClick={()=>setShowLines(value=>!value)}><Layers2 size={15}/>{showLines?t("Measurement lines"):t("Original photo")}</button></div></div>
        </div>
        <aside className="analysis-sidebar">
          <div className="section-heading"><div><h2>{editing?t("Get the points right."):t("See how it adds up.")}</h2><p>{t(SIDE_LABEL[side])}</p></div><button className="icon-button" onClick={()=>setDialog('guide')} aria-label={t("Measurement help")}><CircleHelp size={18}/></button></div>
          <div className="view-toggle" role="group" aria-label={t("Editor mode")}><button className={editing?'active':''} onClick={()=>setEditing(true)}><Settings2 size={14}/>{t("Adjust points")}</button><button className={!editing?'active':''} disabled={!metrics.length} onClick={()=>setEditing(false)}><ScanFace size={14}/>{t("Explore measurements")}</button></div>
          {editing?<>
            <p className="editor-instructions">{pointInstructions}</p>
            <div className="editor-guide"><span className="guide-number">{donePoints}/{definitions[side].length}</span><div><strong>{donePoints===definitions[side].length?t("All points are in place."):t("Follow one point at a time.")}</strong><p>{donePoints===definitions[side].length?t("Check the points on your photo before continuing."):t("Find the next point in the selector below the photo.")}</p></div></div>
            {<button className="secondary-button wide" onClick={()=>autoDetect(side)} disabled={!!busy}><ScanFace size={16}/>{Object.keys(photo.points).length?t("Detect landmarks again"):t("Detect landmarks automatically")}</button>}
            {side==='profile'&&<div className="quiet-notice"><Info size={16}/><p>{t("Profile points are estimated automatically. Check the near-ear, jaw and chin points carefully. Ramus measures a surface contour, not bone length.")}</p></div>}
            {side==='profile'&&<AngleReadings photo={photo}/>}<div className="quality-summary"><span>{t("Input quality")}</span><strong>{photo.quality.warnings.length?t("Please review"):t("Lighting & detail look sufficient")}</strong><p>{photo.quality.warnings.map(t).join(' ')||t("Basic lighting and detail checks do not guarantee correct pose or landmarks.")}</p></div>
            <button className="primary-button wide" onClick={confirmSide} disabled={!!busy||donePoints<definitions[side].length}>{sides.some(key=>key!==side&&!photos[key]?.confirmed)?<>{t("Confirm & continue")}<ArrowRight size={16}/></>:<>{t("Confirm & create report")}<CheckCheck size={16}/></>}</button>
            <p className="confirm-note">{t("Continuing confirms the landmark positions on this photo.")}</p>
          </>:<>
            <p className="explore-hint"><Focus size={16}/>{t('Tap any line to see its name, endpoints, and role in the score.')}</p><div className="metric-list">{metrics.map(metric=><button key={metric.id} className={`metric-row ${selectedMetric?.id===metric.id?'active':''}`} onClick={()=>{setMetricId(metric.id);setLineId('');}}><span>{t(metric.name)}<small>{t(metric.display)}</small></span><span className="metric-value">{scoreText(metric.score, language)}<ChevronRight size={14}/></span></button>)}</div>
            {visibleLines.length>0&&<section className="line-explainer" aria-label={t('Explore each line')}>
              <h3>{t('Explore each line')}</h3><p>{t('Tap a line on your photo or choose one below.')}</p>
              <div className="line-legend">{visibleLines.map(line=><button key={line.id} className={`line-chip ${activeLine?.id===line.id?'selected':''}`} data-line-id={line.id} aria-pressed={activeLine?.id===line.id} onClick={()=>{setLineId(line.id);setShowLines(true);}}><span className={line.reference?'line-swatch dashed':'line-swatch'}/>{t(line.name)}</button>)}</div>
              {activeLine&&<div className="line-detail" key={activeLine.id} aria-live="polite"><span className="detail-label">{t(activeLine.reference?'Reference line':'Measured segment')}</span><h4>{t(activeLine.name)}</h4><p>{t(activeLine.explanation)}</p><dl><div><dt>{t('From')}</dt><dd>{t(activeLine.fromLabel)}</dd></div><div><dt>{t('To')}</dt><dd>{t(activeLine.toLabel)}</dd></div><div><dt>{t(activeLine.id==='centerline'?'Purpose':'In-photo length')}</dt><dd>{t(activeLine.display)}</dd></div><div><dt>{t('Used in')}</dt><dd>{t(selectedMetric?.name??'')} · {selectedMetric?.weight}%</dd></div></dl><p className="line-units">{t('Pixel length belongs to this photo; scores use normalized ratios and angles, not millimeters.')}</p></div>}
            </section>}
            {selectedMetric&&<div className="metric-detail" key={selectedMetric.id}><span className="detail-label">{t("How to read this")}</span><h3>{t(selectedMetric.name)}</h3><p>{t(selectedMetric.description)}</p><dl><div><dt>{t("Measurements")}</dt><dd>{t(selectedMetric.display)}</dd></div><div><dt>{t("Weight in this view")}</dt><dd>{selectedMetric.weight}%</dd></div></dl><div className="formula-box"><span>{t("Formula")}</span><p>{t(selectedMetric.formula)}</p><span>{t("Rubric reference")}</span><p>{t(selectedMetric.reference)}</p></div></div>}
            {side==='profile'&&<AngleReadings photo={photo}/>}
            {allConfirmed&&<button className="primary-button wide" onClick={()=>setStep(2)}>{t("Back to report")}<ArrowRight size={16}/></button>}
          </>}
        </aside>
      </section>}

      {step===2&&allConfirmed&&total!==null&&<section className="report-screen" aria-label={t("Face report")}>
        <div className="report-summary surface"><div className="report-seal"><Fingerprint size={28} strokeWidth={1.2}/></div><div className="report-summary-main"><p>{appearance?t("AI appearance estimate · front photo"):t("Geometry only · appearance not rated")}</p><div className="headline-score">{scoreText(appearance?.score??total, language)}<span>/ 10</span></div><span className="score-caption">{appearance?APPEARANCE_MODEL:t("Fit to the AeroFace geometry rubric")}</span></div><div className="report-tier-slot">{appearance?<TierBadge score={appearance.score} reference={reference}/>:<span className="score-caption">{t("No appearance tier assigned")}</span>}</div><div className="summary-sides">{(['front','profile'] as Side[]).map(key=><div key={key}><span>{t(key==='front'?'Front geometry':'Side geometry')}</span><strong>{sideScores[key]!==undefined?`${scoreText(sideScores[key], language)} / 10`:<small>{t("Not analyzed")}</small>}</strong></div>)}{mode==='full'&&<div><span>{t('Combined geometry')}</span><strong>{scoreText(total,language)} / 10</strong></div>}<button className="text-button" onClick={()=>setDialog('method')}>{t("How is the score calculated?")}<ArrowRight size={13}/></button></div></div>
        <div className="report-context"><Info size={15}/><p>{t("AI estimates and geometry are separate. Lines explain the geometry, not the AI decision. The appearance model is experimental, front-view only, and not validated as a PSL scale or celebrity comparison. Side-only reports have no appearance tier.")}</p></div>
        <TierScale score={appearance?.score} reference={reference}/><div className="report-columns">{sides.map(key=>{const p=photos[key]!,list=calculateMetrics(key,p.points,p.width,p.height);return <article key={key} className="report-side surface"><div className="report-side-heading"><div><h2>{t(SIDE_LABEL[key])}</h2><p>{p.source==='auto'?t("Automatic landmarks, reviewed by you"):t("Manual landmarks, confirmed by you")}</p></div><span>{scoreText(sideScores[key], language)}<small>/10</small></span></div><RadarChart metrics={list} side={key}/>{list.map(metric=><button className="report-metric" key={metric.id} onClick={()=>showDetail(key,metric.id)}><div className="report-metric-top"><span>{t(metric.name)}{metric.estimated&&<small>{t("2D estimate")}</small>}</span><strong>{scoreText(metric.score, language)}<small>/10</small><ChevronRight size={14}/></strong></div><div className="score-track"><span style={{transform:`scaleX(${metric.score/10})`}}/></div><div className="report-metric-bottom"><span>{t(metric.display)}</span><span>{t("Weight")} {metric.weight}%</span></div></button>)}<p className="side-insight">{key==='profile'?t("Ramus and jaw angles describe the surface contour visible in your photo."):t("The centerline is aligned to the eyes. A straight pose and neutral expression help the reading.")}</p>{key==='profile'&&<AngleReadings photo={p}/>}</article>;})}</div>
        <div className="report-export surface"><div><span className="export-icon"><ArrowDownToLine size={22}/></span><h2>{t("Keep it, if you want.")}</h2><p>{t("Your report is created on your device. There is no server copy.")}</p></div><div className="export-actions"><label className="checkbox-label"><input type="checkbox" checked={includePhotos} onChange={event=>setIncludePhotos(event.target.checked)}/>{t("Include photos & measurement lines")}</label><div className="export-buttons"><button className="secondary-button" disabled={!!busy} onClick={()=>{downloadBlob(new Blob([JSON.stringify(reportData(photos,mode,created,language,reference),null,2)],{type:'application/json'}),`AeroFace-${language==='id'?'rapor':'report'}-${mode}.json`);}}><FileJson size={15}/>Data</button><button className="secondary-button" disabled={!!busy} onClick={()=>window.print()}><Download size={15}/>{t("Save PDF")}</button><button className="primary-button" disabled={!!busy} onClick={exportPng}><FileImage size={16}/>{busy?t("Preparing…"):t("Download image")}</button></div></div></div>
        {mode!=='full'&&<div className="extend-report"><p>{t("Want to explore the other angle too?")}</p><button className="text-button" onClick={()=>chooseMode('full')}>{t("Complete your analysis")}<ArrowRight size={14}/></button></div>}
      </section>}
      <footer className="site-footer"><span><span className="status-dot"/>{t(offline)}</span><span>{t("Made for understanding, not comparison.")}</span><button className="text-button" onClick={reset} disabled={!Object.values(photos).some(Boolean)&&!busy}><Trash2 size={13}/>{t("Clear session")}</button></footer>
    </main>

    <dialog ref={dialogRef} className={`info-dialog ${dialog==='camera'?'camera-dialog':''}`} onCancel={()=>setDialog(null)} onClick={event=>{if(event.target===event.currentTarget)setDialog(null);}}>
      <div className="dialog-inner"><button className="dialog-close icon-button" aria-label={t("Close dialog")} onClick={()=>setDialog(null)} autoFocus><X size={20}/></button>
        {dialog==='settings'&&<><span className="dialog-icon"><Settings2 size={28}/></span><h2>{t('Make it feel like you.')}</h2><div className="settings-section"><h3>{t('Language')}</h3><p>{t('Choose the language for the interface, explanations, and downloaded reports.')}</p><div className="language-options" role="group" aria-label={t('Language')}><button aria-pressed={language==='en'} onClick={()=>setLanguage('en')}><span>EN</span>English{language==='en'&&<Check size={16}/>}</button><button aria-pressed={language==='id'} onClick={()=>setLanguage('id')}><span>ID</span>Indonesia{language==='id'&&<Check size={16}/>}</button></div></div><div className="settings-section"><ReferencePicker reference={reference} onChange={setReference} disabled={!!busy}/></div><div className="settings-section"><h3>{t('Appearance')}</h3><label className="setting-row"><span><strong>{t('Liquid glass')}</strong><small>{t('Translucent controls with soft highlights.')}</small></span><input type="checkbox" checked={glass} onChange={event=>setGlass(event.target.checked)}/></label><label className="setting-row"><span><strong>{t('Interface motion')}</strong><small>{t('Smooth transitions and guided measurement reveals.')}</small></span><input type="checkbox" checked={motion} onChange={event=>setMotion(event.target.checked)}/></label><p>{t('Your system motion preference is always respected.')}</p></div></>}
        {dialog==='privacy'&&<><span className="dialog-icon"><ShieldCheck size={28}/></span><h2>{t("Your face. Your device.")}</h2><p className="dialog-intro">{t("Privacy is part of the process, from start to finish.")}</p><div className="privacy-facts"><div><LockKeyhole/><span><strong>{t("Photos are never uploaded.")}</strong><p>{t("Files are read and processed in your browser. Landmark detection also runs locally.")}</p></span></div><div><Monitor/><span><strong>{t("Only during this session.")}</strong><p>{t("The app does not store photos, landmarks, or reports in cookies, localStorage, IndexedDB, or on a server.")}</p></span></div><div><WifiOff/><span><strong>{t("Ready without the internet.")}</strong><p>{t("Once the offline indicator is ready, the app and model work without a connection. Only application and model files are cached.")}</p></span></div><div><Download/><span><strong>{t("Export on your terms.")}</strong><p>{t("Photos are excluded from reports by default. Downloads are saved only to the device you choose.")}</p></span></div></div><p className="fine-print">{t("GitHub Pages may record your IP address for security when you visit. This app has no analytics, ads, or external fonts.")}</p><a className="external-link" href="https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection" target="_blank" rel="noreferrer">{t("GitHub hosting policy")}<MoveUpRight size={13}/></a></>}
        {dialog==='method'&&<><span className="dialog-icon"><ScanFace size={28}/></span><h2>{t("Numbers you can trace.")}</h2><p className="dialog-intro">{RUBRIC} {' '}{t("measures ratios and contour angles. A separate FaceONNX ResNet-18 model estimates appearance from the cropped front photo, entirely on your device.")}</p><div className="method-section"><h3>{t('Appearance AI')}</h3><p>{t('The front face is cropped and eye-aligned, resized to 224 × 224, then evaluated by FaceONNX ResNet-18. Its raw output is multiplied by two and clipped to 0–10. Geometry is not added to this estimate. The model is not calibrated to PSL, celebrities, or separate male/female scales.')}</p><a className="external-link" href="https://github.com/FaceONNX/FaceONNX.Models" target="_blank" rel="noreferrer">FaceONNX · MIT<MoveUpRight size={13}/></a><p>{t('The publisher provides no subgroup accuracy or calibration data. Lighting, crop, pose and training-data bias may affect the estimate. A side photo alone cannot produce an appearance rating.')}</p></div><div className="method-section"><h3>{t("From measurement to score")}</h3><p>{t("Every metric has a single target. The score decreases continuously with distance from it; one tolerance away scores 5. Targets, tolerances, weights, and tier bands are product-design choices, not scientifically validated attractiveness standards.")}</p><code>{t("score = 10 / (1 + ((value − target) / tolerance)²)")}</code></div><div className="method-section"><h3>{t("Open weights")}</h3><p>{t("Front: symmetry 35%, eye spacing 25%, lower-face balance 25%, jaw width 15%. Side: profile balance 30%, lip relation 25%, jaw contour angle 25%, visual ramus 20%.")}</p><p>{t("Each view uses a weighted geometric mean, so a weak metric has more influence than with an arithmetic average. Full mode uses 50% front + 50% side. Single-view mode uses only the selected view.")}</p></div><div className="method-section"><h3>{t("Understand the limits")}</h3><p>{t("A 2D photo cannot reveal bone length in millimeters or hidden structures. All profile metrics estimate surface contours. Perspective, expression, and landmark placement still affect the results.")}</p><p>{t("Photo quality is checked separately and does not lower your proportion score. This is not a diagnostic tool or medical recommendation.")}</p></div><a className="external-link" href="https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker" target="_blank" rel="noreferrer">{t("About MediaPipe landmark detection")}<MoveUpRight size={13}/></a></>}
        {dialog==='guide'&&<><span className="dialog-icon"><Focus size={28}/></span><h2>{t("Photos that help the reading.")}</h2><p className="dialog-intro">{t("Use a recent, unfiltered photo of one face with a neutral expression.")}</p><div className="photo-guides"><div><Illustration side="front" compact reference={reference}/><h3>{t("Front view")}</h3><p>{t("Keep your head straight and camera at eye level, with both sides visible. Avoid close selfies and ultrawide lenses.")}</p></div><div><Illustration side="profile" compact reference={reference}/><h3>{t("Side view")}</h3><p>{t("Face directly left or right. Keep the ear, jaw contour, and chin visible. Move hair away from the outline.")}</p></div></div><div className="quiet-notice"><Info size={16}/><p>{t("Use even lighting and a simple background. You can rotate or center-crop before placing points. Editing the photo resets landmarks.")}</p></div></>}
        {dialog==='camera'&&<><h2>{t(side==='front'?'Take a front photo.':'Take a side photo.')}</h2><p className="dialog-intro">{t("The camera is active only while this dialog is open.")}</p><video ref={videoRef} playsInline muted className="camera-preview"/>{cameraError&&<p className="camera-error" role="alert">{t(cameraError)}</p>}<button className="primary-button wide" disabled={!cameraReady} onClick={capture}><Video size={17}/>{t("Take photo")}</button></>}
      </div>
    </dialog>

    {step===2&&allConfirmed&&total!==null&&<div className="print-report"><Brand/><h1>{t("Face analysis report")}</h1><p>{mode==='full'?t("Full analysis"):t(SIDE_LABEL[mode])} · {created.toLocaleDateString(language==='id'?'id-ID':'en-GB')} · {RUBRIC}</p><div className="print-score-summary"><div><span>{appearance?t('AI appearance estimate · front photo'):t('Geometry only · appearance not rated')}</span><h2>{scoreText(appearance?.score??total, language)} <small>/ 10</small></h2><p>{appearance?APPEARANCE_MODEL:RUBRIC}</p></div><div className="print-tier"><span>{t('Tier')}</span><strong>{appearance?tierLabel(appearance.score,reference):t('Not assigned')}</strong>{appearance&&appearance.score<5&&<small>Sub-5</small>}</div></div><p>{t('AI estimates and geometric measurements are separate. Lines do not explain the AI decision. Experimental model; not a validated PSL rating.')}</p><p>{t(reference==='man'?'Reference: Man':'Reference: Woman')}</p>{mode==='full'&&<p>{t('Combined geometry')}: {scoreText(total,language)} / 10</p>}{sides.map(key=>{const p=photos[key]!,list=calculateMetrics(key,p.points,p.width,p.height);return <section key={key}><h2>{t(SIDE_LABEL[key])} — {scoreText(sideScores[key], language)}/10</h2><div className="print-visual-row">{includePhotos&&<div className="print-photo"><PhotoEditor photo={p} side={key} editing={false} selectedPoint="" onSelectPoint={()=>{}} onChange={()=>{}} zoom={1}/></div>}<RadarChart metrics={list} side={key}/></div><table><thead><tr><th>{t("Metric")}</th><th>{t("Value")}</th><th>{t("Score")}</th><th>{t("Weight")}</th></tr></thead><tbody>{list.map(metric=><tr key={metric.id}><td>{t(metric.name)}{metric.estimated?` (${t('2D estimate')})`:''}</td><td>{t(metric.display)}</td><td>{scoreText(metric.score, language)}/10</td><td>{metric.weight}%</td></tr>)}</tbody></table>{key==='profile'&&<AngleReadings photo={p}/>}<p>{p.source==='auto'?t("Automatic landmarks, reviewed by you."):t("Manual landmarks, placed and confirmed by you.")}</p>{p.quality.warnings.length>0&&<p>{t('Photo notes')}: {p.quality.warnings.map(t).join(' ')}</p>}</section>;})}<footer>{t("Targets and weights are product-design choices, not validated attractiveness standards. Profile and ramus values estimate 2D contours, not bone structure. Created locally on your device.")}</footer></div>}
    <div className="sr-only" role="status" aria-live="polite">{t(busy)}</div>
  </div>;
}
