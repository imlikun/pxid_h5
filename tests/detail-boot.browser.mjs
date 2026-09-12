// Start a Vite preview on BASE_URL (default :4175). Install Playwright or set PLAYWRIGHT_MODULE.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.BASE_URL || 'http://127.0.0.1:4175';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const passed=[], errors=[];
try {
for(const mode of ['early','late','no-fullscreen','browser']) {
 for(const kind of ['feed','product','points']) {
  const ctx=await browser.newContext({viewport:{width:412,height:915}});
  await ctx.addInitScript(mode=>{
   localStorage.clear();sessionStorage.clear();window.__pushes=[];
   document.addEventListener('animationstart',e=>{if(e.animationName==='wvPushIn')window.__pushes.push(e.animationName)});
   window.__inject=()=>{const p=v=>Promise.resolve(v);window.PXIDBridge={isNative:true,getToken:()=>p(''),getUserInfo:()=>p({}),getLocale:()=>p('zh'),getRegion:()=>p('CN'),getDeviceId:()=>p('audit'),setPullRefresh:()=>{},getLocation:()=>p({})};if(mode!=='no-fullscreen')window.__PXID_FULLSCREEN__=true;};
   if(mode==='early'||mode==='no-fullscreen')window.__inject();
  },mode);
  let release;const gate=new Promise(r=>release=r);let detailRequests=0;
  await ctx.route('**/*',async r=>{
   const u=new URL(r.request().url());if(u.origin===new URL(base).origin)return r.continue();
   let data={list:[]};
   if(u.pathname==='/feed/991'||u.pathname==='/mall-api/products/cold'){detailRequests++;await gate;data=kind==='feed'?{id:991,title:'Ready feed',author:'PXID',content:'Test content',images:[],likes:0,comments:0}: {product:null};}
   return r.fulfill({contentType:'application/json',body:JSON.stringify({code:0,data})});
  });
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  const route=kind==='feed'?'/feed/991':kind==='product'?'/product/cold':'/points';
  await page.goto(base+'/#'+route);
  await page.locator('.app-root > :first-child').waitFor();
  if(mode==='late')await page.evaluate(()=>window.__inject());
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  assert.equal(await page.locator('.app-root.wv-push-in').count(),0,mode+' '+kind+' root animation');
  assert.deepEqual(await page.evaluate(()=>window.__pushes),[]);
  if(kind==='feed'||kind==='product'){
   await page.locator(kind==='feed'?'.fd-skel':'.product-skeleton').waitFor();
   assert.ok(!(await page.locator('body').innerText()).includes('加载中'));
   if(kind==='product'){assert.ok(await page.locator('.btn--buy').isDisabled());await page.locator('.tb-back').waitFor();}
  }
  release();
  if(kind==='feed'){await page.locator('.article .title').filter({hasText:'Ready feed'}).waitFor();assert.equal(detailRequests,1);}
  if(kind==='product'){await page.getByRole('button',{name:'重新加载'}).waitFor();assert.equal(detailRequests,1);}
  assert.deepEqual(await page.evaluate(()=>window.__pushes),[]);
  passed.push(`${mode}: ${kind} no extra boot animation; cold loading and completion verified`);
  await ctx.close();
 }
}
assert.deepEqual(errors,[]);
console.log(JSON.stringify({passed,errors},null,2));
}finally{await browser.close();}
