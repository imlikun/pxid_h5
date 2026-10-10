// Browser regression: start Vite locally, then run this file. Uses puppeteer-core.
// All API requests are intercepted; fixture tokens and POSTs never reach production.
import { createRequire } from 'node:module'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import assert from 'node:assert/strict'
const require = createRequire(new URL('../package.json',import.meta.url))
const puppeteer = require('puppeteer-core')
const out = process.env.DISCOVER_QA_DIR || join(tmpdir(),'pxid-discover-qa')
mkdirSync(out,{recursive:true})
const appUrl = process.env.DISCOVER_QA_URL || 'http://127.0.0.1:5176'
const executablePath = process.env.CHROME_BIN || ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync)
if(!executablePath) throw new Error('Set CHROME_BIN to a Chromium executable')
const checks=[], errors=[], requests=[], published=[]
const images = ['/feed_r1.jpg','/feed_r2.jpg','/feed_r3.jpg','/feed_d1.jpg','/feed_d2.jpg','/feed_d3.jpg','/feed_d4.jpg','/banner/banner-shot1.jpg','/banner/banner-shot2.jpg']
const feeds=Array.from({length:24},(_,i)=>({id:1001+i,itemType:'moment',kind:i===0?'official':'moment',author:i%2?'林同学':'PXID 视觉实验室',deviceId:i%2?'rider-a':'rider-b',memberUserId:i%2?'100':'101',canFollow:true,followed:false,avatar:'/feed_default.jpg',title:i%2?'下班后的一段骑行':'这次通勤，你选哪条路线？',content:i%2?'天气放晴，和车友一起沿河骑了一段。分享一些通勤路线和养车的小经验。':'城市骑行的风景，常藏在熟悉的路上。大家的日常通勤体验怎么样？',carModel:i%3===0?'P3':'P2',tags:[i%2?'用车求助':'通勤骑行'],images:images.slice(0,(i%9)+1),cover:images[i%9],likes:23+i,comments:0,pinned:i===0,time:'2026-10-10T08:00:00Z',createdAt:'2026-10-10T08:00:00Z'}))
const follows=new Set()
// A long post makes reading-position transfer measurable across both containers.
feeds[4].content = Array.from({length: 8}, (_,i)=>`第${i+1}段骑行记录：天气放晴，和车友一起沿河骑了一段。分享一些通勤路线和养车的小经验。`).join('\n\n')
let delayedModel=''
let slowDetailId=0
let failRecommend=false
const fixtureComments=new Map()
let locationCalls=0
const browser=await puppeteer.launch({executablePath,headless:true,args:['--no-first-run','--disable-background-networking']})
try {
const page=await browser.newPage()
page.on('pageerror',e=>errors.push(e.message))
await page.setRequestInterception(true)
page.on('request',async r=>{
 const u=new URL(r.url())
 if(u.hostname==='pxid-api.appin.site'){
  requests.push({path:u.pathname,query:Object.fromEntries(u.searchParams),method:r.method()})
  if(r.method()==='OPTIONS') {
    await r.respond({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'Content-Type, Authorization','access-control-allow-methods':'GET, POST, DELETE, OPTIONS'}})
    return
  }
  let data={}, status=200
  if(u.pathname==='/feed' && r.method()==='GET'){
   if(failRecommend && u.searchParams.get('tab')==='recommend'){ await r.respond({status:503,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({code:503,message:'Local fixture failure'})});return }
   let list=feeds.map(x=>({...x,followed:follows.has(x.deviceId)}))
   if(u.searchParams.get('carModel')) list=list.filter(x=>x.carModel===u.searchParams.get('carModel'))
   if(u.searchParams.get('topic')) list=list.filter(x=>x.tags.includes(u.searchParams.get('topic')))
   if(u.searchParams.get('scope')==='follow') list=list.filter(x=>follows.has(x.deviceId))
   if(u.searchParams.get('scope')==='near') list=list.slice().reverse()
   const total=list.length, n=Number(u.searchParams.get('pageSize')||15), p=Number(u.searchParams.get('page')||1)
   data={list:list.slice((p-1)*n,p*n),total}
   if(u.searchParams.get('carModel')===delayedModel && delayedModel) await new Promise(resolve=>setTimeout(resolve,600))
  } else if(u.pathname==='/feed' && r.method()==='POST'){
   published.push(JSON.parse(r.postData())); data={id:2000}
  } else if(u.pathname==='/feed/topics') data={list:[{name:'通勤骑行',count:12},{name:'用车求助',count:12},{name:'周末骑行',count:2}]}
  else if(/^\/feed\/\d+$/.test(u.pathname)) {
    const id=Number(u.pathname.split('/').at(-1))
    data={...feeds.find(x=>x.id===id)}
    if(id===slowDetailId) await new Promise(resolve=>setTimeout(resolve,3000))
  }
  else if(u.pathname==='/follow' && r.method()==='POST'){follows.add(JSON.parse(r.postData()).followeeDevice);data={following:true}}
  else if(u.pathname==='/follow' && r.method()==='DELETE'){follows.delete(u.searchParams.get('followeeDevice'));data={following:false}}
  else if(u.pathname==='/activities') data={list:[{id:1,title:'城市周末骑行',cover:'/feed_r3.jpg',startDate:'2026-12-01',endDate:'2026-12-03',location:'南京'},{id:2,title:'已经结束的活动',startDate:'2025-01-01',endDate:'2025-01-02'}]}
  else if(/^\/feed\/\d+\/like$/.test(u.pathname) && r.method()==='POST') {
    const feed=feeds.find(x=>x.id===Number(u.pathname.split('/')[2])), next=JSON.parse(r.postData()).liked
    feed.likes += next ? 1 : -1;feed.isLiked=next;data={likes:feed.likes,isLiked:next}
  } else if(/^\/feed\/\d+\/favorite$/.test(u.pathname)) {
    const feed=feeds.find(x=>x.id===Number(u.pathname.split('/')[2]))
    if(r.method()==='POST'){feed.isFavorited=JSON.parse(r.postData()).favorited;feed.favorites=feed.isFavorited?1:0}
    data={favorited:!!feed.isFavorited,favorites:feed.favorites||0}
  } else if(/^\/feed\/\d+\/comment$/.test(u.pathname) && r.method()==='POST') {
    const fid=Number(u.pathname.split('/')[2]), value=JSON.parse(r.postData())
    data={id:9000,author:'测试账号',content:value.content,createdAt:new Date().toISOString()}
    fixtureComments.set(fid,[data]);feeds.find(x=>x.id===fid).comments=1
  } else if(u.pathname.includes('comments')) data={list:fixtureComments.get(Number(u.pathname.split('/')[2]))||[],total:0}
  else if(u.pathname==='/follow/check') data={following:false}
  else data={list:[],total:0}
  await r.respond({status,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'},body:JSON.stringify({code:0,data})})
 } else if(u.hostname==='127.0.0.1' || u.protocol==='data:' || u.protocol==='blob:') await r.continue()
 else if(r.resourceType()==='image') await r.respond({status:302,headers:{location:appUrl+'/feed_default.jpg'}})
 else await r.respond({status:200,contentType:'application/json',body:'{"code":0,"data":{"list":[],"total":0}}'})
})
await page.evaluateOnNewDocument(()=>{
 window.__qaLocations=0
 window.PXIDBridge={isNative:false,getUserInfo:async()=>({nickname:'测试账号',memberUserId:'qa',carModel:'P2',token:'test-only-fixture'}),getToken:async()=>'test-only-fixture',getDeviceId:async()=>'qa-device',getLocale:async()=>'zh',getRegion:async()=>'CN',getLocation:async()=>{window.__qaLocations++;return {lat:31,lng:121}},openNative:()=>{},navigateTo:()=>{},exit:()=>{}}
})
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
async function goto(hash,width=390,locale='zh'){
 await page.setViewport({width,height:844,deviceScaleFactor:1})
 await sleep(80)
 await page.goto(`${appUrl}/?lang=${locale}#${hash}`,{waitUntil:'networkidle2'}); await page.reload({waitUntil:'networkidle2'})
}
async function clickText(selector,text){
 await page.waitForSelector(selector)
 const done=await page.evaluate((selector,text)=>{const item=[...document.querySelectorAll(selector)].find(x=>x.textContent.trim().includes(text)); if(item){item.click();return true}return false},selector,text)
 assert.ok(done,selector+' '+text);await sleep(200)
}
async function fit(label){
 const info=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,filter:document.querySelector('.discussion-filter')?.getBoundingClientRect().toJSON(),trigger:document.querySelector('.model-trigger')?.getBoundingClientRect().toJSON(),left:document.querySelector('.leftcol')?.getBoundingClientRect().toJSON()}))
 assert.equal(info.overflow,false,label+' horizontal overflow')
 if(info.trigger) assert.ok(info.trigger.right<=info.left.right && info.trigger.width>30,label+' fixed trigger')
 checks.push(label)
}
await goto('/discover?tab=plaza')
await clickText('.tabs button','推荐');await page.waitForSelector('.fcard')
assert.ok(requests.some(x=>x.path==='/feed'&&x.query.tab==='recommend'))
checks.push('plaza deep link lazily loads recommendation when switching tabs')
await clickText('.tabs button','广场');await page.waitForSelector('.plaza-hub')
assert.equal(await page.$('.grid3'),null)
assert.equal(await page.$$eval('.hub-activity',xs=>xs.length),1)
await page.screenshot({path:out+'/discover-plaza-running.png',fullPage:true})
await clickText('.topic-entry','用车求助')
await page.waitForSelector('.moment')
assert.ok((await page.url()).includes('topic='))
assert.ok((await page.$$eval('.moment .m-tag--topic',xs=>xs.map(x=>x.textContent))).every(x=>x==='#用车求助'))
checks.push('plaza topic leads to real filtered list')
assert.equal(await page.$('.discussion-head'),null)
await page.waitForSelector('.discussion-summary')
const discussionBounds=await page.evaluate(()=>['.discussion-filter','.discussion-summary','.moment'].map(selector=>document.querySelector(selector).getBoundingClientRect().toJSON()))
assert.ok(discussionBounds[0].bottom<=discussionBounds[1].top && discussionBounds[1].bottom<=discussionBounds[2].top)
assert.ok(discussionBounds[2].top<170, 'discussion cards start directly after the compact filter/count')
await page.click('.act--add')
await page.waitForSelector('.topic-section')
assert.ok(await page.$eval('.topic-options button',x=>x.getAttribute('aria-pressed')==='true'))
await page.type('textarea.content','测试话题发布流程，本地拦截，不写线上。')
await clickText('button','发布')
await sleep(900)
assert.equal(published.length,1)
assert.deepEqual(published[0].tags,['用车求助'])
assert.ok(page.url().includes('discussion=topic'))
checks.push('topic preset persisted in actual POST payload and return context')
await goto('/discover?tab=dynamic')
await page.waitForSelector('.moment')
await fit('390 dynamic')
assert.equal(await page.$('.dynamic-intro'),null)
await page.screenshot({path:out+'/discover-dynamic-running.png',fullPage:false})
const cardTop=await page.$eval('.moment',x=>x.getBoundingClientRect().top)
await clickText('.model-trigger','全部车型')
await page.waitForSelector('.model-options')
assert.equal(await page.$eval('.moment',x=>x.getBoundingClientRect().top),cardTop)
await page.screenshot({path:out+'/discover-model-menu-running.png',fullPage:false})
await clickText('.model-grid button','P2')
assert.equal(await page.$('.model-options'),null)
assert.equal(await page.evaluate(()=>window.__qaLocations),0)
await page.waitForSelector('.moment')
assert.ok((await page.$$eval('.moment .m-tag:first-child',xs=>xs.map(x=>x.textContent))).every(x=>x==='#P2'))
await clickText('.scope-tabs button','关注')
await sleep(300)
assert.equal(await page.$$eval('.moment',xs=>xs.length),0)
assert.equal(requests.filter(x=>x.path==='/feed').at(-1).query.carModel,'P2')
await clickText('.scope-tabs button','全部')
await page.waitForSelector('.m-follow')
await page.click('.m-follow')
await sleep(200)
await clickText('.scope-tabs button','关注')
await page.waitForSelector('.moment')
assert.ok((await page.$$eval('.m-name',xs=>xs.map(x=>x.textContent))).every(x=>x.includes('林同学')))
checks.push('scope/model independence and real follow relationship UI')
await clickText('.scope-tabs button','附近')
await page.waitForSelector('.moment')
assert.equal(await page.evaluate(()=>window.__qaLocations),1)
assert.equal(requests.filter(x=>x.path==='/feed').at(-1).query.scope,'near')
checks.push('location requested only after nearby selection')
for(const width of [375,390,430,600,854,1017,1337]){
 await goto('/discover?tab=dynamic',width)
 await page.waitForSelector('.moment');await fit(width+' dynamic')
 if(width>=600){
  await page.waitForSelector('.panel .article')
  const bounds=await page.evaluate(()=>[...document.querySelectorAll('.leftcol,.panel .detail')].map(x=>({width:x.clientWidth,height:x.clientHeight,style:getComputedStyle(x).overflowY})))
  assert.equal(bounds.length,2);assert.ok(bounds.every(x=>x.width>200&&x.style==='auto'))
  const identity=await page.evaluate(()=>['.panel .tb-left','.panel .author--nav','.panel .tb-right'].map(selector=>document.querySelector(selector).getBoundingClientRect().toJSON()))
  assert.ok(identity[0].width<=56 && Math.abs(identity[1].left-identity[0].right)<=1, 'author starts immediately after the expand button')
  assert.ok(identity[1].right<=identity[2].left, 'author does not overlap more/share actions')
 }
}
await goto('/discover?tab=dynamic',390)
await page.waitForSelector('.moment')
delayedModel='P3'
await clickText('.model-trigger','全部车型');await clickText('.model-grid button','P3')
await clickText('.model-trigger','P3');await clickText('.model-grid button','P2')
await sleep(700)
assert.ok((await page.$$eval('.moment .m-tag:first-child',xs=>xs.map(x=>x.textContent))).every(x=>x==='#P2'))
assert.equal(requests.filter(x=>x.path==='/feed'&&x.query.carModel==='P2').at(-1).query.page,'1')
checks.push('late previous model response cannot overwrite new filter; pagination resets')
delayedModel=''
await goto('/discover?tab=plaza',390);await clickText('.topic-entry','用车求助');await page.waitForSelector('.moment')
await clickText('.model-trigger','全部车型');await clickText('.model-grid button','P2');await page.waitForSelector('.moment')
await clickText('.scope-tabs button','关注')
await clickText('.model-trigger','P2');await clickText('.model-grid button','P3')
await sleep(250)
const contextQuery=requests.filter(x=>x.path==='/feed').at(-1).query
assert.equal(contextQuery.carModel,'P3');assert.equal(contextQuery.topic,'用车求助');assert.equal(contextQuery.scope,'follow')
checks.push('topic context retains scope when changing model')
await goto('/discover?tab=dynamic',1017)
await page.waitForSelector('.panel .article')
const all=await page.$$('.moment .m-body')
for(let count=1;count<=9;count++){
 await all[count-1].click();await sleep(120)
 const shape=await page.evaluate(()=>({count:document.querySelectorAll('.panel .body-gallery .media-cell').length,carousel:!!document.querySelector('.panel .carousel'),hero:!!document.querySelector('.panel .hero__single'),layout:document.querySelector('.panel .body-gallery')?.className}))
 if(count===1) assert.ok(shape.hero)
 else if(count===5||count===8) assert.ok(shape.carousel)
 else {
  assert.equal(shape.count,count);if([3,6,7].includes(count)) assert.ok(shape.layout.includes('bento-'+count));if(count===9) assert.ok(shape.layout.includes('nine'))
  const boxes=await page.$$eval('.panel .body-gallery .media-cell',xs=>xs.map(x=>x.getBoundingClientRect().toJSON()))
  assert.ok(boxes.every(x=>x.width>30&&x.height>30))
  for(let a=0;a<boxes.length;a++) for(let b=a+1;b<boxes.length;b++) {
   const x=boxes[a],y=boxes[b]
   assert.ok(x.right<=y.left+1||y.right<=x.left+1||x.bottom<=y.top+1||y.bottom<=x.top+1,'gallery cells overlap')
  }
 }
}
await page.evaluate(()=>document.querySelector('.leftcol').scrollTop=0)
await page.screenshot({path:out+'/discover-fold-running.png',fullPage:false})
const panelBefore=await page.$eval('.panel .detail',x=>x.scrollTop)
await page.$eval('.leftcol',x=>x.scrollTop=300)
assert.equal(await page.$eval('.panel .detail',x=>x.scrollTop),panelBefore)
await all[5].click();await sleep(150)
await page.setViewport({width:1337,height:844,deviceScaleFactor:1});await sleep(150)
assert.equal(await page.$$eval('.panel .body-gallery .media-cell',xs=>xs.length),6)
await page.click('.panel .body-gallery .media-cell');await page.waitForSelector('.image-preview')
await page.keyboard.press('Escape');assert.equal(await page.$('.image-preview'),null)
checks.push('fold resize retains selected gallery; preview closes with Escape')
checks.push('fold panel: all 1-9 photo layouts and independent scroll containers')
for(let count=1;count<=9;count++){
 await goto('/feed/'+(1000+count),390)
 await page.waitForSelector('.article')
 const shape=await page.evaluate(()=>({count:document.querySelectorAll('.body-gallery .media-cell').length,carousel:!!document.querySelector('.carousel'),hero:!!document.querySelector('.hero:not(.carousel)'),layout:document.querySelector('.body-gallery')?.className}))
 if(count===1) assert.ok(shape.hero)
 else if(count===5||count===8) assert.ok(shape.carousel)
 else {assert.equal(shape.count,count);if([3,6,7].includes(count)) assert.ok(shape.layout.includes('bento-'+count))}
}
checks.push('standalone detail: all 1-9 photo layouts preserved')
await goto('/discover?tab=dynamic',375,'pt');await fit('375 Portuguese dynamic')
await clickText('.model-trigger','Todos');await fit('Portuguese menu');await page.keyboard.press('Escape');assert.equal(await page.$('.model-options'),null)
await goto('/discover?tab=recommend',390);await page.waitForSelector('.fcard');await page.screenshot({path:out+'/discover-recommend-running.png',fullPage:false})
assert.equal(await page.$$eval('.fcard__selected',xs=>xs.length),1)
checks.push('recommended selection badges require actual pinned flag')

