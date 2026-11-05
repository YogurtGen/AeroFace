import{readFile,copyFile,mkdir}from'node:fs/promises';import{createHash}from'node:crypto';
const manifest=JSON.parse(await readFile('public/models/appearance-model.json','utf8'));
const weights=await readFile('public/models/'+manifest.file);
if(createHash('sha256').update(weights).digest('hex')!==manifest.sha256)throw new Error('Appearance model checksum mismatch.');
const runtime=JSON.parse(await readFile('node_modules/onnxruntime-web/package.json','utf8'));
if(runtime.version!==manifest.runtime)throw new Error('Review the appearance runtime manifest before updating ONNX Runtime.');
await mkdir('public/vendor/ort',{recursive:true});
for(const file of['ort.wasm.min.js','ort-wasm-simd-threaded.mjs','ort-wasm-simd-threaded.wasm'])await copyFile('node_modules/onnxruntime-web/dist/'+file,'public/vendor/ort/'+file);
console.log(`Local appearance model verified (${manifest.bytes} bytes; ONNX Runtime ${runtime.version}).`);
