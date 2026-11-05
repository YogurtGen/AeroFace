import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
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
async function check(name,run){try{await run();console.log(`PASS ${name}`);}catch(error){failures.push(name);console.error(`FAIL ${name}: ${error.stack||error}`);await page.screenshot({path:`test-results/${label}-failure-${failures.length}.png`,fullPage:true}).catch(()=>{});}}
const frontPoints={eyeLO:{x:.28,y:.37},eyeLI:{x:.4,y:.37},eyeRI:{x:.6,y:.37},eyeRO:{x:.72,y:.37},cheekL:{x:.19,y:.49},cheekR:{x:.81,y:.49},jawL:{x:.26,y:.7},jawR:{x:.74,y:.7},mouthL:{x:.4,y:.67},mouthR:{x:.6,y:.67},noseBase:{x:.5,y:.55},chin:{x:.5,y:.86}};
const profilePoints={nasion:{x:.56,y:.28},noseTip:{x:.74,y:.43},noseBase:{x:.62,y:.48},upperLip:{x:.65,y:.54},lowerLip:{x:.64,y:.59},chin:{x:.62,y:.7},jawAngle:{x:.34,y:.63},ramusTop:{x:.29,y:.4}};
async function placePoints(points){for(const [key,p] of Object.entries(points)){await page.locator('#point-selector').selectOption(key);const box=await page.locator('.measurement-overlay').boundingBox();await page.mouse.click(box.x+p.x*box.width,box.y+p.y*box.height);}}
async function upload(side,buffer,mimeType='image/png',name='fixture.png'){await page.getByTestId(`upload-${side}`).setInputFiles({name,mimeType,buffer});await page.locator('.upload-card.has-photo').first().waitFor();await page.locator('.primary-button.wide').filter({hasText:'Mulai analisis'}).waitFor();}
try {
  await page.goto(base,{waitUntil:'networkidle',timeout:60000});
  await check('page is active and has the AeroFace application',async()=>{assert.match(await page.title(),/AeroFace/);assert.equal(await page.locator('h1').count(),1);await page.getByRole('button',{name:'Mulai analisis'}).waitFor();});
  await check('responsive screenshots and no horizontal overflow',async()=>{
    for(const width of [1440,768,390]){await page.setViewportSize({width,height:width===390?844:1000});await page.screenshot({path:`test-results/${label}-${width}.png`,fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow at ${width}`);}
    await page.setViewportSize({width:1440,height:1000});
  });
  await check('privacy, method and transparency controls',async()=>{
    await page.getByRole('button',{name:'Privasi'}).click();await page.locator('dialog[open]').waitFor();assert.match(await page.locator('dialog').innerText(),/Foto tidak diunggah/);await page.getByRole('button',{name:'Tutup jendela'}).click();
    await page.getByRole('button',{name:'Cara penilaian'}).click();assert.match(await page.locator('dialog').innerText(),/belum tervalidasi/);await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'Kurangi transparansi'}).click();assert.equal(await page.locator('html').getAttribute('data-glass'),'off');await page.getByRole('button',{name:'Aktifkan liquid glass'}).click();
  });
  const fixtureData=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=800;c.height=1000;const x=c.getContext('2d');x.fillStyle='#e9edf4';x.fillRect(0,0,800,1000);x.fillStyle='#d2bbad';x.beginPath();x.ellipse(400,490,245,360,0,0,Math.PI*2);x.fill();x.fillStyle='#718094';x.fillRect(220,365,110,8);x.fillRect(475,365,110,8);x.fillRect(320,670,160,8);x.fillStyle='#b39b8d';x.fillRect(390,410,20,145);return c.toDataURL('image/png').split(',')[1];});
  const fixture=Buffer.from(fixtureData,'base64');
  await check('invalid photo is rejected and does not enable analysis',async()=>{
    await page.getByTestId('upload-front').setInputFiles({name:'invalid.txt',mimeType:'text/plain',buffer:Buffer.from('not a photo')});await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/JPG/);assert.equal(await page.getByRole('button',{name:'Mulai analisis'}).isDisabled(),true);await page.getByRole('button',{name:'Tutup pesan'}).click();
  });
  await check('profile-only guided placement creates its own report',async()=>{
    await page.getByRole('group',{name:'Mode analisis'}).getByRole('button').nth(1).click();await upload('profile',fixture);await page.getByRole('button',{name:'Mulai analisis'}).click();await page.locator('#point-selector').waitFor();await placePoints(profilePoints);await page.getByRole('button',{name:'Konfirmasi & buat rapor'}).click();await page.getByRole('heading',{name:'Rapor, khusus untukmu.'}).waitFor();assert.match(await page.locator('.report-summary').innerText(),/Belum dianalisis/);assert.equal(await page.locator('.report-side').count(),1);assert.match(await page.locator('.report-side').innerText(),/Estimasi 2D/);await page.screenshot({path:`test-results/${label}-profile-report.png`,fullPage:true});
  });
  await check('PNG and JSON downloads and private print defaults',async()=>{
    assert.equal(await page.getByRole('checkbox',{name:'Sertakan foto & garis ukur'}).isChecked(),false);
    let downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Data',exact:true}).click();let download=await downloadPromise;assert.match(download.suggestedFilename(),/\.json$/);await download.saveAs(`test-results/${label}-report.json`);
    downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Unduh gambar'}).click();download=await downloadPromise;assert.match(download.suggestedFilename(),/\.png$/);await download.saveAs(`test-results/${label}-report.png`);
    assert.equal(await page.locator('.print-report img').count(),0);await page.emulateMedia({media:'print'});await page.pdf({path:`test-results/${label}-report.pdf`,printBackground:true});await page.emulateMedia({media:'screen'});
    await page.getByRole('checkbox',{name:'Sertakan foto & garis ukur'}).check();assert.equal(await page.locator('.print-report img').count(),1);
  });
  await check('metric details, keyboard correction and stale report invalidation',async()=>{
    await page.locator('.report-metric').first().click();await page.locator('.metric-detail').waitFor();assert.match(await page.locator('.metric-detail').innerText(),/Rumus/);await page.getByRole('button',{name:'Atur titik'}).click();const point=page.locator('.measure-point').first();await point.focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('.step-item').nth(2).isDisabled(),true);
    await page.getByRole('button',{name:'Konfirmasi & buat rapor'}).click();await page.getByRole('heading',{name:'Rapor, khusus untukmu.'}).waitFor();
  });
  await check('session clearing removes photos and reports',async()=>{await page.getByRole('button',{name:'Bersihkan sesi'}).click();assert.equal(await page.locator('.upload-card.has-photo').count(),0);assert.equal(await page.locator('.print-report').count(),0);assert.equal(await page.getByRole('button',{name:'Mulai analisis'}).isDisabled(),true);});

  let portrait;
  await check('real front photo is detected by the bundled local worker',async()=>{
    const response=await fetch('https://storage.googleapis.com/mediapipe-assets/portrait.jpg');assert.equal(response.ok,true);portrait=Buffer.from(await response.arrayBuffer());await writeFile('test-results/fixture-portrait.jpg',portrait);
    await page.getByRole('group',{name:'Mode analisis'}).getByRole('button').nth(0).click();await upload('front',portrait,'image/jpeg','portrait.jpg');await page.getByRole('button',{name:'Mulai analisis'}).click();await page.waitForFunction(()=>document.querySelectorAll('.measure-point').length===12,{},{timeout:60000});assert.equal(await page.locator('.measure-point').count(),12);await page.getByRole('button',{name:'Konfirmasi & buat rapor'}).click();await page.getByRole('heading',{name:'Rapor, khusus untukmu.'}).waitFor();assert.equal(await page.locator('.report-side').count(),1);await page.screenshot({path:`test-results/${label}-front-report.png`,fullPage:true});
  });
  await check('adding the other side creates an equal-weight combined report',async()=>{
    await page.getByRole('button',{name:'Lengkapi analisis'}).click();await upload('profile',fixture);await page.getByRole('button',{name:'Mulai analisis'}).click();await page.getByRole('group',{name:'Sisi yang ditampilkan'}).getByRole('button',{name:'Samping'}).click();await placePoints(profilePoints);await page.getByRole('button',{name:'Konfirmasi & buat rapor'}).click();await page.getByRole('heading',{name:'Rapor, khusus untukmu.'}).waitFor();assert.equal(await page.locator('.report-side').count(),2);await page.screenshot({path:`test-results/${label}-full-report.png`,fullPage:true});
  });
  await check('no photo uploads or external requests, and no persistent user storage',async()=>{assert.deepEqual(external,[]);assert.deepEqual(nonGet,[]);assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);assert.deepEqual(pageErrors,[]);});
  await check('cached app, worker and report work offline after reload',async()=>{
    await page.waitForFunction(()=>document.querySelector('.site-footer')?.textContent.includes('Siap dipakai offline'),{},{timeout:90000});
    await context.setOffline(true);await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:'Mulai analisis'}).waitFor();await page.getByRole('group',{name:'Mode analisis'}).getByRole('button').nth(0).click();await upload('front',portrait,'image/jpeg','portrait.jpg');await page.getByRole('button',{name:'Mulai analisis'}).click();await page.waitForFunction(()=>document.querySelectorAll('.measure-point').length===12,{},{timeout:60000});await page.getByRole('button',{name:'Konfirmasi & buat rapor'}).click();await page.getByRole('heading',{name:'Rapor, khusus untukmu.'}).waitFor();await context.setOffline(false);
  });
  await check('rotation and crop invalidate prior landmarks',async()=>{
    await page.getByRole('button',{name:'Periksa lagi'}).click();await page.getByRole('button',{name:'Putar',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.measure-point').length===0);assert.equal(await page.getByRole('button',{name:'Konfirmasi & buat rapor'}).isDisabled(),true);await page.getByRole('button',{name:'Potong 3:4'}).click();await page.waitForTimeout(250);assert.equal(await page.locator('.measure-point').count(),0);
  });
} finally {
  await writeFile(`test-results/${label}-results.json`,JSON.stringify({base,failures,pageErrors,external,nonGet},null,2));
  await context.close();await browser.close();server?.kill();
}
if(failures.length)process.exitCode=1;else console.log(`All browser checks passed: ${base}`);
