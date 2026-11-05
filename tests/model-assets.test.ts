import{test}from'node:test';import assert from'node:assert/strict';import{readFileSync,existsSync}from'node:fs';import{createHash}from'node:crypto';
test('the shipped appearance weights match their recorded source checksum and local runtime assets',()=>{
  const manifest=JSON.parse(readFileSync('public/models/appearance-model.json','utf8'));
  const bytes=readFileSync('public/models/beauty_resnet18.onnx');
  assert.equal(bytes.length,manifest.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.sha256);
  assert.equal(manifest.runtime,JSON.parse(readFileSync('node_modules/onnxruntime-web/package.json','utf8')).version);
  for(const file of['ort.wasm.min.js','ort-wasm-simd-threaded.mjs','ort-wasm-simd-threaded.wasm'])assert.ok(existsSync('public/vendor/ort/'+file));
  for(const file of['LICENSE-FACEONNX.txt','LICENSE-ONNXRUNTIME.txt'])assert.match(readFileSync('public/vendor/'+file,'utf8'),/MIT License/);
});
