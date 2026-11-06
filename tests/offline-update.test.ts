import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {serviceWorkerSource} from '../scripts/service-worker-source.mjs';

async function request({online,mode='navigate',url='https://example.test/AeroFace/',method='GET'}:{online:boolean;mode?:string;url?:string;method?:string}){
  const handlers:any={},calls:string[]=[];let result:Promise<any>|undefined;
  const cached={body:'old layout'},fresh={ok:true,body:'current layout'};
  runInNewContext(serviceWorkerSource('test',['./index.html']),{
    URL,self:{location:{origin:'https://example.test',href:'https://example.test/AeroFace/sw.js'},addEventListener:(name:string,handler:any)=>handlers[name]=handler},
    caches:{open:async()=>({match:async()=>{calls.push('cache');return cached;}})},
    fetch:async()=>{calls.push('network');if(!online)throw new Error('offline');return fresh;},
  });
  handlers.fetch({request:{url,method,mode},respondWith:(promise:Promise<any>)=>result=promise});
  return {value:await result,calls};
}
test('online navigation uses the current release instead of the cached legacy exporter',async()=>{
  const result=await request({online:true});assert.equal(result.value.body,'current layout');assert.deepEqual(result.calls,['network']);
});
test('offline navigation retains the cached app and assets remain cache-first',async()=>{
  const offline=await request({online:false});assert.equal(offline.value.body,'old layout');assert.deepEqual(offline.calls,['network','cache']);
  const asset=await request({online:true,mode:'cors',url:'https://example.test/AeroFace/assets/file.js'});assert.deepEqual(asset.calls,['cache']);
});
test('service-worker updates do not intercept uploads or third-party requests',async()=>{
  for(const options of[{online:true,method:'POST'},{online:true,url:'https://other.test/photo'}]){const result=await request(options);assert.equal(result.value,undefined);assert.deepEqual(result.calls,[]);}
});

test('install bypasses old HTTP cache and activation removes obsolete app caches',async()=>{
  const handlers:any={},deleted:string[]=[],requests:Request[]=[];let pending:Promise<any>|undefined,claimed=false;
  runInNewContext(serviceWorkerSource('current',['./index.html','./appearance-worker.js']),{
    URL,Request,self:{location:{href:'https://example.test/AeroFace/sw.js'},addEventListener:(name:string,handler:any)=>handlers[name]=handler,skipWaiting:async()=>{},clients:{claim:async()=>{claimed=true;}}},
    caches:{open:async()=>({addAll:async(values:Request[])=>requests.push(...values)}),keys:async()=>['aeroface-old','aeroface-current','another-app'],delete:async(key:string)=>{deleted.push(key);return true;}},
  });
  handlers.install({waitUntil:(value:Promise<any>)=>pending=value});await pending;
  assert.equal(requests.length,2);assert.ok(requests.every(request=>request.cache==='reload'));assert.equal(requests[1].url,'https://example.test/AeroFace/appearance-worker.js');
  handlers.activate({waitUntil:(value:Promise<any>)=>pending=value});await pending;
  assert.deepEqual(deleted,['aeroface-old']);assert.equal(claimed,true);
});
