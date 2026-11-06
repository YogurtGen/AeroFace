const base=new URL('./',self.location.href),nativeFetch=self.fetch.bind(self);
self.fetch=(input,init)=>{
  const url=new URL(input instanceof URL?input.href:typeof input==='string'?input:input.url,self.location.href);
  const method=init?.method||(typeof input==='object'&&input.method)||'GET';
  if(url.origin!==self.location.origin||method.toUpperCase()!=='GET')return Promise.reject(new Error('External requests are disabled.'));
  return nativeFetch(input,init);
};
self.WebSocket=class{constructor(){throw new Error('External requests are disabled.');}};
const nativeImport=self.importScripts.bind(self);
self.importScripts=(...urls)=>{if(urls.some(url=>new URL(url,self.location.href).origin!==self.location.origin))throw new Error('External scripts are disabled.');return nativeImport(...urls);};
const NativeXHR=self.XMLHttpRequest;
if(NativeXHR)self.XMLHttpRequest=class extends NativeXHR{open(method,url,...rest){if(new URL(url,self.location.href).origin!==self.location.origin||method.toUpperCase()!=='GET')throw new Error('External requests are disabled.');return super.open(method,url,...rest);}};
importScripts('./vendor/ort/ort.wasm.min.js');
importScripts('./appearance-math.js');
ort.env.wasm.wasmPaths=base.href+'vendor/ort/';
ort.env.wasm.numThreads=1;
ort.env.wasm.proxy=false;
self.onmessage=async event=>{
  const {bitmap}=event.data;let session;
  try{
    session=await ort.InferenceSession.create(base.href+'models/beauty_resnet18.onnx',{executionProviders:['wasm'],graphOptimizationLevel:'all'});
    const canvas=new OffscreenCanvas(224,224),ctx=canvas.getContext('2d',{willReadFrequently:true}),values=[];
    const legacy=bitmap.width===224;
    if(!legacy&&bitmap.width!==256)throw new Error('Invalid appearance input.');
    for(const framing of (legacy?[1]:[.96,1,1.04]))for(const mirrored of (legacy?[false]:[false,true])){
      const size=legacy?224:bitmap.width/1.08*framing,offset=(bitmap.width-size)/2;
      ctx.save();ctx.fillStyle='#fff';ctx.fillRect(0,0,224,224);if(mirrored){ctx.translate(224,0);ctx.scale(-1,1);}
      ctx.drawImage(bitmap,offset,offset,size,size,0,0,224,224);ctx.restore();
      const rgba=ctx.getImageData(0,0,224,224).data,data=new Float32Array(3*224*224),plane=224*224;
      for(let i=0;i<plane;i++){
        data[i]=(rgba[i*4+2]-104)/255;
        data[plane+i]=(rgba[i*4+1]-117)/255;
        data[2*plane+i]=(rgba[i*4]-123)/255;
      }
      const input=new ort.Tensor('float32',data,[1,3,224,224]);let output;
      try{output=await session.run({[session.inputNames[0]]:input});values.push(Number(output[session.outputNames.at(-1)].data[0]));}
      finally{input.dispose();if(output)Object.values(output).forEach(tensor=>tensor.dispose());}
    }
    if(legacy){const raw=values[0];if(!Number.isFinite(raw)||raw<0||raw>6)throw new Error('Invalid appearance result.');self.postMessage({raw,score:Math.round(Math.max(0,Math.min(10,raw*2))*10)/10,pipeline:'legacy-single-view'});}
    else self.postMessage(AeroFaceAppearance.summarize(values));
  }catch(error){self.postMessage({error:error instanceof Error?error.message:'Appearance model unavailable.'});}
  finally{bitmap.close();await session?.release();}
};