// UX acceptance: the same reading/interaction task in phone and split postures.
await goto('/discover?tab=dynamic',854);await page.waitForSelector('.panel .article')
const firstId=feeds[0].id, selected='[data-feed-id="'+firstId+'"]'
const footer=await page.$eval('.panel .actions',x=>x.getBoundingClientRect().toJSON())
const pane=await page.$eval('.panel',x=>x.getBoundingClientRect().toJSON())
assert.ok(footer.left>=pane.left && footer.right<=pane.right+1 && footer.bottom<=844)
await page.click('.panel .actions__icon:first-child');await sleep(300)
assert.equal(await page.$eval(selected+' .m-act span',x=>Number(x.textContent)),feeds[0].likes)
assert.equal(await page.$eval('.panel .actions__icon',x=>x.getAttribute('aria-pressed')),'true')
await page.click(selected+' .m-act');await sleep(300)
assert.equal(await page.$eval('.panel .actions__icon',x=>x.getAttribute('aria-pressed')),'false')
assert.equal(await page.$eval('.panel .actions__icon span',x=>Number(x.textContent)),feeds[0].likes)
await page.click('.panel .actions__icon:nth-child(2)');await sleep(250)
assert.equal(await page.$eval('.panel .actions__icon:nth-child(2)',x=>x.getAttribute('aria-pressed')),'true')
checks.push('right pane real like/favorite and bidirectional list state synchronization')
await page.click('.panel .actions__input');await page.waitForSelector('.cinput--fixed',{visible:true})
let inputBounds=await page.$eval('.cinput--fixed',x=>x.getBoundingClientRect().toJSON())
assert.ok(Math.abs(inputBounds.left-pane.left)<2 && Math.abs(inputBounds.width-pane.width)<2)
await page.type('.cinput__field','本地拦截的评论，不发到线上。')
await page.click('.cinput__send');await sleep(250)
assert.equal(await page.$eval(selected+' .m-act:nth-child(2) span',x=>Number(x.textContent)),1)
await page.$eval('.cinput__field',x=>x.blur());await sleep(1800)
checks.push('comment input stays in right pane and submitted comment count updates list')
await page.screenshot({path:out+'/discover-ux-fold-running.png',fullPage:false})
await page.click('.act--search');await page.waitForSelector('.sinput')
await page.type('.sinput','通勤');await page.keyboard.press('Enter');await sleep(200)
assert.ok(await page.$('.panel .article'))
assert.ok((await page.$eval('.search-results__head',x=>x.textContent)).includes('已加载'))
await page.click('.search-results .fcard');await sleep(200)
assert.ok(page.url().includes('/discover'))
checks.push('search keeps split reading and truthfully describes loaded-post scope')
await goto('/discover?tab=recommend',600);await page.waitForSelector('.fcard')
assert.equal(await page.$$eval('.wf-col',xs=>xs.length),1)
await page.screenshot({path:out+'/discover-ux-narrow-fold-running.png',fullPage:false})
checks.push('600px narrow split recommendation uses readable single-column cards')
const titleBounds=await page.$eval('.panel .tb-title',x=>x.getBoundingClientRect().toJSON())
const toolsBounds=await page.$eval('.panel .tb-right',x=>x.getBoundingClientRect().toJSON())
assert.ok(titleBounds.right<=toolsBounds.left, 'reader title must leave space for both action buttons')
checks.push('600px reader title does not overlap more/share buttons')
await goto('/discover?tab=plaza',1337);await page.waitForSelector('.plaza-hub')
assert.equal(await page.$('.panel'),null)
const sections=await page.$$eval('.plaza-hub section',xs=>xs.map(x=>x.getBoundingClientRect().toJSON()))
assert.ok(Math.abs(sections[0].top-sections[1].top)<1 && sections[1].left>sections[0].left)
assert.ok(sections[2].width>sections[0].width)
await page.screenshot({path:out+'/discover-ux-plaza-wide-running.png',fullPage:false})
checks.push('wide plaza uses available width with stable model/topic/event order')
await goto('/discover?tab=dynamic',390)
await page.waitForSelector('.model-trigger');await page.click('.model-trigger')
assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-selected')),'true')
await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await sleep(200)
assert.equal(await page.$('.model-options'),null)
assert.equal(await page.$eval('.model-trigger span',x=>x.textContent),'P2')
checks.push('model menu supports focus, arrow navigation and Enter selection')
await page.$eval('.model-trigger',x=>x.blur())
await page.screenshot({path:out+'/discover-ux-mobile-running.png',fullPage:false})
await goto('/discover?tab=dynamic',854);await page.waitForSelector('.panel .article')
await page.setViewport({width:390,height:844,deviceScaleFactor:1});await sleep(400)
assert.ok(page.url().includes('/discover'))
checks.push('passive default preview does not force navigation when folding closed')
await goto('/discover?tab=dynamic',854);await page.waitForSelector('.moment')
await page.click('[data-feed-id="1005"] .m-body');await page.waitForSelector('.panel .carousel')
await page.$eval('.panel .car-track',x=>x.scrollLeft=x.clientWidth*2);await sleep(200)
await page.click('.panel .actions__input');await page.type('.cinput__field','折叠后继续写的草稿')
await page.$eval('.cinput__field',x=>x.blur());await sleep(200)
await page.$eval('.panel .detail',x=>x.scrollTop=120);await sleep(80)
await page.setViewport({width:390,height:844,deviceScaleFactor:1});await sleep(700)
assert.ok(page.url().includes('/feed/1005'))
assert.ok((await page.$eval('.car-count',x=>x.textContent)).startsWith('3/'))
assert.ok(await page.evaluate(()=>window.scrollY>80))
await page.click('.actions__input');await page.waitForSelector('.cinput__field',{visible:true})
assert.equal(await page.$eval('.cinput__field',x=>x.value),'折叠后继续写的草稿')
await page.$eval('.cinput__field',x=>x.blur());await sleep(150)
await page.goBack();await sleep(500);await page.waitForSelector('[data-feed-id="1005"]')
const returned=await page.$eval('[data-feed-id="1005"]',x=>x.getBoundingClientRect().top)
assert.ok(returned>=55 && returned<200, 'return list should retain current post')
checks.push('active fold-to-phone reading retains post, scroll, carousel, draft and return context')
failRecommend=true
await goto('/discover?tab=recommend',390);await page.waitForSelector('.dynamic-empty__action')
assert.equal(await page.$$eval('.fcard',xs=>xs.length),0)
failRecommend=false;await page.click('.dynamic-empty__action');await page.waitForSelector('.fcard')
checks.push('recommendation failure is truthful and can retry locally')
await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}])
await goto('/discover?tab=dynamic',600,'pt');await page.waitForSelector('.panel .article')
await fit('600 Portuguese split UX')
const text=await page.$$eval('.panel .comments__head, .panel .reader-paging, .panel .actions',xs=>xs.map(x=>x.textContent).join(' '))
assert.ok(!text.includes('上一条') && !text.includes('评论'))
checks.push('Portuguese split reader uses localized actions and navigation')

