import { toPixels } from './analysis';
import type { Photo } from './photos';
export const APPEARANCE_MODEL='FaceONNX ResNet-18';
export type Appearance={score:number;raw:number;model:string};
let worker:Worker|null=null,cancel:(()=>void)|null=null;
export function stopAppearance(){cancel?.();cancel=null;worker?.terminate();worker=null;}
export async function predictAppearance(photo:Photo,signal?:AbortSignal):Promise<Appearance>{
  stopAppearance();
  const p=toPixels(photo.points,photo.width,photo.height);
  if(!p.cheekL||!p.cheekR||!p.chin||!p.eyeLO||!p.eyeRO)throw new Error('Front landmarks are needed for the appearance model.');
  const eyes={x:(p.eyeLO.x+p.eyeRO.x)/2,y:(p.eyeLO.y+p.eyeRO.y)/2};
  const size=Math.max(Math.hypot(p.cheekR.x-p.cheekL.x,p.cheekR.y-p.cheekL.y)*1.3,Math.hypot(p.chin.x-eyes.x,p.chin.y-eyes.y)*1.9);
  const center={x:(p.cheekL.x+p.cheekR.x)/2,y:eyes.y+size*.12};
  const canvas=document.createElement('canvas');canvas.width=224;canvas.height=224;
  const ctx=canvas.getContext('2d')!,source=await createImageBitmap(photo.blob);
  ctx.fillStyle='#fff';ctx.fillRect(0,0,224,224);ctx.translate(112,112);ctx.scale(224/size,224/size);
  ctx.rotate(-Math.atan2(p.eyeRO.y-p.eyeLO.y,p.eyeRO.x-p.eyeLO.x));ctx.drawImage(source,-center.x,-center.y);source.close();
  const bitmap=await createImageBitmap(canvas);
  if(signal?.aborted){bitmap.close();throw new Error('Detection canceled.');}
  const current=new Worker(new URL('appearance-worker.js',new URL(import.meta.env.BASE_URL,location.href)));worker=current;
  return new Promise((resolve,reject)=>{
    const abort=()=>{done();reject(new Error('Detection canceled.'));};
    const done=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);cancel=null;current.terminate();if(worker===current)worker=null;};
    const timer=setTimeout(()=>{done();reject(new Error('The appearance model took too long. Geometry is still available.'));},90000);
    cancel=abort;signal?.addEventListener('abort',abort,{once:true});
    current.onerror=()=>{done();reject(new Error('The appearance model cannot run in this browser. Geometry is still available.'));};
    current.onmessage=event=>{done();if(event.data.error)reject(new Error('The appearance model could not produce a result. Geometry is still available.'));else resolve({...event.data,model:APPEARANCE_MODEL});};
    current.postMessage({bitmap},[bitmap]);
  });
}
