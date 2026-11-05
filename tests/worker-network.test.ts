import{test}from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{runInNewContext}from'node:vm';
test('both inference workers block off-origin URL objects, writes and external imports',async()=>{
  for(const file of['analysis-worker.js','appearance-worker.js']){
    const calls:unknown[]=[];
    const self:{[key:string]:any}={location:{origin:'https://example.test',href:'https://example.test/AeroFace/'+file},fetch:async(...args:unknown[])=>{calls.push(args);return{ok:true};},importScripts:()=>{},XMLHttpRequest:class{open(){}},WebSocket:class{}};
    runInNewContext(readFileSync('public/'+file,'utf8'),{self,URL,importScripts:(...urls:string[])=>self.importScripts(...urls),ort:{env:{wasm:{}}}});
    await assert.rejects(self.fetch(new URL('https://other.test/model.onnx')),/External/);
    await assert.rejects(self.fetch('/photo',{method:'POST'}),/External/);
    await assert.rejects(self.fetch({url:'https://example.test/photo',method:'POST'}),/External/);
    await self.fetch(new URL('https://example.test/AeroFace/models/model.onnx'));assert.equal(calls.length,1);
    assert.throws(()=>self.importScripts('https://other.test/script.js'),/External/);
    assert.throws(()=>new self.WebSocket('wss://other.test'),/disabled/);
    assert.throws(()=>new self.XMLHttpRequest().open('POST','https://example.test/photo'),/External/);
  }
});