await goto('/discover?tab=dynamic',854);await page.waitForSelector('.panel .article')
await page.click('.panel .actions__input');await page.type('.cinput__field','离开详情后保留的草稿')
await page.evaluate(()=>{
  Object.defineProperty(window.visualViewport,'height',{configurable:true,get:()=>innerHeight-280})
  window.visualViewport.dispatchEvent(new Event('resize'))
  document.querySelector('.panel .detail').scrollTop=99999
})
await sleep(200)
assert.ok(await page.$eval('.panel .detail',x=>parseFloat(x.style.paddingBottom)>=360))
const lastBottom=await page.$eval('.reader-paging',x=>x.getBoundingClientRect().bottom)
const inputTop=await page.$eval('.cinput--fixed',x=>x.getBoundingClientRect().top)
assert.ok(lastBottom<=inputTop+1, 'last content must scroll above an overlay keyboard')
await page.evaluate(()=>{delete window.visualViewport.height;window.visualViewport.dispatchEvent(new Event('resize'));document.querySelector('.panel .author').click()})
await sleep(550)
assert.ok(page.url().includes('/user/'))
assert.equal(await page.$$eval('.cinput--fixed',xs=>xs.filter(x=>getComputedStyle(x).display!=='none').length),0)
await page.goBack();await sleep(500);await page.click('.panel .actions__input')
assert.equal(await page.$eval('.cinput__field',x=>x.value),'离开详情后保留的草稿')
await page.$eval('.cinput__field',x=>x.blur());await sleep(150)
checks.push('overlay keyboard reserves pane space; leaving reader hides teleported input and preserves draft')

