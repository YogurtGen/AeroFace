import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { ArrowDownToLine, ArrowLeft, ArrowRight, Check, CheckCheck, ChevronRight, CircleHelp, Crop, Download, FileImage, FileJson, Fingerprint, Focus, ImagePlus, Info, Layers2, LockKeyhole, Maximize2, Monitor, MoveUpRight, RotateCw, ScanFace, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Trash2, Upload, Video, WifiOff, X, ZoomIn, ZoomOut } from 'lucide-react';
import { RUBRIC, SIDE_LABEL, calculateMetrics, definitions, requiredSides, scoreMetrics, scoreText, totalScore, validatePoints, type Metric, type Mode, type Point, type Side } from './analysis';
import { detectFront, readPhoto, revokePhoto, stopDetector, transformPhoto, type Photo, type Photos } from './photos';
import { downloadBlob, exportReport, reportData } from './report';
import Illustration from './Illustration';
import PhotoEditor from './PhotoEditor';

const modes: { id: Mode; title: string; subtitle: string }[] = [
  { id: 'front', title: 'Depan', subtitle: '1 foto' }, { id: 'profile', title: 'Samping', subtitle: '1 foto' }, { id: 'full', title: 'Lengkap', subtitle: '2 foto' },
];
function Brand() { return <span className="brand"><span className="brand-symbol"><svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="m5 23 8-18h3l8 18M8 17h12" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><circle cx="23" cy="5" r="2" fill="currentColor"/></svg></span>AeroFace<span className="brand-dot">.</span></span>; }
function ErrorMessage({ message, onDismiss }: { message: string; onDismiss: () => void }) { return <div className="error-message" role="alert"><Info size={18}/><p>{message}</p><button className="icon-button" aria-label="Tutup pesan" onClick={onDismiss}><X size={16}/></button></div>; }
function UploadCard({ side, photo, disabled, onFile, onRemove, onCamera }: { side: Side; photo?: Photo; disabled: boolean; onFile: (file: File) => void; onRemove: () => void; onCamera: () => void }) {
  const inputRef=useRef<HTMLInputElement>(null), [dragging,setDragging]=useState(false);
  function drop(event: DragEvent<HTMLDivElement>) {event.preventDefault();setDragging(false);if(disabled)return;if(event.dataTransfer.files[0])onFile(event.dataTransfer.files[0]);}
  return <div className={`upload-card ${photo?'has-photo':''} ${dragging?'dragging':''}`} onDragOver={event=>{event.preventDefault();if(!disabled)setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={drop}>
    <input ref={inputRef} data-testid={`upload-${side}`} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} disabled={disabled} onChange={event=>{if(event.target.files?.[0])onFile(event.target.files[0]);event.target.value='';}}/>
    <div className="upload-card-top"><span>{SIDE_LABEL[side]}</span>{photo?<span className="ready-label"><Check size={13}/>Siap</span>:<span className="photo-count">{side==='front'?'01':'02'}</span>}</div>
    <button className="upload-target" disabled={disabled} onClick={()=>inputRef.current?.click()} aria-label={`Pilih foto ${side==='front'?'depan':'samping'}`}>
      {photo?<><img src={photo.url} alt={`Pratinjau foto ${side==='front'?'depan':'samping'} pilihanmu`}/><span className="replace-photo"><ImagePlus size={16}/>Ganti foto</span></>:<><span className="upload-icon"><ImagePlus size={24} strokeWidth={1.4}/></span><strong>Pilih foto</strong><span>atau tarik foto ke sini</span></>}
    </button>
    <div className="upload-card-bottom"><button className="text-button" onClick={onCamera} disabled={disabled}><Video size={14}/>Gunakan kamera</button>{photo&&<button className="icon-button" aria-label={`Hapus foto ${SIDE_LABEL[side].toLowerCase()}`} onClick={onRemove} disabled={disabled}><Trash2 size={14}/></button>}</div>
  </div>;
}

export default function App() {
  const [mode,setMode]=useState<Mode>('full'), [photos,setPhotos]=useState<Photos>({}), [side,setSide]=useState<Side>('front');
  const photosRef=useRef<Photos>({}), epochRef=useRef(0);
  const [step,setStep]=useState(0), [busy,setBusy]=useState(''), [error,setError]=useState('');
  const [selectedPoint,setSelectedPoint]=useState('eyeLO'), [metricId,setMetricId]=useState(''), [editing,setEditing]=useState(true);
  const [showLines,setShowLines]=useState(true), [zoom,setZoom]=useState(1), [glass,setGlass]=useState(true);
  const [dialog,setDialog]=useState<'privacy'|'method'|'guide'|'camera'|null>(null), dialogRef=useRef<HTMLDialogElement>(null);
  const [includePhotos,setIncludePhotos]=useState(false), [created,setCreated]=useState(new Date()), [offline,setOffline]=useState('Menyiapkan offline');
  const [cameraError,setCameraError]=useState(''), [cameraReady,setCameraReady]=useState(false), videoRef=useRef<HTMLVideoElement>(null);
  const titleRef=useRef<HTMLHeadingElement>(null);
  const sides=requiredSides(mode), photo=photos[side];
  const hasPhotos=sides.every(key=>photos[key]);
  const allConfirmed=sides.every(key=>photos[key]?.confirmed);
  let metrics: Metric[]=[];
  if(photo){try{metrics=calculateMetrics(side,photo.points,photo.width,photo.height);}catch{/* Incomplete placement is an expected editor state. */}}
  const selectedMetric=metrics.find(metric=>metric.id===metricId)??metrics[0];
  const sideScores=Object.fromEntries(sides.filter(key=>photos[key]?.confirmed).map(key=>{const p=photos[key]!;return[key,scoreMetrics(calculateMetrics(key,p.points,p.width,p.height))];}));
  const total=totalScore(mode,sideScores);
  const donePoints=photo?definitions[side].filter(def=>photo.points[def.id]).length:0;

  function putPhoto(key: Side, next?: Photo) {const previous=photosRef.current[key];const state={...photosRef.current,[key]:next};photosRef.current=state;setPhotos(state);if(previous&&previous.url!==next?.url)revokePhoto(previous);}
  useEffect(()=>()=>{Object.values(photosRef.current).forEach(revokePhoto);stopDetector();},[]);
  useEffect(()=>{document.documentElement.dataset.glass=glass?'on':'off';},[glass]);
  useEffect(()=>{
    const keyboard=()=>{document.documentElement.dataset.input='keyboard';}; const pointer=()=>{document.documentElement.dataset.input='pointer';};
    window.addEventListener('keydown',keyboard);window.addEventListener('pointerdown',pointer);
    return()=>{window.removeEventListener('keydown',keyboard);window.removeEventListener('pointerdown',pointer);};
  },[]);
  useEffect(()=>{
    if(import.meta.env.DEV){setOffline('Mode lokal');return;}
    if(!('serviceWorker'in navigator)){setOffline('Offline tidak tersedia');return;}
    let active=true;
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then(()=>navigator.serviceWorker.ready).then(()=>{if(active)setOffline('Siap dipakai offline');}).catch(()=>{if(active)setOffline('Offline belum siap');});
    return()=>{active=false;};
  },[]);
  useEffect(()=>{const element=dialogRef.current;if(dialog&&!element?.open)element?.showModal();else if(!dialog&&element?.open)element.close();},[dialog]);
  useEffect(()=>{
    if(dialog!=='camera')return;
    let active=true,stream:MediaStream|undefined;setCameraReady(false);setCameraError('');
    navigator.mediaDevices?.getUserMedia({video:{facingMode:'user',width:{ideal:1280}},audio:false}).then(async value=>{
      if(!active){value.getTracks().forEach(track=>track.stop());return;}stream=value;
      if(videoRef.current){videoRef.current.srcObject=value;await videoRef.current.play();if(active)setCameraReady(true);}
    }).catch(()=>{if(active)setCameraError('Kamera tidak tersedia atau izinnya belum diberikan. Kamu tetap bisa memilih foto dari galeri.');});
    if(!navigator.mediaDevices)setCameraError('Browser ini belum mendukung kamera. Gunakan pilihan foto dari galeri.');
    return()=>{active=false;stream?.getTracks().forEach(track=>track.stop());};
  },[dialog]);

  function chooseMode(next: Mode){setMode(next);setSide(next==='profile'?'profile':'front');setSelectedPoint(next==='profile'?'nasion':'eyeLO');setStep(0);setError('');setZoom(1);}
  function chooseSide(next: Side){setSide(next);setSelectedPoint(definitions[next].find(def=>!photos[next]?.points[def.id])?.id??definitions[next][0].id);setMetricId('');setZoom(1);setError('');}
  async function loadFile(key: Side,file: Blob){const epoch=++epochRef.current;setBusy('Membaca foto lokal…');setError('');try{const next=await readPhoto(file);if(epoch!==epochRef.current){revokePhoto(next);return;}putPhoto(key,next);}catch(err){if(epoch===epochRef.current)setError((err as Error).message);}finally{if(epoch===epochRef.current)setBusy('');}}
  async function startAnalysis(){if(!hasPhotos)return;setStep(1);setEditing(true);setMetricId('');setError('');setZoom(1);chooseSide(sides[0]);if(mode!=='profile'&&photos.front&&!Object.keys(photos.front.points).length)await autoDetect();}
  async function autoDetect(){const current=photosRef.current.front;if(!current)return;const epoch=++epochRef.current;setBusy('Mendeteksi titik di perangkatmu…');setError('');try{const points=await detectFront(current);if(epoch===epochRef.current&&photosRef.current.front?.url===current.url)putPhoto('front',{...current,points,source:'auto',confirmed:false});}catch(err){if(epoch===epochRef.current)setError((err as Error).message);}finally{if(epoch===epochRef.current)setBusy('');}}
  function updatePoint(key: string,point: Point){if(!photo)return;putPhoto(side,{...photo,points:{...photo.points,[key]:point},confirmed:false});}
  async function transform(operation:'rotate'|'crop'){if(!photo)return;const epoch=++epochRef.current;setBusy('Menyesuaikan foto…');setError('');try{const next=await transformPhoto(photo,operation);if(epoch===epochRef.current){putPhoto(side,next);setZoom(1);setEditing(true);setSelectedPoint(definitions[side][0].id);}else revokePhoto(next);}catch{if(epoch===epochRef.current)setError('Foto gagal disesuaikan. Coba pilih ulang fotonya.');}finally{if(epoch===epochRef.current)setBusy('');}}
  function confirmSide(){if(!photo)return;try{validatePoints(side,photo.points,photo.width,photo.height);putPhoto(side,{...photo,confirmed:true});const next=sides.find(key=>key!==side&&!photos[key]?.confirmed);if(next){chooseSide(next);setEditing(true);}else{setCreated(new Date());setStep(2);setEditing(false);setMetricId('');setError('');titleRef.current?.focus();}}catch(err){setError((err as Error).message);}}
  function reset(){epochRef.current++;stopDetector();Object.values(photosRef.current).forEach(revokePhoto);photosRef.current={};setPhotos({});setStep(0);setBusy('');setError('');setIncludePhotos(false);setZoom(1);setSide(mode==='profile'?'profile':'front');}
  async function capture(){const video=videoRef.current;if(!video?.videoWidth)return;const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;canvas.getContext('2d')!.drawImage(video,0,0);const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',.95));setDialog(null);if(blob)await loadFile(side,blob);}
  async function exportPng(){setBusy('Membuat rapor di perangkatmu…');try{await document.fonts.ready;await exportReport(photos,mode,includePhotos,created);}catch{setError('Rapor gagal diekspor. Coba kembali atau gunakan simpan PDF.');}finally{setBusy('');}}
  function showDetail(key: Side,id:string){chooseSide(key);setMetricId(id);setEditing(false);setStep(1);setShowLines(true);}
  const pointInstructions=photo?.source==='auto'?'Titik ditemukan otomatis. Geser titik yang meleset, lalu konfirmasi.':'Ketuk foto mengikuti panduan titik. Kamu bisa menggeser dan memperbaikinya kapan saja.';

  return <div className="app-shell">
    <a href="#main" className="skip-link">Langsung ke analisis</a>
    <header className="site-header glass">
      <a href="#" aria-label="AeroFace, kembali ke pilihan foto" onClick={event=>{event.preventDefault();setStep(0);}}><Brand/></a>
      <nav aria-label="Informasi aplikasi"><button className="nav-link" onClick={()=>setDialog('method')}>Cara penilaian</button><button className="nav-link" onClick={()=>setDialog('privacy')}>Privasi <MoveUpRight size={12}/></button></nav>
      <span className="local-badge"><span/>Diproses lokal</span>
    </header>

    <main id="main" className={`main-content step-${step}`}>
      <div className="workspace-topline"><div className="workspace-name"><span className="workspace-orb"><ScanFace size={14}/></span>Personal face studio<span className="version-label">v1.0</span></div><button className="text-button quiet" onClick={()=>setGlass(value=>!value)} aria-pressed={!glass}><SlidersHorizontal size={14}/>{glass?'Kurangi transparansi':'Aktifkan liquid glass'}</button></div>
      <div className="page-heading"><div><p className="intro-label">Ruang untuk mengenal dirimu.</p><h1 ref={titleRef} tabIndex={-1}>{step===0?<>Kenali wajahmu.<br/><span>Pahami proporsinya.</span></>:step===1?'Di balik setiap pengukuran.':'Rapor, khusus untukmu.'}</h1><p className="page-description">{step===0?'Dari foto ke proporsi. Lihat cara penilaiannya, dengan privasi yang tetap jadi milikmu.':step===1?'Periksa titiknya. Telusuri garisnya. Kamu tetap memegang kendali.':'Semua hasil dalam satu tempat. Dibuat dan disimpan hanya atas pilihanmu.'}</p></div>{step>0&&<button className="secondary-button" onClick={()=>setStep(step===2?1:0)}><ArrowLeft size={15}/>{step===2?'Periksa lagi':'Kembali ke foto'}</button>}</div>

      <nav className="step-navigation" aria-label="Tahap analisis">
        {[['Pilih foto','01'],['Pengukuran','02'],['Rapor wajah','03']].map(([label,number],index)=><button key={label} className={`step-item ${step===index?'current':''} ${step>index?'complete':''}`} aria-current={step===index?'step':undefined} disabled={!!busy||(index===1&&!hasPhotos)||(index===2&&!allConfirmed)} onClick={()=>{setStep(index);if(index===1)setEditing(true);}}><span className="step-number">{step>index?<Check size={13}/>:number}</span>{label}{index<2&&<ChevronRight size={14} className="step-chevron"/>}</button>)}
      </nav>
      {error&&<ErrorMessage message={error} onDismiss={()=>setError('')}/>}

      {step===0&&<section className="start-grid" aria-label="Pilih mode dan foto">
        <div className="setup-panel surface">
          <div className="section-heading"><div><h2>Mulai dari sudutmu.</h2><p>Pilih yang ingin kamu kenali lebih dekat.</p></div><span className="small-index"><Focus size={20} strokeWidth={1.2}/></span></div>
          <div className="mode-control glass" role="group" aria-label="Mode analisis"><span className="mode-indicator" style={{transform:`translateX(${modes.findIndex(item=>item.id===mode)*100}%)`}}/>{modes.map(item=><button key={item.id} aria-pressed={mode===item.id} disabled={!!busy} className={mode===item.id?'selected':''} onClick={()=>chooseMode(item.id)}><span>{item.title}</span><small>{item.subtitle}</small></button>)}</div>
          <div className={`upload-grid ${sides.length===1?'single':''}`}>{sides.map(key=><UploadCard key={key} side={key} photo={photos[key]} disabled={!!busy} onFile={file=>loadFile(key,file)} onRemove={()=>putPhoto(key)} onCamera={()=>{chooseSide(key);setDialog('camera');}}/>)}</div>
          <div className="upload-format"><FileImage size={13}/><span>JPG, PNG, WebP · hingga 20 MB per foto</span></div>
          <button className="primary-button wide" disabled={!hasPhotos||!!busy} onClick={startAnalysis}>{busy?<><span className="spinner"/>{busy}</>:<>Mulai analisis<ArrowRight size={17}/></>}</button>
          <p className="local-note"><LockKeyhole size={12}/>Foto tetap di perangkatmu. Tanpa akun, tanpa unggahan.</p>
        </div>
        <div className="preview-panel">
          <div className="preview-top"><span className="preview-label"><span/>Geometri, dijelaskan.</span><button className="icon-button" onClick={()=>setDialog('guide')} aria-label="Buka panduan foto"><Maximize2 size={16}/></button></div>
          <Illustration side={mode==='profile'?'profile':'front'}/>
          <div className="illustration-note glass"><span className="note-icon"><Layers2 size={17}/></span><div><strong>Lebih dari sekadar angka.</strong><p>Titik, garis, dan alasan di balik setiap nilai.</p></div><Sparkles size={16}/></div>
          <span className="illustration-caption">Ilustrasi panduan · bukan hasil analisis</span>
        </div>
      </section>}

      {step===0&&<div className="below-start"><button className="guide-link" onClick={()=>setDialog('guide')}><CircleHelp size={16}/><span>Foto seperti apa yang paling cocok?</span><ArrowRight size={14}/></button><div className="principles"><span><ShieldCheck size={14}/>Privat secara desain</span><span><ScanFace size={14}/>Penilaian transparan</span><span><WifiOff size={14}/>Bisa offline</span></div></div>}

      {step===1&&photo&&<section className="analysis-grid" aria-label="Pengukuran wajah">
        <div className="editor-panel surface">
          <div className="editor-header"><div className="side-tabs" role="group" aria-label="Sisi yang ditampilkan">{sides.map(key=><button key={key} className={side===key?'active':''} onClick={()=>chooseSide(key)}>{key==='front'?'Depan':'Samping'}{photos[key]?.confirmed&&<Check size={13}/>}</button>)}</div><span className="subtle-label">{photo.width} × {photo.height}</span></div>
          <div className="photo-stage"><PhotoEditor photo={photo} side={side} selectedMetric={!editing&&showLines?selectedMetric:undefined} editing={editing&&!busy} selectedPoint={selectedPoint} onSelectPoint={setSelectedPoint} onChange={updatePoint} zoom={zoom}/>{!showLines&&!editing&&<img className="original-overlay" src={photo.url} alt="Foto asli tanpa garis ukur"/>}{!!busy&&<div className="processing-overlay glass" role="status"><span className="spinner"/><span>{busy}</span><small>Foto tidak meninggalkan browser.</small></div>}</div>
          <div className="editor-tools"><div><button className="icon-button" aria-label="Perkecil foto" disabled={zoom<=1} onClick={()=>setZoom(value=>Math.max(1,value-.25))}><ZoomOut size={17}/></button><span>{Math.round(zoom*100)}%</span><button className="icon-button" aria-label="Perbesar foto" disabled={zoom>=2} onClick={()=>setZoom(value=>Math.min(2,value+.25))}><ZoomIn size={17}/></button></div><div><button className="text-button" disabled={!!busy} onClick={()=>transform('rotate')}><RotateCw size={15}/>Putar</button><button className="text-button" disabled={!!busy} onClick={()=>transform('crop')} title="Potong tengah ke rasio 3:4; titik ukur akan direset"><Crop size={15}/>Potong 3:4</button><button className="text-button" aria-pressed={showLines} disabled={editing} onClick={()=>setShowLines(value=>!value)}><Layers2 size={15}/>{showLines?'Garis ukur':'Foto asli'}</button></div></div>
        </div>
        <aside className="analysis-sidebar">
          <div className="section-heading"><div><h2>{editing?'Buat titiknya tepat.':'Lihat cara nilainya.'}</h2><p>{SIDE_LABEL[side]}</p></div><button className="icon-button" onClick={()=>setDialog('guide')} aria-label="Bantuan pengukuran"><CircleHelp size={18}/></button></div>
          <div className="view-toggle" role="group" aria-label="Mode editor"><button className={editing?'active':''} onClick={()=>setEditing(true)}><Settings2 size={14}/>Atur titik</button><button className={!editing?'active':''} disabled={!metrics.length} onClick={()=>setEditing(false)}><ScanFace size={14}/>Lihat ukuran</button></div>
          {editing?<>
            <p className="editor-instructions">{pointInstructions}</p>
            <div className="editor-guide"><span className="guide-number">{donePoints}/{definitions[side].length}</span><div><strong>{donePoints===definitions[side].length?'Semua titik sudah ada.':'Ikuti titik satu per satu.'}</strong><p>{donePoints===definitions[side].length?'Periksa titik di foto sebelum melanjutkan.':'Titik berikutnya disorot pada pemilih di bawah foto.'}</p></div></div>
            {side==='front'&&<button className="secondary-button wide" onClick={autoDetect} disabled={!!busy}><ScanFace size={16}/>{Object.keys(photo.points).length?'Deteksi ulang otomatis':'Deteksi titik otomatis'}</button>}
            {side==='profile'&&<div className="quiet-notice"><Info size={16}/><p>Profil memakai titik manual. Ramus yang ditampilkan adalah estimasi kontur permukaan, bukan panjang tulang.</p></div>}
            <div className="quality-summary"><span>Kualitas masukan</span><strong>{photo.quality.warnings.length?'Perlu diperiksa':'Pencahayaan & detail cukup'}</strong><p>{photo.quality.warnings.join(' ')||'Pemeriksaan awal pencahayaan dan detail; bukan jaminan ketepatan pose atau titik.'}</p></div>
            <button className="primary-button wide" onClick={confirmSide} disabled={!!busy||donePoints<definitions[side].length}>{sides.some(key=>key!==side&&!photos[key]?.confirmed)?<>Konfirmasi & lanjut<ArrowRight size={16}/></>:<>Konfirmasi & buat rapor<CheckCheck size={16}/></>}</button>
            <p className="confirm-note">Dengan melanjutkan, kamu mengonfirmasi posisi titik pada foto ini.</p>
          </>:<>
            <div className="metric-list">{metrics.map(metric=><button key={metric.id} className={`metric-row ${selectedMetric?.id===metric.id?'active':''}`} onClick={()=>setMetricId(metric.id)}><span>{metric.name}<small>{metric.display}</small></span><span className="metric-value">{scoreText(metric.score)}<ChevronRight size={14}/></span></button>)}</div>
            {selectedMetric&&<div className="metric-detail" key={selectedMetric.id}><span className="detail-label">Cara membaca</span><h3>{selectedMetric.name}</h3><p>{selectedMetric.description}</p><dl><div><dt>Pengukuran</dt><dd>{selectedMetric.display}</dd></div><div><dt>Bobot pada sisi ini</dt><dd>{selectedMetric.weight}%</dd></div></dl><div className="formula-box"><span>Rumus</span><p>{selectedMetric.formula}</p><span>Acuan rubrik</span><p>{selectedMetric.reference}</p></div></div>}
            {allConfirmed&&<button className="primary-button wide" onClick={()=>setStep(2)}>Kembali ke rapor<ArrowRight size={16}/></button>}
          </>}
        </aside>
      </section>}

      {step===2&&allConfirmed&&total!==null&&<section className="report-screen" aria-label="Rapor wajah">
        <div className="report-summary surface"><div className="report-seal"><Fingerprint size={28} strokeWidth={1.2}/></div><div className="report-summary-main"><p>{mode==='full'?'Skor proporsi gabungan':`Skor proporsi ${mode==='front'?'depan':'samping'}`}</p><div className="headline-score">{scoreText(total)}<span>/ 10</span></div><span className="score-caption">Kecocokan dengan rubrik geometri AeroFace</span></div><div className="summary-sides">{(['front','profile'] as Side[]).map(key=><div key={key}><span>{SIDE_LABEL[key]}</span><strong>{sideScores[key]!==undefined?`${scoreText(sideScores[key])} / 10`:<small>Belum dianalisis</small>}</strong></div>)}<button className="text-button" onClick={()=>setDialog('method')}>Bagaimana nilainya dihitung?<ArrowRight size={13}/></button></div></div>
        <div className="report-context"><Info size={15}/><p>Skor ini mengikuti rubrik proporsi pilihan produk, bukan ukuran objektif daya tarik. Hasil dipengaruhi pose, foto, dan ketepatan titik.</p></div>
        <div className="report-columns">{sides.map(key=>{const p=photos[key]!,list=calculateMetrics(key,p.points,p.width,p.height);return <article key={key} className="report-side surface"><div className="report-side-heading"><div><h2>{SIDE_LABEL[key]}</h2><p>{p.source==='auto'?'Titik otomatis, diperiksa pengguna':'Titik manual, dikonfirmasi pengguna'}</p></div><span>{scoreText(sideScores[key])}<small>/10</small></span></div>{list.map(metric=><button className="report-metric" key={metric.id} onClick={()=>showDetail(key,metric.id)}><div className="report-metric-top"><span>{metric.name}{metric.estimated&&<small>Estimasi 2D</small>}</span><strong>{scoreText(metric.score)}<small>/10</small><ChevronRight size={14}/></strong></div><div className="score-track"><span style={{transform:`scaleX(${metric.score/10})`}}/></div><div className="report-metric-bottom"><span>{metric.display}</span><span>Bobot {metric.weight}%</span></div></button>)}<p className="side-insight">{key==='profile'?'Ramus dan sudut rahang menunjukkan kontur permukaan yang tampak pada foto.':'Garis tengah diselaraskan terhadap mata. Foto lurus dan ekspresi netral membantu pembacaan.'}</p></article>;})}</div>
        <div className="report-export surface"><div><span className="export-icon"><ArrowDownToLine size={22}/></span><h2>Simpan kalau kamu mau.</h2><p>Rapor dibuat di perangkatmu. Tidak ada salinan di server.</p></div><div className="export-actions"><label className="checkbox-label"><input type="checkbox" checked={includePhotos} onChange={event=>setIncludePhotos(event.target.checked)}/>Sertakan foto & garis ukur</label><div className="export-buttons"><button className="secondary-button" disabled={!!busy} onClick={()=>{downloadBlob(new Blob([JSON.stringify(reportData(photos,mode,created),null,2)],{type:'application/json'}),`AeroFace-rapor-${mode}.json`);}}><FileJson size={15}/>Data</button><button className="secondary-button" disabled={!!busy} onClick={()=>window.print()}><Download size={15}/>Simpan PDF</button><button className="primary-button" disabled={!!busy} onClick={exportPng}><FileImage size={16}/>{busy?'Menyiapkan…':'Unduh gambar'}</button></div></div></div>
        {mode!=='full'&&<div className="extend-report"><p>Ingin melihat dari sisi lainnya juga?</p><button className="text-button" onClick={()=>chooseMode('full')}>Lengkapi analisis<ArrowRight size={14}/></button></div>}
      </section>}
      <footer className="site-footer"><span><span className="status-dot"/>{offline}</span><span>Dibuat untuk memahami, bukan membandingkan.</span><button className="text-button" onClick={reset} disabled={!Object.values(photos).some(Boolean)&&!busy}><Trash2 size={13}/>Bersihkan sesi</button></footer>
    </main>

    <dialog ref={dialogRef} className={`info-dialog ${dialog==='camera'?'camera-dialog':''}`} onCancel={()=>setDialog(null)} onClick={event=>{if(event.target===event.currentTarget)setDialog(null);}}>
      <div className="dialog-inner"><button className="dialog-close icon-button" aria-label="Tutup jendela" onClick={()=>setDialog(null)} autoFocus><X size={20}/></button>
        {dialog==='privacy'&&<><span className="dialog-icon"><ShieldCheck size={28}/></span><h2>Wajahmu. Perangkatmu.</h2><p className="dialog-intro">Privasi dibangun ke dalam alurnya, dari awal sampai akhir.</p><div className="privacy-facts"><div><LockKeyhole/><span><strong>Foto tidak diunggah.</strong><p>File dibaca dan diolah langsung di browser. Deteksi titik juga berjalan lokal.</p></span></div><div><Monitor/><span><strong>Hanya selama sesi.</strong><p>Aplikasi tidak menyimpan foto, titik, atau rapor ke cookie, localStorage, IndexedDB, maupun server.</p></span></div><div><WifiOff/><span><strong>Siap tanpa internet.</strong><p>Setelah indikator offline siap, aplikasi dan model tersedia tanpa koneksi. Cache hanya berisi file aplikasi dan model.</p></span></div><div><Download/><span><strong>Ekspor atas pilihanmu.</strong><p>Foto tidak disertakan dalam rapor secara default. File unduhan tersimpan hanya di perangkat yang kamu pilih.</p></span></div></div><p className="fine-print">GitHub Pages sebagai penyedia hosting dapat mencatat IP untuk keamanan saat kamu membuka situs. Aplikasi tidak memakai analytics, iklan, atau font eksternal.</p><a className="external-link" href="https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection" target="_blank" rel="noreferrer">Kebijakan hosting GitHub<MoveUpRight size={13}/></a></>}
        {dialog==='method'&&<><span className="dialog-icon"><ScanFace size={28}/></span><h2>Angka yang bisa ditelusuri.</h2><p className="dialog-intro">{RUBRIC} memakai rasio dan sudut kontur foto. Tidak ada model rahasia yang menebak daya tarikmu.</p><div className="method-section"><h3>Dari ukuran ke skor</h3><p>Di dalam rentang acuan, metrik mendapat 10. Di luar rentang, skor turun secara linear hingga 0. Rentang, bobot, dan laju penurunan adalah pilihan desain produk dan belum tervalidasi secara ilmiah sebagai skor daya tarik.</p><code>skor = max(0, 10 × (1 − jarak ke rentang / toleransi))</code></div><div className="method-section"><h3>Bobot yang terbuka</h3><p>Depan: simetri 35%, jarak mata 25%, proporsi bawah 25%, kontur rahang 15%. Samping: profil 30%, relasi bibir 25%, sudut kontur 25%, ramus visual 20%.</p><p>Skor sisi adalah rata-rata tertimbang. Mode lengkap memakai 50% depan + 50% samping. Mode satu sisi hanya memakai sisi yang dipilih.</p></div><div className="method-section"><h3>Batas yang perlu dipahami</h3><p>Foto 2D tidak memberikan panjang tulang dalam milimeter atau bentuk struktur yang tersembunyi. Semua metrik profil adalah estimasi permukaan. Pengaruh perspektif, ekspresi, dan posisi titik belum bisa dihilangkan sepenuhnya.</p><p>Kualitas foto dinilai terpisah dan tidak mengurangi skor proporsi. Ini bukan alat diagnosis atau rekomendasi tindakan medis.</p></div><a className="external-link" href="https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker" target="_blank" rel="noreferrer">Tentang pendeteksi titik MediaPipe<MoveUpRight size={13}/></a></>}
        {dialog==='guide'&&<><span className="dialog-icon"><Focus size={28}/></span><h2>Foto yang membantu pembacaan.</h2><p className="dialog-intro">Gunakan foto terbaru tanpa filter, dengan satu wajah dan ekspresi netral.</p><div className="photo-guides"><div><Illustration side="front"/><h3>Tampak depan</h3><p>Kepala lurus, kamera sejajar mata, kedua sisi wajah terlihat. Hindari selfie dari jarak terlalu dekat dan lensa ultrawide.</p></div><div><Illustration side="profile"/><h3>Tampak samping</h3><p>Menghadap tepat ke kiri atau kanan. Telinga, kontur rahang, dan dagu terlihat. Singkirkan rambut yang menutup kontur.</p></div></div><div className="quiet-notice"><Info size={16}/><p>Gunakan cahaya merata dan latar sederhana. Kamu bisa memutar atau memotong tengah foto sebelum menempatkan titik. Pengeditan foto mereset titik ukur.</p></div></>}
        {dialog==='camera'&&<><h2>Ambil foto {side==='front'?'depan':'samping'}.</h2><p className="dialog-intro">Kamera hanya aktif selama jendela ini terbuka.</p><video ref={videoRef} playsInline muted className="camera-preview"/>{cameraError&&<p className="camera-error" role="alert">{cameraError}</p>}<button className="primary-button wide" disabled={!cameraReady} onClick={capture}><Video size={17}/>Ambil foto</button></>}
      </div>
    </dialog>

    {step===2&&allConfirmed&&total!==null&&<div className="print-report"><Brand/><h1>Rapor proporsi wajah</h1><p>{mode==='full'?'Analisis lengkap':SIDE_LABEL[mode]} · {created.toLocaleDateString('id-ID')} · {RUBRIC}</p><h2>{scoreText(total)} / 10</h2><p>Skor kecocokan dengan rubrik geometri. Bukan ukuran objektif daya tarik.</p>{sides.map(key=>{const p=photos[key]!,list=calculateMetrics(key,p.points,p.width,p.height);return <section key={key}><h2>{SIDE_LABEL[key]} — {scoreText(sideScores[key])}/10</h2>{includePhotos&&<div className="print-photo"><PhotoEditor photo={p} side={key} editing={false} selectedPoint="" onSelectPoint={()=>{}} onChange={()=>{}} zoom={1}/></div>}<table><thead><tr><th>Metrik</th><th>Ukuran</th><th>Skor</th><th>Bobot</th></tr></thead><tbody>{list.map(metric=><tr key={metric.id}><td>{metric.name}{metric.estimated?' (estimasi 2D)':''}</td><td>{metric.display}</td><td>{scoreText(metric.score)}/10</td><td>{metric.weight}%</td></tr>)}</tbody></table><p>{p.source==='auto'?'Titik otomatis, diperiksa pengguna.':'Titik ditempatkan manual dan dikonfirmasi pengguna.'}</p>{p.quality.warnings.length>0&&<p>Catatan foto: {p.quality.warnings.join(' ')}</p>}</section>;})}<footer>Rentang dan bobot adalah pilihan desain produk, belum tervalidasi sebagai skor daya tarik. Profil dan ramus adalah estimasi kontur 2D, bukan pengukuran tulang asli. Dibuat lokal di perangkat pengguna.</footer></div>}
    <div className="sr-only" role="status" aria-live="polite">{busy}</div>
  </div>;
}
