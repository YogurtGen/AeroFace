import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

await mkdir('test-results', {recursive:true});
const remote = process.argv[2];
const base = remote || 'http://127.0.0.1:4174/';
let server;
if (!remote) {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4174','--strictPort'], {stdio:'pipe',windowsHide:true});
  server.stderr.on('data', chunk=>process.stderr.write(chunk));
  for(let attempt=0;attempt<60;attempt++) {
    try { const response=await fetch(base); if(response.ok)break; } catch {}
    if(attempt===59)throw new Error('Preview did not start.');
    await new Promise(resolve=>setTimeout(resolve,250));
  }
}
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({acceptDownloads:true});
const page=await context.newPage();
const failures=[],pageErrors=[],external=[],nonGet=[];
page.on('pageerror',error=>pageErrors.push(error.message));
context.on('request',request=>{
  if(!request.url().startsWith(new URL(base).origin)&&!request.url().startsWith('data:')&&!request.url().startsWith('blob:'))external.push(request.url());
  if(request.method()!=='GET')nonGet.push({url:request.url(),method:request.method()});
});
const label=remote?'github':'local';
async function check(name,run){try{await run();console.log(`PASS ${name}`);}catch(error){failures.push(name);console.error(`FAIL ${name}: ${error.stack||error}`);await page.screenshot({path:`test-results/${label}-failure-${failures.length}.png`,fullPage:true,animations:"disabled"}).catch(()=>{});throw error;}}
const frontPoints={eyeLO:{x:.28,y:.37},eyeLI:{x:.4,y:.37},eyeRI:{x:.6,y:.37},eyeRO:{x:.72,y:.37},cheekL:{x:.19,y:.49},cheekR:{x:.81,y:.49},jawL:{x:.26,y:.7},jawR:{x:.74,y:.7},mouthL:{x:.4,y:.67},mouthR:{x:.6,y:.67},noseBase:{x:.5,y:.55},chin:{x:.5,y:.86}};
const profilePoints={nasion:{x:.56,y:.28},noseTip:{x:.74,y:.43},noseBase:{x:.62,y:.48},upperLip:{x:.65,y:.54},lowerLip:{x:.64,y:.59},chin:{x:.62,y:.7},jawAngle:{x:.34,y:.63},ramusTop:{x:.29,y:.4}};
async function placePoints(points){let count=0;for(const [key,p] of Object.entries(points)){await page.locator('#point-selector').selectOption(key);const svg=page.locator('.measurement-overlay'),box=await svg.boundingBox();await svg.click({position:{x:p.x*box.width,y:p.y*box.height}});count++;assert.equal(await page.locator('.measure-point').count(),count,`point ${key} must be placed`);}}
async function upload(side,buffer,mimeType='image/png',name='fixture.png'){await page.getByTestId(`upload-${side}`).setInputFiles({name,mimeType,buffer});await page.locator('.upload-card.has-photo').first().waitFor();await page.locator('.primary-button.wide').filter({hasText:'Start analysis'}).waitFor();}
async function downloadImage(name,withPhotos,button='Download image'){
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:button,exact:true}).click();
  const download=await pending;await download.saveAs(`test-results/${label}-${name}.png`);
  const data=await readFile(await download.path());
  assert.equal(data.readUInt32BE(16),1588,'PNG keeps its A4 width at 2× density on every device');
  assert.ok(data.readUInt32BE(20)>=2246,'the whole report fits at least one A4 page');
  const warmPixels=await page.evaluate(async value=>{
    const bytes=Uint8Array.from(atob(value),char=>char.charCodeAt(0)),image=await createImageBitmap(new Blob([bytes],{type:'image/png'}));
    const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
    const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);image.close();const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    let count=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]>pixels[i+1]+8&&pixels[i+1]>pixels[i+2]+4)count++;return count;
  },data.toString('base64'));
  assert.ok(withPhotos?warmPixels>1000:warmPixels===0,'photo inclusion is reflected in the downloaded pixels');
  assert.equal(await page.locator('iframe').count(),0,'the temporary report and photos are removed');
}
try {
  await page.goto(base,{waitUntil:'networkidle',timeout:60000});
  await check('page is active and has the AeroFace application',async()=>{assert.match(await page.title(),/AeroFace/);assert.equal(await page.locator('h1').count(),1);await page.getByRole('button',{name:'Start analysis'}).waitFor();});
  await check('responsive screenshots and no horizontal overflow',async()=>{
    for(const width of [1440,768,390]){await page.setViewportSize({width,height:width===390?844:1000});await page.screenshot({path:`test-results/${label}-${width}.png`,fullPage:true,animations:"disabled"});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow at ${width}`);}
    await page.setViewportSize({width:1440,height:1000});
  });
  await check('privacy, method and transparency controls',async()=>{
    await page.getByRole('button',{name:'Privacy'}).click();await page.locator('dialog[open]').waitFor();assert.match(await page.locator('dialog').innerText(),/Photos are never uploaded/);await page.getByRole('button',{name:'Close dialog'}).click();
    await page.getByRole('button',{name:'How scoring works'}).click();assert.match(await page.locator('dialog').innerText(),/not scientifically validated/);await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'Reduce transparency'}).click();assert.equal(await page.locator('html').getAttribute('data-glass'),'off');await page.getByRole('button',{name:'Enable liquid glass'}).click();
  });
  await check('profile guide has a readable head crop at desktop and mobile sizes',async()=>{
    await page.getByRole('button',{name:'Open photo guide'}).click();
    assert.equal(await page.getByRole('img',{name:'Side face guide illustration'}).getAttribute('viewBox'),'85 62 280 315');
    for(const width of[1440,390]){await page.setViewportSize({width,height:width===390?844:1000});await page.locator('dialog').screenshot({path:`test-results/${label}-guide-${width}.png`});assert.ok(await page.evaluate(()=>document.querySelector('dialog').scrollWidth<=document.querySelector('dialog').clientWidth+1));}
    await page.getByRole('button',{name:'Close dialog'}).click();await page.setViewportSize({width:1440,height:1000});
  });
  await check('English and Indonesian settings apply to the UI and survive reload without storage',async()=>{
    assert.equal(await page.locator('html').getAttribute('lang'),'en');
    await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'ID Indonesia'}).click();assert.equal(await page.locator('html').getAttribute('lang'),'id');await page.getByRole('button',{name:'Tutup jendela'}).click();await page.getByRole('button',{name:'Mulai analisis'}).waitFor();
    await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('html').getAttribute('lang'),'id');await page.getByRole('button',{name:'Pengaturan',exact:true}).click();await page.getByRole('button',{name:'EN English'}).click();
    await page.getByRole('checkbox',{name:'Interface motion'}).uncheck();assert.equal(await page.locator('html').getAttribute('data-motion'),'off');await page.getByRole('checkbox',{name:'Interface motion'}).check();await page.getByRole('button',{name:'Close dialog'}).click();assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
  });
  const fixtureData=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=800;c.height=1000;const x=c.getContext('2d');x.fillStyle='#e9edf4';x.fillRect(0,0,800,1000);x.fillStyle='#d2bbad';x.beginPath();x.ellipse(400,490,245,360,0,0,Math.PI*2);x.fill();x.fillStyle='#718094';x.fillRect(220,365,110,8);x.fillRect(475,365,110,8);x.fillRect(320,670,160,8);x.fillStyle='#b39b8d';x.fillRect(390,410,20,145);return c.toDataURL('image/png').split(',')[1];});
  const fixture=Buffer.from(fixtureData,'base64');
  await check('invalid photo is rejected and does not enable analysis',async()=>{
    await page.getByTestId('upload-front').setInputFiles({name:'invalid.txt',mimeType:'text/plain',buffer:Buffer.from('not a photo')});await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/JPG/);assert.equal(await page.getByRole('button',{name:'Start analysis'}).isDisabled(),true);await page.getByRole('button',{name:'Close message'}).click();
  });
  await check('small JPEGs at the reported sizes are accepted without upscaling',async()=>{
    for(const [width,height,side]of[[184,320,'profile'],[236,354,'front']]){
      const data=await page.evaluate(({width,height})=>{const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d').fillRect(0,0,width,height);return canvas.toDataURL('image/jpeg').split(',')[1];},{width,height});
      await page.getByTestId(`upload-${side}`).setInputFiles({name:'small.jpg',mimeType:'image/jpeg',buffer:Buffer.from(data,'base64')});await page.locator('.upload-quality-note').filter({hasText:`${width} × ${height}`}).waitFor();
      const img=page.locator(`.upload-card:has([data-testid="upload-${side}"]) img`);assert.deepEqual(await img.evaluate(image=>[image.naturalWidth,image.naturalHeight]),[width,height]);
    }
    assert.equal(await page.getByRole('button',{name:'Start analysis'}).isEnabled(),true);await page.getByRole('button',{name:'Clear session'}).click();
  });
  await check('profile-only guided placement creates its own report',async()=>{
    await page.getByRole('group',{name:'Analysis mode'}).getByRole('button').nth(1).click();await upload('profile',fixture);await page.getByRole('button',{name:'Start analysis'}).click();await page.locator('#point-selector').waitFor();await page.locator('.analysis-visuals').waitFor({state:'hidden',timeout:60000});await placePoints(profilePoints);await page.getByRole('button',{name:'Confirm & create report'}).click();await page.getByRole('heading',{name:'Your face, in perspective.'}).waitFor();assert.match(await page.locator('.report-summary').innerText(),/Not analyzed/);assert.equal(await page.locator('.report-side').count(),1);assert.match(await page.locator('.report-side').innerText(),/2D estimate/);await page.screenshot({path:`test-results/${label}-profile-report.png`,fullPage:true,animations:"disabled"});
  });
  await check('report tier boundaries and limitations remain visible in both languages',async()=>{
    await page.locator('.tier-scale summary').click();assert.equal(await page.locator('.tier-band-list>div').count(),8);assert.equal(await page.locator('.tier-band-list .current').count(),0);assert.equal(await page.locator('.tier-band-list .face-illustration').count(),8);assert.equal(await page.locator('.tier-badge').count(),0);
    assert.match(await page.locator('.report-context').innerText(),/not validated as a PSL scale/);
    await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'ID Indonesia'}).click();await page.getByRole('button',{name:'Tutup jendela'}).click();assert.match(await page.locator('.tier-scale').innerText(),/bukan rating PSL/);await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:`test-results/${label}-tier-id-mobile.png`,fullPage:true,animations:"disabled"});
    await page.getByRole('button',{name:'Pengaturan',exact:true}).click();await page.getByRole('button',{name:'EN English'}).click();await page.getByRole('button',{name:'Close dialog'}).click();await page.setViewportSize({width:1440,height:1000});await page.locator('.tier-scale summary').click();
  });
  await check('PNG and JSON downloads and private print defaults',async()=>{
    assert.equal(await page.getByRole('checkbox',{name:'Include photos & measurement lines'}).isChecked(),false);
    let downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Data',exact:true}).click();let download=await downloadPromise;assert.match(download.suggestedFilename(),/\.json$/);await download.saveAs(`test-results/${label}-report.json`);
    const {readFile}=await import('node:fs/promises');const data=JSON.parse(await readFile(`test-results/${label}-report.json`,'utf8'));assert.equal(data.tier,null);assert.equal(data.score,null);assert.equal(data.geometryScore,data.sides.profile.score);assert.equal(data.contourAngles.length,3);assert.equal(data.tierBands.length,8);assert.match(data.rubric,/2.0/);
    await downloadImage('report',false);
    assert.equal(await page.locator('.print-report img').count(),0);await page.emulateMedia({media:'print'});await page.pdf({path:`test-results/${label}-report.pdf`,printBackground:true,preferCSSPageSize:true});await page.emulateMedia({media:'screen'});
    await page.getByRole('checkbox',{name:'Include photos & measurement lines'}).check();assert.equal(await page.locator('.print-report img').count(),1);
    await downloadImage('profile-photo-report',true);
  });
  await check('metric details, keyboard correction and stale report invalidation',async()=>{
    await page.locator('.report-metric').first().click();await page.locator('.metric-detail').waitFor();assert.match(await page.locator('.metric-detail').innerText(),/Formula/);await page.getByRole('button',{name:'Adjust points'}).click();const point=page.locator('.measure-point').first();await point.focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('.step-item').nth(2).isDisabled(),true);
    await page.getByRole('button',{name:'Confirm & create report'}).click();await page.getByRole('heading',{name:'Your face, in perspective.'}).waitFor();
  });
  await check('each visible line explains its endpoints and connects back to the score',async()=>{
    await page.locator('.report-metric').filter({hasText:'Visual ramus ratio'}).click();await page.locator('.line-detail h4').filter({hasText:'Visual ramus segment'}).waitFor();assert.match(await page.locator('.line-detail').innerText(),/Top of visual ramus segment/);assert.match(await page.locator('.line-detail').innerText(),/px/);
    await page.locator('.line-chip[data-line-id="jaw-segment"]').click();assert.match(await page.locator('.line-detail h4').innerText(),/Jaw-to-chin segment/);assert.equal(await page.locator('.measurement-overlay [data-line-id="jaw-segment"]').getAttribute('aria-pressed'),'true');
    await page.locator('.measurement-overlay [data-line-id="ramus-segment"] .line-hit-area').click();assert.match(await page.locator('.line-detail h4').innerText(),/Visual ramus segment/);
    await page.locator('.measurement-overlay [data-line-id="jaw-segment"]').focus();await page.keyboard.press('Enter');assert.match(await page.locator('.line-detail h4').innerText(),/Jaw-to-chin segment/);
    const line=page.locator('.measurement-overlay [data-line-id="ramus-segment"]');await line.focus();await page.keyboard.press('Enter');assert.match(await page.locator('.line-detail h4').innerText(),/Visual ramus segment/);
    await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'ID Indonesia'}).click();await page.getByRole('button',{name:'Tutup jendela'}).click();assert.match(await page.locator('.line-detail').innerText(),/Segmen ramus visual/);assert.match(await page.locator('.line-detail').innerText(),/Panjang pada foto/);
    await page.getByRole('button',{name:'Kembali ke rapor'}).click();const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Data',exact:true}).click();const download=await downloaded;const path=await download.path();const {readFile}=await import('node:fs/promises');const data=JSON.parse(await readFile(path,'utf8'));assert.equal(data.language,'id');assert.equal(data.sides.profile.metrics[3].name,'Rasio ramus visual');
    await page.getByRole('button',{name:'Pengaturan',exact:true}).click();await page.getByRole('button',{name:'EN English'}).click();await page.getByRole('button',{name:'Close dialog'}).click();
  });
  await check('reduced motion keeps explanations usable without moving geometry',async()=>{
    await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.report-metric').first().click();assert.equal(await page.locator('.measure-line').first().evaluate(element=>getComputedStyle(element).animationName),'none');await page.getByRole('button',{name:'Back to report'}).click();await page.emulateMedia({reducedMotion:'no-preference'});
  });
  await check('session clearing removes photos and reports',async()=>{await page.getByRole('button',{name:'Clear session'}).click();assert.equal(await page.locator('.upload-card.has-photo').count(),0);assert.equal(await page.locator('.print-report').count(),0);assert.equal(await page.getByRole('button',{name:'Start analysis'}).isDisabled(),true);});

  let portrait;
  await check('real front photo is detected by the bundled local worker',async()=>{
    const response=await fetch('https://storage.googleapis.com/mediapipe-assets/portrait.jpg');assert.equal(response.ok,true);portrait=Buffer.from(await response.arrayBuffer());await writeFile('test-results/fixture-portrait.jpg',portrait);
    await page.getByRole('group',{name:'Analysis mode'}).getByRole('button').nth(0).click();await upload('front',portrait,'image/jpeg','portrait.jpg');
    await page.evaluate(()=>{window.__analysisPhases=[];const observer=new MutationObserver(()=>{const node=document.querySelector('.analysis-visuals');if(node)window.__analysisPhases.push(node.dataset.phase);});observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-phase']});window.__phaseObserver=observer;});
    const startedAt=Date.now();await page.getByRole('button',{name:'Start analysis'}).click();await page.waitForFunction(()=>document.querySelectorAll('.measure-point').length===12,{},{timeout:60000});assert.ok(Date.now()-startedAt>=2950,'the scan presentation should last at least three seconds');assert.equal(await page.locator('.measure-point').count(),12);const phases=await page.evaluate(()=>{window.__phaseObserver.disconnect();return window.__analysisPhases;});assert.ok(phases.includes('rating'),'the real local appearance inference phase must be exposed');console.log('Detector phases:',[...new Set(phases)].join(', '));
    await page.getByRole('button',{name:'Confirm & create report'}).click();await page.getByRole('heading',{name:'Your face, in perspective.'}).waitFor();assert.equal(await page.locator('.report-side').count(),1);assert.equal(await page.locator('.tier-badge').count(),1);assert.match(await page.locator('.report-summary').innerText(),/FaceONNX ResNet-18/);assert.equal(await page.locator('.radar-chart').count(),2);await page.screenshot({path:`test-results/${label}-front-report.png`,fullPage:true,animations:"disabled"});
  });
  await check('AI reports keep the shared prediction separate from geometry and selectable reference labels',async()=>{
    const heading=await page.locator('.headline-score').innerText();
    await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('group',{name:'Rating reference'}).getByRole('button',{name:'Woman',exact:true}).click();await page.getByRole('button',{name:'Close dialog'}).click();assert.equal(await page.locator('.headline-score').innerText(),heading);
    const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Data',exact:true}).click();const download=await pending;const {readFile}=await import('node:fs/promises');const data=JSON.parse(await readFile(await download.path(),'utf8'));assert.equal(data.reference,'woman');assert.equal(data.tier,await page.locator('.tier-badge').innerText());assert.equal(data.appearance.model,'FaceONNX ResNet-18');assert.ok(Number.isFinite(data.appearance.raw));assert.equal(data.score,Math.round(Math.max(0,Math.min(10,data.appearance.raw*2))*10)/10);assert.equal(data.geometryScore,data.sides.front.score);
    await page.locator('.tier-scale summary').click();assert.match(await page.locator('.tier-band-list').innerText(),/True Eve/);await page.locator('.tier-scale summary').click();
    await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('group',{name:'Rating reference'}).getByRole('button',{name:'Man',exact:true}).click();await page.getByRole('button',{name:'Close dialog'}).click();
    await page.getByRole('checkbox',{name:'Include photos & measurement lines'}).check();
    await page.emulateMedia({media:'print'});await page.pdf({path:`test-results/${label}-ai-report.pdf`,printBackground:true,preferCSSPageSize:true});await page.emulateMedia({media:'screen'});
    await downloadImage('ai-report',true);
  });
  await check('adding the other side creates an equal-weight combined report',async()=>{
    await page.getByRole('button',{name:'Complete your analysis'}).click();await upload('profile',fixture);await page.getByRole('button',{name:'Start analysis'}).click();await page.getByRole('group',{name:'Displayed view'}).getByRole('button',{name:'Side'}).click();await page.locator('.analysis-visuals').waitFor({state:'hidden',timeout:60000});await placePoints(profilePoints);await page.getByRole('button',{name:'Confirm & create report'}).click();await page.getByRole('heading',{name:'Your face, in perspective.'}).waitFor();assert.equal(await page.locator('.report-side').count(),2);await page.screenshot({path:`test-results/${label}-full-report.png`,fullPage:true,animations:"disabled"});
  });
  await check('full PNG reports retain both views and support mobile Indonesian exports offline',async()=>{
    assert.equal(await page.locator('.print-report table').count(),2);await downloadImage('full-photo-report',true);
    await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'ID Indonesia'}).click();await page.getByRole('button',{name:'Tutup jendela'}).click();
    await page.getByRole('checkbox',{name:'Sertakan foto & garis ukur'}).uncheck();await page.setViewportSize({width:390,height:844});
    await page.waitForFunction(()=>document.querySelector('.site-footer')?.textContent.includes('Siap dipakai offline'),{},{timeout:90000});
    await context.setOffline(true);
    try{await downloadImage('full-private-id-mobile',false,'Unduh gambar');}finally{await context.setOffline(false);}
    await page.getByRole('button',{name:'Pengaturan',exact:true}).click();await page.getByRole('button',{name:'EN English'}).click();await page.getByRole('button',{name:'Close dialog'}).click();
    await page.getByRole('checkbox',{name:'Include photos & measurement lines'}).check();await page.setViewportSize({width:1440,height:1000});
  });
  await check('no photo uploads or external requests, and no persistent user storage',async()=>{assert.deepEqual(external,[]);assert.deepEqual(nonGet,[]);assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);assert.deepEqual(pageErrors,[]);});
  await check('cached app, worker and report work offline after reload',async()=>{
    await page.waitForFunction(()=>document.querySelector('.site-footer')?.textContent.includes('Ready to use offline'),{},{timeout:90000});
    await context.setOffline(true);await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:'Start analysis'}).waitFor();await page.getByRole('group',{name:'Analysis mode'}).getByRole('button').nth(0).click();await upload('front',portrait,'image/jpeg','portrait.jpg');await page.getByRole('button',{name:'Start analysis'}).click();await page.waitForFunction(()=>document.querySelectorAll('.measure-point').length===12,{},{timeout:60000});await page.getByRole('button',{name:'Confirm & create report'}).click();await page.getByRole('heading',{name:'Your face, in perspective.'}).waitFor();await context.setOffline(false);
  });
  await check('rotation and crop invalidate prior landmarks',async()=>{
    await page.getByRole('button',{name:'Review again'}).click();await page.getByRole('button',{name:'Rotate',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.measure-point').length===0);assert.equal(await page.getByRole('button',{name:'Confirm & create report'}).isDisabled(),true);await page.getByRole('button',{name:'Crop 3:4'}).click();await page.waitForTimeout(250);assert.equal(await page.locator('.measure-point').count(),0);
  });
  await check('clearing during the visualization hold cancels pending landmarks',async()=>{
    await page.getByRole('button',{name:'Clear session'}).click();await upload('front',portrait,'image/jpeg','portrait.jpg');await page.getByRole('button',{name:'Start analysis'}).click();await page.locator('.analysis-visuals[data-phase="visualizing"]').waitFor({timeout:60000});await page.getByRole('button',{name:'Clear session'}).click();await page.waitForTimeout(3200);assert.equal(await page.locator('.measure-point').count(),0);assert.equal(await page.locator('.upload-card.has-photo').count(),0);assert.equal(await page.locator('.analysis-visuals').count(),0);assert.equal(await page.getByRole('button',{name:'Start analysis'}).isDisabled(),true);
  });
  await check('automatic side detection handles right and mirrored left profiles with real contour angles',async()=>{
    const {readFile}=await import('node:fs/promises');const right=await readFile('tests/fixtures/profile-render.png');
    const mirrored=Buffer.from(await page.evaluate(async data=>{const image=await createImageBitmap(new Blob([Uint8Array.from(atob(data),char=>char.charCodeAt(0))],{type:'image/png'}));const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.translate(image.width,0);ctx.scale(-1,1);ctx.drawImage(image,0,0);image.close();return canvas.toDataURL('image/png').split(',')[1];},right.toString('base64')),'base64');
    for(const [name,buffer]of[['right',right],['left',mirrored]]){
      if(await page.getByRole('button',{name:'Clear session'}).isEnabled())await page.getByRole('button',{name:'Clear session'}).click();await page.getByRole('group',{name:'Analysis mode'}).getByRole('button').nth(1).click();await upload('profile',buffer);await page.getByRole('button',{name:'Start analysis'}).click();await page.waitForFunction(()=>document.querySelectorAll('.measure-point').length===8,{},{timeout:60000});assert.equal(await page.locator('.contour-angle-marks text').count(),0);await page.getByRole('button',{name:'Explore measurements'}).click();assert.equal(await page.locator('.contour-angle-marks text').count(),1);await page.getByRole('button',{name:'Adjust points'}).click();assert.match(await page.locator('.angle-readings').innerText(),/Chin contour angle/);await page.screenshot({path:`test-results/${label}-auto-profile-${name}.png`,fullPage:true,animations:'disabled'});
      await page.getByRole('button',{name:'Confirm & create report'}).click();await page.getByRole('heading',{name:'Your face, in perspective.'}).waitFor();assert.equal(await page.locator('.tier-badge').count(),0);assert.equal(await page.locator('.report-side .radar-chart').count(),1);assert.match(await page.locator('.report-side .angle-readings').innerText(),/Context only/);
    }
    await page.getByRole('checkbox',{name:'Include photos & measurement lines'}).check();await page.emulateMedia({media:'print'});await page.pdf({path:`test-results/${label}-profile-with-chart.pdf`,printBackground:true,preferCSSPageSize:true});await page.setViewportSize({width:794,height:1123});await page.locator('.print-report').screenshot({path:`test-results/${label}-print-profile.png`,animations:'disabled'});await page.emulateMedia({media:'screen'});await page.setViewportSize({width:1440,height:1000});
  });
  await check('an unavailable AI model never falls back to a geometry-derived appearance tier',async()=>{
    const isolated=await browser.newContext({serviceWorkers:'block'}),isolatedPage=await isolated.newPage();
    try{
      await isolatedPage.route('**/appearance-worker.js',route=>route.abort());await isolatedPage.goto(base,{waitUntil:'networkidle'});await isolatedPage.getByRole('group',{name:'Analysis mode'}).getByRole('button').nth(0).click();await isolatedPage.getByTestId('upload-front').setInputFiles({name:'portrait.jpg',mimeType:'image/jpeg',buffer:portrait});await isolatedPage.getByRole('button',{name:'Start analysis'}).click();await isolatedPage.waitForFunction(()=>document.querySelectorAll('.measure-point').length===12,{},{timeout:60000});await isolatedPage.getByRole('button',{name:'Confirm & create report'}).click();await isolatedPage.getByRole('heading',{name:'Your face, in perspective.'}).waitFor();assert.equal(await isolatedPage.locator('.tier-badge').count(),0);assert.match(await isolatedPage.locator('.report-summary').innerText(),/No appearance tier assigned/);
    }finally{await isolated.close();}
  });
  await check('all new AI and profile flows preserve session-only data and same-origin GET-only requests',async()=>{
    assert.deepEqual(pageErrors,[]);assert.deepEqual(external,[]);assert.deepEqual(nonGet,[]);assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
  });
} finally {
  await writeFile(`test-results/${label}-results.json`,JSON.stringify({base,failures,pageErrors,external,nonGet},null,2));
  await context.close();await browser.close();server?.kill();
}
if(failures.length)process.exitCode=1;else console.log(`All browser checks passed: ${base}`);
