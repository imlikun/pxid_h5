import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.BASE_URL||'http://127.0.0.1:4175';
const browser=await chromium.launch({headless:true});const results=[];try{
for(const delay of [0,850]){const page=await browser.newPage({viewport:{width:412,height:915}});await page.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());await page.goto(base+'/?lang=zh#/notices');await page.locator('.notices .list > *').first().waitFor();
if(delay)await page.evaluate(ms=>new Promise(resolve=>{const end=performance.now()+ms;const tick=()=>performance.now()>=end?resolve():requestAnimationFrame(tick);tick()}),delay);
for(const rapid of [false,true,false]){
await page.evaluate(()=>{window.__samples=[];window.__finished=new Promise(resolve=>{const end=performance.now()+1100;const tick=()=>{const d=document.querySelector('.ndetail'),l=document.querySelector('.notices');window.__samples.push({detail:!!d,list:!!l,hit:document.elementFromPoint(200,200)?.closest('.ndetail,.notices')?.className,top:d?.getBoundingClientRect().top});if(performance.now()<end)requestAnimationFrame(tick);else resolve()};requestAnimationFrame(tick)})});
await page.locator('.notices .list > *').first().click();if(rapid){await page.locator('.ndetail').waitFor();await page.evaluate(()=>window.__router.back());}
await page.evaluate(()=>window.__finished);
assert.equal(await page.locator('.page-enter-held').count(),0,'held position released');
if(!rapid){const samples=await page.evaluate(()=>window.__samples);let shown=false;for(const f of samples){if(f.hit?.includes('ndetail'))shown=true;else if(shown)assert.ok(!f.hit?.includes('notices'),'list flashed after detail became visible');}assert.ok(shown);assert.equal(await page.locator('.ndetail').evaluate(e=>Math.round(e.getBoundingClientRect().top)),0);await page.evaluate(()=>window.__router.back());}
await page.locator('.notices').waitFor();await page.waitForFunction(()=>!document.querySelector('.ndetail')&&!document.querySelector('[class*="slide-back-"]'));results.push({delay,rapid,passed:true});}
await page.close();}console.log(JSON.stringify(results));}finally{await browser.close()}
