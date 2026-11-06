import { toPixels } from './analysis';
import type { Photo } from './photos';
export const APPEARANCE_MODEL='FaceONNX ResNet-18';
export const APPEARANCE_PIPELINE='aligned-six-view-v1';
export type Appearance={score:number;raw:number;model:string;pipeline:string;samples:number[];sensitivity:{min:number;max:number}};
let worker:Worker|null=null,cancel:(()=>void)|null=null;
export function stopAppearance(){cancel?.();cancel=null;worker?.terminate();worker=null;}
export async function predictAppearance(photo:Photo,signal?:AbortSignal):Promise<Appearance>{
  stopAppearance();
  const p=toPixels(photo.points,photo.width,photo.height);
  if(!p.cheekL||!p.cheekR||!p.chin||!p.eyeLO||!p.eyeLI||!p.eyeRI||!p.eyeRO)throw new Error('Front landmarks are needed for the appearance model.');
  const left={x:(p.eyeLO.x+p.eyeLI.x)/2,y:(p.eyeLO.y+p.eyeLI.y)/2},right={x:(p.eyeRO.x+p.eyeRI.x)/2,y:(p.eyeRO.y+p.eyeRI.y)/2};
  const eyes={x:(left.x+right.x)/2,y:(left.y+right.y)/2};
  const size=Math.max(Math.hypot(p.cheekR.x-p.cheekL.x,p.cheekR.y-p.cheekL.y)*1.3,Math.hypot(p.chin.x-eyes.x,p.chin.y-eyes.y)*1.9);
  const center={x:(p.cheekL.x+p.cheekR.x)/2,y:eyes.y+size*.12};
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext('2d')!,source=await createImageBitmap(photo.blob);
  ctx.fillStyle='#fff';ctx.fillRect(0,0,256,256);ctx.translate(128,128);ctx.scale(256/(size*1.08),256/(size*1.08));
  ctx.rotate(-Math.atan2(right.y-left.y,right.x-left.x));ctx.drawImage(source,-center.x,-center.y);source.close();
  const bitmap=await createImageBitmap(canvas);
  if(signal?.aborted){bitmap.close();throw new Error('Detection canceled.');}
  const workerUrl=new URL('appearance-worker.js',new URL(import.meta.env.BASE_URL,location.href));workerUrl.searchParams.set('pipeline',APPEARANCE_PIPELINE);
  const current=new Worker(workerUrl);worker=current;
  return new Promise((resolve,reject)=>{
    const abort=()=>{done();reject(new Error('Detection canceled.'));};
    const done=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);cancel=null;current.terminate();if(worker===current)worker=null;};
    const timer=setTimeout(()=>{done();reject(new Error('The appearance model took too long. Geometry is still available.'));},90000);
    cancel=abort;signal?.addEventListener('abort',abort,{once:true});
    current.onerror=()=>{done();reject(new Error('The appearance model cannot run in this browser. Geometry is still available.'));};
    current.onmessage=event=>{done();if(event.data.error||event.data.pipeline!==APPEARANCE_PIPELINE||event.data.samples?.length!==6)reject(new Error('The appearance model could not produce a result. Geometry is still available.'));else resolve({...event.data,model:APPEARANCE_MODEL});};
    current.postMessage({bitmap},[bitmap]);
  });
}