await goto('/discover?tab=dynamic',854);await page.waitForSelector('.panel .article')
slowDetailId=1002
await page.click('[data-feed-id="1002"] .m-body');await sleep(150)
await page.click('.panel .actions__icon:first-child');await sleep(250)
assert.equal(await page.$eval('.panel .actions__icon',x=>x.getAttribute('aria-pressed')),'true')
await sleep(3100)
assert.equal(await page.$eval('.panel .actions__icon',x=>x.getAttribute('aria-pressed')),'true')
assert.equal(await page.$eval('.panel .actions__icon span',x=>Number(x.textContent)),feeds[1].likes)
slowDetailId=0
await page.click('[data-feed-id="1003"] .m-body');await sleep(150)
await page.$eval('[data-feed-id="1002"] .m-body',x=>x.scrollIntoView({block:'center'}));await sleep(80)
await page.click('[data-feed-id="1002"] .m-body');await sleep(350)
assert.equal(await page.$eval('[aria-current="true"]',x=>x.getAttribute('data-feed-id')),'1002')
assert.equal(await page.$eval('.panel .actions__icon',x=>x.getAttribute('aria-pressed')),'true')
assert.equal(await page.$eval('.panel .actions__icon span',x=>Number(x.textContent)),feeds[1].likes)
checks.push('late detail GET cannot overwrite a successful like made from the initial snapshot')
checks.push('invalidated in-flight detail cannot refill stale cache when switching back to the post')
await page.click('.model-trigger');await clickText('.model-grid button','P3');await page.waitForSelector('.moment')
await page.setViewport({width:390,height:844,deviceScaleFactor:1});await sleep(400)
assert.ok(page.url().includes('/discover'))
checks.push('switching to an automatic preview clears active-reading posture navigation')
await page.focus('.tabs [aria-selected="true"]');await page.keyboard.press('Home');await sleep(200)
assert.equal(await page.$eval('.tabs [aria-selected="true"]',x=>x.textContent.trim()),'推荐')
await page.keyboard.press('ArrowRight');await sleep(200)
assert.equal(await page.$eval('.tabs [aria-selected="true"]',x=>x.textContent.trim()),'动态')
checks.push('root navigation supports keyboard selection and a single tab stop')
await goto('/feed/1009',1337);await page.waitForSelector('.body-gallery')
assert.ok(await page.$eval('.article',x=>x.getBoundingClientRect().width)<=680)
await fit('1337 standalone detail UX')
checks.push('fullscreen wide detail retains comfortable reading width and the nine-image grid')

assert.deepEqual(errors,[])
writeFileSync(out+'/discover-ui-checks.json',JSON.stringify({checks,errors,requests:requests.filter(x=>x.path==='/feed'),publishedTags:published.map(x=>x.tags)},null,2))
console.log(JSON.stringify({passed:checks.length,checks,errors},null,2))
}finally{await browser.close()}
